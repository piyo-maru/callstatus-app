const fs = require('fs');

// 生成されたpending schedules（プリセット対応）を読み込み
const pendingSchedules = JSON.parse(fs.readFileSync('/root/callstatus-app/pending_schedules_with_presets.json', 'utf8'));

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

// SQL生成（Adjustmentテーブル用・プリセット対応）
function generateAdjustmentSQL() {
  const sqlStatements = [];
  
  // 既存のpending adjustmentsを削除（7月・8月分）
  sqlStatements.push(`
DELETE FROM "Adjustment" 
WHERE "isPending" = true 
AND "date" >= '2025-07-01' 
AND "date" < '2025-09-01';
`);

  // 新しいpending adjustmentsを挿入
  const insertValues = [];
  
  pendingSchedules.forEach((schedule, index) => {
    const presetInfo = presetSchedules[schedule.presetId];
    if (!presetInfo) {
      console.warn(`Unknown preset: ${schedule.presetId}`);
      return;
    }
    
    // 時間を分からDateTimeに変換
    const date = new Date(schedule.date);
    const startDateTime = new Date(date);
    startDateTime.setHours(Math.floor(presetInfo.start / 60), presetInfo.start % 60, 0, 0);
    const endDateTime = new Date(date);
    endDateTime.setHours(Math.floor(presetInfo.end / 60), presetInfo.end % 60, 0, 0);
    
    const values = [
      schedule.staffId,                                              // staffId
      `'${schedule.date}'`,                                          // date
      `'${presetInfo.status}'`,                                      // status
      `'${startDateTime.toISOString()}'`,                            // start
      `'${endDateTime.toISOString()}'`,                              // end
      schedule.memo ? `'${schedule.memo.replace(/'/g, "''")}'` : 'NULL', // memo
      `'${schedule.submittedAt}'`,                                   // createdAt
      `'${schedule.submittedAt}'`,                                   // updatedAt
      'true',                                                        // isPending
      'NULL',                                                        // approvedBy
      'NULL'                                                         // approvedAt
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

// SQL生成と出力
const sql = generateAdjustmentSQL();
fs.writeFileSync('/root/callstatus-app/insert_pending_adjustment_presets.sql', sql);

console.log(`✅ SQLファイル生成完了: insert_pending_adjustment_presets.sql`);
console.log(`📊 生成件数: ${pendingSchedules.length}件`);
console.log(`📅 対象期間: 2025年7月・8月`);
console.log(`🔄 処理: 既存pending削除 + プリセット対応pending挿入`);

// 統計情報
const presetStats = {};
let processedCount = 0;
pendingSchedules.forEach(schedule => {
  if (presetSchedules[schedule.presetId]) {
    processedCount++;
    if (!presetStats[schedule.presetId]) presetStats[schedule.presetId] = 0;
    presetStats[schedule.presetId]++;
  }
});

console.log(`\n処理統計:`);
console.log(`処理済み: ${processedCount}/${pendingSchedules.length}件`);
console.log(`プリセット別統計:`);
console.log(JSON.stringify(presetStats, null, 2));