/*
  Warnings:

  - You are about to drop the column `breakHours` on the `Contract` table. All the data in the column will be lost.
  - You are about to drop the column `department` on the `Contract` table. All the data in the column will be lost.
  - You are about to drop the column `workDays` on the `Contract` table. All the data in the column will be lost.
  - You are about to drop the column `workHours` on the `Contract` table. All the data in the column will be lost.
  - Added the required column `dept` to the `Contract` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Contract" DROP COLUMN "breakHours",
DROP COLUMN "department",
DROP COLUMN "workDays",
DROP COLUMN "workHours",
ADD COLUMN     "dept" TEXT NOT NULL,
ADD COLUMN     "fridayHours" TEXT,
ADD COLUMN     "mondayHours" TEXT,
ADD COLUMN     "saturdayHours" TEXT,
ADD COLUMN     "sundayHours" TEXT,
ADD COLUMN     "thursdayHours" TEXT,
ADD COLUMN     "tuesdayHours" TEXT,
ADD COLUMN     "wednesdayHours" TEXT;
