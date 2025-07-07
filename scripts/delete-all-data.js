#!/usr/bin/env node

/**
 * 全予定・申請予定削除スクリプト
 * 現在登録されているScheduleとAdjustment（pending含む）をすべて削除
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteAllScheduleData() {
  try {
    console.log('🗑️  全予定・申請予定削除開始...');
    
    // トランザクションで一括削除（外部キー制約を考慮した削除順序）
    const result = await prisma.$transaction(async (tx) => {
      // 1. Schedule テーブルの全削除
      const scheduleCount = await tx.schedule.count();
      console.log(`📅 Schedule削除対象: ${scheduleCount}件`);
      
      if (scheduleCount > 0) {
        await tx.schedule.deleteMany({});
        console.log(`✅ Schedule ${scheduleCount}件を削除完了`);
      }
      
      // 2. PendingApprovalLog の削除（外部キー制約のため先に削除）
      const approvalLogCount = await tx.pendingApprovalLog.count();
      console.log(`📝 PendingApprovalLog削除対象: ${approvalLogCount}件`);
      
      if (approvalLogCount > 0) {
        await tx.pendingApprovalLog.deleteMany({});
        console.log(`✅ PendingApprovalLog ${approvalLogCount}件を削除完了`);
      }
      
      // 3. Adjustment テーブルの全削除（pending含む）
      const adjustmentCount = await tx.adjustment.count();
      const pendingCount = await tx.adjustment.count({
        where: { isPending: true }
      });
      
      console.log(`📋 Adjustment削除対象: ${adjustmentCount}件 (うちpending: ${pendingCount}件)`);
      
      if (adjustmentCount > 0) {
        await tx.adjustment.deleteMany({});
        console.log(`✅ Adjustment ${adjustmentCount}件を削除完了`);
      }
      
      // 4. MonthlySchedule の削除
      const monthlyCount = await tx.monthlySchedule.count();
      console.log(`📆 MonthlySchedule削除対象: ${monthlyCount}件`);
      
      if (monthlyCount > 0) {
        await tx.monthlySchedule.deleteMany({});
        console.log(`✅ MonthlySchedule ${monthlyCount}件を削除完了`);
      }
      
      return {
        scheduleCount,
        adjustmentCount,
        pendingCount,
        approvalLogCount,
        monthlyCount
      };
    });
    
    console.log('\n🎉 全削除完了！');
    console.log(`📊 削除結果:`);
    console.log(`  Schedule: ${result.scheduleCount}件`);
    console.log(`  Adjustment: ${result.adjustmentCount}件`);
    console.log(`  └── うちPending: ${result.pendingCount}件`);
    console.log(`  PendingApprovalLog: ${result.approvalLogCount}件`);
    console.log(`  MonthlySchedule: ${result.monthlyCount}件`);
    console.log(`  合計: ${result.scheduleCount + result.adjustmentCount + result.approvalLogCount + result.monthlyCount}件\n`);
    
    // 削除後の確認
    const remainingSchedules = await prisma.schedule.count();
    const remainingAdjustments = await prisma.adjustment.count();
    const remainingApprovalLogs = await prisma.pendingApprovalLog.count();
    const remainingMonthly = await prisma.monthlySchedule.count();
    
    console.log('🔍 削除後確認:');
    console.log(`  Schedule: ${remainingSchedules}件`);
    console.log(`  Adjustment: ${remainingAdjustments}件`);
    console.log(`  PendingApprovalLog: ${remainingApprovalLogs}件`);
    console.log(`  MonthlySchedule: ${remainingMonthly}件`);
    
    if (remainingSchedules === 0 && remainingAdjustments === 0 && 
        remainingApprovalLogs === 0 && remainingMonthly === 0) {
      console.log('✅ 完全削除確認！');
    } else {
      console.log('⚠️  一部データが残存しています');
    }
    
  } catch (error) {
    console.error('❌ 削除エラー:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// メイン実行
if (require.main === module) {
  deleteAllScheduleData()
    .then(() => {
      console.log('🏁 削除スクリプト完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 削除スクリプト失敗:', error);
      process.exit(1);
    });
}

module.exports = { deleteAllScheduleData };