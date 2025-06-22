# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際のClaude Code (claude.ai/code) へのガイダンスを提供します。

## 会話ガイドライン

- 常に日本語で会話する

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

### 🚀 推奨起動方法（確実）
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

### バックエンド開発
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

# データベース操作
npx prisma migrate dev     # マイグレーション実行
npx prisma generate        # Prismaクライアント生成
npx prisma studio         # データベースブラウザUI
```

### フロントエンド開発
```bash
# フロントエンドコンテナ内またはfrontend/ディレクトリ内で実行
npm run dev           # 開発サーバー
npm run build         # プロダクションビルド
npm run start         # プロダクションビルド実行
npm run lint          # Next.jsリンティング
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

### API設定
- 開発環境でCORSを有効化（localhost + 10.99.129.21の両方に対応）
- グローバルAPIプレフィックスなし（main.tsで無効化）
- 開発用のSocket.IO CORS設定
- 動的API URL判定機能（アクセス元ホストに基づく自動切り替え）

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

### 🧪 テストアカウント
- **管理者**: admin@example.com / admin123
- **一般ユーザー**: test-new-user@example.com / newpassword123
- **レート制限**: 5回失敗でアカウントロック確認済み

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
- [ ] 旧システム廃止（既存APIの段階的廃止）
- **目標**: 完全な2層システムへの移行
- **リスク**: 高

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
- 一時的なデータ変換スクリプト（`create_*.js`、`generate_*.js`）
- テスト用サンプルデータ（`test-*.json`、`sample-*.csv`）
- データベースエクスポート結果（`exported-*.csv`）
- ログファイル（`*.log`）

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

# 重要な指示リマインダー
求められたことを行う。それ以上でも以下でもない。
目標達成に絶対必要でない限り、ファイルを作成しない。
新しいファイルを作成するよりも、既存のファイルを編集することを常に優先する。
ドキュメントファイル（*.md）やREADMEファイルを積極的に作成しない。ユーザーから明示的に要求された場合のみドキュメントファイルを作成する。