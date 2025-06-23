-- Add displayOrder column to DepartmentSettings
ALTER TABLE "DepartmentSettings" ADD COLUMN "displayOrder" INTEGER DEFAULT 0;

-- Update existing records with incremental displayOrder
WITH numbered_rows AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY type ORDER BY name) as rn
  FROM "DepartmentSettings"
)
UPDATE "DepartmentSettings" 
SET "displayOrder" = numbered_rows.rn * 10
FROM numbered_rows 
WHERE "DepartmentSettings".id = numbered_rows.id;