import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/http";
import { maskLineUserId } from "@/lib/line-profile";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireAdminApi();
  if (auth) return auth;

  try {
    const profiles = await getPrisma().lineUserProfile.findMany({
      include: { _count: { select: { bookings: true } } },
      orderBy: { lastUsedAt: "desc" },
      take: 500,
    });

    return NextResponse.json({
      profiles: profiles.map((profile) => ({
        id: profile.id,
        lineDisplayName: profile.lineDisplayName,
        maskedLineUserId: maskLineUserId(profile.lineUserId),
        employeeName: profile.employeeName,
        employeeNo: profile.employeeNo,
        department: profile.department,
        phone: profile.phone,
        defaultPickupLocation: profile.defaultPickupLocation,
        lastUsedAt: profile.lastUsedAt.toISOString(),
        bookingCount: profile._count.bookings,
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error) console.error("Admin LINE users load failed", { name: error.name });
    return NextResponse.json({ error: "讀取 LINE 使用者失敗" }, { status: 500 });
  }
}
