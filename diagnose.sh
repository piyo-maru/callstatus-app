#!/bin/bash

echo "🔍 CallStatus App 診断スクリプト"
echo "================================="

# 1. コンテナ状態
echo "📦 コンテナ状態:"
docker ps --filter name=callstatus

echo ""
echo "💾 システムリソース:"
free -h | head -2
df -h / | tail -1

echo ""
echo "🔗 ネットワーク接続:"
echo "バックエンド (3002):"
curl -s -I http://localhost:3002/api/staff --connect-timeout 3 | head -1 || echo "❌ 接続失敗"

echo "フロントエンド (3000):"
curl -s -I http://localhost:3000 --connect-timeout 3 | head -1 || echo "❌ 接続失敗"

echo ""
echo "⚙️ バックエンドプロセス:"
docker exec callstatus-app_backend_1 ps aux | grep -E "(node|nest|npm)" | head -5

echo ""
echo "⚙️ フロントエンドプロセス:"
docker exec callstatus-app_frontend_1 ps aux | grep -E "(node|next|npm)" | head -5

echo ""
echo "📋 最新ログ:"
echo "--- バックエンド ---"
docker exec callstatus-app_backend_1 tail -5 /tmp/backend.log 2>/dev/null || echo "ログファイルなし"

echo "--- フロントエンド ---"
docker exec callstatus-app_frontend_1 tail -5 /tmp/frontend.log 2>/dev/null || echo "ログファイルなし"

echo ""
echo "🔧 推奨アクション:"
if ! curl -s http://localhost:3002/api/staff >/dev/null 2>&1; then
    echo "❌ バックエンド未起動 → ./restart.sh を実行"
elif ! curl -s -I http://localhost:3000 | grep -q "200 OK"; then
    echo "❌ フロントエンド未起動 → フロントエンドを再起動"
else
    echo "✅ 全サービス正常動作中"
fi