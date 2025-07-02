# 🚀 デプロイメント・セットアップガイド

## 📋 目次
- [前提条件](#前提条件)
- [ローカル開発環境](#ローカル開発環境)
- [本番環境デプロイ](#本番環境デプロイ)
- [環境設定](#環境設定)
- [トラブルシューティング](#トラブルシューティング)

---

## 前提条件

### 🛠 必要なソフトウェア
- **Node.js**: 18.0.0以上
- **Docker**: 20.10.0以上
- **Docker Compose**: 2.0.0以上
- **Git**: 2.30.0以上

### 💻 推奨スペック
#### 開発環境
- **CPU**: 4コア以上
- **メモリ**: 8GB以上
- **ディスク**: 50GB以上の空き容量

#### 本番環境
- **CPU**: 8コア以上
- **メモリ**: 16GB以上
- **ディスク**: 100GB以上（データベース用SSD推奨）

---

## ローカル開発環境

### 🔧 1. プロジェクトセットアップ

```bash
# リポジトリクローン
git clone https://github.com/your-username/callstatus-app.git
cd callstatus-app

# 設定ファイル作成
cp config.ini.sample config.ini
cp frontend/public/config.js.sample frontend/public/config.js
```

### 🐳 2. Docker環境構築

```bash
# 全サービス起動
docker-compose up -d

# 起動確認
docker-compose ps
```

### 📊 3. データベース初期化

```bash
# Prismaクライアント生成（必須）
docker exec callstatus-app_backend_1 npx prisma generate

# マイグレーション実行
docker exec callstatus-app_backend_1 npx prisma migrate dev

# シードデータ投入（オプション）
docker exec callstatus-app_backend_1 npm run db:seed
```

### 🚀 4. アプリケーション起動

```bash
# バックエンド開発サーバー起動
docker exec -it callstatus-app_backend_1 bash -c \"cd /app && npm run start:dev\"

# フロントエンド開発サーバー起動（新しいターミナル）
docker exec -it callstatus-app_frontend_1 bash -c \"cd /app && npm run dev\"
```

### ✅ 5. 動作確認

| サービス | URL | 説明 |
|---------|-----|------|
| フロントエンド | http://localhost:3000 | メインアプリケーション |
| バックエンドAPI | http://localhost:3002 | REST API |
| API テスト | http://localhost:3002/api/test | ヘルスチェック |
| PostgreSQL | localhost:5432 | データベース直接接続 |

---

## 本番環境デプロイ

### ☁️ 1. クラウドプラットフォーム選択

#### **推奨構成**

##### 🔵 **Vercel + PlanetScale（推奨）**
```bash
# フロントエンド（Vercel）
npm run build
vercel deploy --prod

# データベース（PlanetScale）
pscale database create callstatus-prod
pscale deploy-request create callstatus-prod main
```

##### 🔶 **AWS ECS + RDS**
```bash
# Docker イメージビルド
docker build -t callstatus-frontend ./frontend
docker build -t callstatus-backend ./backend

# ECR プッシュ
aws ecr get-login-password | docker login --username AWS --password-stdin
docker tag callstatus-frontend:latest 123456789.dkr.ecr.region.amazonaws.com/callstatus-frontend:latest
docker push 123456789.dkr.ecr.region.amazonaws.com/callstatus-frontend:latest
```

##### 🟢 **Digital Ocean App Platform**
```yaml
# .do/app.yaml
name: callstatus-app
services:
- name: frontend
  source_dir: /frontend
  github:
    repo: your-username/callstatus-app
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: professional-xs
```

### 🗂 2. 環境変数設定

#### **Frontend (.env.local)**
```bash
NEXT_PUBLIC_API_URL=https://your-api-domain.com
NEXT_PUBLIC_WS_URL=wss://your-websocket-domain.com
NEXT_PUBLIC_APP_ENV=production
```

#### **Backend (.env)**
```bash
# データベース
DATABASE_URL=\"postgresql://user:pass@host:5432/callstatus\"

# JWT認証
JWT_SECRET=\"your-super-secure-jwt-secret\"
JWT_EXPIRES_IN=\"24h\"

# CORS設定
ALLOWED_ORIGINS=\"https://your-frontend-domain.com\"

# メール設定（オプション）
MAIL_HOST=\"smtp.gmail.com\"
MAIL_PORT=587
MAIL_USER=\"your-email@gmail.com\"
MAIL_PASS=\"your-app-password\"
```

### 🔧 3. プロダクションビルド

#### **最適化設定**

**Frontend（next.config.js）**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  compress: true,
  poweredByHeader: false,
  
  // パフォーマンス最適化
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@mui/material']
  },
  
  // セキュリティヘッダー
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          }
        ]
      }
    ];
  }
};
```

**Backend（Dockerfile最適化）**
```dockerfile
# Multi-stage build
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
USER nestjs
EXPOSE 3002
CMD [\"node\", \"dist/main\"]
```

---

## 環境設定

### 🔐 セキュリティ設定

#### **SSL/TLS証明書**
```bash
# Let's Encrypt（推奨）
sudo certbot --nginx -d your-domain.com

# CloudFlare（簡単）
# CloudFlareダッシュボードでDNS設定
```

#### **ファイアウォール設定**
```bash
# UFW設定例
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

### 📊 監視・ログ設定

#### **アプリケーション監視**
```javascript
// Sentryエラートラッキング
import * as Sentry from \"@sentry/nextjs\";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

#### **ログ管理**
```bash
# PM2でプロセス管理
npm install -g pm2
pm2 start dist/main.js --name \"callstatus-backend\"
pm2 startup
pm2 save
```

### 🔄 自動デプロイ（GitHub Actions）

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run test:e2e

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        uses: railway-app/railway-deploy@v1
        with:
          token: ${{ secrets.RAILWAY_TOKEN }}
          service: backend
```

---

## トラブルシューティング

### 🐛 よくある問題と解決法

#### **1. コンテナが起動しない**
```bash
# ログ確認
docker-compose logs frontend
docker-compose logs backend
docker-compose logs database

# リセット
docker-compose down -v
docker-compose up -d
```

#### **2. データベース接続エラー**
```bash
# 接続確認
docker exec callstatus-app_database_1 psql -U postgres -c \"\\l\"

# マイグレーション確認
docker exec callstatus-app_backend_1 npx prisma migrate status
```

#### **3. WebSocket接続失敗**
```javascript
// CORS設定確認
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
};
```

#### **4. メモリ不足エラー**
```bash
# Docker リソース制限解除
# Docker Desktop → Settings → Resources → Advanced
# Memory: 8GB以上に設定

# Node.js メモリ制限解除
NODE_OPTIONS=\"--max-old-space-size=4096\" npm run build
```

### 📞 サポート・問い合わせ

| 問題カテゴリ | 連絡方法 |
|-------------|---------|
| 技術的な質問 | GitHub Issues |
| バグレポート | GitHub Issues（テンプレート使用） |
| 機能リクエスト | GitHub Discussions |
| セキュリティ問題 | security@your-email.com |

### 📚 参考リソース

- [Next.js デプロイガイド](https://nextjs.org/docs/deployment)
- [NestJS プロダクション](https://docs.nestjs.com/faq/deployment)
- [PostgreSQL チューニング](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Docker プロダクション](https://docs.docker.com/config/containers/resource_constraints/)

---

*💡 **Tip**: 本番環境では必ずHTTPS化し、定期的なバックアップを実施してください。*