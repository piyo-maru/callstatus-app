const fs = require('fs');

// CSVファイルを読み込み
const csvContent = fs.readFileSync('/root/callstatus-app/artifacts/07_plan_sample_utf8.csv', 'utf8');
const lines = csvContent.trim().split('\n');

// スタッフIDマッピング（195人分）
const staffIdMapping = {};
for (let csvRow = 3; csvRow <= 197; csvRow++) {
  const staffId = csvRow - 2;
  staffIdMapping[csvRow] = staffId;
}

// 正しいプリセットマッピング（実際に存在するプリセットIDを使用）
const presetMapping = {
  '全休': 'full-day-off',
  'ドック休': 'sudden-off',      // 健康診断用に代用
  'ドック': 'sudden-off', 
  'チェック': 'sudden-off',
  '夏休': 'full-day-off',        // 夏休も全休として扱う
  '在宅': 'remote-full-time',     // 在宅勤務
  '出張': 'meeting-block',        // 出張は会議として扱う
  '振休': 'full-day-off',        // 振休は全休として扱う
  '振出': 'full-time-employee',   // 振出は通常勤務として扱う
  '通院後出社': 'afternoon-off'   // 午後出社として扱う
};

// 時間パターンの解析（正しいプリセット対応版）
function parseTimePatternWithCorrectPreset(cellValue) {
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
  
  // 退社時間パターン → 午前半休
  if (value.includes('退社')) {
    return {
      presetId: 'morning-off',
      memo: `preset:morning-off|${value}`
    };
  }
  
  // 出社時間パターン → 午後半休
  if (value.includes('出社')) {
    return {
      presetId: 'afternoon-off', 
      memo: `preset:afternoon-off|${value}`
    };
  }
  
  // 数字のみ（21など）→ 会議・打ち合わせ
  if (/^\d+$/.test(value)) {
    const hour = parseInt(value);
    if (hour >= 8 && hour <= 21) {
      return {
        presetId: 'meeting-block',
        memo: `preset:meeting-block|${hour}時の会議`
      };
    }
  }
  
  // 月日パターン（9月18日など）→ 研修
  if (value.includes('月') && value.includes('日')) {
    return {
      presetId: 'training',
      memo: `preset:training|${value}`
    };
  }
  
  return null;
}

// Pending Adjustment生成（正しいプリセット対応版）
function generateCorrectPendingAdjustments() {
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
      const schedule = parseTimePatternWithCorrectPreset(cellValue);
      
      if (schedule) {
        pendingAdjustments.push({
          staffId: staffId,
          date: `2025-07-${day.toString().padStart(2, '0')}`,
          memo: schedule.memo,
          isPending: true,
          submittedAt: new Date().toISOString()
        });
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
      const schedule = parseTimePatternWithCorrectPreset(cellValue);
      
      if (schedule) {
        pendingAdjustments.push({
          staffId: staffId,
          date: `2025-08-${day.toString().padStart(2, '0')}`,
          memo: schedule.memo,
          isPending: true,
          submittedAt: new Date().toISOString()
        });
      }
    }
  }
  
  return pendingAdjustments;
}

// SQL生成（月次プランナー用のpendingスケジュール）
function generatePendingSQL(adjustments) {
  const sqlStatements = [];
  
  // 既存のpending adjustmentsを削除
  sqlStatements.push(`
DELETE FROM "Adjustment" 
WHERE "isPending" = true 
AND "date" >= '2025-07-01' 
AND "date" < '2025-09-01';
`);

  // 新しいpending adjustmentsを挿入（月次プランナー用の最小構成）
  const insertValues = [];
  
  adjustments.forEach((adj) => {
    const values = [
      adj.staffId,                                              // staffId
      `'${adj.date}'`,                                          // date
      `'Pending'`,                                              // status (pending用の仮ステータス)
      `'${adj.date}T09:00:00.000Z'`,                           // start (仮の時間)
      `'${adj.date}T18:00:00.000Z'`,                           // end (仮の時間)
      adj.memo ? `'${adj.memo.replace(/'/g, "''")}'` : 'NULL', // memo (プリセット情報を含む)
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
const pendingAdjustments = generateCorrectPendingAdjustments();
console.log(`生成されたpending adjustments（正しいプリセット対応）: ${pendingAdjustments.length}件`);

// プリセット別統計
const presetStats = {};
pendingAdjustments.forEach(adj => {
  const presetMatch = adj.memo.match(/preset:([^|]+)/);
  if (presetMatch) {
    const presetId = presetMatch[1];
    if (!presetStats[presetId]) presetStats[presetId] = 0;
    presetStats[presetId]++;
  }
});

console.log(`\nプリセット別統計:`);
console.log(JSON.stringify(presetStats, null, 2));

// SQL出力
const sql = generatePendingSQL(pendingAdjustments);
fs.writeFileSync('/root/callstatus-app/correct_pending_with_presets.sql', sql);

console.log(`\n✅ SQLファイル生成完了: correct_pending_with_presets.sql`);
console.log(`📊 総件数: ${pendingAdjustments.length}件 (正しいプリセットID使用)`);
console.log(`📅 対象期間: 2025年7月・8月`);