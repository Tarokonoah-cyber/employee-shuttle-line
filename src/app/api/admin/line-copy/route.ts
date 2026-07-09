import { NextResponse } from "next/server";
import { displayDate, parseServiceDate, tomorrowDateInput } from "@/lib/dates";
import { jsonError, requireAdminApi } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (auth) return auth;

  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? tomorrowDateInput();
  const scheduleId = url.searchParams.get("schedule_id");
  const prisma = getPrisma();
  const schedule = await prisma.shuttleSchedule.findFirst({
    where: scheduleId ? { id: scheduleId } : { serviceDate: parseServiceDate(date) },
    orderBy: { departureTime: "asc" },
    include: {
      bookings: {
        where: { status: { in: ["confirmed", "waitlist"] } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!schedule) return jsonError("找不到車班", 404);

  const confirmed = schedule.bookings.filter((booking) => booking.status === "confirmed");
  const waitlist = schedule.bookings.filter((booking) => booking.status === "waitlist");
  const lines = [
    "【員工車名單】",
    `日期：${displayDate(schedule.serviceDate)}`,
    `車班：${schedule.departureTime} ${schedule.routeName}`,
    `上車點：${schedule.pickupPoint}`,
    `名額：${confirmed.length}/${schedule.capacity}`,
    "",
    "正取名單：",
    ...(confirmed.length ? confirmed.map((booking, index) => `${index + 1}. ${booking.employeeName} / ${booking.department}`) : ["無"]),
    "",
    "候補名單：",
    ...(waitlist.length ? waitlist.map((booking, index) => `${index + 1}. ${booking.employeeName} / ${booking.department}`) : ["無"]),
  ];

  return NextResponse.json({ text: lines.join("\n"), schedule });
}
