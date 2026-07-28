import { NextResponse } from "next/server";
import { logAudit } from "@/lib/booking-service";
import { requireAdminApi } from "@/lib/http";
import { groNotificationTargets } from "@/lib/line-notification";
import { maskLineUserId } from "@/lib/line-profile";
import { getPrisma } from "@/lib/prisma";
import { groNotificationAdminInputSchema } from "@/lib/schemas";

async function lineUsersPayload() {
  const prisma = getPrisma();
  const [profiles, settings, selectedProfileCount] = await Promise.all([
    prisma.lineUserProfile.findMany({
      include: { _count: { select: { bookings: true } } },
      orderBy: { lastUsedAt: "desc" },
      take: 500,
    }),
    prisma.groNotificationSettings.findUnique({
      where: { id: "default" },
      select: { managedInAdmin: true },
    }),
    prisma.lineUserProfile.count({
      where: { receivesGroNotifications: true },
    }),
  ]);
  const managedInAdmin = Boolean(settings?.managedInAdmin);
  const environmentTargetCount = groNotificationTargets().length;

  return {
    profiles: profiles.map((profile) => ({
      id: profile.id,
      lineDisplayName: profile.lineDisplayName,
      maskedLineUserId: maskLineUserId(profile.lineUserId),
      employeeName: profile.employeeName,
      employeeNo: profile.employeeNo,
      department: profile.department,
      phone: profile.phone,
      defaultPickupLocation: profile.defaultPickupLocation,
      receivesGroNotifications: profile.receivesGroNotifications,
      lastUsedAt: profile.lastUsedAt.toISOString(),
      bookingCount: profile._count.bookings,
    })),
    notificationSettings: {
      managedInAdmin,
      recipientCount: managedInAdmin ? selectedProfileCount : environmentTargetCount,
      selectedProfileCount,
      environmentTargetCount,
      source: managedInAdmin ? "admin" as const : "environment" as const,
    },
  };
}

export async function GET() {
  const auth = await requireAdminApi();
  if (auth) return auth;

  try {
    return NextResponse.json(await lineUsersPayload(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error) console.error("Admin LINE users load failed", { name: error.name });
    return NextResponse.json({ error: "讀取 LINE 使用者失敗" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApi();
  if (auth) return auth;

  try {
    const input = groNotificationAdminInputSchema.parse(await request.json());
    const prisma = getPrisma();
    await prisma.$transaction(async (tx) => {
      if (input.action === "use_environment" || input.action === "use_admin") {
        const managedInAdmin = input.action === "use_admin";
        const oldSettings = await tx.groNotificationSettings.findUnique({ where: { id: "default" } });
        const settings = await tx.groNotificationSettings.upsert({
          where: { id: "default" },
          create: { id: "default", managedInAdmin },
          update: { managedInAdmin },
        });
        await logAudit(tx, {
          action: managedInAdmin ? "line_notification.use_admin" : "line_notification.use_environment",
          targetType: "gro_notification_settings",
          targetId: settings.id,
          oldValue: { managedInAdmin: oldSettings?.managedInAdmin ?? false },
          newValue: { managedInAdmin },
          source: "admin",
        });
        return;
      }

      const profile = await tx.lineUserProfile.findUnique({
        where: { id: input.profileId },
        select: { id: true, receivesGroNotifications: true },
      });
      if (!profile) throw new Error("找不到 LINE 使用者");

      await tx.groNotificationSettings.upsert({
        where: { id: "default" },
        create: { id: "default", managedInAdmin: true },
        update: { managedInAdmin: true },
      });
      const updated = await tx.lineUserProfile.update({
        where: { id: input.profileId },
        data: { receivesGroNotifications: input.enabled },
        select: { id: true, receivesGroNotifications: true },
      });
      await logAudit(tx, {
        action: "line_notification.recipient_update",
        targetType: "line_user_profile",
        targetId: profile.id,
        oldValue: { receivesGroNotifications: profile.receivesGroNotifications },
        newValue: { receivesGroNotifications: updated.receivesGroNotifications },
        source: "admin",
      });
    });

    return NextResponse.json(await lineUsersPayload(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "更新 LINE 通知管理員失敗" }, { status: 500 });
  }
}
