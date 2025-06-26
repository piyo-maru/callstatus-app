# トラブルシューティングガイド

## 🚀 開発コマンド・起動問題

### 最重要：必須開発コマンド
```bash
# 1. 全サービス起動（最初に必ず実行）
docker-compose up -d

# 2. Prismaクライアント生成（必須・忘れがち）
docker exec callstatus-app_backend_1 npx prisma generate

# 3. バックエンド開発サーバー起動
docker exec -it callstatus-app_backend_1 /bin/bash
cd /app && npm run start:dev

# 4. フロントエンド開発サーバー起動（別ターミナル）
docker exec -it callstatus-app_frontend_1 /bin/bash
cd /app && npm run dev
```

### プロセス競合防止（重要）

**複数のnpm run start:devコマンドを実行すると、ポート競合で起動に失敗する問題:**

**原因:**
- `nest start --watch`モードが複数起動
- 既存プロセスが適切に終了していない
- ゾンビプロセスが残存

**解決方法:**
1. **プロセス確認:** `docker exec [container] ps aux | grep node`
2. **全停止:** `docker exec [container] pkill -f "nest\|node"`
3. **管理スクリプト使用:** `/app/start-backend.sh`を使用
4. **最終手段:** `docker restart [container]`でクリーンリセット

**予防策:**
- 同じコマンドを連続実行しない
- 停止確認後に起動
- 必要に応じてプロセス管理スクリプトを使用

### 推奨起動方法（自動化スクリプト）
```bash
# 新規起動・完全リセット時
./startup.sh

# 通常の再起動時
./restart.sh

# 問題診断時
./diagnose.sh
```

### よくある問題の解決手順
```bash
1. Prismaエラー → docker exec callstatus-app_backend_1 npx prisma generate
2. プロセス残存 → docker restart callstatus-app_backend_1
3. メモリ不足 → free -h で確認、Docker再起動
4. ポート競合 → lsof -i :3000 -i :3002 で確認
```

## 🌐 CORS問題解決方法（重要）

### 問題
外部ホスト（例: 10.99.129.21:3000）からアクセスした際に、バックエンドAPI（10.99.129.21:3003）へのfetchが「Failed to fetch」エラーで失敗し、ガントチャートなどのデータが表示されない。

### 原因
Cross-Origin Resource Sharing (CORS) ポリシーによる制限。異なるポート間での通信がブロックされる。

### 解決策
Next.jsのrewritesプロキシ機能を使用して、フロントエンドとバックエンドを同一オリジンとして扱う。

#### 実装手順
1. **next.config.js にプロキシ設定追加**:
```javascript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://backend:3002/api/:path*', // Docker内部通信
    },
  ];
},
```

2. **フロントエンドのAPI呼び出しを相対パスに変更**:
```typescript
// FullMainApp.tsx
const getApiUrl = (): string => {
  // 相対パスを使用してCORSを回避
  return '';
};
```

3. **結果**:
- 全てのAPI呼び出しが `/api/*` の相対パスで行われる
- Next.jsが自動的にバックエンドにプロキシ
- CORS問題が完全に回避される

#### 注意事項
- Docker Compose環境では、`backend`はサービス名として内部DNSで解決される
- ポート3003の外部公開は不要になる（セキュリティ向上）
- config.iniのCORS設定は念のため残しておくが、プロキシ経由では不要

#### デバッグ方法
```bash
# 外部アクセス時のコンソールログ確認ポイント
- "API URL" ログが空文字列になっていることを確認
- fetchエラーが発生していないことを確認
- Network タブで /api/* リクエストが200 OKを返すことを確認
```

## 🔧 ポート設定・競合問題

### ポート番号変更時の必須確認事項（重要）

**ポート番号を変更する際は以下を必ず確認すること:**

1. **Docker Composeポートマッピング確認**
   - `docker-compose.yml`のポートマッピング（外部:内部）
   - 例: `"3002:3001"` = 外部3002 → 内部3001

2. **アプリケーション設定との整合性**
   - `backend/src/main.ts`のlistenポート
   - フロントエンドのAPI接続URL設定
   - CORS設定のallowed_origins

3. **競合チェック**
   - `netstat -tlnp | grep [ポート番号]`でポート使用状況確認
   - 既存プロセスとの競合回避

4. **設定変更後の確認手順**
   - コンテナ再起動: `docker-compose down && docker-compose up -d`
   - API接続テスト: `curl http://localhost:[外部ポート]/api/staff`
   - ブラウザアクセステスト

**注意:** コンテナ内部のポートとホスト側の公開ポートは異なることが多い。必ずdocker-compose.ymlで確認すること。

## 🗄️ データベース・Prisma問題

### Prismaクライアント生成忘れ
```bash
# 症状: Prismaクライアントが見つからないエラー
# 解決: クライアント生成を実行
docker exec callstatus-app_backend_1 npx prisma generate
```

### データベース接続問題
```bash
# 接続確認
docker exec callstatus-app_backend_1 npx prisma db push

# データベース状態確認
docker exec callstatus-app_backend_1 npx prisma studio
```

### マイグレーション問題
```bash
# マイグレーション実行
docker exec callstatus-app_backend_1 npx prisma migrate dev

# マイグレーション状態確認
docker exec callstatus-app_backend_1 npx prisma migrate status
```

## 🌍 環境設定・API設定

### 環境切り替え時の必須手順
**重要**: 環境切り替えは `config.ini` と `frontend/public/config.js` の両方を変更

1. `config.ini` でバックエンドCORS設定を変更
2. `frontend/public/config.js` でフロントエンドAPI接続先を変更  
3. バックエンドコンテナを再起動（設定反映のため）
4. ブラウザキャッシュクリア（Ctrl+F5）

### 設定ファイル例
```ini
# config.ini
[cors]
allowed_origins = http://localhost:3000,http://10.99.129.21:3000
```

```javascript
// frontend/public/config.js
window.APP_CONFIG = {
  API_HOST: 'http://localhost:3002'  // または適切なホスト
};
```

## 🗂️ ファイル管理問題

### 削除・移動してはいけないディレクトリ
- `frontend/.next/` - Next.jsビルド成果物（CSS、JS、マニフェストファイル）
- `backend/node_modules/` - バックエンド依存関係
- `frontend/node_modules/` - フロントエンド依存関係
- `backend/dist/` - バックエンドビルド成果物
- `backend/prisma/migrations/` - データベースマイグレーション履歴

### 自動生成ファイルを削除した場合の復旧手順

#### Next.jsビルド成果物削除時
```bash
# フロントエンドを再起動して再ビルド
docker restart callstatus-app_frontend_1
docker exec -d callstatus-app_frontend_1 bash -c "cd /app && rm -rf .next && npm run dev"
```

#### バックエンドビルド成果物削除時
```bash
# バックエンドを再起動して再ビルド
docker restart callstatus-app_backend_1
docker exec callstatus-app_backend_1 bash -c "cd /app && npm run build"
```

## 🔒 認証・権限問題

### 認証システムバイパス問題
**⚠️ 重要**: 認証システムは完全実装済み。認証機能を無効化・バイパスしてはならない

### テストアカウントログイン問題
```bash
# 管理者権限でのアクセス確認
# AuthProviderの設定確認
# トークン有効性確認
```

## 🎨 フロントエンド UI問題

### レイアウト崩れ
- Tailwind CSSの競合確認
- コンポーネントのz-index問題
- レスポンシブデザインの確認

### データ表示問題
- API接続確認
- データ変換処理の確認
- エラーハンドリングの確認

## 📱 レスポンシブ・パフォーマンス問題

### パフォーマンス最適化
```bash
# メモリ使用量確認
free -h

# Docker リソース使用量確認
docker stats

# ネットワーク接続確認
netstat -tulpn
```

### ブラウザキャッシュ問題
```bash
# 強制リロード
Ctrl + F5

# 開発者ツールでキャッシュ無効化
# Application タブ → Storage → Clear storage
```

---

**関連ドキュメント**: [CLAUDE.md](../../CLAUDE.md)  
**作成日**: 2025-06-26  
**最終更新**: 2025-06-26