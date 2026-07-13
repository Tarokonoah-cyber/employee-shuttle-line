import { NextResponse } from "next/server";
import { parseServiceDate, tomorrowDateInput } from "@/lib/dates";
import { decorateSchedules } from "@/lib/booking-service";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function safeDateInput(value: string | null) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ? value! : tomorrowDateInput();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = safeDateInput(url.searchParams.get("date"));
  const prisma = getPrisma();

  try {
    const schedules = await prisma.shuttleSchedule.findMany({
      where: { serviceDate: parseServiceDate(date), cancelledAt: null },
      orderBy: [{ departureTime: "asc" }, { routeName: "asc" }],
    });

    const decorated = await decorateSchedules(schedules);
    return NextResponse.json({ schedules: decorated }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Employee schedules load failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      code: typeof error === "object" && error && "code" in error ? String(error.code) : undefined,
    });

    return NextResponse.json({ schedules: [] }, { headers: { "Cache-Control": "no-store" } });
  }
}
