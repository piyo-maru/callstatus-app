#!/usr/bin/env node

/**
 * デモデータを直接データベースに登録するスクリプト
 */

const fs = require('fs');

async function importDemoDataDirect() {
  console.log('📊 デモデータの直接登録を開始します...');
  
  // JSONファイル読み込み
  const demoData = JSON.parse(fs.readFileSync('demo_data_week_0707-0713.json', 'utf8'));
  
  console.log(`📋 対象データ:`);
  console.log(`  - 申請予定: ${demoData.applications.length}件`);
  console.log(`  - 担当設定: ${demoData.responsibilities.length}件`);
  console.log(`  - 期間: ${demoData.period}`);
  
  // Prismaを使ってデータベースに直接挿入
  const insertScript = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function insertDemoData() {
  try {
    console.log('🔄 申請予定をAdjustmentテーブルに直接登録中...');
    
    // 申請予定データ
    const applications = ${JSON.stringify(demoData.applications, null, 2)};
    
    let successCount = 0;
    for (const app of applications) {
      try {
        await prisma.adjustment.create({
          data: {
            staffId: app.staffId,
            date: new Date(app.date + 'T00:00:00Z'),
            status: app.schedules[0].status,
            startTime: app.schedules[0].start,
            endTime: app.schedules[0].end,
            memo: app.presetName + ' (デモデータ)',
            isPending: false, // 承認済みとして登録
            approvedBy: 1,
            approvedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        successCount++;
        if (successCount % 50 === 0) {
          console.log(\`  ✅ 申請予定 \${successCount}件 登録完了\`);
        }
      } catch (error) {
        console.error(\`  ❌ 申請予定登録エラー (Staff \${app.staffId}, \${app.date}):\`, error.message);
      }
    }
    
    console.log(\`\\n📝 申請予定登録完了: \${successCount}件\`);
    
    console.log('🔄 担当設定をResponsibilityテーブルに直接登録中...');
    
    // 担当設定データ
    const responsibilities = ${JSON.stringify(demoData.responsibilities, null, 2)};
    
    successCount = 0;
    for (const resp of responsibilities) {
      try {
        await prisma.responsibility.create({
          data: {
            staffId: resp.staffId,
            date: new Date(resp.date + 'T00:00:00Z'),
            responsibilities: resp.responsibilities,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        successCount++;
        console.log(\`  ✅ 担当設定 \${successCount}件 登録完了\`);
      } catch (error) {
        console.error(\`  ❌ 担当設定登録エラー (Staff \${resp.staffId}, \${resp.date}):\`, error.message);
      }
    }
    
    console.log(\`\\n👥 担当設定登録完了: \${successCount}件\`);
    console.log('\\n🎉 デモデータ直接登録が完了しました！');
    
  } catch (error) {
    console.error('❌ データ登録エラー:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

insertDemoData();
`;

  // 一時スクリプトファイル作成
  fs.writeFileSync('temp_insert_script.js', insertScript);
  
  console.log('📝 データベース直接登録スクリプトを生成しました');
  return 'temp_insert_script.js';
}

// メイン実行
if (require.main === module) {
  importDemoDataDirect().then(scriptPath => {
    console.log(`\n🎯 次のステップ:`);
    console.log(`  docker exec callstatus-app_backend_1 bash -c "cd /app && node /root/callstatus-app/${scriptPath}"`);
  }).catch(error => {
    console.error('❌ スクリプト生成エラー:', error);
    process.exit(1);
  });
}

module.exports = { importDemoDataDirect };