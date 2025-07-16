#!/bin/bash
# CallStatus App EC2 Auto Deploy Script

set -e  # エラー時に即座に停止

echo "🚀 CallStatus App EC2 Deployment Starting..."

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

# 9. API疎通確認
echo "🌐 Testing API connectivity..."
sleep 5
curl -f http://localhost:3002/api/test || echo "⚠️ API check failed - may need manual verification"

echo "✅ Deployment completed!"
echo "🌍 Access your demo site at: http://YOUR-EC2-IP:3000"
echo "🔧 API endpoint: http://YOUR-EC2-IP:3002"

# 10. ログ表示オプション
echo ""
echo "💡 To view logs, run:"
echo "   docker-compose logs -f"
echo ""
echo "💡 To stop the application:"
echo "   docker-compose down"