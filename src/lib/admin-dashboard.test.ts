import assert from "node:assert/strict";
import test from "node:test";
import type { Booking, ShuttleSchedule } from "@prisma/client";
import {
  buildDashboardPayload,
  buildDashboardSchedules,
  buildLatestBookings,
  emptyDashboardPayload,
  normalizeDashboardDate,
} from "./admin-dashboard";

function schedule(input: Partial<ShuttleSchedule> = {}) {
  return {
    id: input.id ?? "schedule_1",
    serviceDate: input.serviceDate ?? new Date("2026-07-14T00:00:00.000Z"),
    routeName: input.routeName ?? "Employee shuttle",
    departureTime: input.departureTime ?? "07:30",
    pickupPoint: input.pickupPoint ?? "Dorm",
    capacity: input.capacity ?? 20,
    registrationOpen: input.registrationOpen ?? true,
    waitlistEnabled: input.waitlistEnabled ?? true,
    note: input.note ?? null,
    createdAt: input.createdAt ?? new Date("2026-07-13T00:00:00.000Z"),
    updatedAt: input.updatedAt ?? new Date("2026-07-13T00:00:00.000Z"),
    cancelledAt: input.cancelledAt ?? null,
  } satisfies ShuttleSchedule;
}

function latestBooking(input: Partial<Booking> = {}) {
  return {
    id: input.id ?? "booking_1",
    scheduleId: input.scheduleId ?? "missing_schedule",
    employeeName: input.employeeName ?? "Ada",
    department: input.department ?? "GRO",
    employeeNo: input.employeeNo ?? null,
    phone: input.phone ?? null,
    status: input.status ?? "confirmed",
    bookingCode: input.bookingCode ?? "ABC123",
    note: input.note ?? null,
    adminOverride: input.adminOverride ?? false,
    createdBy: input.createdBy ?? "employee",
    identityKey: input.identityKey ?? "ada",
    createdAt: input.createdAt ?? new Date("2026-07-13T01:00:00.000Z"),
    updatedAt: input.updatedAt ?? new Date("2026-07-13T01:00:00.000Z"),
    cancelledAt: input.cancelledAt ?? null,
    cancellationSource: input.cancellationSource ?? null,
    promotedAt: input.promotedAt ?? null,
    managementTokenHash: input.managementTokenHash ?? null,
    managementTokenCreatedAt: input.managementTokenCreatedAt ?? null,
    lineProfileId: input.lineProfileId ?? null,
  } satisfies Booking;
}

test("dashboard empty state keeps a fixed response shape", () => {
  assert.deepEqual(emptyDashboardPayload("2026-07-14"), {
    date: "2026-07-14",
    summary: { confirmed: 0, waitlist: 0, cancelled: 0, remaining: 0, todayNew: 0 },
    schedules: [],
    latestBookings: [],
    attention: [],
  });
});

test("invalid dashboard date falls back to tomorrow input format", () => {
  assert.match(normalizeDashboardDate("not-a-date"), /^\d{4}-\d{2}-\d{2}$/);
});

test("schedule with invalid departure time does not crash dashboard shaping", () => {
  const shaped = buildDashboardSchedules([schedule({ departureTime: "bad-time", capacity: 1 })], new Map(), new Date("2026-07-13T00:00:00Z"));

  assert.equal(shaped[0].departureTime, "--:--");
  assert.equal(shaped[0].registrationDeadline, null);
  assert.equal(shaped[0].remainingCount, 1);
});

test("schedule counts and attention are safe when there are no bookings", () => {
  const schedules = buildDashboardSchedules([schedule({ capacity: 0 })], new Map());
  const payload = buildDashboardPayload({ date: "2026-07-14", schedules, latestBookings: [], todayNew: 0 });

  assert.equal(payload.summary.confirmed, 0);
  assert.equal(payload.summary.remaining, 0);
  assert.equal(payload.attention.length, 1);
});

test("latest bookings tolerate missing schedule rows", () => {
  const latest = buildLatestBookings([latestBooking()], []);

  assert.equal(latest[0].schedule.routeName, "已刪除班次");
  assert.equal(latest[0].schedule.departureTime, "--:--");
  assert.equal(latest[0].createdAt, "2026-07-13T01:00:00.000Z");
});
