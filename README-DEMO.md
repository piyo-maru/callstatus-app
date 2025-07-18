# 🚀 CallStatus App Demo Deployment Guide

転職用ポートフォリオとして AWS EC2 にデプロイするための手順書です。

## 📊 最新実装状況（2025-07-18）

### ✅ 実装完了機能
- **楽観的更新システム（Phase 1-2）**: チャットアプリレベルの即座性体験
- **2層データレイヤー**: 契約（基本勤務時間）+ 個別調整（例外予定）
- **日次スナップショット履歴**: 過去データ閲覧・マスキング機能
- **月次計画 pending/approval システム**: 承認ワークフロー・横スクロールUI統一
- **システム監視ダッシュボード**: Node.js/PostgreSQL メトリクス・実データ監視
- **1分単位精度対応**: Excel Online互換の時間入力システム
- **カードデザイン統一**: 商用製品レベルUI・Tailwind CSS最適化
- **プロダクト品質向上**: TypeScript型安全性完全修正・lint エラー完全解決

### ⚠️ 調整中・注意事項
- **認証システム**: フロントエンド権限制御は正常動作、バックエンドAPI権限チェックは段階的復旧中
- **WebSocket**: 50人規模で性能限界、受付チーム業務継続性を最優先
- **IP設定**: 現在は `13.112.49.86` に設定（必要に応じて更新）

## 🌐 ライブデモ確認

### サービスURL
- **フロントエンド**: https://callstatus.online
- **バックエンドAPI**: https://callstatus.online/api
- **API疎通テスト**: https://callstatus.online/api/test

### デモデータ確認
- **50人スタッフ**: 6部署構成（システム部・営業部・管理部・マーケティング部・カスタマーサポート部・受付チーム）
- **60日分動的データ**: 実行日基準で前後30日ずつ、約540件の申請データ
- **承認ワークフロー**: 前半30日承認済み・後半30日承認待ち状態
- **リアルタイム更新**: WebSocket通信による即座反映（楽観的更新対応）
- **システム監視**: Node.js/PostgreSQL メトリクス・実データ監視ダッシュボード
- **履歴機能**: 日次スナップショット・過去データ閲覧・マスキング対応

### 🎯 デモ操作の流れ
1. **出社状況ページ**: リアルタイム更新・楽観的更新を体験
2. **個人ページ**: 1分単位精度・横スクロール統一UI確認
3. **月次計画**: 承認ワークフロー・カスタム複合予定機能
4. **システム監視**: Node.js/PostgreSQL メトリクス・実データ監視ダッシュボード

## 📋 デプロイ前チェックリスト

### 必要なもの
- [ ] AWSアカウント
- [ ] EC2インスタンス（t2.micro・無料枠）
- [ ] セキュリティグループ設定
- [ ] SSH接続環境

### 推定コスト
- **EC2 t2.micro**: 12ヶ月間完全無料（AWS無料枠）
- **EBS 30GB**: 12ヶ月間完全無料（AWS無料枠）
- **総額**: **$0/月**（12ヶ月間）

## 🖥️ EC2セットアップ手順

### 1. EC2インスタンス作成
```bash
# インスタンスタイプ: t2.micro (無料枠)
# OS: Ubuntu 22.04 LTS (無料枠対象)
# ストレージ: 30GB gp2 (無料枠対象)
```

### 2. セキュリティグループ設定
```bash
# HTTP (ポート3000) - フロントエンド
Type: Custom TCP
Port: 3000
Source: 0.0.0.0/0

# API (ポート3002) - バックエンド  
Type: Custom TCP
Port: 3002
Source: 0.0.0.0/0

# SSH (ポート22) - 管理用
Type: SSH
Port: 22
Source: YOUR-IP/32
```

### 3. 初期セットアップ
```bash
# SSH接続
ssh -i your-key.pem ubuntu@YOUR-EC2-IP

# システム更新
sudo apt update && sudo apt upgrade -y

# t2.micro用スワップファイル作成（メモリ不足対策）
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Docker & Docker Compose インストール
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker ubuntu
sudo systemctl enable docker
sudo systemctl start docker

# Git インストール
sudo apt install -y git

# 再ログイン（Dockerグループ反映のため）
exit
ssh -i your-key.pem ubuntu@YOUR-EC2-IP
```

## 📥 アプリケーションデプロイ

### 1. リポジトリクローン
```bash
# デモブランチをクローン
git clone -b demo https://github.com/YOUR-USERNAME/callstatus-app.git
cd callstatus-app
```

### 2. IP設定の更新
```bash
# 実際のEC2 IPアドレスに置換（例: 54.123.45.67）
# 現在の設定値: 13.112.49.86 → 新しいIPアドレスに更新
sed -i 's/13.112.49.86/54.123.45.67/g' config.ini
sed -i 's/13.112.49.86/54.123.45.67/g' frontend/public/config.js

# 【重要】IPアドレス変更後は必ずブラウザキャッシュクリア（Ctrl+F5）
# WebSocket接続・API接続が新しいIPアドレスで動作することを確認
```

### 3. 自動デプロイ実行
```bash
./deploy.sh
```

### 4. 手動デプロイ（deploy.shが失敗した場合）
```bash
# Docker Compose起動
docker-compose up -d --build

# Prismaセットアップ（必須）
docker exec callstatus-app-backend-1 npx prisma generate
docker exec callstatus-app-backend-1 npx prisma migrate deploy

# ポートフォリオ用50人デモデータ投入（4コマンド）
docker exec callstatus-app-backend-1 bash -c "cd /app && node prisma/seed_portfolio.js"

# 60日分動的申請データ生成（推奨）
cd scripts/demo-data
node generate_portfolio_demo_60days.js
node register_portfolio_pending_60days.js
node approve_first_30days_portfolio.js
cd ../..

# 状態確認
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
curl http://localhost:3002/api/test
curl http://localhost:3002/api/staff  # 50人スタッフデータ確認
```

## 🌐 デプロイ完了後のアクセス確認

### サービスURL（IPアドレス更新後）
- **フロントエンド**: https://callstatus.online
- **バックエンドAPI**: https://callstatus.online/api
- **API疎通テスト**: https://callstatus.online/api/test

## 💰 無料枠活用・監視設定

### 無料枠使用量監視
```bash
# AWS Billing Dashboard確認
1. AWSコンソール → Billing Dashboard
2. 「無料枠使用量の確認」
3. EC2-Instance Hours: 750時間/月まで無料
4. EBS Storage: 30GB/月まで無料
5. Data Transfer Out: 15GB/月まで無料
```

### 課金アラート設定（重要）
```bash
# CloudWatch課金アラート
1. CloudWatch → アラーム → 課金アラームを作成
2. しきい値: $1 (予防的アラート)
3. 通知先: あなたのメールアドレス
4. アラーム名: "AWS-Free-Tier-Alert"
```

### 24時間運用パターン（推奨）
1. **常時稼働**: t2.micro 24時間稼働（無料枠内）
2. **ポートフォリオ**: いつでもアクセス可能
3. **面接対応**: 事前準備不要でデモ実施可能

## 🎯 面接でのアピールポイント

### 技術スタック説明
```
「NestJS + Next.js + PostgreSQL のフルスタックアプリを
AWS EC2 の無料枠で12ヶ月間無料運用しています。
楽観的更新システム・2層データレイヤー・WebSocket通信を実装し、
企業レベルの機能を個人学習で習得しました」
```

### インフラ経験アピール
```
「t2.microでのメモリ最適化、セキュリティグループ設定、
WebSocket本番環境構築を実践しました。
Docker Compose・Prisma ORM・PostgreSQL の本番運用経験があります」
```

### コスト意識アピール
```
「AWS無料枠の制限を理解し、スワップファイル追加や
メモリ最適化で効率的なリソース活用を実現しています。
課金アラート設定による予算管理も実践しています」
```

### 継続学習・問題解決アピール
```
「TypeScript型安全性・lint エラー完全解決・システム監視ダッシュボード実装など、
企業レベルの保守性・品質向上に取り組んでいます。
技術問題を段階的に解決し、プロダクト品質を継続的に向上させています」
```

## 🔧 トラブルシューティング

### よくある問題と解決法

#### 1. API接続エラー
```bash
# セキュリティグループ確認
aws ec2 describe-security-groups --group-ids sg-xxxxx

# ポート疎通確認
curl -I http://YOUR-EC2-IP:3002/api/test
```

#### 2. WebSocket接続失敗
```bash
# 現在のIP設定確認
grep -n "13.112.49.86" config.ini
grep -n "13.112.49.86" frontend/public/config.js

# 【重要】IPアドレス変更後はブラウザキャッシュクリア（Ctrl+F5）
# WebSocket接続エラーの大半はキャッシュが原因

# コンテナ再起動
docker-compose restart
```

#### 3. データベース接続エラー
```bash
# PostgreSQLコンテナ確認
docker exec callstatus-app-db-1 psql -U user -d mydb -c "SELECT 1;"

# Prisma再生成（必須）
docker exec callstatus-app-backend-1 npx prisma generate

# スナップショット機能確認
docker exec callstatus-app-backend-1 bash -c "cd /app && npx prisma db pull"
```

#### 4. システム監視ダッシュボードエラー
```bash
# バックアップ機能確認（PostgreSQL クライアントが必要）
docker exec callstatus-app-backend-1 which pg_dump

# 不足している場合はインストール
docker exec callstatus-app-backend-1 apt-get update
docker exec callstatus-app-backend-1 apt-get install -y postgresql-client
```

## 📞 サポート

問題が発生した場合は、以下を確認してください：

1. EC2インスタンスが起動していること
2. セキュリティグループでポート3000, 3002が開いていること  
3. 全てのコンテナが正常に起動していること
4. IP設定が正しく更新されていること

---

## 🏆 転職成功への道筋

このデモサイトを通じて、以下の実績を積むことができます：

- **AWS EC2無料枠活用経験**（12ヶ月間$0運用）
- **Docker本番環境構築**（t2.microメモリ最適化）
- **WebSocket本番環境動作確認**（楽観的更新システム対応）
- **AWS監視・アラート設定**（CloudWatch、Billing）
- **フルスタックアプリ公開経験**（常時アクセス可能）
- **企業レベル機能実装**（2層データレイヤー、承認ワークフロー、履歴機能）
- **プロダクト品質向上**（TypeScript型安全性、lint エラー完全解決）
- **システム監視経験**（Node.js/PostgreSQL メトリクス、実データ監視）

## 💡 無料枠活用の最大メリット

- **完全無料**: 12ヶ月間$0でAWS実践経験
- **常時稼働**: ポートフォリオとしていつでもデモ可能
- **制約対応**: 限られたリソースでの最適化技術習得
- **転職価値**: 「効率的なエンジニア」として差別化
- **実践的経験**: 企業レベルの機能・システム監視・品質向上を個人学習で習得
- **継続的改善**: 技術問題を段階的に解決し、プロダクト品質を継続的に向上

## 🎯 面接での具体的アピール例

### 楽観的更新システム
```
「チャットアプリレベルの即座性体験を実現するため、
楽観的更新システムを実装しました。変更リスク分類・
指数バックオフリトライ・競合解決機能を個人学習で習得しています」
```

### 2層データレイヤー
```
「契約（基本勤務時間）と調整（例外予定）の2層データ管理により、
複雑な業務要件に対応できる設計を実装しました。
LayerManagerService・統合API設計を実践しています」
```

### システム監視・品質向上
```
「Node.js/PostgreSQL メトリクス監視・TypeScript型安全性完全修正・
lint エラー完全解決により、企業レベルの保守性・品質向上を実現しています。
技術問題を段階的に解決し、プロダクト品質を継続的に向上させています」
```

**12ヶ月間無料でAWS実績を作り、企業レベルの技術力をアピールして転職を成功させましょう！**