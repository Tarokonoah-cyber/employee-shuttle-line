import { NextResponse } from "next/server";
import { confirmWaitlistBooking, isBusinessError } from "@/lib/booking-service";
import { jsonError, requireAdminApi } from "@/lib/http";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (auth) return auth;

  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const booking = await confirmWaitlistBooking(id, Boolean(body.adminOverride));
    return NextResponse.json({ booking });
  } catch (error) {
    if (isBusinessError(error)) return jsonError(error.message, error.status);
    if (error instanceof Error) return jsonError(error.message);
    return jsonError("候補轉正取失敗");
  }
}
