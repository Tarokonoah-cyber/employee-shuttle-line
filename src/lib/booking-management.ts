import type { Booking, ShuttleSchedule } from "@prisma/client";
import { bookingDeadline, displayDate } from "./dates";
import { BusinessError, cancelBooking, logAudit } from "./booking-service";
import { generateManagementToken, hashManagementToken, isManagementToken } from "./management-token";
import { getPrisma } from "./prisma";

export type ManagedBookingStatus = "confirmed" | "waitlist" | "promoted" | "cancelled" | "schedule_cancelled";

export type ManagedBookingView = {
  bookingCode: string;
  displayName: string;
  status: ManagedBookingStatus;
  serviceDate: string;
  routeName: string;
  departureTime: string;
  pickupPoint: string;
  createdAt: string;
  deadline: string;
  canCancel: boolean;
  cancellationUnavailableReason: "already_cancelled" | "schedule_cancelled" | "deadline_passed" | null;
  waitlistPosition: number | null;
};

type BookingWithSchedule = Booking & { schedule: ShuttleSchedule };

function maskEmployeeName(name: string) {
  const characters = Array.from(name.trim());
  if (characters.length <= 1) return characters[0] ?? "員工";
  if (characters.length === 2) return `${characters[0]}○`;
  return `${characters[0]}${"○".repeat(characters.length - 2)}${characters.at(-1)}`;
}

export function managedStatus(booking: BookingWithSchedule): ManagedBookingStatus {
  if (booking.schedule.cancelledAt) return "schedule_cancelled";
  if (booking.status === "cancelled") return "cancelled";
  if (booking.status === "waitlist") return "waitlist";
  if (booking.promotedAt) return "promoted";
  return "confirmed";
}

export function cancellationAvailability(
  status: ManagedBookingStatus,
  deadline: Date,
  now = new Date(),
): ManagedBookingView["cancellationUnavailableReason"] {
  if (status === "cancelled") return "already_cancelled";
  if (status === "schedule_cancelled") return "schedule_cancelled";
  if (now.getTime() >= deadline.getTime()) return "deadline_passed";
  return null;
}

export function publicAppOrigin(request: Request) {
  const configured = process.env.APP_BASE_URL?.trim();
  if (configured) {
    const url = new URL(configured);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("APP_BASE_URL 格式不正確");
    return url.origin;
  }

  return new URL(request.url).origin;
}

export function managementUrl(request: Request, token: string) {
  return `${publicAppOrigin(request)}/booking/manage/${token}`;
}

export function successUrl(request: Request, token: string) {
  return `${publicAppOrigin(request)}/booking/success/${token}`;
}

export function statusLineText(view: ManagedBookingView, manageUrl: string) {
  const labels: Record<ManagedBookingStatus, string> = {
    confirmed: "已確認",
    waitlist: view.waitlistPosition ? `候補中（第 ${view.waitlistPosition} 位）` : "候補中",
    promoted: "已由候補遞補",
    cancelled: "已取消",
    schedule_cancelled: "班次已取消",
  };

  return [
    "【員工車報名狀態】",
    `員工：${view.displayName}`,
    `日期：${view.serviceDate}`,
    `班次：${view.departureTime} ${view.routeName}`,
    `上車點：${view.pickupPoint}`,
    `狀態：${labels[view.status]}`,
    `管理報名：${manageUrl}`,
  ].join("\n");
}

async function toManagedView(booking: BookingWithSchedule, now = new Date()): Promise<ManagedBookingView> {
  const prisma = getPrisma();
  const deadline = bookingDeadline(booking.schedule.serviceDate, booking.schedule.departureTime);
  let waitlistPosition: number | null = null;

  if (booking.status === "waitlist") {
    const ahead = await prisma.booking.count({
      where: {
        scheduleId: booking.scheduleId,
        status: "waitlist",
        OR: [
          { createdAt: { lt: booking.createdAt } },
          { createdAt: booking.createdAt, id: { lt: booking.id } },
        ],
      },
    });
    waitlistPosition = ahead + 1;
  }

  const status = managedStatus(booking);
  const cancellationUnavailableReason = cancellationAvailability(status, deadline, now);

  return {
    bookingCode: booking.bookingCode,
    displayName: maskEmployeeName(booking.employeeName),
    status,
    serviceDate: displayDate(booking.schedule.serviceDate),
    routeName: booking.schedule.routeName,
    departureTime: booking.schedule.departureTime,
    pickupPoint: booking.schedule.pickupPoint,
    createdAt: booking.createdAt.toISOString(),
    deadline: deadline.toISOString(),
    canCancel: cancellationUnavailableReason === null,
    cancellationUnavailableReason,
    waitlistPosition,
  };
}

export async function getManagedBooking(token: string, now = new Date()) {
  if (!isManagementToken(token)) return null;
  const prisma = getPrisma();
  const booking = await prisma.booking.findUnique({
    where: { managementTokenHash: hashManagementToken(token) },
    include: { schedule: true },
  });
  return booking ? toManagedView(booking, now) : null;
}

export async function cancelManagedBooking(token: string, now = new Date()) {
  if (!isManagementToken(token)) throw new BusinessError("無法使用此管理連結", 404);
  const tokenHash = hashManagementToken(token);
  const prisma = getPrisma();
  const booking = await prisma.booking.findUnique({ where: { managementTokenHash: tokenHash }, select: { id: true } });
  if (!booking) throw new BusinessError("無法使用此管理連結", 404);

  const result = await cancelBooking(booking.id, {
    source: "employee",
    enforceDeadline: true,
    expectedTokenHash: tokenHash,
    now,
  });
  const view = await getManagedBooking(token, now);
  if (!view) throw new BusinessError("無法使用此管理連結", 404);
  return { ...result, view };
}

export async function rotateManagementToken(bookingId: string) {
  const token = generateManagementToken();
  const tokenHash = hashManagementToken(token);
  const prisma = getPrisma();

  await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId }, select: { id: true, managementTokenHash: true } });
    if (!booking) throw new BusinessError("找不到預約", 404);
    await tx.booking.update({
      where: { id: bookingId },
      data: { managementTokenHash: tokenHash, managementTokenCreatedAt: new Date() },
    });
    await logAudit(tx, {
      action: booking.managementTokenHash ? "booking.management_token.rotate" : "booking.management_token.create",
      targetType: "booking",
      targetId: bookingId,
      oldValue: { hasManagementToken: Boolean(booking.managementTokenHash) },
      newValue: { hasManagementToken: true },
      source: "admin",
    });
  });

  return token;
}
