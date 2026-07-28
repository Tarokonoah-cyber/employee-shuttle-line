import assert from "node:assert/strict";
import test from "node:test";
import type { ShuttleSchedule } from "@prisma/client";
import { decorateScheduleRows, decorateSchedules } from "./booking-service";
import { taipeiScheduleDateTime } from "./dates";
import { scheduleInputSchema, templateInputSchema } from "./schemas";
import { normalizeDepartureTime } from "./schedule-time";

function schedule(input: Partial<ShuttleSchedule> = {}) {
  return {
    id: input.id ?? "schedule_1",
    serviceDate: input.serviceDate ?? new Date("2026-07-14T00:00:00.000Z"),
    routeName: input.routeName ?? "Employee shuttle",
    departureTime: "departureTime" in input ? input.departureTime! : "07:30",
    registrationDeadline: input.registrationDeadline ?? null,
    pickupPoint: input.pickupPoint ?? "Dorm",
    capacity: "capacity" in input ? input.capacity! : 20,
    registrationOpen: input.registrationOpen ?? true,
    waitlistEnabled: input.waitlistEnabled ?? true,
    note: input.note ?? null,
    createdAt: input.createdAt ?? new Date("2026-07-13T00:00:00.000Z"),
    updatedAt: input.updatedAt ?? new Date("2026-07-13T00:00:00.000Z"),
    cancelledAt: input.cancelledAt ?? null,
  } satisfies ShuttleSchedule;
}

test("schedule list with no rows returns an empty array", async () => {
  assert.deepEqual(await decorateSchedules([]), []);
});

test("admin schedule input normalizes single digit hour before create", () => {
  const input = scheduleInputSchema.parse({
    serviceDate: "2026-07-14",
    routeName: "Employee shuttle",
    departureTime: "7:30",
    pickupPoint: "Dorm",
    capacity: 20,
    registrationOpen: true,
    waitlistEnabled: true,
  });

  assert.equal(input.departureTime, "07:30");
  assert.equal(input.registrationCutoffDayOffset, 1);
  assert.equal(input.registrationCutoffTime, "20:00");
});

test("employee schedule view can read an open schedule", () => {
  const rows = decorateScheduleRows(
    [schedule()],
    [{ scheduleId: "schedule_1", status: "confirmed", _count: { status: 8 } }],
    new Date("2026-07-13T00:00:00.000Z"),
  );

  assert.equal(rows[0].registrationOpen, true);
  assert.equal(rows[0].confirmedCount, 8);
  assert.equal(rows[0].remainingCount, 12);
});

test("configured registration deadline overrides the legacy global cutoff", () => {
  const registrationDeadline = new Date("2026-07-13T12:00:00.000Z");
  const rows = decorateScheduleRows(
    [schedule({ registrationDeadline })],
    [],
    new Date("2026-07-13T11:59:00.000Z"),
  );

  assert.equal(rows[0].registrationDeadline.toISOString(), registrationDeadline.toISOString());
  assert.equal(rows[0].isRegistrationClosedByTime, false);
});

test("same-day cutoff must be earlier than departure", () => {
  const result = scheduleInputSchema.safeParse({
    serviceDate: "2026-07-14",
    routeName: "Employee shuttle",
    departureTime: "07:30",
    registrationCutoffDayOffset: 0,
    registrationCutoffTime: "08:00",
    pickupPoint: "Dorm",
    capacity: 20,
  });

  assert.equal(result.success, false);
});

test("template cutoff defaults to the previous day at 20:00", () => {
  const input = templateInputSchema.parse({
    routeName: "Employee shuttle",
    departureTime: "07:30",
    pickupPoint: "Dorm",
    defaultCapacity: 20,
  });

  assert.equal(input.registrationCutoffDayOffset, 1);
  assert.equal(input.registrationCutoffTime, "20:00");
});

test("Taipei schedule date does not shift the service date", () => {
  assert.equal(taipeiScheduleDateTime("2026-07-14", "7:30").toISOString(), "2026-07-13T23:30:00.000Z");
});

test("null or malformed schedule data does not throw while shaping rows", () => {
  const rows = decorateScheduleRows(
    [schedule({ departureTime: null as unknown as string, capacity: null as unknown as number })],
    [],
    new Date("2026-07-13T00:00:00.000Z"),
  );

  assert.equal(rows[0].departureTime, "--:--");
  assert.equal(rows[0].capacity, 0);
  assert.equal(rows[0].registrationOpen, false);
});

test("departure time normalization rejects invalid values", () => {
  assert.equal(normalizeDepartureTime("25:00"), null);
  assert.equal(normalizeDepartureTime("07:70"), null);
});
