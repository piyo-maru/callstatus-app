# 📡 API Reference

## 📋 目次
- [概要](#概要)
- [認証](#認証)
- [エラーハンドリング](#エラーハンドリング)
- [スケジュール管理API](#スケジュール管理api)
- [Pending・承認API](#pending承認api)
- [スタッフ管理API](#スタッフ管理api)
- [設定管理API](#設定管理api)
- [WebSocketイベント](#websocketイベント)

---

## 概要

CallStatus APIは**RESTful設計**に基づき、JSON形式でのデータ交換を行います。

### ベースURL
```
Development: http://localhost:3002/api
Production:  https://your-api-domain.com/api
```

### 共通ヘッダー
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

---

## 認証

### 🔐 JWT認証フロー

#### **1. ログイン**
```http
POST /auth/signin
```

**Request Body:**
```json
{
  \"email\": \"user@example.com\",
  \"password\": \"password123\"
}
```

**Response:**
```json
{
  \"accessToken\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\",
  \"refreshToken\": \"def50200...\",
  \"user\": {
    \"id\": 1,
    \"email\": \"user@example.com\",
    \"name\": \"山田太郎\",
    \"role\": \"user\"
  },
  \"expiresIn\": 86400
}
```

#### **2. トークン更新**
```http
POST /auth/refresh
```

**Request Body:**
```json
{
  \"refreshToken\": \"def50200...\"
}
```

#### **3. ログアウト**
```http
DELETE /auth/signout
Authorization: Bearer <JWT_TOKEN>
```

---

## エラーハンドリング

### 📋 標準エラーレスポンス

```json
{
  \"success\": false,
  \"error\": {
    \"code\": \"VALIDATION_ERROR\",
    \"message\": \"入力データに誤りがあります\",
    \"details\": [
      {
        \"field\": \"email\",
        \"message\": \"有効なメールアドレスを入力してください\"
      }
    ]
  },
  \"timestamp\": \"2025-01-01T12:00:00.000Z\"
}
```

### 🚨 HTTPステータスコード

| Code | 説明 | 使用場面 |
|------|------|----------|
| 200 | OK | 成功 |
| 201 | Created | 新規作成成功 |
| 400 | Bad Request | バリデーションエラー |
| 401 | Unauthorized | 認証エラー |
| 403 | Forbidden | 権限エラー |
| 404 | Not Found | リソース未発見 |
| 409 | Conflict | データ競合 |
| 500 | Internal Server Error | サーバーエラー |

---

## スケジュール管理API

### 📅 統合スケジュール取得

```http
GET /schedules/unified
```

**Query Parameters:**
```
date     : string   # YYYY-MM-DD形式（必須）
staffId? : number   # 特定スタッフのみ取得
dept?    : string   # 部署フィルター
```

**Response:**
```json
{
  \"success\": true,
  \"data\": [
    {
      \"id\": 1,
      \"staffId\": 10,
      \"staffName\": \"山田太郎\",
      \"department\": \"開発部\",
      \"group\": \"フロントエンド\",
      \"date\": \"2025-01-15\",
      \"schedules\": [
        {
          \"id\": 100,
          \"status\": \"online\",
          \"start\": 9.0,      # 9:00を小数点表現
          \"end\": 12.0,       # 12:00
          \"memo\": \"午前出社\",
          \"layer\": \"adjustment\"
        },
        {
          \"id\": 101,
          \"status\": \"remote\",
          \"start\": 13.0,     # 13:00
          \"end\": 18.0,       # 18:00
          \"memo\": \"午後リモート\",
          \"layer\": \"adjustment\"
        }
      ]
    }
  ]
}
```

### 📝 新規スケジュール作成

```http
POST /schedules
```

**Request Body:**
```json
{
  \"staffId\": 10,
  \"date\": \"2025-01-15\",
  \"status\": \"online\",
  \"start\": 9.0,
  \"end\": 18.0,
  \"memo\": \"通常勤務\"
}
```

### ✏️ スケジュール更新

```http
PUT /schedules/:id
```

**Request Body:**
```json
{
  \"status\": \"remote\",
  \"start\": 9.5,      # 9:30に変更
  \"end\": 17.5,       # 17:30に変更
  \"memo\": \"在宅勤務に変更\"
}
```

### 🗑 スケジュール削除

```http
DELETE /schedules/:id
```

---

## Pending・承認API

### 📋 承認待ち一覧取得

```http
GET /pending
```

**Query Parameters:**
```
status?     : \"pending\" | \"approved\" | \"rejected\"
date?       : string    # YYYY-MM-DD
department? : string
staffId?    : number
```

**Response:**
```json
{
  \"success\": true,
  \"data\": [
    {
      \"id\": 200,
      \"staffId\": 10,
      \"staffName\": \"山田太郎\",
      \"date\": \"2025-01-15\",
      \"status\": \"remote\",
      \"start\": 9.0,
      \"end\": 18.0,
      \"memo\": \"在宅勤務申請\",
      \"pendingType\": \"monthly-planner\",
      \"approvedBy\": null,
      \"approvedAt\": null,
      \"createdAt\": \"2025-01-01T12:00:00.000Z\"
    }
  ]
}
```

### ✅ 承認

```http
PUT /pending/:id/approve
```

**Request Body:**
```json
{
  \"reason\": \"承認理由（オプション）\"
}
```

### ❌ 却下

```http
PUT /pending/:id/reject
```

**Request Body:**
```json
{
  \"reason\": \"却下理由\"
}
```

### 📦 一括承認

```http
POST /pending/bulk-approval
```

**Request Body:**
```json
{
  \"pendingIds\": [200, 201, 202],
  \"action\": \"approve\",
  \"reason\": \"一括承認\"
}
```

---

## スタッフ管理API

### 👥 スタッフ一覧取得

```http
GET /staff
```

**Response:**
```json
{
  \"success\": true,
  \"data\": [
    {
      \"id\": 10,
      \"empNo\": \"EMP001\",
      \"name\": \"山田太郎\",
      \"department\": \"開発部\",
      \"group\": \"フロントエンド\",
      \"isActive\": true
    }
  ]
}
```

### 👤 スタッフ詳細取得

```http
GET /staff/:id
```

### 👤 スタッフ作成

```http
POST /staff
```

**Request Body:**
```json
{
  \"empNo\": \"EMP999\",
  \"name\": \"新入社員\",
  \"department\": \"開発部\",
  \"group\": \"バックエンド\",
  \"email\": \"newbie@example.com\"
}
```

---

## 設定管理API

### ⚙️ グローバル設定取得

```http
GET /display-settings
```

### ⚙️ グローバル設定更新

```http
PUT /display-settings
```

**Request Body:**
```json
{
  \"statusColors\": {
    \"online\": \"#22c55e\",
    \"remote\": \"#10b981\",
    \"off\": \"#ef4444\"
  },
  \"statusDisplayNames\": {
    \"online\": \"出社\",
    \"remote\": \"リモート\",
    \"off\": \"休み\"
  }
}
```

### 🎨 プリセット設定取得

```http
GET /preset-settings
```

---

## WebSocketイベント

### 🔌 接続管理

#### **接続・切断**
```javascript
// 接続
const socket = io('ws://localhost:3002');

// ルーム参加（日付別）
socket.emit('join-room', { date: '2025-01-15' });

// ルーム退出
socket.emit('leave-room', { date: '2025-01-15' });
```

### 📡 イベント一覧

#### **サーバー → クライアント**

##### **スケジュール更新通知**
```javascript
socket.on('schedule-updated', (data) => {
  console.log('スケジュール更新:', data);
  // data: { scheduleId, staffId, date, changes }
});
```

##### **新規Pending通知**
```javascript
socket.on('pending-created', (data) => {
  console.log('新規申請:', data);
  // data: { pendingId, staffId, date, status }
});
```

##### **承認状態変更通知**
```javascript
socket.on('approval-status-changed', (data) => {
  console.log('承認状態変更:', data);
  // data: { pendingId, status: 'approved' | 'rejected', approvedBy }
});
```

##### **リアルタイム更新通知**
```javascript
socket.on('live-update', (data) => {
  console.log('リアルタイム更新:', data);
  // data: { type, payload }
});
```

#### **クライアント → サーバー**

##### **ステータス更新**
```javascript
socket.emit('status-change', {
  staffId: 10,
  status: 'online',
  timestamp: new Date().toISOString()
});
```

---

## 🔧 SDK・ライブラリ

### JavaScript/TypeScript SDK

```typescript
import { CallStatusAPI } from '@callstatus/api-client';

const api = new CallStatusAPI({
  baseURL: 'http://localhost:3002/api',
  token: 'your-jwt-token'
});

// スケジュール取得
const schedules = await api.schedules.getUnified('2025-01-15');

// Pending作成
const pending = await api.pending.create({
  staffId: 10,
  date: '2025-01-15',
  status: 'remote',
  start: 9.0,
  end: 18.0
});
```

### cURL例

```bash
# 統合スケジュール取得
curl -X GET \"http://localhost:3002/api/schedules/unified?date=2025-01-15\" \\
  -H \"Authorization: Bearer YOUR_JWT_TOKEN\" \\
  -H \"Content-Type: application/json\"

# 新規スケジュール作成
curl -X POST \"http://localhost:3002/api/schedules\" \\
  -H \"Authorization: Bearer YOUR_JWT_TOKEN\" \\
  -H \"Content-Type: application/json\" \\
  -d '{
    \"staffId\": 10,
    \"date\": \"2025-01-15\",
    \"status\": \"online\",
    \"start\": 9.0,
    \"end\": 18.0,
    \"memo\": \"通常勤務\"
  }'
```

---

## 📝 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| v1.0.0 | 2025-01-01 | 初期リリース |
| v1.1.0 | 2025-01-15 | Pending API追加 |
| v1.2.0 | 2025-02-01 | WebSocket強化 |

---

*💡 **Note**: API仕様は予告なく変更される場合があります。最新情報は本ドキュメントでご確認ください。*