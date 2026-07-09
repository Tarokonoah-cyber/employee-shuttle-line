import { NextResponse } from "next/server";
import { isBusinessError, updateBooking } from "@/lib/booking-service";
import { jsonError, requireAdminApi } from "@/lib/http";
import { updateBookingSchema } from "@/lib/schemas";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (auth) return auth;

  try {
    const { id } = await context.params;
    const input = updateBookingSchema.parse(await request.json());
    const booking = await updateBooking(id, input);
    return NextResponse.json({ booking });
  } catch (error) {
    if (isBusinessError(error)) return jsonError(error.message, error.status);
    if (error instanceof Error) return jsonError(error.message);
    return jsonError("更新預約失敗");
  }
}
