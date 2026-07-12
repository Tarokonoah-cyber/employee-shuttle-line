import { NextResponse } from "next/server";
import { getManagedBooking, managementUrl, rotateManagementToken, statusLineText } from "@/lib/booking-management";
import { isBusinessError } from "@/lib/booking-service";
import { jsonError, requireAdminApi } from "@/lib/http";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (auth) return auth;

  try {
    const { id } = await context.params;
    const token = await rotateManagementToken(id);
    const view = await getManagedBooking(token);
    if (!view) throw new Error("建立管理連結失敗");
    const manageUrl = managementUrl(request, token);
    return NextResponse.json({
      managementUrl: manageUrl,
      lineText: statusLineText(view, manageUrl),
      message: "管理連結已建立；先前連結已失效",
    });
  } catch (error) {
    if (isBusinessError(error)) return jsonError(error.message, error.status);
    if (error instanceof Error) console.error("Admin management-link rotation failed", { name: error.name });
    return jsonError("建立管理連結失敗", 500);
  }
}
