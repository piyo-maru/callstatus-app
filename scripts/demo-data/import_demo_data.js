#!/usr/bin/env node

/**
 * デモデータをAPIで登録するスクリプト
 */

const fs = require('fs');
const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3002/api';

async function importDemoData() {
  console.log('📊 デモデータの登録を開始します...');
  
  // JSONファイル読み込み
  const demoData = JSON.parse(fs.readFileSync('demo_data_week_0707-0713.json', 'utf8'));
  
  console.log(`📋 対象データ:`);
  console.log(`  - 申請予定: ${demoData.applications.length}件`);
  console.log(`  - 担当設定: ${demoData.responsibilities.length}件`);
  console.log(`  - 期間: ${demoData.period}`);
  
  let successCount = 0;
  let errorCount = 0;
  
  // 申請予定をPending形式で登録
  console.log('\n🔄 申請予定の登録中...');
  for (const app of demoData.applications) {
    try {
      const payload = {
        staffId: app.staffId,
        date: app.date,
        schedules: app.schedules,
        memo: `デモデータ - ${app.presetName}`,
        explanation: `${app.presetName}の申請です。`
      };
      
      const response = await fetch(`${API_BASE_URL}/schedules/pending`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        successCount++;
        if (successCount % 50 === 0) {
          console.log(`  ✅ 申請予定 ${successCount}件 登録完了`);
        }
      } else {
        const errorText = await response.text();
        console.error(`  ❌ 申請予定登録エラー (Staff ${app.staffId}, ${app.date}):`, errorText);
        errorCount++;
      }
    } catch (error) {
      console.error(`  ❌ 申請予定登録エラー (Staff ${app.staffId}, ${app.date}):`, error.message);
      errorCount++;
    }
    
    // API負荷軽減のため少し待機
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  console.log(`\n📝 申請予定登録完了: 成功 ${successCount}件, エラー ${errorCount}件`);
  
  // 担当設定を登録
  console.log('\n🔄 担当設定の登録中...');
  successCount = 0;
  errorCount = 0;
  
  for (const resp of demoData.responsibilities) {
    try {
      const payload = {
        staffId: resp.staffId,
        date: resp.date,
        responsibilities: resp.responsibilities
      };
      
      const response = await fetch(`${API_BASE_URL}/responsibilities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        successCount++;
        console.log(`  ✅ 担当設定 ${successCount}件 登録完了`);
      } else {
        const errorText = await response.text();
        console.error(`  ❌ 担当設定登録エラー (Staff ${resp.staffId}, ${resp.date}):`, errorText);
        errorCount++;
      }
    } catch (error) {
      console.error(`  ❌ 担当設定登録エラー (Staff ${resp.staffId}, ${resp.date}):`, error.message);
      errorCount++;
    }
    
    // API負荷軽減のため少し待機
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log(`\n👥 担当設定登録完了: 成功 ${successCount}件, エラー ${errorCount}件`);
  
  console.log('\n🎉 デモデータ登録が完了しました！');
  console.log('📱 フロントエンドで動作確認を行ってください。');
}

// メイン実行
if (require.main === module) {
  importDemoData().catch(error => {
    console.error('❌ デモデータ登録エラー:', error);
    process.exit(1);
  });
}

module.exports = { importDemoData };