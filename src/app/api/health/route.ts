import { NextResponse } from "next/server";
import { taipeiDateTime } from "@/lib/dates";
import { getPrisma } from "@/lib/prisma";
import { lineNotificationReadiness } from "@/lib/line-notification";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const version = (process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA ?? "unknown").slice(0, 12);

  try {
    const prisma = getPrisma();
    await prisma.$queryRaw`SELECT 1`;
    const bookingColumns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'bookings'
        AND column_name IN ('management_token_hash', 'management_token_created_at', 'cancellation_source', 'promoted_at', 'line_profile_id')
    `;
    const scheduleColumns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'shuttle_schedules'
        AND column_name = 'cancelled_at'
    `;
    const lineProfileTable = await prisma.$queryRaw<Array<{ table_name: string | null }>>`
      SELECT to_regclass('public.line_user_profiles')::text AS table_name
    `;
    const schemaReady = bookingColumns.length === 5 && scheduleColumns.length === 1 && Boolean(lineProfileTable[0]?.table_name);

    return NextResponse.json(
      {
        status: schemaReady ? "ok" : "degraded",
        database: "ok",
        schema: schemaReady ? "ready" : "migration_required",
        version,
        serverTime: now.toISOString(),
        taipeiTime: taipeiDateTime(now),
        lineNotifications: lineNotificationReadiness(),
      },
      { status: schemaReady ? 200 : 503, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof Error) console.error("Health database check failed", { name: error.name });
    return NextResponse.json(
      {
        status: "unhealthy",
        database: "error",
        schema: "unknown",
        version,
        serverTime: now.toISOString(),
        taipeiTime: taipeiDateTime(now),
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
