import assert from "node:assert/strict";
import test from "node:test";
import {
  adminDateHref,
  bookingFiltersToSearchParams,
  bookingListHref,
  readBookingFilters,
  validAdminDate,
} from "./admin-filters";

test("admin date accepts YYYY-MM-DD and falls back for malformed input", () => {
  assert.equal(validAdminDate("2026-07-15", "2026-07-16"), "2026-07-15");
  assert.equal(validAdminDate("07/15/2026", "2026-07-16"), "2026-07-16");
});

test("booking filters round-trip through supported query parameters", () => {
  const filters = {
    date: "2026-07-15",
    status: "waitlist",
    scheduleId: "schedule-1",
    keyword: "王小明",
  };
  const params = bookingFiltersToSearchParams(filters);
  assert.deepEqual(readBookingFilters(params, "2026-07-16"), filters);
});

test("dashboard deep links only include filters that have values", () => {
  assert.equal(
    bookingListHref({ date: "2026-07-15", status: "waitlist" }),
    "/admin/bookings?date=2026-07-15&status=waitlist",
  );
  assert.equal(adminDateHref("/admin/schedules", "2026-07-15"), "/admin/schedules?date=2026-07-15");
});
