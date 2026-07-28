import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = process.cwd();

test("Railway runs production-safe migration before deploy", () => {
  const config = JSON.parse(readFileSync(`${root}/railway.json`, "utf8"));
  assert.equal(config.build.builder, "RAILPACK");
  assert.deepEqual(config.deploy.preDeployCommand, ["npm run prisma:migrate"]);
  assert.equal(config.deploy.healthcheckPath, "/api/health");
});

test("Prisma Railway datasource only requires DATABASE_URL", () => {
  const schema = readFileSync(`${root}/prisma/schema.prisma`, "utf8");
  assert.match(schema, /env\("DATABASE_URL"\)/);
  assert.doesNotMatch(schema, /DIRECT_URL|directUrl/);
});

test("booking management migration is additive", () => {
  const migration = readFileSync(`${root}/prisma/migrations/20260711000000_booking_management/migration.sql`, "utf8");
  assert.match(migration, /ADD COLUMN "management_token_hash" TEXT/);
  assert.match(migration, /CREATE UNIQUE INDEX "bookings_management_token_hash_key"/);
  assert.doesNotMatch(migration, /DROP TABLE|TRUNCATE|DELETE FROM/i);
});

test("LINE profile migration is additive and keeps old bookings nullable", () => {
  const migration = readFileSync(`${root}/prisma/migrations/20260718000000_line_user_profiles/migration.sql`, "utf8");
  assert.match(migration, /CREATE TABLE "line_user_profiles"/);
  assert.match(migration, /ADD COLUMN "line_profile_id" TEXT/);
  assert.doesNotMatch(migration, /line_profile_id" TEXT NOT NULL/);
  assert.doesNotMatch(migration, /DROP TABLE|TRUNCATE|DELETE FROM/i);
});

test("registration deadline migration is additive and preserves legacy schedules", () => {
  const migration = readFileSync(`${root}/prisma/migrations/20260728010000_schedule_registration_deadlines/migration.sql`, "utf8");
  assert.match(migration, /ADD COLUMN "registration_deadline" TIMESTAMP\(3\)/);
  assert.match(migration, /ADD COLUMN "registration_cutoff_day_offset" INTEGER NOT NULL DEFAULT 1/);
  assert.match(migration, /ADD COLUMN "registration_cutoff_time" TEXT NOT NULL DEFAULT '20:00'/);
  assert.doesNotMatch(migration, /\bUPDATE\b|\bDROP TABLE\b|\bTRUNCATE\b|\bDELETE FROM\b/i);
});

test("GRO notification admin migration is additive and preserves environment fallback", () => {
  const migration = readFileSync(`${root}/prisma/migrations/20260728020000_gro_notification_admin/migration.sql`, "utf8");
  assert.match(migration, /ADD COLUMN "receives_gro_notifications" BOOLEAN NOT NULL DEFAULT false/);
  assert.match(migration, /CREATE TABLE "gro_notification_settings"/);
  assert.match(migration, /"managed_in_admin" BOOLEAN NOT NULL DEFAULT false/);
  assert.doesNotMatch(migration, /\bUPDATE\b|\bDROP TABLE\b|\bTRUNCATE\b|\bDELETE FROM\b/i);
});

test("quick template creation calculates a deadline for every new schedule", () => {
  const route = readFileSync(`${root}/src/app/api/admin/schedules/create-from-template/route.ts`, "utf8");
  assert.match(route, /registrationDeadline: registrationDeadlineFromRule/);
  assert.match(route, /template\.registrationCutoffDayOffset/);
  assert.match(route, /template\.registrationCutoffTime/);
});

test("active-booking partial unique constraint remains in migration history", () => {
  const initial = readFileSync(`${root}/prisma/migrations/20260709000000_init/migration.sql`, "utf8");
  assert.match(initial, /bookings_schedule_identity_active_unique/);
  assert.match(initial, /WHERE "status" <> 'cancelled'/);
});

test("cancellation transaction keeps lock, idempotency and first-waitlist guardrails", () => {
  const service = readFileSync(`${root}/src/lib/booking-service.ts`, "utf8");
  assert.match(service, /FROM shuttle_schedules WHERE id = \$\{locator\.scheduleId\} FOR UPDATE/);
  assert.match(service, /booking\.status === "cancelled"/);
  assert.match(service, /orderBy: \[\{ createdAt: "asc" \}, \{ id: "asc" \}\]/);
  assert.match(service, /TransactionIsolationLevel\.Serializable/);
  assert.match(service, /P2034/);
});

test("public booking API never serializes the management token hash", () => {
  const route = readFileSync(`${root}/src/app/api/bookings/route.ts`, "utf8");
  assert.doesNotMatch(route, /managementTokenHash/);
  assert.match(route, /managementUrl/);
});

test("management lookup returns only the safe booking view", () => {
  const route = readFileSync(`${root}/src/app/api/bookings/manage/[token]/route.ts`, "utf8");
  assert.match(route, /\{ booking \}/);
  assert.doesNotMatch(route, /managementUrl|statusLineText|managementTokenHash/);
});

test("admin booking API replaces token hash with a boolean capability", () => {
  const route = readFileSync(`${root}/src/app/api/admin/bookings/route.ts`, "utf8");
  assert.match(route, /hasManagementToken: Boolean\(managementTokenHash\)/);
});

test("booking identity comes only from the signed LINE session", () => {
  const route = readFileSync(`${root}/src/app/api/bookings/route.ts`, "utf8");
  assert.match(route, /getLineSessionProfileId/);
  assert.doesNotMatch(route, /body\.lineUserId|input\.lineUserId/);
  const service = readFileSync(`${root}/src/lib/booking-service.ts`, "utf8");
  assert.match(service, /lineProfileId: input\.lineProfileId/);
  assert.match(service, /rememberedLineProfileData/);
});

test("self profile API cannot select another LINE user by query string", () => {
  const route = readFileSync(`${root}/src/app/api/me/profile/route.ts`, "utf8");
  assert.match(route, /getLineSessionProfileId/);
  assert.doesNotMatch(route, /searchParams|lineUserId/);
});

test("admin LINE responses mask user ids and omit LINE tokens", () => {
  const route = readFileSync(`${root}/src/app/api/admin/line-users/route.ts`, "utf8");
  assert.match(route, /maskLineUserId/);
  assert.doesNotMatch(route, /accessToken|idToken|CHANNEL_SECRET/);
});

test("booking and schedule cancellation queue LINE work without blocking API responses", () => {
  const bookingRoute = readFileSync(`${root}/src/app/api/bookings/route.ts`, "utf8");
  const scheduleRoute = readFileSync(`${root}/src/app/api/admin/schedules/[id]/route.ts`, "utf8");
  const notification = readFileSync(`${root}/src/lib/line-notification.ts`, "utf8");

  assert.match(bookingRoute, /after\(\(\) => deliverQueuedLineNotifications/);
  assert.match(scheduleRoute, /input\.cancelled && !oldValue\.cancelledAt/);
  assert.match(scheduleRoute, /queueScheduleCancellationNotifications/);
  assert.match(scheduleRoute, /FOR UPDATE/);
  assert.match(notification, /LINE_CHANNEL_ACCESS_TOKEN/);
  assert.match(notification, /LINE_GRO_TARGET_IDS/);
  assert.match(notification, /effectiveGroNotificationTargets/);
  assert.match(notification, /receivesGroNotifications: true/);
  assert.doesNotMatch(notification, /Bearer [A-Za-z0-9_-]{20,}/);
});
