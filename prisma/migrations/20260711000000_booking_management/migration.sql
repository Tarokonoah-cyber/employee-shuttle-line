CREATE TYPE "BookingCancellationSource" AS ENUM ('employee', 'admin', 'system');

ALTER TABLE "shuttle_schedules"
ADD COLUMN "cancelled_at" TIMESTAMP(3);

ALTER TABLE "bookings"
ADD COLUMN "cancellation_source" "BookingCancellationSource",
ADD COLUMN "promoted_at" TIMESTAMP(3),
ADD COLUMN "management_token_hash" TEXT,
ADD COLUMN "management_token_created_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "bookings_management_token_hash_key"
ON "bookings"("management_token_hash");
