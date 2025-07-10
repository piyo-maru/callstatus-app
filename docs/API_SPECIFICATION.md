# コールステータスアプリ API仕様書

## 概要
本資料は、コールステータスアプリケーションのAPI仕様について、外注先パートナー向けに包括的な情報を提供します。

- **プロジェクト規模**: 225名企業での実運用
- **技術スタック**: NestJS + TypeScript + PostgreSQL + WebSocket
- **認証方式**: JWT認証（現在は段階的実装中）
- **API総数**: 約80エンドポイント
- **リアルタイム通信**: Socket.IO WebSocket

## 重要なセキュリティ状況

### ⚠️ 現在のセキュリティ状況
- **バックエンドAPI権限チェック**: 完全に無効化中
- **認証システム**: 基盤は完成、権限チェックは段階的復旧予定
- **フロントエンド権限制御**: 正常動作
- **セキュリティリスク**: 直接API呼び出しでSTAFF制限回避可能

### 影響範囲
- 全CRUD操作エンドポイント（約60個）
- 承認・設定変更エンドポイント
- 個人情報関連エンドポイント

## API エンドポイント一覧

### 1. 基本システム・認証

| エンドポイント | メソッド | 機能 | 認証 | 権限 | 現在の状態 |
|-------------|---------|------|-----|-----|-----------|
| `/api/test` | GET | API接続テスト | - | - | 有効 |
| `/api/system-monitoring/metrics` | GET | システム監視メトリクス（実データ） | - | - | 有効 |
| `/api/auth/health` | GET | 認証サービスヘルスチェック | - | - | 有効 |
| `/api/auth/login` | POST | ログイン | - | - | 有効 |
| `/api/auth/set-password` | POST | パスワード設定 | - | - | 有効 |
| `/api/auth/change-password` | POST | パスワード変更 | JWT | 本人 | 有効 |
| `/api/auth/user` | GET | ユーザー存在確認 | - | - | 有効 |
| `/api/auth/profile` | GET | プロフィール取得 | JWT | 本人 | 有効 |
| `/api/auth/request-initial-setup` | POST | 初期設定リクエスト | - | - | 有効 |
| `/api/auth/request-password-reset` | POST | パスワードリセット要求 | - | - | 有効 |
| `/api/auth/reset-password` | POST | パスワードリセット実行 | - | - | 有効 |

### 2. スケジュール管理

| エンドポイント | メソッド | 機能 | 認証 | 権限 | 現在の状態 |
|-------------|---------|------|-----|-----|-----------|
| `/api/schedules` | GET | スケジュール一覧取得 | ⚠️ | - | 権限チェック無効 |
| `/api/schedules` | POST | スケジュール作成 | ⚠️ | 本人/ADMIN | 権限チェック無効 |
| `/api/schedules/:id` | GET | スケジュール詳細取得 | ⚠️ | 本人/ADMIN | 権限チェック無効 |
| `/api/schedules/:id` | PATCH | スケジュール更新 | ⚠️ | 本人/ADMIN | 権限チェック無効 |
| `/api/schedules/:id` | DELETE | スケジュール削除 | ⚠️ | 本人/ADMIN | 権限チェック無効 |
| `/api/schedules/unified` | GET | 統合スケジュール取得（2層データ） | ⚠️ | - | 権限チェック無効 |
| `/api/schedules/bulk` | POST | 一括スケジュール作成 | ⚠️ | 本人/ADMIN | 権限チェック無効 |
| `/api/schedules/bulk` | DELETE | 一括スケジュール削除 | ⚠️ | 本人/ADMIN | 権限チェック無効 |
| `/api/schedules/test` | GET | スケジュールAPIテスト | - | - | 有効 |
| `/api/schedules/pending` | GET | 承認待ち予定一覧取得 | ⚠️ | - | 権限チェック無効 |
| `/api/schedules/pending` | POST | 承認待ち予定作成 | ⚠️ | 本人/ADMIN | 権限チェック無効 |
| `/api/schedules/pending/approve` | POST | 個別承認 | ⚠️ | ADMIN | 権限チェック無効 |
| `/api/schedules/pending/bulk-approve` | POST | 一括承認 | ⚠️ | ADMIN | 権限チェック無効 |
| `/api/schedules/pending/reject` | POST | 個別却下 | ⚠️ | ADMIN | 権限チェック無効 |

### 3. スタッフ管理

| エンドポイント | メソッド | 機能 | 認証 | 権限 | 現在の状態 |
|-------------|---------|------|-----|-----|-----------|
| `/api/staff` | GET | スタッフ一覧取得 | ⚠️ | - | 権限チェック無効 |
| `/api/staff` | POST | スタッフ作成 | ⚠️ | ADMIN | 権限チェック無効 |
| `/api/staff/:id` | GET | スタッフ詳細取得 | ⚠️ | - | 権限チェック無効 |
| `/api/staff/:id` | PATCH | スタッフ更新 | ⚠️ | ADMIN | 権限チェック無効 |
| `/api/staff/:id` | DELETE | スタッフ削除 | ⚠️ | ADMIN | 権限チェック無効 |
| `/api/staff/bulk` | POST | 一括スタッフ作成 | ⚠️ | ADMIN | 権限チェック無効 |
| `/api/staff/bulk` | DELETE | 一括スタッフ削除 | ⚠️ | ADMIN | 権限チェック無効 |
| `/api/staff/test` | GET | スタッフAPIテスト | - | - | 有効 |

### 4. 承認管理

| エンドポイント | メソッド | 機能 | 認証 | 権限 | 現在の状態 |
|-------------|---------|------|-----|-----|-----------|
| `/api/pending` | GET | 承認待ち一覧取得 | ⚠️ | ADMIN | 権限チェック無効 |
| `/api/pending/approve` | POST | 個別承認 | ⚠️ | ADMIN | 権限チェック無効 |
| `/api/pending/bulk-approve` | POST | 一括承認 | ⚠️ | ADMIN | 権限チェック無効 |
| `/api/pending/reject` | POST | 個別却下 | ⚠️ | ADMIN | 権限チェック無効 |
| `/api/pending/bulk-reject` | POST | 一括却下 | ⚠️ | ADMIN | 権限チェック無効 |
| `/api/pending/statistics` | GET | 承認統計取得 | ⚠️ | ADMIN | 権限チェック無効 |

### 5. 契約管理

| エンドポイント | メソッド | 機能 | 認証 | 権限 | 現在の状態 |
|-------------|---------|------|-----|-----|-----------|
| `/api/contracts/monthly` | GET | 月次契約スケジュール取得 | - | - | 有効 |
| `/api/contracts/staff/:staffId` | GET | スタッフ契約データ取得 | - | - | 有効 |

### 6. 履歴・スナップショット

| エンドポイント | メソッド | 機能 | 認証 | 権限 | 現在の状態 |
|-------------|---------|------|-----|-----|-----------|
| `/api/admin/snapshots/manual/:date` | POST | 手動スナップショット作成 | - | ADMIN | 有効 |
| `/api/admin/snapshots/history` | GET | スナップショット履歴取得 | - | ADMIN | 有効 |
| `/api/admin/snapshots/rollback/:batchId` | DELETE | スナップショットロールバック | - | ADMIN | 有効 |
| `/api/admin/snapshots/daily` | POST | 日次スナップショット手動実行 | - | ADMIN | 有効 |
| `/api/admin/snapshots/initial/:days` | POST | 初期履歴データ作成 | - | ADMIN | 有効 |

### 7. CSVインポート

| エンドポイント | メソッド | 機能 | 認証 | 権限 | 現在の状態 |
|-------------|---------|------|-----|-----|-----------|
| `/api/csv-import/schedules` | POST | スケジュールCSVインポート | - | ADMIN | 有効 |
| `/api/csv-import/history` | GET | インポート履歴取得 | - | ADMIN | 有効 |
| `/api/csv-import/rollback` | DELETE | インポートロールバック | - | ADMIN | 有効 |

### 8. 担当設定・支援設定

| エンドポイント | メソッド | 機能 | 認証 | 権限 | 現在の状態 |
|-------------|---------|------|-----|-----|-----------|
| `/api/responsibilities` | GET | 担当設定取得 | - | - | 有効 |
| `/api/responsibilities` | POST | 担当設定保存 | - | ADMIN | 有効 |
| `/api/responsibilities` | DELETE | 担当設定削除 | - | ADMIN | 有効 |
| `/api/daily-assignments` | GET | 日次担当一覧取得 | - | - | 有効 |
| `/api/daily-assignments` | POST | 担当設定・支援設定作成 | - | ADMIN | 有効 |
| `/api/daily-assignments` | DELETE | 担当設定削除 | - | ADMIN | 有効 |
| `/api/daily-assignments/staff/:staffId/current` | DELETE | 支援設定削除 | - | ADMIN | 有効 |

### 9. 表示設定・プリセット

| エンドポイント | メソッド | 機能 | 認証 | 権限 | 現在の状態 |
|-------------|---------|------|-----|-----|-----------|
| `/api/admin/global-display-settings` | GET | グローバル表示設定取得 | - | - | 有効 |
| `/api/admin/global-display-settings` | PUT | グローバル表示設定更新 | - | ADMIN | 有効 |
| `/api/admin/global-display-settings/history` | GET | 表示設定履歴取得 | - | ADMIN | 有効 |
| `/api/admin/global-preset-settings` | GET | グローバルプリセット設定取得 | - | - | 有効 |
| `/api/admin/global-preset-settings` | PUT | グローバルプリセット設定更新 | - | ADMIN | 有効 |
| `/api/admin/global-preset-settings/version` | GET | プリセット設定バージョン取得 | - | - | 有効 |
| `/api/admin/global-preset-settings/history` | GET | プリセット設定履歴取得 | - | - | 有効 |
| `/api/preset-settings/staff/:staffId` | GET | スタッフプリセット設定取得 | ⚠️ | 本人/ADMIN | 権限チェック無効 |
| `/api/preset-settings/staff/:staffId/page-settings` | PUT | ページ別プリセット設定更新 | ⚠️ | 本人/ADMIN | 権限チェック無効 |
| `/api/preset-settings/staff/:staffId/presets` | POST | プリセット作成 | ⚠️ | 本人/ADMIN | 権限チェック無効 |
| `/api/preset-settings/staff/:staffId/presets/:presetId` | PUT | プリセット更新 | ⚠️ | 本人/ADMIN | 権限チェック無効 |
| `/api/preset-settings/staff/:staffId/presets/:presetId` | DELETE | プリセット削除 | ⚠️ | 本人/ADMIN | 権限チェック無効 |
| `/api/preset-settings/admin/statistics` | GET | プリセット利用統計 | ⚠️ | ADMIN | 権限チェック無効 |
| `/api/preset-settings/test` | GET | プリセットAPIテスト | - | - | 有効 |

### 10. 部署・グループ設定

| エンドポイント | メソッド | 機能 | 認証 | 権限 | 現在の状態 |
|-------------|---------|------|-----|-----|-----------|
| `/api/department-settings` | GET | 部署・グループ設定取得 | - | - | 有効 |
| `/api/department-settings/auto-generate` | GET | スタッフ情報から自動生成 | - | - | 有効 |
| `/api/department-settings` | POST | 部署・グループ設定更新 | - | ADMIN | 有効 |
| `/api/department-settings/by-name/:type/:name` | GET | 名前による設定取得 | - | - | 有効 |

### 11. 月次計画

| エンドポイント | メソッド | 機能 | 認証 | 権限 | 現在の状態 |
|-------------|---------|------|-----|-----|-----------|
| `/api/monthly-planner/display-cache/:year/:month` | GET | 契約表示キャッシュ取得 | - | - | 有効 |

## WebSocket イベント

### 接続
- **URL**: `socket.io` 接続
- **認証**: 現在は認証不要
- **スケーラビリティ**: 50人程度まで（N×N通信問題）

### イベント一覧

| イベント名 | 方向 | 機能 | データ形式 |
|-----------|-----|------|----------|
| `schedule:new` | サーバー → クライアント | 新規スケジュール作成通知 | `{ id, staffId, date, status, start, end }` |
| `schedule:updated` | サーバー → クライアント | スケジュール更新通知 | `{ id, staffId, date, status, start, end }` |
| `schedule:deleted` | サーバー → クライアント | スケジュール削除通知 | `{ id, staffId, date }` |
| `staff:updated` | サーバー → クライアント | スタッフ情報更新通知 | `{ id, name, department, group }` |
| `contract:updated` | サーバー → クライアント | 契約情報更新通知 | `{ staffId, date, hours }` |
| `assignment:updated` | サーバー → クライアント | 担当設定更新通知 | `{ staffId, date, assignmentType }` |
| `pending:updated` | サーバー → クライアント | 承認待ち予定更新通知 | `{ id, staffId, status }` |
| `real-time-update` | サーバー → クライアント | リアルタイム更新通知 | `{ type, data }` |

## データ形式

### 共通データ型

#### Staff（スタッフ）
```typescript
interface Staff {
  id: number;
  name: string;
  department: string;
  group: string;
  empNo?: string;
  isActive?: boolean;
  currentStatus: string;
}
```

#### Schedule（スケジュール）
```typescript
interface Schedule {
  id: number;
  staffId: number;
  date: string;        // ISO-8601 (YYYY-MM-DD)
  status: string;
  start: string;       // ISO-8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
  end: string;         // ISO-8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
  memo?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### Adjustment（調整予定）
```typescript
interface Adjustment {
  id: number;
  staffId: number;
  date: string;
  status: string;
  start: string;
  end: string;
  memo?: string;
  reason?: string;
  isPending?: boolean;
  approvedAt?: string;
  approvedBy?: number;
  rejectedAt?: string;
  rejectedBy?: number;
}
```

#### Contract（契約）
```typescript
interface Contract {
  id: number;
  staffId: number;
  empNo: string;
  name: string;
  team: string;
  dept: string;
  mondayHours?: string;
  tuesdayHours?: string;
  wednesdayHours?: string;
  thursdayHours?: string;
  fridayHours?: string;
  saturdayHours?: string;
  sundayHours?: string;
}
```

### 時刻処理ルール

#### 統一ルール（必須遵守）
1. **内部処理は完全UTC**: JST は入出力層でのみ使用
2. **文字列はISO-8601 (Z付き)固定**: `2025-07-09T12:00:00.000Z`
3. **日時型はTZ情報を持つ型選択**: `TIMESTAMP WITH TIME ZONE`
4. **変数・カラム名は *_utc に統一**: `*_jst` 禁止
5. **1分単位精度対応**: Excel Online互換の1分単位計算

#### 変換例
```typescript
// 正しい例
const utcTime = '2025-07-09T12:00:00.000Z';
const jstDisplay = formatToJST(utcTime); // 21:00 表示

// 誤った例
const jstTime = '2025-07-09T21:00:00+09:00'; // 禁止
```

## 2層データレイヤーシステム

### アーキテクチャ概要
```
レイヤー1（Contract）: 基本契約勤務時間
　　　　　　↓
レイヤー2（Adjustment）: 個別調整・例外予定
```

### 統合API
- **エンドポイント**: `/api/schedules/unified`
- **機能**: 2層データを統合して表示用データを生成
- **パラメータ**: `?date=YYYY-MM-DD&staffIds=1,2,3`

### レスポンス形式
```json
{
  "date": "2025-07-09",
  "schedules": [
    {
      "staffId": 1,
      "layers": {
        "contract": {
          "status": "勤務",
          "start": "2025-07-09T09:00:00.000Z",
          "end": "2025-07-09T18:00:00.000Z",
          "source": "contract"
        },
        "adjustment": {
          "status": "早退",
          "start": "2025-07-09T09:00:00.000Z",
          "end": "2025-07-09T15:00:00.000Z",
          "source": "adjustment",
          "reason": "体調不良"
        }
      },
      "effectiveSchedule": {
        "status": "早退",
        "start": "2025-07-09T09:00:00.000Z",
        "end": "2025-07-09T15:00:00.000Z",
        "memo": "体調不良により早退"
      }
    }
  ]
}
```

## 認証・権限システム

### 現在の実装状況
```typescript
// 完全実装済み
✅ AuthModule (app.module.ts:40)
✅ JWT認証サービス
✅ フロントエンド認証UI
✅ パスワード管理機能

// 一時的に無効化中
⚠️ JwtAuthGuard (全コントローラーでコメントアウト)
⚠️ RolesGuard (権限チェック無効)
⚠️ @Roles() デコレータ (権限指定無効)
⚠️ @CurrentUser() デコレータ (ユーザー情報取得無効)
```

### 権限レベル
- **ADMIN**: 全操作可能
- **STAFF**: 自分の予定のみ操作可能（現在無効化中）
- **SYSTEM_ADMIN**: システム管理機能のみ

### 段階的復旧計画
1. **Phase 1**: JWT認証の有効化
2. **Phase 2**: STAFF権限制限の復旧
3. **Phase 3**: 詳細権限チェックの実装

## エラーハンドリング

### 標準エラーレスポンス
```json
{
  "statusCode": 400,
  "message": "エラーメッセージ",
  "error": "Bad Request",
  "timestamp": "2025-07-09T12:00:00.000Z",
  "path": "/api/schedules"
}
```

### 主要エラーコード
- **400**: バリデーションエラー
- **401**: 認証エラー
- **403**: 権限エラー
- **404**: リソースなし
- **409**: 競合エラー（楽観的ロック）
- **500**: サーバーエラー

## パフォーマンス考慮事項

### WebSocket制限
- **現在の制限**: 50人程度まで
- **原因**: 全クライアントブロードキャスト（N×N問題）
- **対策**: 部署別・グループ別の分散が必要

### データベース最適化
- **インデックス**: 日付・スタッフID・部署での複合インデックス
- **クエリ最適化**: 統合API用の専用クエリ実装
- **キャッシュ**: 月次計画用表示キャッシュ実装済み

## 業務要件との関係

### 受付チーム特別要件
- **リアルタイム性**: 表示日付に関係なく今日の更新が必須
- **業務継続性**: 技術最適化より業務確実性を優先
- **スケーラビリティ**: 差分更新は受付業務と相反するため慎重に検討

### 225名企業スケール
- **同時接続**: 約30-40人（15%想定）
- **データ量**: 日次約300件、月次約6,000件のスケジュール
- **部署構成**: 複数部署・グループの階層構造

## 外注先向け推奨事項

### 優先度が高い改善項目
1. **セキュリティ強化**: 権限チェックの段階的復旧
2. **監査ログ**: 全API操作の記録強化
3. **入力値検証**: より厳格なバリデーション
4. **エラーハンドリング**: 詳細なエラー情報提供

### 技術的考慮事項
- **TypeScript**: 型安全性の徹底
- **時刻処理**: UTC/JST変換ルールの厳格な遵守
- **WebSocket**: スケーラビリティ改善の検討
- **テスト**: E2E・単体テストの充実

### 運用面での注意事項
- **受付業務**: 技術変更が業務に与える影響を慎重に評価
- **段階的展開**: 機能改善は段階的に実施
- **監視**: システム監視ダッシュボードの活用

---

**更新日**: 2025-07-09  
**バージョン**: 1.0.0  
**担当**: システム開発チーム