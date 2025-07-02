const fs = require('fs');

// CSVファイルを読み込み
const csvContent = fs.readFileSync('/root/callstatus-app/artifacts/07_plan_sample_utf8.csv', 'utf8');
const lines = csvContent.trim().split('\n');

// スタッフIDマッピング（195人分完全対応）
const staffIdMapping = {};

// CSV行3〜197を195人のスタッフID 1〜195にマッピング
for (let csvRow = 3; csvRow <= 197; csvRow++) {
  const staffId = csvRow - 2; // 行3 → staffId 1, 行4 → staffId 2, ...
  staffIdMapping[csvRow] = staffId;
}

console.log(`スタッフIDマッピング: ${Object.keys(staffIdMapping).length}人分生成`);

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

// プリセット定義（時間情報付き）
const presetSchedules = {
  'day-off': { status: 'Off', start: 540, end: 1080 },           // 全休 9:00-18:00
  'medical-checkup': { status: 'Medical', start: 540, end: 1080 }, // 健康診断 9:00-18:00
  'vacation': { status: 'Vacation', start: 540, end: 1080 },    // 夏休 9:00-18:00
  'remote-work': { status: 'Remote', start: 540, end: 1080 },   // 在宅 9:00-18:00
  'business-trip': { status: 'BusinessTrip', start: 540, end: 1080 }, // 出張 9:00-18:00
  'compensatory-leave': { status: 'CompensatoryLeave', start: 540, end: 1080 }, // 振休 9:00-18:00
  'makeup-work': { status: 'MakeupWork', start: 540, end: 1080 }, // 振出 9:00-18:00
  'medical-appointment': { status: 'Medical', start: 540, end: 1080 }, // 通院 9:00-18:00
  'meeting': { status: 'Meeting', start: 540, end: 600 },       // 会議 9:00-10:00（1時間）
  'external-event': { status: 'Meeting', start: 540, end: 1080 }, // 外部イベント 9:00-18:00
  'morning-half-day': { status: 'EarlyLeave', start: 540, end: 720 }, // 午前半休 9:00-12:00
  'afternoon-half-day': { status: 'LateArrival', start: 780, end: 1080 }, // 午後半休 13:00-18:00
  'late-arrival': { status: 'LateArrival', start: 600, end: 1080 }, // 遅刻 10:00-18:00
  'early-leave': { status: 'EarlyLeave', start: 540, end: 960 } // 早退 9:00-16:00
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

// Pending Adjustment生成（195人分）
function generateFullPendingAdjustments() {
  const pendingAdjustments = [];
  
  // 7月分
  for (let rowIndex = 3; rowIndex <= 197; rowIndex++) {
    const line = lines[rowIndex - 1];
    if (!line) continue;
    
    const cells = line.split(',');
    const staffId = staffIdMapping[rowIndex];
    
    if (!staffId) continue;
    
    for (let day = 1; day <= 31; day++) {
      const cellValue = cells[day - 1];
      const schedule = parseTimePatternWithPreset(cellValue);
      
      if (schedule) {
        const presetInfo = presetSchedules[schedule.presetId];
        if (presetInfo) {
          // 時間を分からDateTimeに変換
          const date = new Date(`2025-07-${day.toString().padStart(2, '0')}`);
          const startDateTime = new Date(date);
          startDateTime.setHours(Math.floor(presetInfo.start / 60), presetInfo.start % 60, 0, 0);
          const endDateTime = new Date(date);
          endDateTime.setHours(Math.floor(presetInfo.end / 60), presetInfo.end % 60, 0, 0);
          
          pendingAdjustments.push({
            staffId: staffId,
            date: `2025-07-${day.toString().padStart(2, '0')}`,
            status: presetInfo.status,
            start: startDateTime.toISOString(),
            end: endDateTime.toISOString(),
            memo: schedule.memo,
            isPending: true,
            submittedAt: new Date().toISOString()
          });
        }
      }
    }
  }
  
  // 8月分（同じパターン）
  for (let rowIndex = 3; rowIndex <= 197; rowIndex++) {
    const line = lines[rowIndex - 1];
    if (!line) continue;
    
    const cells = line.split(',');
    const staffId = staffIdMapping[rowIndex];
    
    if (!staffId) continue;
    
    for (let day = 1; day <= 31; day++) {
      const cellValue = cells[day - 1];
      const schedule = parseTimePatternWithPreset(cellValue);
      
      if (schedule) {
        const presetInfo = presetSchedules[schedule.presetId];
        if (presetInfo) {
          // 時間を分からDateTimeに変換
          const date = new Date(`2025-08-${day.toString().padStart(2, '0')}`);
          const startDateTime = new Date(date);
          startDateTime.setHours(Math.floor(presetInfo.start / 60), presetInfo.start % 60, 0, 0);
          const endDateTime = new Date(date);
          endDateTime.setHours(Math.floor(presetInfo.end / 60), presetInfo.end % 60, 0, 0);
          
          pendingAdjustments.push({
            staffId: staffId,
            date: `2025-08-${day.toString().padStart(2, '0')}`,
            status: presetInfo.status,
            start: startDateTime.toISOString(),
            end: endDateTime.toISOString(),
            memo: schedule.memo,
            isPending: true,
            submittedAt: new Date().toISOString()
          });
        }
      }
    }
  }
  
  return pendingAdjustments;
}

// SQL生成
function generateSQL(adjustments) {
  const sqlStatements = [];
  
  // 既存のpending adjustmentsを削除
  sqlStatements.push(`
DELETE FROM "Adjustment" 
WHERE "isPending" = true 
AND "date" >= '2025-07-01' 
AND "date" < '2025-09-01';
`);

  // 新しいpending adjustmentsを挿入
  const insertValues = [];
  
  adjustments.forEach((adj) => {
    const values = [
      adj.staffId,                                              // staffId
      `'${adj.date}'`,                                          // date
      `'${adj.status}'`,                                        // status
      `'${adj.start}'`,                                         // start
      `'${adj.end}'`,                                           // end
      adj.memo ? `'${adj.memo.replace(/'/g, "''")}'` : 'NULL', // memo
      `'${adj.submittedAt}'`,                                   // createdAt
      `'${adj.submittedAt}'`,                                   // updatedAt
      'true',                                                   // isPending
      'NULL',                                                   // approvedBy
      'NULL'                                                    // approvedAt
    ];
    
    insertValues.push(`(${values.join(', ')})`);
  });
  
  // バッチ挿入（500件ずつ）
  const batchSize = 500;
  for (let i = 0; i < insertValues.length; i += batchSize) {
    const batch = insertValues.slice(i, i + batchSize);
    sqlStatements.push(`
INSERT INTO "Adjustment" (
  "staffId", "date", "status", "start", "end", "memo", 
  "createdAt", "updatedAt", "isPending", "approvedBy", "approvedAt"
) VALUES
${batch.join(',\n')};
`);
  }
  
  return sqlStatements.join('\n');
}

// メイン実行
const pendingAdjustments = generateFullPendingAdjustments();
console.log(`生成されたpending adjustments: ${pendingAdjustments.length}件`);

// 統計情報
const staffStats = {};
const monthStats = { '2025-07': {}, '2025-08': {} };

pendingAdjustments.forEach(adj => {
  const month = adj.date.substring(0, 7);
  
  // スタッフ別統計
  if (!staffStats[adj.staffId]) staffStats[adj.staffId] = 0;
  staffStats[adj.staffId]++;
  
  // 月別・ステータス別統計
  if (!monthStats[month][adj.status]) monthStats[month][adj.status] = 0;
  monthStats[month][adj.status]++;
});

console.log(`\n対象スタッフ数: ${Object.keys(staffStats).length}人`);
console.log(`7月件数: ${Object.values(monthStats['2025-07']).reduce((a, b) => a + b, 0)}件`);
console.log(`8月件数: ${Object.values(monthStats['2025-08']).reduce((a, b) => a + b, 0)}件`);

// SQL出力
const sql = generateSQL(pendingAdjustments);
fs.writeFileSync('/root/callstatus-app/full_pending_adjustments.sql', sql);

console.log(`\n✅ SQLファイル生成完了: full_pending_adjustments.sql`);
console.log(`📊 総件数: ${pendingAdjustments.length}件 (195人分)`);
console.log(`📅 対象期間: 2025年7月・8月`);