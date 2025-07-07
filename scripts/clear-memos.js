#!/usr/bin/env node

/**
 * 契約・調整レイヤーのメモ削除スクリプト
 * ContractとAdjustmentテーブルのmemoフィールドをすべてクリア
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearAllMemos() {
  try {
    console.log('🗑️  メモクリア開始...');
    
    // 契約データのメモクリア
    console.log('\n📋 契約レイヤーのメモクリア...');
    const contractCount = await prisma.contract.count();
    console.log(`📄 Contract削除対象: ${contractCount}件`);
    
    if (contractCount > 0) {
      // Contractテーブルにはmemoカラムがないので、reasonやその他のテキストフィールドをチェック
      const contractUpdate = await prisma.contract.updateMany({
        data: {
          // Contractテーブルの構造を確認
        }
      });
      console.log(`✅ Contract更新: ${contractUpdate.count}件`);
    }
    
    // 調整データのメモクリア
    console.log('\n📝 調整レイヤーのメモクリア...');
    const adjustmentCount = await prisma.adjustment.count();
    console.log(`📄 Adjustment削除対象: ${adjustmentCount}件`);
    
    if (adjustmentCount > 0) {
      const adjustmentUpdate = await prisma.adjustment.updateMany({
        data: {
          memo: null,
          reason: null
        }
      });
      console.log(`✅ Adjustment更新: ${adjustmentUpdate.count}件`);
    }
    
    // Scheduleテーブルのメモクリア
    console.log('\n📅 スケジュールのメモクリア...');
    const scheduleCount = await prisma.schedule.count();
    console.log(`📄 Schedule削除対象: ${scheduleCount}件`);
    
    if (scheduleCount > 0) {
      const scheduleUpdate = await prisma.schedule.updateMany({
        data: {
          memo: null
        }
      });
      console.log(`✅ Schedule更新: ${scheduleUpdate.count}件`);
    }
    
    // MonthlyScheduleテーブルのメモクリア
    console.log('\n📆 月次スケジュールのメモクリア...');
    const monthlyCount = await prisma.monthlySchedule.count();
    console.log(`📄 MonthlySchedule削除対象: ${monthlyCount}件`);
    
    if (monthlyCount > 0) {
      const monthlyUpdate = await prisma.monthlySchedule.updateMany({
        data: {
          memo: null
        }
      });
      console.log(`✅ MonthlySchedule更新: ${monthlyUpdate.count}件`);
    }
    
    console.log('\n🎉 メモクリア完了！');
    console.log(`📊 処理結果:`);
    console.log(`  Contract: ${contractCount}件処理`);
    console.log(`  Adjustment: ${adjustmentCount}件処理`);
    console.log(`  Schedule: ${scheduleCount}件処理`);
    console.log(`  MonthlySchedule: ${monthlyCount}件処理`);
    
    // クリア後の確認
    const remainingAdjustmentMemos = await prisma.adjustment.count({
      where: {
        OR: [
          { memo: { not: null } },
          { reason: { not: null } }
        ]
      }
    });
    
    const remainingScheduleMemos = await prisma.schedule.count({
      where: { memo: { not: null } }
    });
    
    const remainingMonthlyMemos = await prisma.monthlySchedule.count({
      where: { memo: { not: null } }
    });
    
    console.log('\n🔍 クリア後確認:');
    console.log(`  Adjustment残存メモ: ${remainingAdjustmentMemos}件`);
    console.log(`  Schedule残存メモ: ${remainingScheduleMemos}件`);
    console.log(`  MonthlySchedule残存メモ: ${remainingMonthlyMemos}件`);
    
    if (remainingAdjustmentMemos === 0 && remainingScheduleMemos === 0 && remainingMonthlyMemos === 0) {
      console.log('✅ メモ完全クリア確認！');
    } else {
      console.log('⚠️  一部メモが残存しています');
    }
    
  } catch (error) {
    console.error('❌ メモクリアエラー:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// メイン実行
if (require.main === module) {
  clearAllMemos()
    .then(() => {
      console.log('🏁 メモクリアスクリプト完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 メモクリアスクリプト失敗:', error);
      process.exit(1);
    });
}

module.exports = { clearAllMemos };