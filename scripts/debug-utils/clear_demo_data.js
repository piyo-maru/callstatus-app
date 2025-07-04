const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearDemoData() {
  try {
    console.log('🗑️  申請予定と担当設定を削除中...');
    
    // 外部キー制約のため、関連テーブルから順番に削除
    
    // 1. PendingApprovalLogsテーブル削除
    const deletedLogs = await prisma.pendingApprovalLog.deleteMany({});
    console.log('✅ 承認ログ削除:', deletedLogs.count + '件');
    
    // 2. Adjustmentテーブル削除
    const deletedAdjustments = await prisma.adjustment.deleteMany({});
    console.log('✅ 申請予定削除:', deletedAdjustments.count + '件');
    
    // 3. Responsibilityテーブル削除  
    const deletedResponsibilities = await prisma.responsibility.deleteMany({});
    console.log('✅ 担当設定削除:', deletedResponsibilities.count + '件');
    
    console.log('🎉 データ削除完了');
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearDemoData();