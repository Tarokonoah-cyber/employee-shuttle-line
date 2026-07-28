-- Keep the current environment-based recipients active until an admin
-- explicitly takes control from the web console.
ALTER TABLE "line_user_profiles"
ADD COLUMN "receives_gro_notifications" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "line_user_profiles_receives_gro_notifications_idx"
ON "line_user_profiles"("receives_gro_notifications");

CREATE TABLE "gro_notification_settings" (
  "id" TEXT NOT NULL,
  "managed_in_admin" BOOLEAN NOT NULL DEFAULT false,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gro_notification_settings_pkey" PRIMARY KEY ("id")
);
