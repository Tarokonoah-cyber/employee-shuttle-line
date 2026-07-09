import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireAdminApi();
  if (auth) return auth;

  const prisma = getPrisma();
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json({ logs });
}
