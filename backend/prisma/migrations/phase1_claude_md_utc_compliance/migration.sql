-- CLAUDE.md厳格ルール準拠：Phase 1 - スナップショット機能コア対応
-- Migration: Add _utc suffix columns for time handling compliance

-- 1. HistoricalSchedule テーブル：新UTCカラム追加
ALTER TABLE "historical_schedules" 
ADD COLUMN "date_utc" TIMESTAMP WITH TIME ZONE,
ADD COLUMN "start_utc" TIMESTAMP WITH TIME ZONE,
ADD COLUMN "end_utc" TIMESTAMP WITH TIME ZONE,
ADD COLUMN "snapshotAt_utc" TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. SnapshotLog テーブル：新UTCカラム追加
ALTER TABLE "snapshot_logs"
ADD COLUMN "targetDate_utc" TIMESTAMP WITH TIME ZONE,
ADD COLUMN "startedAt_utc" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN "completedAt_utc" TIMESTAMP WITH TIME ZONE;

-- 3. Adjustment テーブル：新UTCカラム追加
ALTER TABLE "Adjustment"
ADD COLUMN "date_utc" TIMESTAMP WITH TIME ZONE,
ADD COLUMN "start_utc" TIMESTAMP WITH TIME ZONE,
ADD COLUMN "end_utc" TIMESTAMP WITH TIME ZONE,
ADD COLUMN "createdAt_utc" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN "updatedAt_utc" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN "approvedAt_utc" TIMESTAMP WITH TIME ZONE,
ADD COLUMN "rejectedAt_utc" TIMESTAMP WITH TIME ZONE;

-- データ変換：既存データを新UTCカラムにコピー
UPDATE "historical_schedules" SET
  "date_utc" = "date",
  "start_utc" = "start",
  "end_utc" = "end",
  "snapshotAt_utc" = "snapshotAt"
WHERE "date_utc" IS NULL;

UPDATE "snapshot_logs" SET
  "targetDate_utc" = "targetDate",
  "startedAt_utc" = "startedAt",
  "completedAt_utc" = "completedAt"
WHERE "targetDate_utc" IS NULL;

UPDATE "Adjustment" SET
  "date_utc" = "date",
  "start_utc" = "start",
  "end_utc" = "end",
  "createdAt_utc" = "createdAt",
  "updatedAt_utc" = "updatedAt",
  "approvedAt_utc" = "approvedAt",
  "rejectedAt_utc" = "rejectedAt"
WHERE "date_utc" IS NULL;

-- インデックス追加（パフォーマンス保持）
CREATE INDEX IF NOT EXISTS "idx_historical_schedules_date_utc" ON "historical_schedules"("date_utc");
CREATE INDEX IF NOT EXISTS "idx_historical_schedules_date_utc_staff" ON "historical_schedules"("date_utc", "staffId");
CREATE INDEX IF NOT EXISTS "idx_snapshot_logs_target_date_utc" ON "snapshot_logs"("targetDate_utc");
CREATE INDEX IF NOT EXISTS "idx_adjustment_date_utc" ON "Adjustment"("date_utc");