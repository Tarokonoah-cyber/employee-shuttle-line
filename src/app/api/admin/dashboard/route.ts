import { NextResponse } from "next/server";
import { decorateSchedules } from "@/lib/booking-service";
import { parseServiceDate, startOfTaipeiDateInput, todayDateInput, tomorrowDateInput } from "@/lib/dates";
import { requireAdminApi } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (auth) return auth;

  const url = new URL(request.url);
  const selectedDate = url.searchParams.get("date") ?? tomorrowDateInput();
  const prisma = getPrisma();
  const serviceDate = parseServiceDate(selectedDate);
  const todayStart = startOfTaipeiDateInput(todayDateInput());
  const selectedSchedules = await prisma.shuttleSchedule.findMany({
    where: { serviceDate },
    orderBy: [{ departureTime: "asc" }],
  });
  const schedules = await decorateSchedules(selectedSchedules);

  const [latestBookings, todayNew] = await Promise.all([
    prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { schedule: true },
    }),
    prisma.booking.count({
      where: { createdAt: { gte: todayStart } },
    }),
  ]);

  const summary = schedules.reduce(
    (acc, schedule) => {
      acc.confirmed += schedule.confirmedCount;
      acc.waitlist += schedule.waitlistCount;
      acc.cancelled += schedule.cancelledCount;
      acc.remaining += schedule.remainingCount;
      return acc;
    },
    { confirmed: 0, waitlist: 0, cancelled: 0, remaining: 0 },
  );

  const attention = schedules.filter(
    (schedule) => schedule.isFull || schedule.waitlistCount > 0 || !schedule.registrationOpen || schedule.isOverbooked,
  );

  return NextResponse.json({ date: selectedDate, summary: { ...summary, todayNew }, schedules, latestBookings, attention });
}
