-- CreateTable
CREATE TABLE "global_display_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "viewMode" TEXT NOT NULL DEFAULT 'normal',
    "maskingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "timeRange" TEXT NOT NULL DEFAULT 'standard',
    "customStatusColors" JSONB NOT NULL DEFAULT '{}',
    "customStatusDisplayNames" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "global_display_settings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "global_display_settings" ADD CONSTRAINT "global_display_settings_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
