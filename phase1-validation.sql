-- Phase 1実行結果検証クエリ
-- CLAUDE.md厳格ルール準拠：スナップショット機能コア対応

-- =================================================================
-- 1. 基本データ整合性確認
-- =================================================================

-- HistoricalSchedule整合性確認
SELECT 
  'HistoricalSchedule' as table_name,
  COUNT(*) as total_records,
  COUNT("date_utc") as utc_date_count,
  COUNT("start_utc") as utc_start_count,
  COUNT("end_utc") as utc_end_count,
  COUNT("snapshotAt_utc") as utc_snapshot_count,
  CASE 
    WHEN COUNT(*) = COUNT("date_utc") AND 
         COUNT(*) = COUNT("start_utc") AND 
         COUNT(*) = COUNT("end_utc") AND 
         COUNT(*) = COUNT("snapshotAt_utc") 
    THEN '✅ 完全変換'
    ELSE '❌ 不完全変換'
  END as conversion_status
FROM "historical_schedules";

-- SnapshotLog整合性確認
SELECT 
  'SnapshotLog' as table_name,
  COUNT(*) as total_records,
  COUNT("targetDate_utc") as utc_target_count,
  COUNT("startedAt_utc") as utc_started_count,
  COUNT("completedAt_utc") as utc_completed_count,
  CASE 
    WHEN COUNT(*) = COUNT("targetDate_utc") AND 
         COUNT(*) = COUNT("startedAt_utc")
    THEN '✅ 完全変換'
    ELSE '❌ 不完全変換'
  END as conversion_status
FROM "snapshot_logs";

-- Adjustment整合性確認
SELECT 
  'Adjustment' as table_name,
  COUNT(*) as total_records,
  COUNT("date_utc") as utc_date_count,
  COUNT("start_utc") as utc_start_count,
  COUNT("end_utc") as utc_end_count,
  COUNT("createdAt_utc") as utc_created_count,
  COUNT("updatedAt_utc") as utc_updated_count,
  CASE 
    WHEN COUNT(*) = COUNT("date_utc") AND 
         COUNT(*) = COUNT("start_utc") AND 
         COUNT(*) = COUNT("end_utc") AND 
         COUNT(*) = COUNT("createdAt_utc") AND 
         COUNT(*) = COUNT("updatedAt_utc")
    THEN '✅ 完全変換'
    ELSE '❌ 不完全変換'
  END as conversion_status
FROM "Adjustment";

-- =================================================================
-- 2. 時刻データ精度確認
-- =================================================================

-- HistoricalSchedule時刻精度確認（サンプル5件）
SELECT 
  'HistoricalSchedule_Sample' as check_type,
  "date" as original_date,
  "date_utc" as converted_date,
  "start" as original_start,
  "start_utc" as converted_start,
  CASE 
    WHEN "date" = "date_utc" AND "start" = "start_utc" 
    THEN '✅ 精度OK'
    ELSE '❌ 精度NG'
  END as precision_status
FROM "historical_schedules"
ORDER BY "snapshotAt" DESC
LIMIT 5;

-- Adjustment時刻精度確認（サンプル5件）
SELECT 
  'Adjustment_Sample' as check_type,
  "date" as original_date,
  "date_utc" as converted_date,
  "start" as original_start,
  "start_utc" as converted_start,
  CASE 
    WHEN "date" = "date_utc" AND "start" = "start_utc" 
    THEN '✅ 精度OK'
    ELSE '❌ 精度NG'
  END as precision_status
FROM "Adjustment"
WHERE "isPending" = false
ORDER BY "createdAt" DESC
LIMIT 5;

-- =================================================================
-- 3. インデックス確認
-- =================================================================

-- 新インデックス存在確認
SELECT 
  'Index_Check' as check_type,
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('historical_schedules', 'snapshot_logs', 'Adjustment')
  AND indexname LIKE '%_utc%'
ORDER BY tablename, indexname;

-- =================================================================
-- 4. パフォーマンス確認
-- =================================================================

-- HistoricalSchedule検索パフォーマンス確認
EXPLAIN (ANALYZE, BUFFERS) 
SELECT COUNT(*) 
FROM "historical_schedules" 
WHERE "date_utc" >= '2025-07-01' AND "date_utc" < '2025-07-08';

-- Adjustment検索パフォーマンス確認
EXPLAIN (ANALYZE, BUFFERS)
SELECT COUNT(*) 
FROM "Adjustment" 
WHERE "date_utc" >= '2025-07-01' AND "date_utc" < '2025-07-08';

-- =================================================================
-- 5. 最近の変更確認
-- =================================================================

-- 最新のHistoricalScheduleレコード
SELECT 
  'Latest_HistoricalSchedule' as check_type,
  "batchId",
  "date",
  "date_utc",
  "staffName",
  "status",
  "snapshotAt",
  "snapshotAt_utc"
FROM "historical_schedules"
ORDER BY "snapshotAt_utc" DESC
LIMIT 3;

-- 最新のAdjustmentレコード  
SELECT 
  'Latest_Adjustment' as check_type,
  "id",
  "date",
  "date_utc", 
  "status",
  "isPending",
  "createdAt",
  "createdAt_utc"
FROM "Adjustment"
ORDER BY "createdAt_utc" DESC
LIMIT 3;

-- =================================================================
-- 6. 問題レコード検出
-- =================================================================

-- NULL値検出（問題レコード）
SELECT 
  'NULL_Detection' as check_type,
  'HistoricalSchedule' as table_name,
  COUNT(*) as problematic_records
FROM "historical_schedules"
WHERE "date_utc" IS NULL OR "start_utc" IS NULL OR "end_utc" IS NULL

UNION ALL

SELECT 
  'NULL_Detection' as check_type,
  'SnapshotLog' as table_name,
  COUNT(*) as problematic_records
FROM "snapshot_logs"
WHERE "targetDate_utc" IS NULL OR "startedAt_utc" IS NULL

UNION ALL

SELECT 
  'NULL_Detection' as check_type,
  'Adjustment' as table_name,
  COUNT(*) as problematic_records
FROM "Adjustment"
WHERE "date_utc" IS NULL OR "start_utc" IS NULL OR "end_utc" IS NULL;

-- =================================================================
-- 7. 総合ステータス確認
-- =================================================================

-- Phase 1完了状況総括
WITH status_check AS (
  SELECT 
    'HistoricalSchedule' as table_name,
    COUNT(*) as total,
    COUNT("date_utc") as converted
  FROM "historical_schedules"
  
  UNION ALL
  
  SELECT 
    'SnapshotLog' as table_name,
    COUNT(*) as total,
    COUNT("targetDate_utc") as converted
  FROM "snapshot_logs"
  
  UNION ALL
  
  SELECT 
    'Adjustment' as table_name,
    COUNT(*) as total,
    COUNT("date_utc") as converted
  FROM "Adjustment"
)
SELECT 
  'PHASE_1_SUMMARY' as summary_type,
  SUM(total) as total_records,
  SUM(converted) as converted_records,
  CASE 
    WHEN SUM(total) = SUM(converted) 
    THEN '🎯 Phase 1完了：100%変換成功'
    ELSE '⚠️ Phase 1不完全：要修正'
  END as phase1_status
FROM status_check;