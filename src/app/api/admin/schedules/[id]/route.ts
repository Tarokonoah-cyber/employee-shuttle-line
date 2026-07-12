import { NextResponse } from "next/server";
import { logAudit } from "@/lib/booking-service";
import { parseServiceDate } from "@/lib/dates";
import { jsonError, requireAdminApi } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";
import { scheduleInputSchema } from "@/lib/schemas";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (auth) return auth;

  try {
    const { id } = await context.params;
    const input = scheduleInputSchema.parse(await request.json());
    const prisma = getPrisma();
    const schedule = await prisma.$transaction(async (tx) => {
      const oldValue = await tx.shuttleSchedule.findUnique({ where: { id } });
      if (!oldValue) throw new Error("找不到車班");
      const updated = await tx.shuttleSchedule.update({
        where: { id },
        data: {
          serviceDate: parseServiceDate(input.serviceDate),
          routeName: input.routeName,
          departureTime: input.departureTime,
          pickupPoint: input.pickupPoint,
          capacity: input.capacity,
          registrationOpen: input.cancelled ? false : input.registrationOpen,
          waitlistEnabled: input.waitlistEnabled,
          cancelledAt: input.cancelled ? oldValue.cancelledAt ?? new Date() : null,
          note: input.note,
        },
      });
      await logAudit(tx, { action: "schedule.update", targetType: "schedule", targetId: id, oldValue, newValue: updated, source: "admin" });
      return updated;
    });
    return NextResponse.json({ schedule });
  } catch (error) {
    if (error instanceof Error) return jsonError(error.message);
    return jsonError("更新車班失敗");
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (auth) return auth;

  try {
    const { id } = await context.params;
    const prisma = getPrisma();
    await prisma.$transaction(async (tx) => {
      const bookingCount = await tx.booking.count({ where: { scheduleId: id } });
      if (bookingCount > 0) throw new Error("已有預約紀錄的車班不可刪除，請改為關閉登記");
      const deleted = await tx.shuttleSchedule.delete({ where: { id } });
      await logAudit(tx, { action: "schedule.delete", targetType: "schedule", targetId: id, oldValue: deleted, source: "admin" });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error) return jsonError(error.message);
    return jsonError("刪除車班失敗");
  }
}
