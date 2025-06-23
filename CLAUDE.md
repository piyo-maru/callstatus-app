# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際のClaude Code (claude.ai/code) へのガイダンスを提供します。

## 会話ガイドライン

- 常に日本語で会話する

## 🌐 外部アクセス時のCORS問題解決方法（重要）

**問題**: 外部ホスト（例: 10.99.129.21:3000）からアクセスした際に、バックエンドAPI（10.99.129.21:3003）へのfetchが「Failed to fetch」エラーで失敗し、ガントチャートなどのデータが表示されない。

**原因**: Cross-Origin Resource Sharing (CORS) ポリシーによる制限。異なるポート間での通信がブロックされる。

**解決策**: Next.jsのrewritesプロキシ機能を使用して、フロントエンドとバックエンドを同一オリジンとして扱う。

### 実装手順:

1. **next.config.js にプロキシ設定追加**:
```javascript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://backend:3002/api/:path*', // Docker内部通信
    },
  ];
},
```

2. **フロントエンドのAPI呼び出しを相対パスに変更**:
```typescript
// FullMainApp.tsx
const getApiUrl = (): string => {
  // 相対パスを使用してCORSを回避
  return '';
};
```

3. **結果**:
- 全てのAPI呼び出しが `/api/*` の相対パスで行われる
- Next.jsが自動的にバックエンドにプロキシ
- CORS問題が完全に回避される

### 注意事項:
- Docker Compose環境では、`backend`はサービス名として内部DNSで解決される
- ポート3003の外部公開は不要になる（セキュリティ向上）
- config.iniのCORS設定は念のため残しておくが、プロキシ経由では不要

### デバッグ方法:
```bash
# 外部アクセス時のコンソールログ確認ポイント
- "API URL" ログが空文字列になっていることを確認
- fetchエラーが発生していないことを確認
- Network タブで /api/* リクエストが200 OKを返すことを確認
```

## 📅 履歴データ閲覧システム（実装完了）

**概要**: 日次スナップショット方式による過去データ閲覧機能

### 🎯 実装完了機能（2025-06-23〜24）

**Day 1: 基盤構築**
- ✅ Prismaスキーマ拡張（HistoricalSchedule・SnapshotLogテーブル）
- ✅ SnapshotsServiceモジュール実装
- ✅ 手動スナップショット作成API（`/api/admin/snapshots/manual/:date`）

**Day 2: 自動化・統合API**
- ✅ Cronジョブ実装（毎日深夜0:05自動実行）
- ✅ リトライメカニズム（失敗時1時間ごと、最大3回）
- ✅ 統合API実装（`/api/schedules/unified`）
- ✅ 現在データ・履歴データ自動切り替えロジック

**Day 3: フロントエンド統合**
- ✅ 履歴モード表示切り替えUI
- ✅ 視覚的区別（琥珀色バナー・点線枠・横線パターン）
- ✅ 編集機能の動的無効化（履歴データは編集不可）

**Day 4: プライバシー機能**
- ✅ 退職済み社員の動的マスキング機能
- ✅ 設定画面のプライバシー設定
- ✅ localStorage による設定永続化

**Day 5: 品質確保**
- ✅ 包括的機能テスト
- ✅ 既存機能との統合テスト
- ✅ パフォーマンステスト（中小企業規模で実用性確認）
- ✅ Cronジョブ動作確認

### 🔧 技術仕様

**データベース設計:**
```prisma
model HistoricalSchedule {
  id              Int      @id @default(autoincrement())
  date            DateTime @db.Date
  staffId         Int
  staffName       String
  staffDepartment String
  staffGroup      String
  status          String
  start           DateTime
  end             DateTime
  batchId         String   // スナップショット識別子
  // ... 他フィールド
}

model SnapshotLog {
  id          String         @id @default(cuid())
  targetDate  DateTime       @db.Date
  status      SnapshotStatus @default(PENDING)
  recordCount Int            @default(0)
  batchId     String         @unique
  // ... タイムスタンプ・エラー情報
}
```

**API エンドポイント:**
- `GET /api/schedules/unified?date=YYYY-MM-DD&includeMasking=true/false`
  - 現在データ・履歴データの自動判定・取得
  - マスキング機能対応
- `POST /api/admin/snapshots/manual/:date` - 手動スナップショット作成
- `GET /api/admin/snapshots/history` - スナップショット履歴取得

**Cronジョブ設定:**
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

### 📊 パフォーマンス特性

**動作確認済み規模:**
- スタッフ数: 15名以下で高速動作
- 調整データ: 34件で良好なレスポンス
- 履歴データ: 過去データ閲覧機能正常動作

**本番運用時の推奨最適化:**
1. データベースインデックス追加
   - `Adjustment(date, staffId)` 複合インデックス
   - `Contract(staffId)` インデックス
2. クエリ最適化・キャッシュ機能導入
3. 50名以上の大規模組織での性能チューニング

### 🔒 セキュリティ・プライバシー

**マスキング機能:**
- 退職済み社員（契約データ存在しない）を自動判定
- 「退職済み社員」として表示
- ユーザー設定で有効/無効切り替え可能

**データ保護:**
- 履歴データは編集不可（改ざん防止）
- スナップショット完全性保証（バッチID管理）
- タイムゾーン統一（Asia/Tokyo）

### 🚀 本番運用ガイド

**初回セットアップ:**
1. `npx prisma migrate deploy` - データベースマイグレーション
2. バックエンドサービス起動（Cronジョブ自動開始）
3. 初回手動スナップショット作成（任意）

**日常運用:**
- 毎日0:05に自動スナップショット作成
- 失敗時は自動リトライ（ログ監視推奨）
- 過去データは `/api/schedules/unified` で透明に取得

**モニタリングポイント:**
- SnapshotLogテーブルでスナップショット成功/失敗状況確認
- レスポンス時間監視（大量データ時）
- ディスク容量監視（履歴データ蓄積）

## 🚨 LayeredAPI保護ルール（絶対遵守）

**LayeredAPIの無効化防止 - 2層データ構造の核心機能**

**⚠️ 重要**: `/api/schedules/layered` エンドポイントは契約データ（レイヤー1）表示の生命線

**無効化される主な原因:**
1. **依存関係エラー**: LayerManagerServiceの循環参照
2. **メソッド名間違い**: `getCompatibleSchedules` → `getLayeredSchedules`（正）
3. **コンパイルエラー**: 一つでもエラーがあると自動で無効化

**必須確認コマンド（変更前後に実行）:**
```bash
# LayeredAPI動作確認
curl -s "http://localhost:3002/api/schedules/layered?date=2025-06-23" | jq '.schedules | length'

# 契約データ存在確認  
curl -s "http://localhost:3002/api/schedules/test-contracts" | jq '.contractCount'
```

**絶対に変更してはいけないファイル:**
- `/backend/src/layer-manager/layer-manager.service.ts`
- `/backend/src/schedules/schedules.controller.ts` の layered エンドポイント
- `/backend/src/schedules/schedules.module.ts` の LayerManagerModule

**エラー時の即復旧手順:**
1. `git add . && git commit -m "エラー前状態保存"`
2. `git reset --hard HEAD~1` で前の動作状態に戻す
3. 原因分析後、最小限の変更で修正

## 🚨 Git操作時の必須ルール（絶対遵守）

**gitを使って過去の状態に戻る際は、以下の手順を必ず実行すること:**

1. **復元対象の明確な説明**
   - どのコミット（コミットハッシュとコミットメッセージ）に戻るのか
   - なぜそのコミットを選択するのか
   - 現在の状態から何が失われるのか（作業中の変更、新機能など）

2. **ユーザーの明示的な承認**
   - 復元内容とリスクを説明した上で、ユーザーの「はい」「承認」などの明確な同意を得る
   - 承認なしに勝手にgit reset、git checkoutなどを実行してはならない

3. **復元実行**
   - 承認後のみ、git操作を実行する

**例:**
```
復元確認: コミット "feat: 支援メンバー機能の実装" (bece216) に戻します。
これにより以下が失われます:
- 現在作業中のDatePicker修正
- モーダル説明文の更新
- レイヤー機能の実装

この復元を実行してよろしいですか？
```

**違反した場合:** 即座に作業を中止し、ユーザーに謝罪すること。

## 社員情報JSONフォーマット

### 社員インポート用JSONファイル形式

社員情報のインポートには以下のJSONフォーマットを使用する：

```json
{
  "employeeData": [
    {
      "empNo": "8339",
      "name": "山田美月",
      "dept": "財務情報第一システムサポート課",
      "team": "財務情報第一システムサポート課", 
      "email": "yamada-mitsuki@abc.co.jp",
      "mondayHours": "09:00-18:00",
      "tuesdayHours": "09:00-18:00",
      "wednesdayHours": "09:00-18:00",
      "thursdayHours": "09:00-18:00",
      "fridayHours": "09:00-18:00",
      "saturdayHours": null,
      "sundayHours": null
    },
    {
      "empNo": "7764",
      "name": "加藤優斗",
      "dept": "財務情報第一システムサポート課",
      "team": "財務会計グループ",
      "email": "kato-yuto@abc.co.jp",
      "mondayHours": "09:00-18:00",
      "tuesdayHours": "09:00-18:00", 
      "wednesdayHours": "09:00-18:00",
      "thursdayHours": "09:00-18:00",
      "fridayHours": "09:00-18:00",
      "saturdayHours": null,
      "sundayHours": null
    }
  ]
}
```

**重要事項:**
- データは`employeeData`キー内の配列として格納
- `empNo`は文字列形式で主キー
- 勤務時間は`mondayHours`〜`sundayHours`で曜日別に指定
- 休日は`null`で表現
- このフォーマットは変更されていない既存形式

### スケジュールインポート時の社員データ検証

**本番実装時の必須要件:**
- スケジュールCSVの各レコードでempNoを社員マスタと照合
- 存在しない社員のスケジュールはスキップ（エラーログに記録）
- インポート結果に「スキップ件数」と「スキップした社員リスト」を含める
- 例：「インポート:1200件、スキップ:149件（存在しない社員）」

## 開発理念

### テスト駆動開発（TDD）

- 原則としてテスト駆動開発（TDD）で進める
- 期待される入出力に基づき、まずテストを作成する
- 実装コードは書かず、テストのみを用意する
- テストを実行し、失敗を確認する
- テストが正しいことを確認できた段階でコミットする
- その後、テストをパスさせる実装を進める
- 実装中はテストを変更せず、コードを修正し続ける
- すべてのテストが通過するまで繰り返す

### ポート番号変更時の必須確認事項（重要）

**ポート番号を変更する際は以下を必ず確認すること:**

1. **Docker Composeポートマッピング確認**
   - `docker-compose.yml`のポートマッピング（外部:内部）
   - 例: `"3002:3001"` = 外部3002 → 内部3001

2. **アプリケーション設定との整合性**
   - `backend/src/main.ts`のlistenポート
   - フロントエンドのAPI接続URL設定
   - CORS設定のallowed_origins

3. **競合チェック**
   - `netstat -tlnp | grep [ポート番号]`でポート使用状況確認
   - 既存プロセスとの競合回避

4. **設定変更後の確認手順**
   - コンテナ再起動: `docker-compose down && docker-compose up -d`
   - API接続テスト: `curl http://localhost:[外部ポート]/api/staff`
   - ブラウザアクセステスト

**注意:** コンテナ内部のポートとホスト側の公開ポートは異なることが多い。必ずdocker-compose.ymlで確認すること。

### プロセス競合防止（重要）

**複数のnpm run start:devコマンドを実行すると、ポート競合で起動に失敗する問題:**

**原因:**
- `nest start --watch`モードが複数起動
- 既存プロセスが適切に終了していない
- ゾンビプロセスが残存

**解決方法:**
1. **プロセス確認:** `docker exec [container] ps aux | grep node`
2. **全停止:** `docker exec [container] pkill -f "nest\|node"`
3. **管理スクリプト使用:** `/app/start-backend.sh`を使用
4. **最終手段:** `docker restart [container]`でクリーンリセット

**予防策:**
- 同じコマンドを連続実行しない
- 停止確認後に起動
- 必要に応じてプロセス管理スクリプトを使用

## プロジェクト概要

**コールステータスアプリ** - スタッフのスケジュール管理と在席状況をリアルタイムで追跡するシステムです。タイムライン形式のインターフェースでスケジュールの作成・編集・監視が可能で、全接続クライアントに即座に更新が反映されます。

**技術スタック:**
- フロントエンド: Next.js 14 + TypeScript + Tailwind CSS + Socket.IO + Chart.js
- バックエンド: NestJS + TypeScript + Prisma ORM + PostgreSQL + WebSockets
- 開発環境: Docker Compose（ライブリロード対応）
- 機能拡張: 2層データ構造（契約・調整レイヤー）+ CSVインポート・ロールバック機能

## 開発コマンド

### 🚀 最重要：必須開発コマンド
```bash
# 1. 全サービス起動（最初に必ず実行）
docker-compose up -d

# 2. Prismaクライアント生成（必須・忘れがち）
docker exec callstatus-app_backend_1 npx prisma generate

# 3. バックエンド開発サーバー起動
docker exec -it callstatus-app_backend_1 /bin/bash
cd /app && npm run start:dev

# 4. フロントエンド開発サーバー起動（別ターミナル）
docker exec -it callstatus-app_frontend_1 /bin/bash
cd /app && npm run dev
```

### 🚀 推奨起動方法（自動化スクリプト）
```bash
# 新規起動・完全リセット時
./startup.sh

# 通常の再起動時
./restart.sh

# 問題診断時
./diagnose.sh
```

### 手動フルスタック開発
```bash
# 全サービス起動（フロントエンド、バックエンド、データベース）
docker-compose up -d

# コンテナ名を確認
docker ps

# ⚠️ 重要: Prismaクライアント生成を忘れずに
docker exec callstatus-app_backend_1 /bin/bash -c "cd /app && npx prisma generate"

# フロントエンド開発用（コンテナ名を確認してから実行）
docker exec -it <frontend_container_name> /bin/bash
cd /app && npm run dev

# バックエンド開発用（コンテナ名を確認してから実行）
docker exec -it <backend_container_name> /bin/bash
cd /app && npm run start:dev

# ログ確認
docker-compose logs -f frontend
docker-compose logs -f backend
```

### トラブルシューティング
```bash
# よくある問題の解決手順
1. Prismaエラー → docker exec callstatus-app_backend_1 npx prisma generate
2. プロセス残存 → docker restart callstatus-app_backend_1
3. メモリ不足 → free -h で確認、Docker再起動
4. ポート競合 → lsof -i :3000 -i :3002 で確認
```

### バックエンド開発（コンテナ内で実行）
```bash
# バックエンドコンテナ内またはbackend/ディレクトリ内で実行
npm run start:dev      # ホットリロード付き開発モード
npm run build          # プロダクションビルド
npm run lint           # ESLint（自動修正付き）
npm run format         # Prettier フォーマット
npm run test           # ユニットテスト
npm run test:watch     # ユニットテスト（ウォッチモード）
npm run test:e2e       # E2Eテスト
npm run test:cov       # テストカバレッジ

# データベース操作（重要）
npx prisma migrate dev     # マイグレーション実行
npx prisma generate        # Prismaクライアント生成（必須）
npx prisma studio         # データベースブラウザUI
```

### フロントエンド開発（コンテナ内で実行）
```bash
# フロントエンドコンテナ内またはfrontend/ディレクトリ内で実行
npm run dev           # 開発サーバー（通常これを使用）
npm run build         # プロダクションビルド（本番前確認）
npm run start         # プロダクションビルド実行
npm run lint          # Next.jsリンティング（修正前に実行推奨）
```

## アーキテクチャ概要

### バックエンドアーキテクチャ
- **NestJSモジュラー構造** - 専用の`schedules`モジュール
- **WebSocketゲートウェイ** (`schedules.gateway.ts`) - リアルタイム更新用
- **Prismaサービス** - PostgreSQLデータベース連携
- **RESTful API** - パフォーマンス向上のための日付フィルタークエリ
- **JST基準時間処理** - 日本時間での一貫した時刻管理

**主要ファイル:**
- `src/schedules/schedules.service.ts` - 時間変換を含むコアビジネスロジック
- `src/schedules/schedules.gateway.ts` - WebSocketイベント処理
- `src/schedules/schedules.controller.ts` - REST APIエンドポイント
- `prisma/schema.prisma` - データベーススキーマ（StaffとScheduleテーブル）

### フロントエンドアーキテクチャ
- **シングルページアプリケーション** - 全機能が`src/app/page.tsx`に集約
- **リアルタイムWebSocket統合** - Socket.IOクライアント
- **カスタムモーダルシステム** - Reactポータル使用
- **インタラクティブタイムラインUI** - ドラッグ&ドロップでスケジュール作成
- **日本語ローカライゼーション** - date-fns使用

**主要機能:**
- 8:00-21:00タイムライン（15分間隔、4マス=1時間）
- 早朝（8:00-9:00）・夜間（18:00-21:00）の色分け表示
- 多段階フィルタリング（部署、グループ、在席状況）
- リアルタイム現在時刻インジケーター
- メモ機能（Meeting・Training用）
- 状況統計グラフ（円グラフ・棒グラフ）
- 突発休み（Unplanned）機能 - 当日作成のOffは自動でUnplannedに変換
- 2層データ構造（契約レイヤー + 調整レイヤー）
- CSVインポート・ロールバック機能
- 設定モーダルによる管理機能整理

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
  status    String   # 'Online', 'Remote', 'Meeting', 'Training', 'Break', 'Off', 'Unplanned', 'Night Duty'
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

## API構造

### RESTエンドポイント（2層構造対応）

**スケジュール管理**
- `GET /api/schedules/layered?date=YYYY-MM-DD` - 2層データ統合スケジュール取得
- `GET /api/schedules?date=YYYY-MM-DD` - 旧形式スケジュール取得（互換用）
- `POST /api/schedules` - 新しい予定を作成（調整レイヤーに保存）
- `PATCH /api/schedules/:id` - 既存の予定を更新
- `DELETE /api/schedules/:id` - 予定を削除

**スタッフ管理**
- `GET /api/staff` - スタッフ一覧取得
- `POST /api/staff` - 新しいスタッフ作成
- `PATCH /api/staff/:id` - スタッフ情報更新
- `DELETE /api/staff/:id` - スタッフ削除

**データ投入**
- `POST /api/csv-import/contracts` - 契約データ投入（JSON）
- `POST /api/csv-import/schedules` - 調整レイヤー投入（CSV）
- `GET /api/csv-import/history` - インポート履歴取得
- `DELETE /api/csv-import/rollback` - CSVインポートロールバック

### WebSocketイベント
- `schedule:new` - 新しい予定作成を配信
- `schedule:updated` - 予定更新を配信
- `schedule:deleted` - 予定削除を配信

## 開発パターン

### 時刻処理
- データベースにはUTC時刻として保存
- フロントエンドではJST（日本時間）で表示
- バックエンドでJST→UTC変換を実行（JST時刻-9時間でUTC保存）
- 日付パラメータは時刻とは別に渡して適切な変換を実行
- サービス内の特別な`toDate()`ヘルパーが小数点時間→Dateオブジェクト変換を処理

### リアルタイム更新
- すべてのCRUD操作をWebSocket経由で配信
- フロントエンドはWebSocketイベント受信時にUIを自動更新
- Socket.IOルームは使用せず、全クライアントが全更新を受信

### 2層データレイヤー表示制御
**契約レイヤー（Contract Layer）:**
- 透明度50%（`opacity: 0.5`）で表示
- 斜線パターン背景（`repeating-linear-gradient`）で視覚的区別
- 編集不可：ドラッグ不可、削除不可、クリック編集不可
- zIndex: 10で背面配置
- 契約による基本勤務時間を表示

**調整レイヤー（Adjustment Layer）:**
- 通常表示（`opacity: 1`）
- 編集可能：ドラッグ可能、削除可能、クリック編集可能
- zIndex: 30で前面配置
- 個別調整・月次投入・手動予定を表示

**レイヤー判定ロジック:**
```typescript
const scheduleLayer = schedule.layer || 'adjustment';
const isContract = scheduleLayer === 'contract';
```

**重要な実装ポイント:**
- フロントエンドでスケジュール変換時に`layer`プロパティを必ず保持
- `Schedule`型定義に`layer?: 'contract' | 'adjustment'`を含める
- LayerManagerServiceが正しく`layer`プロパティを設定

### フロントエンド状態管理
- Reactフック（useState、useEffect、useMemo、useCallback）
- 外部状態管理ライブラリは使用しない
- WebSocketイベント経由でリアルタイムデータ同期

## 設定ノート

### Docker開発セットアップ
- フロントエンド: ポート3000
- バックエンド: ポート3002（デフォルトの3001から変更）
- PostgreSQL: ポート5432
- ライブコードリロードのためのボリュームマウントが有効
- データベース接続: `postgresql://user:password@db:5432/mydb`

### 日本語ローカライゼーション
- すべてのUIテキストが日本語
- 日本語ロケールを使用した日付フォーマット（年月日）
- React DatePickerを日本語ロケールで設定

### 環境設定・API設定
- **重要**: 環境切り替えは `config.ini` と `frontend/public/config.js` の両方を変更
- 開発環境でCORSを有効化（localhost + 10.99.129.21の両方に対応）
- グローバルAPIプレフィックスなし（main.tsで無効化）
- 開発用のSocket.IO CORS設定
- 動的API URL判定機能（アクセス元ホストに基づく自動切り替え）

**環境切り替え時の必須手順:**
1. `config.ini` でバックエンドCORS設定を変更
2. `frontend/public/config.js` でフロントエンドAPI接続先を変更  
3. バックエンドコンテナを再起動（設定反映のため）
4. ブラウザキャッシュクリア（Ctrl+F5）

## テストノート
- ユニットテストとe2eテストの両方でJestを設定
- 現在のテストカバレッジは最小限
- 拡張用のテスト環境は適切に設定済み
- データベーステストにはテスト用データベースセットアップが必要

## よくある開発タスク

### 新しいスケジュールステータスの追加
1. page.tsxのフロントエンドステータスオプションを更新
2. 必要に応じてバックエンドバリデーションを更新
3. データベースのenum制約追加を検討

### 時間間隔の変更
- フロントエンドの`STEP_MINUTES`定数を更新
- バックエンドサービスの時間変換ロジックを調整
- タイムライン描画計算を更新

### スタッフ管理機能の追加
- バックエンドに新しいstaffモジュールを作成
- スタッフCRUDエンドポイントを追加
- スタッフ管理UIでフロントエンドを拡張
- スタッフ変更用のWebSocketイベントを更新

### 2層データレイヤーのトラブルシューティング

**契約レイヤーが正常に表示されない場合:**
1. APIレスポンス確認：`curl "http://localhost:3002/api/schedules/layered?date=YYYY-MM-DD" | jq '.schedules[:3]'`
2. レイヤー情報確認：各スケジュールに`"layer": "contract"`が含まれているか
3. フロントエンド変換確認：`Schedule`型に`layer`プロパティが含まれているか
4. 曜日設定確認：契約データで該当曜日の勤務時間が設定されているか

**契約レイヤーが編集可能になってしまう場合:**
- フロントエンドのスケジュール変換で`layer: s.layer`が保持されているか確認
- レイヤー判定ロジック`scheduleLayer === 'contract'`が正しく動作しているか確認

**データ件数の確認方法:**
```bash
# データベース直接確認
docker exec callstatus_app_db psql -U user -d mydb -c "SELECT 'Contract' as table_name, COUNT(*) FROM \"Contract\" UNION ALL SELECT 'Adjustment', COUNT(*) FROM \"Adjustment\";"

# API経由での確認
curl -s "http://localhost:3002/api/schedules/layered?date=YYYY-MM-DD" | jq '{total: (.schedules | length), by_layer: (.schedules | group_by(.layer) | map({layer: .[0].layer, count: length}))}'
```

## 文字サポートと国際化

### 文字チェック機能
- JIS第1-2水準漢字 + ひらがな + カタカナ + 英数字 + 基本記号をサポート
- ファイルアップロード時の文字検証機能
- サポート外文字の検出とエラー表示

### タイムゾーン統一
- PostgreSQL: Asia/Tokyoタイムゾーン
- バックエンド: JST基準での時刻処理
- フロントエンド: JST基準での表示
- 全システムで日本時間に統一

## 認証システム実装プロジェクト進行状況

### 🎯 完了プロジェクト
**認証システム実装** - エンタープライズレベルのセキュリティ機能完了 ✅
- **期間**: 2025-06-21 〜 2025-06-22 
- **ブランチ**: `feature/authentication-system`
- **目的**: JWT認証・権限管理・監査ログによるセキュリティ強化
- **達成**: エンタープライズ級セキュリティ基準完全準拠

### 📋 認証システム実装フェーズ

#### フェーズ1: 基盤構築 【完了】
- [x] 認証要件分析とアーキテクチャ設計
- [x] データベーススキーマ設計（User、Role、AuditLogテーブル）
- [x] Next-Auth（Auth.js）基本設定
- **完了日**: 2025-06-21

#### フェーズ2: バックエンド認証機能 【完了】
- [x] JWT認証ガード実装（JwtAuthGuard）
- [x] 権限管理システム（RolesGuard、デコレーター）
- [x] API保護機能（全エンドポイントに認証・権限チェック）
- [x] ユーザー管理API（ログイン・パスワード設定・変更）
- **完了日**: 2025-06-21

#### フェーズ3: フロントエンド認証UI 【完了】
- [x] 統一デザインのログイン画面実装（email+password同時入力）
- [x] パスワードリセット・初回設定画面
- [x] 認証状態管理（AuthProvider・AuthGuard）
- [x] ローディング画面付きスムーズ画面遷移
- [x] 動的API設定（ポート自動検出）
- [x] 詳細エラーメッセージ表示
- **完了日**: 2025-06-22

#### フェーズ4: セキュリティ強化 【完了】
- [x] **包括的監査ログ機能**
  - 全API操作の記録（ログイン・操作・管理者アクション）
  - 詳細情報保存（IP・ユーザーエージェント・理由）
  - 管理者専用監査ログ取得・統計API
- [x] **高度セッション管理**
  - 24時間アクセストークン + 7日間リフレッシュトークン
  - 並行セッション制限（最大5セッション）
  - 自動期限切れクリーンアップ
- [x] **強力なレート制限・アカウント保護**
  - 5回失敗で15分間アカウントロック
  - IPベース制限併用
  - 段階的遅延システム
- [x] **パスワード設定・リセット機能**
  - 初回ログイン時パスワード設定
  - パスワード失念時のメール通知リセット機能
  - 安全なトークン管理（有効期限付き・トークンタイプ管理）
  - セキュアな初回ログインフロー（メール認証必須）
- [x] **エンタープライズ級セキュリティヘッダー**
  - XSS・CSRF・クリックジャッキング防止
  - CSP・HSTS・権限ポリシー設定
  - 本番環境用厳格設定
- **完了日**: 2025-06-22

### パスワード設定・リセット機能設計

**実装範囲:**
1. **初回ログイン時パスワード設定**
   - 社員インポート時の自動UserAuth作成（パスワードなし）
   - 初回ログイン試行時の自動パスワード設定画面遷移
   - パスワード設定後の自動ログイン

2. **パスワード失念時リセット**
   - パスワードリセット申請画面
   - 安全なトークン生成（JWT/UUID + 有効期限）
   - メール通知機能（パスワード設定URL送信）
   - トークン検証 + パスワード設定画面

**技術要件:**
- メール送信: Nodemailer/SendGrid統合
- トークン管理: 有効期限・回数制限
- 監査ログ: パスワード変更履歴記録
- セキュリティ: CSRF対策、ブルートフォース対策

### 🔒 認証システム技術仕様

#### 権限レベル設計
```typescript
enum Role {
  USER      // 一般ユーザー：自分の予定のみ操作可能
  ADMIN     // 管理者：全機能利用可能（スタッフ管理、データ投入等）
  READONLY  // 閲覧専用：読み取りのみ（将来拡張用）
}
```

#### 保護対象API
- **スケジュール管理**: USER（自分の予定のみ）、ADMIN（全予定）
- **スタッフ管理**: ADMIN専用
- **CSVインポート**: ADMIN専用  
- **契約管理**: ADMIN専用
- **認証API**: 公開（@Public デコレーター）

#### データベーススキーマ（認証用）
```prisma
model UserAuth {
  id            String         @id @default(cuid())
  email         String         @unique
  password      String?
  userType      UserType       @default(STAFF)
  isActive      Boolean        @default(true)
  emailVerified DateTime?
  lastLoginAt   DateTime?
  passwordSetAt DateTime?
  loginAttempts Int            @default(0)
  lockedAt      DateTime?
  staffId       Int?           @unique
  adminRole     AdminRole?
  staff         Staff?         @relation(fields: [staffId], references: [id])
  
  // リレーション
  systemAuditLogs AuditLog[]
  sessions      AuthSession[]
  resetTokens   PasswordResetToken[]
  
  @@map("user_auth")
}

enum UserType {
  ADMIN
  STAFF
}

enum AdminRole {
  SUPER_ADMIN
  STAFF_ADMIN
  SYSTEM_ADMIN
}

model AuditLog {
  id         String   @id @default(cuid())
  userId     String
  action     String
  resource   String
  resourceId String?
  details    String?  // JSON string
  ipAddress  String?
  userAgent  String?
  success    Boolean  @default(true)
  errorMessage String?
  timestamp  DateTime @default(now())
  user       UserAuth @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, action, resource, timestamp])
  @@map("audit_logs")
}

model AuthSession {
  id                String    @id @default(cuid())
  userAuthId        String
  token             String    @unique
  refreshToken      String?   @unique
  expiresAt         DateTime
  refreshExpiresAt  DateTime?
  ipAddress         String?
  userAgent         String?   @db.VarChar(500)
  isActive          Boolean   @default(true)
  lastActivityAt    DateTime  @default(now())
  userAuth          UserAuth  @relation(fields: [userAuthId], references: [id], onDelete: Cascade)

  @@index([userAuthId, token, expiresAt])
  @@map("auth_sessions")
}

model PasswordResetToken {
  id         String    @id @default(cuid())
  userAuthId String
  token      String    @unique
  tokenType  TokenType @default(PASSWORD_RESET)
  expiresAt  DateTime
  isUsed     Boolean   @default(false)
  ipAddress  String?
  userAgent  String?
  userAuth   UserAuth  @relation(fields: [userAuthId], references: [id], onDelete: Cascade)

  @@map("password_reset_tokens")
}

enum TokenType {
  PASSWORD_RESET
  INITIAL_PASSWORD_SETUP
}
```

### ✅ 完了状況（2025-06-22）
**認証システム**: エンタープライズ級セキュリティ完全実装済み
- **バックエンド**: JWT認証・権限管理・監査ログ・レート制限
- **フロントエンド**: 統一デザインのログイン・リセット・初回設定UI
- **セキュリティ**: 包括的監査ログ・セッション管理・セキュリティヘッダー
- **テスト**: 管理者・一般ユーザー・レート制限の動作確認済み

### 🔐 実装済みセキュリティ機能
1. **認証・認可システム**
   - Contract.email基盤のユーザー認証
   - JWT トークン（24時間）+ リフレッシュトークン（7日間）
   - Role-based アクセス制御（ADMIN・STAFF・READONLY）

2. **包括的監査ログ**
   - 全操作の詳細記録（IP・ユーザーエージェント・理由）
   - 管理者専用監査ログ閲覧・統計API
   - ログイン成功・失敗・ブロックの追跡

3. **アカウント保護**
   - 5回失敗で15分間アカウントロック
   - IP ベースレート制限併用
   - 段階的遅延システム

4. **セッション管理**
   - 並行セッション制限（最大5セッション）
   - 自動期限切れクリーンアップ
   - セッション無効化機能

5. **セキュリティヘッダー**
   - XSS・CSRF・クリックジャッキング防止
   - CSP・HSTS・権限ポリシー
   - 本番環境対応厳格設定

### 🧪 テストアカウント情報
**⚠️ セキュリティ注意**: 認証システムは完全実装済み。テストアカウント情報は開発時のみ参考情報として記載。

**認証システム状態**:
- ✅ JWT認証完全実装済み
- ✅ 権限管理システム稼働中  
- ✅ セキュリティヘッダー設定済み
- ⚠️ **認証機能を無効化・バイパスしてはならない**

**本番環境注意事項:**
- すべての認証機能は本番稼働状態を維持する
- テストアカウントは本番環境では使用しない
- セキュリティ監査ログを定期的に確認する

---

## 機能拡張プロジェクト進行状況

### 🎯 プロジェクト概要
2層データ階層による大規模機能拡張（契約・個別調整）
- **開始日**: 2025-06-18
- **ステータス**: 一時中断（認証システム実装優先）
- **目的**: シンプルな単層構造から企業レベルの2層データ管理システムへの移行

### 📋 実装フェーズ

#### フェーズ1: データ構造基盤 【完了】
- [x] データベーススキーマ拡張（2層構造用テーブル追加）
- [x] データ優先順位ロジック（2層データ取得・統合API）
- **目標**: 既存システムと並行稼働可能な基盤構築 ✅
- **リスク**: 低
- **完了日**: 2025-06-18
- **実装内容**:
  - Contract、Adjustmentテーブル追加
  - LayerManagerService実装（2層データ統合ロジック：契約 + 個別調整）
  - /api/schedules/layered エンドポイント追加
  - 既存APIとの並行稼働を確保

#### フェーズ2: データ投入機能 【部分完了】
- [x] CSVスケジュールインポート（調整レイヤー投入）
- [x] インポート履歴・ロールバック機能
- [x] 設定モーダル経由のUI整理
- [ ] スタッフマスタ投入（JSON形式、契約レイヤー生成）
- [ ] 文字チェック機能（JIS第1-2水準）
- **目標**: 契約・調整データの一括投入機能
- **リスク**: 低

#### フェーズ3: UI機能強化 【未着手】
- [ ] ドラッグ&ドロップ制限（契約レイヤーは移動不可制御）
- [ ] 表示制御強化（今日のみ表示切り替え、対応可能人数）
- **目標**: 2層データに対応したUI改善
- **リスク**: 中

#### フェーズ4: データ移行・統合 【未着手】
- [ ] 既存データ移行（現在のスケジュール → 調整レイヤー）
- [ ] 旧システムとの並行稼働（既存APIは保持）
- **目標**: 完全な2層システムへの移行（後方互換性維持）
- **リスク**: 高
- **⚠️ 重要**: 既存APIやLayeredAPIは絶対に廃止・無効化してはならない

### 🔧 技術仕様詳細

#### 2層データ階層設計
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

#### 競合管理仕様
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

### 📊 進捗管理
- **各フェーズ完了後**: Gitコミット + GitHubプッシュ
- **進捗更新**: 本セクションを随時更新
- **ロールバック**: 各フェーズ間で問題発生時は前フェーズに復帰可能

## 🔍 大規模CSVインポート最適化検討案（要検討）

### 現状の課題
**5000行CSVインポート時のパフォーマンス問題:**
- **処理時間**: 5-15分（1件ずつ順次処理）
- **データベース負荷**: 10,000回以上のSQL実行
- **スケーラビリティ**: 大規模データでの運用困難

### 最適化提案

#### 🚀 バッチ処理改善案
```typescript
// 1. スタッフ情報事前一括取得
const allStaff = await this.prisma.staff.findMany();
const staffMap = new Map(allStaff.map(s => [s.empNo, s]));

// 2. バッチ挿入処理（1000件ずつ）
const batchSize = 1000;
for (let i = 0; i < validSchedules.length; i += batchSize) {
  const batch = validSchedules.slice(i, i + batchSize);
  await this.prisma.adjustment.createMany({ data: batch });
}

// 3. 並行処理制限（10バッチ並行）
const concurrency = 10;
await Promise.allSettled(chunks.map(chunk => this.processBatch(chunk)));
```

#### 📊 期待効果
- **処理時間**: 5-15分 → 30秒-2分（80-90%削減）
- **メモリ使用量**: 50-100MB → 20-30MB（40-70%削減）
- **データベース負荷**: 75%削減

### ⚠️ 最適化のデメリット

#### 重大な課題
1. **エラー処理複雑化**: バッチ内エラー特定困難
2. **部分失敗時復旧困難**: バッチ全体失敗リスク
3. **メモリ急激増加**: 大量データ一時保持
4. **進捗表示喪失**: リアルタイム進捗不明
5. **デバッグ困難**: トラブルシューティング複雑化
6. **ロールバック粒度悪化**: 細かい復旧困難
7. **データベースロック延長**: 他操作ブロックリスク
8. **並行処理競合**: リソース枯渇リスク

#### 現実的代替案
```typescript
// 段階的改善（推奨）
const batchSize = 100; // 小さなバッチサイズ
// エラー処理・進捗表示・安全性を維持
```

### 検討指針
- **現在の実装**: 安全性重視（5-15分の処理時間は許容範囲）
- **最適化判断**: 運用規模・頻度・要求速度に応じて決定
- **段階的改善**: まず小さなバッチサイズで安全性確認

**決定保留**: 実際の運用状況を見て最適化要否を判断

---

## プロジェクト構造管理

### 🗂️ Archive フォルダ

開発過程で作成された一時ファイル群を整理・保管するためのアーカイブディレクトリです。

**ディレクトリ構造:**
```
archive/
├── scripts/        # 開発用スクリプト（46個）
│   ├── backend/    # バックエンド開発用スクリプト
│   └── (ルート)    # プロジェクト全体で使用されたスクリプト
├── test-data/      # テスト・デバッグ用サンプルデータ（25個）
│   ├── *.json      # 契約データ、スタッフデータのサンプル
│   └── *.csv       # スケジュールインポート用テストデータ
├── exports/        # データベース抽出結果（3個）
├── backup/         # 重要ファイルのバックアップ
├── docs/           # 開発メモやドキュメント
└── README.md       # アーカイブ説明書
```

**管理方針:**
- 開発過程の記録として保管
- 本番環境では使用しない
- 必要に応じて個別に復元可能
- 定期的なクリーンアップで作成日から3ヶ月経過したファイルは削除検討

**アーカイブ対象ファイル例:**
- デバッグ用スクリプト（`debug-*.js`、`test-*.js`）
- 完了済みデータ変換スクリプト（`create_*.js`、`generate_*.js`）
- テスト用サンプルデータ（`test-*.json`、`sample-*.csv`）
- データベースエクスポート結果（`exported-*.csv`）
- ログファイル（`*.log`）

**⚠️ 重要**: アーカイブは完了済みファイルのみ。稼働中のAPIやサービスは移動・削除してはならない

**ファイル整理コマンド例:**
```bash
# 新しい一時ファイルをアーカイブに移動
mv debug-*.js test-*.js archive/scripts/
mv test-*.json sample-*.csv archive/test-data/
mv exported-*.csv *.log archive/exports/
```

**⚠️ 重要な注意事項:**

**削除・移動してはいけないディレクトリ:**
- `frontend/.next/` - Next.jsビルド成果物（CSS、JS、マニフェストファイル）
- `backend/node_modules/` - バックエンド依存関係
- `frontend/node_modules/` - フロントエンド依存関係
- `backend/dist/` - バックエンドビルド成果物
- `backend/prisma/migrations/` - データベースマイグレーション履歴

**自動生成ファイルを削除した場合の復旧手順:**

1. **Next.jsビルド成果物削除時:**
   ```bash
   # フロントエンドを再起動して再ビルド
   docker restart callstatus-app_frontend_1
   docker exec -d callstatus-app_frontend_1 bash -c "cd /app && rm -rf .next && npm run dev"
   ```

2. **バックエンドビルド成果物削除時:**
   ```bash
   # バックエンドを再起動して再ビルド
   docker restart callstatus-app_backend_1
   docker exec callstatus-app_backend_1 bash -c "cd /app && npm run build"
   ```

**安全な整理対象:**
- `*.js`（ルートディレクトリの一時スクリプト）
- `*.json`（テスト用データファイル）
- `*.csv`（サンプル・エクスポートファイル）
- `*.log`（ログファイル）
- `*.backup`（バックアップファイル）

---

# 時刻処理厳格ルール（必須遵守）

コードを生成・変更する際は以下を厳守すること：

1. **内部時刻は完全UTC**：JST は入出力層でのみ使用
2. **文字列はISO-8601 (Z付き)固定**：ミリ秒不要なら丸めてもよい
3. **日時型はTZ情報を持つ型選択**：TIMESTAMP WITH TIME ZONE など
4. **変数・カラム名は *_utc に統一**：*_jst 禁止
5. **UTC→JST→UTC round-tripテストをユニットに追加**

違反があれば生成を中止し、エラーメッセージを返すこと。

## 🕐 タイムゾーン設定詳細（2025-06-22更新）

### データベース設定
```sql
-- データベースレベルでUTC設定
ALTER DATABASE mydb SET timezone TO 'UTC';

-- セッションレベルでUTC強制
SET timezone TO 'UTC';
```

### PrismaService設定
```typescript
// backend/src/prisma.service.ts
await this.$executeRaw`SET timezone TO 'UTC'`; // 接続時にUTC強制
```

### 時刻変換フロー
1. **入力（フロントエンド）**: JST小数点時刻（例: 9.5 = 9:30 JST）
2. **変換（バックエンド）**: `jstToUtc()` で JST → UTC変換
3. **保存（データベース）**: UTC時刻として保存（例: 2025-06-22 00:30:00）
4. **取得（バックエンド）**: `utcToJstDecimal()` で UTC → JST変換
5. **出力（フロントエンド）**: JST小数点時刻（例: 9.5 = 9:30 JST）

### 変換メソッド例
```typescript
// JST 9.5 (9:30) + "2025-06-22" → UTC "2025-06-22T00:30:00Z"
private jstToUtc(decimalHour: number, baseDateString: string): Date {
  const jstIsoString = `${baseDateString}T${hours}:${minutes}:00+09:00`;
  return new Date(jstIsoString); // 内部的にUTCで保存
}

// UTC "2025-06-22T00:30:00Z" → JST 9.5 (9:30)
private utcToJstDecimal(utcDate: Date): number {
  const jstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
  return jstDate.getHours() + jstDate.getMinutes() / 60;
}
```

### トラブルシューティング
- **症状**: 予定が9時間ずれて表示される
- **原因**: データベースタイムゾーンがAsia/Tokyo設定
- **解決**: 上記設定でUTCに統一

# 重要な指示リマインダー
求められたことを行う。それ以上でも以下でもない。
目標達成に絶対必要でない限り、ファイルを作成しない。
新しいファイルを作成するよりも、既存のファイルを編集することを常に優先する。
ドキュメントファイル（*.md）やREADMEファイルを積極的に作成しない。ユーザーから明示的に要求された場合のみドキュメントファイルを作成する。

---

## 日次スナップショット履歴機能実装プロジェクト

### 🎯 プロジェクト概要
過去の振り返りを可能にする履歴保持機能の実装
- **開始日**: 2025-06-24
- **ブランチ**: `feature/historical-snapshots`
- **目的**: 組織変更・退職の影響を受けない完全な過去データ保持

### 📋 実装方針

#### 設計思想
- **不在社員テーブルは作成しない**（シンプルさ重視）
- **日次スナップショット方式**で過去データを完全保存
- **動的マスキング**で退職済み社員のプライバシー保護

#### データ構造
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

### 🚀 5日間開発スケジュール

#### Day 0: ブランチ作成・準備
```bash
git checkout -b feature/historical-snapshots
```

#### Day 1 (月): データベース基盤構築
- [ ] HistoricalScheduleテーブル設計・マイグレーション
- [ ] SnapshotLogテーブル作成
- [ ] 基本的なスナップショットサービス実装
- [ ] 手動スナップショット作成API

#### Day 2 (火): バックエンドコア機能
- [ ] 日次バッチ処理実装（Cron設定）
- [ ] 統合スケジュール取得API（現在/過去の分岐）
- [ ] エラーハンドリング・リトライ機能
- [ ] 過去30日分の初期データ投入スクリプト

#### Day 3 (水): フロントエンド基本実装
- [ ] 履歴表示コンポーネント作成
- [ ] 過去日付選択時の履歴モード切り替え
- [ ] 視覚的区別（背景色、ラベル、アイコン）
- [ ] API統合とデータ表示

#### Day 4 (木): マスキング機能・UI完成
- [ ] 動的マスキングサービス実装
- [ ] 退職済み社員の判定ロジック
- [ ] マスキング表示オプション（設定画面）
- [ ] UI/UXの最終調整

#### Day 5 (金): テスト・マージ準備
- [ ] 統合テスト実施
- [ ] パフォーマンステスト
- [ ] ドキュメント更新
- [ ] プルリクエスト作成

### 🔧 技術的注意点

#### バッチ処理タイミング
- 毎日深夜0時に前日分のスナップショット作成
- 失敗時は1時間後に自動リトライ（最大3回）

#### データ取得ロジック
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

#### マスキング仕様
- 現在在席していない社員は「退職済み社員」と表示
- 管理者権限では実名表示オプションあり
- 部署・グループ情報は当時のまま表示

### 📊 成功指標
- [ ] 過去30日分のデータが正確に表示される
- [ ] 組織変更の影響を受けない
- [ ] 退職済み社員が適切にマスキングされる
- [ ] 既存機能への影響がない

### ⚠️ リスクと対策
1. **データ容量増加**: 3ヶ月でクリーンアップ
2. **バッチ処理失敗**: 手動実行APIとアラート通知
3. **パフォーマンス**: インデックス最適化

### 🧪 テスト項目
- [ ] スナップショット作成の正常動作
- [ ] 過去データ表示の正確性
- [ ] マスキング機能の動作
- [ ] エラー時のロールバック
- [ ] 既存機能との互換性

### 📝 開発時の確認コマンド
```bash
# スナップショット作成確認
curl -X POST http://localhost:3002/api/admin/snapshots/manual/2025-06-23

# 履歴データ取得確認  
curl "http://localhost:3002/api/schedules/unified?date=2025-06-23"

# マスキング動作確認
curl "http://localhost:3002/api/schedules/unified?date=2025-06-23&includeMasking=true"
```