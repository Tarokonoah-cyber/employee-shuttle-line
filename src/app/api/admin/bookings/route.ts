import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { createAdminBooking, isBusinessError } from "@/lib/booking-service";
import { parseServiceDate } from "@/lib/dates";
import { jsonError, requireAdminApi } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";
import { adminBookingInputSchema } from "@/lib/schemas";

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (auth) return auth;

  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const scheduleId = url.searchParams.get("schedule_id");
  const status = url.searchParams.get("status");
  const keyword = url.searchParams.get("keyword")?.trim();

  const where: Prisma.BookingWhereInput = {};
  if (scheduleId) where.scheduleId = scheduleId;
  if (status === "confirmed" || status === "waitlist" || status === "cancelled") where.status = status;
  if (date) where.schedule = { serviceDate: parseServiceDate(date) };
  if (keyword) {
    where.OR = [
      { employeeName: { contains: keyword, mode: "insensitive" } },
      { department: { contains: keyword, mode: "insensitive" } },
      { employeeNo: { contains: keyword, mode: "insensitive" } },
      { phone: { contains: keyword, mode: "insensitive" } },
      { bookingCode: { contains: keyword, mode: "insensitive" } },
    ];
  }

  const prisma = getPrisma();
  const bookings = await prisma.booking.findMany({
    where,
    include: { schedule: true },
    orderBy: [{ schedule: { serviceDate: "asc" } }, { schedule: { departureTime: "asc" } }, { createdAt: "asc" }],
  });

  return NextResponse.json({
    bookings: bookings.map(({ managementTokenHash, managementTokenCreatedAt, ...booking }) => ({
      ...booking,
      hasManagementToken: Boolean(managementTokenHash),
      managementTokenCreatedAt,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth) return auth;

  try {
    const input = adminBookingInputSchema.parse(await request.json());
    const { booking } = await createAdminBooking(input);
    return NextResponse.json(
      { booking: { id: booking.id, bookingCode: booking.bookingCode, status: booking.status } },
      { status: 201 },
    );
  } catch (error) {
    if (isBusinessError(error)) return jsonError(error.message, error.status);
    if (error instanceof Error) return jsonError(error.message);
    return jsonError("新增預約失敗");
  }
}
