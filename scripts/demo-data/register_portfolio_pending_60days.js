#!/usr/bin/env node

/**
 * ポートフォリオ用申請予定（pending）投入スクリプト（60日版・動的ファイル対応）
 * 今日から生成された60日分データを自動検出・投入
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// 設定
const API_BASE_URL = 'http://localhost:3002';

// 今日の日付から60日分ファイル名を生成
function getTodayFileName() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0].replace(/-/g, '');
  return `demo_data_${todayStr}_60days.json`;
}

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
async function registerPendingApplications(applications) {
  console.log(`📋 申請予定登録開始: ${applications.length}件`);
  
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
            console.error(`❌ 申請予定登録失敗 [${i+1}/${applications.length}] スタッフ${app.staffId} ${app.date}: ${errorText}`);
          }
        }
        
        // 進捗表示（スケジュール単位）
        const totalSchedules = applications.reduce((sum, app) => sum + app.schedules.length, 0);
        if ((successCount + errorCount) % 100 === 0) {
          console.log(`📈 進捗: ${successCount + errorCount}/${totalSchedules}件処理済み`);
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

// 担当設定登録（既存のAPIを使用）
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
async function registerPortfolioPendingData60Days() {
  console.log('🚀 ポートフォリオ用60日分申請予定（pending）投入開始...\n');
  
  try {
    // APIサーバー接続確認
    const healthCheck = await fetch(`${API_BASE_URL}/api/test`);
    if (!healthCheck.ok) {
      throw new Error('APIサーバーに接続できません');
    }
    console.log('✅ APIサーバー接続確認完了\n');
    
    // 今日の日付から60日分ファイル名を特定
    const fileName = getTodayFileName();
    
    if (!fs.existsSync(fileName)) {
      throw new Error(`ファイルが見つかりません: ${fileName}`);
    }
    
    console.log(`📂 データファイル: ${fileName}`);
    
    // データ読み込み
    const demoData = loadDemoData(fileName);
    console.log(`📋 申請予定${demoData.applications.length}件、担当設定${demoData.responsibilities.length}件`);
    console.log(`📅 期間: ${demoData.startDate.split('T')[0]} - ${demoData.endDate.split('T')[0]}`);
    
    // 申請予定登録
    const applicationResult = await registerPendingApplications(demoData.applications);
    
    // 担当設定登録
    const responsibilityResult = await registerResponsibilities(demoData.responsibilities);
    
    console.log('\n🎉 ポートフォリオ用60日分申請予定投入完了！');
    console.log('\n📊 最終結果:');
    console.log(`申請予定: ${applicationResult.successCount}件成功 / ${applicationResult.errorCount}件失敗`);
    console.log(`担当設定: ${responsibilityResult.successCount}件成功 / ${responsibilityResult.errorCount}件失敗`);
    console.log(`全体成功率: ${((applicationResult.successCount + responsibilityResult.successCount) / (applicationResult.successCount + applicationResult.errorCount + responsibilityResult.successCount + responsibilityResult.errorCount) * 100).toFixed(1)}%`);
    
    return {
      fileName,
      applicationResult,
      responsibilityResult,
      period: `${demoData.startDate.split('T')[0]} - ${demoData.endDate.split('T')[0]}`
    };
    
  } catch (error) {
    console.error('❌ 申請予定投入エラー:', error.message);
    throw error;
  }
}

// スクリプト実行
if (require.main === module) {
  registerPortfolioPendingData60Days()
    .then(() => {
      console.log('\n🏁 ポートフォリオ用60日分投入スクリプト完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 投入スクリプト失敗:', error);
      process.exit(1);
    });
}

module.exports = { registerPortfolioPendingData60Days, getTodayFileName };