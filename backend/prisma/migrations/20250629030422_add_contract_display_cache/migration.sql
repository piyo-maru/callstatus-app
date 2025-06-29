-- CreateTable
CREATE TABLE "ContractDisplayCache" (
    "staffId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "hasContract" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractDisplayCache_pkey" PRIMARY KEY ("staffId","year","month","day")
);

-- CreateIndex
CREATE INDEX "ContractDisplayCache_year_month_idx" ON "ContractDisplayCache"("year", "month");

-- AddForeignKey
ALTER TABLE "ContractDisplayCache" ADD CONSTRAINT "ContractDisplayCache_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
