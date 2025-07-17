# ☁️ AWS EC2 セットアップ詳細ガイド

転職用ポートフォリオデモサイト構築のためのAWS EC2環境構築手順です。

## 🎯 目標

- 【12ヶ月間完全無料】でCallStatus Appを公開
- 面接でAWS経験をアピール可能な実績作り
- AWS無料枠を最大活用した実践経験

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
インスタンスタイプ: t2.micro (無料枠・12ヶ月間無料)
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
サイズ: 30 GB (無料枠上限)
タイプ: gp2 (無料枠対象)
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
# t2.micro用スワップファイル作成（メモリ不足対策）
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

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

## 💰 Phase 5: 無料枠最適化・監視設定

### 1. 無料枠使用量監視
```bash
# AWS Billing Dashboard設定
1. AWSコンソール → Billing Dashboard
2. 「無料枠使用量の確認」
3. EC2-Instance Hours (750時間/月まで無料)
4. EBS Storage (30GB/月まで無料)
5. Data Transfer Out (15GB/月まで無料)
```

### 2. 課金アラート設定（重要）
```bash
# CloudWatch課金アラート
1. CloudWatch → アラーム → 課金アラームを作成
2. しきい値: $1 (予防的アラート)
3. 通知先: あなたのメールアドレス
4. アラーム名: "AWS-Free-Tier-Alert"
```

### 3. t2.micro性能最適化
```bash
# Node.js メモリ制限設定
export NODE_OPTIONS="--max-old-space-size=512"

# Docker メモリ制限
docker run -m 512m your-container

# スワップ使用状況確認
free -h
swapon --show
```

### 4. 24時間運用パターン（推奨）
```bash
# 無料枠内で常時稼働
- t2.micro: 24時間×31日 = 744時間 < 750時間（無料枠）
- ポートフォリオとして常時公開可能
- 面接官がいつでもアクセス可能
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
「AWS EC2の無料枠を活用してフルスタックアプリケーションを12ヶ月間無料で運用」

# 技術アピール
「t2.microでのメモリ最適化、セキュリティグループ設定、WebSocket本番環境構築」

# コスト意識
「AWS無料枠の制限を理解し、効率的なリソース活用を実践」
```

### 2. 想定Q&A
```bash
Q: なぜEC2を選んだか？
A: AWS無料枠でフルスタック運用経験を積み、実際のクラウド環境での学習ができるため

Q: セキュリティ対策は？
A: セキュリティグループでポート制限、SSH鍵認証、課金アラート設定

Q: 無料枠の制限をどう管理したか？
A: CloudWatch監視、Billing Dashboard確認、メモリ最適化でリソース効率化

Q: t2.microで性能問題はなかったか？  
A: スワップファイル追加、Node.jsメモリ制限で最適化。デモには十分な性能を確保
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
# 原因: t2.microメモリ不足
解決: スワップファイル作成、NODE_OPTIONS設定、不要プロセス停止

# 原因: ポート競合
解決: docker-compose down後に再起動

# 原因: バーストクレジット不足
解決: CPUクレジット確認、処理の軽量化
```

## 🏆 成功のポイント

### 1. 段階的な進行
- Phase毎に確実に完了させる
- 動作確認を怠らない
- ログを必ず確認する

### 2. 無料枠管理
- 使用量の定期確認（Billing Dashboard）
- 課金アラート設定
- 無料枠期限（12ヶ月）の把握

### 3. 学習記録
- 作業ログを残す
- トラブル対処法を記録
- 面接用説明を準備

このガイドに従って、**12ヶ月間完全無料でAWS実績**を作り上げ、転職活動で自信を持ってアピールしましょう！

## 💡 無料枠活用の最大メリット

- **完全無料**: 12ヶ月間$0でAWS経験獲得
- **常時稼働**: ポートフォリオとしていつでもアクセス可能  
- **実践経験**: 制限のある環境での最適化技術習得
- **転職価値**: 「コスト意識のあるエンジニア」としてアピール