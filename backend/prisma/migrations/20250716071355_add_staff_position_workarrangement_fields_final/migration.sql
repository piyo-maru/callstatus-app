-- Add position and workArrangement fields to Staff table

-- AlterTable: Add position and workArrangement fields to Staff table
ALTER TABLE "Staff" ADD COLUMN "position" TEXT;
ALTER TABLE "Staff" ADD COLUMN "workArrangement" TEXT;