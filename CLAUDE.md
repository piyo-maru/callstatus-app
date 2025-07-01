# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際のClaude Code (claude.ai/code) へのガイダンスを提供します。

## 会話ガイドライン

- 常に日本語で会話する

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

### E2Eテスト（Playwright・充実したテストスイート）
```bash
# 【重要】テスト実行前に必ずサービス起動確認
docker-compose up -d
curl http://localhost:3000 && curl http://localhost:3002/api/test

# 全E2Eテスト実行（19テスト：基本8+レイヤー5+支援6）
npm run test

# 個別テスト実行
npm run test:basic        # 基本ワークフローテスト（8テスト）
npm run test:layers       # 2層データレイヤーテスト（5テスト）
npm run test:support      # 支援設定機能テスト（6テスト）

# デバッグ・UI付きテスト
npm run test:headed       # ブラウザ表示での実行
npm run test:ui           # Playwright UIインターフェース

# テスト環境セットアップ
npm run test:setup        # データベースシード実行（テスト用データ）

# テスト結果確認
open playwright-report/index.html  # HTMLレポート
ls test-results/                   # 失敗ログ・スクリーンショット・動画
```

## 🕐 時刻処理厳格ルール（必須遵守）

1. **内部時刻は完全UTC**：JST は入出力層でのみ使用
2. **文字列はISO-8601 (Z付き)固定**：ミリ秒不要なら丸めてもよい
3. **日時型はTZ情報を持つ型選択**：TIMESTAMP WITH TIME ZONE など
4. **変数・カラム名は *_utc に統一**：*_jst 禁止
5. **UTC→JST→UTC round-tripテストをユニットに追加**
6. **1分単位精度対応**：Excel Online互換の1分単位入力・計算・表示

違反があれば生成を中止し、エラーメッセージを返すこと。

## 🚨 Git操作時の必須ルール（絶対遵守）

**gitを使って過去の状態に戻る際は、以下の手順を必ず実行すること:**

1. **復元対象の明確な説明**
2. **ユーザーの明示的な承認**
3. **承認後のみ、git操作を実行**

**違反した場合:** 即座に作業を中止し、ユーザーに謝罪すること。

## 🗓️ 現在のプロジェクト状況

### 認証システム 【完了】 ✅
- **期間**: 2025-06-21 〜 2025-06-22
- **ステータス**: エンタープライズ級セキュリティ実装完了
- **詳細**: [/docs/projects/authentication-system.md](/docs/projects/authentication-system.md)

### 日次スナップショット履歴機能 【完了】 ✅
- **期間**: 2025-06-24
- **ステータス**: 過去データ閲覧・マスキング機能実装完了
- **詳細**: [/docs/projects/historical-snapshots.md](/docs/projects/historical-snapshots.md)

### 月次プランナー pending/approval システム 【Phase 2 完了】 ✅
- **ステータス**: Phase 2 完了（2025-06-28）- 横スクロールUI改善実装
- **完了項目**: 
  - Phase 1: データベースマイグレーション、PendingService、CRUD API、承認ワークフロー
  - Phase 2: 月次プランナー横スクロール統一、個人ページ横スクロール統一
- **詳細**: [/docs/projects/monthly-planner-pending-system.md](/docs/projects/monthly-planner-pending-system.md)

### 2層データレイヤーシステム 【部分完了】
- **ステータス**: 基盤完了、認証システム優先のため一時中断
- **目的**: 契約（基本勤務時間）+ 個別調整（例外予定）の2層データ管理
- **詳細**: [/docs/architecture/layered-data-system.md](/docs/architecture/layered-data-system.md)

### 人事イベント管理システム 【完了】 ✅
- **ステータス**: 一括社員情報インポート・自動判定機能実装完了
- **詳細**: [/docs/operations/staff-management-system.md](/docs/operations/staff-management-system.md)

### 1分単位精度対応 【完了】 ✅
- **期間**: 2025-07-01
- **ステータス**: Excel Online互換の1分単位入力システム実装完了
- **技術実装**: TimelineUtils MINUTES_STEP変更、`<input type="time">`UI統一、グリッド表示最適化

## 🏗️ プロジェクト概要

**コールステータスアプリ** - スタッフのスケジュール管理と在席状況をリアルタイムで追跡するシステム

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

## 🏛️ システム全体アーキテクチャ

### 🎯 新しいClaude Codeインスタンス向け重要情報

#### 現在の認証システム状況（重要）
```
❌ バックエンド認証モジュール: 現在無効化中（app.module.ts）
// import { AuthModule } from './auth/auth.module'; // 無効化
✅ フロントエンド認証UI: 完全実装済み（AuthProvider.tsx）
⚠️  テスト用認証: 現在有効（本格認証の代替）
```

#### 現在無効化されているが準備済みのコンポーネント
- JWT認証Guard・Decorator群（全コントローラーでコメントアウト状態）
- 認証API（/src/auth/ディレクトリ自体が存在しない）
- 権限チェック（一時的にスキップ中）

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
- **Playwright** (19テスト実装済み)
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
月次プランナー → Pending作成 → 管理者承認 → Adjustmentに変換
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
/monthly-planner    - 月次プランナー（page.tsx）
/admin/pending-approval - 承認管理画面
```

#### 共通コンポーネント設計
- **AuthProvider**: 認証状態管理・JWT処理
- **Timeline系**: 8:00-21:00タイムライン表示の共通ロジック
- **Modal系**: CRUD操作の統一UI（Schedule/Assignment/Responsibility）
- **Utils**: 時刻変換・祝日判定・色計算の共通関数

#### 横スクロール統一設計
全ページで統一された横スクロール体験：
- 上部スクロールバー + メインコンテンツスクロールバーの同期
- sticky left sidebar（スタッフ名固定）
- 出社状況・個人ページ・月次プランナーで統一実装

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
- **WebSocket**: リアルタイム更新通知

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

## 📚 詳細ドキュメント

### プロジェクト固有
- [認証システム](/docs/projects/authentication-system.md)
- [履歴スナップショット](/docs/projects/historical-snapshots.md)
- [月次プランナー](/docs/projects/monthly-planner-pending-system.md)

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

### よくある問題の即座解決
```bash
1. Prismaエラー → docker exec callstatus-app_backend_1 npx prisma generate
2. プロセス残存 → docker restart callstatus-app_backend_1
3. メモリ不足 → free -h で確認、Docker再起動
4. ポート競合 → lsof -i :3000 -i :3002 で確認
5. API接続失敗 → curl http://localhost:3002/api/test
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

---

**📝 更新履歴**
- 2025-07-01: 1分単位精度対応完了、Excel Online互換時間入力システム実装
- 2025-06-28: 月次プランナーPhase 2完了、新Claude Code向け技術詳細・認証状況・開発コマンド強化
- 2025-06-26: ドキュメント分割・構造化によるコンパクト化実施
- 詳細情報は各専用ドキュメントを参照