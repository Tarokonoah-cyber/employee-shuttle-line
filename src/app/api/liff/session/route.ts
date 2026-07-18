import { NextResponse } from "next/server";
import { z } from "zod";
import { establishLineSessionProfile, LineIdentityError } from "@/lib/line-identity";
import { publicLineProfile } from "@/lib/line-profile";
import { createLineSessionValue, lineSessionCookie } from "@/lib/line-session";
import { hasSafeRequestOrigin } from "@/lib/request-security";
import { jsonError } from "@/lib/http";

const sessionInputSchema = z.object({ idToken: z.string().min(20).max(4096) }).strict();

export async function POST(request: Request) {
  if (!hasSafeRequestOrigin(request)) return jsonError("請重新從官方帳號開啟", 403);

  try {
    const { idToken } = sessionInputSchema.parse(await request.json());
    const profile = await establishLineSessionProfile(idToken);
    const response = NextResponse.json(
      { profile: publicLineProfile(profile) },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(lineSessionCookie(createLineSessionValue(profile.id)));
    return response;
  } catch (error) {
    if (error instanceof LineIdentityError) return jsonError(error.message, 401);
    if (error instanceof z.ZodError) return jsonError("LINE 身分資料格式不正確", 400);
    if (error instanceof Error) console.error("LIFF session creation failed", { name: error.name });
    return jsonError("LINE 身分驗證失敗，請重新從官方帳號開啟", 500);
  }
}
