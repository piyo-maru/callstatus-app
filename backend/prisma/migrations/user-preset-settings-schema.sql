-- ユーザープリセット設定テーブル設計（案）
-- 既存スキーマに影響を与えない独立した構造

-- 1. ユーザープリセット設定メインテーブル
CREATE TABLE "UserPresetSettings" (
  "id" SERIAL PRIMARY KEY,
  "staffId" INTEGER REFERENCES "Staff"("id") ON DELETE CASCADE,
  "pagePresetSettings" JSONB NOT NULL DEFAULT '{}', -- ページ別プリセット設定
  "lastModified" TIMESTAMP NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE("staffId")
);

-- 2. 個別プリセット定義テーブル
CREATE TABLE "UserPreset" (
  "id" SERIAL PRIMARY KEY,
  "userPresetSettingsId" INTEGER REFERENCES "UserPresetSettings"("id") ON DELETE CASCADE,
  "presetId" VARCHAR(255) NOT NULL, -- 'standard-work', 'remote-work'等
  "name" VARCHAR(255) NOT NULL,
  "displayName" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "category" VARCHAR(50) NOT NULL, -- 'general', 'time-off', 'special', 'night-duty'
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "customizable" BOOLEAN NOT NULL DEFAULT true,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE("userPresetSettingsId", "presetId")
);

-- 3. プリセット内スケジュール詳細テーブル
CREATE TABLE "UserPresetSchedule" (
  "id" SERIAL PRIMARY KEY,
  "userPresetId" INTEGER REFERENCES "UserPreset"("id") ON DELETE CASCADE,
  "status" VARCHAR(50) NOT NULL, -- 'online', 'remote', 'off'等
  "startTime" DECIMAL(4,2) NOT NULL, -- 9.5 = 9:30
  "endTime" DECIMAL(4,2) NOT NULL,
  "memo" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX "idx_user_preset_settings_staff_id" ON "UserPresetSettings"("staffId");
CREATE INDEX "idx_user_preset_user_settings_id" ON "UserPreset"("userPresetSettingsId");
CREATE INDEX "idx_user_preset_schedule_preset_id" ON "UserPresetSchedule"("userPresetId");

-- コメント追加
COMMENT ON TABLE "UserPresetSettings" IS 'ユーザー別プリセット設定メインテーブル';
COMMENT ON TABLE "UserPreset" IS '個別プリセット定義テーブル';
COMMENT ON TABLE "UserPresetSchedule" IS 'プリセット内スケジュール詳細テーブル';