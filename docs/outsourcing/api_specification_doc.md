# API仕様書 - 出社状況管理ボード

## 概要

### システム基本情報
- **プロジェクト規模**: 300名企業での実運用
- **技術スタック**: NestJS + TypeScript + PostgreSQL + WebSocket
- **認証方式**: JWT認証（現在は段階的実装中）
- **API総数**: 約80エンドポイント
- **リアルタイム通信**: Socket.IO WebSocket

### 重要なセキュリティ状況
⚠️ **現在のセキュリティ状況**
- **核心業務機能API**: スケジュール・スタッフ・承認管理の権限チェックが無効化中
- **システム・設定系API**: 権限チェックは正常動作
- **認証システム**: 基盤は完成、核心機能の権限チェックは段階的復旧予定
- **フロントエンド権限制御**: 正常動作
- **セキュリティリスク**: 直接API呼び出しで核心業務機能への制限回避が可能

## API エンドポイント一覧

### 1. 基本システム・認証API

| エンドポイント | メソッド | 機能 | 認証 | 権限 | 現在の状態 |
|-------------|---------|------|-----|-----|-----------|
| `/api/test` | GET | API接続テスト | - | - | 有効 |
| `/api/system-monitoring/metrics` | GET | システム監視メトリクス | - | - | 有効 |
| `/api/auth/health` | GET | 認証サービスヘルスチェック | - | - | 有効 |
| `/api/auth/login` | POST | ログイン | - | - | 有効 |
| `/api/auth/set-password` | POST | パスワード設定 | - | - | 有効 |
| `/api/auth/change-password` | POST | パスワード変更 | JWT | 本人 | 有効 |
| `/api/auth/user` | GET | ユーザー存在確認 | - | - | 有効 |
| `/api/auth/profile` | GET | プロフィール取得 | JWT | 本人 | 有効 |
| `/api/auth/request-initial-setup` | POST | 初期設定リクエスト | - | - | 有効 |
| `/api/auth/request-password-reset` | POST | パスワードリセット要求 | - | - | 有効 |
| `/api/auth/reset-password` | POST | パスワードリセット実行 | - | - | 有効 |

### 2. スケジュール管理API（核心機能）

| エンドポイント | メソッド | 機能 | 認証 | 権限 | 現在の状態 |
|-------------|---------|------|-----|-----|-----------|
| `/api/schedules` | GET | スケジュール一覧取得 | ⚠️ | - | 権限チェック無効 |
| `/api/schedules` | POST | スケジュール作成 | ⚠️ | 本人/ADMIN | 権限チェック無効 |
| `/api/schedules/:id` | GET | スケジュール詳細取得 | ⚠️ | 本人/ADMIN | 権限チェック無効 |
| `/api/schedules/:id` | PATCH | スケジュール更新 | ⚠️ | 本人/ADMIN | 権限チェック無効 |
| `/api/schedules/:id` | DELETE | スケジュール削除 | ⚠️ | 本人/ADMIN | 権限チェック無効 |
| `/api/schedules/unified` | GET | **統合スケジュール取得（2層データ）** | ⚠️ | - | 権限チェック無効 |
| `/api/schedules/bulk` | POST | 一括スケジュール作成 | ⚠️ | 本人/ADMIN | 権限チェック無効 |
| `/api/schedules/bulk` | DELETE | 一括スケジュール削除 | ⚠️ | 本人/ADMIN | 権限チェック無効 |
| `/api/schedules/pending` | GET | 承認待ち予定一覧取得 | ⚠️ | - | 権限チェック無効 |
| `/api/schedules/pending` | POST | 承認待ち予定作成 | ⚠️ | 本人/ADMIN | 権限チェック無効 |
| `/api/schedules/pending/approve` | POST | 個別承認 | ⚠️ | ADMIN | 権限チェック無効 |
| `/api/schedules/pending/bulk-approve` | POST | 一括承認 | ⚠️ | ADMIN | 権限チェック無効 |
| `/api/schedules/pending/reject` | POST | 個別却下 | ⚠️ | ADMIN | 権限チェック無効 |

### 3. スタッフ管理API

| エンドポイント | メソッド | 機能 | 認証 | 権限 | 現在の状態 |
|-------------|---------|------|-----|-----|-----------|
| `/api/staff` | GET | スタッフ一覧取得 | ⚠️ | - | 権限チェック無効 |
| `/api/staff` | POST | スタッフ作成 | ⚠️ | ADMIN | 権限チェック無効 |
| `/api/staff/:id` | GET | スタッフ詳細取得 | ⚠️ | - | 権限チェック無効 |
| `/api/staff/:id` | PATCH | スタッフ更新 | ⚠️ | ADMIN | 権限チェック無効 |
| `/api/staff/:id` | DELETE | スタッフ削除 | ⚠️ | ADMIN | 権限チェック無効 |
| `/api/staff/bulk` | POST | 一括スタッフ作成 | ⚠️ | ADMIN | 権限チェック無効 |
| `/api/staff/bulk` | DELETE | 一括スタッフ削除 | ⚠️ | ADMIN | 権限チェック無効 |

### 4. 承認管理API

| エンドポイント | メソッド | 機能 | 認証 | 権限 | 現在の状態 |
|-------------|---------|------|-----|-----|-----------|
| `/api/pending` | GET | 承認待ち一覧取得 | ⚠️ | ADMIN | 権限チェック無効 |
| `/api/pending/approve` | POST | 個別承認 | ⚠️ | ADMIN | 権限チェック無効 |
| `/api/pending/bulk-approve` | POST | 一括承認 | ⚠️ | ADMIN | 権限チェック無効 |
| `/api/pending/reject` | POST | 個別却下 | ⚠️ | ADMIN | 権限チェック無効 |
| `/api/pending/bulk-reject` | POST | 一括却下 | ⚠️ | ADMIN | 権限チェック無効 |
| `/api/pending/statistics` | GET | 承認統計取得 | ⚠️ | ADMIN | 権限チェック無効 |

### 5. 契約管理API

| エンドポイント | メソッド | 機能 | 認証 | 権限 | 現在の状態 |
|-------------|---------|------|-----|-----|-----------|
| `/api/contracts/monthly` | GET | 月次契約スケジュール取得 | - | - | 有効（UTC対応済み） |
| `/api/contracts/staff/:staffId` | GET | スタッフ契約データ取得 | - | - | 有効（UTC対応済み） |

### 6. 履歴・スナップショット管理API

| エンドポイント | メソッド | 機能 | 認証 | 権限 | 現在の状態 |
|-------------|---------|------|-----|-----|-----------|
| `/api/admin/snapshots/manual/:date` | POST | 手動スナップショット作成 | - | ADMIN | 有効 |
| `/api/admin/snapshots/history` | GET | スナップショット履歴取得 | - | ADMIN | 有効 |
| `/api/admin/snapshots/rollback/:batchId` | DELETE | スナップショットロールバック | - | ADMIN | 有効 |
| `/api/admin/snapshots/daily` | POST | 日次スナップショット手動実行 | - | ADMIN | 有効 |
| `/api/admin/snapshots/initial/:days` | POST | 初期履歴データ作成 | - | ADMIN | 有効 |

### 7. CSVインポートAPI

| エンドポイント | メソッド | 機能 | 認証 | 権限 | 現在の状態 |
|-------------|---------|------|-----|-----|-----------|
| `/api/csv-import/schedules` | POST | スケジュールCSVインポート | - | ADMIN | 有効 |
| `/api/csv-import/history` | GET | インポート履歴取得 | - | ADMIN | 有効 |
| `/api/csv-import/rollback` | DELETE | インポートロールバック | - | ADMIN | 有効 |

### 8. 設定管理API（表示・プリセット・部署）

**表示設定**
| エンドポイント | メソッド | 機能 | 認証 | 権限 | 現在の状態 |
|-------------|---------|------|-----|-----|-----------|
| `/api/admin/global-display-settings` | GET | グローバル表示設定取得 | - | - | 有効 |
| `/api/admin/global-display-settings` | PUT | グローバル表示設定更新 | - | ADMIN | 有効 |
| `/api/admin/global-display-settings/history` | GET | 表示設定履歴取得 | - | ADMIN | 有効 |

**プリセット設定**
| エンドポイント | メソッド | 機能 | 認証 | 権限 | 現在の状態 |
|-------------|---------|------|-----|-----|-----------|
| `/api/admin/global-preset-settings` | GET | グローバルプリセット設定取得 | - | - | 有効 |
| `/api/admin/global-preset-settings` | PUT | グローバルプリセット設定更新 | - | ADMIN | 有効 |
| `/api/preset-settings/staff/:staffId` | GET | スタッフプリセット設定取得 | ⚠️ | 本人/ADMIN | 権限チェック無効 |
| `/api/preset-settings/staff/:staffId/presets` | POST | プリセット作成 | ⚠️ | 本人/ADMIN | 権限チェック無効 |
| `/api/preset-settings/staff/:staffId/presets/:presetId` | PUT | プリセット更新 | ⚠️ | 本人/ADMIN | 権限チェック無効 |
| `/api/preset-settings/staff/:staffId/presets/:presetId` | DELETE | プリセット削除 | ⚠️ | 本人/ADMIN | 権限チェック無効 |

**部署・グループ設定**
| エンドポイント | メソッド | 機能 | 認証 | 権限 | 現在の状態 |
|-------------|---------|------|-----|-----|-----------|
| `/api/department-settings` | GET | 部署・グループ設定取得 | - | - | 有効 |
| `/api/department-settings` | POST | 部署・グループ設定更新 | - | ADMIN | 有効 |
| `/api/department-settings/auto-generate` | GET | スタッフ情報から自動生成 | - | - | 有効 |

### 9. 担当設定API

| エンドポイント | メソッド | 機能 | 認証 | 権限 | 現在の状態 |
|-------------|---------|------|-----|-----|-----------|
| `/api/responsibilities` | GET | 担当設定取得 | - | - | 有効 |
| `/api/responsibilities` | POST | 担当設定保存 | - | ADMIN | 有効 |
| `/api/responsibilities` | DELETE | 担当設定削除 | - | ADMIN | 有効 |
| `/api/daily-assignments` | GET | 日次担当一覧取得 | - | - | 有効 |
| `/api/daily-assignments` | POST | 担当設定・支援設定作成 | - | ADMIN | 有効 |
| `/api/daily-assignments` | DELETE | 担当設定削除 | - | ADMIN | 有効 |

## WebSocket リアルタイム通信仕様

### 接続情報
- **プロトコル**: Socket.IO
- **認証**: 現在は認証不要（段階的実装予定）
- **現在の性能限界**: 不明
- **制限の原因**: 全クライアントブロードキャスト（N×N通信問題）

### リアルタイムイベント一覧

| イベント名 | 方向 | 機能 | データ形式 |
|-----------|-----|------|----------|
| `schedule:new` | サーバー → クライアント | 新規スケジュール作成通知 | `ScheduleEvent` |
| `schedule:updated` | サーバー → クライアント | スケジュール更新通知 | `ScheduleEvent` |
| `schedule:deleted` | サーバー → クライアント | スケジュール削除通知 | `DeleteEvent` |
| `staff:updated` | サーバー → クライアント | スタッフ情報更新通知 | `StaffEvent` |
| `contract:updated` | サーバー → クライアント | 契約情報更新通知 | `ContractEvent` |
| `assignment:updated` | サーバー → クライアント | 担当設定更新通知 | `AssignmentEvent` |
| `pending:updated` | サーバー → クライアント | 承認待ち予定更新通知 | `PendingEvent` |
| `real-time-update` | サーバー → クライアント | 汎用リアルタイム更新通知 | `GenericEvent` |

### WebSocketイベントデータ型

```typescript
interface ScheduleEvent {
  id: number;
  staffId: number;
  date: string;
  status: string;
  start: string;
  end: string;
}

interface DeleteEvent {
  id: number;
  staffId: number;
  date: string;
}

interface StaffEvent {
  id: number;
  name: string;
  department: string;
  group: string;
}
```

## データモデル仕様

### 核心データ型

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
  status: string;      // "勤務", "休暇", "早退", "遅刻" など
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

## 重要な実装ルール

### 時刻処理の厳格ルール（必須遵守）

#### 統一ルール
1. **内部処理は完全UTC**: JST は入出力層でのみ使用
2. **文字列はISO-8601 (Z付き)固定**: `2025-07-09T12:00:00.000Z`
3. **日時型はTZ情報を持つ型選択**: `TIMESTAMP WITH TIME ZONE`
4. **変数・カラム名は *_utc に統一**: `*_jst` 禁止
5. **1分単位精度対応**: 1分単位計算

#### 統一ユーティリティ（実装済み）
```typescript
// TimeUtils クラスによる時刻処理統一
import { TimeUtils } from '../utils/time-utils';

// 正しい例
const utcTime = TimeUtils.toUTC('2025-07-09T21:00:00+09:00'); // UTC変換
const jstDisplay = TimeUtils.toJST(utcTime); // JST表示用

// 曜日判定（UTC基準）
const dayOfWeek = TimeUtils.getUTCDayOfWeek(2025, 7, 9);
const dayColumn = TimeUtils.getContractDayColumn(dayOfWeek);
```

#### 重要な技術修正
- **曜日判定の修正**: 環境依存の `new Date().getDay()` から UTC基準の `TimeUtils.getUTCDayOfWeek()` に変更
- **依存関係統一**: `date-fns` + `date-fns-tz` による標準化
- **Contract テーブル UTC 対応**: `createdAt_utc`, `updatedAt_utc` カラム追加

## 2層データレイヤーシステム

### アーキテクチャ概念
```
レイヤー1（Contract）: 基本契約勤務時間
　　　　　　↓
レイヤー2（Adjustment）: 個別調整・例外予定
　　　　　　↓
統合表示: 最終的な勤務予定
```

### 統合API（重要）
- **エンドポイント**: `/api/schedules/unified`
- **機能**: 2層データを統合して表示用データを生成
- **クエリパラメータ**: `?date=YYYY-MM-DD&staffIds=1,2,3`

### 統合APIレスポンス例
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
// 完全実装済み ✅
✅ AuthModule (app.module.ts:40)
✅ JWT認証サービス
✅ フロントエンド認証UI
✅ パスワード管理機能

// 核心業務機能のみ無効化中 ⚠️
⚠️ JwtAuthGuard (スケジュール・スタッフ・承認管理でコメントアウト)
⚠️ RolesGuard (核心業務機能で権限チェック無効)
⚠️ @Roles() デコレータ (核心業務機能で権限指定無効)
⚠️ @CurrentUser() デコレータ (核心業務機能でユーザー情報取得無効)
```

### 権限レベル定義
- **ADMIN**: 全操作可能（スタッフ管理、承認、設定変更）
- **STAFF**: 自分の予定のみ操作可能（現在無効化中）
- **SYSTEM_ADMIN**: システム管理機能のみ

### 段階的復旧計画
1. **Phase 1**: JWT認証の有効化
2. **Phase 2**: STAFF権限制限の復旧
3. **Phase 3**: 詳細権限チェックの実装

## エラーハンドリング仕様

### 標準エラーレスポンス形式
```json
{
  "statusCode": 400,
  "message": "具体的なエラーメッセージ",
  "error": "Bad Request",
  "timestamp": "2025-07-09T12:00:00.000Z",
  "path": "/api/schedules"
}
```

### 主要HTTPステータスコード
- **200**: 成功
- **201**: 作成成功
- **400**: バリデーションエラー
- **401**: 認証エラー（ログインが必要）
- **403**: 権限エラー（アクセス権限なし）
- **404**: リソース不存在
- **409**: 競合エラー（楽観的ロック失敗）
- **500**: サーバー内部エラー

## パフォーマンス考慮事項

### WebSocket制限と対策
- **現在の性能限界**: 不明（負荷テスト未実施）
- **制限要因**: 
  - 全クライアントブロードキャスト（`this.server.emit()`）
  - N×N通信問題（接続数の二乗に比例する通信量）
  - 差分更新なし（全データを毎回送信）
- **技術的改善案**: 
  - ルーム機能による部署別配信
  - 差分更新の実装
  - イベントフィルタリング
- **業務制約**: 受付チーム要件により最適化に制限あり

### データベース最適化
- **インデックス**: 日付・スタッフID・部署での複合インデックス
- **クエリ最適化**: 統合API用の専用クエリ実装済み
- **キャッシュ**: 月次計画用表示キャッシュ実装済み

### スケーラビリティ目標
- **同時接続**: 不明（負荷テスト要実施）
- **データ量**: 日次約1000件、月次約30,000件のスケジュール
- **部署構成**: 複数部署・グループの階層構造対応

## 業務要件との技術制約

### 受付チーム特別要件
- **リアルタイム性**: 表示日付に関係なく今日の更新が必須
- **業務継続性**: 技術最適化より業務確実性を優先
- **スケーラビリティ**: 差分更新は受付業務と相反するため慎重に検討

### 300名企業対応
- **運用規模**: 実際の企業環境での運用実績
- **信頼性**: 業務停止リスクを最小化する設計
- **拡張性**: 将来的な機能拡張への対応

## 開発チーム向けガイドライン

### 最優先改善項目
1. **核心業務機能のセキュリティ強化**: スケジュール・スタッフ・承認管理の権限チェック復旧
2. **監査ログ**: 全API操作の記録強化
3. **入力値検証**: より厳格なバリデーション実装
4. **エラーハンドリング**: 詳細なエラー情報提供

### 技術実装原則
- **TypeScript**: 型安全性の徹底（any型禁止）
- **時刻処理**: UTC/JST変換ルールの厳格な遵守
- **WebSocket**: スケーラビリティ改善の慎重な検討
- **テスト**: E2E・単体テストの充実

### 運用面での重要事項
- **受付業務**: 技術変更が業務に与える影響を慎重に評価
- **段階的展開**: 機能改善は段階的に実施
- **監視**: システム監視ダッシュボードの積極活用

### 避けるべき変更
- 時刻処理ロジックの根本的変更
- WebSocketの設計全体の見直し
- 受付チーム要件に影響する機能の大幅変更

## 実装済み時刻処理統一システム

### TimeUtils クラス機能

| メソッド | 機能 | 実装状況 |
|---------|------|----------|
| `TimeUtils.toUTC()` | 任意の日付入力をUTC文字列に変換 | ✅ 完了 |
| `TimeUtils.toJST()` | UTC文字列をJST Dateオブジェクトに変換 | ✅ 完了 |
| `TimeUtils.getUTCDayOfWeek()` | 年月日からUTC基準の曜日を取得 | ✅ 完了 |
| `TimeUtils.getContractDayColumn()` | Contract曜日カラム名を取得 | ✅ 完了 |
| `TimeUtils.timeStringToUTC()` | 時刻文字列をUTC DateTime文字列に変換 | ✅ 完了 |

### 実装された技術修正

#### 1. 曜日判定の正確性向上
```typescript
// 修正前（環境依存、技術的に不正確）
const date = new Date(year, month - 1, day);
const dayOfWeek = date.getDay();

// 修正後（UTC基準、正確）
const dayOfWeek = TimeUtils.getUTCDayOfWeek(year, month, day);
const dayColumn = TimeUtils.getContractDayColumn(dayOfWeek);
```

#### 2. Contract テーブル UTC 対応
```sql
-- 追加されたUTC専用カラム
"createdAt_utc"  TIMESTAMP(3),
"updatedAt_utc"  TIMESTAMP(3)
```

#### 3. 依存関係の統一
```json
{
  "dependencies": {
    "date-fns": "^4.1.0",
    "date-fns-tz": "^3.2.0"
  }
}
```

---

**文書バージョン**: 1.1.0  
**作成日**: 2025-07-09  
**最終更新**: 2025-07-09（時刻処理統一システム実装）  
**対象**: 開発チーム  
**更新責任者**: 町田　純