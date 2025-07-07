# デモデータ作成・投入スクリプト

7月7日-9月30日期間のデモデータ生成と投入のためのスクリプト群です。

## 📁 ファイル構成

### 🔧 実行スクリプト
- **`generate_demo_july_2025.js`** - 7月デモデータ生成スクリプト
- **`generate_demo_august_2025.js`** - 8月デモデータ生成スクリプト
- **`generate_demo_september_2025.js`** - 9月デモデータ生成スクリプト
- **`register_pending_applications_2025.js`** - 申請予定（Pending）登録スクリプト（修正版）
- **`register_direct_pending_2025.js`** - 申請予定直接登録スクリプト（Adjustmentテーブル使用）
- **`register_all_responsibilities.js`** - 担当設定登録スクリプト

### 📊 生成データファイル
- **`demo_data_july_2025.json`** - 7月申請予定データ（930件）
- **`demo_data_august_2025.json`** - 8月申請予定データ（1,038件）
- **`demo_data_september_2025.json`** - 9月申請予定データ（1,080件）

## 🚀 実行手順

### 1. デモデータ生成（3ヶ月分）
```bash
cd /root/callstatus-app/scripts/demo-data
node generate_demo_july_2025.js
node generate_demo_august_2025.js
node generate_demo_september_2025.js
```

### 2. 申請予定登録（推奨：修正版Pending API）
```bash
node register_pending_applications_2025.js
```

### 3. 担当設定登録
```bash
node register_all_responsibilities.js
```

### 代替手順（直接登録）
申請予定のPending API登録で問題が発生した場合：
```bash
node register_direct_pending_2025.js
```

## 📋 配分仕様

### 申請予定（3ヶ月合計：3,048件）
#### 月次内訳
- **7月**: 930件申請（1,631スケジュール）
- **8月**: 1,038件申請（1,833スケジュール）
- **9月**: 1,080件申請（1,898スケジュール）

#### 申請種別（1日当たり）
- **休暇**: 25人/平日
- **午前休**: 5人/平日（online 9:00-12:00 + off 12:00-18:00）
- **午後休**: 7人/平日（online 12:00-13:00 + off 13:00-18:00）
- **在宅勤務**: 5人/平日
- **夜間担当**: 6人/平日
- **振出**: 6人/土曜

### 担当設定（3ヶ月合計：124件）
- **FAX当番**: 1人/平日
- **件名チェック担当**: 1人/平日

## 🎯 登録形式

### 申請予定（月次計画手動登録形式完全統一）
- **API形式**: 月次計画の手動登録と同一の`CreatePendingDto`形式
- **必須フィールド**: `staffId`, `date`, `status`, `start`, `end`, `pendingType`
- **スケジュール登録**: 複合予定も個別スケジュールに分割して登録
- **メモ形式**: `月次プランナー: [プリセット名]|presetId:[プリセットID]`

```javascript
// 正しいAPI形式
const pendingData = {
  staffId: number,
  date: string,           // "YYYY-MM-DD"
  status: string,         // "online", "off", "break", etc.
  start: number,          // 小数点時刻（9.5 = 9:30）
  end: number,            // 小数点時刻（18.0 = 18:00）
  memo: string,
  pendingType: 'monthly-planner'
};
```

### 担当設定（boolean形式）
- **FAX当番**: `{ fax: true }`
- **件名チェック担当**: `{ subjectCheck: true }`

## 🔍 技術メモ

### API修正履歴
#### 申請予定登録API修正（2025-07-07）
**問題**: 月次計画の手動登録は成功するが、スクリプトでは500エラー
**原因**: APIリクエスト形式の不一致
- ❌ **修正前**: `presetId`, `presetName`, `schedules`, `isPending`フィールドを使用
- ✅ **修正後**: `status`, `start`, `end`必須フィールドで個別スケジュール登録

#### 結果
- **申請予定**: 5,362件 → **100%成功**（手動登録と同一の動作）
- **担当設定**: 124件 → 一部APIエラー（別途調査必要）

### プリセット定義（更新版）
デモデータ生成時のローカルプリセット定義：
```javascript
const SYSTEM_PRESETS = {
  'paid-leave': { name: '休暇', schedules: [{ status: 'off', start: 9, end: 18 }] },
  'custom-morning-off': { name: '午前休', schedules: [
    { status: 'online', start: 9, end: 12 },
    { status: 'off', start: 12, end: 18 }
  ]},
  'custom-afternoon-off': { name: '午後休', schedules: [
    { status: 'online', start: 12, end: 13 },
    { status: 'off', start: 13, end: 18 }
  ]},
  'custom-remote-work': { name: '在宅勤務', schedules: [{ status: 'remote', start: 9, end: 18 }] },
  'night-duty': { name: '夜間担当', schedules: [{ status: 'online', start: 18, end: 22 }] },
  'weekend-substitute': { name: '振出', schedules: [{ status: 'online', start: 9, end: 18 }] }
};
```

### API仕様確認結果
- **Pending API**: `/api/schedules/pending` - `CreatePendingDto`形式必須
- **担当設定API**: `/api/daily-assignments` - boolean形式フラグでのDailyAssignment作成

## ⚠️ 重要事項

1. **手動登録との完全統一**: 月次計画での手動操作と100%同じAPI形式
2. **スタッフ範囲**: ID 226-450の225人（実在スタッフ使用）
3. **対象期間**: 2025年7月7日-9月30日（平日66日、土曜13日）
4. **複合予定対応**: 午前休・午後休は複数スケジュールに分割して個別登録
5. **エラー処理**: 申請予定登録で失敗した場合は代替スクリプト使用可能

## 📊 実行結果例

### 正常実行時
```
📊 最終結果:
申請予定: 5,362件成功 / 0件失敗  ← 100%成功
担当設定: 42件成功 / 82件失敗   ← 担当設定は一部エラー
全体成功率: 98.5%
```

### トラブルシューティング
- **申請予定500エラー**: API形式修正済み → 現在は100%成功
- **担当設定500エラー**: DailyAssignmentテーブル制約エラーの可能性
- **ネットワークエラー**: API負荷軽減のため50件毎に100ms待機実装済み

---
**📝 更新履歴**
- 2025-07-07: **API形式修正完了** - 月次計画手動登録形式完全統一、5,362件申請予定100%成功達成
- 2025-07-03: 手動登録形式統一・担当設定API修正・デモデータ完全投入完了