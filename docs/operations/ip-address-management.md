# IPアドレス統一管理ガイド

## 📋 概要

サーバーIPアドレス変更時の設定箇所を統一化し、1箇所の設定変更で全体に反映できるシステムです。

## 🎯 IPアドレス変更が必要な場面

- EC2インスタンスの再起動・変更
- 開発環境から本番環境への移行
- ネットワーク構成の変更
- ドメイン名からIPアドレスへの変更

## 🔧 統一設定システム

### 設定ファイル構成
```
/config.ini                      # メイン設定ファイル（統一管理）
/frontend/public/config.js       # フロントエンド設定
/backend/src/schedules/schedules.gateway.ts  # 動的設定読み込み
```

### 設定の優先順位
1. `/config.ini` - **メイン設定（最高優先）**
2. `frontend/public/config.js` - フロントエンド固有設定
3. コード内デフォルト値 - フォールバック

## 🚀 IPアドレス変更手順

### 方法1: 自動スクリプト使用（推奨）

```bash
# 新しいIPアドレスに統一変更
./scripts/setup/update-ip-address.sh 192.168.1.100

# 設定反映のためサービス再起動
docker-compose restart

# ブラウザキャッシュクリア後、アクセス確認
# http://192.168.1.100:3000
```

### 方法2: 手動変更

#### 1. メイン設定ファイル更新
`/config.ini`:
```ini
[server]
api_host = http://新しいIP:3002

[cors]
allowed_origins = http://新しいIP:3000
```

#### 2. フロントエンド設定更新
`/frontend/public/config.js`:
```javascript
window.APP_CONFIG = {
  API_HOST: 'http://新しいIP:3002',
};
```

#### 3. サービス再起動
```bash
docker-compose restart
```

## 📊 現在の設定箇所

### ✅ 統一設定済み
- **WebSocket CORS設定**: `/backend/src/schedules/schedules.gateway.ts`
  - `config.ini`から動的読み込みに変更済み
- **バックエンドCORS設定**: `/backend/src/main.ts`
  - `config.ini`から動的読み込み済み
- **フロントエンドAPI設定**: 複数のフォールバック機能付き

### 🎯 変更が必要な箇所（IPアドレス変更時）
1. `/config.ini` - Line 9, 22（API host, CORS origins）
2. `/frontend/public/config.js` - Line 6（API host）

### 📚 ドキュメント内記述（参考情報）
- `/README.md` - デモURL記載（必要に応じて更新）

## 🔍 設定確認コマンド

### 現在の設定確認
```bash
# メイン設定確認
grep -E "(api_host|allowed_origins)" /home/ubuntu/callstatus-app/config.ini

# フロントエンド設定確認
grep "API_HOST" /home/ubuntu/callstatus-app/frontend/public/config.js

# サービス状態確認
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### 接続テスト
```bash
# API接続テスト
curl http://新しいIP:3002/api/test

# フロントエンド接続テスト
curl http://新しいIP:3000
```

## 🚨 トラブルシューティング

### 設定が反映されない場合
1. **Docker再起動**: `docker-compose down && docker-compose up -d`
2. **ブラウザキャッシュクリア**: Ctrl+F5
3. **設定ファイル文法チェック**: 不正な文字・改行がないか確認

### CORS エラーが発生する場合
```bash
# バックエンドログ確認
docker logs callstatus-app-backend-1 | grep CORS

# 設定確認
docker exec callstatus-app-backend-1 cat /app/config.ini
```

### WebSocket接続エラーの場合
```bash
# WebSocket設定確認
docker logs callstatus-app-backend-1 | grep WebSocket

# ネットワーク確認
docker exec callstatus-app-frontend-1 curl http://新しいIP:3002/api/test
```

## 📈 改善履歴

- **2025-07-17**: WebSocket Gateway設定の動的読み込み化
- **2025-07-17**: 重複設定ファイル削除（`/backend/config.ini`）
- **2025-07-17**: 自動変更スクリプト作成
- **2025-07-17**: 統一設定システム構築完了

## 🔮 今後の改善予定

- 環境変数による設定オーバーライド機能
- 設定変更の自動検証機能
- ヘルスチェック連携機能
- 複数環境対応（開発・ステージング・本番）

---

**💡 重要**: IPアドレス変更後は必ずサービス再起動とブラウザキャッシュクリアを実行してください。