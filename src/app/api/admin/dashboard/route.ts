import { NextResponse } from "next/server";
import { decorateSchedules } from "@/lib/booking-service";
import { parseServiceDate, todayDateInput, tomorrowDateInput } from "@/lib/dates";
import { requireAdminApi } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireAdminApi();
  if (auth) return auth;

  const prisma = getPrisma();
  const tomorrow = parseServiceDate(tomorrowDateInput());
  const today = parseServiceDate(todayDateInput());
  const tomorrowSchedules = await prisma.shuttleSchedule.findMany({
    where: { serviceDate: tomorrow },
    orderBy: [{ departureTime: "asc" }],
  });
  const schedules = await decorateSchedules(tomorrowSchedules);

  const [latestBookings, todayNew] = await Promise.all([
    prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { schedule: true },
    }),
    prisma.booking.count({
      where: { createdAt: { gte: today } },
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

  return NextResponse.json({ summary: { ...summary, todayNew }, schedules, latestBookings, attention });
}
