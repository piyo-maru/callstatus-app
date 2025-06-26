# 日次スナップショット履歴機能実装プロジェクト

## 🎯 プロジェクト概要
過去の振り返りを可能にする履歴保持機能の実装

- **開始日**: 2025-06-24
- **ブランチ**: `feature/historical-snapshots`
- **目的**: 組織変更・退職の影響を受けない完全な過去データ保持

## 📋 実装方針

### 設計思想
- **不在社員テーブルは作成しない**（シンプルさ重視）
- **日次スナップショット方式**で過去データを完全保存
- **動的マスキング**で退職済み社員のプライバシー保護

### データ構造
```prisma
model HistoricalSchedule {
  id              Int      @id @default(autoincrement())
  date            DateTime @db.Date
  staffId         Int
  staffEmpNo      String?
  staffName       String   // スナップショット時点の名前
  staffDepartment String   // スナップショット時点の部署
  staffGroup      String   // スナップショット時点のグループ
  status          String
  start           DateTime
  end             DateTime
  memo            String?
  snapshotAt      DateTime @default(now())
  batchId         String
}
```

## 🚀 5日間開発スケジュール

### Day 0: ブランチ作成・準備
```bash
git checkout -b feature/historical-snapshots
```

### Day 1 (月): データベース基盤構築
- [ ] HistoricalScheduleテーブル設計・マイグレーション
- [ ] SnapshotLogテーブル作成
- [ ] 基本的なスナップショットサービス実装
- [ ] 手動スナップショット作成API

### Day 2 (火): バックエンドコア機能
- [ ] 日次バッチ処理実装（Cron設定）
- [ ] 統合スケジュール取得API（現在/過去の分岐）
- [ ] エラーハンドリング・リトライ機能
- [ ] 過去30日分の初期データ投入スクリプト

### Day 3 (水): フロントエンド基本実装
- [ ] 履歴表示コンポーネント作成
- [ ] 過去日付選択時の履歴モード切り替え
- [ ] 視覚的区別（背景色、ラベル、アイコン）
- [ ] API統合とデータ表示

### Day 4 (木): マスキング機能・UI完成
- [ ] 動的マスキングサービス実装
- [ ] 退職済み社員の判定ロジック
- [ ] マスキング表示オプション（設定画面）
- [ ] UI/UXの最終調整

### Day 5 (金): テスト・マージ準備
- [ ] 統合テスト実施
- [ ] パフォーマンステスト
- [ ] ドキュメント更新
- [ ] プルリクエスト作成

## 🔧 技術的注意点

### バッチ処理タイミング
- 毎日深夜0時に前日分のスナップショット作成
- 失敗時は1時間後に自動リトライ（最大3回）

### データ保持・管理仕様
**基本方針（2025-06-24確定）:**
- **物理削除は行わない**: 参照整合性とシステム安定性を最優先
- **段階的プライバシー保護**: マスキング機能による柔軟な制御
- **長期保持**: 組織の歴史として履歴データを永続保持

**データ管理タイムライン:**
```
退職時点: 論理削除 (isActive: false)
├── 即座: 通常画面から非表示（在席者のみ表示）
├── 0-5年: マスキング機能で個別制御可能
└── 5年後: 自動マスキング (name → "退職者_1234")
```

### 自動マスキング機能
```typescript
// 5年経過後の自動個人情報マスキング
@Cron('0 3 1 * *') // 毎月1日深夜3時実行
async monthlyRetiredStaffMasking() {
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  
  await this.prisma.staff.updateMany({
    where: {
      isActive: false,
      deletedAt: { lt: fiveYearsAgo },
      name: { not: { startsWith: '退職者_' } }
    },
    data: {
      name: `退職者_${empNo}`,  // empNoは保持
      department: '退職済み',
      group: '退職済み'
    }
  });
}
```

### データ取得ロジック
```typescript
async getSchedulesForDate(date: string) {
  const targetDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (targetDate < today) {
    // 過去: HistoricalScheduleテーブルから取得
    return this.getHistoricalSchedules(date);
  } else {
    // 現在/未来: 通常のテーブルから取得
    return this.getCurrentSchedules(date);
  }
}
```

### マスキング仕様
- 現在在席していない社員は「退職済み社員」と表示
- 管理者権限では実名表示オプションあり
- 部署・グループ情報は当時のまま表示

## 📊 成功指標
- [ ] 過去30日分のデータが正確に表示される
- [ ] 組織変更の影響を受けない
- [ ] 退職済み社員が適切にマスキングされる
- [ ] 既存機能への影響がない

## ⚠️ リスクと対策
1. **データ容量増加**: 3ヶ月でクリーンアップ
2. **バッチ処理失敗**: 手動実行APIとアラート通知
3. **パフォーマンス**: インデックス最適化

## 🧪 テスト項目
- [ ] スナップショット作成の正常動作
- [ ] 過去データ表示の正確性
- [ ] マスキング機能の動作
- [ ] エラー時のロールバック
- [ ] 既存機能との互換性

## 📝 開発時の確認コマンド
```bash
# スナップショット作成確認
curl -X POST http://localhost:3002/api/admin/snapshots/manual/2025-06-23

# 履歴データ取得確認  
curl "http://localhost:3002/api/schedules/unified?date=2025-06-23"

# マスキング動作確認
curl "http://localhost:3002/api/schedules/unified?date=2025-06-23&includeMasking=true"
```

## 📅 実装完了機能（2025-06-23〜24）

### Day 1: 基盤構築 ✅
- ✅ Prismaスキーマ拡張（HistoricalSchedule・SnapshotLogテーブル）
- ✅ SnapshotsServiceモジュール実装
- ✅ 手動スナップショット作成API（`/api/admin/snapshots/manual/:date`）

### Day 2: 自動化・統合API ✅
- ✅ Cronジョブ実装（毎日深夜0:05自動実行）
- ✅ リトライメカニズム（失敗時1時間ごと、最大3回）
- ✅ 統合API実装（`/api/schedules/unified`）
- ✅ 現在データ・履歴データ自動切り替えロジック

### Day 3: フロントエンド統合 ✅
- ✅ 履歴モード表示切り替えUI
- ✅ 視覚的区別（琥珀色バナー・点線枠・横線パターン）
- ✅ 編集機能の動的無効化（履歴データは編集不可）

### Day 4: プライバシー機能 ✅
- ✅ 退職済み社員の動的マスキング機能
- ✅ 設定画面のプライバシー設定
- ✅ localStorage による設定永続化

### Day 5: 品質確保 ✅
- ✅ 包括的機能テスト
- ✅ 既存機能との統合テスト
- ✅ パフォーマンステスト（中小企業規模で実用性確認）
- ✅ Cronジョブ動作確認

## 🔧 技術仕様詳細

### APIエンドポイント
- `GET /api/schedules/unified?date=YYYY-MM-DD&includeMasking=true/false`
  - 現在データ・履歴データの自動判定・取得
  - マスキング機能対応
- `POST /api/admin/snapshots/manual/:date` - 手動スナップショット作成
- `GET /api/admin/snapshots/history` - スナップショット履歴取得

### Cronジョブ設定
```typescript
@Cron('5 0 * * *', {
  name: 'daily-snapshot',
  timeZone: 'Asia/Tokyo'
})
async handleDailyCron() {
  // 毎日深夜0:05に前日分スナップショット作成
}

@Cron('5 */1 * * *', {
  name: 'snapshot-retry',
  timeZone: 'Asia/Tokyo'
})
async handleRetryCron() {
  // 失敗時1時間ごとリトライ（最大3回）
}
```

## 📊 パフォーマンス特性

### 動作確認済み規模
- スタッフ数: 15名以下で高速動作
- 調整データ: 34件で良好なレスポンス
- 履歴データ: 過去データ閲覧機能正常動作

### 本番運用時の推奨最適化
1. データベースインデックス追加
   - `Adjustment(date, staffId)` 複合インデックス
   - `Contract(staffId)` インデックス
2. クエリ最適化・キャッシュ機能導入
3. 50名以上の大規模組織での性能チューニング

## 🚀 本番運用ガイド

### 初回セットアップ
1. `npx prisma migrate deploy` - データベースマイグレーション
2. バックエンドサービス起動（Cronジョブ自動開始）
3. 初回手動スナップショット作成（任意）

### 日常運用
- 毎日0:05に自動スナップショット作成
- 失敗時は自動リトライ（ログ監視推奨）
- 過去データは `/api/schedules/unified` で透明に取得

### モニタリングポイント
- SnapshotLogテーブルでスナップショット成功/失敗状況確認
- レスポンス時間監視（大量データ時）
- ディスク容量監視（履歴データ蓄積）

---

**関連ドキュメント**: [CLAUDE.md](../../CLAUDE.md)  
**作成日**: 2025-06-26  
**ステータス**: 実装完了 ✅