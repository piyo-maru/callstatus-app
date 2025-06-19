#!/bin/bash

echo "🚀 CallStatus App 起動スクリプト"
echo "=================================="

# 1. 既存コンテナの停止・削除
echo "1️⃣ 既存環境のクリーンアップ..."
docker-compose down
docker system prune -f --volumes

# 2. コンテナの起動（データベース優先）
echo "2️⃣ データベースを起動..."
docker-compose up -d db
sleep 10

echo "3️⃣ バックエンドを起動..."
docker-compose up -d backend
sleep 15

echo "4️⃣ フロントエンドを起動..."
docker-compose up -d frontend
sleep 10

# 5. Prismaの初期化
echo "5️⃣ Prismaクライアントの生成..."
docker exec callstatus-app_backend_1 /bin/bash -c "cd /app && npx prisma generate"

# 6. バックエンドのビルドと起動
echo "6️⃣ バックエンドのビルドと起動..."
docker exec callstatus-app_backend_1 /bin/bash -c "cd /app && npm run build"
docker exec callstatus-app_backend_1 /bin/bash -c "cd /app && npm run start:dev > /tmp/backend.log 2>&1 &"

# 7. バックエンドの起動待機
echo "7️⃣ バックエンドの起動を待機..."
for i in {1..30}; do
    if curl -s http://localhost:3002/api/staff >/dev/null 2>&1; then
        echo "✅ バックエンドが起動しました"
        break
    fi
    echo "⏳ バックエンド起動待機中... ($i/30)"
    sleep 2
done

# 8. フロントエンドの起動
echo "8️⃣ フロントエンドの起動..."
docker exec callstatus-app_frontend_1 /bin/bash -c "cd /app && npm run dev > /tmp/frontend.log 2>&1 &"

# 9. フロントエンドの起動待機
echo "9️⃣ フロントエンドの起動を待機..."
for i in {1..20}; do
    if curl -s -I http://localhost:3000 | grep -q "200 OK"; then
        echo "✅ フロントエンドが起動しました"
        break
    fi
    echo "⏳ フロントエンド起動待機中... ($i/20)"
    sleep 3
done

# 10. 最終確認
echo "🔍 最終確認..."
echo "バックエンド状態:"
curl -s http://localhost:3002/api/staff | head -1
echo ""
echo "フロントエンド状態:"
curl -s -I http://localhost:3000 | head -1

echo ""
echo "🎉 起動完了！"
echo "📱 フロントエンド: http://localhost:3000"
echo "🔧 バックエンドAPI: http://localhost:3002"
echo ""
echo "📋 ログ確認コマンド:"
echo "  バックエンド: docker exec callstatus-app_backend_1 tail -f /tmp/backend.log"
echo "  フロントエンド: docker exec callstatus-app_frontend_1 tail -f /tmp/frontend.log"