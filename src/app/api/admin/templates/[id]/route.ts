import { NextResponse } from "next/server";
import { logAudit } from "@/lib/booking-service";
import { jsonError, requireAdminApi } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";
import { templateInputSchema } from "@/lib/schemas";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (auth) return auth;

  try {
    const { id } = await context.params;
    const input = templateInputSchema.parse(await request.json());
    const prisma = getPrisma();
    const template = await prisma.$transaction(async (tx) => {
      const oldValue = await tx.scheduleTemplate.findUnique({ where: { id } });
      if (!oldValue) throw new Error("找不到模板");
      const updated = await tx.scheduleTemplate.update({ where: { id }, data: input });
      await logAudit(tx, { action: "template.update", targetType: "template", targetId: id, oldValue, newValue: updated, source: "admin" });
      return updated;
    });
    return NextResponse.json({ template });
  } catch (error) {
    if (error instanceof Error) return jsonError(error.message);
    return jsonError("更新模板失敗");
  }
}
