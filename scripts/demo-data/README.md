# デモデータ作成・投入スクリプト

7月3日-31日期間のデモデータ生成と投入のためのスクリプト群です。

## 📁 ファイル構成

### 🔧 実行スクリプト
- **`generate_july_demo_data.js`** - デモデータ生成メインスクリプト
- **`register_demo_pending_preset.js`** - 申請予定（Pending）登録スクリプト  
- **`register_all_responsibilities.js`** - 担当設定登録スクリプト
- **`test_responsibility_registration.js`** - 担当設定API動作テストスクリプト

### 📊 生成データファイル
- **`demo_data_july_system_presets.json`** - 生成されたデモデータ（申請予定1032件+担当設定42件）
- **`demo_batch_ids.json`** - 生成されたBatchID一覧（承認テスト用）

## 🚀 実行手順

### 1. デモデータ生成
```bash
cd /root/callstatus-app/scripts/demo-data
node generate_july_demo_data.js
```

### 2. 申請予定登録（Pending API使用）
```bash
node register_demo_pending_preset.js
```

### 3. 担当設定登録
```bash
node register_all_responsibilities.js
```

## 📋 配分仕様

### 申請予定（1,032件）
- **休暇**: 25人/平日 × 21平日 = 525件
- **午前休**: 5人/平日 × 21平日 = 105件  
- **午後休**: 7人/平日 × 21平日 = 147件
- **在宅勤務**: 5人/平日 × 21平日 = 105件
- **夜間担当**: 6人/平日 × 21平日 = 126件
- **振出**: 6人/土曜 × 4土曜 = 24件

### 担当設定（42件）
- **FAX当番**: 1人/平日 × 21平日 = 21件
- **件名チェック担当**: 1人/平日 × 21平日 = 21件

## 🎯 登録形式

### 申請予定（手動登録形式統一）
- **スケジュール数**: 単一スケジュール（複合予定から変更）
- **BatchID**: `null`（手動登録と同じ）
- **メモ形式**: `月次プランナー: [プリセット名]|presetId:[プリセットID]`

### 担当設定（boolean形式）
- **FAX当番**: `{ fax: true }`
- **件名チェック担当**: `{ subjectCheck: true }`

## 🔍 技術メモ

### プリセット定義
デモデータ生成時のローカルプリセット定義：
```javascript
const SYSTEM_PRESETS = {
  'paid-leave': { name: '休暇', schedules: [単一スケジュール] },
  'custom-morning-off': { name: '午前休', schedules: [単一スケジュール] },
  'custom-afternoon-off': { name: '午後休', schedules: [単一スケジュール] },
  'custom-remote-work': { name: '在宅勤務', schedules: [単一スケジュール] },
  'night-duty': { name: '夜間担当', schedules: [単一スケジュール] },
  'weekend-substitute': { name: '振出', schedules: [単一スケジュール] }
};
```

### API仕様対応
- **Pending API**: プリセット対応拡張済み（`schedules`配列サポート）
- **担当設定API**: boolean形式フラグでのDailyAssignment作成

## ⚠️ 重要事項

1. **Webアプリ本体は無変更**: デモデータ生成の内部定義のみ修正
2. **手動登録との統一**: UI操作と同じ形式でのデータ生成
3. **スタッフ範囲**: ID 226-450の225人（実在スタッフ使用）
4. **期間固定**: 2025年7月3日-31日（平日21日、土曜4日）

---
**📝 更新履歴**
- 2025-07-03: 手動登録形式統一・担当設定API修正・デモデータ完全投入完了