# 2層データレイヤーシステム

## 🎯 システム概要
シンプルな単層構造から企業レベルの2層データ管理システムへの移行

- **開始日**: 2025-06-18
- **ステータス**: 部分完了（認証システム実装優先のため一時中断）
- **目的**: 契約（基本勤務時間）+ 個別調整（例外予定）の2層データ管理

## 🔧 技術仕様詳細

### 2層データ階層設計
```
優先順位: レイヤー2（個別調整）> レイヤー1（契約）

レイヤー1（契約）:
- 契約による基本勤務時間
- 年次更新時に洗い替え
- 移動不可（canMove: false）
- 曜日別勤務時間対応（月-日）

レイヤー2（個別調整）:
- 個別調整・例外予定
- 最優先、移動可能（canMove: true）
- UI操作対応
- 手動調整・CSV投入対応
```

### データベーススキーマ（2層構造）
```prisma
model Staff {
  id                   Int                   @id @default(autoincrement())
  empNo                String?               @unique
  name                 String
  department           String
  group                String
  adjustments          Adjustment[]
  contracts            Contract[]
  schedules            Schedule[]            # 旧システム互換用
}

# レイヤー1: 契約データ（基本勤務時間）
model Contract {
  id             Int      @default(autoincrement())
  empNo          String   @id
  name           String
  dept           String
  team           String
  email          String
  mondayHours    String?  # 月曜勤務時間
  tuesdayHours   String?  # 火曜勤務時間
  wednesdayHours String?  # 水曜勤務時間
  thursdayHours  String?  # 木曜勤務時間
  fridayHours    String?  # 金曜勤務時間
  saturdayHours  String?  # 土曜勤務時間
  sundayHours    String?  # 日曜勤務時間
  staffId        Int
  staff          Staff    @relation(fields: [staffId], references: [id])
}

# レイヤー2: 個別調整データ（例外予定・CSV投入データ）
model Adjustment {
  id        Int      @id @default(autoincrement())
  date      DateTime @db.Date
  status    String   # 'online', 'remote', 'meeting', 'training', 'break', 'off', 'unplanned', 'night duty'
  start     DateTime
  end       DateTime
  reason    String?  # 調整理由
  memo      String?  # メモ
  batchId   String?  # CSVインポート時のバッチID（ロールバック用）
  staffId   Int
  staff     Staff    @relation(fields: [staffId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

# 旧システム互換用（段階的廃止予定）
model Schedule {
  id      Int      @id @default(autoincrement())
  status  String
  start   DateTime
  end     DateTime
  memo    String?
  staffId Int
  staff   Staff    @relation(fields: [staffId], references: [id])
}
```

## 📋 実装フェーズ

### フェーズ1: データ構造基盤 【完了】 ✅
- [x] データベーススキーマ拡張（2層構造用テーブル追加）
- [x] データ優先順位ロジック（2層データ取得・統合API）
- **目標**: 既存システムと並行稼働可能な基盤構築
- **リスク**: 低
- **完了日**: 2025-06-18
- **実装内容**:
  - Contract、Adjustmentテーブル追加
  - LayerManagerService実装（2層データ統合ロジック：契約 + 個別調整）
  - /api/schedules/layered エンドポイント追加
  - 既存APIとの並行稼働を確保

### フェーズ2: データ投入機能 【部分完了】
- [x] CSVスケジュールインポート（調整レイヤー投入）
- [x] インポート履歴・ロールバック機能
- [x] 設定モーダル経由のUI整理
- [ ] スタッフマスタ投入（JSON形式、契約レイヤー生成）
- [ ] 文字チェック機能（JIS第1-2水準）
- **目標**: 契約・調整データの一括投入機能
- **リスク**: 低

### フェーズ3: UI機能強化 【未着手】
- [ ] ドラッグ&ドロップ制限（契約レイヤーは移動不可制御）
- [ ] 表示制御強化（今日のみ表示切り替え、対応可能人数）
- **目標**: 2層データに対応したUI改善
- **リスク**: 中

### フェーズ4: データ移行・統合 【未着手】
- [ ] 既存データ移行（現在のスケジュール → 調整レイヤー）
- [ ] 旧システムとの並行稼働（既存APIは保持）
- **目標**: 完全な2層システムへの移行（後方互換性維持）
- **リスク**: 高
- **⚠️ 重要**: 既存APIやLayeredAPIは絶対に廃止・無効化してはならない

## 🚨 LayeredAPI保護ルール（絶対遵守）

**LayeredAPIの無効化防止 - 2層データ構造の核心機能**

**⚠️ 重要**: `/api/schedules/layered` エンドポイントは契約データ（レイヤー1）表示の生命線

### 無効化される主な原因
1. **依存関係エラー**: LayerManagerServiceの循環参照
2. **メソッド名間違い**: `getCompatibleSchedules` → `getLayeredSchedules`（正）
3. **コンパイルエラー**: 一つでもエラーがあると自動で無効化

### 必須確認コマンド（変更前後に実行）
```bash
# LayeredAPI動作確認
curl -s "http://localhost:3002/api/schedules/layered?date=2025-06-23" | jq '.schedules | length'

# 契約データ存在確認  
curl -s "http://localhost:3002/api/schedules/test-contracts" | jq '.contractCount'
```

### 絶対に変更してはいけないファイル
- `/backend/src/layer-manager/layer-manager.service.ts`
- `/backend/src/schedules/schedules.controller.ts` の layered エンドポイント
- `/backend/src/schedules/schedules.module.ts` の LayerManagerModule

### エラー時の即復旧手順
1. `git add . && git commit -m "エラー前状態保存"`
2. `git reset --hard HEAD~1` で前の動作状態に戻す
3. 原因分析後、最小限の変更で修正

## 🎨 2層データレイヤー表示制御

### 契約レイヤー（Contract Layer）
- 透明度50%（`opacity: 0.5`）で表示
- 斜線パターン背景（`repeating-linear-gradient`）で視覚的区別
- 編集不可：ドラッグ不可、削除不可、クリック編集不可
- zIndex: 10で背面配置
- 契約による基本勤務時間を表示

### 調整レイヤー（Adjustment Layer）
- 通常表示（`opacity: 1`）
- 編集可能：ドラッグ可能、削除可能、クリック編集可能
- zIndex: 30で前面配置
- 個別調整・月次投入・手動予定を表示

### レイヤー判定ロジック
```typescript
const scheduleLayer = schedule.layer || 'adjustment';
const isContract = scheduleLayer === 'contract';
```

### 重要な実装ポイント
- フロントエンドでスケジュール変換時に`layer`プロパティを必ず保持
- `Schedule`型定義に`layer?: 'contract' | 'adjustment'`を含める
- LayerManagerServiceが正しく`layer`プロパティを設定

## 🔧 API構造（2層構造対応）

### RESTエンドポイント
- `GET /api/schedules/layered?date=YYYY-MM-DD` - 2層データ統合スケジュール取得
- `GET /api/schedules?date=YYYY-MM-DD` - 旧形式スケジュール取得（互換用）
- `POST /api/schedules` - 新しい予定を作成（調整レイヤーに保存）
- `PATCH /api/schedules/:id` - 既存の予定を更新
- `DELETE /api/schedules/:id` - 予定を削除

### データ投入API
- `POST /api/csv-import/contracts` - 契約データ投入（JSON）
- `POST /api/csv-import/schedules` - 調整レイヤー投入（CSV）
- `GET /api/csv-import/history` - インポート履歴取得
- `DELETE /api/csv-import/rollback` - CSVインポートロールバック

## 🔍 トラブルシューティング

### 契約レイヤーが正常に表示されない場合
1. APIレスポンス確認：`curl "http://localhost:3002/api/schedules/layered?date=YYYY-MM-DD" | jq '.schedules[:3]'`
2. レイヤー情報確認：各スケジュールに`"layer": "contract"`が含まれているか
3. フロントエンド変換確認：`Schedule`型に`layer`プロパティが含まれているか
4. 曜日設定確認：契約データで該当曜日の勤務時間が設定されているか

### 契約レイヤーが編集可能になってしまう場合
- フロントエンドのスケジュール変換で`layer: s.layer`が保持されているか確認
- レイヤー判定ロジック`scheduleLayer === 'contract'`が正しく動作しているか確認

### データ件数の確認方法
```bash
# データベース直接確認
docker exec callstatus_app_db psql -U user -d mydb -c "SELECT 'Contract' as table_name, COUNT(*) FROM \"Contract\" UNION ALL SELECT 'Adjustment', COUNT(*) FROM \"Adjustment\";"

# API経由での確認
curl -s "http://localhost:3002/api/schedules/layered?date=YYYY-MM-DD" | jq '{total: (.schedules | length), by_layer: (.schedules | group_by(.layer) | map({layer: .[0].layer, count: length}))}'
```

## 📊 競合管理仕様
```json
{
  "success": true,
  "imported": 45,
  "conflicts": [
    {
      "date": "2025-06-18",
      "staff": "田中太郎",
      "newSchedule": {"type": "Training", "time": "10:00-12:00"},
      "existingSchedule": {"type": "Meeting", "time": "10:00-12:00", "layer": "個別調整"},
      "result": "個別調整を優先（新規スケジュールは無効）"
    }
  ]
}
```

## 📊 進捗管理
- **各フェーズ完了後**: Gitコミット + GitHubプッシュ
- **進捗更新**: 関連ドキュメントを随時更新
- **ロールバック**: 各フェーズ間で問題発生時は前フェーズに復帰可能

---

**関連ドキュメント**: [CLAUDE.md](../../CLAUDE.md)  
**作成日**: 2025-06-26  
**ステータス**: 部分完了（認証システム優先のため一時中断）