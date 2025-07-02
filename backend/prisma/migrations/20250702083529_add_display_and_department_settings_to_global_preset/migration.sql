-- AlterTable
ALTER TABLE "global_preset_settings" ADD COLUMN     "departmentSettings" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "displaySettings" JSONB NOT NULL DEFAULT '{}';
