import { createHash } from "node:crypto";
import type { Booking, Prisma, ShuttleSchedule } from "@prisma/client";
import { displayDate } from "./dates";
import { getPrisma } from "./prisma";

type Tx = Prisma.TransactionClient;
type FetchLike = typeof fetch;

type BookingForGro = Pick<
  Booking,
  "id" | "bookingCode" | "employeeName" | "department" | "employeeNo" | "phone" | "status"
> & {
  schedule: Pick<ShuttleSchedule, "id" | "serviceDate" | "routeName" | "departureTime" | "pickupPoint">;
};

type ScheduleForCancellation = Pick<
  ShuttleSchedule,
  "id" | "serviceDate" | "routeName" | "departureTime" | "pickupPoint"
>;

const LINE_PUSH_ENDPOINT = "https://api.line.me/v2/bot/message/push";
const LINE_PUSH_TIMEOUT_MS = 2_000;
const MAX_SEND_ATTEMPTS = 3;
const LINE_TARGET_PATTERN = /^[UCR][0-9a-f]{32}$/i;

function optionalLineLink(view: "my-bookings" | "admin-bookings", schedule?: ScheduleForCancellation) {
  if (view === "my-bookings") {
    const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID?.trim();
    return liffId ? `https://liff.line.me/${encodeURIComponent(liffId)}?view=my-bookings` : null;
  }

  const baseUrl = process.env.APP_BASE_URL?.trim();
  if (!baseUrl || !schedule) return null;
  const params = new URLSearchParams({
    date: displayDate(schedule.serviceDate),
    status: "all",
    schedule_id: schedule.id,
  });
  return `${baseUrl.replace(/\/+$/, "")}/admin/bookings?${params.toString()}`;
}

function uniqueValidTargets(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter((value) => LINE_TARGET_PATTERN.test(value)))];
}

export function groNotificationTargets(
  configured = process.env.LINE_GRO_TARGET_IDS ?? process.env.LINE_GRO_TARGET_ID ?? "",
) {
  return uniqueValidTargets(configured.split(/[\s,;]+/));
}

export function resolveGroNotificationTargets(input: {
  managedInAdmin: boolean;
  databaseTargets?: string[];
  environmentTargets?: string;
}) {
  return input.managedInAdmin
    ? uniqueValidTargets(input.databaseTargets ?? [])
    : groNotificationTargets(input.environmentTargets);
}

export function lineNotificationReadiness(input: {
  managedInAdmin?: boolean;
  databaseTargetCount?: number;
} = {}) {
  const source = input.managedInAdmin ? "admin" : "environment";
  const groTargetCount = input.managedInAdmin
    ? Math.max(0, Math.trunc(input.databaseTargetCount ?? 0))
    : groNotificationTargets().length;
  return {
    status: process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim() && groTargetCount > 0 ? "ready" : "configuration_required",
    accessTokenConfigured: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim()),
    groTargetCount,
    source,
  };
}

async function effectiveGroNotificationTargets(tx: Tx) {
  const settings = await tx.groNotificationSettings.findUnique({
    where: { id: "default" },
    select: { managedInAdmin: true },
  });
  if (!settings?.managedInAdmin) return groNotificationTargets();

  const recipients = await tx.lineUserProfile.findMany({
    where: { receivesGroNotifications: true },
    select: { lineUserId: true },
  });
  return resolveGroNotificationTargets({
    managedInAdmin: true,
    databaseTargets: recipients.map((recipient) => recipient.lineUserId),
  });
}

export function buildGroBookingMessage(booking: BookingForGro) {
  const status = booking.status === "waitlist" ? "候補" : "正取";
  const employeeNo = booking.employeeNo ? `\n員工編號：${booking.employeeNo}` : "";
  const phone = booking.phone ? `\n電話：${booking.phone}` : "";
  const adminUrl = optionalLineLink("admin-bookings", booking.schedule);

  return [
    "【員工車新預約】",
    `日期：${displayDate(booking.schedule.serviceDate)}`,
    `班次：${booking.schedule.departureTime} ${booking.schedule.routeName}`,
    `上車點：${booking.schedule.pickupPoint}`,
    `姓名：${booking.employeeName}`,
    `部門：${booking.department}${employeeNo}${phone}`,
    `狀態：${status}`,
    `預約編號：${booking.bookingCode}`,
    adminUrl ? `後台名單：${adminUrl}` : null,
  ].filter(Boolean).join("\n");
}

export function buildScheduleCancellationMessage(schedule: ScheduleForCancellation) {
  const myBookingsUrl = optionalLineLink("my-bookings");
  return [
    "【員工車班次取消通知】",
    `您預約的 ${displayDate(schedule.serviceDate)} ${schedule.departureTime} ${schedule.routeName} 已取消。`,
    `原上車點：${schedule.pickupPoint}`,
    "您無須再自行取消；如需改搭其他班次，請重新登記。",
    myBookingsUrl ? `我的員工車報名：${myBookingsUrl}` : null,
  ].filter(Boolean).join("\n");
}

export async function queueGroBookingNotifications(tx: Tx, booking: BookingForGro) {
  const message = buildGroBookingMessage(booking);
  const targets = await effectiveGroNotificationTargets(tx);

  if (targets.length === 0) {
    await tx.notificationLog.create({
      data: {
        bookingId: booking.id,
        channel: "LINE",
        message,
        status: "skipped",
        errorMessage: "No GRO LINE notification recipient is configured.",
      },
    });
    return [];
  }

  const logs = await tx.notificationLog.createManyAndReturn({
    data: targets.map((target) => ({
      bookingId: booking.id,
      channel: "LINE",
      target,
      message,
      status: "pending",
    })),
    select: { id: true },
  });

  return logs.map((log) => log.id);
}

export async function queueScheduleCancellationNotifications(tx: Tx, schedule: ScheduleForCancellation) {
  const bookings = await tx.booking.findMany({
    where: {
      scheduleId: schedule.id,
      status: { in: ["confirmed", "waitlist"] },
    },
    select: {
      id: true,
      lineProfile: { select: { lineUserId: true } },
    },
  });
  const message = buildScheduleCancellationMessage(schedule);
  if (bookings.length === 0) return [];

  const logs = await tx.notificationLog.createManyAndReturn({
    data: bookings.map((booking) => {
      const target = booking.lineProfile?.lineUserId;
      return {
        bookingId: booking.id,
        channel: "LINE" as const,
        target,
        message,
        status: target ? "pending" as const : "skipped" as const,
        errorMessage: target ? null : "Booking has no verified LINE user ID.",
      };
    }),
    select: { id: true, status: true },
  });

  return logs.filter((log) => log.status === "pending").map((log) => log.id);
}

export function lineRetryKey(notificationId: string) {
  const bytes = createHash("sha256").update(`employee-shuttle:${notificationId}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function retryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function sendLinePush(
  input: { notificationId: string; target: string; message: string; accessToken: string },
  fetcher: FetchLike = fetch,
) {
  if (!LINE_TARGET_PATTERN.test(input.target)) {
    return { sent: false, error: "Invalid LINE notification target." };
  }

  const retryKey = lineRetryKey(input.notificationId);
  let lastError = "LINE push failed.";

  for (let attempt = 0; attempt < MAX_SEND_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetcher(LINE_PUSH_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          "Content-Type": "application/json",
          "X-Line-Retry-Key": retryKey,
        },
        body: JSON.stringify({
          to: input.target,
          messages: [{ type: "text", text: input.message }],
          notificationDisabled: false,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(LINE_PUSH_TIMEOUT_MS),
      });

      if (response.ok || response.status === 409) return { sent: true, error: null };

      const detail = (await response.text().catch(() => "")).trim().slice(0, 300);
      lastError = `LINE API HTTP ${response.status}${detail ? `: ${detail}` : ""}`;
      if (!retryableStatus(response.status)) break;
    } catch (error) {
      lastError = error instanceof Error ? `LINE push network error: ${error.name}` : "LINE push network error.";
    }

    if (attempt < MAX_SEND_ATTEMPTS - 1) await wait(200 * (attempt + 1));
  }

  return { sent: false, error: lastError };
}

export async function deliverQueuedLineNotifications(
  notificationIds: string[],
  dependencies: { fetcher?: FetchLike } = {},
) {
  if (notificationIds.length === 0) return;

  const prisma = getPrisma();
  const logs = await prisma.notificationLog.findMany({
    where: {
      id: { in: notificationIds },
      status: { in: ["pending", "failed"] },
    },
    select: { id: true, target: true, message: true },
  });
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();

  await Promise.allSettled(
    logs.map(async (log) => {
      const result = accessToken && log.target
        ? await sendLinePush(
            {
              notificationId: log.id,
              target: log.target,
              message: log.message,
              accessToken,
            },
            dependencies.fetcher,
          )
        : {
            sent: false,
            error: accessToken ? "LINE notification target is missing." : "LINE_CHANNEL_ACCESS_TOKEN is not configured.",
          };

      await prisma.notificationLog.update({
        where: { id: log.id },
        data: {
          status: result.sent ? "sent" : "failed",
          errorMessage: result.error,
          sentAt: result.sent ? new Date() : null,
        },
      });
    }),
  );
}
