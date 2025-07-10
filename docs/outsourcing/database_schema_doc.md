# データベース設計書 - 出社状況管理ボード

## 概要

### データベース基本情報
- **データベース**: PostgreSQL
- **ORM**: Prisma
- **テーブル数**: 27個
- **主要な設計原則**: 2層データレイヤー、UTC時刻処理、監査ログ、段階的認証

### 設計思想
- **業務継続性優先**: 300名企業での実運用を前提とした信頼性重視
- **段階的実装**: 認証システムの段階的導入による業務影響最小化
- **完全監査**: 全操作の追跡可能性確保
- **時刻処理統一**: UTC基準による一貫した時刻管理

## 核心テーブル構造

### 1. スケジュール管理（2層データレイヤー）

#### Contract（契約）- 第1層：基本勤務時間
```sql
CREATE TABLE "Contract" (
    "id"             SERIAL PRIMARY KEY,
    "empNo"          TEXT NOT NULL UNIQUE,
    "name"           TEXT NOT NULL,
    "team"           TEXT NOT NULL,
    "dept"           TEXT NOT NULL,
    "email"          TEXT,
    "staffId"        INTEGER NOT NULL,
    -- 曜日別勤務時間（"09:00-18:00"形式）
    "mondayHours"    TEXT,
    "tuesdayHours"   TEXT,
    "wednesdayHours" TEXT,
    "thursdayHours"  TEXT,
    "fridayHours"    TEXT,
    "saturdayHours"  TEXT,
    "sundayHours"    TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    -- UTC時刻処理専用カラム（2025-07-09実装）
    "createdAt_utc"  TIMESTAMP(3),
    "updatedAt_utc"  TIMESTAMP(3),
    
    FOREIGN KEY ("staffId") REFERENCES "Staff"("id")
);
```

**特徴**
- **曜日別設定**: 各曜日の基本勤務時間を文字列で管理
- **祝日対応**: 祝日は自動的に勤務なしとして処理
- **社員番号連携**: `empNo`でユニーク制約による重複防止

#### Adjustment（調整）- 第2層：個別調整・例外予定
```sql
CREATE TABLE "Adjustment" (
    "id"              SERIAL PRIMARY KEY,
    "staffId"         INTEGER NOT NULL,
    "date"            TIMESTAMP(3) NOT NULL,
    "status"          TEXT NOT NULL,
    "start"           TIMESTAMP(3) NOT NULL,
    "end"             TIMESTAMP(3) NOT NULL,
    "memo"            TEXT,
    "reason"          TEXT,
    "batchId"         TEXT,
    -- 承認ワークフロー
    "isPending"       BOOLEAN NOT NULL DEFAULT false,
    "pendingType"     TEXT,
    "approvedAt"      TIMESTAMP(3),
    "approvedBy"      INTEGER,
    "rejectedAt"      TIMESTAMP(3),
    "rejectedBy"      INTEGER,
    "rejectionReason" TEXT,
    -- UTC時刻処理専用カラム（段階的移行）
    "date_utc"        TIMESTAMP(3),
    "start_utc"       TIMESTAMP(3),
    "end_utc"         TIMESTAMP(3),
    "createdAt_utc"   TIMESTAMP(3),
    "updatedAt_utc"   TIMESTAMP(3),
    "approvedAt_utc"  TIMESTAMP(3),
    "rejectedAt_utc"  TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    
    FOREIGN KEY ("staffId") REFERENCES "Staff"("id"),
    FOREIGN KEY ("approvedBy") REFERENCES "Staff"("id"),
    FOREIGN KEY ("rejectedBy") REFERENCES "Staff"("id")
);
```

**特徴**
- **承認ワークフロー**: `isPending`, `approvedAt`, `rejectedAt`による状態管理
- **UTC対応**: 既存カラムと並行してUTC専用カラムを実装
- **バッチ管理**: `batchId`でインポート単位を追跡
- **完全監査**: 承認者・却下者の記録による責任追跡

### 2. スタッフ管理

#### Staff（スタッフ）- 中核マスターテーブル
```sql
CREATE TABLE "Staff" (
    "id"                    SERIAL PRIMARY KEY,
    "name"                  TEXT NOT NULL,
    "department"            TEXT NOT NULL,
    "group"                 TEXT NOT NULL,
    "empNo"                 TEXT UNIQUE,
    "isActive"              BOOLEAN NOT NULL DEFAULT true,
    "deletedAt"             TIMESTAMP(3),
    "position"              TEXT,
    "workArrangement"       TEXT NOT NULL,
    -- 管理者機能
    "isManager"             BOOLEAN NOT NULL DEFAULT false,
    "managerActivatedAt"    TIMESTAMP(3),
    "managerDepartments"    TEXT[] DEFAULT ARRAY[]::TEXT[],
    "managerPermissions"    "ManagerPermission"[] DEFAULT ARRAY[]::"ManagerPermission"[],
    -- 認証関連
    "authGracePeriod"       TIMESTAMP(3)
);
```

**特徴**
- **論理削除**: `deletedAt`によるソフトデリート実装
- **雇用形態管理**: `workArrangement`必須フィールド（2025-07-09 NOT NULL化）
- **役職管理**: `position`オプションフィールドによる柔軟な役職設定
- **管理者機能**: 段階的権限システムによる柔軟な権限管理
- **PostgreSQL配列**: 部署・権限のマルチ選択対応
- **認証猶予**: `authGracePeriod`による段階的認証導入

#### TemporaryAssignment（支援設定）
```sql
CREATE TABLE "TemporaryAssignment" (
    "id"        SERIAL PRIMARY KEY,
    "staffId"   INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate"   TIMESTAMP(3) NOT NULL,
    "tempDept"  TEXT NOT NULL,
    "tempGroup" TEXT NOT NULL,
    "reason"    TEXT NOT NULL DEFAULT '支援',
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    FOREIGN KEY ("staffId") REFERENCES "Staff"("id"),
    UNIQUE("staffId", "startDate", "endDate")
);
```

**特徴**
- **期間管理**: 開始日・終了日による支援期間の厳密管理
- **重複防止**: 複合ユニーク制約による期間重複回避
- **一時部署変更**: 支援先組織情報の保存

### 3. 認証・権限システム

#### user_auth（ユーザー認証）
```sql
CREATE TABLE "user_auth" (
    "id"                    TEXT PRIMARY KEY,
    "email"                 TEXT NOT NULL UNIQUE,
    "password"              TEXT,
    "userType"              "UserType" NOT NULL,
    "isActive"              BOOLEAN NOT NULL DEFAULT true,
    "staffId"               INTEGER UNIQUE,
    "adminRole"             "AdminRole",
    -- セキュリティ機能
    "emailVerified"         DATETIME,
    "lastLoginAt"           DATETIME,
    "passwordSetAt"         DATETIME,
    "loginAttempts"         INTEGER NOT NULL DEFAULT 0,
    "lockedAt"              DATETIME,
    -- 拡張性
    "externalId"            TEXT,
    "metadata"              JSON,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL,
    "deletedAt"             TIMESTAMP(3),
    
    FOREIGN KEY ("staffId") REFERENCES "Staff"("id")
);
```

**特徴**
- **段階的認証**: パスワード未設定でもStaffテーブルに登録があればアカウント作成可能
- **ブルートフォース対策**: ログイン試行回数制限とアカウントロック
- **柔軟権限**: `userType` + `adminRole`による二段階権限システム
- **外部認証準備**: `externalId`によるSSO連携対応

#### auth_sessions（認証セッション）
```sql
CREATE TABLE "auth_sessions" (
    "id"               TEXT PRIMARY KEY,
    "userAuthId"       TEXT NOT NULL,
    "token"            TEXT NOT NULL UNIQUE,
    "refreshToken"     TEXT UNIQUE,
    "expiresAt"        TIMESTAMP(3) NOT NULL,
    "refreshExpiresAt" TIMESTAMP(3),
    -- セッション追跡
    "ipAddress"        TEXT,
    "userAgent"        TEXT,
    "isActive"         BOOLEAN NOT NULL DEFAULT true,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY ("userAuthId") REFERENCES "user_auth"("id") ON DELETE CASCADE
);
```

**特徴**
- **JWT管理**: アクセストークン・リフレッシュトークンの完全管理
- **セッション追跡**: IP・UserAgent・最終アクティビティの記録
- **自動クリーンアップ**: カスケード削除による関連データ整理

### 4. 履歴・監査システム

#### historical_schedules（履歴スケジュール）
```sql
CREATE TABLE "historical_schedules" (
    "id"              SERIAL PRIMARY KEY,
    "date"            DATE NOT NULL,
    "originalId"      INTEGER,
    "batchId"         TEXT NOT NULL,
    -- スタッフ情報の非正規化（検索最適化）
    "staffId"         INTEGER NOT NULL,
    "staffEmpNo"      TEXT,
    "staffName"       TEXT NOT NULL,
    "staffDepartment" TEXT NOT NULL,
    "staffGroup"      TEXT NOT NULL,
    "staffIsActive"   BOOLEAN NOT NULL DEFAULT true,
    -- スケジュール情報
    "status"          TEXT NOT NULL,
    "start"           TIMESTAMP(3) NOT NULL,
    "end"             TIMESTAMP(3) NOT NULL,
    "memo"            TEXT,
    "reason"          TEXT,
    -- メタデータ
    "snapshotAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version"         TEXT NOT NULL DEFAULT '1.0',
    -- UTC対応
    "date_utc"        TIMESTAMP(3),
    "start_utc"       TIMESTAMP(3),
    "end_utc"         TIMESTAMP(3),
    "snapshotAt_utc"  TIMESTAMP(3)
);
```

**特徴**
- **日次スナップショット**: 過去データの完全保存
- **非正規化設計**: 検索効率のためスタッフ情報を複製
- **バッチ追跡**: `batchId`によるスナップショット単位管理
- **将来対応**: `version`によるスキーマ変更対応

#### audit_logs（監査ログ）
```sql
CREATE TABLE "audit_logs" (
    "id"           TEXT PRIMARY KEY,
    "userId"       TEXT NOT NULL,
    "action"       TEXT NOT NULL,
    "resource"     TEXT NOT NULL,
    "resourceId"   TEXT,
    "details"      TEXT,
    -- セッション情報
    "ipAddress"    TEXT,
    "userAgent"    TEXT,
    -- 結果追跡
    "success"      BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "timestamp"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY ("userId") REFERENCES "user_auth"("id") ON DELETE CASCADE
);
```

**特徴**
- **完全監査**: 全API操作の記録による完全な追跡可能性
- **エラー追跡**: 成功・失敗とエラーメッセージの詳細記録
- **検索最適化**: action, resource, timestampでの高速検索

### 5. 設定・プリセット管理

#### global_preset_settings（グローバルプリセット設定）
```sql
CREATE TABLE "global_preset_settings" (
    "id"                 INTEGER PRIMARY KEY DEFAULT 1,
    "presets"            JSON NOT NULL DEFAULT '[]',
    "categories"         JSON NOT NULL DEFAULT '[]',
    "pagePresetSettings" JSON NOT NULL DEFAULT '{}',
    "displaySettings"    JSON NOT NULL DEFAULT '{}',
    "departmentSettings" JSON NOT NULL DEFAULT '[]',
    "version"            TEXT NOT NULL DEFAULT '1.0.0',
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL,
    "updatedBy"          INTEGER,
    
    FOREIGN KEY ("updatedBy") REFERENCES "Staff"("id")
);
```

**特徴**
- **シングルトン**: `id`固定による単一設定レコード
- **JSON活用**: 柔軟な設定データの階層構造対応
- **楽観的ロック**: `version`による競合制御
- **変更追跡**: 設定変更者の記録

## テーブル間リレーションシップ

### 中核データフロー
```
Staff (1) ── 中心 ── (N) Adjustment
  │                     │
  ├─ (1) ─────── (N) Contract
  ├─ (1) ─────── (N) Schedule
  ├─ (1) ─────── (N) MonthlySchedule
  ├─ (1) ─────── (N) DailyAssignment
  ├─ (1) ─────── (N) TemporaryAssignment
  └─ (1) ─────── (0..1) user_auth
```

### 認証・権限フロー
```
user_auth (1) ─── (N) auth_sessions
    │
    ├─ (1) ─────── (N) audit_logs
    ├─ (1) ─────── (N) auth_audit_logs
    └─ (1) ─────── (N) password_reset_tokens
```

### 承認ワークフロー
```
Staff (管理者) ─── approvedBy ─── (N) Adjustment
Staff (管理者) ─── rejectedBy ─── (N) Adjustment
Adjustment (1) ─────────────── (N) PendingApprovalLog
```

## 2層データレイヤーシステムの実装

### アーキテクチャ概念
```
第1層（Contract）: 基本契約勤務時間
　　　　↓
第2層（Adjustment）: 個別調整・例外予定
　　　　↓
統合レイヤー: 最終的な有効スケジュール
```

### 統合処理ロジック
```typescript
interface UnifiedSchedule {
  staffId: number;
  date: string;
  layers: {
    contract: ContractSchedule | null;
    adjustment: AdjustmentSchedule | null;
  };
  effectiveSchedule: EffectiveSchedule;
}

// 優先順位
// 1. Adjustment（個別調整）- 最優先
// 2. Contract（基本契約）- 調整がない場合
// 3. null（休日・祝日・勤務なし）
```

### Contract処理の実装例（UTC対応）
```typescript
import { TimeUtils } from '../utils/time-utils';

// 祝日チェック
if (isHoliday(targetDate)) {
  return null; // 祝日は契約勤務なし
}

// UTC基準曜日判定（TimeUtilsクラス活用）
const dayOfWeek = TimeUtils.getUTCDayOfWeek(year, month, day);
const dayColumn = TimeUtils.getContractDayColumn(dayOfWeek);
const hoursString = contract[dayColumn]; // "09:00-18:00"

if (!hoursString) {
  return null; // 休日設定
}

// UTC時刻変換（TimeUtilsクラス活用）
const [start, end] = hoursString.split('-');
const dateString = TimeUtils.formatDateOnly(targetDate);

return {
  status: '勤務',
  start: TimeUtils.timeStringToUTC(start, dateString, true), // JST→UTC変換
  end: TimeUtils.timeStringToUTC(end, dateString, true),
  source: 'contract'
};
```

## 時刻処理のUTC実装状況

### 実装パターンの分類

#### パターンA: 既存カラム + UTC専用カラム（段階的移行）
```sql
-- Adjustmentテーブル
"date"            TIMESTAMP(3) NOT NULL,  -- 既存（JST混在）
"date_utc"        TIMESTAMP(3),           -- UTC専用
"start"           TIMESTAMP(3) NOT NULL,  -- 既存（JST混在）
"start_utc"       TIMESTAMP(3),           -- UTC専用
"end"             TIMESTAMP(3) NOT NULL,  -- 既存（JST混在）
"end_utc"         TIMESTAMP(3),           -- UTC専用
```

#### パターンB: UTC専用カラム（新規実装）
```sql
-- SnapshotLogテーブル
"targetDate_utc"  TIMESTAMP(3),           -- UTC専用
"startedAt_utc"   TIMESTAMP(3),           -- UTC専用
"completedAt_utc" TIMESTAMP(3),           -- UTC専用
```

### UTC実装状況マトリックス（最新実装状況反映）

| テーブル | 既存時刻カラム | UTC専用カラム | 実装状況 | 優先度 | 実装詳細 |
|---------|--------------|-------------|----------|--------|----------|
| **Adjustment** | 7個 | 7個 | ✅ 完全対応 | 核心 | 段階的移行対応済み |
| **HistoricalSchedule** | 4個 | 4個 | ✅ 完全対応 | 高 | スナップショット機能で完全UTC対応 |
| **SnapshotLog** | 3個 | 3個 | ✅ 完全対応 | 高 | 新規実装でUTC基準 |
| **Contract** | 2個 | 2個 | ✅ 新規実装 | 中 | UTC専用カラム追加済み |
| Schedule | 2個 | 0個 | ❌ 未対応 | 低 | 将来実装予定 |
| MonthlySchedule | 3個 | 0個 | ❌ 未対応 | 低 | 将来実装予定 |
| user_auth | 6個 | 0個 | ❌ 未対応 | 中 | 将来実装予定 |

### 段階的移行計画（実装状況更新）
1. **Phase 1**: 新規機能は全てUTC実装（✅ 完了）
2. **Phase 2**: 核心機能のUTC移行（✅ 完了 - Adjustment/Contract/Historical対応済み）
3. **Phase 3**: アプリケーション層でUTC処理切り替え（🔄 進行中 - TimeUtilsクラス実装済み）
4. **Phase 4**: 既存カラム削除（📋 長期計画）

### TimeUtilsクラス実装詳細
- **場所**: `/backend/src/utils/time-utils.ts`
- **機能**: 完全UTC基準の時刻処理統一
- **主要メソッド**:
  - `toUTC()`: 任意入力→UTC文字列変換
  - `toJST()`/`jstToUTC()`: JST↔UTC相互変換
  - `getUTCDayOfWeek()`: UTC基準曜日判定
  - `timeStringToUTC()`: 時刻文字列→UTC DateTime変換
- **準拠ルール**: CLAUDE.md時刻処理厳格ルール完全対応

## インデックス設計戦略

### 検索性能最適化
```sql
-- 履歴検索（日次レポート用）
CREATE INDEX "idx_historical_date_staff" ON "historical_schedules"("date", "staffId");
CREATE INDEX "idx_historical_date_dept" ON "historical_schedules"("date", "staffDepartment");
CREATE INDEX "idx_historical_batch" ON "historical_schedules"("batchId");

-- スケジュール検索（リアルタイム用）
CREATE INDEX "idx_adjustment_date_staff" ON "Adjustment"("date", "staffId");
CREATE INDEX "idx_adjustment_pending" ON "Adjustment"("isPending", "date");
```

### 認証・監査最適化
```sql
-- セッション管理
CREATE INDEX "idx_session_expires" ON "auth_sessions"("expiresAt");
CREATE INDEX "idx_session_active" ON "auth_sessions"("isActive", "lastActivityAt");

-- 監査ログ検索
CREATE INDEX "idx_audit_timestamp" ON "audit_logs"("timestamp" DESC);
CREATE INDEX "idx_audit_user_action" ON "audit_logs"("userId", "action", "timestamp");
```

### 管理機能最適化
```sql
-- 承認管理
CREATE INDEX "idx_approval_adjustment" ON "pending_approval_logs"("adjustmentId");
CREATE INDEX "idx_approval_actor_date" ON "pending_approval_logs"("actorId", "timestamp");

-- 契約キャッシュ
CREATE INDEX "idx_contract_cache_year_month" ON "ContractDisplayCache"("year", "month");
```

## 制約・整合性設計

### ユニーク制約（重複防止）
```sql
-- 基本マスター
"Contract"."empNo" UNIQUE              -- 社員番号重複防止
"Staff"."empNo" UNIQUE                 -- スタッフ社員番号重複防止
"user_auth"."email" UNIQUE             -- メールアドレス重複防止
"user_auth"."staffId" UNIQUE           -- 1スタッフ1認証アカウント

-- 複合ユニーク（業務ルール）
"MonthlySchedule"("staffId", "date", "start", "end") UNIQUE    -- 同時刻重複防止
"TemporaryAssignment"("staffId", "startDate", "endDate") UNIQUE -- 支援期間重複防止
```

### 外部キー制約（参照整合性）
```sql
-- カスケード削除（データ整合性）
"auth_sessions"."userAuthId" → "user_auth"."id" ON DELETE CASCADE
"UserPresetSettings"."staffId" → "Staff"."id" ON DELETE CASCADE

-- 参照制約（業務整合性）
"Adjustment"."approvedBy" → "Staff"."id"  -- 承認者存在確認
"Adjustment"."rejectedBy" → "Staff"."id"  -- 却下者存在確認
```

### 将来実装予定のCHECK制約
```sql
-- 時刻整合性
ALTER TABLE "Adjustment" ADD CONSTRAINT "chk_time_range" 
CHECK ("start" < "end");

-- 承認状態整合性
ALTER TABLE "Adjustment" ADD CONSTRAINT "chk_approval_state"
CHECK (
  ("isPending" = true AND "approvedAt" IS NULL AND "rejectedAt" IS NULL) OR
  ("isPending" = false AND ("approvedAt" IS NOT NULL OR "rejectedAt" IS NOT NULL))
);
```

## Enum型システム

### 権限・認証関連
```sql
enum UserType {
  ADMIN,           -- 管理者
  STAFF            -- 一般スタッフ
}

enum AdminRole {
  SUPER_ADMIN,     -- 全権限
  STAFF_ADMIN,     -- スタッフ管理
  SYSTEM_ADMIN     -- システム管理
}

enum ManagerPermission {
  READ,            -- 読み取り
  WRITE,           -- 書き込み
  APPROVE,         -- 承認
  DELETE           -- 削除
}
```

### システム管理関連
```sql
enum SnapshotStatus {
  RUNNING,         -- 実行中
  COMPLETED,       -- 完了
  FAILED,          -- 失敗
  ROLLED_BACK      -- ロールバック済み
}

enum AuthAction {
  LOGIN_ATTEMPT, LOGIN_SUCCESS, LOGIN_FAILURE,
  PASSWORD_SET, PASSWORD_CHANGE, LOGOUT,
  TOKEN_REFRESH, ACCOUNT_LOCKED, ACCOUNT_UNLOCKED
}
```

## 開発チーム向けガイドライン

### 必須実装ルール

#### 時刻処理（TimeUtilsクラス活用）
```typescript
// ✅ 正しい実装（TimeUtilsクラス使用）
import { TimeUtils } from '../utils/time-utils';

const utcTime = TimeUtils.nowUTC(); // '2025-07-09T12:00:00.000Z'
const jstDisplay = TimeUtils.toJST(utcTime); // 表示層でのみJST変換
const dayOfWeek = TimeUtils.getUTCDayOfWeek(2025, 7, 9); // UTC基準曜日判定

// ❌ 禁止事項
const jstTime = '2025-07-09T21:00:00+09:00'; // JST形式での保存禁止
const localDate = new Date(); // 直接Date生成禁止
```

#### 1分単位精度対応
```typescript
// フロントエンド: TIMELINE_CONFIG.MINUTES_STEP = 1
// バックエンド: TimeUtils.timeStringToUTC("09:30", "2025-07-09")
// → 1分単位での正確な時間計算・表示
```

#### 2層データ統合
```typescript
// 必須: 統合APIの活用
const schedule = await getUnifiedSchedule(staffId, date);
// schedule.layers.contract    - 基本契約
// schedule.layers.adjustment  - 個別調整
// schedule.effectiveSchedule  - 有効な予定
```

#### 承認ワークフロー
```typescript
// 承認処理の実装例
await updateAdjustment(id, {
  isPending: false,
  approvedAt: new Date().toISOString(),
  approvedBy: currentUserId
});

// 監査ログ記録
await createAuditLog({
  userId: currentUserId,
  action: 'APPROVE_ADJUSTMENT',
  resource: 'Adjustment',
  resourceId: id
});
```

### パフォーマンス最適化

#### インデックス活用
```sql
-- 日付範囲検索の最適化
SELECT * FROM "Adjustment" 
WHERE "date" BETWEEN '2025-07-01' AND '2025-07-31'
  AND "staffId" IN (1, 2, 3)
ORDER BY "date", "staffId";
-- → idx_adjustment_date_staff を活用
```

#### キャッシュ戦略
```typescript
// ContractDisplayCache の活用
const cachedData = await getCachedContractDisplay(year, month);
if (!cachedData) {
  const contractData = await generateContractDisplay(year, month);
  await setCachedContractDisplay(year, month, contractData);
}
```

### セキュリティ要件

#### 権限チェック実装
```typescript
// 段階的権限チェック（復旧予定機能）
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'STAFF')
async updateSchedule(@CurrentUser() user, @Param('id') id: number) {
  // STAFF は自分の予定のみ編集可能
  if (user.userType === 'STAFF' && schedule.staffId !== user.staffId) {
    throw new ForbiddenException();
  }
}
```

#### 監査ログ記録
```typescript
// 全データ変更操作での監査ログ
await this.auditService.log({
  userId: user.id,
  action: 'UPDATE_SCHEDULE',
  resource: 'Adjustment',
  resourceId: schedule.id,
  details: JSON.stringify(changes),
  ipAddress: request.ip,
  userAgent: request.headers['user-agent']
});
```

### データ移行・バックアップ戦略

#### スナップショット機能
```typescript
// 日次スナップショット
await createDailySnapshot({
  targetDate: '2025-07-09',
  batchId: generateBatchId(),
  includeHistorical: true
});
```

#### ロールバック対応
```typescript
// バッチ単位でのロールバック
await rollbackBatch({
  batchId: 'BATCH_20250709_001',
  reason: 'データ不整合により復旧'
});
```

### 注意すべき制約事項

#### WebSocket制約
- 現在50-100人程度が性能限界と推測（N×N通信問題）
- 2層データ統合による複雑性増加
- リアルタイム更新の頻度制限

#### 業務要件制約
- 受付チーム要件による最適化制限
- 承認ワークフローの業務継続性優先
- 300名企業での実運用実績による安定性重視

---

**文書バージョン**: 1.1.0  
**作成日**: 2025-07-09  
**最終更新**: 2025-07-09（時刻処理実装状況反映）  
**対象**: 開発チーム  
**更新責任者**: 町田　純 

### 主要更新内容（v1.1.0）
- UTC実装状況マトリックス正確化（Contract/HistoricalSchedule完全対応反映）
- TimeUtilsクラス実装詳細追加
- workArrangement必須化反映
- 1分単位精度対応実装状況追加
- 実装例コードのTimeUtils活用に更新