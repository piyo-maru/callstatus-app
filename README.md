# 📊 CallStatus - Enterprise Staff Schedule Management System

> **エンタープライズ級のスタッフスケジュール管理システム**  
> リアルタイム同期、複雑なワークフロー、高度なデータ管理機能を備えた本格的なWebアプリケーション

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-e0234e?logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ed?logo=docker)](https://www.docker.com/)
[![Playwright](https://img.shields.io/badge/E2E-Playwright-2EAD33?logo=playwright)](https://playwright.dev/)

![Main Dashboard](assets/dashboard-preview.png)

## 🎯 プロジェクト概要

**CallStatus**は、225名規模の企業での実際の要件に基づいて開発されたスタッフスケジュール管理システムです。  
複雑な勤務パターン、承認ワークフロー、リアルタイム更新など、エンタープライズレベルの要求を満たす本格的なアプリケーションです。

### 🏢 想定利用シーン
- **企業の勤務管理**: 複数部署・グループでの勤務時間管理
- **リアルタイム共有**: 出社状況の即座な把握
- **承認ワークフロー**: 予定変更の申請・承認プロセス
- **履歴管理**: 過去のスケジュール参照・監査対応

---

## ✨ 主要機能

### 🔄 **リアルタイム同期**
- WebSocket（Socket.io）による即座な更新通知
- 複数ユーザー間での同時編集対応
- ライブステータス表示（出社・リモート・会議等）

### 📅 **高度なスケジュール管理**
- **2層データレイヤー**: 基本契約時間 + 個別調整の組み合わせ
- **1分単位精度**: Excel Online互換の正確な時間計算
- **複合予定**: 1日に複数の勤務パターンを組み合わせ可能
- **プリセット機能**: よく使う勤務パターンの保存・再利用

### 🔐 **エンタープライズ認証**
- JWT認証による安全なセッション管理
- 役割ベース権限制御（管理者・一般ユーザー）
- パスワードリセット・初期設定フロー

### 📋 **承認ワークフロー**
- 月次プランナーでの予定申請
- 管理者による一括・個別承認
- 承認履歴の完全な監査ログ
- 承認待ち・承認済み状態の可視化

### 📊 **データ管理・分析**
- **履歴スナップショット**: 日次での過去データ保存
- **CSVインポート・エクスポート**: 大量データの効率的な処理
- **ロールバック機能**: インポート操作の取り消し
- **マスキング機能**: 過去データの個人情報保護

### 🎨 **Modern UI/UX**
- **商用製品クオリティ**: Airシフト風の洗練されたデザイン
- **レスポンシブ対応**: デスクトップ・タブレット完全対応
- **横スクロール統一**: 大量データの効率的な表示
- **ダークモード**: 長時間利用での目の負担軽減

---

## 🛠 技術スタック

### **Frontend**
- **Next.js 14** - App Router、RSC活用の最新構成
- **TypeScript** - 完全型安全な開発
- **Tailwind CSS** - ユーティリティファーストのスタイリング
- **Socket.io-client** - リアルタイム通信
- **React DnD** - ドラッグ&ドロップ操作

### **Backend**
- **NestJS** - エンタープライズ向けNode.jsフレームワーク
- **Prisma ORM** - 型安全なデータベースアクセス
- **PostgreSQL** - 高性能リレーショナルデータベース
- **Socket.io** - WebSocketサーバー
- **JWT** - 認証・認可システム

### **Infrastructure & DevOps**
- **Docker & Docker Compose** - コンテナ化による環境一致
- **Playwright** - E2Eテスト自動化（19テストケース実装）
- **Jest** - ユニット・統合テスト
- **GitHub Actions** - CI/CDパイプライン

### **Architecture Patterns**
- **マイクロサービス風モジュラー設計**
- **レイヤードアーキテクチャ** - 関心の分離
- **CQRS風データ操作** - 読み取り・書き込みの最適化
- **イベント駆動アーキテクチャ** - WebSocketによる状態同期

---

## 🚀 クイックスタート

### 前提条件
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL（Dockerで自動セットアップ）

### インストール・起動
```bash
# リポジトリクローン
git clone https://github.com/your-username/callstatus-app.git
cd callstatus-app

# 全サービス起動（一発コマンド）
docker-compose up -d

# Prismaクライアント生成（必須）
docker exec callstatus-app_backend_1 npx prisma generate

# バックエンド開発サーバー起動
docker exec -it callstatus-app_backend_1 bash -c \"cd /app && npm run start:dev\"

# フロントエンド開発サーバー起動（別ターミナル）
docker exec -it callstatus-app_frontend_1 bash -c \"cd /app && npm run dev\"
```

### 接続確認
- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:3002
- **PostgreSQL**: localhost:5432

---

## 📸 機能スクリーンショット

### メインダッシュボード
![Main Dashboard](assets/main-dashboard.png)
*リアルタイムでの出社状況表示・8:00-21:00のタイムライン表示*

### 月次プランナー
![Monthly Planner](assets/monthly-planner.png)
*カレンダー形式での月間予定管理・申請ワークフロー*

### 承認管理画面
![Approval Management](assets/approval-management.png)
*管理者向け一括承認・詳細な申請内容確認*

### 個人スケジュール
![Personal Schedule](assets/personal-schedule.png)
*個人向け予定編集・プリセット活用*

---

## 🧪 テスト

### E2Eテスト実行
```bash
# 全テストケース実行（19テスト）
npm run test

# カテゴリ別実行
npm run test:basic        # 基本ワークフロー（8テスト）
npm run test:layers       # データレイヤー（5テスト）
npm run test:support      # 支援機能（6テスト）

# UIテスト・デバッグ
npm run test:headed       # ブラウザ表示
npm run test:ui           # Playwright UIツール
```

### バックエンドテスト
```bash
# 単体・統合テスト
docker exec callstatus-app_backend_1 bash -c \"cd /app && npm run test\"

# E2Eテスト
docker exec callstatus-app_backend_1 bash -c \"cd /app && npm run test:e2e\"

# カバレッジ測定
docker exec callstatus-app_backend_1 bash -c \"cd /app && npm run test:cov\"
```

---

## 🏗 アーキテクチャ詳細

### システム構成図
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Next.js)     │◄──►│   (NestJS)      │◄──►│  (PostgreSQL)   │
│                 │    │                 │    │                 │
│ ・App Router    │    │ ・JWT Auth      │    │ ・Prisma ORM    │
│ ・WebSocket     │    │ ・WebSocket     │    │ ・マイグレーション│
│ ・TypeScript    │    │ ・RESTful API   │    │ ・スナップショット│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### データモデル概要
- **Staff**: スタッフ基本情報・部署・グループ
- **Contract**: 基本勤務時間（曜日別パターン）
- **Adjustment**: 個別調整予定（休暇・残業等）
- **PendingSchedule**: 承認待ち予定
- **Snapshot**: 履歴データ保存
- **AuditLog**: 操作履歴・監査証跡

---

## 📈 パフォーマンス・スケーラビリティ

### 実証済みスケール
- **225名同時利用**: 実際の企業環境での検証済み
- **1200件/月のpending処理**: 大量ワークフロー処理対応
- **1分単位精度**: 正確な時間計算による信頼性

### 最適化手法
- **WebSocket最適化**: 必要な更新のみの効率的な通信
- **データベースインデックス**: 大量データでの高速検索
- **クライアントキャッシュ**: 表示設定・プリセットの高速読み込み
- **横スクロール仮想化**: 大量データ表示での滑らかなUX

---

## 🔧 開発・運用

### 開発者向けコマンド
```bash
# データベース操作
docker exec callstatus-app_backend_1 bash -c \"cd /app && npx prisma migrate dev\"
docker exec callstatus-app_backend_1 bash -c \"cd /app && npm run db:seed\"

# コード品質チェック
docker exec callstatus-app_frontend_1 bash -c \"cd /app && npm run lint\"
docker exec callstatus-app_backend_1 bash -c \"cd /app && npm run format\"

# 型チェック
docker exec callstatus-app_frontend_1 bash -c \"cd /app && npx tsc --noEmit\"
```

### 運用スクリプト
- **scripts/operations/**: システム起動・診断ツール
- **scripts/database/**: データベース操作・メンテナンス
- **scripts/demo-data/**: テスト用データ生成

---

## 🤝 Contributing

1. フォークして機能ブランチ作成
2. コード変更・テスト追加
3. Linter・型チェック・テスト実行
4. プルリクエスト作成

### 品質基準
- **TypeScript**: 完全な型安全性
- **テスト**: 新機能には必ずテスト追加
- **ドキュメント**: APIリファレンス更新
- **パフォーマンス**: 大量データでの動作確認

---

## 📋 今後の計画

### Phase 1: 機能拡張
- [ ] モバイルアプリ（React Native）
- [ ] 通知システム（Push・Email）
- [ ] 詳細分析ダッシュボード

### Phase 2: エンタープライズ機能
- [ ] SSO統合（SAML/OAuth）
- [ ] 多言語対応（i18n）
- [ ] API レート制限・監視

### Phase 3: AI・自動化
- [ ] 勤務パターン学習・推奨
- [ ] 異常検知・アラート
- [ ] スケジュール最適化アルゴリズム

---

## 📄 ライセンス

MIT License - 詳細は[LICENSE](LICENSE)をご覧ください。

---

## 👤 開発者情報

**Hiroshi Takahashi**
- GitHub: [@your-username](https://github.com/your-username)
- Email: your.email@example.com
- LinkedIn: [your-linkedin](https://linkedin.com/in/your-profile)

### 💼 転職活動について
このプロジェクトは実際の企業要件に基づいた本格的な開発経験を示すポートフォリオです。  
**エンタープライズ環境での複雑な要求解決・大規模システム設計・チーム開発**の実力をご確認いただけます。

---

*⭐ 気に入った場合はスターをお願いします！*