import { NextResponse } from "next/server";
import { changeBookingSchedule, isBusinessError } from "@/lib/booking-service";
import { jsonError, requireAdminApi } from "@/lib/http";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (auth) return auth;

  try {
    const { id } = await context.params;
    const body = await request.json();
    if (typeof body.scheduleId !== "string") return jsonError("請選擇新車班");
    await changeBookingSchedule(id, body.scheduleId, Boolean(body.adminOverride));
    return NextResponse.json({ message: "預約班次已更新" });
  } catch (error) {
    if (isBusinessError(error)) return jsonError(error.message, error.status);
    if (error instanceof Error) return jsonError(error.message);
    return jsonError("更換車班失敗");
  }
}
