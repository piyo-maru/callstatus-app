#!/bin/bash

echo "🚨 CallStatus App 完全クリーン再起動"
echo "======================================"

# 1. 全コンテナの完全停止
echo "1️⃣ 全コンテナの完全停止..."
docker-compose down --timeout 5
sleep 2

# 2. ポート使用状況確認と強制終了
echo "2️⃣ ポート競合解決..."
for port in 3000 3002 5432; do
    if lsof -ti:$port >/dev/null 2>&1; then
        echo "⚠️ ポート$portを使用中のプロセスを終了..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
    fi
done

# 3. Docker network cleanup
echo "3️⃣ Dockerネットワーク清理..."
docker network prune -f >/dev/null 2>&1 || true

# 4. コンテナ再起動
echo "4️⃣ コンテナ起動..."
docker-compose up -d

# 5. コンテナ起動待機
echo "5️⃣ コンテナ起動待機..."
sleep 10

# 6. Prismaクライアント再生成
echo "6️⃣ Prismaクライアント再生成..."
docker exec callstatus-app_backend_1 /bin/bash -c "cd /app && npx prisma generate" 2>/dev/null || {
    echo "⏳ コンテナ起動待機中..."
    sleep 5
    docker exec callstatus-app_backend_1 /bin/bash -c "cd /app && npx prisma generate"
}

# 7. バックエンド起動
echo "7️⃣ バックエンド起動..."
docker exec callstatus-app_backend_1 /bin/bash -c "cd /app && npm run start:dev > /tmp/backend.log 2>&1 &"

# 8. バックエンド起動確認
echo "8️⃣ バックエンド起動確認..."
for i in {1..20}; do
    if curl -s http://localhost:3002/api/staff >/dev/null 2>&1; then
        echo "✅ バックエンド起動完了"
        break
    fi
    echo "⏳ バックエンド待機中... ($i/20)"
    sleep 3
done

# 9. フロントエンド起動
echo "9️⃣ フロントエンド起動..."
docker exec callstatus-app_frontend_1 /bin/bash -c "cd /app && npm run dev > /tmp/frontend.log 2>&1 &"

# 10. フロントエンド起動確認
echo "🔟 フロントエンド起動確認..."
for i in {1..15}; do
    if curl -s -I http://localhost:3000 2>/dev/null | grep -q "200 OK\|Next.js"; then
        echo "✅ フロントエンド起動完了"
        break
    fi
    echo "⏳ フロントエンド待機中... ($i/15)"
    sleep 4
done

# 11. 最終確認
echo "1️⃣1️⃣ システム状態確認..."
echo "📊 コンテナ状態:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🔗 API確認:"
if curl -s http://localhost:3002/api/staff >/dev/null 2>&1; then
    echo "✅ バックエンドAPI: 正常"
else
    echo "❌ バックエンドAPI: エラー"
fi

if curl -s -I http://localhost:3000 2>/dev/null | grep -q "200 OK\|Next.js"; then
    echo "✅ フロントエンド: 正常"
else
    echo "❌ フロントエンド: エラー"
fi

echo ""
echo "🎉 クリーン再起動完了！"
echo "📱 アプリケーション: http://localhost:3000"
echo "🔧 API: http://localhost:3002/api/"