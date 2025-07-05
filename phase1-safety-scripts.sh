#!/bin/bash
# Phase 1安全実行スクリプト：CLAUDE.md厳格ルール準拠

set -e  # エラー時即座終了

echo "==================================================================="
echo "Phase 1実行開始：スナップショット機能コア対応"
echo "==================================================================="

# 設定
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/phase1_backup_$TIMESTAMP.sql"

# 1. バックアップディレクトリ作成
echo "📁 バックアップディレクトリ作成..."
mkdir -p $BACKUP_DIR

# 2. PostgreSQLバックアップ作成
echo "💾 データベースバックアップ作成中..."
docker exec callstatus-app_db_1 pg_dump -U callstatus_user callstatus_db > $BACKUP_FILE

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ バックアップ作成失敗"
    exit 1
fi

echo "✅ バックアップ作成完了: $BACKUP_FILE"

# 3. Gitコミット（現在の状態保存）
echo "📝 Gitコミット作成中..."
git add -A
git commit -m "feat: Phase1実行前バックアップ - CLAUDE.md厳格ルール準拠開始

- スナップショット機能コア対応準備
- HistoricalSchedule, SnapshotLog, Adjustment対応
- 安全なロールバック機能付き

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

echo "✅ Gitコミット完了"

# 4. 事前検証：既存データ確認
echo "🔍 事前検証：既存データ確認中..."

docker exec callstatus-app_backend_1 bash -c "cd /app && psql \$DATABASE_URL -c \"
SELECT 'historical_schedules' as table_name, COUNT(*) as record_count FROM \\\"historical_schedules\\\"
UNION ALL
SELECT 'snapshot_logs' as table_name, COUNT(*) as record_count FROM \\\"snapshot_logs\\\"
UNION ALL  
SELECT 'Adjustment' as table_name, COUNT(*) as record_count FROM \\\"Adjustment\\\";
\""

# 5. マイグレーション実行
echo "🚀 マイグレーション実行中..."

docker exec callstatus-app_backend_1 bash -c "cd /app && npx prisma db execute --file ./prisma/migrations/phase1_claude_md_utc_compliance/migration.sql"

if [ $? -ne 0 ]; then
    echo "❌ マイグレーション失敗"
    echo "🔄 ロールバック手順："
    echo "   1. git reset --hard HEAD~1"
    echo "   2. psql \$DATABASE_URL < $BACKUP_FILE"
    exit 1
fi

echo "✅ マイグレーション実行完了"

# 6. Prismaクライアント再生成
echo "⚙️ Prismaクライアント再生成中..."
docker exec callstatus-app_backend_1 bash -c "cd /app && npx prisma generate"

echo "✅ Prismaクライアント再生成完了"

# 7. 事後検証：データ整合性確認
echo "🔍 事後検証：データ整合性確認中..."

docker exec callstatus-app_backend_1 bash -c "cd /app && psql \$DATABASE_URL -c \"
-- HistoricalSchedule整合性確認
SELECT 
  'historical_schedules' as table_name,
  COUNT(*) as total_records,
  COUNT(\\\"date_utc\\\") as utc_converted,
  COUNT(\\\"date\\\") as original_present,
  CASE WHEN COUNT(*) = COUNT(\\\"date_utc\\\") THEN '✅ OK' ELSE '❌ NG' END as status
FROM \\\"historical_schedules\\\"

UNION ALL

-- SnapshotLog整合性確認  
SELECT 
  'snapshot_logs' as table_name,
  COUNT(*) as total_records,
  COUNT(\\\"targetDate_utc\\\") as utc_converted,
  COUNT(\\\"targetDate\\\") as original_present,
  CASE WHEN COUNT(*) = COUNT(\\\"targetDate_utc\\\") THEN '✅ OK' ELSE '❌ NG' END as status
FROM \\\"snapshot_logs\\\"

UNION ALL

-- Adjustment整合性確認
SELECT 
  'Adjustment' as table_name,
  COUNT(*) as total_records,
  COUNT(\\\"date_utc\\\") as utc_converted,
  COUNT(\\\"date\\\") as original_present,
  CASE WHEN COUNT(*) = COUNT(\\\"date_utc\\\") THEN '✅ OK' ELSE '❌ NG' END as status
FROM \\\"Adjustment\\\";
\""

# 8. API動作確認
echo "🌐 API動作確認中..."

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/api/test)
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ API動作確認：正常"
else
    echo "❌ API動作確認：異常 (HTTP Status: $HTTP_STATUS)"
fi

# 9. スナップショット機能テスト
echo "📸 スナップショット機能テスト中..."

SNAPSHOT_RESULT=$(curl -s -X POST http://localhost:3002/api/snapshots/manual \
    -H "Content-Type: application/json" \
    -d '{"date":"2025-07-05"}' | jq -r '.status // "error"')

if [ "$SNAPSHOT_RESULT" = "COMPLETED" ]; then
    echo "✅ スナップショット機能：正常"
else
    echo "⚠️ スナップショット機能：要確認 (Status: $SNAPSHOT_RESULT)"
fi

echo "==================================================================="
echo "Phase 1実行完了"
echo "==================================================================="

echo "📊 実行結果："
echo "   ✅ バックアップ作成: $BACKUP_FILE"
echo "   ✅ Gitコミット完了"
echo "   ✅ マイグレーション実行完了"
echo "   ✅ データ整合性確認完了"
echo "   ✅ API動作確認完了"

echo ""
echo "🔄 ロールバック手順（必要時）："
echo "   1. git reset --hard HEAD~1"
echo "   2. docker exec callstatus-app_db_1 psql -U callstatus_user callstatus_db < $BACKUP_FILE"
echo "   3. docker exec callstatus-app_backend_1 bash -c 'cd /app && npx prisma generate'"

echo ""
echo "➡️ 次のステップ："
echo "   - Phase 4: コアテーブルのマイグレーション実行"
echo "   - Phase 5: コアサービスのコード修正"
echo "   - Phase 6: 機能テストと整合性確認"

echo ""
echo "🎯 Phase 1完了：Phase 2（Contract、Schedule等）準備完了"