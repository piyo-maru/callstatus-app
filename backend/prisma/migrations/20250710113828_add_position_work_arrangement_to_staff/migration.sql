/*
  Warnings:

  - You are about to drop the column `viewMode` on the `global_display_settings` table. All the data in the column will be lost.
  - Added the required column `workArrangement` to the `Staff` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "idx_adjustment_date_utc";

-- DropIndex
DROP INDEX "idx_historical_schedules_date_utc";

-- DropIndex
DROP INDEX "idx_historical_schedules_date_utc_staff";

-- DropIndex
DROP INDEX "idx_snapshot_logs_target_date_utc";

-- AlterTable
ALTER TABLE "Adjustment" ALTER COLUMN "date_utc" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "start_utc" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "end_utc" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt_utc" DROP DEFAULT,
ALTER COLUMN "createdAt_utc" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt_utc" DROP DEFAULT,
ALTER COLUMN "updatedAt_utc" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "approvedAt_utc" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "rejectedAt_utc" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "position" TEXT,
ADD COLUMN     "workArrangement" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "global_display_settings" DROP COLUMN "viewMode";

-- AlterTable
ALTER TABLE "historical_schedules" ALTER COLUMN "date_utc" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "start_utc" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "end_utc" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "snapshotAt_utc" DROP DEFAULT,
ALTER COLUMN "snapshotAt_utc" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "snapshot_logs" ALTER COLUMN "targetDate_utc" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "startedAt_utc" DROP DEFAULT,
ALTER COLUMN "startedAt_utc" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "completedAt_utc" SET DATA TYPE TIMESTAMP(3);
