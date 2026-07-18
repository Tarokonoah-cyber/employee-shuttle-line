import { NextResponse } from "next/server";
import { getManagedBooking, managementUrl, statusLineText, successUrl } from "@/lib/booking-management";
import { createEmployeeBooking, isBusinessError } from "@/lib/booking-service";
import { jsonError } from "@/lib/http";
import { bookingInputSchema } from "@/lib/schemas";
import { getLineSessionProfileId, lineIdentityRequired } from "@/lib/line-session";
import { hasSafeRequestOrigin } from "@/lib/request-security";
import { ZodError } from "zod";

export async function POST(request: Request) {
  if (!hasSafeRequestOrigin(request)) return jsonError("請重新從官方帳號開啟", 403);

  try {
    const lineProfileId = await getLineSessionProfileId();
    if (lineIdentityRequired() && !lineProfileId) {
      return jsonError("請從 LINE 官方帳號的員工車登記入口開啟", 401);
    }
    const body = await request.json();
    const input = bookingInputSchema.parse(body);
    const { booking, managementToken } = await createEmployeeBooking(input, { lineProfileId });
    const view = await getManagedBooking(managementToken);
    if (!view) throw new Error("建立報名管理連結失敗");
    const manageUrl = managementUrl(request, managementToken);

    return NextResponse.json(
      {
        booking: {
          bookingCode: booking.bookingCode,
          status: booking.status,
          schedule: {
            serviceDate: booking.schedule.serviceDate,
            routeName: booking.schedule.routeName,
            departureTime: booking.schedule.departureTime,
            pickupPoint: booking.schedule.pickupPoint,
          },
        },
        managementUrl: manageUrl,
        successUrl: successUrl(request, managementToken),
        lineText: statusLineText(view, manageUrl),
      },
      { status: 201 },
    );
  } catch (error) {
    if (isBusinessError(error)) {
      return jsonError(error.message, error.status);
    }
    if (error instanceof ZodError) return jsonError(error.issues[0]?.message ?? "報名資料格式不正確", 400);

    if (error instanceof Error) console.error("Employee booking request failed", { name: error.name });

    return jsonError("預約失敗，請稍後再試", 500);
  }
}
