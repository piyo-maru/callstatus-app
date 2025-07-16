# 🚀 CallStatus App Demo Deployment Guide

転職用ポートフォリオとして AWS EC2 にデプロイするための手順書です。

## 📋 デプロイ前チェックリスト

### 必要なもの
- [ ] AWSアカウント
- [ ] EC2インスタンス（t3.medium推奨）
- [ ] セキュリティグループ設定
- [ ] SSH接続環境

### 推定コスト
- **EC2 t3.medium**: 面接時のみ稼働で月$8-15
- **EBS 30GB**: $8/月
- **総額**: $16-23/月

## 🖥️ EC2セットアップ手順

### 1. EC2インスタンス作成
```bash
# インスタンスタイプ: t3.medium
# OS: Ubuntu 22.04 LTS
# ストレージ: 30GB gp3
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

## 💰 コスト最適化

### 起動・停止スクリプト
```bash
# 起動
aws ec2 start-instances --instance-ids i-1234567890abcdef0

# 停止  
aws ec2 stop-instances --instance-ids i-1234567890abcdef0
```

### 面接用運用パターン
1. **平常時**: インスタンス停止（$8/月のEBS代のみ）
2. **面接1週間前**: インスタンス起動・デモ準備
3. **面接終了後**: 即座に停止

## 🎯 面接でのアピールポイント

### 技術スタック説明
```
「NestJS + Next.js + PostgreSQL のフルスタックアプリを
Docker Compose で AWS EC2 にデプロイし、実際に運用しています」
```

### インフラ経験アピール
```
「EC2でのコンテナ運用、セキュリティグループ設定、
WebSocket通信の本番環境での動作確認を行いました」
```

### コスト意識アピール
```
「必要時のみインスタンスを起動することで
月額コストを80%削減する運用を実践しています」
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

- **AWS EC2運用経験**
- **Docker本番環境構築**
- **WebSocket本番環境動作確認**
- **コスト最適化運用**
- **フルスタックアプリ公開経験**

面接で自信を持ってアピールし、転職を成功させましょう！