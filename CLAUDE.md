# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 会話ガイドライン

- 常に日本語で会話する

## 🚨 緊急時対応

### 即座実行すべきコマンド（復旧優先）
```bash
# サービス状態確認
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# プロセス残存確認・停止
docker exec callstatus-app_backend_1 pkill -f "nest|node"
docker restart callstatus-app_backend_1

# DB接続確認
docker exec callstatus-app_backend_1 bash -c "cd /app && npx prisma db pull"

# 最終手段：完全リセット
docker-compose down && docker-compose up -d
docker exec callstatus-app_backend_1 npx prisma generate
```

### 受付チーム業務継続最優先対応
- フロントエンド単独でも最低限動作（API接続失敗時の表示維持）
- WebSocket切断時の自動再接続確認
- 個人ページでの現在時刻表示維持
- 表示日付に関係なく今日のリアルタイム更新は絶対維持

## 🚀 開発環境クイックスタート

### 必須起動コマンド
```bash
# 1. 全サービス起動
docker-compose up -d

# 2. Prismaクライアント生成（必須）
docker exec callstatus-app_backend_1 npx prisma generate

# 3. バックエンド開発サーバー
docker exec -it callstatus-app_backend_1 /bin/bash
cd /app && npm run start:dev

# 4. フロントエンド開発サーバー（別ターミナル）
docker exec -it callstatus-app_frontend_1 /bin/bash
cd /app && npm run dev
```

### 基本ポート設定
- フロントエンド: ポート3000
- バックエンド: ポート3002（外部アクセス用3003）
- PostgreSQL: ポート5432

### データベース認証情報
- ユーザー: user
- パスワード: password
- データベース: mydb

## 🔧 詳細開発コマンド

### フロントエンド開発（Next.js 14）
```bash
# 開発サーバー起動（推奨）
docker exec -it callstatus-app_frontend_1 bash -c "cd /app && npm run dev"

# プロダクションビルド・起動
docker exec callstatus-app_frontend_1 bash -c "cd /app && npm run build"
docker exec callstatus-app_frontend_1 bash -c "cd /app && npm run start"

# コード品質チェック
docker exec callstatus-app_frontend_1 bash -c "cd /app && npm run lint"
docker exec callstatus-app_frontend_1 bash -c "cd /app && npx tsc --noEmit"  # TypeScript型チェック

# 開発サーバーのホットリロード確認
curl http://localhost:3000
```

### バックエンド開発（NestJS）
```bash
# 開発サーバー起動（ウォッチモード・推奨）
docker exec -it callstatus-app_backend_1 bash -c "cd /app && npm run start:dev"

# プロダクションビルド・起動
docker exec callstatus-app_backend_1 bash -c "cd /app && npm run build"
docker exec callstatus-app_backend_1 bash -c "cd /app && npm run start:prod"

# テスト実行（充実したテストスイート）
docker exec callstatus-app_backend_1 bash -c "cd /app && npm run test"          # 単体テスト
docker exec callstatus-app_backend_1 bash -c "cd /app && npm run test:watch"    # ウォッチモード
docker exec callstatus-app_backend_1 bash -c "cd /app && npm run test:cov"      # カバレッジ付き
docker exec callstatus-app_backend_1 bash -c "cd /app && npm run test:e2e"      # NestJS E2Eテスト

# コード品質・フォーマット
docker exec callstatus-app_backend_1 bash -c "cd /app && npm run lint"
docker exec callstatus-app_backend_1 bash -c "cd /app && npm run format"

# データベース操作
docker exec callstatus-app_backend_1 bash -c "cd /app && npm run db:seed"       # シードデータ投入
docker exec callstatus-app_backend_1 bash -c "cd /app && npm run db:reset"      # DB完全リセット
docker exec callstatus-app_backend_1 bash -c "cd /app && npx prisma generate"   # Prismaクライアント生成
docker exec callstatus-app_backend_1 bash -c "cd /app && npx prisma migrate dev" # マイグレーション実行

# API接続テスト
curl http://localhost:3002/api/test
curl http://localhost:3002/api/staff
```

## 📊 負荷テスト実行

### WebSocket接続テスト
```bash
# Artillery.ioでの基本負荷テスト（要事前インストール）
npm install -g artillery

# 段階的接続増加テスト
for i in 10 20 30 40 50; do
  echo "Testing $i connections..."
  # WebSocket接続テスト実行
  sleep 30
done
```

### API負荷テスト
```bash
# 統合APIの負荷確認
ab -n 1000 -c 10 "http://localhost:3002/api/schedules/unified?date=2025-07-10"

# CRUD操作負荷テスト
ab -n 500 -c 5 -p schedule.json -T "application/json" "http://localhost:3002/api/schedules"
```

**詳細**: docs/outsourcing/load_testing_specification.md 参照

### E2Eテスト（Playwright・包括的テストスイート）
```bash
# 【重要】テスト実行の前提条件
# 1. 全サービスが起動していること
docker-compose up -d
docker ps  # 3つのコンテナが全てRunning状態であることを確認

# 2. データベースにシードデータが投入されていること
npm run test:setup  # または docker exec [backend_container] npm run db:seed

# 3. API接続が正常であること
curl http://localhost:3002/api/test  # {"message":"API is working"}が返ること
curl http://localhost:3000  # HTMLが返ること

# 基本テスト実行
npm run test                 # 全E2Eテスト実行

# カテゴリ別テスト実行
npm run test:basic           # 基本ワークフローテスト（7テスト）
npm run test:layers          # 2層データレイヤーテスト（5テスト）
npm run test:support         # 支援設定機能テスト（6テスト）
npm run test:drag            # ドラッグ操作テスト
npm run test:pages           # ページ固有機能テスト
npm run test:realtime        # リアルタイム通信テスト
npm run test:ui-consistency  # UI統一性テスト
npm run test:auth            # 認証・権限テスト
npm run test:edge            # エッジケーステスト

# 統合テストグループ
npm run test:core            # コア機能（basic + layers + support）
npm run test:interaction     # インタラクション（drag + pages + realtime）
npm run test:quality         # 品質保証（ui-consistency + auth + edge）
npm run test:comprehensive   # 全カテゴリ包括実行

# デバッグ・UI付きテスト
npm run test:headed          # ブラウザ表示での実行
npm run test:ui-mode         # Playwright UIインターフェース
npm run test:debug           # デバッグモード
npm run test:trace           # トレース記録付き実行

# パフォーマンス・CI向けオプション
npm run test:parallel        # 並列実行（4ワーカー）
npm run test:ci              # CI環境用（JUnit形式レポート）
npm run test:coverage        # カバレッジHTMLレポート

# テスト結果確認
open playwright-report/index.html  # HTMLレポート
ls test-results/                   # 失敗ログ・スクリーンショット・動画
```

### E2Eテスト構成
```
tests/e2e/
├── basic-workflow.spec.js     # 基本操作・フィルター・表示確認（7テスト）
├── layer-system.spec.js       # 2層データレイヤー動作（5テスト）
├── support-features.spec.js   # 支援設定機能（6テスト）
├── drag-operations.spec.js    # ドラッグ&ドロップ操作
├── page-specific.spec.js      # 各ページ固有機能
├── realtime-tests.spec.js     # WebSocketリアルタイム通信
├── ui-consistency.spec.js     # UI統一性・デザイン整合性
├── monitoring-auth.spec.js    # システム監視・認証権限
└── edge-cases.spec.js         # エッジケース・異常系
```
### 運用スクリプト（便利な自動化ツール）
```bash
# 完全起動スクリプト（推奨）- 全サービス起動・Prisma生成・開発サーバー起動を自動化
./scripts/operations/startup.sh

# システム診断スクリプト - サービス状態・ポート・DB接続を一括確認
./scripts/operations/diagnose.sh

# 再起動スクリプト
./scripts/operations/restart.sh       # 通常再起動
./scripts/operations/restart_clean.sh  # クリーン再起動（プロセス完全停止後）
```

## 🕐 時刻処理厳格ルール（必須遵守）

1. **内部時刻は完全UTC**：JST は入出力層でのみ使用
2. **文字列はISO-8601 (Z付き)固定**：ミリ秒不要なら丸めてもよい
3. **日時型はTZ情報を持つ型選択**：TIMESTAMP WITH TIME ZONE など
4. **変数・カラム名は *_utc に統一**：*_jst 禁止
5. **UTC→JST→UTC round-tripテストをユニットに追加**
6. **1分単位精度対応**：Excel Online互換の1分単位入力・計算・表示

違反があれば生成を中止し、エラーメッセージを返すこと。

## 📘 TypeScript開発ガイドライン（必須遵守）

1. **型安全性の徹底**：`any`型の使用禁止、全パラメータに明示的型注釈
2. **Iterator問題対応**：`Set`/`Map`/`Headers`は`Array.from()`でイテレーション
3. **型定義の統一**：共通型は`types/MainAppTypes.ts`に集約
4. **エラーハンドリング**：`instanceof Error`による型ガード必須
5. **プリセット設定型**：`presetDisplayOrder`プロパティ必須（全ページ設定）
6. **Staff型の完全性**：`isActive?: boolean`と`currentStatus: string`必須

**TypeScript型チェック必須コマンド**:
```bash
docker exec callstatus-app_frontend_1 bash -c "cd /app && npx tsc --noEmit"
```

## 🚨 Git操作時の必須ルール（絶対遵守）

**gitを使って過去の状態に戻る際は、以下の手順を必ず実行すること:**

1. **復元対象の明確な説明**
2. **ユーザーの明示的な承認**
3. **承認後のみ、git操作を実行**

**違反した場合:** 即座に作業を中止し、ユーザーに謝罪すること。

## 🗓️ 現在のプロジェクト状況

### 認証システム 【基盤完了・権限チェック調整中】 ⚠️
- **期間**: 2025-06-21 〜 2025-06-22
- **ステータス**: 認証基盤完了、権限チェック一時無効化中（段階的有効化）
- **完了項目**: AuthModule・JWT認証・フロントエンド認証UI
- **調整中**: 各コントローラーでの権限チェック（一時的にコメントアウト）
- **⚠️ 重要なセキュリティ問題**: 
  - フロントエンドでのSTAFF権限制御は正常動作（予定編集・追加・削除の制限）
  - バックエンドAPI権限チェックは完全無効化（schedules.controller.ts）
  - 直接API呼び出しでフロントエンド制限を回避可能（開発者ツール等）
  - STAFFユーザーが他人の予定を操作可能な状態
- **詳細**: [/docs/projects/authentication-system.md](/docs/projects/authentication-system.md)

### 日次スナップショット履歴機能 【完了】 ✅
- **期間**: 2025-06-24
- **ステータス**: 過去データ閲覧・マスキング機能実装完了
- **詳細**: [/docs/projects/historical-snapshots.md](/docs/projects/historical-snapshots.md)

### 月次計画 pending/approval システム 【Phase 2 完了】 ✅
- **ステータス**: Phase 2 完了（2025-06-28）- 横スクロールUI改善実装
- **完了項目**: 
  - Phase 1: データベースマイグレーション、PendingService、CRUD API、承認ワークフロー
  - Phase 2: 月次計画横スクロール統一、個人ページ横スクロール統一
- **詳細**: [/docs/projects/monthly-planner-pending-system.md](/docs/projects/monthly-planner-pending-system.md)

### 2層データレイヤーシステム 【完了】 ✅
- **ステータス**: 完全実装済み・本格運用中
- **実装内容**: 契約（基本勤務時間）+ 個別調整（例外予定）の2層データ管理
- **技術実装**: LayerManagerService、統合API（`/api/schedules/unified`）、Contract/Adjustmentテーブル連携
- **詳細**: [/docs/architecture/layered-data-system.md](/docs/architecture/layered-data-system.md)

### 人事イベント管理システム 【完了】 ✅
- **ステータス**: 一括社員情報インポート・自動判定機能実装完了
- **詳細**: [/docs/operations/staff-management-system.md](/docs/operations/staff-management-system.md)

### 1分単位精度対応 【完了】 ✅
- **期間**: 2025-07-01
- **ステータス**: Excel Online互換の1分単位入力システム実装完了
- **技術実装**: TimelineUtils MINUTES_STEP変更、`<input type="time">`UI統一、グリッド表示最適化

### カードデザイン統一・UI/UX大幅改善 【完了】 ✅
- **期間**: 2025-07-01
- **ステータス**: 出社状況ページの商用製品レベルUI実装完了
- **主要改善**:
  - モダンカードデザイン統一（rounded-xl, shadow-sm, border統一）
  - ボタン高さ完全統一（全要素h-7で28px固定）
  - レスポンシブ幅制御（1-3枚目フルHD収納、4枚目ガントチャート横スクロール対応）
  - 最適間隔調整（カード間8px、ヘッダー間6px）
  - ガントチャート幅80%圧縮（min-w-[1360px]）
- **技術実装**: Tailwind CSS活用、パフォーマンス影響なし、CSS・レイアウトのみ改善

### カスタム複合予定機能・承認者向け詳細情報表示 【完了】 ✅
- **期間**: 2025-07-02
- **ステータス**: 月次計画にカスタム複合予定機能実装完了
- **主要機能**:
  - カスタム複合予定作成モーダル（複数スケジュール組み合わせ）
  - 複合予定説明フィールド（プリセット説明パターン準拠）
  - 詳細情報JSON形式サーバー保存（memoフィールド拡張）
  - 承認モーダル複合予定詳細表示（全スケジュール・説明表示）
  - 一時プリセットlocalStorage永続化（7日間自動クリーンアップ）
- **技術実装**: 承認者判断材料完全提供（時間・ステータス・メモ・説明）

### 担当設定統一システム 【完了】 ✅
- **期間**: 2025-07-04
- **ステータス**: 全3ページ（出社状況・個人・月次計画）担当設定システム完全統一
- **主要実装**:
  - useResponsibilityData統一フック（データ管理・API通信）
  - ResponsibilityBadges統一コンポーネント（表示・バッジ生成）
  - ResponsibilityModal統一モーダル（CRUD操作・3ボタンレイアウト）
  - 型安全な責任分離アーキテクチャ（TypeScript完全対応）
  - 個人ページ日付選択改善（📌アイコン表示・青枠強調）
- **技術成果**: 400行コード削減、保守性向上、統一UX実現

### システム監視ダッシュボード・UI統一化 【完了】 ✅
- **期間**: 2025-07-05
- **ステータス**: プロダクト品質UIとシステム監視機能実装完了
- **主要実装**:
  - システム監視ダッシュボード（実データのみ表示、Node.js/PostgreSQL メトリクス）
  - TypeScript型安全性完全修正（Staff型、プリセット設定、Iterator対応）
  - 全トグルスイッチサイズ統一（32×16px）- 出社状況・個人・月次計画
  - ボタン配置最適化（管理者設定→月次計画右側、部分更新→システム監視右側）
  - UI表記改善（高速更新→部分更新、対応可能人数→現在の対応可能人数）
- **技術成果**: プロダクト製品レベルUI実現、型安全性向上、保守性強化

## 🏗️ プロジェクト概要

**コールステータスアプリ** - スタッフのスケジュール管理と在席状況をリアルタイムで追跡するシステム

### 📁 プロジェクト構造
```
callstatus-app/
├── frontend/          # Next.js フロントエンド
├── backend/          # NestJS バックエンド  
├── database/         # データベース関連
├── scripts/          # 運用・開発スクリプト
│   ├── operations/   # 起動・診断スクリプト
│   ├── database/     # DB操作スクリプト
│   └── demo-data/    # デモデータ生成
├── docs/             # 詳細ドキュメント
├── tests/            # E2Eテスト (Playwright)
├── docker-compose.yml
├── config.ini        # APIホスト設定
└── package.json      # ルートパッケージ（E2Eテスト用）
```

### 🏢 重要な業務コンテキスト
- **300名規模の企業**: 実際の企業環境での運用要件に基づく設計
- **受付チームの特別要件**: 来客対応のため、表示日付に関係なく今日のリアルタイム状況把握が必須
- **部署・グループ構造**: `Staff.department`と`Staff.group`で組織構造を管理
- **業務継続性**: 受付業務の中断は顧客満足度に直接影響するため、技術最適化より業務確実性を優先

### 技術スタック
- **フロントエンド**: Next.js 14 + TypeScript + Tailwind CSS + Socket.IO
- **バックエンド**: NestJS + TypeScript + Prisma ORM + PostgreSQL + WebSockets
- **開発環境**: Docker Compose（ライブリロード対応）
- **セキュリティ**: JWT認証・権限管理・監査ログ
- **データ管理**: 2層データ構造 + 履歴スナップショット + CSVインポート

### 主要機能
- リアルタイムスケジュール管理（8:00-21:00タイムライン・1分単位精度）
- 2層データレイヤー（契約・調整）
- 日次履歴スナップショット・過去データ閲覧
- 人事システム連携・自動判定
- エンタープライズ認証・権限管理
- CSVインポート・ロールバック機能
- カスタム複合予定機能（月次計画）
- プリセット管理・承認ワークフロー
- 統一担当設定システム（FAX・昼当番・CS担当等）
- システム監視ダッシュボード（CPU・メモリ・DB応答時間・実データのみ）
- 部分更新システム（WebSocket差分更新、受付業務継続性重視）

## ⚠️ 重要な開発制約（ultrathink）

- **受付チーム業務への影響を最小化**: 表示日付に関係なく今日のリアルタイム更新は絶対維持
- **WebSocket変更時の慎重さ**: 全クライアントブロードキャストの変更は段階的に
- **時刻処理変更禁止**: TimeUtils以外での時刻計算は行わない
- **認証システム復旧**: 段階的にセキュリティ機能を有効化（一度に全て変更しない）
- **既存機能保護**: 既存の機能を損なわないように細心の注意を払いながら開発する

## 🏗️ 重要なアーキテクチャ理解

### 2層データレイヤーシステム
```
Contract (基本勤務時間) 
    ↓
Adjustment (個別調整) 
    ↓  
統合API (/api/schedules/unified)
    ↓
フロントエンド表示
```

### WebSocket通信フロー
```
スケジュール変更 → Backend → 全クライアントブロードキャスト → リアルタイム更新
※ N×N通信問題: 接続数の二乗に比例して負荷増加
```

### 認証システム現状
```
✅ 認証基盤: 完了（AuthModule、JWT、フロントエンドUI）
⚠️  API権限チェック: 核心機能で無効化中（schedules.controller.ts等）
🚨 セキュリティリスク: 直接API呼び出しで制限回避可能
```

## 🏛️ システム全体アーキテクチャ

### 🎯 新しいClaude Codeインスタンス向け重要情報

#### 現在の認証システム状況（重要）
```
✅ バックエンド認証モジュール: 有効化済み（app.module.ts:40 AuthModule）
✅ フロントエンド認証UI: 完全実装済み（AuthProvider.tsx）
✅ フロントエンドSTAFF権限制御: 正常動作（予定編集・追加・削除制限）
⚠️  バックエンドAPI権限チェック: 完全無効化中（セキュリティリスクあり）
🚨 セキュリティ脆弱性: 直接API呼び出しでSTAFF制限を回避可能
```

#### 現在一時的に無効化されているコンポーネント
- JWT認証Guard・Decorator群（schedules.controller.ts等で完全コメントアウト）
- API権限チェック（POST/PATCH/DELETE全てスキップ中）
- STAFFユーザーの自己staffId制限（バックエンドレベル）

#### セキュリティ影響範囲
- **影響API**: `/api/schedules` (POST/PATCH/DELETE)
- **脆弱性**: STAFFユーザーが開発者ツール等で他人の予定を操作可能
- **回避方法**: 直接fetch()でstaffIdを変更してAPI呼び出し
- **対策**: 段階的権限チェック復旧が必要（Phase 1: JWT認証 → Phase 2: STAFF制限）

#### 技術スタック詳細
**フロントエンド:**
- **Next.js 14** + TypeScript + Tailwind CSS 
- **socket.io-client** (リアルタイム更新)
- **react-dnd** (ドラッグ&ドロップ)
- **date-fns** (日付処理)
- **recharts** (グラフ表示)
- **next-auth** (認証・未使用)
- **bcryptjs** (パスワードハッシュ)

**バックエンド:**
- **NestJS** + TypeScript + PostgreSQL
- **Prisma ORM** (データベースアクセス)
- **@nestjs/websockets** + **socket.io** (WebSocket)
- **@nestjs/schedule** (クロンジョブ)
- **bcrypt** + **@nestjs/jwt** (認証)
- **multer** (ファイルアップロード)

**E2Eテスト:**
- **Playwright** (包括的テストスイート実装済み)
- **Jest** (NestJS E2Eテスト)

### コアアーキテクチャ原則

#### 1. 2層データレイヤーシステム
```
レイヤー1（Contract）: 基本契約勤務時間
　　　　　　↓
レイヤー2（Adjustment）: 個別調整・例外予定
```
- **Contract**: 曜日別基本勤務時間（例：月-金 9:00-18:00）
- **Adjustment**: 休暇、早退、残業など個別調整
- **表示統合**: `/api/schedules/unified` で2層データを統合表示

#### 2. Pending/Approval システム
```
月次計画 → Pending作成 → 管理者承認 → Adjustmentに変換
```
- **PendingSchedule**: 承認待ち予定（`isPending: true`）
- **承認プロセス**: 管理者による一括・個別承認
- **状態管理**: pending → approved → active のライフサイクル

#### 3. 履歴スナップショット機能
```
日次スケジュール → Snapshotテーブル → 過去データ閲覧
```
- **自動スナップショット**: 毎日0時に前日データを保存
- **マスキング対応**: 過去データの個人情報保護
- **履歴API**: `/api/schedules/unified?date=YYYY-MM-DD` で過去データアクセス

### フロントエンドアーキテクチャ

#### ページ構成
```
/                    - 出社状況（FullMainApp.tsx）
/personal           - 個人スケジュール（PersonalSchedulePage.tsx）
/monthly-planner    - 月次計画（page.tsx）
/admin/pending-approval - 承認管理画面
```

#### 共通コンポーネント設計
- **AuthProvider**: 認証状態管理・JWT処理
- **Timeline系**: 8:00-21:00タイムライン表示の共通ロジック
- **Modal系**: CRUD操作の統一UI（Schedule/Assignment/Responsibility）
- **Responsibility系**: 担当設定の統一システム
  - **useResponsibilityData**: 統一データ管理フック
  - **ResponsibilityBadges**: 統一バッジ表示コンポーネント
  - **ResponsibilityModal**: 統一CRUD操作モーダル
- **Utils**: 時刻変換・祝日判定・色計算の共通関数

#### 横スクロール統一設計
全ページで統一された横スクロール体験：
- 上部スクロールバー + メインコンテンツスクロールバーの同期
- sticky left sidebar（スタッフ名固定）
- 出社状況・個人ページ・月次計画で統一実装

### バックエンドアーキテクチャ

#### モジュール構成
```
app.module.ts               - メインモジュール
├── schedules/              - スケジュールCRUD・WebSocket
├── staff/                  - スタッフ管理
├── pending/                - Pending予定管理
├── csv-import/             - CSVインポート・ロールバック
├── snapshots/              - 履歴スナップショット
├── daily-assignments/      - 支援設定
├── responsibilities/       - 担当設定
├── department-settings/    - 部署・グループ設定
└── contracts/              - 契約勤務時間
```

#### データベース設計の要点
- **Adjustment**: pending関連カラム（`isPending`, `approvedBy`, `approvedAt`）
- **Contract**: 曜日別勤務時間カラム（`mondayHours`〜`sundayHours`）
- **Snapshot**: 履歴保存用テーブル
- **PendingApprovalLog**: 承認・却下履歴
- **一意制約**: 重複予定防止の制約設計

#### API設計パターン
- **統合API**: `/api/schedules/unified` - 2層データ統合取得
- **Pending API**: `/api/schedules/pending/*` - 承認ワークフロー
- **履歴API**: 日付指定での過去データ取得
- **システム監視API**: `/api/system-monitoring/metrics` - 実データのみサーバー/DB監視
- **WebSocket**: リアルタイム更新通知（部分更新システム）

### 重要な設計決定

#### 時刻処理の統一ルール
- 内部処理は完全UTC、入出力層のみJST変換
- ISO-8601形式（Z付き）での文字列処理
- タイムゾーン情報を含むデータベース型の使用
- 1分単位精度による正確な時間計算・表示（TimelineUtils.ts: MINUTES_STEP=1）

#### 祝日対応システム
- 契約データの祝日無効化（祝日は契約勤務なし）
- 祝日判定による日付表示の赤字化
- 全ページ横断での一貫した祝日処理

#### 権限・セキュリティ設計
- JWT認証によるセッション管理
- 管理者・一般ユーザーの権限分離
- Pending操作での権限チェック（現在は一時無効化）

#### WebSocketシステム設計の重要な考慮事項
- **現在の実装**: 全クライアント向けブロードキャスト（`schedule:new`, `schedule:updated`, `schedule:deleted`）
- **スケーラビリティ制限**: 50人程度で性能限界（N×N通信問題）
- **受付チーム業務要件**: 表示日付に関係なく今日の更新をリアルタイム受信が必須
- **技術vs業務のトレードオフ**: 差分更新最適化は受付業務の確実性と相反する
- **部署判定の実装**: `Staff.department`/`Staff.group`に「受付」が含まれる場合の特別扱い
- **緊急時対応**: 受付チームの同期遅延は顧客対応に直接影響するため最優先事項

## 📚 詳細ドキュメント

### プロジェクト固有
- [認証システム](/docs/projects/authentication-system.md)
- [履歴スナップショット](/docs/projects/historical-snapshots.md)
- [月次計画](/docs/projects/monthly-planner-pending-system.md)

### アーキテクチャ
- [2層データシステム](/docs/architecture/layered-data-system.md)

### 運用・管理
- [人事管理システム](/docs/operations/staff-management-system.md)

### 開発・保守
- [時刻処理ルール](/docs/development/time-handling-rules.md)
- [トラブルシューティング](/docs/development/troubleshooting.md)

## 🚨 緊急時トラブルシューティング

### 最重要：必須開発コマンド
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

### コンテナ名の確認（docker exec実行前に必要）
```bash
# 全コンテナの状態確認
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 正確なコンテナ名取得（プロジェクト名によって変わる場合がある）
docker ps | grep backend   # 例: callstatus-app_backend_1, callstatus-app-backend-1
docker ps | grep frontend  # 例: callstatus-app_frontend_1, callstatus-app-frontend-1
docker ps | grep db        # 例: callstatus_app_db

# コンテナ名が異なる場合は、実際の名前に置き換えて実行
# 例: docker exec [実際のコンテナ名] npm run start:dev
```

### よくある問題の即座解決
```bash
1. Prismaエラー → docker exec callstatus-app_backend_1 npx prisma generate
2. プロセス残存 → docker restart callstatus-app_backend_1
3. メモリ不足 → free -h で確認、Docker再起動
4. ポート競合 → lsof -i :3000 -i :3002 で確認
5. API接続失敗 → curl http://localhost:3002/api/test
```

### コンテナ名の確認（docker exec実行前に必要）
```bash
# 全コンテナの状態確認
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 正確なコンテナ名取得
docker ps | grep backend
docker ps | grep frontend
```

### プロセス競合防止（重要）
```bash
# プロセス確認
docker exec callstatus-app_backend_1 ps aux | grep node

# 全停止
docker exec callstatus-app_backend_1 pkill -f "nest|node"

# 最終手段：クリーンリセット
docker restart callstatus-app_backend_1
```

### 環境設定問題
- **config.ini** と **frontend/public/config.js** の両方変更必須
- バックエンドコンテナ再起動後にブラウザキャッシュクリア（Ctrl+F5）

### 自動生成ファイル復旧
```bash
# Next.jsビルド成果物削除時
docker restart callstatus-app_frontend_1
docker exec -d callstatus-app_frontend_1 bash -c "cd /app && rm -rf .next && npm run dev"

# バックエンドビルド成果物削除時  
docker restart callstatus-app_backend_1
docker exec callstatus-app_backend_1 bash -c "cd /app && npm run build"
```

**詳細**: [完全版トラブルシューティングガイド](/docs/development/troubleshooting.md)

## 📋 重要な指示リマインダー

- 求められたことを行う。それ以上でも以下でもない
- 目標達成に絶対必要でない限り、ファイルを作成しない
- 新しいファイルを作成するよりも、既存のファイルを編集することを常に優先する
- ドキュメントファイル（*.md）やREADMEファイルを積極的に作成しない
- **ultrathink: 既存の機能を損なわないように細心の注意を払いながら開発する**

---

**📝 更新履歴**
- 2025-07-07: E2Eテストコマンド拡充、テスト構成詳細化、ultrathink原則追加、コンテナ名確認方法強化
- 2025-07-06: 運用スクリプト情報追加、データベース認証情報追加、コンテナ名確認方法追加、プロジェクト構造追加
- 2025-07-05: システム監視ダッシュボード・UI統一化完了、TypeScript型安全性完全修正、プロダクト品質UI実現
- 2025-07-04: 担当設定統一システム完了、個人ページ日付選択📌形式実装、統一責任分離アーキテクチャ確立
- 2025-07-03: 【重要修正】実装状況の誤記修正（2層レイヤー→完了、認証システム→基盤完了・調整中）、WebSocket業務要件洞察追加
- 2025-07-01: カード設計統一・UI改善実装、1分単位精度対応完了、Excel Online互換時間入力システム実装
- 2025-06-28: 月次計画Phase 2完了、新Claude Code向け技術詳細・認証状況・開発コマンド強化
- 2025-06-26: ドキュメント分割・構造化によるコンパクト化実施
- 詳細情報は各専用ドキュメントを参照