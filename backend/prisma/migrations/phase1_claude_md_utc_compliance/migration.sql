-- CLAUDE.md厳格ルール準拠：Phase 1 - スナップショット機能コア対応
-- Migration: Add _utc suffix columns for time handling compliance

-- 1. HistoricalSchedule テーブル：新UTCカラム追加（安全）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'historical_schedules' AND column_name = 'date_utc') THEN
        ALTER TABLE "historical_schedules" ADD COLUMN "date_utc" TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'historical_schedules' AND column_name = 'start_utc') THEN
        ALTER TABLE "historical_schedules" ADD COLUMN "start_utc" TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'historical_schedules' AND column_name = 'end_utc') THEN
        ALTER TABLE "historical_schedules" ADD COLUMN "end_utc" TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'historical_schedules' AND column_name = 'snapshotAt_utc') THEN
        ALTER TABLE "historical_schedules" ADD COLUMN "snapshotAt_utc" TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 2. SnapshotLog テーブル：新UTCカラム追加（安全）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'snapshot_logs' AND column_name = 'targetDate_utc') THEN
        ALTER TABLE "snapshot_logs" ADD COLUMN "targetDate_utc" TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'snapshot_logs' AND column_name = 'startedAt_utc') THEN
        ALTER TABLE "snapshot_logs" ADD COLUMN "startedAt_utc" TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'snapshot_logs' AND column_name = 'completedAt_utc') THEN
        ALTER TABLE "snapshot_logs" ADD COLUMN "completedAt_utc" TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 3. Adjustment テーブル：新UTCカラム追加（安全）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Adjustment' AND column_name = 'date_utc') THEN
        ALTER TABLE "Adjustment" ADD COLUMN "date_utc" TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Adjustment' AND column_name = 'start_utc') THEN
        ALTER TABLE "Adjustment" ADD COLUMN "start_utc" TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Adjustment' AND column_name = 'end_utc') THEN
        ALTER TABLE "Adjustment" ADD COLUMN "end_utc" TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Adjustment' AND column_name = 'createdAt_utc') THEN
        ALTER TABLE "Adjustment" ADD COLUMN "createdAt_utc" TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Adjustment' AND column_name = 'updatedAt_utc') THEN
        ALTER TABLE "Adjustment" ADD COLUMN "updatedAt_utc" TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Adjustment' AND column_name = 'approvedAt_utc') THEN
        ALTER TABLE "Adjustment" ADD COLUMN "approvedAt_utc" TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Adjustment' AND column_name = 'rejectedAt_utc') THEN
        ALTER TABLE "Adjustment" ADD COLUMN "rejectedAt_utc" TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

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