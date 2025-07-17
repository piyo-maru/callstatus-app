#!/bin/bash

# IPアドレス統一変更スクリプト
# 使用方法: ./update-ip-address.sh <新しいIPアドレス>

set -e

if [ -z "$1" ]; then
    echo "❌ IPアドレスが指定されていません"
    echo "使用方法: $0 <新しいIPアドレス>"
    echo "例: $0 192.168.1.100"
    exit 1
fi

NEW_IP="$1"
CONFIG_FILE="/home/ubuntu/callstatus-app/config.ini"
FRONTEND_CONFIG="/home/ubuntu/callstatus-app/frontend/public/config.js"

echo "🔄 IPアドレスを $NEW_IP に統一変更します..."

# 1. メイン設定ファイルの更新
echo "📝 config.ini を更新中..."
sed -i "s|api_host = http://[0-9.]*:3002|api_host = http://$NEW_IP:3002|g" "$CONFIG_FILE"
sed -i "s|allowed_origins = http://[0-9.]*:3000|allowed_origins = http://$NEW_IP:3000|g" "$CONFIG_FILE"

# 2. フロントエンド設定の更新
echo "📝 frontend/public/config.js を更新中..."
sed -i "s|API_HOST: 'http://[0-9.]*:3002'|API_HOST: 'http://$NEW_IP:3002'|g" "$FRONTEND_CONFIG"

# 3. 設定確認
echo "✅ 設定変更完了。現在の設定:"
echo ""
echo "📄 config.ini:"
grep -E "(api_host|allowed_origins)" "$CONFIG_FILE"
echo ""
echo "📄 frontend/public/config.js:"
grep "API_HOST" "$FRONTEND_CONFIG"
echo ""

echo "🚀 次の手順:"
echo "1. docker-compose restart でサービスを再起動"
echo "2. ブラウザのキャッシュをクリア (Ctrl+F5)"
echo "3. http://$NEW_IP:3000 でアクセス確認"