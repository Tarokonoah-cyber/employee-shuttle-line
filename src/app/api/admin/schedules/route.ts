import { NextResponse } from "next/server";
import { decorateSchedules, logAudit } from "@/lib/booking-service";
import { parseServiceDate } from "@/lib/dates";
import { jsonError, requireAdminApi } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";
import { scheduleInputSchema } from "@/lib/schemas";

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (auth) return auth;

  const date = new URL(request.url).searchParams.get("date");
  const prisma = getPrisma();
  const schedules = await prisma.shuttleSchedule.findMany({
    where: date ? { serviceDate: parseServiceDate(date) } : undefined,
    orderBy: [{ serviceDate: "asc" }, { departureTime: "asc" }],
  });

  return NextResponse.json({ schedules: await decorateSchedules(schedules) });
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth) return auth;

  try {
    const input = scheduleInputSchema.parse(await request.json());
    const prisma = getPrisma();
    const schedule = await prisma.$transaction(async (tx) => {
      const created = await tx.shuttleSchedule.create({
        data: {
          serviceDate: parseServiceDate(input.serviceDate),
          routeName: input.routeName,
          departureTime: input.departureTime,
          pickupPoint: input.pickupPoint,
          capacity: input.capacity,
          registrationOpen: input.registrationOpen,
          waitlistEnabled: input.waitlistEnabled,
          cancelledAt: input.cancelled ? new Date() : null,
          note: input.note,
        },
      });
      await logAudit(tx, { action: "schedule.create", targetType: "schedule", targetId: created.id, newValue: created, source: "admin" });
      return created;
    });
    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) return jsonError(error.message);
    return jsonError("新增車班失敗");
  }
}
