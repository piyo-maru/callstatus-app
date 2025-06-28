-- CreateTable
CREATE TABLE "user_preset_settings" (
    "id" SERIAL NOT NULL,
    "staffId" INTEGER NOT NULL,
    "pagePresetSettings" JSONB NOT NULL DEFAULT '{}',
    "lastModified" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preset_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_presets" (
    "id" SERIAL NOT NULL,
    "userPresetSettingsId" INTEGER NOT NULL,
    "presetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "customizable" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preset_schedules" (
    "id" SERIAL NOT NULL,
    "userPresetId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "startTime" DECIMAL(4,2) NOT NULL,
    "endTime" DECIMAL(4,2) NOT NULL,
    "memo" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_preset_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_preset_settings_staffId_key" ON "user_preset_settings"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "user_presets_userPresetSettingsId_presetId_key" ON "user_presets"("userPresetSettingsId", "presetId");

-- AddForeignKey
ALTER TABLE "user_preset_settings" ADD CONSTRAINT "user_preset_settings_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_presets" ADD CONSTRAINT "user_presets_userPresetSettingsId_fkey" FOREIGN KEY ("userPresetSettingsId") REFERENCES "user_preset_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preset_schedules" ADD CONSTRAINT "user_preset_schedules_userPresetId_fkey" FOREIGN KEY ("userPresetId") REFERENCES "user_presets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
