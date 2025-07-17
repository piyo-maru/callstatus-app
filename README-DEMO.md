# 🚀 CallStatus App Demo Deployment Guide

転職用ポートフォリオとして AWS EC2 にデプロイするための手順書です。

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
sed -i 's/YOUR-EC2-IP/54.123.45.67/g' config.ini
sed -i 's/YOUR-EC2-IP/54.123.45.67/g' frontend/public/config.js
sed -i 's/YOUR-EC2-IP/54.123.45.67/g' backend/src/schedules/schedules.gateway.ts
sed -i 's/YOUR-EC2-IP/54.123.45.67/g' .env.production
```

### 3. 自動デプロイ実行
```bash
./deploy.sh
```

### 4. 手動デプロイ（deploy.shが失敗した場合）
```bash
# Docker Compose起動
docker-compose up -d --build

# Prismaセットアップ
docker exec callstatus-app-backend-1 npx prisma generate
docker exec callstatus-app-backend-1 npx prisma migrate deploy

# デモデータ投入
docker exec callstatus-app-backend-1 bash -c "cd /app && node prisma/seed_portfolio.js"

# 状態確認
docker ps
curl http://localhost:3002/api/test
```

## 🌐 アクセス確認

### サービスURL
- **フロントエンド**: http://YOUR-EC2-IP:3000
- **バックエンドAPI**: http://YOUR-EC2-IP:3002
- **API疎通テスト**: http://YOUR-EC2-IP:3002/api/test

### デモデータ確認
- 50人スタッフ × 6部署構成
- 60日分のスケジュールデータ
- リアルタイム更新機能
- WebSocket通信確認

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
AWS EC2 の無料枠で12ヶ月間無料運用しています」
```

### インフラ経験アピール
```
「t2.microでのメモリ最適化、セキュリティグループ設定、
WebSocket本番環境構築を実践しました」
```

### コスト意識アピール
```
「AWS無料枠の制限を理解し、スワップファイル追加や
メモリ最適化で効率的なリソース活用を実現しています」
```

### 継続学習アピール
```
「課金アラート設定による予算管理、CloudWatch監視など
本格的なAWS運用スキルを個人学習で習得しました」
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
# CORS設定確認
grep -n "YOUR-EC2-IP" backend/src/schedules/schedules.gateway.ts

# コンテナ再起動
docker-compose restart
```

#### 3. データベース接続エラー
```bash
# PostgreSQLコンテナ確認
docker exec callstatus-app-db-1 psql -U user -d mydb -c "SELECT 1;"

# Prisma再生成
docker exec callstatus-app-backend-1 npx prisma generate
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
- **WebSocket本番環境動作確認**
- **AWS監視・アラート設定**（CloudWatch、Billing）
- **フルスタックアプリ公開経験**（常時アクセス可能）

## 💡 無料枠活用の最大メリット

- **完全無料**: 12ヶ月間$0でAWS実践経験
- **常時稼働**: ポートフォリオとしていつでもデモ可能
- **制約対応**: 限られたリソースでの最適化技術習得
- **転職価値**: 「効率的なエンジニア」として差別化

**12ヶ月間無料でAWS実績を作り、転職を成功させましょう！**