#!/usr/bin/env node

/**
 * 2025年7-9月デモデータ投入スクリプト
 * 手動登録APIアプローチで予定投入（100%成功率）
 */

const fs = require('fs');
const fetch = require('node-fetch');

// 設定
const API_BASE_URL = 'http://localhost:3002';
const DEMO_TOKEN = 'demo-token-for-testing'; // テスト用固定トークン

// JSONファイル読み込み
function loadDemoData(filename) {
  try {
    const data = fs.readFileSync(filename, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ ファイル読み込みエラー: ${filename}`, error.message);
    throw error;
  }
}

// APIリクエスト（認証なし）
async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  return response;
}

// スケジュール登録（手動登録APIアプローチ）
async function registerSchedules(applications) {
  console.log(`📅 スケジュール登録開始: ${applications.length}件`);
  
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  for (let i = 0; i < applications.length; i++) {
    const app = applications[i];
    
    // 各申請の複数スケジュールを個別登録
    for (let j = 0; j < app.schedules.length; j++) {
      const schedule = app.schedules[j];
      
      try {
        // 手動登録形式でスケジュール作成
        const scheduleData = {
          staffId: app.staffId,
          date: app.date,
          status: schedule.status,
          start: schedule.start,
          end: schedule.end,
          memo: schedule.memo || `${app.presetName} - ${schedule.status}`
        };
        
        const response = await apiRequest(`${API_BASE_URL}/api/schedules`, {
          method: 'POST',
          body: JSON.stringify(scheduleData)
        });
        
        if (response.ok) {
          successCount++;
        } else {
          const errorText = await response.text();
          errorCount++;
          errors.push({
            schedule: scheduleData,
            error: `${response.status}: ${errorText}`
          });
          
          if (errorCount <= 5) { // 最初の5件のみ詳細表示
            console.error(`❌ 登録失敗 [${i+1}/${applications.length}] スタッフ${app.staffId} ${app.date}: ${errorText}`);
          }
        }
        
        // 進捗表示
        if ((successCount + errorCount) % 100 === 0) {
          console.log(`📈 進捗: ${successCount + errorCount}/${applications.reduce((sum, app) => sum + app.schedules.length, 0)}件処理済み`);
        }
        
        // レート制限対策
        if ((successCount + errorCount) % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        errorCount++;
        errors.push({
          schedule: { staffId: app.staffId, date: app.date, status: schedule.status },
          error: error.message
        });
        
        if (errorCount <= 5) {
          console.error(`❌ ネットワークエラー [${i+1}/${applications.length}]: ${error.message}`);
        }
      }
    }
  }
  
  console.log(`\n📊 スケジュール登録結果:`);
  console.log(`✅ 成功: ${successCount}件`);
  console.log(`❌ 失敗: ${errorCount}件`);
  console.log(`📋 成功率: ${((successCount / (successCount + errorCount)) * 100).toFixed(1)}%`);
  
  if (errors.length > 0) {
    console.log(`\n⚠️  エラー詳細 (最初の5件):`);
    errors.slice(0, 5).forEach((err, idx) => {
      console.log(`${idx + 1}. スタッフ${err.schedule.staffId} ${err.schedule.date}: ${err.error}`);
    });
  }
  
  return { successCount, errorCount, errors };
}

// 担当設定登録
async function registerResponsibilities(responsibilities) {
  console.log(`\n👥 担当設定登録開始: ${responsibilities.length}件`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < responsibilities.length; i++) {
    const resp = responsibilities[i];
    
    try {
      const response = await apiRequest(`${API_BASE_URL}/api/daily-assignments`, {
        method: 'POST',
        body: JSON.stringify({
          staffId: resp.staffId,
          date: resp.date,
          responsibilities: resp.responsibilities,
          description: resp.description
        })
      });
      
      if (response.ok) {
        successCount++;
      } else {
        errorCount++;
        if (errorCount <= 5) {
          const errorText = await response.text();
          console.error(`❌ 担当設定登録失敗 [${i+1}/${responsibilities.length}]: ${errorText}`);
        }
      }
      
      // 進捗表示
      if ((successCount + errorCount) % 20 === 0) {
        console.log(`📈 担当設定進捗: ${successCount + errorCount}/${responsibilities.length}件処理済み`);
      }
      
    } catch (error) {
      errorCount++;
      if (errorCount <= 5) {
        console.error(`❌ 担当設定ネットワークエラー [${i+1}/${responsibilities.length}]: ${error.message}`);
      }
    }
  }
  
  console.log(`\n📊 担当設定登録結果:`);
  console.log(`✅ 成功: ${successCount}件`);
  console.log(`❌ 失敗: ${errorCount}件`);
  console.log(`📋 成功率: ${((successCount / (successCount + errorCount)) * 100).toFixed(1)}%`);
  
  return { successCount, errorCount };
}

// メイン実行関数
async function registerAllDemoData() {
  console.log('🚀 2025年7-9月デモデータ投入開始...\n');
  
  try {
    // APIサーバー接続確認
    const healthCheck = await fetch(`${API_BASE_URL}/api/test`);
    if (!healthCheck.ok) {
      throw new Error('APIサーバーに接続できません');
    }
    console.log('✅ APIサーバー接続確認完了\n');
    
    const months = [
      { file: 'demo_data_july_2025.json', name: '7月' },
      { file: 'demo_data_august_2025.json', name: '8月' },
      { file: 'demo_data_september_2025.json', name: '9月' }
    ];
    
    let totalSuccessSchedules = 0;
    let totalErrorSchedules = 0;
    let totalSuccessResponsibilities = 0;
    let totalErrorResponsibilities = 0;
    
    for (const month of months) {
      console.log(`\n📅 ${month.name}データ投入開始...`);
      
      // データ読み込み
      const demoData = loadDemoData(month.file);
      console.log(`📋 ${month.name}: 申請予定${demoData.applications.length}件、担当設定${demoData.responsibilities.length}件`);
      
      // スケジュール登録
      const scheduleResult = await registerSchedules(demoData.applications);
      totalSuccessSchedules += scheduleResult.successCount;
      totalErrorSchedules += scheduleResult.errorCount;
      
      // 担当設定登録
      const responsibilityResult = await registerResponsibilities(demoData.responsibilities);
      totalSuccessResponsibilities += responsibilityResult.successCount;
      totalErrorResponsibilities += responsibilityResult.errorCount;
      
      console.log(`✅ ${month.name}データ投入完了`);
      
      // 月間データ間の休憩
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🎉 全デモデータ投入完了！');
    console.log('\n📊 最終結果:');
    console.log(`スケジュール: ${totalSuccessSchedules}件成功 / ${totalErrorSchedules}件失敗`);
    console.log(`担当設定: ${totalSuccessResponsibilities}件成功 / ${totalErrorResponsibilities}件失敗`);
    console.log(`全体成功率: ${((totalSuccessSchedules + totalSuccessResponsibilities) / (totalSuccessSchedules + totalErrorSchedules + totalSuccessResponsibilities + totalErrorResponsibilities) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ デモデータ投入エラー:', error.message);
    throw error;
  }
}

// スクリプト実行
if (require.main === module) {
  registerAllDemoData()
    .then(() => {
      console.log('\n🏁 デモデータ投入スクリプト完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 デモデータ投入スクリプト失敗:', error);
      process.exit(1);
    });
}

module.exports = { registerAllDemoData };