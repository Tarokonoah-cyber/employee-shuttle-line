import { NextResponse } from "next/server";
import { logAudit } from "@/lib/booking-service";
import { jsonError, requireAdminApi } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";
import { templateInputSchema } from "@/lib/schemas";

export async function GET() {
  const auth = await requireAdminApi();
  if (auth) return auth;

  const prisma = getPrisma();
  const templates = await prisma.scheduleTemplate.findMany({ orderBy: [{ active: "desc" }, { departureTime: "asc" }] });
  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth) return auth;

  try {
    const input = templateInputSchema.parse(await request.json());
    const prisma = getPrisma();
    const template = await prisma.$transaction(async (tx) => {
      const created = await tx.scheduleTemplate.create({ data: input });
      await logAudit(tx, { action: "template.create", targetType: "template", targetId: created.id, newValue: created, source: "admin" });
      return created;
    });
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) return jsonError(error.message);
    return jsonError("新增模板失敗");
  }
}
