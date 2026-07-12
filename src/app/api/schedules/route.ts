import { NextResponse } from "next/server";
import { parseServiceDate, tomorrowDateInput } from "@/lib/dates";
import { decorateSchedules } from "@/lib/booking-service";
import { getPrisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? tomorrowDateInput();
  const prisma = getPrisma();

  const schedules = await prisma.shuttleSchedule.findMany({
    where: { serviceDate: parseServiceDate(date), cancelledAt: null },
    orderBy: [{ departureTime: "asc" }, { routeName: "asc" }],
  });

  const decorated = await decorateSchedules(schedules);
  return NextResponse.json({ schedules: decorated });
}
