#!/bin/bash

echo "🔄 CallStatus App 再起動スクリプト"
echo "=================================="

# 1. プロセスの停止
echo "1️⃣ 既存プロセスの停止..."
docker exec callstatus-app_backend_1 pkill -f "nest\|node" 2>/dev/null || true
docker exec callstatus-app_frontend_1 pkill -f "next\|node" 2>/dev/null || true
sleep 3

# 2. Prismaクライアント再生成（必要時のみ）
echo "2️⃣ Prismaクライアント確認..."
if ! docker exec callstatus-app_backend_1 /bin/bash -c "cd /app && node -e 'require(\"@prisma/client\")'" 2>/dev/null; then
    echo "⚡ Prismaクライアントを再生成..."
    docker exec callstatus-app_backend_1 /bin/bash -c "cd /app && npx prisma generate"
fi

# 3. バックエンド起動
echo "3️⃣ バックエンド起動..."
docker exec callstatus-app_backend_1 /bin/bash -c "cd /app && npm run start:dev > /tmp/backend.log 2>&1 &"

# 4. バックエンド待機
echo "4️⃣ バックエンド起動待機..."
for i in {1..15}; do
    if curl -s http://localhost:3002/api/staff >/dev/null 2>&1; then
        echo "✅ バックエンド起動完了"
        break
    fi
    echo "⏳ 待機中... ($i/15)"
    sleep 2
done

# 5. フロントエンド起動
echo "5️⃣ フロントエンド起動..."
docker exec callstatus-app_frontend_1 /bin/bash -c "cd /app && npm run dev > /tmp/frontend.log 2>&1 &"

# 6. フロントエンド待機
echo "6️⃣ フロントエンド起動待機..."
for i in {1..10}; do
    if curl -s -I http://localhost:3000 | grep -q "200 OK"; then
        echo "✅ フロントエンド起動完了"
        break
    fi
    echo "⏳ 待機中... ($i/10)"
    sleep 3
done

echo ""
echo "🎉 再起動完了！"
echo "📱 http://localhost:3000"