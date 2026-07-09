import { NextResponse } from "next/server";
import { adminCookie, createAdminSessionValue, verifyAdminPassword } from "@/lib/admin-auth";
import { jsonError } from "@/lib/http";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  if (!verifyAdminPassword(password)) {
    return jsonError("後台密碼不正確", 401);
  }

  try {
    const response = NextResponse.json({ ok: true });
    response.cookies.set(adminCookie(createAdminSessionValue()));
    return response;
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "後台 session 建立失敗", 500);
  }
}
