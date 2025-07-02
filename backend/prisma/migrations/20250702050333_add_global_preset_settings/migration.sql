-- CreateTable
CREATE TABLE "global_preset_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "presets" JSONB NOT NULL DEFAULT '[]',
    "categories" JSONB NOT NULL DEFAULT '[]',
    "pagePresetSettings" JSONB NOT NULL DEFAULT '{}',
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "global_preset_settings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "global_preset_settings" ADD CONSTRAINT "global_preset_settings_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
