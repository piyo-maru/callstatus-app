#!/usr/bin/env node

/**
 * ポートフォリオ用前半30日分承認処理スクリプト（動的日付対応）
 * 今日から30日分のPendingスケジュールを自動承認
 * 正規の一括承認API（POST /api/admin/pending-schedules/bulk-approval）を使用
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

// 今日から30日分の日付範囲計算
function getFirst30DaysRange() {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(startDate.getDate() + 29); // 30日分（0-29日目）
  
  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0]
  };
}

// 前半30日分のPendingスケジュールID取得
async function getFirst30DaysPendingIds() {
  const dateRange = getFirst30DaysRange();
  console.log(`📋 前半30日分のPendingスケジュールID取得中...`);
  console.log(`📅 対象期間: ${dateRange.start} - ${dateRange.end}`);
  
  try {
    const response = await apiRequest(`${API_BASE_URL}/api/admin/pending-schedules`);
    
    if (!response.ok) {
      throw new Error(`Pending取得エラー: ${response.status}`);
    }
    
    const pendingSchedules = await response.json();
    
    // 前半30日分のみフィルタリング
    const first30DaysPending = pendingSchedules.filter(pending => {
      const date = pending.date;
      return date >= dateRange.start && date <= dateRange.end;
    });
    
    const pendingIds = first30DaysPending.map(pending => pending.id);
    
    console.log(`✅ 前半30日分Pendingスケジュール: ${pendingIds.length}件取得`);
    
    return { pendingIds, dateRange };
    
  } catch (error) {
    console.error('❌ PendingスケジュールID取得エラー:', error.message);
    throw error;
  }
}

// 正規一括承認API実行
async function bulkApproval(pendingIds, dateRange) {
  console.log(`📝 正規一括承認API実行: ${pendingIds.length}件`);
  
  try {
    const approvalData = {
      pendingIds: pendingIds,
      action: 'approve',
      reason: `ポートフォリオデモ用承認 - 前半30日分一括承認 (${dateRange.start} - ${dateRange.end})`
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
async function verifyApprovalResult(dateRange) {
  console.log('\n🔍 承認結果確認中...');
  
  try {
    const response = await apiRequest(`${API_BASE_URL}/api/admin/pending-schedules`);
    
    if (!response.ok) {
      throw new Error(`承認結果確認エラー: ${response.status}`);
    }
    
    const pendingSchedules = await response.json();
    
    // 前半30日分のみフィルタリング
    const first30DaysSchedules = pendingSchedules.filter(pending => {
      const date = pending.date;
      return date >= dateRange.start && date <= dateRange.end;
    });
    
    // 後半30日分の統計も表示
    const next30DaysStart = new Date(dateRange.end);
    next30DaysStart.setDate(next30DaysStart.getDate() + 1);
    const next30DaysEnd = new Date(next30DaysStart);
    next30DaysEnd.setDate(next30DaysStart.getDate() + 29);
    
    const next30DaysSchedules = pendingSchedules.filter(pending => {
      const date = pending.date;
      return date >= next30DaysStart.toISOString().split('T')[0] && 
             date <= next30DaysEnd.toISOString().split('T')[0];
    });
    
    const first30Approved = first30DaysSchedules.filter(pending => pending.approvedAt).length;
    const first30Pending = first30DaysSchedules.filter(pending => !pending.approvedAt && !pending.rejectedAt).length;
    const next30Pending = next30DaysSchedules.filter(pending => !pending.approvedAt && !pending.rejectedAt).length;
    
    console.log(`📊 前半30日分承認状況 (${dateRange.start} - ${dateRange.end}):`);
    console.log(`✅ 承認済み: ${first30Approved}件`);
    console.log(`⏳ 承認待ち: ${first30Pending}件`);
    console.log(`📋 合計: ${first30DaysSchedules.length}件`);
    
    console.log(`\n📊 後半30日分状況 (${next30DaysStart.toISOString().split('T')[0]} - ${next30DaysEnd.toISOString().split('T')[0]}):`);
    console.log(`⏳ 承認待ち: ${next30Pending}件 (承認ワークフローデモ用)`);
    
    if (first30Approved > 0) {
      console.log('\n🎉 月次計画ページで承認済み（✓マーク付き塗りつぶし）として表示されます！');
      console.log('🎯 後半30日分は承認待ち状態なので、承認ワークフローのデモが可能です');
    }
    
    return { 
      first30: { approved: first30Approved, pending: first30Pending, total: first30DaysSchedules.length },
      next30: { pending: next30Pending },
      dateRange
    };
    
  } catch (error) {
    console.error('❌ 承認結果確認エラー:', error.message);
    throw error;
  }
}

// メイン実行関数
async function main() {
  console.log('🚀 ポートフォリオ用前半30日分承認処理開始（動的日付対応）...\n');
  
  try {
    // APIサーバー接続確認
    const healthCheck = await fetch(`${API_BASE_URL}/api/test`);
    if (!healthCheck.ok) {
      throw new Error('APIサーバーに接続できません');
    }
    console.log('✅ APIサーバー接続確認完了\n');
    
    // 前半30日分のPendingスケジュールID取得
    const { pendingIds, dateRange } = await getFirst30DaysPendingIds();
    
    if (pendingIds.length === 0) {
      console.log('ℹ️  前半30日分のPendingスケジュールが見つかりません。');
      return;
    }
    
    // 正規一括承認API実行
    const approvalResult = await bulkApproval(pendingIds, dateRange);
    
    // 承認結果確認
    const verificationResult = await verifyApprovalResult(dateRange);
    
    console.log('\n🎉 ポートフォリオ用前半30日分承認処理完了！');
    console.log('📱 月次計画ページ（http://localhost:3000/monthly-planner）で承認済み状態を確認できます');
    console.log('✨ 承認済み予定は塗りつぶし表示＋✓マークで表示されます');
    console.log('🎯 後半30日分は承認待ちなので、承認ワークフローのデモが可能です');
    
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

module.exports = { main, getFirst30DaysRange };