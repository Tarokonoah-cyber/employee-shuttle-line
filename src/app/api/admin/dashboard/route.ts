import { NextResponse } from "next/server";
import {
  buildDashboardPayload,
  buildDashboardSchedules,
  buildLatestBookings,
  emptyDashboardPayload,
  normalizeDashboardDate,
} from "@/lib/admin-dashboard";
import { parseServiceDate, startOfTaipeiDateInput, todayDateInput } from "@/lib/dates";
import { requireAdminApi } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (auth) return auth;

  const url = new URL(request.url);
  const selectedDate = normalizeDashboardDate(url.searchParams.get("date"));
  const prisma = getPrisma();

  try {
    const serviceDate = parseServiceDate(selectedDate);
    const todayStart = startOfTaipeiDateInput(todayDateInput());

    const [selectedSchedules, latestBookingRows, todayNew] = await Promise.all([
      prisma.shuttleSchedule.findMany({
        where: { serviceDate },
        orderBy: [{ departureTime: "asc" }, { routeName: "asc" }],
      }),
      prisma.booking.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          employeeName: true,
          department: true,
          status: true,
          bookingCode: true,
          createdAt: true,
          scheduleId: true,
        },
      }),
      prisma.booking.count({
        where: { createdAt: { gte: todayStart } },
      }),
    ]);

    const scheduleIds = selectedSchedules.map((schedule) => schedule.id);
    const latestScheduleIds = Array.from(new Set(latestBookingRows.map((booking) => booking.scheduleId)));

    const [statusCounts, latestSchedules] = await Promise.all([
      scheduleIds.length
        ? prisma.booking.groupBy({
            by: ["scheduleId", "status"],
            where: { scheduleId: { in: scheduleIds } },
            _count: { status: true },
          })
        : Promise.resolve([]),
      latestScheduleIds.length
        ? prisma.shuttleSchedule.findMany({
            where: { id: { in: latestScheduleIds } },
            select: { id: true, routeName: true, departureTime: true },
          })
        : Promise.resolve([]),
    ]);

    const countsByScheduleId = new Map<string, typeof statusCounts>();
    for (const row of statusCounts) {
      countsByScheduleId.set(row.scheduleId, [...(countsByScheduleId.get(row.scheduleId) ?? []), row]);
    }

    const schedules = buildDashboardSchedules(selectedSchedules, countsByScheduleId);
    const latestBookings = buildLatestBookings(latestBookingRows, latestSchedules);
    const payload = buildDashboardPayload({ date: selectedDate, schedules, latestBookings, todayNew });

    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin dashboard data load failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      code: typeof error === "object" && error && "code" in error ? String(error.code) : undefined,
    });

    return NextResponse.json(emptyDashboardPayload(selectedDate), { headers: { "Cache-Control": "no-store" } });
  }
}
