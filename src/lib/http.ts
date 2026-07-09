import { NextResponse } from "next/server";
import { requireAdmin } from "./admin-auth";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function getQueryParam(url: string, key: string) {
  return new URL(url).searchParams.get(key) ?? undefined;
}

export async function requireAdminApi() {
  const ok = await requireAdmin();
  if (!ok) {
    return jsonError("請先登入後台", 401);
  }

  return null;
}
