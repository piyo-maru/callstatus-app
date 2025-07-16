# ☁️ AWS EC2 セットアップ詳細ガイド

転職用ポートフォリオデモサイト構築のためのAWS EC2環境構築手順です。

## 🎯 目標

- 月$16-23でCallStatus Appを公開
- 面接でAWS経験をアピール可能な実績作り
- 必要時のみ稼働でコスト最適化

## 📋 Phase 1: AWSアカウント・EC2準備

### 1. AWSアカウント作成（既存の場合はスキップ）
1. https://aws.amazon.com/ にアクセス
2. 「無料アカウントを作成」
3. クレジットカード登録（$1認証あり）
4. 電話認証完了

### 2. IAMユーザー作成（推奨）
```bash
# ルートユーザーではなくIAMユーザーを使用
サービス: IAM
ユーザー名: callstatus-demo-user
ポリシー: EC2FullAccess, VPCFullAccess
```

### 3. キーペア作成
```bash
サービス: EC2 → キーペア
名前: callstatus-keypair
形式: .pem（Linux/Mac）または .ppk（Windows）
ダウンロード場所: ~/.ssh/callstatus-keypair.pem
権限設定: chmod 400 ~/.ssh/callstatus-keypair.pem
```

## 🖥️ Phase 2: EC2インスタンス作成

### 1. インスタンス起動
```bash
サービス: EC2 → インスタンス → インスタンスを起動

# 基本設定
名前: callstatus-demo
AMI: Ubuntu Server 22.04 LTS (無料利用枠対象)
インスタンスタイプ: t3.medium (推奨) または t2.micro (無料枠)
キーペア: callstatus-keypair

# ネットワーク設定
VPC: デフォルトVPC
サブネット: パブリックサブネット
パブリックIP自動割り当て: 有効
```

### 2. セキュリティグループ作成
```bash
セキュリティグループ名: callstatus-demo-sg

インバウンドルール:
1. SSH (22) - 自分のIPのみ
   タイプ: SSH
   ポート: 22
   ソース: マイIP (自動検出)

2. フロントエンド (3000) - 全世界
   タイプ: カスタムTCP
   ポート: 3000
   ソース: 0.0.0.0/0

3. バックエンドAPI (3002) - 全世界
   タイプ: カスタムTCP  
   ポート: 3002
   ソース: 0.0.0.0/0
```

### 3. ストレージ設定
```bash
ルートボリューム:
サイズ: 30 GB
タイプ: gp3
暗号化: デフォルト
```

## 🔧 Phase 3: EC2初期設定

### 1. SSH接続
```bash
# パブリックIPアドレスを確認
EC2コンソール → インスタンス → パブリックIPv4アドレス

# SSH接続（例: 54.123.45.67）
ssh -i ~/.ssh/callstatus-keypair.pem ubuntu@54.123.45.67
```

### 2. システム初期化
```bash
# システム更新
sudo apt update
sudo apt upgrade -y

# 必要パッケージインストール
sudo apt install -y curl wget git unzip

# タイムゾーン設定（任意）
sudo timedatectl set-timezone Asia/Tokyo
```

### 3. Docker環境構築
```bash
# Docker公式リポジトリ追加
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Dockerインストール
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Docker Composeインストール
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# ユーザーをdockerグループに追加
sudo usermod -aG docker ubuntu

# サービス有効化
sudo systemctl enable docker
sudo systemctl start docker

# 再ログイン（dockerグループ反映のため）
exit
ssh -i ~/.ssh/callstatus-keypair.pem ubuntu@54.123.45.67

# Docker動作確認
docker --version
docker-compose --version
docker run hello-world
```

## 📦 Phase 4: アプリケーションデプロイ

### 1. リポジトリ準備
```bash
# SSH GitHub接続設定（推奨）
ssh-keygen -t ed25519 -C "your-email@example.com"
cat ~/.ssh/id_ed25519.pub
# → GitHub Settings → SSH Keys に追加

# または HTTPS でクローン
git clone https://github.com/YOUR-USERNAME/callstatus-app.git
cd callstatus-app
git checkout demo
```

### 2. IP設定の更新
```bash
# EC2のパブリックIPを確認
curl ifconfig.me

# 設定ファイル一括更新（例: 54.123.45.67）
export EC2_IP="54.123.45.67"
sed -i "s/YOUR-EC2-IP/$EC2_IP/g" config.ini
sed -i "s/YOUR-EC2-IP/$EC2_IP/g" frontend/public/config.js
sed -i "s/YOUR-EC2-IP/$EC2_IP/g" backend/src/schedules/schedules.gateway.ts
sed -i "s/YOUR-EC2-IP/$EC2_IP/g" .env.production

# 設定確認
grep "$EC2_IP" config.ini frontend/public/config.js backend/src/schedules/schedules.gateway.ts
```

### 3. アプリケーション起動
```bash
# 自動デプロイ実行
chmod +x deploy.sh
./deploy.sh

# または手動起動
docker-compose up -d --build
docker exec callstatus-app-backend-1 npx prisma generate
docker exec callstatus-app-backend-1 npx prisma migrate deploy
docker exec callstatus-app-backend-1 bash -c "cd /app && node prisma/seed_portfolio.js"
```

### 4. 動作確認
```bash
# サービス状態確認
docker ps

# API疎通確認
curl http://localhost:3002/api/test
curl http://$EC2_IP:3002/api/test

# ブラウザでアクセス
# http://54.123.45.67:3000
```

## 💰 Phase 5: コスト最適化設定

### 1. Elastic IP設定（任意）
```bash
# 固定IPが必要な場合
EC2 → Elastic IP → Elastic IPアドレスを割り当て
インスタンスに関連付け
※ 停止時も課金されるため注意
```

### 2. 自動起動停止（AWS CLI）
```bash
# AWS CLI設定
sudo apt install -y awscli
aws configure
# アクセスキー・シークレットキー・リージョン(ap-northeast-1)設定

# 起動スクリプト
echo '#!/bin/bash
aws ec2 start-instances --instance-ids i-YOUR-INSTANCE-ID' > start-demo.sh
chmod +x start-demo.sh

# 停止スクリプト  
echo '#!/bin/bash
aws ec2 stop-instances --instance-ids i-YOUR-INSTANCE-ID' > stop-demo.sh
chmod +x stop-demo.sh
```

### 3. 運用パターン
```bash
# 面接前: 起動・デモ準備
./start-demo.sh
# 起動まで2-3分待機
ssh -i ~/.ssh/callstatus-keypair.pem ubuntu@$EC2_IP
cd callstatus-app && ./deploy.sh

# 面接後: 即座に停止
./stop-demo.sh
```

## 📊 Phase 6: 監視・ログ設定

### 1. CloudWatch基本監視（無料）
```bash
EC2 → インスタンス → 監視タブ
基本メトリクス: CPU使用率、ネットワーク等が自動監視
```

### 2. ログ確認方法
```bash
# アプリケーションログ
docker-compose logs -f

# システムログ
sudo journalctl -f

# ディスク使用量確認
df -h
docker system df
```

## 🎯 Phase 7: 面接準備

### 1. デモシナリオ準備
```bash
# 基本説明
「AWS EC2上でDockerを使ってフルスタックアプリケーションを運用」

# 技術アピール
「セキュリティグループでポート管理、WebSocket通信の本番環境設定」

# コスト意識
「必要時のみ起動して月額コストを80%削減」
```

### 2. 想定Q&A
```bash
Q: なぜEC2を選んだか？
A: フルスタックアプリの運用経験を積むため、学習コストと運用コストのバランスが最適

Q: セキュリティ対策は？
A: セキュリティグループでポート制限、SSH鍵認証、不要時停止

Q: トラブル時の対応は？
A: CloudWatchでの監視、ログ確認、コンテナ再起動等
```

## ❗ よくある問題とトラブルシューティング

### 1. SSH接続できない
```bash
# 原因: セキュリティグループ設定
解決: SSH (22) でマイIPが許可されているか確認

# 原因: キーペア権限
解決: chmod 400 ~/.ssh/callstatus-keypair.pem
```

### 2. Webサイトにアクセスできない
```bash
# 原因: セキュリティグループ
解決: ポート3000, 3002が0.0.0.0/0で開いているか確認

# 原因: IP設定ミス
解決: config.ini, config.js等でIPアドレス確認
```

### 3. コンテナが起動しない
```bash
# 原因: メモリ不足
解決: t3.medium使用、不要プロセス停止

# 原因: ポート競合
解決: docker-compose down後に再起動
```

## 🏆 成功のポイント

### 1. 段階的な進行
- Phase毎に確実に完了させる
- 動作確認を怠らない
- ログを必ず確認する

### 2. コスト管理
- 不要時は必ず停止
- 無料枠の活用
- 定期的な課金額確認

### 3. 学習記録
- 作業ログを残す
- トラブル対処法を記録
- 面接用説明を準備

このガイドに従って、転職活動で自信を持ってアピールできるAWS実績を作り上げましょう！