-- Add per-schedule registration deadlines without rewriting existing schedules.
-- NULL keeps legacy schedules on the existing BOOKING_CUTOFF_MINUTES fallback.
ALTER TABLE "shuttle_schedules"
ADD COLUMN "registration_deadline" TIMESTAMP(3);

-- Templates use a relative rule so they can be applied to any service date.
ALTER TABLE "schedule_templates"
ADD COLUMN "registration_cutoff_day_offset" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "registration_cutoff_time" TEXT NOT NULL DEFAULT '20:00';
