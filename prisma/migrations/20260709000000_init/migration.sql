CREATE TYPE "BookingStatus" AS ENUM ('confirmed', 'waitlist', 'cancelled');
CREATE TYPE "BookingCreatedBy" AS ENUM ('employee', 'admin');
CREATE TYPE "NotificationChannel" AS ENUM ('LINE');
CREATE TYPE "NotificationStatus" AS ENUM ('pending', 'skipped', 'sent', 'failed');

CREATE TABLE "shuttle_schedules" (
  "id" TEXT NOT NULL,
  "service_date" DATE NOT NULL,
  "route_name" TEXT NOT NULL,
  "departure_time" TEXT NOT NULL,
  "pickup_point" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL,
  "registration_open" BOOLEAN NOT NULL DEFAULT true,
  "waitlist_enabled" BOOLEAN NOT NULL DEFAULT true,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "shuttle_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bookings" (
  "id" TEXT NOT NULL,
  "schedule_id" TEXT NOT NULL,
  "employee_name" TEXT NOT NULL,
  "department" TEXT NOT NULL,
  "employee_no" TEXT,
  "phone" TEXT,
  "status" "BookingStatus" NOT NULL,
  "booking_code" TEXT NOT NULL,
  "note" TEXT,
  "admin_override" BOOLEAN NOT NULL DEFAULT false,
  "created_by" "BookingCreatedBy" NOT NULL DEFAULT 'employee',
  "identity_key" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "cancelled_at" TIMESTAMP(3),
  CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "target_type" TEXT NOT NULL,
  "target_id" TEXT,
  "old_value" JSONB,
  "new_value" JSONB,
  "source" TEXT NOT NULL DEFAULT 'system',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_logs" (
  "id" TEXT NOT NULL,
  "booking_id" TEXT,
  "channel" "NotificationChannel" NOT NULL,
  "target" TEXT,
  "message" TEXT NOT NULL,
  "status" "NotificationStatus" NOT NULL DEFAULT 'pending',
  "error_message" TEXT,
  "sent_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "schedule_templates" (
  "id" TEXT NOT NULL,
  "route_name" TEXT NOT NULL,
  "departure_time" TEXT NOT NULL,
  "pickup_point" TEXT NOT NULL,
  "default_capacity" INTEGER NOT NULL,
  "waitlist_enabled" BOOLEAN NOT NULL DEFAULT true,
  "note" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "schedule_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bookings_booking_code_key" ON "bookings"("booking_code");
CREATE UNIQUE INDEX "bookings_schedule_identity_active_unique" ON "bookings"("schedule_id", "identity_key") WHERE "status" <> 'cancelled';
CREATE INDEX "bookings_schedule_id_status_idx" ON "bookings"("schedule_id", "status");
CREATE INDEX "bookings_identity_key_idx" ON "bookings"("identity_key");
CREATE INDEX "shuttle_schedules_service_date_idx" ON "shuttle_schedules"("service_date");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");
CREATE INDEX "notification_logs_booking_id_idx" ON "notification_logs"("booking_id");
CREATE INDEX "schedule_templates_active_idx" ON "schedule_templates"("active");

ALTER TABLE "bookings" ADD CONSTRAINT "bookings_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "shuttle_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
