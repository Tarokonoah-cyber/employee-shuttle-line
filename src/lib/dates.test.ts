import assert from "node:assert/strict";
import test from "node:test";
import { bookingDeadline, taipeiScheduleDateTime } from "./dates";

test("Taipei departure time is converted to UTC without server timezone drift", () => {
  assert.equal(taipeiScheduleDateTime("2026-07-12", "07:30").toISOString(), "2026-07-11T23:30:00.000Z");
});

test("booking deadline subtracts the configured cutoff", () => {
  assert.equal(bookingDeadline("2026-07-12", "07:30", 60).toISOString(), "2026-07-11T22:30:00.000Z");
});

test("invalid departure time is rejected", () => {
  assert.throws(() => taipeiScheduleDateTime("2026-07-12", "25:00"), /發車時間格式不正確/);
});
