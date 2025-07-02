const fs = require('fs');

// CSVファイルを読み込み
const csvContent = fs.readFileSync('/root/callstatus-app/artifacts/07_plan_sample_utf8.csv', 'utf8');
const lines = csvContent.trim().split('\n');

// スタッフIDマッピング（既存のマッピングを使用）
const staffIdMapping = {
  3: 1,   // 行3 → staff_id 1 (田中太郎)
  4: 2,   // 行4 → staff_id 2 (佐藤花子)
  5: 3,   // 行5 → staff_id 3 (山田次郎)
  6: 4,   // 行6 → staff_id 4 (鈴木美咲)
  7: 5,   // 行7 → staff_id 5 (高橋健太)
  8: 6,   // 行8 → staff_id 6 (伊藤美由紀)
  9: 7,   // 行9 → staff_id 7 (渡辺雄一)
  10: 8,  // 行10 → staff_id 8 (中村さくら)
  // 追加のマッピング（必要に応じて）
  11: 9, 12: 10, 13: 11, 14: 12, 15: 13, 16: 14, 17: 15, 18: 16,
  19: 17, 20: 18, 21: 19, 22: 20, 23: 21, 24: 22, 25: 23, 26: 24,
  27: 25, 28: 26, 29: 27, 30: 28, 31: 29, 32: 30, 33: 31, 34: 32,
  35: 33, 36: 34, 37: 35, 38: 36, 39: 37, 40: 38, 41: 39, 42: 40,
  43: 41, 44: 42, 45: 43, 46: 44, 47: 45, 48: 46, 49: 47, 50: 48,
  51: 49, 52: 50, 53: 51, 54: 52, 55: 53, 56: 54, 57: 55, 58: 56,
  59: 57, 60: 58, 61: 59, 62: 60, 63: 61, 64: 62, 65: 63, 66: 64,
  67: 65, 68: 66, 69: 67, 70: 68, 71: 69, 72: 70, 73: 71, 74: 72,
  75: 73, 76: 74, 77: 75, 78: 76, 79: 77, 80: 78, 81: 79, 82: 80,
  83: 81, 84: 82, 85: 83, 86: 84, 87: 85, 88: 86, 89: 87, 90: 88,
  91: 89, 92: 90, 93: 91, 94: 92, 95: 93, 96: 94, 97: 95, 98: 96,
  99: 97, 100: 98, 101: 99, 102: 100
};

// プリセットマッピング（CSVの予定 → プリセットID）
const presetMapping = {
  '全休': 'day-off',
  'ドック休': 'medical-checkup',
  'ドック': 'medical-checkup', 
  'チェック': 'medical-checkup',
  '夏休': 'vacation',
  '在宅': 'remote-work',
  '出張': 'business-trip',
  '振休': 'compensatory-leave',
  '振出': 'makeup-work',
  '通院後出社': 'medical-appointment'
};

// 時間パターンの解析（プリセット対応版）
function parseTimePatternWithPreset(cellValue) {
  if (!cellValue || cellValue.trim() === '') return null;
  
  const value = cellValue.trim();
  
  // プリセットマッピングをチェック
  for (const [key, presetId] of Object.entries(presetMapping)) {
    if (value.includes(key)) {
      return {
        presetId: presetId,
        memo: `preset:${presetId}|${value}`
      };
    }
  }
  
  // 退社時間パターン → 半休プリセット
  if (value.includes('退社')) {
    const timeMatch = value.match(/(\d{1,2}):?(\d{0,2})/);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      if (hour <= 15) {
        return {
          presetId: 'morning-half-day',
          memo: `preset:morning-half-day|${value}`
        };
      } else {
        return {
          presetId: 'early-leave',
          memo: `preset:early-leave|${value}`
        };
      }
    }
  }
  
  // 出社時間パターン → 遅刻・午後半休
  if (value.includes('出社')) {
    const timeMatch = value.match(/(\d{1,2}):?(\d{0,2})/);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      if (hour >= 13) {
        return {
          presetId: 'afternoon-half-day',
          memo: `preset:afternoon-half-day|${value}`
        };
      } else {
        return {
          presetId: 'late-arrival',
          memo: `preset:late-arrival|${value}`
        };
      }
    }
  }
  
  // 数字のみ（21など）→ 会議・打ち合わせ
  if (/^\d+$/.test(value)) {
    const hour = parseInt(value);
    if (hour >= 8 && hour <= 21) {
      return {
        presetId: 'meeting',
        memo: `preset:meeting|${hour}時の会議`
      };
    }
  }
  
  // 月日パターン（9月18日など）→ 外部イベント
  if (value.includes('月') && value.includes('日')) {
    return {
      presetId: 'external-event',
      memo: `preset:external-event|${value}`
    };
  }
  
  return null;
}

// PendingSchedule生成（プリセット対応版）
function generatePendingSchedulesWithPresets() {
  const pendingSchedules = [];
  
  // 7月分のpending schedules
  for (let rowIndex = 3; rowIndex <= 195; rowIndex++) {
    const line = lines[rowIndex - 1];
    if (!line) continue;
    
    const cells = line.split(',');
    const staffId = staffIdMapping[rowIndex];
    
    if (!staffId) continue;
    
    for (let day = 1; day <= 31; day++) {
      const cellValue = cells[day - 1];
      const schedule = parseTimePatternWithPreset(cellValue);
      
      if (schedule) {
        pendingSchedules.push({
          staffId: staffId,
          date: `2025-07-${day.toString().padStart(2, '0')}`,
          presetId: schedule.presetId,
          memo: schedule.memo,
          isPending: true,
          submittedAt: new Date().toISOString(),
          submittedBy: staffId
        });
      }
    }
  }
  
  // 8月分のpending schedules (同じパターン)
  for (let rowIndex = 3; rowIndex <= 195; rowIndex++) {
    const line = lines[rowIndex - 1];
    if (!line) continue;
    
    const cells = line.split(',');
    const staffId = staffIdMapping[rowIndex];
    
    if (!staffId) continue;
    
    for (let day = 1; day <= 31; day++) {
      const cellValue = cells[day - 1];
      const schedule = parseTimePatternWithPreset(cellValue);
      
      if (schedule) {
        pendingSchedules.push({
          staffId: staffId,
          date: `2025-08-${day.toString().padStart(2, '0')}`,
          presetId: schedule.presetId,
          memo: schedule.memo,
          isPending: true,
          submittedAt: new Date().toISOString(),
          submittedBy: staffId
        });
      }
    }
  }
  
  return pendingSchedules;
}

// メイン実行
const pendingSchedules = generatePendingSchedulesWithPresets();
console.log(`生成されたpending schedules (プリセット対応): ${pendingSchedules.length}件`);

// JSON出力
fs.writeFileSync('/root/callstatus-app/pending_schedules_with_presets.json', 
  JSON.stringify(pendingSchedules, null, 2));

console.log('ファイル出力完了: pending_schedules_with_presets.json');

// 統計情報（プリセット別）
const stats = {};
pendingSchedules.forEach(schedule => {
  const month = schedule.date.substring(0, 7);
  if (!stats[month]) stats[month] = {};
  if (!stats[month][schedule.presetId]) stats[month][schedule.presetId] = 0;
  stats[month][schedule.presetId]++;
});

console.log('\nプリセット別統計情報:');
console.log(JSON.stringify(stats, null, 2));