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
        AND column_name IN ('cancelled_at', 'registration_deadline')
    `;
    const templateColumns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'schedule_templates'
        AND column_name IN ('registration_cutoff_day_offset', 'registration_cutoff_time')
    `;
    const lineProfileColumns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'line_user_profiles'
        AND column_name = 'receives_gro_notifications'
    `;
    const groSettingsTable = await prisma.$queryRaw<Array<{ table_name: string | null }>>`
      SELECT to_regclass('public.gro_notification_settings')::text AS table_name
    `;
    const schemaReady = bookingColumns.length === 5
      && scheduleColumns.length === 2
      && templateColumns.length === 2
      && lineProfileColumns.length === 1
      && Boolean(groSettingsTable[0]?.table_name);
    let notificationReadiness = lineNotificationReadiness();

    if (schemaReady) {
      const [settings, databaseTargetCount] = await Promise.all([
        prisma.groNotificationSettings.findUnique({
          where: { id: "default" },
          select: { managedInAdmin: true },
        }),
        prisma.lineUserProfile.count({ where: { receivesGroNotifications: true } }),
      ]);
      notificationReadiness = lineNotificationReadiness({
        managedInAdmin: Boolean(settings?.managedInAdmin),
        databaseTargetCount,
      });
    }

    return NextResponse.json(
      {
        status: schemaReady ? "ok" : "degraded",
        database: "ok",
        schema: schemaReady ? "ready" : "migration_required",
        version,
        serverTime: now.toISOString(),
        taipeiTime: taipeiDateTime(now),
        lineNotifications: notificationReadiness,
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
