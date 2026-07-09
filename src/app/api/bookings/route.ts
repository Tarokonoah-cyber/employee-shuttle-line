import { NextResponse } from "next/server";
import { createEmployeeBooking, isBusinessError } from "@/lib/booking-service";
import { jsonError } from "@/lib/http";
import { bookingInputSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = bookingInputSchema.parse(body);
    const booking = await createEmployeeBooking(input);
    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    if (isBusinessError(error)) {
      return jsonError(error.message, error.status);
    }

    if (error instanceof Error) {
      return jsonError(error.message);
    }

    return jsonError("預約失敗，請稍後再試");
  }
}
