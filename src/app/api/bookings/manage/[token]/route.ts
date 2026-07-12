import { NextResponse } from "next/server";
import { getManagedBooking } from "@/lib/booking-management";
import { jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const booking = await getManagedBooking(token);
    if (!booking) return jsonError("無法使用此管理連結", 404);
    return NextResponse.json(
      { booking },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof Error) console.error("Managed booking lookup failed", { name: error.name });
    return jsonError("暫時無法讀取報名，請稍後再試", 500);
  }
}
