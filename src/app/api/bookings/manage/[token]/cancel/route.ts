import { NextResponse } from "next/server";
import { cancelManagedBooking } from "@/lib/booking-management";
import { isBusinessError } from "@/lib/booking-service";
import { jsonError } from "@/lib/http";

export async function PATCH(_request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const result = await cancelManagedBooking(token);
    return NextResponse.json({
      booking: result.view,
      alreadyCancelled: result.alreadyCancelled,
      message: result.alreadyCancelled ? "此報名已取消" : "報名已取消",
    });
  } catch (error) {
    if (isBusinessError(error)) return jsonError(error.message, error.status);
    if (error instanceof Error) console.error("Employee cancellation failed", { name: error.name });
    return jsonError("取消失敗，請稍後再試", 500);
  }
}
