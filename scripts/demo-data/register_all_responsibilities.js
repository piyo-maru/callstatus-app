#!/usr/bin/env node

/**
 * 全担当設定登録スクリプト (改善版)
 * 7月-9月の担当設定を自動登録し、次回実行時にスムーズに動作するよう最適化
 */

const fs = require('fs');
const path = require('path');

// 設定
const CONFIG = {
  API_BASE_URL: 'http://localhost:3002/api',
  RETRY_COUNT: 3,
  RETRY_DELAY: 500, // ms
  BATCH_DELAY: 50,  // ms
  TIMEOUT: 10000,   // ms
};

// ファイルパス
const DATA_FILES = [
  'demo_data_july_2025.json',
  'demo_data_august_2025.json', 
  'demo_data_september_2025.json'
];

// API接続確認
async function checkApiConnection() {
  console.log('🔍 API接続確認中...');
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);
    
    const response = await fetch(`${CONFIG.API_BASE_URL}/daily-assignments?date=2025-07-07`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API接続エラー: ${response.status}`);
    }
    
    console.log('✅ API接続確認完了');
    return true;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('❌ API接続タイムアウト (10秒)');
    } else {
      console.error(`❌ API接続失敗: ${error.message}`);
    }
    console.error('💡 解決方法:');
    console.error('   1. docker-compose up -d でサービス起動');
    console.error('   2. docker exec -it callstatus-app_backend_1 bash -c "cd /app && npm run start:dev"');
    return false;
  }
}

// ファイル存在確認
function checkDataFiles() {
  console.log('📁 データファイル確認中...');
  
  const missingFiles = [];
  for (const filename of DATA_FILES) {
    if (!fs.existsSync(filename)) {
      missingFiles.push(filename);
    }
  }
  
  if (missingFiles.length > 0) {
    console.error('❌ データファイルが見つかりません:');
    missingFiles.forEach(file => console.error(`   - ${file}`));
    console.error('💡 解決方法:');
    console.error('   以下のコマンドでデータファイルを生成してください:');
    missingFiles.forEach(file => {
      const month = file.includes('july') ? 'july' : file.includes('august') ? 'august' : 'september';
      console.error(`   node generate_demo_${month}_2025.js`);
    });
    return false;
  }
  
  console.log('✅ 全データファイル確認完了');
  return true;
}

// 担当設定作成API呼び出し (リトライ機能付き)
async function createResponsibilityWithRetry(respData, retryCount = 0) {
  const assignmentType = respData.responsibilities[0];
  let customLabel = '';
  
  if (respData.responsibilities.length > 1) {
    customLabel = respData.responsibilities.slice(1).join(', ');
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);
    
    const response = await fetch(`${CONFIG.API_BASE_URL}/daily-assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        staffId: respData.staffId,
        date: respData.date,
        assignmentType: assignmentType,
        customLabel: customLabel || undefined
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    return await response.json();
    
  } catch (error) {
    if (retryCount < CONFIG.RETRY_COUNT) {
      console.warn(`⚠️  リトライ ${retryCount + 1}/${CONFIG.RETRY_COUNT}: スタッフ${respData.staffId} ${respData.date}`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * (retryCount + 1)));
      return createResponsibilityWithRetry(respData, retryCount + 1);
    } else {
      throw error;
    }
  }
}

// データ読み込み
function loadResponsibilityData() {
  console.log('📊 データ読み込み中...');
  
  const allResponsibilities = [];
  let totalFiles = 0;
  
  for (const filename of DATA_FILES) {
    try {
      const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
      if (data.responsibilities && Array.isArray(data.responsibilities)) {
        allResponsibilities.push(...data.responsibilities);
        console.log(`   ${filename}: ${data.responsibilities.length}件`);
        totalFiles++;
      } else {
        console.warn(`⚠️  ${filename}: responsibilities配列が見つかりません`);
      }
    } catch (error) {
      console.error(`❌ ${filename}読み込みエラー: ${error.message}`);
    }
  }
  
  console.log(`✅ ${totalFiles}ファイル読み込み完了 (合計: ${allResponsibilities.length}件)`);
  return allResponsibilities;
}

// メイン登録処理
async function registerAllResponsibilities() {
  console.log('🚀 担当設定登録スクリプト開始');
  console.log('=====================================');
  
  // 事前チェック
  if (!await checkApiConnection()) {
    process.exit(1);
  }
  
  if (!checkDataFiles()) {
    process.exit(1);
  }
  
  // データ読み込み
  const allResponsibilities = loadResponsibilityData();
  
  if (allResponsibilities.length === 0) {
    console.log('⚠️  登録対象データがありません');
    return;
  }
  
  console.log('=====================================');
  console.log(`📝 担当設定登録開始: ${allResponsibilities.length}件`);
  console.log(`⚙️  設定: リトライ${CONFIG.RETRY_COUNT}回, 間隔${CONFIG.BATCH_DELAY}ms`);
  console.log('=====================================');
  
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  const startTime = Date.now();
  
  // 進捗表示用
  const total = allResponsibilities.length;
  let processedCount = 0;
  
  for (const resp of allResponsibilities) {
    processedCount++;
    const progress = Math.round((processedCount / total) * 100);
    
    try {
      const result = await createResponsibilityWithRetry(resp);
      console.log(`✅ [${progress.toString().padStart(3)}%] 成功: スタッフ${resp.staffId} ${resp.date} ${resp.description}`);
      successCount++;
      
    } catch (error) {
      const errorMsg = `スタッフ${resp.staffId} ${resp.date} ${resp.description} - ${error.message}`;
      console.error(`❌ [${progress.toString().padStart(3)}%] 失敗: ${errorMsg}`);
      errors.push(errorMsg);
      errorCount++;
    }
    
    // API負荷軽減
    if (processedCount < total) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
    }
  }
  
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);
  
  console.log('\n=====================================');
  console.log('📊 最終結果:');
  console.log(`担当設定: ✅ 成功 ${successCount}件 / ❌ 失敗 ${errorCount}件`);
  console.log(`⏱️  実行時間: ${duration}秒`);
  console.log(`🎯 成功率: ${Math.round((successCount / total) * 100)}%`);
  
  if (errorCount === 0) {
    console.log('🎉 全ての担当設定が正常に登録されました！');
  } else {
    console.log('⚠️  一部登録に失敗がありました:');
    errors.slice(0, 5).forEach(error => console.log(`   ${error}`));
    if (errors.length > 5) {
      console.log(`   ... 他${errors.length - 5}件`);
    }
    
    console.log('\n💡 トラブルシューティング:');
    console.log('   1. バックエンドサービスが起動しているか確認');
    console.log('   2. データベース接続を確認');
    console.log('   3. スタッフIDが正しく存在するか確認');
  }
  
  console.log('=====================================');
  
  // 終了コード設定
  process.exit(errorCount > 0 ? 1 : 0);
}

// スクリプト実行
if (require.main === module) {
  registerAllResponsibilities().catch(error => {
    console.error('\n💥 予期しないエラーが発生しました:');
    console.error(error);
    process.exit(1);
  });
}

module.exports = { registerAllResponsibilities };