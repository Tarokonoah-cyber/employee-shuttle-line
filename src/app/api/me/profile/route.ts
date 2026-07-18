import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { getOwnLineProfile, lineProfileUpdateSchema, publicLineProfile, updateOwnLineProfile } from "@/lib/line-profile";
import { getLineSessionProfileId } from "@/lib/line-session";
import { hasSafeRequestOrigin } from "@/lib/request-security";

export async function GET() {
  const profileId = await getLineSessionProfileId();
  if (!profileId) return jsonError("LINE 登入狀態已失效", 401);
  try {
    const profile = await getOwnLineProfile(profileId);
    if (!profile) return jsonError("LINE 登入狀態已失效", 401);
    return NextResponse.json({ profile: publicLineProfile(profile) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error) console.error("LINE profile load failed", { name: error.name });
    return jsonError("讀取員工資料失敗，請稍後再試", 500);
  }
}

export async function PATCH(request: Request) {
  if (!hasSafeRequestOrigin(request)) return jsonError("請重新從官方帳號開啟", 403);
  const profileId = await getLineSessionProfileId();
  if (!profileId) return jsonError("LINE 登入狀態已失效", 401);

  try {
    const input = lineProfileUpdateSchema.parse(await request.json());
    const profile = await updateOwnLineProfile(profileId, input);
    if (!profile) return jsonError("LINE 登入狀態已失效", 401);
    return NextResponse.json({ profile: publicLineProfile(profile) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError(error.issues[0]?.message ?? "員工資料格式不正確", 400);
    if (error instanceof Error) console.error("LINE profile update failed", { name: error.name });
    return jsonError("更新員工資料失敗，請稍後再試", 500);
  }
}
