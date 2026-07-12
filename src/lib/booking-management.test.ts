import assert from "node:assert/strict";
import test from "node:test";
import type { Booking, ShuttleSchedule } from "@prisma/client";
import { cancellationAvailability, managedStatus } from "./booking-management";

function booking(status: Booking["status"], options: { promoted?: boolean; scheduleCancelled?: boolean } = {}) {
  return {
    status,
    promotedAt: options.promoted ? new Date() : null,
    schedule: { cancelledAt: options.scheduleCancelled ? new Date() : null },
  } as Booking & { schedule: ShuttleSchedule };
}

test("confirmed booking is displayed as confirmed", () => assert.equal(managedStatus(booking("confirmed")), "confirmed"));
test("promoted waitlist is displayed separately", () => assert.equal(managedStatus(booking("confirmed", { promoted: true })), "promoted"));
test("active waitlist is displayed as waitlist", () => assert.equal(managedStatus(booking("waitlist")), "waitlist"));
test("cancelled booking remains visible as cancelled", () => assert.equal(managedStatus(booking("cancelled")), "cancelled"));
test("schedule cancellation takes precedence", () => assert.equal(managedStatus(booking("confirmed", { scheduleCancelled: true })), "schedule_cancelled"));

test("active booking can cancel before deadline", () => {
  assert.equal(cancellationAvailability("confirmed", new Date("2026-07-12T00:00:00Z"), new Date("2026-07-11T23:00:00Z")), null);
});

test("deadline blocks cancellation on the server policy", () => {
  assert.equal(cancellationAvailability("waitlist", new Date("2026-07-12T00:00:00Z"), new Date("2026-07-12T00:00:00Z")), "deadline_passed");
});

test("repeat cancellation is recognized as already cancelled", () => {
  assert.equal(cancellationAvailability("cancelled", new Date("2026-07-12T00:00:00Z")), "already_cancelled");
});
