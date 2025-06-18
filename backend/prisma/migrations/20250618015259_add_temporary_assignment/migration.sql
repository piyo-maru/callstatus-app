-- CreateTable
CREATE TABLE "TemporaryAssignment" (
    "id" SERIAL NOT NULL,
    "staffId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "tempDept" TEXT NOT NULL,
    "tempGroup" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '支援',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemporaryAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TemporaryAssignment_staffId_startDate_endDate_key" ON "TemporaryAssignment"("staffId", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "TemporaryAssignment" ADD CONSTRAINT "TemporaryAssignment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
