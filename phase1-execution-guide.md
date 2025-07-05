# Phase 1実行ガイド：CLAUDE.md厳格ルール準拠

## 🎯 目的
スナップショット機能コアテーブルの時刻カラム命名をCLAUDE.md厳格ルールに準拠させる

## 📋 対象テーブル（第1段階）

### 1. HistoricalSchedule (historical_schedules)
```
date → date_utc
start → start_utc  
end → end_utc
snapshotAt → snapshotAt_utc
```

### 2. SnapshotLog (snapshot_logs)
```
targetDate → targetDate_utc
startedAt → startedAt_utc
completedAt → completedAt_utc
```

### 3. Adjustment
```
date → date_utc
start → start_utc
end → end_utc
createdAt → createdAt_utc
updatedAt → updatedAt_utc
approvedAt → approvedAt_utc
rejectedAt → rejectedAt_utc
```

## 🚀 実行手順

### Step 1: バックアップ作成
```bash
# PostgreSQLバックアップ（必須）
docker exec callstatus-app_db_1 pg_dump -U callstatus_user callstatus_db > backup_phase1_$(date +%Y%m%d_%H%M%S).sql

# Gitコミット（現在の状態保存）
git add -A
git commit -m "feat: Phase1実行前バックアップ - CLAUDE.md厳格ルール準拠開始"
```

### Step 2: マイグレーション実行
```bash
# 1. 新カラム追加
docker exec callstatus-app_backend_1 bash -c "cd /app && npx prisma db execute --file ./prisma/migrations/phase1_claude_md_utc_compliance/migration.sql"

# 2. Prismaクライアント再生成
docker exec callstatus-app_backend_1 bash -c "cd /app && npx prisma generate"

# 3. 動作確認
curl http://localhost:3002/api/test
```

### Step 3: 整合性確認
```sql
-- 新カラムデータ確認
SELECT 
  COUNT(*) as total_records,
  COUNT("date_utc") as utc_converted,
  COUNT("date") as original_present
FROM "historical_schedules";

SELECT 
  COUNT(*) as total_records,
  COUNT("targetDate_utc") as utc_converted
FROM "snapshot_logs";

SELECT 
  COUNT(*) as total_records,
  COUNT("date_utc") as utc_converted
FROM "Adjustment";
```

## ⚡ 安全対策

### 1. 並行運用設計
- 既存カラム保持：既存機能は無影響
- 新カラム追加：段階的移行可能
- トリガー同期：新規データ自動同期

### 2. ロールバック手順
```bash
# 緊急ロールバック（新カラム削除）
docker exec callstatus-app_backend_1 bash -c "cd /app && psql \$DATABASE_URL -c '
ALTER TABLE \"historical_schedules\" 
DROP COLUMN IF EXISTS \"date_utc\",
DROP COLUMN IF EXISTS \"start_utc\",
DROP COLUMN IF EXISTS \"end_utc\",
DROP COLUMN IF EXISTS \"snapshotAt_utc\";

ALTER TABLE \"snapshot_logs\"
DROP COLUMN IF EXISTS \"targetDate_utc\",
DROP COLUMN IF EXISTS \"startedAt_utc\",
DROP COLUMN IF EXISTS \"completedAt_utc\";

ALTER TABLE \"Adjustment\"
DROP COLUMN IF EXISTS \"date_utc\",
DROP COLUMN IF EXISTS \"start_utc\", 
DROP COLUMN IF EXISTS \"end_utc\",
DROP COLUMN IF EXISTS \"createdAt_utc\",
DROP COLUMN IF EXISTS \"updatedAt_utc\",
DROP COLUMN IF EXISTS \"approvedAt_utc\",
DROP COLUMN IF EXISTS \"rejectedAt_utc\";
'"
```

### 3. 検証項目チェックリスト
- [ ] 新カラム追加完了
- [ ] データ変換完了（全件）
- [ ] インデックス作成完了
- [ ] スナップショット機能動作確認
- [ ] フロントエンド表示確認
- [ ] バックアップ取得完了

## 🔍 動作テスト

### テスト1: スナップショット機能
```bash
# 手動スナップショット作成
curl -X POST http://localhost:3002/api/snapshots/manual -H "Content-Type: application/json" -d '{"date":"2025-07-04"}'

# 履歴データ確認
curl http://localhost:3002/api/schedules/unified?date=2025-07-04
```

### テスト2: 調整レイヤー作成
```bash
# 新しい調整予定作成
curl -X POST http://localhost:3002/api/schedules -H "Content-Type: application/json" -d '{
  "staffId": 1,
  "status": "Online",
  "start": 9.0,
  "end": 18.0,
  "date": "2025-07-05",
  "memo": "Phase1テスト"
}'
```

## 📊 期待結果

### 1. データベース状態
- 新UTCカラム：全レコードでデータ変換済み
- 既存カラム：変更なし（並行運用）
- インデックス：新カラムに対して最適化済み

### 2. 機能確認
- スナップショット作成：正常動作
- 履歴データ取得：正常表示
- 調整予定CRUD：正常動作
- フロントエンド：表示異常なし

## 🚨 トラブルシューティング

### エラー1: マイグレーション失敗
```bash
# ログ確認
docker logs callstatus-app_backend_1

# 手動実行
docker exec -it callstatus-app_backend_1 bash
psql $DATABASE_URL
```

### エラー2: データ不整合
```sql
-- 不整合確認
SELECT * FROM "historical_schedules" 
WHERE "date_utc" IS NULL OR "date" IS NULL;

-- 手動修正
UPDATE "historical_schedules" SET "date_utc" = "date" WHERE "date_utc" IS NULL;
```

## ✅ 完了確認

Phase 1完了後、以下を確認：
1. 新UTCカラムが全テーブルに追加済み
2. 既存データが新カラムに正常変換済み
3. スナップショット機能が正常動作
4. バックアップが取得済み
5. ロールバック手順が確認済み

**Phase 2（Contract、Schedule等）準備完了**