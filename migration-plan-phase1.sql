-- CLAUDE.md厳格ルール準拠：第1段階マイグレーション計画
-- スナップショット機能コアテーブル対応（最高優先度）

-- =================================================================
-- 第1段階：新カラム追加（既存データ保持・並行運用）
-- =================================================================

-- 1. HistoricalSchedule テーブル：スナップショット履歴データ
ALTER TABLE "historical_schedules" 
ADD COLUMN "date_utc" TIMESTAMP WITH TIME ZONE,
ADD COLUMN "start_utc" TIMESTAMP WITH TIME ZONE,
ADD COLUMN "end_utc" TIMESTAMP WITH TIME ZONE,
ADD COLUMN "snapshotAt_utc" TIMESTAMP WITH TIME ZONE;

-- 2. SnapshotLog テーブル：スナップショット実行履歴
ALTER TABLE "snapshot_logs"
ADD COLUMN "targetDate_utc" TIMESTAMP WITH TIME ZONE,
ADD COLUMN "startedAt_utc" TIMESTAMP WITH TIME ZONE,
ADD COLUMN "completedAt_utc" TIMESTAMP WITH TIME ZONE;

-- 3. Adjustment テーブル：調整レイヤーデータ（スナップショット対象）
ALTER TABLE "Adjustment"
ADD COLUMN "date_utc" TIMESTAMP WITH TIME ZONE,
ADD COLUMN "start_utc" TIMESTAMP WITH TIME ZONE,
ADD COLUMN "end_utc" TIMESTAMP WITH TIME ZONE,
ADD COLUMN "createdAt_utc" TIMESTAMP WITH TIME ZONE,
ADD COLUMN "updatedAt_utc" TIMESTAMP WITH TIME ZONE,
ADD COLUMN "approvedAt_utc" TIMESTAMP WITH TIME ZONE,
ADD COLUMN "rejectedAt_utc" TIMESTAMP WITH TIME ZONE;

-- =================================================================
-- 第2段階：データ変換（既存データを新カラムにコピー）
-- =================================================================

-- 1. HistoricalSchedule データ変換
UPDATE "historical_schedules" SET
  "date_utc" = "date" AT TIME ZONE 'UTC',
  "start_utc" = "start" AT TIME ZONE 'UTC', 
  "end_utc" = "end" AT TIME ZONE 'UTC',
  "snapshotAt_utc" = "snapshotAt" AT TIME ZONE 'UTC'
WHERE "date_utc" IS NULL;

-- 2. SnapshotLog データ変換
UPDATE "snapshot_logs" SET
  "targetDate_utc" = "targetDate" AT TIME ZONE 'UTC',
  "startedAt_utc" = "startedAt" AT TIME ZONE 'UTC',
  "completedAt_utc" = "completedAt" AT TIME ZONE 'UTC'
WHERE "targetDate_utc" IS NULL;

-- 3. Adjustment データ変換
UPDATE "Adjustment" SET
  "date_utc" = "date" AT TIME ZONE 'UTC',
  "start_utc" = "start" AT TIME ZONE 'UTC',
  "end_utc" = "end" AT TIME ZONE 'UTC',
  "createdAt_utc" = "createdAt" AT TIME ZONE 'UTC',
  "updatedAt_utc" = "updatedAt" AT TIME ZONE 'UTC',
  "approvedAt_utc" = "approvedAt" AT TIME ZONE 'UTC',
  "rejectedAt_utc" = "rejectedAt" AT TIME ZONE 'UTC'
WHERE "date_utc" IS NULL;

-- =================================================================
-- 第3段階：制約とインデックス追加（パフォーマンス保持）
-- =================================================================

-- 1. HistoricalSchedule インデックス
CREATE INDEX CONCURRENTLY "idx_historical_schedules_date_utc" ON "historical_schedules"("date_utc");
CREATE INDEX CONCURRENTLY "idx_historical_schedules_date_utc_staff" ON "historical_schedules"("date_utc", "staffId");
CREATE INDEX CONCURRENTLY "idx_historical_schedules_date_utc_dept" ON "historical_schedules"("date_utc", "staffDepartment");

-- 2. SnapshotLog インデックス  
CREATE INDEX CONCURRENTLY "idx_snapshot_logs_target_date_utc" ON "snapshot_logs"("targetDate_utc");

-- 3. Adjustment インデックス
CREATE INDEX CONCURRENTLY "idx_adjustment_date_utc" ON "Adjustment"("date_utc");
CREATE INDEX CONCURRENTLY "idx_adjustment_date_utc_staff" ON "Adjustment"("date_utc", "staffId");

-- =================================================================
-- 第4段階：トリガー設定（新規データ自動同期）
-- =================================================================

-- HistoricalSchedule 自動同期トリガー
CREATE OR REPLACE FUNCTION sync_historical_schedules_utc()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    NEW."date_utc" = NEW."date" AT TIME ZONE 'UTC';
    NEW."start_utc" = NEW."start" AT TIME ZONE 'UTC';
    NEW."end_utc" = NEW."end" AT TIME ZONE 'UTC';
    NEW."snapshotAt_utc" = NEW."snapshotAt" AT TIME ZONE 'UTC';
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_historical_schedules_utc
  BEFORE INSERT OR UPDATE ON "historical_schedules"
  FOR EACH ROW EXECUTE FUNCTION sync_historical_schedules_utc();

-- SnapshotLog 自動同期トリガー
CREATE OR REPLACE FUNCTION sync_snapshot_logs_utc()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    NEW."targetDate_utc" = NEW."targetDate" AT TIME ZONE 'UTC';
    NEW."startedAt_utc" = NEW."startedAt" AT TIME ZONE 'UTC';
    IF NEW."completedAt" IS NOT NULL THEN
      NEW."completedAt_utc" = NEW."completedAt" AT TIME ZONE 'UTC';
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_snapshot_logs_utc
  BEFORE INSERT OR UPDATE ON "snapshot_logs"
  FOR EACH ROW EXECUTE FUNCTION sync_snapshot_logs_utc();

-- Adjustment 自動同期トリガー
CREATE OR REPLACE FUNCTION sync_adjustment_utc()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    NEW."date_utc" = NEW."date" AT TIME ZONE 'UTC';
    NEW."start_utc" = NEW."start" AT TIME ZONE 'UTC';
    NEW."end_utc" = NEW."end" AT TIME ZONE 'UTC';
    NEW."createdAt_utc" = NEW."createdAt" AT TIME ZONE 'UTC';
    NEW."updatedAt_utc" = NEW."updatedAt" AT TIME ZONE 'UTC';
    IF NEW."approvedAt" IS NOT NULL THEN
      NEW."approvedAt_utc" = NEW."approvedAt" AT TIME ZONE 'UTC';
    END IF;
    IF NEW."rejectedAt" IS NOT NULL THEN
      NEW."rejectedAt_utc" = NEW."rejectedAt" AT TIME ZONE 'UTC';
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_adjustment_utc
  BEFORE INSERT OR UPDATE ON "Adjustment"
  FOR EACH ROW EXECUTE FUNCTION sync_adjustment_utc();

-- =================================================================
-- ロールバック用SQLスクリプト（緊急時対応）
-- =================================================================

/*
-- 新カラム削除（ロールバック）
ALTER TABLE "historical_schedules" 
DROP COLUMN IF EXISTS "date_utc",
DROP COLUMN IF EXISTS "start_utc",
DROP COLUMN IF EXISTS "end_utc",
DROP COLUMN IF EXISTS "snapshotAt_utc";

ALTER TABLE "snapshot_logs"
DROP COLUMN IF EXISTS "targetDate_utc",
DROP COLUMN IF EXISTS "startedAt_utc",
DROP COLUMN IF EXISTS "completedAt_utc";

ALTER TABLE "Adjustment"
DROP COLUMN IF EXISTS "date_utc",
DROP COLUMN IF EXISTS "start_utc", 
DROP COLUMN IF EXISTS "end_utc",
DROP COLUMN IF EXISTS "createdAt_utc",
DROP COLUMN IF EXISTS "updatedAt_utc",
DROP COLUMN IF EXISTS "approvedAt_utc",
DROP COLUMN IF EXISTS "rejectedAt_utc";

-- トリガー削除
DROP TRIGGER IF EXISTS trigger_sync_historical_schedules_utc ON "historical_schedules";
DROP TRIGGER IF EXISTS trigger_sync_snapshot_logs_utc ON "snapshot_logs";
DROP TRIGGER IF EXISTS trigger_sync_adjustment_utc ON "Adjustment";
DROP FUNCTION IF EXISTS sync_historical_schedules_utc();
DROP FUNCTION IF EXISTS sync_snapshot_logs_utc();
DROP FUNCTION IF EXISTS sync_adjustment_utc();
*/