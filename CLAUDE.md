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
- バックエンド: ポート3002
- PostgreSQL: ポート5432

## 🕐 時刻処理厳格ルール（必須遵守）

1. **内部時刻は完全UTC**：JST は入出力層でのみ使用
2. **文字列はISO-8601 (Z付き)固定**：ミリ秒不要なら丸めてもよい
3. **日時型はTZ情報を持つ型選択**：TIMESTAMP WITH TIME ZONE など
4. **変数・カラム名は *_utc に統一**：*_jst 禁止
5. **UTC→JST→UTC round-tripテストをユニットに追加**

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

### 月次プランナー pending/approval システム 【Phase 1 完了】 ✅
- **ステータス**: データ基盤・API実装完了（2025-06-26）
- **完了項目**: データベースマイグレーション、PendingService、CRUD API、承認ワークフロー
- **Phase 2**: 月次プランナーUI改修（pending作成・表示・承認機能）
- **詳細**: [/docs/projects/monthly-planner-pending-system.md](/docs/projects/monthly-planner-pending-system.md)

### 2層データレイヤーシステム 【部分完了】
- **ステータス**: 基盤完了、認証システム優先のため一時中断
- **目的**: 契約（基本勤務時間）+ 個別調整（例外予定）の2層データ管理
- **詳細**: [/docs/architecture/layered-data-system.md](/docs/architecture/layered-data-system.md)

### 人事イベント管理システム 【完了】 ✅
- **ステータス**: 一括社員情報インポート・自動判定機能実装完了
- **詳細**: [/docs/operations/staff-management-system.md](/docs/operations/staff-management-system.md)

## 🏗️ プロジェクト概要

**コールステータスアプリ** - スタッフのスケジュール管理と在席状況をリアルタイムで追跡するシステム

### 技術スタック
- **フロントエンド**: Next.js 14 + TypeScript + Tailwind CSS + Socket.IO
- **バックエンド**: NestJS + TypeScript + Prisma ORM + PostgreSQL + WebSockets
- **開発環境**: Docker Compose（ライブリロード対応）
- **セキュリティ**: JWT認証・権限管理・監査ログ
- **データ管理**: 2層データ構造 + 履歴スナップショット + CSVインポート

### 主要機能
- リアルタイムスケジュール管理（8:00-21:00タイムライン）
- 2層データレイヤー（契約・調整）
- 日次履歴スナップショット・過去データ閲覧
- 人事システム連携・自動判定
- エンタープライズ認証・権限管理
- CSVインポート・ロールバック機能

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
- 2025-06-26: ドキュメント分割・構造化によるコンパクト化実施
- 詳細情報は各専用ドキュメントを参照