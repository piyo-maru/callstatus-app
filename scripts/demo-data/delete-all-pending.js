#!/usr/bin/env node

/**
 * 月次計画ページの申請予定（pending）を全て削除するスクリプト
 */

const fetch = require('node-fetch');

const CONFIG = {
  API_BASE_URL: 'http://localhost:3002/api',
  BATCH_SIZE: 100,
  DELAY: 100, // ms
};

async function getAllPendingSchedules() {
  console.log('📋 申請予定（pending）一覧を取得中...');
  
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/schedules/pending`);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${response.statusText}`);
    }
    
    const pendingSchedules = await response.json();
    console.log(`✅ 取得完了: ${pendingSchedules.length}件の申請予定を発見`);
    
    return pendingSchedules;
  } catch (error) {
    console.error('❌ 申請予定の取得に失敗:', error.message);
    throw error;
  }
}

async function deletePendingSchedule(pendingId) {
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/schedules/pending/${pendingId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`削除失敗: ${response.status} - ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ ID:${pendingId} の削除に失敗:`, error.message);
    return false;
  }
}

async function deleteAllPendingSchedules() {
  console.log('🗑️  月次計画申請予定（pending）全削除スクリプト開始');
  console.log('===============================================');
  
  // 1. 全pending予定を取得
  const pendingSchedules = await getAllPendingSchedules();
  
  if (pendingSchedules.length === 0) {
    console.log('✅ 削除対象の申請予定はありません');
    return;
  }
  
  console.log('===============================================');
  console.log(`🚨 削除対象: ${pendingSchedules.length}件の申請予定`);
  console.log('⚠️  この操作は取り消せません！');
  console.log('===============================================');
  
  // 確認メッセージ（実際の環境では手動確認が必要）
  console.log('⏳ 削除を開始します...');
  
  let successCount = 0;
  let errorCount = 0;
  const startTime = Date.now();
  
  // 2. バッチ処理で削除
  for (let i = 0; i < pendingSchedules.length; i += CONFIG.BATCH_SIZE) {
    const batch = pendingSchedules.slice(i, i + CONFIG.BATCH_SIZE);
    const batchNumber = Math.floor(i / CONFIG.BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(pendingSchedules.length / CONFIG.BATCH_SIZE);
    
    console.log(`📦 バッチ ${batchNumber}/${totalBatches} 処理中... (${batch.length}件)`);
    
    // バッチ内で並列削除
    const promises = batch.map(async (pending) => {
      const success = await deletePendingSchedule(pending.id);
      return { success, pending };
    });
    
    const results = await Promise.all(promises);
    
    // 結果集計
    for (const { success, pending } of results) {
      if (success) {
        successCount++;
        console.log(`  ✅ 削除成功: ${pending.staffName} ${pending.date.split('T')[0]} ${pending.status}`);
      } else {
        errorCount++;
        console.log(`  ❌ 削除失敗: ${pending.staffName} ${pending.date.split('T')[0]} ${pending.status}`);
      }
    }
    
    // バッチ間の待機
    if (i + CONFIG.BATCH_SIZE < pendingSchedules.length) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY));
    }
  }
  
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);
  
  console.log('===============================================');
  console.log('📊 削除結果:');
  console.log(`✅ 成功: ${successCount}件`);
  console.log(`❌ 失敗: ${errorCount}件`);
  console.log(`⏱️  実行時間: ${duration}秒`);
  console.log(`🎯 成功率: ${Math.round((successCount / pendingSchedules.length) * 100)}%`);
  
  if (errorCount === 0) {
    console.log('🎉 全ての申請予定（pending）を正常に削除しました！');
  } else {
    console.log('⚠️  一部削除に失敗した予定があります');
  }
  
  console.log('===============================================');
  
  // 3. 削除後の確認
  console.log('🔍 削除後の状況確認...');
  try {
    const remainingSchedules = await getAllPendingSchedules();
    if (remainingSchedules.length === 0) {
      console.log('✅ 確認完了: 申請予定（pending）は全て削除されました');
    } else {
      console.log(`⚠️  残存確認: ${remainingSchedules.length}件の申請予定が残っています`);
    }
  } catch (error) {
    console.log('⚠️  削除後確認でエラーが発生しましたが、削除処理は完了しています');
  }
}

// スクリプト実行
if (require.main === module) {
  deleteAllPendingSchedules()
    .then(() => {
      console.log('✨ スクリプト正常終了');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 スクリプト実行エラー:', error);
      process.exit(1);
    });
}

module.exports = { deleteAllPendingSchedules };