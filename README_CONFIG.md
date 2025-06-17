# CallStatus App - 設定切り替えガイド

## 概要
このアプリケーションは、開発環境（localhost）と社内テスト環境（IPアドレス）を簡単に切り替えて使用できるように設定されています。

## 設定ファイル

### 1. ルートディレクトリの config.ini
メインの設定ファイルです。バックエンドのCORS設定を制御します。

```ini
[server]
# 使用したい環境をコメントアウト/アンコメントしてください

# 開発環境用（localhost）
# api_host = http://localhost:3002

# 社内テスト環境用
api_host = http://10.99.129.21:3002

[cors]
# CORS許可オリジン（バックエンド用）

# 開発環境用
# allowed_origins = http://localhost:3000

# 社内テスト環境用  
allowed_origins = http://10.99.129.21:3000
```

### 2. frontend/public/config.js
フロントエンドのAPI接続先を制御します。

```javascript
window.APP_CONFIG = {
  // 開発環境用（localhost）
  // API_HOST: 'http://localhost:3002',
  
  // 社内テスト環境用
  API_HOST: 'http://10.99.129.21:3002',
};
```

## 環境の切り替え方法

### 開発環境（localhost）に切り替える場合：

1. **config.ini を編集**:
   ```ini
   [server]
   api_host = http://localhost:3002
   
   [cors]
   allowed_origins = http://localhost:3000
   ```

2. **frontend/public/config.js を編集**:
   ```javascript
   window.APP_CONFIG = {
     API_HOST: 'http://localhost:3002',
   };
   ```

3. **バックエンドを再起動** (設定変更を反映するため)

### 社内テスト環境（10.99.129.21）に切り替える場合：

1. **config.ini を編集**:
   ```ini
   [server]
   api_host = http://10.99.129.21:3002
   
   [cors]
   allowed_origins = http://10.99.129.21:3000
   ```

2. **frontend/public/config.js を編集**:
   ```javascript
   window.APP_CONFIG = {
     API_HOST: 'http://10.99.129.21:3002',
   };
   ```

3. **バックエンドを再起動** (設定変更を反映するため)

## 注意事項

- バックエンドの設定変更後は必ず再起動してください
- フロントエンドの設定変更後はブラウザのキャッシュをクリアするか、強制リロード（Ctrl+F5）してください
- IPアドレスが変更された場合は、上記の設定ファイルで新しいIPアドレスに更新してください

## トラブルシューティング

### 接続エラーが発生した場合：
1. 設定ファイルのIPアドレスが正しいか確認
2. バックエンドが起動しているか確認
3. ファイアウォール設定を確認
4. ブラウザのデベロッパーツールでネットワークエラーを確認

### CORS エラーが発生した場合：
1. config.ini の CORS設定が正しいか確認
2. バックエンドを再起動
3. ブラウザのキャッシュをクリア