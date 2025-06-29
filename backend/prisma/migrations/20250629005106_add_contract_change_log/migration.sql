-- CreateTable
CREATE TABLE "ContractChangeLog" (
    "id" SERIAL NOT NULL,
    "staffId" INTEGER NOT NULL,
    "changeType" VARCHAR(20) NOT NULL,
    "oldWorkingDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "newWorkingDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "oldHours" JSONB,
    "newHours" JSONB,
    "changeDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "processingStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdBy" TEXT,

    CONSTRAINT "ContractChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractChangeLog_staffId_changeDate_idx" ON "ContractChangeLog"("staffId", "changeDate");

-- AddForeignKey
ALTER TABLE "ContractChangeLog" ADD CONSTRAINT "ContractChangeLog_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
