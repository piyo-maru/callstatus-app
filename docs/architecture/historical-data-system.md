# 過去履歴表示機能 - システム設計書

## 📋 概要

コールステータスアプリの過去履歴表示機能は、指定した日付のスケジュールデータを過去の状態そのままで表示するシステムです。退職者・部署異動者を含む完全な過去データ復元を実現します。

## 🏗️ システム全体アーキテクチャ

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   クライアント        │    │   SchedulesController │    │   データ判定ロジック   │
│                     │    │                     │    │                     │
│ ?date=2025-07-04   │────▶│ GET /unified        │────▶│ 過去 or 現在判定     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
                                        │                          │
                                        ▼                          ▼
                           ┌─────────────────────┐    ┌─────────────────────┐
                           │   現在データ処理      │    │   履歴データ処理      │
                           │                     │    │                     │
                           │ LayerManagerService │    │ SnapshotsService    │
                           └─────────────────────┘    └─────────────────────┘
                                        │                          │
                                        ▼                          ▼
                           ┌─────────────────────┐    ┌─────────────────────┐
                           │   現在DB             │    │   履歴DB             │
                           │ ・Adjustment        │    │ ・HistoricalSchedule │
                           │ ・Contract          │    │ ・SnapshotLog       │
                           └─────────────────────┘    └─────────────────────┘
```

## 🔄 データフロー詳細

### 1. スナップショット作成フロー

```
毎日 00:05 JST
     │
     ▼
┌─────────────────────┐
│ Cronジョブ実行        │
│ @Cron('5 0 * * *')  │
└─────────────────────┘
     │
     ▼
┌─────────────────────┐    ┌─────────────────────┐
│ 前日データ取得        │────▶│ Adjustmentテーブル   │
│ (通常+承認済Pending) │    │ ・isPending=false   │
│                     │    │ ・承認済Pending     │
└─────────────────────┘    └─────────────────────┘
     │
     ▼
┌─────────────────────┐    ┌─────────────────────┐
│ データ変換・保存      │────▶│ HistoricalSchedule  │
│ +スタッフ情報埋込     │    │ ・過去状態スナップ   │
└─────────────────────┘    └─────────────────────┘
     │
     ▼
┌─────────────────────┐    ┌─────────────────────┐
│ ログ記録・完了確認    │────▶│ SnapshotLog         │
│ batchId生成・状態管理 │    │ ・実行履歴管理       │
└─────────────────────┘    └─────────────────────┘
```

### 2. 履歴データ取得フロー

```
API Request: /schedules/unified?date=2025-07-04
     │
     ▼
┌─────────────────────┐
│ 日付判定ロジック      │
│ targetDate < today? │
└─────────────────────┘
     │
     ▼ (過去日付の場合)
┌─────────────────────┐    ┌─────────────────────┐
│ 履歴データ取得        │────▶│ HistoricalSchedule  │
│ getHistoricalSchedules │    │ WHERE date = target │
└─────────────────────┘    └─────────────────────┘
     │
     ▼
┌─────────────────────┐    ┌─────────────────────┐
│ 契約レイヤー動的生成   │────▶│ Contract            │
│ generateHistorical   │    │ (退職者も含む)       │
│ ContractSchedules    │    │                     │
└─────────────────────┘    └─────────────────────┘
     │
     ▼
┌─────────────────────┐
│ データ統合・レスポンス │
│ ・履歴層(adjustment) │
│ ・契約層(contract)   │
│ ・スタッフ情報復元    │
│ ・非在籍者マスキング  │
└─────────────────────┘
```

## 📊 主要テーブル設計

### HistoricalSchedule（履歴スケジュール）
```sql
CREATE TABLE "historical_schedules" (
  id              SERIAL PRIMARY KEY,
  date            DATE NOT NULL,                    -- 対象日付
  originalId      INTEGER,                          -- 元のAdjustment.id
  batchId         VARCHAR NOT NULL,                 -- スナップショット識別子
  
  -- スタッフ情報（スナップショット時点）
  staffId         INTEGER NOT NULL,
  staffEmpNo      VARCHAR,
  staffName       VARCHAR NOT NULL,
  staffDepartment VARCHAR NOT NULL,
  staffGroup      VARCHAR NOT NULL,
  staffIsActive   BOOLEAN DEFAULT true,
  
  -- スケジュール情報
  status          VARCHAR NOT NULL,
  start           TIMESTAMP NOT NULL,               -- UTC時刻
  end             TIMESTAMP NOT NULL,               -- UTC時刻
  memo            TEXT,
  reason          TEXT,
  
  -- メタデータ
  snapshotAt      TIMESTAMP DEFAULT NOW(),          -- スナップショット作成時刻
  version         VARCHAR DEFAULT '1.0',            -- データバージョン
  
  -- CLAUDE.md厳格ルール準拠: 新UTCカラム
  date_utc        TIMESTAMP WITH TIME ZONE,
  start_utc       TIMESTAMP WITH TIME ZONE,
  end_utc         TIMESTAMP WITH TIME ZONE,
  snapshotAt_utc  TIMESTAMP WITH TIME ZONE,
  
  -- インデックス
  INDEX idx_date (date),
  INDEX idx_date_staff (date, staffId),
  INDEX idx_date_dept (date, staffDepartment),
  INDEX idx_batch (batchId)
);
```

### SnapshotLog（スナップショット実行履歴）
```sql
CREATE TABLE "snapshot_logs" (
  id           SERIAL PRIMARY KEY,
  batchId      VARCHAR UNIQUE NOT NULL,             -- 実行識別子
  targetDate   DATE NOT NULL,                       -- 対象日付
  recordCount  INTEGER NOT NULL,                    -- 処理件数
  status       ENUM('RUNNING','COMPLETED','FAILED','ROLLED_BACK'),
  startedAt    TIMESTAMP DEFAULT NOW(),             -- 実行開始時刻
  completedAt  TIMESTAMP,                           -- 完了時刻
  errorMessage TEXT,                                 -- エラー詳細
  
  -- CLAUDE.md厳格ルール準拠: 新UTCカラム
  targetDate_utc   TIMESTAMP WITH TIME ZONE,
  startedAt_utc    TIMESTAMP WITH TIME ZONE,
  completedAt_utc  TIMESTAMP WITH TIME ZONE,
  
  INDEX idx_target_date (targetDate),
  INDEX idx_status (status)
);
```

## 💻 主要クラス・メソッド実装

### SnapshotsService

#### 自動スナップショット作成
```typescript
@Injectable()
export class SnapshotsService {
  /**
   * 日次スナップショット自動実行（毎日深夜0時5分JST）
   */
  @Cron('5 0 * * *', {
    name: 'daily-snapshot',
    timeZone: 'Asia/Tokyo'
  })
  async handleDailyCron() {
    const result = await this.createDailySnapshot();
    this.logger.log(`日次スナップショット完了: ${result.recordCount}件`);
  }

  /**
   * 前日分のスナップショットを自動作成
   */
  async createDailySnapshot() {
    const yesterday = this.getYesterday();
    const batchId = this.generateBatchId();
    
    return await this.executeSnapshot(yesterday, batchId);
  }

  /**
   * スナップショット実行の中核処理
   */
  private async executeSnapshot(date: Date, batchId: string) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. ログ開始記録
      await this.createSnapshotLog(tx, date, batchId);
      
      // 2. 対象データ取得（社員情報とスケジュール）
      const scheduleData = await this.getScheduleWithStaffInfo(tx, date);
      
      // 3. スナップショット作成
      const historicalData = this.transformToHistoricalData(scheduleData, batchId);
      
      if (historicalData.length > 0) {
        await this.saveHistoricalData(tx, historicalData);
      }
      
      // 4. ログ完了記録
      await this.completeSnapshotLog(tx, batchId, historicalData.length);
      
      return {
        batchId,
        targetDate: date,
        recordCount: historicalData.length,
        status: 'COMPLETED'
      };
    });
  }
}
```

#### 対象データ取得ロジック
```typescript
/**
 * 指定日のスケジュールデータを社員情報と共に取得
 * 通常のAdjustmentと承認済みPendingの両方を取得
 */
private async getScheduleWithStaffInfo(tx: any, date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  // 通常のAdjustmentと承認済みPendingレコードの両方を取得
  return await tx.adjustment.findMany({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay
      },
      OR: [
        { isPending: false },                    // 通常のAdjustment
        { isPending: true, approvedAt: { not: null } }  // 承認済みPending
      ]
    },
    include: {
      Staff: true
    }
  });
}
```

### SchedulesController

#### 統一API（現在/過去自動分岐）
```typescript
/**
 * 統合スケジュール取得API（現在/過去の自動分岐）
 * /schedules/unified?date=YYYY-MM-DD
 */
@Get('unified')
async findUnified(
  @Query('date') date: string,
  @Query('includeMasking') includeMasking?: string,
  @Query('staffId') staffId?: string
) {
  const targetDate_utc = this.parseTargetDateUtc(date);
  const businessToday_utc = this.getBusinessTodayUtc();

  const targetStaffId = staffId ? parseInt(staffId) : undefined;

  // 業務日基準で過去の日付は履歴データから取得
  if (targetDate_utc < businessToday_utc) {
    return this.getHistoricalSchedules(date, includeMasking === 'true', targetStaffId);
  } else {
    // 業務日基準で今日以降は現在のデータから取得
    return this.getCurrentSchedules(date, targetStaffId);
  }
}
```

#### 日付判定ロジック
```typescript
/**
 * 業務日基準での「今日」をUTC形式で取得
 * 日本時間（JST）での日付判定を行い、UTC形式で返す
 */
private getBusinessTodayUtc(): Date {
  // 現在のUTC時刻を取得
  const now_utc = new Date();
  
  // JST時刻に変換して日付を取得
  const now_jst = new Date(now_utc.getTime() + 9 * 60 * 60 * 1000);
  const jst_year = now_jst.getUTCFullYear();
  const jst_month = now_jst.getUTCMonth();
  const jst_date = now_jst.getUTCDate();
  
  // JST基準での「今日」の開始時刻をUTC形式で構築
  const businessToday_jst = new Date(Date.UTC(jst_year, jst_month, jst_date, 0, 0, 0, 0));
  const businessToday_utc = new Date(businessToday_jst.getTime() - 9 * 60 * 60 * 1000);
  
  return businessToday_utc;
}
```

#### 履歴データ取得・統合処理
```typescript
/**
 * 履歴データを取得して返す（契約レイヤーも含む）
 */
private async getHistoricalSchedules(date: string, includeMasking: boolean = false, targetStaffId?: number) {
  console.log(`履歴データ取得開始: ${date}, マスキング: ${includeMasking}`);
  
  // 1. 履歴データ（調整レイヤー）を取得
  const historicalData = await this.snapshotsService.getHistoricalSchedules(date);
  console.log(`履歴データ取得完了: ${historicalData ? historicalData.length : 0}件`);
  
  // 2. 契約レイヤーを動的生成（退職者含む）
  let contractSchedules = [];
  try {
    contractSchedules = await this.layerManagerService.generateHistoricalContractSchedules(date);
    console.log(`契約レイヤー生成完了: ${contractSchedules.length}件`);
  } catch (error) {
    console.error(`契約レイヤー生成エラー: ${error.message}`);
    // 契約レイヤー生成に失敗しても履歴データは返す
  }

  // 3. スタッフ情報を履歴データと契約データから構築
  const staffMap = new Map();
  
  // 履歴データからスタッフ情報を構築
  if (historicalData) {
    for (const item of historicalData) {
      if (!staffMap.has(item.staffId)) {
        const maskedName = includeMasking 
          ? await this.maskStaffName(item.staffName, item.staffId)
          : item.staffName;
        
        staffMap.set(item.staffId, {
          id: item.staffId,
          empNo: item.staffEmpNo,
          name: maskedName,
          department: item.staffDepartment,
          group: item.staffGroup,
          isActive: item.staffIsActive
        });
      }
    }
  }

  // 4. スケジュールデータを変換
  const schedules = [];
  
  // 履歴データ（調整レイヤー）を追加
  if (historicalData) {
    const historicalSchedules = historicalData.map((item, index) => ({
      id: `hist_${item.id}_${index}`,
      staffId: item.staffId,
      status: item.status,
      start: this.convertUtcToJstDecimal(item.start),
      end: this.convertUtcToJstDecimal(item.end),
      memo: item.memo,
      layer: 'historical' // 履歴データは 'historical' レイヤー
    }));
    schedules.push(...historicalSchedules);
  }
  
  // 契約レイヤーを追加
  const contractSchedulesConverted = contractSchedules.map((cs, index) => ({
    id: `contract_hist_${cs.id}_${index}`,
    staffId: cs.staffId,
    status: cs.status,
    start: this.convertUtcToJstDecimal(cs.start),
    end: this.convertUtcToJstDecimal(cs.end),
    memo: cs.memo,
    layer: 'contract' // 契約データは 'contract' レイヤー
  }));
  schedules.push(...contractSchedulesConverted);

  console.log(`履歴データ統合完了: 履歴${historicalData ? historicalData.length : 0}件 + 契約${contractSchedules.length}件 = 合計${schedules.length}件`);

  return {
    schedules,
    staff: Array.from(staffMap.values()),
    isHistorical: true,
    snapshotDate: historicalData && historicalData.length > 0 ? historicalData[0]?.snapshotAt : null,
    recordCount: schedules.length,
    historicalRecords: historicalData ? historicalData.length : 0,
    contractRecords: contractSchedules.length
  };
}
```

## 🛡️ 重要機能

### 1. 非在籍社員マスキング
```typescript
/**
 * 非在籍社員名をマスキング
 */
private async maskStaffName(originalName: string, staffId: number): Promise<string> {
  try {
    // 現在のスタッフテーブルで該当者を確認
    const currentStaff = await this.schedulesService['prisma'].staff.findUnique({
      where: { id: staffId }
    });

    // 現在も在籍している場合は実名表示
    if (currentStaff && currentStaff.isActive) {
      return originalName;
    }

    // 退職済みまたは存在しない場合はマスキング
    return '非在籍社員';
  } catch (error) {
    console.error('Staff masking error:', error);
    return '不明な社員';
  }
}
```

### 2. エラーハンドリング・リトライ機能
```typescript
/**
 * 失敗時のリトライスケジューリング（1時間後、最大3回）
 */
@Cron('5 */1 * * *', {
  name: 'snapshot-retry',
  timeZone: 'Asia/Tokyo'
})
async handleRetryCron() {
  if (!this.isRetryRunning) {
    return;
  }

  const yesterday = this.getYesterday();
  const existingSnapshot = await this.checkExistingSnapshot(yesterday);

  if (existingSnapshot && existingSnapshot.status === 'COMPLETED') {
    this.logger.log('既に完了したスナップショットが存在するため、リトライを停止');
    this.isRetryRunning = false;
    return;
  }

  try {
    const result = await this.createDailySnapshot();
    this.logger.log(`スナップショット リトライ成功: ${result.recordCount}件`);
    this.isRetryRunning = false;
  } catch (error) {
    this.logger.error(`スナップショット リトライ失敗: ${error.message}`);
    
    // 3回失敗したらリトライを停止
    const failedCount = await this.getFailedRetryCount(yesterday);
    if (failedCount >= 3) {
      this.logger.error('リトライ回数上限に達したため、リトライを停止');
      this.isRetryRunning = false;
    }
  }
}
```

### 3. バッチID生成システム
```typescript
/**
 * バッチIDを生成
 * 形式: snap_YYYYMMDDTHHmmss_uuid
 */
private generateBatchId(): string {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
  const uuid = uuidv4().split('-')[0];
  return `snap_${timestamp}_${uuid}`;
}
```

## 📊 レスポンス形式

### 履歴データレスポンス
```json
{
  "schedules": [
    {
      "id": "hist_42456_0",
      "staffId": 226,
      "status": "Online",
      "start": 9.0,
      "end": 18.0,
      "memo": "通常勤務",
      "layer": "historical"
    },
    {
      "id": "contract_hist_226_0",
      "staffId": 226,
      "status": "Online",
      "start": 9.0,
      "end": 18.0,
      "memo": null,
      "layer": "contract"
    }
  ],
  "staff": [
    {
      "id": 226,
      "empNo": "E001",
      "name": "山田美月",
      "department": "財務情報第一システムサポート課",
      "group": "財務情報第一システムサポート課",
      "isActive": true
    }
  ],
  "isHistorical": true,
  "snapshotDate": "2025-07-04T15:05:23.456Z",
  "recordCount": 523,
  "historicalRecords": 298,
  "contractRecords": 225
}
```

### 現在データレスポンス
```json
{
  "schedules": [...],
  "staff": [...],
  "isHistorical": false
}
```

## ⚡ パフォーマンス最適化

### 1. インデックス戦略
```sql
-- 日付範囲検索最適化
CREATE INDEX idx_historical_schedules_date_utc ON historical_schedules(date_utc);
CREATE INDEX idx_historical_schedules_date_utc_staff ON historical_schedules(date_utc, staffId);
CREATE INDEX idx_historical_schedules_date_utc_dept ON historical_schedules(date_utc, staffDepartment);

-- バッチ処理最適化
CREATE INDEX idx_historical_schedules_batch ON historical_schedules(batchId);
CREATE INDEX idx_snapshot_logs_target_date_utc ON snapshot_logs(targetDate_utc);
```

### 2. データ圧縮・最適化
- スタッフ情報の重複排除
- 必要な場合のみstaffIdフィルタリング実行
- レスポンス時のメタデータ最小化

## 🚨 運用上の注意点

### 1. データ整合性
- スナップショット作成はトランザクション内で実行
- 既存データとの整合性チェック必須
- 失敗時のロールバック機能

### 2. タイムゾーン処理
- **内部処理**: 完全UTC基準
- **日付判定**: JST業務日基準
- **API入出力**: JST小数点時刻
- **CLAUDE.md厳格ルール準拠**: `*_utc`カラム命名

### 3. ストレージ管理
- 履歴データの肥大化対策
- 古いスナップショットの定期削除ポリシー
- バックアップ・復旧戦略

## 🔍 監視・メンテナンス

### 1. Cronジョブ監視
- 毎日のスナップショット作成成功確認
- 失敗時のアラート送信
- リトライ状況の監視

### 2. データ品質チェック
- 日次データ量の妥当性確認
- スタッフ情報の正確性検証
- 時刻データの整合性チェック

### 3. パフォーマンス監視
- API応答時間の測定
- データベースクエリ性能監視
- ディスク使用量の追跡

---

**📝 文書更新履歴**
- 2025-07-05: 初版作成 - CLAUDE.md厳格ルール準拠後の実装に基づく詳細設計書
- 実装参照: SnapshotsService, SchedulesController, LayerManagerService
- データ検証: 17,285件のAdjustmentデータでテスト済み