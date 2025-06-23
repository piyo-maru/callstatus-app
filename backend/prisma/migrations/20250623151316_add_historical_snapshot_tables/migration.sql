-- CreateEnum
CREATE TYPE "SnapshotStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'ROLLED_BACK');

-- AlterTable
ALTER TABLE "DepartmentSettings" ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "historical_schedules" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "originalId" INTEGER,
    "batchId" TEXT NOT NULL,
    "staffId" INTEGER NOT NULL,
    "staffEmpNo" TEXT,
    "staffName" TEXT NOT NULL,
    "staffDepartment" TEXT NOT NULL,
    "staffGroup" TEXT NOT NULL,
    "staffIsActive" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "memo" TEXT,
    "reason" TEXT,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" TEXT NOT NULL DEFAULT '1.0',

    CONSTRAINT "historical_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snapshot_logs" (
    "id" SERIAL NOT NULL,
    "batchId" TEXT NOT NULL,
    "targetDate" DATE NOT NULL,
    "recordCount" INTEGER NOT NULL,
    "status" "SnapshotStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "snapshot_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "historical_schedules_date_idx" ON "historical_schedules"("date");

-- CreateIndex
CREATE INDEX "historical_schedules_date_staffDepartment_idx" ON "historical_schedules"("date", "staffDepartment");

-- CreateIndex
CREATE INDEX "historical_schedules_date_staffId_idx" ON "historical_schedules"("date", "staffId");

-- CreateIndex
CREATE INDEX "historical_schedules_staffEmpNo_idx" ON "historical_schedules"("staffEmpNo");

-- CreateIndex
CREATE INDEX "historical_schedules_batchId_idx" ON "historical_schedules"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "snapshot_logs_batchId_key" ON "snapshot_logs"("batchId");

-- CreateIndex
CREATE INDEX "snapshot_logs_targetDate_idx" ON "snapshot_logs"("targetDate");

-- CreateIndex
CREATE INDEX "snapshot_logs_status_idx" ON "snapshot_logs"("status");
