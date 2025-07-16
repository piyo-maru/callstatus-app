#!/bin/bash
# CallStatus App EC2 Auto Deploy Script

set -e  # エラー時に即座に停止

echo "🚀 CallStatus App EC2 Deployment Starting..."

# 0. t2.micro用メモリ最適化設定
echo "⚙️ Setting up t2.micro memory optimization..."
export NODE_OPTIONS="--max-old-space-size=512"

# スワップファイル確認・作成
if [ ! -f /swapfile ]; then
    echo "📊 Creating swap file for t2.micro..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
else
    echo "✅ Swap file already exists"
fi

# 1. 最新コードを取得
echo "📥 Pulling latest code from GitHub..."
git pull origin demo

# 2. 古いコンテナを停止・削除
echo "🛑 Stopping existing containers..."
docker-compose down

# 3. 新しいコンテナをビルド・起動
echo "🔨 Building and starting containers..."
docker-compose up -d --build

# 4. コンテナ起動待機
echo "⏳ Waiting for containers to start..."
sleep 10

# 5. Prismaクライアント生成
echo "🔧 Generating Prisma client..."
docker exec callstatus-app-backend-1 npx prisma generate

# 6. データベースマイグレーション実行
echo "🗄️ Running database migrations..."
docker exec callstatus-app-backend-1 npx prisma migrate deploy

# 7. ポートフォリオデモデータ投入（初回のみ）
echo "📊 Setting up demo data..."
docker exec callstatus-app-backend-1 bash -c "cd /app && node prisma/seed_portfolio.js" || echo "⚠️ Demo data already exists"

# 8. サービス状態確認
echo "🔍 Checking service status..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 9. メモリ使用状況確認
echo "📊 Checking memory usage..."
free -h
echo ""

# 10. API疎通確認
echo "🌐 Testing API connectivity..."
sleep 5
curl -f http://localhost:3002/api/test || echo "⚠️ API check failed - may need manual verification"

echo "✅ Deployment completed!"
echo "🌍 Access your demo site at: http://YOUR-EC2-IP:3000"
echo "🔧 API endpoint: http://YOUR-EC2-IP:3002"

# 11. t2.micro運用アドバイス
echo ""
echo "💡 t2.micro運用のコツ:"
echo "   - メモリ使用量: $(free -m | awk 'NR==2{printf \"%.1f%%\", $3*100/$2 }')"
echo "   - スワップ使用量: $(free -m | awk 'NR==3{printf \"%.1f%%\", $3*100/$2 }')"
echo "   - CPU Credits確認: aws ec2 describe-instance-credit-specifications"
echo ""
echo "💡 ログ表示:"
echo "   docker-compose logs -f"
echo ""
echo "💡 アプリ停止:"
echo "   docker-compose down"
echo ""
echo "💡 無料枠確認:"
echo "   AWSコンソール → Billing Dashboard → 無料枠使用量"