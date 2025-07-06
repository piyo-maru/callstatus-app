# 📊 CallStatus - Portfolio Demo

> **⚠️ ポートフォリオ・デモンストレーション版 ⚠️**  
> これは技術力紹介のためのデモ版です。本格運用には適していません。

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-e0234e?logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://www.postgresql.org/)
[![AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

![Demo Preview](assets/demo-preview.png)

## 🎯 プロジェクト概要

**CallStatus**は、エンタープライズ級のスタッフスケジュール管理システムのポートフォリオ版です。  
実際の企業環境での要件に基づいて設計された、技術力とアーキテクチャ設計能力を示すデモンストレーションです。

### 💡 このデモで確認できる技術力
- **モダンフルスタック開発**: Next.js 14 + NestJS + PostgreSQL
- **リアルタイム通信**: WebSocket（Socket.io）によるライブ更新
- **エンタープライズ設計**: 複雑なデータ構造・ワークフロー実装
- **TypeScript完全活用**: 型安全な大規模アプリケーション開発
- **美しいUI/UX**: 商用製品レベルのインターフェース設計

---

## ✨ 実装済み主要機能

### 🔄 **リアルタイム同期**
- WebSocket（Socket.io）による即座な更新通知
- 複数ユーザー間での同時編集対応
- ライブステータス表示（出社・リモート・会議等）

### 📅 **高度なスケジュール管理**
- **2層データレイヤー**: 基本契約時間 + 個別調整
- **1分単位精度**: 正確な時間計算・表示
- **複合予定**: 1日複数の勤務パターン組み合わせ
- **プリセット機能**: よく使う予定パターンの保存

### 🎨 **モダンUI/UX**
- **淡いパステル色**: 目に優しいカラーパレット
- **レスポンシブ設計**: デスクトップ最適化
- **統一デザインシステム**: 一貫したユーザー体験
- **横スクロール最適化**: 大量データの効率表示

### 📊 **データ管理**
- **履歴スナップショット**: 日次での過去データ保存
- **承認ワークフロー**: 月次計画での申請・承認プロセス
- **権限管理**: 管理者・一般ユーザーの役割分離

---

## 🛠 技術スタック

### **Frontend**
- **Next.js 14** - App Router、RSC活用
- **TypeScript** - 完全型安全開発
- **Tailwind CSS** - ユーティリティファーストCSS
- **Socket.io-client** - リアルタイム通信
- **React DnD** - ドラッグ&ドロップ

### **Backend**
- **NestJS** - エンタープライズNode.jsフレームワーク
- **Prisma ORM** - 型安全データベースアクセス
- **PostgreSQL** - 高性能リレーショナルDB
- **Socket.io** - WebSocketサーバー
- **JWT** - 認証システム（デモでは簡略化）

### **DevOps & Testing**
- **Docker Compose** - 開発環境コンテナ化
- **Playwright** - E2Eテスト自動化
- **Jest** - ユニット・統合テスト
- **GitHub Actions Ready** - CI/CD対応

---

## 🚀 デモ起動方法

### 前提条件
- Node.js 18+
- Docker & Docker Compose

### インストール・起動
```bash
# リポジトリクローン
git clone https://github.com/your-username/callstatus-app.git
cd callstatus-app

# デモ環境セットアップ（簡易版）
./scripts/setup-demo.sh

# または手動セットアップ
docker-compose up -d
docker exec callstatus-app_backend_1 npx prisma generate
docker exec callstatus-app_backend_1 npm run db:seed
```

### 接続確認
- **デモ画面**: http://localhost:3000
- **API**: http://localhost:3002

---

## 📸 機能デモ

### メインダッシュボード
*リアルタイム出社状況・タイムライン表示*

### 月次計画
*カレンダー形式での予定管理・承認ワークフロー*

### 個人スケジュール
*個人向け予定編集・プリセット活用*

---

## 🏗 アーキテクチャのポイント

### 設計思想
- **関心の分離**: レイヤード・モジュラーアーキテクチャ
- **スケーラビリティ**: 大量データ・多ユーザー対応設計
- **保守性**: TypeScript型安全性・テスト自動化
- **ユーザビリティ**: 実際の業務フローに基づくUX設計

### データ設計
```
Contract (基本勤務時間) + Adjustment (個別調整) = 統合表示
```

### リアルタイム通信
```
フロントエンド ←→ WebSocket ←→ バックエンド ←→ PostgreSQL
```

---

## 🚨 重要な制限事項

### ⚠️ デモ版の制限
- **認証システム**: 簡略化（実際はJWT完全実装）
- **CSVインポート**: 削除済み（実際は225人規模対応）
- **運用機能**: 監視・バックアップ等は非実装
- **データ永続化**: 保証なし

### 🏢 フル機能版との違い
- エンタープライズ認証（SSO・LDAP連携）
- 大量データインポート・エクスポート
- 詳細な監査ログ・レポート機能
- 本格運用向けDevOps設定

---

## 🧪 テスト

### E2Eテスト実行
```bash
# 全テストケース（基本機能のみ）
npm run test:demo

# UI付きテスト
npm run test:headed
```

---

## 📄 ライセンス

**GNU Affero General Public License v3.0**

### 🔒 利用制限
- ⚠️ **商用利用禁止**（ライセンス違反）
- ⚠️ **SaaS運用時**: ソースコード公開義務
- ✅ **ポートフォリオ確認**: 自由
- ✅ **学習目的**: 自由

本格的な商用利用については別途ご相談ください。

---

## 👤 開発者情報

**Hiroshi Takahashi**  
フルスタックエンジニア・システムアーキテクト

### 💼 技術的な強み
- **エンタープライズ開発**: 複雑な業務要件の技術実装
- **アーキテクチャ設計**: スケーラブルなシステム構成
- **TypeScript**: 大規模アプリでの型安全開発
- **フルスタック**: Frontend・Backend・DevOps全般

### 📞 連絡先
- GitHub: [@your-username](https://github.com/your-username)
- Email: your.email@example.com
- LinkedIn: [your-profile](https://linkedin.com/in/your-profile)

---

### 🎯 ポートフォリオとしての価値

このプロジェクトは以下の**実務レベルの技術力**を実証します：

1. **複雑な要件の技術実装力**
   - 2層データ構造・承認ワークフロー・リアルタイム同期

2. **エンタープライズ級の設計力**
   - 225名規模での動作実績・型安全性・テスト自動化

3. **ユーザー中心のUI/UX設計**
   - 実際の業務フローに基づく使いやすいインターフェース

4. **チーム開発対応力**
   - 保守性・拡張性を考慮したコード品質

---

*⭐ 技術レベルが伝わりましたら、ぜひスターをお願いします！*