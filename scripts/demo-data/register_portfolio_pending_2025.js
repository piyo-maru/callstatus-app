#!/usr/bin/env node

/**
 * ポートフォリオ用申請予定（pending）投入スクリプト
 * 対象: 2025年8-9月 (50人版)
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

// 申請予定登録（月次計画API使用）
async function registerPendingApplications(applications, monthName) {
  console.log(`📋 ${monthName}申請予定登録開始: ${applications.length}件`);
  
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  for (let i = 0; i < applications.length; i++) {
    const app = applications[i];
    
    // 各申請の複数スケジュールを個別に登録（手動登録と同じ形式）
    for (let j = 0; j < app.schedules.length; j++) {
      const schedule = app.schedules[j];
      
      try {
        // 手動登録と同じ形式でPending作成
        const pendingData = {
          staffId: app.staffId,
          date: app.date,
          status: schedule.status,
          start: schedule.start,
          end: schedule.end,
          memo: schedule.memo || `申請予定: ${app.presetName}`,
          pendingType: 'monthly-planner'
        };
      
        const response = await apiRequest(`${API_BASE_URL}/api/schedules/pending`, {
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
            console.error(`❌ ${monthName}申請予定登録失敗 [${i+1}/${applications.length}] スタッフ${app.staffId} ${app.date}: ${errorText}`);
          }
        }
        
        // 進捗表示（スケジュール単位）
        const totalSchedules = applications.reduce((sum, app) => sum + app.schedules.length, 0);
        if ((successCount + errorCount) % 100 === 0) {
          console.log(`📈 ${monthName}進捗: ${successCount + errorCount}/${totalSchedules}件処理済み`);
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
          console.error(`❌ ${monthName}ネットワークエラー [${i+1}/${applications.length}]: ${error.message}`);
        }
      }
    }
  }
  
  console.log(`\n📊 ${monthName}申請予定登録結果:`);
  console.log(`✅ 成功: ${successCount}件`);
  console.log(`❌ 失敗: ${errorCount}件`);
  console.log(`📋 成功率: ${((successCount / (successCount + errorCount)) * 100).toFixed(1)}%`);
  
  if (errors.length > 0) {
    console.log(`\n⚠️  ${monthName}エラー詳細 (最初の5件):`);
    errors.slice(0, 5).forEach((err, idx) => {
      console.log(`${idx + 1}. スタッフ${err.schedule.staffId} ${err.schedule.date}: ${err.error}`);
    });
  }
  
  return { successCount, errorCount, errors };
}

// 担当設定登録（既存のAPIを使用）
async function registerResponsibilities(responsibilities, monthName) {
  console.log(`\n👥 ${monthName}担当設定登録開始: ${responsibilities.length}件`);
  
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
          assignmentType: resp.responsibilities[0],
          customLabel: resp.responsibilities.length > 1 ? resp.responsibilities.slice(1).join(', ') : undefined
        })
      });
      
      if (response.ok) {
        successCount++;
      } else {
        errorCount++;
        if (errorCount <= 5) {
          const errorText = await response.text();
          console.error(`❌ ${monthName}担当設定登録失敗 [${i+1}/${responsibilities.length}]: ${errorText}`);
        }
      }
      
      // 進捗表示
      if ((successCount + errorCount) % 20 === 0) {
        console.log(`📈 ${monthName}担当設定進捗: ${successCount + errorCount}/${responsibilities.length}件処理済み`);
      }
      
    } catch (error) {
      errorCount++;
      if (errorCount <= 5) {
        console.error(`❌ ${monthName}担当設定ネットワークエラー [${i+1}/${responsibilities.length}]: ${error.message}`);
      }
    }
  }
  
  console.log(`\n📊 ${monthName}担当設定登録結果:`);
  console.log(`✅ 成功: ${successCount}件`);
  console.log(`❌ 失敗: ${errorCount}件`);
  console.log(`📋 成功率: ${((successCount / (successCount + errorCount)) * 100).toFixed(1)}%`);
  
  return { successCount, errorCount };
}

// メイン実行関数
async function registerAllPortfolioPendingData() {
  console.log('🚀 ポートフォリオ用2ヶ月分申請予定（pending）投入開始...\n');
  
  try {
    // APIサーバー接続確認
    const healthCheck = await fetch(`${API_BASE_URL}/api/test`);
    if (!healthCheck.ok) {
      throw new Error('APIサーバーに接続できません');
    }
    console.log('✅ APIサーバー接続確認完了\n');
    
    const months = [
      { file: 'demo_data_august_2025_portfolio.json', name: '8月' },
      { file: 'demo_data_september_2025_portfolio.json', name: '9月' }
    ];
    
    let totalSuccessApplications = 0;
    let totalErrorApplications = 0;
    let totalSuccessResponsibilities = 0;
    let totalErrorResponsibilities = 0;
    
    for (const month of months) {
      console.log(`\n📅 ${month.name}申請予定投入開始...`);
      
      // データ読み込み
      const demoData = loadDemoData(month.file);
      console.log(`📋 ${month.name}: 申請予定${demoData.applications.length}件、担当設定${demoData.responsibilities.length}件`);
      
      // 申請予定登録
      const applicationResult = await registerPendingApplications(demoData.applications, month.name);
      totalSuccessApplications += applicationResult.successCount;
      totalErrorApplications += applicationResult.errorCount;
      
      // 担当設定登録
      const responsibilityResult = await registerResponsibilities(demoData.responsibilities, month.name);
      totalSuccessResponsibilities += responsibilityResult.successCount;
      totalErrorResponsibilities += responsibilityResult.errorCount;
      
      console.log(`✅ ${month.name}申請予定投入完了`);
      
      // 月間データ間の休憩
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🎉 ポートフォリオ用申請予定投入完了！');
    console.log('\n📊 最終結果:');
    console.log(`申請予定: ${totalSuccessApplications}件成功 / ${totalErrorApplications}件失敗`);
    console.log(`担当設定: ${totalSuccessResponsibilities}件成功 / ${totalErrorResponsibilities}件失敗`);
    console.log(`全体成功率: ${((totalSuccessApplications + totalSuccessResponsibilities) / (totalSuccessApplications + totalErrorApplications + totalSuccessResponsibilities + totalErrorResponsibilities) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ 申請予定投入エラー:', error.message);
    throw error;
  }
}

// スクリプト実行
if (require.main === module) {
  registerAllPortfolioPendingData()
    .then(() => {
      console.log('\n🏁 ポートフォリオ用申請予定投入スクリプト完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 申請予定投入スクリプト失敗:', error);
      process.exit(1);
    });
}

module.exports = { registerAllPortfolioPendingData };