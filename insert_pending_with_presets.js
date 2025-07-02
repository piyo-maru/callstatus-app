const fs = require('fs');

// 生成されたpending schedules（プリセット対応）を読み込み
const pendingSchedules = JSON.parse(fs.readFileSync('/root/callstatus-app/pending_schedules_with_presets.json', 'utf8'));

// SQL生成（PendingScheduleテーブル用）
function generatePendingScheduleSQL() {
  const sqlStatements = [];
  
  // 既存のpending schedulesを削除（7月・8月分）
  sqlStatements.push(`
DELETE FROM "PendingSchedule" 
WHERE "date" >= '2025-07-01' 
AND "date" < '2025-09-01';
`);

  // 新しいpending schedulesを挿入
  const insertValues = [];
  
  pendingSchedules.forEach((schedule, index) => {
    const values = [
      schedule.staffId,                                              // staffId
      `'${schedule.date}'`,                                          // date
      `'${schedule.presetId}'`,                                      // presetId
      schedule.memo ? `'${schedule.memo.replace(/'/g, "''")}'` : 'NULL', // memo
      `'${schedule.submittedAt}'`,                                   // submittedAt
      schedule.submittedBy,                                          // submittedBy
      `'${schedule.submittedAt}'`,                                   // createdAt
      `'${schedule.submittedAt}'`                                    // updatedAt
    ];
    
    insertValues.push(`(${values.join(', ')})`);
  });
  
  // バッチ挿入（500件ずつ）
  const batchSize = 500;
  for (let i = 0; i < insertValues.length; i += batchSize) {
    const batch = insertValues.slice(i, i + batchSize);
    sqlStatements.push(`
INSERT INTO "PendingSchedule" (
  "staffId", "date", "presetId", "memo", "submittedAt", "submittedBy", "createdAt", "updatedAt"
) VALUES
${batch.join(',\n')};
`);
  }
  
  return sqlStatements.join('\n');
}

// 従来のAdjustmentテーブルからpendingを削除するSQL
function generateCleanupSQL() {
  return `
-- 従来のAdjustment内のpendingデータを削除
DELETE FROM "Adjustment" 
WHERE "isPending" = true 
AND "date" >= '2025-07-01' 
AND "date" < '2025-09-01';
`;
}

// SQL生成と出力
const cleanupSQL = generateCleanupSQL();
const pendingSQL = generatePendingScheduleSQL();
const fullSQL = cleanupSQL + '\n' + pendingSQL;

fs.writeFileSync('/root/callstatus-app/insert_pending_schedules_with_presets.sql', fullSQL);

console.log(`✅ SQLファイル生成完了: insert_pending_schedules_with_presets.sql`);
console.log(`📊 生成件数: ${pendingSchedules.length}件`);
console.log(`📅 対象期間: 2025年7月・8月`);
console.log(`🔄 処理: Adjustment pending削除 + PendingSchedule新規挿入`);

// API経由での挿入スクリプトも生成
const apiScript = `
const axios = require('axios');

const baseURL = 'http://localhost:3002/api';

async function insertPendingSchedulesWithPresets() {
  try {
    console.log('🔄 既存のpending schedulesを削除中...');
    
    // 1. Adjustmentテーブルのpending schedulesを削除
    try {
      await axios.delete(\`\${baseURL}/schedules/pending/adjustment/bulk\`, {
        data: {
          startDate: '2025-07-01',
          endDate: '2025-08-31'
        }
      });
      console.log('✅ Adjustment pending削除完了');
    } catch (error) {
      console.log('ℹ️ Adjustment pending削除スキップ（エンドポイントなし）');
    }
    
    // 2. PendingScheduleテーブルのデータを削除
    try {
      await axios.delete(\`\${baseURL}/pending-schedules/bulk\`, {
        data: {
          startDate: '2025-07-01',
          endDate: '2025-08-31'
        }
      });
      console.log('✅ PendingSchedule削除完了');
    } catch (error) {
      console.log('ℹ️ PendingSchedule削除スキップ:', error.response?.status);
    }
    
    console.log('📝 新しいpending schedules（プリセット対応）を挿入中...');
    
    // 3. 新しいpending schedulesを挿入
    const schedules = ${JSON.stringify(pendingSchedules, null, 2)};
    
    try {
      const insertResponse = await axios.post(\`\${baseURL}/pending-schedules/bulk\`, {
        schedules: schedules
      });
      
      console.log('✅ 挿入完了:', insertResponse.data);
      console.log(\`📊 処理件数: \${schedules.length}件\`);
    } catch (error) {
      console.error('❌ 挿入エラー:', error.response?.data || error.message);
      console.log('📝 代替として個別挿入を試行中...');
      
      // 個別挿入のフォールバック
      let successCount = 0;
      for (const schedule of schedules) {
        try {
          await axios.post(\`\${baseURL}/pending-schedules\`, schedule);
          successCount++;
        } catch (individualError) {
          console.error(\`❌ 個別挿入失敗 (\${schedule.staffId}, \${schedule.date}):\`, individualError.response?.data || individualError.message);
        }
      }
      console.log(\`📊 個別挿入完了: \${successCount}/\${schedules.length}件\`);
    }
    
  } catch (error) {
    console.error('❌ 全体エラー:', error.response?.data || error.message);
  }
}

insertPendingSchedulesWithPresets();
`;

fs.writeFileSync('/root/callstatus-app/insert_pending_presets_via_api.js', apiScript);

console.log(`📡 API経由挿入スクリプト生成完了: insert_pending_presets_via_api.js`);
console.log(`\n実行方法:`);
console.log(`1. SQLファイル直接実行: psql -f insert_pending_schedules_with_presets.sql`);
console.log(`2. API経由実行: node insert_pending_presets_via_api.js`);