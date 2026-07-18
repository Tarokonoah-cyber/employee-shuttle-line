import { NextResponse } from "next/server";
import { isBusinessError } from "@/lib/booking-service";
import { jsonError } from "@/lib/http";
import { cancelOwnLineBooking } from "@/lib/line-bookings";
import { getLineSessionProfileId } from "@/lib/line-session";
import { hasSafeRequestOrigin } from "@/lib/request-security";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!hasSafeRequestOrigin(request)) return jsonError("請重新從官方帳號開啟", 403);
  const profileId = await getLineSessionProfileId();
  if (!profileId) return jsonError("LINE 登入狀態已失效", 401);

  try {
    const { id } = await context.params;
    const booking = await cancelOwnLineBooking(profileId, id);
    return NextResponse.json({ booking });
  } catch (error) {
    if (isBusinessError(error)) return jsonError(error.message, error.status);
    if (error instanceof Error) console.error("LINE booking cancellation failed", { name: error.name });
    return jsonError("取消失敗，請稍後再試", 500);
  }
}
