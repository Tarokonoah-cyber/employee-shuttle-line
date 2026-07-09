import { NextResponse } from "next/server";
import { displayDate, parseServiceDate, tomorrowDateInput } from "@/lib/dates";
import { jsonError, requireAdminApi } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";

function bookingLines(bookings: Array<{ employeeName: string; department: string }>) {
  return bookings.length ? bookings.map((booking, index) => `${index + 1}. ${booking.employeeName} / ${booking.department}`) : ["無"];
}

function scheduleLines(schedule: Awaited<ReturnType<typeof getSchedulesForLineCopy>>[number]) {
  const confirmed = schedule.bookings.filter((booking) => booking.status === "confirmed");
  const waitlist = schedule.bookings.filter((booking) => booking.status === "waitlist");

  return [
    `【${schedule.departureTime} ${schedule.routeName}】`,
    `上車點：${schedule.pickupPoint}`,
    `名額：${confirmed.length}/${schedule.capacity}`,
    "",
    "正取名單：",
    ...bookingLines(confirmed),
    "",
    "候補名單：",
    ...bookingLines(waitlist),
  ];
}

async function getSchedulesForLineCopy(input: { date: string; scheduleId?: string | null }) {
  const prisma = getPrisma();
  return prisma.shuttleSchedule.findMany({
    where: input.scheduleId ? { id: input.scheduleId } : { serviceDate: parseServiceDate(input.date) },
    orderBy: [{ departureTime: "asc" }, { routeName: "asc" }],
    include: {
      bookings: {
        where: { status: { in: ["confirmed", "waitlist"] } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (auth) return auth;

  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? tomorrowDateInput();
  const scheduleId = url.searchParams.get("schedule_id");
  const schedules = await getSchedulesForLineCopy({ date, scheduleId });

  if (schedules.length === 0) return jsonError("找不到車班", 404);

  const lines = [
    "【員工車名單】",
    `日期：${displayDate(schedules[0].serviceDate)}`,
    "",
    ...schedules.flatMap((schedule, index) => [
      ...scheduleLines(schedule),
      ...(index < schedules.length - 1 ? ["", "--------------------", ""] : []),
    ]),
  ];

  return NextResponse.json({ text: lines.join("\n"), schedules });
}
