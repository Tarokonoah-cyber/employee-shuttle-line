import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { logAudit } from "@/lib/booking-service";
import { displayDate, parseServiceDate } from "@/lib/dates";
import { requireAdminApi } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (auth) return auth;

  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const scheduleId = url.searchParams.get("schedule_id");
  const includeWaitlist = url.searchParams.get("include_waitlist") === "true";
  const includeCancelled = url.searchParams.get("include_cancelled") === "true";
  const statuses: ("confirmed" | "waitlist" | "cancelled")[] = ["confirmed"];
  if (includeWaitlist) statuses.push("waitlist");
  if (includeCancelled) statuses.push("cancelled");

  const where: Prisma.BookingWhereInput = { status: { in: statuses } };
  if (scheduleId) where.scheduleId = scheduleId;
  if (date) where.schedule = { serviceDate: parseServiceDate(date) };

  const prisma = getPrisma();
  const bookings = await prisma.booking.findMany({
    where,
    include: { schedule: true },
    orderBy: [{ schedule: { serviceDate: "asc" } }, { schedule: { departureTime: "asc" } }, { status: "asc" }, { createdAt: "asc" }],
  });

  await prisma.$transaction((tx) =>
    logAudit(tx, { action: "booking.export_csv", targetType: "booking", newValue: { date, scheduleId, statuses, count: bookings.length }, source: "admin" }),
  );

  const header = [
    "日期",
    "車班名稱",
    "發車時間",
    "上車點",
    "狀態",
    "員工姓名",
    "部門",
    "員工編號",
    "手機",
    "booking_code",
    "備註",
    "是否 adminOverride",
    "建立來源",
    "建立時間",
    "取消時間",
  ];
  const rows = bookings.map((booking) => [
    displayDate(booking.schedule.serviceDate),
    booking.schedule.routeName,
    booking.schedule.departureTime,
    booking.schedule.pickupPoint,
    booking.status,
    booking.employeeName,
    booking.department,
    booking.employeeNo,
    booking.phone,
    booking.bookingCode,
    booking.note,
    booking.adminOverride ? "是" : "否",
    booking.createdBy,
    booking.createdAt.toISOString(),
    booking.cancelledAt?.toISOString(),
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="shuttle-bookings-${date ?? "all"}.csv"`,
    },
  });
}
