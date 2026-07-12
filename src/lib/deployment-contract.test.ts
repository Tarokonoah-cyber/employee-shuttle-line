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
  assert.doesNotMatch(migration, /DROP|TRUNCATE|DELETE/i);
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
