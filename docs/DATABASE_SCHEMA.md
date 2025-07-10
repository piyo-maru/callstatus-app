# データベーススキーマ詳細仕様書

## 概要
本資料は、コールステータスアプリケーションのデータベーススキーマについて、外注先パートナー向けに包括的な情報を提供します。

- **データベース**: PostgreSQL
- **ORM**: Prisma
- **テーブル数**: 27個
- **主要な設計原則**: 2層データレイヤー、UTC時刻処理、監査ログ、段階的認証

## 全テーブル構造

### 1. コアスケジュール管理

#### 1.1 Adjustment（調整予定）- 2層データレイヤーの第2層
```sql
CREATE TABLE "Adjustment" (
    "id"              SERIAL PRIMARY KEY,
    "date"            TIMESTAMP(3) NOT NULL,
    "status"          TEXT NOT NULL,
    "start"           TIMESTAMP(3) NOT NULL,
    "end"             TIMESTAMP(3) NOT NULL,
    "memo"            TEXT,
    "reason"          TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    "staffId"         INTEGER NOT NULL,
    "batchId"         TEXT,
    "approvedAt"      TIMESTAMP(3),
    "approvedBy"      INTEGER,
    "isPending"       BOOLEAN NOT NULL DEFAULT false,
    "pendingType"     TEXT,
    "rejectedAt"      TIMESTAMP(3),
    "rejectedBy"      INTEGER,
    "rejectionReason" TEXT,
    -- UTC時刻処理専用カラム
    "date_utc"        TIMESTAMP(3),
    "start_utc"       TIMESTAMP(3),
    "end_utc"         TIMESTAMP(3),
    "createdAt_utc"   TIMESTAMP(3),
    "updatedAt_utc"   TIMESTAMP(3),
    "approvedAt_utc"  TIMESTAMP(3),
    "rejectedAt_utc"  TIMESTAMP(3),
    
    FOREIGN KEY ("staffId") REFERENCES "Staff"("id"),
    FOREIGN KEY ("approvedBy") REFERENCES "Staff"("id"),
    FOREIGN KEY ("rejectedBy") REFERENCES "Staff"("id")
);
```

**特徴**:
- **承認ワークフロー**: `isPending`, `approvedAt`, `rejectedAt`
- **バッチ処理**: `batchId` でインポート単位を管理
- **UTC時刻処理**: 既存カラムに加えて `*_utc` カラムを追加
- **監査証跡**: 承認者・却下者の記録

#### 1.2 Contract（契約）- 2層データレイヤーの第1層
```sql
CREATE TABLE "Contract" (
    "id"             SERIAL PRIMARY KEY,
    "empNo"          TEXT NOT NULL UNIQUE,
    "name"           TEXT NOT NULL,
    "team"           TEXT NOT NULL,
    "email"          TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    "staffId"        INTEGER NOT NULL,
    "dept"           TEXT NOT NULL,
    -- 曜日別勤務時間（文字列形式: "09:00-18:00"）
    "fridayHours"    TEXT,
    "mondayHours"    TEXT,
    "saturdayHours"  TEXT,
    "sundayHours"    TEXT,
    "thursdayHours"  TEXT,
    "tuesdayHours"   TEXT,
    "wednesdayHours" TEXT,
    
    FOREIGN KEY ("staffId") REFERENCES "Staff"("id")
);
```

**特徴**:
- **曜日別勤務時間**: 各曜日ごとの基本勤務時間を文字列で保存
- **社員番号**: `empNo` でユニーク制約
- **部署・チーム**: `dept`, `team` で組織構造を管理

#### 1.3 Schedule（従来スケジュール）- 後方互換性
```sql
CREATE TABLE "Schedule" (
    "id"      SERIAL PRIMARY KEY,
    "status"  TEXT NOT NULL,
    "start"   TIMESTAMP(3) NOT NULL,
    "end"     TIMESTAMP(3) NOT NULL,
    "staffId" INTEGER NOT NULL,
    "memo"    TEXT,
    
    FOREIGN KEY ("staffId") REFERENCES "Staff"("id")
);
```

**特徴**:
- **レガシー対応**: 段階的移行のため残存
- **日付カラムなし**: 時刻情報から日付を抽出

#### 1.4 MonthlySchedule（月次スケジュール）
```sql
CREATE TABLE "MonthlySchedule" (
    "id"        SERIAL PRIMARY KEY,
    "date"      TIMESTAMP(3) NOT NULL,
    "status"    TEXT NOT NULL,
    "start"     TIMESTAMP(3) NOT NULL,
    "end"       TIMESTAMP(3) NOT NULL,
    "memo"      TEXT,
    "source"    TEXT NOT NULL DEFAULT 'csv',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "staffId"   INTEGER NOT NULL,
    
    FOREIGN KEY ("staffId") REFERENCES "Staff"("id"),
    UNIQUE("staffId", "date", "start", "end")
);
```

**特徴**:
- **重複防止**: 複合ユニーク制約
- **データソース**: `source` でインポート元を管理

### 2. スタッフ管理

#### 2.1 Staff（スタッフ）- 中核テーブル
```sql
CREATE TABLE "Staff" (
    "id"                    SERIAL PRIMARY KEY,
    "name"                  TEXT NOT NULL,
    "department"            TEXT NOT NULL,
    "group"                 TEXT NOT NULL,
    "authGracePeriod"       TIMESTAMP(3),
    "empNo"                 TEXT UNIQUE,
    "isActive"              BOOLEAN NOT NULL DEFAULT true,
    "deletedAt"             TIMESTAMP(3),
    "isManager"             BOOLEAN NOT NULL DEFAULT false,
    "managerActivatedAt"    TIMESTAMP(3),
    "managerDepartments"    TEXT[] DEFAULT ARRAY[]::TEXT[],
    "managerPermissions"    "ManagerPermission"[] DEFAULT ARRAY[]::"ManagerPermission"[],
    
    -- 多数の外部キー関係（省略）
);
```

**特徴**:
- **論理削除**: `deletedAt` によるソフトデリート
- **管理者機能**: `isManager`, `managerPermissions`
- **配列型**: PostgreSQL配列でマルチ選択データを管理
- **認証猶予期間**: `authGracePeriod` で段階的認証導入

#### 2.2 TemporaryAssignment（支援設定）
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

**特徴**:
- **期間設定**: 開始日・終了日で支援期間を管理
- **重複防止**: 同一スタッフの期間重複を防止
- **一時的部署変更**: 支援先部署・グループを記録

### 3. 認証・権限システム

#### 3.1 user_auth（ユーザー認証）
```sql
CREATE TABLE "user_auth" (
    "id"                    TEXT PRIMARY KEY,
    "email"                 TEXT NOT NULL UNIQUE,
    "password"              TEXT,
    "userType"              "UserType" NOT NULL,
    "isActive"              BOOLEAN NOT NULL DEFAULT true,
    "emailVerified"         DATETIME,
    "lastLoginAt"           DATETIME,
    "passwordSetAt"         DATETIME,
    "loginAttempts"         INTEGER NOT NULL DEFAULT 0,
    "lockedAt"              DATETIME,
    "staffId"               INTEGER UNIQUE,
    "adminRole"             "AdminRole",
    "externalId"            TEXT,
    "metadata"              JSON,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL,
    "deletedAt"             TIMESTAMP(3),
    
    FOREIGN KEY ("staffId") REFERENCES "Staff"("id")
);
```

**特徴**:
- **段階的認証**: パスワード未設定でもアカウント作成可能
- **ロック機能**: `loginAttempts`, `lockedAt` でブルートフォース対策
- **柔軟な権限**: `userType` + `adminRole` の二段階権限
- **外部認証**: `externalId` でSSO連携準備

#### 3.2 auth_sessions（認証セッション）
```sql
CREATE TABLE "auth_sessions" (
    "id"               TEXT PRIMARY KEY,
    "userAuthId"       TEXT NOT NULL,
    "token"            TEXT NOT NULL UNIQUE,
    "refreshToken"     TEXT UNIQUE,
    "expiresAt"        TIMESTAMP(3) NOT NULL,
    "ipAddress"        TEXT,
    "userAgent"        TEXT,
    "isActive"         BOOLEAN NOT NULL DEFAULT true,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refreshExpiresAt" TIMESTAMP(3),
    
    FOREIGN KEY ("userAuthId") REFERENCES "user_auth"("id") ON DELETE CASCADE
);
```

**特徴**:
- **JWT管理**: アクセストークン・リフレッシュトークンを管理
- **セッション追跡**: IP・UserAgent・最終アクティビティを記録
- **カスケード削除**: ユーザー削除時の自動クリーンアップ

### 4. 履歴・監査システム

#### 4.1 HistoricalSchedule（履歴スケジュール）
```sql
CREATE TABLE "historical_schedules" (
    "id"              SERIAL PRIMARY KEY,
    "date"            DATE NOT NULL,
    "originalId"      INTEGER,
    "batchId"         TEXT NOT NULL,
    "staffId"         INTEGER NOT NULL,
    "staffEmpNo"      TEXT,
    "staffName"       TEXT NOT NULL,
    "staffDepartment" TEXT NOT NULL,
    "staffGroup"      TEXT NOT NULL,
    "staffIsActive"   BOOLEAN NOT NULL DEFAULT true,
    "status"          TEXT NOT NULL,
    "start"           TIMESTAMP(3) NOT NULL,
    "end"             TIMESTAMP(3) NOT NULL,
    "memo"            TEXT,
    "reason"          TEXT,
    "snapshotAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version"         TEXT NOT NULL DEFAULT '1.0',
    -- UTC時刻処理専用カラム
    "date_utc"        TIMESTAMP(3),
    "start_utc"       TIMESTAMP(3),
    "end_utc"         TIMESTAMP(3),
    "snapshotAt_utc"  TIMESTAMP(3)
);
```

**特徴**:
- **スナップショット**: 日次で過去データを保存
- **非正規化**: 検索効率のためスタッフ情報を複製
- **バッチ管理**: `batchId` でスナップショット単位を管理
- **バージョン管理**: 将来的なスキーマ変更対応

#### 4.2 audit_logs（監査ログ）
```sql
CREATE TABLE "audit_logs" (
    "id"           TEXT PRIMARY KEY,
    "userId"       TEXT NOT NULL,
    "action"       TEXT NOT NULL,
    "resource"     TEXT NOT NULL,
    "resourceId"   TEXT,
    "details"      TEXT,
    "ipAddress"    TEXT,
    "userAgent"    TEXT,
    "success"      BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "timestamp"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY ("userId") REFERENCES "user_auth"("id") ON DELETE CASCADE
);
```

**特徴**:
- **完全監査**: 全API操作を記録
- **検索最適化**: action, resource, timestamp にインデックス
- **エラー追跡**: 成功・失敗とエラーメッセージを記録

### 5. 設定・プリセット管理

#### 5.1 GlobalPresetSettings（グローバルプリセット設定）
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

**特徴**:
- **シングルトン**: `id` 固定で単一レコード
- **JSON設定**: 柔軟な設定データをJSON形式で保存
- **楽観的ロック**: `version` による競合制御
- **更新者追跡**: 設定変更者を記録

#### 5.2 UserPresetSettings（ユーザープリセット設定）
```sql
CREATE TABLE "user_preset_settings" (
    "id"                 SERIAL PRIMARY KEY,
    "staffId"            INTEGER NOT NULL UNIQUE,
    "pagePresetSettings" JSON NOT NULL DEFAULT '{}',
    "lastModified"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL,
    
    FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE
);
```

**特徴**:
- **個人設定**: スタッフごとの個別設定
- **カスケード削除**: スタッフ削除時の自動クリーンアップ
- **最終更新**: 設定変更タイムスタンプ

### 6. 担当・支援システム

#### 6.1 DailyAssignment（日次担当）
```sql
CREATE TABLE "DailyAssignment" (
    "id"             SERIAL PRIMARY KEY,
    "staffId"        INTEGER NOT NULL,
    "date"           DATE NOT NULL,
    "assignmentType" VARCHAR(20) NOT NULL,
    "customLabel"    VARCHAR(50),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    
    FOREIGN KEY ("staffId") REFERENCES "Staff"("id")
);
```

**特徴**:
- **日付単位**: 日次の担当設定
- **型制限**: VARCHAR で文字数制限
- **カスタムラベル**: 柔軟な担当名設定

## テーブル間リレーションシップ

### 中核関係図
```
Staff (1) ←→ (N) Adjustment
  ↓
  └─ (1) ←→ (N) Contract
  └─ (1) ←→ (N) Schedule
  └─ (1) ←→ (N) MonthlySchedule
  └─ (1) ←→ (N) DailyAssignment
  └─ (1) ←→ (N) TemporaryAssignment
  └─ (1) ←→ (0..1) user_auth
```

### 認証関係図
```
user_auth (1) ←→ (N) auth_sessions
    ↓
    └─ (1) ←→ (N) audit_logs
    └─ (1) ←→ (N) auth_audit_logs
    └─ (1) ←→ (N) password_reset_tokens
```

### 承認関係図
```
Staff (1) ←→ (N) Adjustment [approvedBy]
Staff (1) ←→ (N) Adjustment [rejectedBy]
Adjustment (1) ←→ (N) PendingApprovalLog
```

## 主要インデックス設計

### 1. 検索性能最適化
```sql
-- 履歴スケジュール検索
CREATE INDEX "idx_historical_date" ON "historical_schedules"("date");
CREATE INDEX "idx_historical_date_staff" ON "historical_schedules"("date", "staffId");
CREATE INDEX "idx_historical_date_dept" ON "historical_schedules"("date", "staffDepartment");
CREATE INDEX "idx_historical_empno" ON "historical_schedules"("staffEmpNo");
CREATE INDEX "idx_historical_batch" ON "historical_schedules"("batchId");

-- 契約変更ログ
CREATE INDEX "idx_contract_change" ON "ContractChangeLog"("staffId", "changeDate");

-- 契約表示キャッシュ
CREATE INDEX "idx_contract_cache_year_month" ON "ContractDisplayCache"("year", "month");

-- スナップショットログ
CREATE INDEX "idx_snapshot_date" ON "snapshot_logs"("targetDate");
CREATE INDEX "idx_snapshot_status" ON "snapshot_logs"("status");
```

### 2. 認証・監査最適化
```sql
-- 認証セッション
CREATE INDEX "idx_auth_session_expires" ON "auth_sessions"("expiresAt");
CREATE INDEX "idx_auth_session_token" ON "auth_sessions"("token");
CREATE INDEX "idx_auth_session_refresh" ON "auth_sessions"("refreshToken");
CREATE INDEX "idx_auth_session_user" ON "auth_sessions"("userAuthId");

-- 監査ログ
CREATE INDEX "idx_audit_action" ON "audit_logs"("action");
CREATE INDEX "idx_audit_resource" ON "audit_logs"("resource");
CREATE INDEX "idx_audit_timestamp" ON "audit_logs"("timestamp");
CREATE INDEX "idx_audit_user" ON "audit_logs"("userId");

-- 承認ログ
CREATE INDEX "idx_approval_adjustment" ON "pending_approval_logs"("adjustmentId");
CREATE INDEX "idx_approval_actor" ON "pending_approval_logs"("actorId");
```

### 3. 管理者監査最適化
```sql
-- 管理者監査ログ
CREATE INDEX "idx_manager_audit_manager" ON "manager_audit_logs"("managerId");
CREATE INDEX "idx_manager_audit_target" ON "manager_audit_logs"("targetStaffId");
CREATE INDEX "idx_manager_audit_action" ON "manager_audit_logs"("action");
CREATE INDEX "idx_manager_audit_timestamp" ON "manager_audit_logs"("timestamp");

-- システム管理者監査ログ
CREATE INDEX "idx_admin_audit_admin" ON "admin_audit_logs"("adminId");
CREATE INDEX "idx_admin_audit_action" ON "admin_audit_logs"("action");
CREATE INDEX "idx_admin_audit_timestamp" ON "admin_audit_logs"("timestamp");
```

## 時刻関連カラムのUTC実装状況

### 1. UTC実装パターン

#### パターンA: 既存カラム + UTC専用カラム
```sql
-- Adjustment テーブル
"date"            TIMESTAMP(3) NOT NULL,       -- 既存（JST混在）
"date_utc"        TIMESTAMP(3),                -- UTC専用
"start"           TIMESTAMP(3) NOT NULL,       -- 既存（JST混在）
"start_utc"       TIMESTAMP(3),                -- UTC専用
"end"             TIMESTAMP(3) NOT NULL,       -- 既存（JST混在）
"end_utc"         TIMESTAMP(3),                -- UTC専用
"createdAt"       TIMESTAMP(3) NOT NULL,       -- 既存（JST混在）
"createdAt_utc"   TIMESTAMP(3),                -- UTC専用
"updatedAt"       TIMESTAMP(3) NOT NULL,       -- 既存（JST混在）
"updatedAt_utc"   TIMESTAMP(3),                -- UTC専用
"approvedAt"      TIMESTAMP(3),                -- 既存（JST混在）
"approvedAt_utc"  TIMESTAMP(3),                -- UTC専用
"rejectedAt"      TIMESTAMP(3),                -- 既存（JST混在）
"rejectedAt_utc"  TIMESTAMP(3),                -- UTC専用
```

#### パターンB: UTC専用カラム
```sql
-- HistoricalSchedule テーブル
"date_utc"        TIMESTAMP(3),                -- UTC専用
"start_utc"       TIMESTAMP(3),                -- UTC専用
"end_utc"         TIMESTAMP(3),                -- UTC専用
"snapshotAt_utc"  TIMESTAMP(3),                -- UTC専用
```

#### パターンC: 段階的移行中
```sql
-- SnapshotLog テーブル
"targetDate_utc"  TIMESTAMP(3),                -- UTC専用
"startedAt_utc"   TIMESTAMP(3),                -- UTC専用
"completedAt_utc" TIMESTAMP(3),                -- UTC専用
```

### 2. UTC実装状況一覧

| テーブル | 既存時刻カラム | UTC専用カラム | 実装状況 |
|---------|--------------|-------------|----------|
| Adjustment | 7個 | 7個 | 完全対応 |
| Contract | 2個 | 0個 | 未対応 |
| Schedule | 2個 | 0個 | 未対応 |
| MonthlySchedule | 3個 | 0個 | 未対応 |
| Staff | 3個 | 0個 | 未対応 |
| HistoricalSchedule | 3個 | 4個 | 部分対応 |
| SnapshotLog | 3個 | 3個 | 完全対応 |
| user_auth | 6個 | 0個 | 未対応 |
| auth_sessions | 4個 | 0個 | 未対応 |

### 3. 時刻処理実装ガイドライン

#### 必須ルール
1. **内部処理は完全UTC**: 計算・比較は全てUTCで実行
2. **文字列はISO-8601 (Z付き)**: `2025-07-09T12:00:00.000Z`
3. **入出力層のみJST変換**: ユーザー表示・入力時のみ変換
4. **1分単位精度**: Excel Online互換の1分単位計算

#### 段階的移行計画
1. **Phase 1**: 新規カラムは全てUTC
2. **Phase 2**: 既存カラムにUTC専用カラムを追加
3. **Phase 3**: アプリケーション層でUTC処理に切り替え
4. **Phase 4**: 既存カラムを削除（長期計画）

## 2層データレイヤーの実際のテーブル構成

### 概要
```
レイヤー1（Contract）: 基本契約勤務時間
　　　　　　↓
レイヤー2（Adjustment）: 個別調整・例外予定
```

### 1. Contract テーブル（第1層）

#### 役割
- **基本契約**: 週次・月次の定期勤務時間
- **曜日別設定**: 各曜日の勤務時間パターン
- **祝日対応**: 祝日は契約勤務なし

#### データ構造
```sql
-- 曜日別勤務時間（例）
"mondayHours"    = "09:00-18:00"    -- 月曜日
"tuesdayHours"   = "09:00-18:00"    -- 火曜日
"wednesdayHours" = "09:00-18:00"    -- 水曜日
"thursdayHours"  = "09:00-18:00"    -- 木曜日
"fridayHours"    = "09:00-18:00"    -- 金曜日
"saturdayHours"  = NULL             -- 土曜日（休日）
"sundayHours"    = NULL             -- 日曜日（休日）
```

#### 処理ロジック
```typescript
// 祝日判定による無効化
if (isHoliday(targetDate)) {
  return null; // 祝日は契約勤務なし
}

// 曜日別勤務時間取得
const dayOfWeek = getDayOfWeek(targetDate);
const hoursString = contract[`${dayOfWeek}Hours`];
if (!hoursString) {
  return null; // 休日
}

// 時間パース
const [start, end] = hoursString.split('-');
return {
  status: '勤務',
  start: `${targetDate}T${start}:00.000Z`,
  end: `${targetDate}T${end}:00.000Z`,
  source: 'contract'
};
```

### 2. Adjustment テーブル（第2層）

#### 役割
- **個別調整**: 休暇、早退、残業、出張等
- **例外予定**: 契約勤務時間からの変更
- **承認ワークフロー**: 管理者承認による確定

#### データ構造
```sql
-- 調整予定の例
INSERT INTO "Adjustment" (
    "staffId", "date", "status", "start", "end", 
    "reason", "isPending", "memo"
) VALUES (
    1, '2025-07-09', '早退', 
    '2025-07-09T09:00:00.000Z', '2025-07-09T15:00:00.000Z',
    '体調不良', false, '病院受診のため'
);
```

### 3. 統合処理（LayerManagerService）

#### 統合ロジック
```typescript
async getUnifiedSchedule(staffId: number, date: string) {
  // 第1層: Contract取得
  const contract = await this.getContractSchedule(staffId, date);
  
  // 第2層: Adjustment取得
  const adjustment = await this.getAdjustmentSchedule(staffId, date);
  
  // 統合処理
  return {
    staffId,
    date,
    layers: {
      contract,      // 基本契約勤務時間
      adjustment     // 個別調整（あれば）
    },
    effectiveSchedule: adjustment || contract  // 有効な予定
  };
}
```

#### 優先順位
1. **Adjustment**: 個別調整が最優先
2. **Contract**: 調整がない場合の基本勤務時間
3. **null**: 休日・祝日・勤務なし

### 4. 承認ワークフロー統合

#### Pending状態の管理
```sql
-- 承認待ち予定
"isPending" = true
"approvedAt" = NULL
"approvedBy" = NULL

-- 承認済み予定
"isPending" = false
"approvedAt" = '2025-07-09T10:00:00.000Z'
"approvedBy" = 5  -- 管理者ID

-- 却下予定
"isPending" = false
"rejectedAt" = '2025-07-09T10:00:00.000Z'
"rejectedBy" = 5  -- 管理者ID
"rejectionReason" = '理由が不明確'
```

#### 承認ログ
```sql
-- PendingApprovalLog テーブル
INSERT INTO "pending_approval_logs" (
    "adjustmentId", "action", "actorId", "reason"
) VALUES (
    123, 'APPROVED', 5, '承認理由'
);
```

### 5. キャッシュ最適化

#### ContractDisplayCache
```sql
-- 月次表示用キャッシュ
CREATE TABLE "ContractDisplayCache" (
    "staffId"     INTEGER,
    "year"        INTEGER,
    "month"       INTEGER,
    "day"         INTEGER,
    "hasContract" BOOLEAN,
    
    PRIMARY KEY ("staffId", "year", "month", "day"),
    INDEX ("year", "month")
);
```

**目的**:
- 月次計画表示の高速化
- 契約勤務日の事前計算
- 大量データの表示最適化

## 制約・ユニーク制約一覧

### 1. ユニーク制約
```sql
-- 基本ユニーク制約
"Contract"."empNo" UNIQUE
"Staff"."empNo" UNIQUE
"user_auth"."email" UNIQUE
"user_auth"."staffId" UNIQUE

-- 複合ユニーク制約
"MonthlySchedule"("staffId", "date", "start", "end") UNIQUE
"TemporaryAssignment"("staffId", "startDate", "endDate") UNIQUE
"DepartmentSettings"("type", "name") UNIQUE
"UserPreset"("userPresetSettingsId", "presetId") UNIQUE
```

### 2. 外部キー制約
```sql
-- カスケード削除
"user_auth"."staffId" → "Staff"."id"
"auth_sessions"."userAuthId" → "user_auth"."id" ON DELETE CASCADE
"UserPresetSettings"."staffId" → "Staff"."id" ON DELETE CASCADE

-- 参照整合性
"Adjustment"."staffId" → "Staff"."id"
"Adjustment"."approvedBy" → "Staff"."id"
"Adjustment"."rejectedBy" → "Staff"."id"
```

### 3. CHECK制約（将来実装予定）
```sql
-- 時刻整合性
ALTER TABLE "Adjustment" ADD CONSTRAINT "chk_time_range" 
CHECK ("start" < "end");

-- 承認状態整合性
ALTER TABLE "Adjustment" ADD CONSTRAINT "chk_approval_state"
CHECK (("isPending" = true) OR ("approvedAt" IS NOT NULL) OR ("rejectedAt" IS NOT NULL));
```

## Enum型定義

### 1. 権限・認証関連
```sql
-- 管理者権限
enum AdminRole {
  SUPER_ADMIN     -- 全権限
  STAFF_ADMIN     -- スタッフ管理
  SYSTEM_ADMIN    -- システム管理
}

-- ユーザー種別
enum UserType {
  ADMIN           -- 管理者
  STAFF           -- 一般スタッフ
}

-- 認証アクション
enum AuthAction {
  LOGIN_ATTEMPT, LOGIN_SUCCESS, LOGIN_FAILURE,
  PASSWORD_SET, PASSWORD_CHANGE, LOGOUT,
  TOKEN_REFRESH, ACCOUNT_LOCKED, ACCOUNT_UNLOCKED
}

-- トークン種別
enum TokenType {
  PASSWORD_RESET
  INITIAL_PASSWORD_SETUP
}
```

### 2. システム管理関連
```sql
-- スナップショット状態
enum SnapshotStatus {
  RUNNING         -- 実行中
  COMPLETED       -- 完了
  FAILED          -- 失敗
  ROLLED_BACK     -- ロールバック済み
}

-- 管理者権限
enum ManagerPermission {
  READ            -- 読み取り
  WRITE           -- 書き込み
  APPROVE         -- 承認
  DELETE          -- 削除
}
```

## 外注先向け実装ガイドライン

### 1. 開発時の注意事項
1. **UTC時刻処理**: 新規実装は必ず `*_utc` カラムを使用
2. **2層データ統合**: Contract + Adjustment の統合ロジックを活用
3. **承認ワークフロー**: `isPending` フラグによる状態管理
4. **監査ログ**: 全データ変更は監査ログに記録
5. **カスケード削除**: 関連データの自動削除を考慮

### 2. パフォーマンス考慮事項
1. **インデックス活用**: 日付・スタッフIDの複合検索を最適化
2. **キャッシュ利用**: ContractDisplayCache の活用
3. **バッチ処理**: 大量データはbatchIdでグループ化
4. **JSON活用**: 柔軟な設定データはJSONで保存

### 3. セキュリティ要件
1. **権限チェック**: 段階的認証システムの実装
2. **監査証跡**: 全操作の完全な記録
3. **データ暗号化**: パスワード等の機密データ保護
4. **アクセス制御**: Row Level Security の実装検討

---

**更新日**: 2025-07-09  
**バージョン**: 1.0.0  
**担当**: システム開発チーム