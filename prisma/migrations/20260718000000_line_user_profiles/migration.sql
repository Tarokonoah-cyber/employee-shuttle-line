CREATE TABLE "line_user_profiles" (
    "id" TEXT NOT NULL,
    "line_user_id" TEXT NOT NULL,
    "line_display_name" TEXT,
    "line_picture_url" TEXT,
    "employee_name" TEXT,
    "employee_no" TEXT,
    "department" TEXT,
    "phone" TEXT,
    "default_pickup_location" TEXT,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "line_user_profiles_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "bookings" ADD COLUMN "line_profile_id" TEXT;

CREATE UNIQUE INDEX "line_user_profiles_line_user_id_key" ON "line_user_profiles"("line_user_id");
CREATE INDEX "line_user_profiles_last_used_at_idx" ON "line_user_profiles"("last_used_at");
CREATE INDEX "bookings_line_profile_id_idx" ON "bookings"("line_profile_id");

ALTER TABLE "bookings"
ADD CONSTRAINT "bookings_line_profile_id_fkey"
FOREIGN KEY ("line_profile_id") REFERENCES "line_user_profiles"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
