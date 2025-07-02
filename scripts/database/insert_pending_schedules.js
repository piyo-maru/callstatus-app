const fs = require('fs');

// 生成されたpending schedulesを読み込み
const pendingSchedules = JSON.parse(fs.readFileSync('/root/callstatus-app/pending_schedules_july_august.json', 'utf8'));

// SQL生成
function generateInsertSQL() {
  const sqlStatements = [];
  
  // 既存のpending schedulesを削除（7月・8月分）
  sqlStatements.push(`
DELETE FROM "Adjustment" 
WHERE "isPending" = true 
AND "date" >= '2025-07-01' 
AND "date" < '2025-09-01';
`);

  // 新しいpending schedulesを挿入
  const insertValues = [];
  
  pendingSchedules.forEach((schedule, index) => {
    // 時間を分からDateTimeに変換
    const date = new Date(schedule.date);
    const startDateTime = new Date(date);
    startDateTime.setHours(Math.floor(schedule.startTime / 60), schedule.startTime % 60, 0, 0);
    const endDateTime = new Date(date);
    endDateTime.setHours(Math.floor(schedule.endTime / 60), schedule.endTime % 60, 0, 0);
    
    const values = [
      schedule.staffId,                           // staffId
      `'${schedule.date}'`,                       // date
      `'${schedule.status}'`,                     // status
      `'${startDateTime.toISOString()}'`,         // start
      `'${endDateTime.toISOString()}'`,           // end
      schedule.memo ? `'${schedule.memo.replace(/'/g, "''")}'` : 'NULL', // memo
      `'${schedule.submittedAt}'`,               // createdAt
      `'${schedule.submittedAt}'`,               // updatedAt
      'true',                                    // isPending
      'NULL',                                    // approvedBy
      'NULL'                                     // approvedAt
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
const sql = generateInsertSQL();
fs.writeFileSync('/root/callstatus-app/insert_pending_schedules.sql', sql);

console.log(`✅ SQLファイル生成完了: insert_pending_schedules.sql`);
console.log(`📊 生成件数: ${pendingSchedules.length}件`);
console.log(`📅 対象期間: 2025年7月・8月`);
console.log(`🔄 処理: 既存pending削除 + 新規792件挿入`);

// API経由での挿入スクリプトも生成
const apiScript = `
const axios = require('axios');

const baseURL = 'http://localhost:3002/api';

async function insertPendingSchedules() {
  try {
    console.log('🔄 既存のpending schedulesを削除中...');
    
    // 7月・8月のpending schedulesを削除
    const deleteResponse = await axios.delete(\`\${baseURL}/schedules/pending/bulk\`, {
      data: {
        startDate: '2025-07-01',
        endDate: '2025-08-31'
      }
    });
    
    console.log('✅ 削除完了:', deleteResponse.data);
    
    console.log('📝 新しいpending schedulesを挿入中...');
    
    // 新しいpending schedulesを挿入
    const schedules = ${JSON.stringify(pendingSchedules, null, 2)};
    
    const insertResponse = await axios.post(\`\${baseURL}/schedules/pending/bulk\`, {
      schedules: schedules
    });
    
    console.log('✅ 挿入完了:', insertResponse.data);
    console.log(\`📊 処理件数: \${schedules.length}件\`);
    
  } catch (error) {
    console.error('❌ エラー:', error.response?.data || error.message);
  }
}

insertPendingSchedules();
`;

fs.writeFileSync('/root/callstatus-app/insert_pending_via_api.js', apiScript);

console.log(`📡 API経由挿入スクリプト生成完了: insert_pending_via_api.js`);
console.log(`\n実行方法:`);
console.log(`1. SQLファイル直接実行: psql -f insert_pending_schedules.sql`);
console.log(`2. API経由実行: node insert_pending_via_api.js`);