import { NextResponse } from "next/server";
import { cancelBooking, isBusinessError } from "@/lib/booking-service";
import { jsonError, requireAdminApi } from "@/lib/http";

export async function PATCH(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (auth) return auth;

  try {
    const { id } = await context.params;
    const booking = await cancelBooking(id);
    return NextResponse.json({ booking });
  } catch (error) {
    if (isBusinessError(error)) return jsonError(error.message, error.status);
    if (error instanceof Error) return jsonError(error.message);
    return jsonError("取消預約失敗");
  }
}
