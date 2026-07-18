import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { getOwnLineBookings } from "@/lib/line-bookings";
import { getLineSessionProfileId } from "@/lib/line-session";

export async function GET() {
  const profileId = await getLineSessionProfileId();
  if (!profileId) return jsonError("LINE 登入狀態已失效", 401);
  try {
    const bookings = await getOwnLineBookings(profileId);
    return NextResponse.json({ bookings }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error) console.error("LINE bookings load failed", { name: error.name });
    return jsonError("讀取員工車報名失敗，請稍後再試", 500);
  }
}
