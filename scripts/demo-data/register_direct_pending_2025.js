#!/usr/bin/env node

/**
 * 2025年7-9月申請予定（pending）直接投入スクリプト
 * Adjustmentテーブルに直接isPending:trueでデータ投入
 */

const fs = require('fs');
const fetch = require('node-fetch');

// 設定
const API_BASE_URL = 'http://localhost:3002';

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

// 申請予定登録（Adjustmentテーブル直接投入）
async function registerPendingApplications(applications) {
  console.log(`📋 申請予定登録開始: ${applications.length}件`);
  
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  for (let i = 0; i < applications.length; i++) {
    const app = applications[i];
    
    // 各申請の複数スケジュールを個別登録
    for (let j = 0; j < app.schedules.length; j++) {
      const schedule = app.schedules[j];
      
      try {
        // 申請予定形式でスケジュール作成（isPending: true）
        const pendingData = {
          staffId: app.staffId,
          date: app.date,
          status: schedule.status,
          start: schedule.start,
          end: schedule.end,
          memo: schedule.memo || `申請予定: ${app.presetName} - ${schedule.status}`,
          isPending: true,
          pendingType: 'monthly_planner'
        };
        
        const response = await apiRequest(`${API_BASE_URL}/api/schedules`, {
          method: 'POST',
          body: JSON.stringify(pendingData)
        });
        
        if (response.ok) {
          successCount++;
        } else {
          const errorText = await response.text();
          errorCount++;
          errors.push({
            schedule: pendingData,
            error: `${response.status}: ${errorText}`
          });
          
          if (errorCount <= 5) { // 最初の5件のみ詳細表示
            console.error(`❌ 申請予定登録失敗 [${i+1}/${applications.length}] スタッフ${app.staffId} ${app.date}: ${errorText}`);
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
  
  console.log(`\n📊 申請予定登録結果:`);
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

// メイン実行関数
async function registerAllPendingData() {
  console.log('🚀 2025年7-9月申請予定（pending）直接投入開始...\n');
  
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
    
    let totalSuccessApplications = 0;
    let totalErrorApplications = 0;
    
    for (const month of months) {
      console.log(`\n📅 ${month.name}申請予定投入開始...`);
      
      // データ読み込み
      const demoData = loadDemoData(month.file);
      console.log(`📋 ${month.name}: 申請予定${demoData.applications.length}件`);
      
      // 申請予定登録
      const applicationResult = await registerPendingApplications(demoData.applications);
      totalSuccessApplications += applicationResult.successCount;
      totalErrorApplications += applicationResult.errorCount;
      
      console.log(`✅ ${month.name}申請予定投入完了`);
      
      // 月間データ間の休憩
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🎉 全申請予定投入完了！');
    console.log('\n📊 最終結果:');
    console.log(`申請予定: ${totalSuccessApplications}件成功 / ${totalErrorApplications}件失敗`);
    console.log(`全体成功率: ${((totalSuccessApplications) / (totalSuccessApplications + totalErrorApplications) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ 申請予定投入エラー:', error.message);
    throw error;
  }
}

// スクリプト実行
if (require.main === module) {
  registerAllPendingData()
    .then(() => {
      console.log('\n🏁 申請予定投入スクリプト完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 申請予定投入スクリプト失敗:', error);
      process.exit(1);
    });
}

module.exports = { registerAllPendingData };