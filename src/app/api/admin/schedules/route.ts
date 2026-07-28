import { NextResponse } from "next/server";
import { decorateSchedules, logAudit } from "@/lib/booking-service";
import { parseServiceDate, registrationDeadlineFromRule } from "@/lib/dates";
import { jsonError, requireAdminApi } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";
import { scheduleInputSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

function safeDateInput(value: string | null) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ? value! : null;
}

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (auth) return auth;

  const date = safeDateInput(new URL(request.url).searchParams.get("date"));
  const prisma = getPrisma();

  try {
    const schedules = await prisma.shuttleSchedule.findMany({
      where: date ? { serviceDate: parseServiceDate(date) } : undefined,
      orderBy: [{ serviceDate: "asc" }, { departureTime: "asc" }],
    });

    return NextResponse.json({ schedules: await decorateSchedules(schedules) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin schedules load failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      code: typeof error === "object" && error && "code" in error ? String(error.code) : undefined,
    });

    return NextResponse.json({ schedules: [] }, { headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth) return auth;

  try {
    const input = scheduleInputSchema.parse(await request.json());
    const prisma = getPrisma();
    const schedule = await prisma.$transaction(async (tx) => {
      const serviceDate = parseServiceDate(input.serviceDate);
      const created = await tx.shuttleSchedule.create({
        data: {
          serviceDate,
          routeName: input.routeName,
          departureTime: input.departureTime,
          registrationDeadline: registrationDeadlineFromRule(
            serviceDate,
            input.registrationCutoffDayOffset,
            input.registrationCutoffTime,
          ),
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
