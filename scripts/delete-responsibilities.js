#!/usr/bin/env node

/**
 * 担当設定削除スクリプト
 * DailyAssignmentテーブルの全データを削除
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteAllResponsibilities() {
  try {
    console.log('🗑️  担当設定削除開始...');
    
    // 担当設定の削除
    const responsibilityCount = await prisma.dailyAssignment.count();
    console.log(`👥 DailyAssignment削除対象: ${responsibilityCount}件`);
    
    if (responsibilityCount > 0) {
      await prisma.dailyAssignment.deleteMany({});
      console.log(`✅ DailyAssignment ${responsibilityCount}件を削除完了`);
    }
    
    // 削除後の確認
    const remainingResponsibilities = await prisma.dailyAssignment.count();
    
    console.log('\n🔍 削除後確認:');
    console.log(`  DailyAssignment: ${remainingResponsibilities}件`);
    
    if (remainingResponsibilities === 0) {
      console.log('✅ 担当設定完全削除確認！');
    } else {
      console.log('⚠️  一部担当設定が残存しています');
    }
    
    console.log(`\n📊 削除結果: ${responsibilityCount}件削除`);
    
  } catch (error) {
    console.error('❌ 担当設定削除エラー:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// メイン実行
if (require.main === module) {
  deleteAllResponsibilities()
    .then(() => {
      console.log('🏁 担当設定削除スクリプト完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 担当設定削除スクリプト失敗:', error);
      process.exit(1);
    });
}

module.exports = { deleteAllResponsibilities };