# 認証システム連携ガイド

出社状況管理ボード（CallStatus App）の認証システムを他のWebアプリケーションと連携させるための技術仕様書です。

## 概要

本システムはJWT（JSON Web Token）ベースの認証システムを採用しており、統一認証基盤として他のWebアプリケーションとの連携が可能です。

## 認証フロー概要

```
1. ユーザー → Webアプリ → CallStatus認証API
2. CallStatus → JWTトークン発行 → Webアプリ
3. Webアプリ → JWTトークンでAPI認証 → CallStatus
4. CallStatus → ユーザー情報・権限情報返却 → Webアプリ
```

## API エンドポイント

### 基本URL
- **開発環境**: `http://localhost:3002`（動的ポート検出対応）
- **本番環境**: `https://your-domain.com`

### 認証関連API

#### 1. ログイン認証
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**レスポンス（成功）:**
```json
{
  "success": true,
  "user": {
    "id": "cuid_12345",
    "email": "user@example.com",
    "name": "田中太郎",
    "userType": "STAFF", // ADMIN | STAFF
    "staffId": 1,
    "isActive": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "abc123def456...",
  "expiresAt": "2025-06-23T12:00:00.000Z"
}
```

**レスポンス（失敗）:**
```json
{
  "success": false,
  "error": "INVALID_CREDENTIALS",
  "message": "メールアドレスまたはパスワードが正しくありません",
  "remainingAttempts": 4,
  "lockedUntil": null
}
```

#### 2. トークン検証
```http
GET /api/auth/verify
Authorization: Bearer <JWT_TOKEN>
```

**レスポンス:**
```json
{
  "valid": true,
  "user": {
    "id": "cuid_12345",
    "email": "user@example.com",
    "userType": "STAFF",
    "staffId": 1,
    "isActive": true
  },
  "expiresAt": "2025-06-23T12:00:00.000Z"
}
```

#### 3. トークンリフレッシュ
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "abc123def456..."
}
```

#### 4. ログアウト
```http
POST /api/auth/logout
Authorization: Bearer <JWT_TOKEN>
```

## JWTトークン仕様

### トークン構造
```json
{
  "sub": "cuid_12345",
  "type": "access",
  "iat": 1719144000,
  "exp": 1719230400
}
```

### 検証に必要な情報
- **アルゴリズム**: HS256
- **秘密鍵**: 環境変数 `JWT_SECRET`
- **有効期限**: 24時間（アクセストークン）
- **リフレッシュトークン有効期限**: 7日間

## ユーザー権限レベル

### UserType（ユーザータイプ）
- **ADMIN**: 管理者権限（全機能利用可能）
- **STAFF**: 一般ユーザー権限（自分の予定のみ操作可能）

### 権限チェック例
```javascript
// 管理者のみアクセス可能
if (user.userType !== 'ADMIN') {
  throw new ForbiddenException('管理者権限が必要です');
}

// 自分のデータのみアクセス可能
if (user.userType === 'STAFF' && staffId !== user.staffId) {
  throw new ForbiddenException('自分のデータのみアクセス可能です');
}
```

## データベーススキーマ

### UserAuth テーブル
```sql
CREATE TABLE user_auth (
  id VARCHAR PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password VARCHAR,
  user_type VARCHAR NOT NULL, -- 'ADMIN' | 'STAFF'
  is_active BOOLEAN DEFAULT true,
  staff_id INTEGER UNIQUE,
  login_attempts INTEGER DEFAULT 0,
  locked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### Staff テーブル（ユーザー情報）
```sql
CREATE TABLE staff (
  id SERIAL PRIMARY KEY,
  emp_no VARCHAR UNIQUE,
  name VARCHAR NOT NULL,
  department VARCHAR NOT NULL,
  "group" VARCHAR NOT NULL,
  is_active BOOLEAN DEFAULT true
);
```

## セキュリティ機能

### 1. レート制限
- **ログイン試行制限**: 5回失敗で15分間ロック
- **IP制限**: 1時間で10回まで（IP単位）
- **段階的遅延**: 試行回数に応じて遅延時間増加

### 2. セッション管理
- **並行セッション制限**: 1ユーザー最大5セッション
- **自動クリーンアップ**: 期限切れセッション自動削除
- **セッション無効化**: ログアウト時・全セッション削除機能

### 3. 監査ログ
全ての認証操作・API操作が記録されます：
```json
{
  "userId": "cuid_12345",
  "action": "LOGIN",
  "resource": "auth",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "success": true,
  "timestamp": "2025-06-22T10:30:00.000Z"
}
```

### 4. セキュリティヘッダー
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; ...
```

## 連携実装例

### Node.js / Express連携
```javascript
const jwt = require('jsonwebtoken');
const axios = require('axios');

// 認証ミドルウェア
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'トークンが必要です' });
  }

  try {
    // CallStatus API でトークン検証
    const response = await axios.get('http://localhost:3002/api/auth/verify', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.data.valid) {
      req.user = response.data.user;
      next();
    } else {
      res.status(401).json({ error: '無効なトークンです' });
    }
  } catch (error) {
    res.status(401).json({ error: 'トークン検証に失敗しました' });
  }
};

// 使用例
app.get('/protected', authenticateToken, (req, res) => {
  res.json({ 
    message: '認証成功',
    user: req.user 
  });
});
```

### React / Next.js連携
```javascript
// auth-context.js
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  const login = async (email, password) => {
    try {
      const response = await fetch('http://localhost:3002/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      
      if (data.success) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        return { success: true };
      } else {
        return { success: false, error: data.message };
      }
    } catch (error) {
      return { success: false, error: '通信エラーが発生しました' };
    }
  };

  const logout = async () => {
    try {
      await fetch('http://localhost:3002/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }

    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

## CORS設定

認証APIを他のドメインから利用する場合のCORS設定：

```javascript
// Express.js設定例
app.use(cors({
  origin: [
    'http://localhost:3000',     // フロントエンド開発
    'http://localhost:3001',     // 別アプリ開発
    'https://your-app.com',      // 本番アプリ
    'https://admin.your-app.com' // 管理画面
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## エラーハンドリング

### 共通エラーコード
- **INVALID_CREDENTIALS**: ログイン情報が不正
- **ACCOUNT_LOCKED**: アカウントがロック中
- **TOKEN_EXPIRED**: トークンの有効期限切れ
- **INSUFFICIENT_PERMISSIONS**: 権限不足
- **RATE_LIMIT_EXCEEDED**: レート制限に達した

### エラーレスポンス例
```json
{
  "success": false,
  "error": "ACCOUNT_LOCKED",
  "message": "アカウントがロックされています",
  "details": {
    "lockedUntil": "2025-06-22T11:00:00.000Z",
    "reason": "ログイン試行回数超過"
  }
}
```

## 連携時の注意事項

### 1. セキュリティ
- JWTトークンは必ずHTTPS経由で送信
- リフレッシュトークンは安全な場所（httpOnlyクッキー等）に保存
- CSRF攻撃対策を実装
- XSS攻撃対策を実装

### 2. パフォーマンス
- トークン検証はキャッシュを活用
- 不要なAPI呼び出しを避ける
- 適切なタイムアウト設定

### 3. 運用
- 監査ログの定期的な確認
- ロックされたアカウントの管理
- セッション数の監視

## トラブルシューティング

### よくある問題

1. **CORS エラー**
   - Origin設定を確認
   - preflight requestの対応確認

2. **トークン検証失敗**
   - JWT秘密鍵の一致確認
   - トークンの有効期限確認

3. **認証ループ**
   - リフレッシュトークンの実装確認
   - 自動ログアウト機能の確認

### デバッグ用ツール

```bash
# トークン内容確認
echo "YOUR_JWT_TOKEN" | cut -d'.' -f2 | base64 -d | jq

# API接続テスト
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# トークン検証テスト
curl -X GET http://localhost:3002/api/auth/verify \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 連絡先・サポート

実装に関する質問や問題が発生した場合は、開発チームまでご連絡ください。

---

**最終更新**: 2025-06-22  
**バージョン**: 1.0.0  
**対象システム**: 出社状況管理ボード認証システム