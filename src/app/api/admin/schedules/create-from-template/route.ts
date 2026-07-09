import { NextResponse } from "next/server";
import { logAudit } from "@/lib/booking-service";
import { parseServiceDate, tomorrowDateInput } from "@/lib/dates";
import { jsonError, requireAdminApi } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth) return auth;

  try {
    const body = await request.json().catch(() => ({}));
    const serviceDate = parseServiceDate(typeof body.serviceDate === "string" ? body.serviceDate : tomorrowDateInput());
    const templateIds: string[] | undefined = Array.isArray(body.templateIds) ? body.templateIds : undefined;
    const prisma = getPrisma();

    const created = await prisma.$transaction(async (tx) => {
      const templates = await tx.scheduleTemplate.findMany({
        where: { active: true, ...(templateIds ? { id: { in: templateIds } } : {}) },
        orderBy: { departureTime: "asc" },
      });
      const schedules = [];

      for (const template of templates) {
        const exists = await tx.shuttleSchedule.findFirst({
          where: {
            serviceDate,
            routeName: template.routeName,
            departureTime: template.departureTime,
          },
        });
        if (exists) continue;
        schedules.push(
          await tx.shuttleSchedule.create({
            data: {
              serviceDate,
              routeName: template.routeName,
              departureTime: template.departureTime,
              pickupPoint: template.pickupPoint,
              capacity: template.defaultCapacity,
              waitlistEnabled: template.waitlistEnabled,
              registrationOpen: true,
              note: template.note,
            },
          }),
        );
      }

      await logAudit(tx, { action: "schedule.create_from_template", targetType: "schedule", newValue: schedules, source: "admin" });
      return schedules;
    });

    return NextResponse.json({ schedules: created }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) return jsonError(error.message);
    return jsonError("快速建立車班失敗");
  }
}
