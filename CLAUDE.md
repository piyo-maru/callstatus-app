# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際のClaude Code (claude.ai/code) へのガイダンスを提供します。

## 会話ガイドライン

- 常に日本語で会話する

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
- フロントエンド: Next.js 14 + TypeScript + Tailwind CSS + Socket.IO
- バックエンド: NestJS + TypeScript + Prisma ORM + PostgreSQL + WebSockets
- 開発環境: Docker Compose（ライブリロード対応）

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

### データベーススキーマ
```prisma
model Staff {
  id          Int        @id @default(autoincrement())
  name        String
  department  String  
  group       String
  schedules   Schedule[]
}

model Schedule {
  id        Int      @id @default(autoincrement())
  status    String   # 'Online', 'Meeting', 'Training', 'Break', 'Off', 'Night Duty'
  start     DateTime
  end       DateTime
  memo      String?  # メモ（Meeting・Training用）
  staff     Staff    @relation(fields: [staffId], references: [id])
  staffId   Int
}
```

## API構造

### RESTエンドポイント
- `GET /api/schedules?date=YYYY-MM-DD` - 指定日の予定を取得
- `POST /api/schedules` - 新しい予定を作成
- `PATCH /api/schedules/:id` - 既存の予定を更新
- `DELETE /api/schedules/:id` - 予定を削除

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

## 機能拡張プロジェクト進行状況

### 🎯 プロジェクト概要
2層データ階層による大規模機能拡張（契約・個別調整）
- **開始日**: 2025-06-18
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

#### フェーズ2: JSON投入機能 【未着手】
- [ ] スタッフマスタ投入（JSON形式、契約レイヤー生成）
- [ ] 文字チェック機能（JIS第1-2水準）
- **目標**: 契約データの一括投入機能
- **リスク**: 低

#### フェーズ3: UI機能強化 【未着手】
- [ ] ドラッグ&ドロップ制限（契約レイヤーは移動不可制御）
- [ ] 表示制御強化（今日のみ表示切り替え、対応可能人数）
- **目標**: 2層データに対応したUI改善
- **リスク**: 中

#### フェーズ4: データ移行・統合 【未着手】
- [ ] 既存データ移行（現在のスケジュール → 個別調整レイヤー）
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