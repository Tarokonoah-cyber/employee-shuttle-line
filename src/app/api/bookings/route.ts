import { NextResponse } from "next/server";
import { getManagedBooking, managementUrl, statusLineText, successUrl } from "@/lib/booking-management";
import { createEmployeeBooking, isBusinessError } from "@/lib/booking-service";
import { jsonError } from "@/lib/http";
import { bookingInputSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = bookingInputSchema.parse(body);
    const { booking, managementToken } = await createEmployeeBooking(input);
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

    if (error instanceof Error) console.error("Employee booking request failed", { name: error.name });

    return jsonError("預約失敗，請稍後再試", 500);
  }
}
