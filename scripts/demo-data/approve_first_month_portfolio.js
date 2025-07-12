#!/usr/bin/env node

/**
 * ポートフォリオ用前半1ヶ月分（8月）承認処理スクリプト
 * 正規の一括承認API（POST /api/admin/pending-schedules/bulk-approval）を使用
 * 月次計画ページで承認済み（✓マーク付き塗りつぶし）として正しく表示
 */

const fetch = require('node-fetch');

// 設定
const API_BASE_URL = 'http://localhost:3002';

// APIリクエスト
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

// 8月分のPendingスケジュールID取得
async function getAugustPendingIds() {
  console.log('📋 8月分のPendingスケジュールID取得中...');
  
  try {
    const response = await apiRequest(`${API_BASE_URL}/api/admin/pending-schedules?month=2025-08`);
    
    if (!response.ok) {
      throw new Error(`Pending取得エラー: ${response.status}`);
    }
    
    const pendingSchedules = await response.json();
    
    // 8月分のみフィルタリング（2025-08-01 〜 2025-08-31）
    const augustPending = pendingSchedules.filter(pending => {
      const date = pending.date;
      return date >= '2025-08-01' && date <= '2025-08-31';
    });
    
    const pendingIds = augustPending.map(pending => pending.id);
    
    console.log(`✅ 8月分Pendingスケジュール: ${pendingIds.length}件取得`);
    
    return pendingIds;
    
  } catch (error) {
    console.error('❌ PendingスケジュールID取得エラー:', error.message);
    throw error;
  }
}

// 正規一括承認API実行
async function bulkApproval(pendingIds) {
  console.log(`📝 正規一括承認API実行: ${pendingIds.length}件`);
  
  try {
    const approvalData = {
      pendingIds: pendingIds,
      action: 'approve',
      reason: 'ポートフォリオデモ用承認 - 8月分一括承認'
    };
    
    const response = await apiRequest(`${API_BASE_URL}/api/admin/pending-schedules/bulk-approval`, {
      method: 'POST',
      body: JSON.stringify(approvalData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`一括承認エラー: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    
    console.log('\n📊 一括承認結果:');
    console.log(`✅ 成功: ${result.successCount}件`);
    console.log(`❌ 失敗: ${result.failedCount}件`);
    console.log(`📋 処理合計: ${result.totalProcessed}件`);
    
    if (result.errors && result.errors.length > 0) {
      console.log('\n⚠️  エラー詳細 (最初の5件):');
      result.errors.slice(0, 5).forEach((err, idx) => {
        console.log(`${idx + 1}. ID${err.pendingId}: ${err.error}`);
      });
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ 一括承認実行エラー:', error.message);
    throw error;
  }
}

// 承認結果確認
async function verifyApprovalResult() {
  console.log('\n🔍 承認結果確認中...');
  
  try {
    const response = await apiRequest(`${API_BASE_URL}/api/admin/pending-schedules?month=2025-08`);
    
    if (!response.ok) {
      throw new Error(`承認結果確認エラー: ${response.status}`);
    }
    
    const pendingSchedules = await response.json();
    
    // 8月分のみフィルタリング
    const augustSchedules = pendingSchedules.filter(pending => {
      const date = pending.date;
      return date >= '2025-08-01' && date <= '2025-08-31';
    });
    
    const approvedCount = augustSchedules.filter(pending => pending.approvedAt).length;
    const pendingCount = augustSchedules.filter(pending => !pending.approvedAt && !pending.rejectedAt).length;
    
    console.log(`📊 8月分承認状況:`);
    console.log(`✅ 承認済み: ${approvedCount}件`);
    console.log(`⏳ 承認待ち: ${pendingCount}件`);
    console.log(`📋 合計: ${augustSchedules.length}件`);
    
    if (approvedCount > 0) {
      console.log('\n🎉 月次計画ページで承認済み（✓マーク付き塗りつぶし）として表示されます！');
    }
    
    return { approvedCount, pendingCount, total: augustSchedules.length };
    
  } catch (error) {
    console.error('❌ 承認結果確認エラー:', error.message);
    throw error;
  }
}

// メイン実行関数
async function main() {
  console.log('🚀 ポートフォリオ用8月分承認処理開始...\n');
  
  try {
    // APIサーバー接続確認
    const healthCheck = await fetch(`${API_BASE_URL}/api/test`);
    if (!healthCheck.ok) {
      throw new Error('APIサーバーに接続できません');
    }
    console.log('✅ APIサーバー接続確認完了\n');
    
    // 8月分のPendingスケジュールID取得
    const pendingIds = await getAugustPendingIds();
    
    if (pendingIds.length === 0) {
      console.log('ℹ️  8月分のPendingスケジュールが見つかりません。');
      return;
    }
    
    // 正規一括承認API実行
    const approvalResult = await bulkApproval(pendingIds);
    
    // 承認結果確認
    const verificationResult = await verifyApprovalResult();
    
    console.log('\n🎉 ポートフォリオ用8月分承認処理完了！');
    console.log('📱 月次計画ページ（http://localhost:3000/monthly-planner）で承認済み状態を確認できます');
    console.log('✨ 承認済み予定は塗りつぶし表示＋✓マークで表示されます');
    
  } catch (error) {
    console.error('❌ 承認処理エラー:', error.message);
    throw error;
  }
}

// スクリプト実行
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n🏁 ポートフォリオ用承認処理スクリプト完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 承認処理スクリプト失敗:', error);
      process.exit(1);
    });
}

module.exports = { main };