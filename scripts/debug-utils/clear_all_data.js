const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearAllData() {
  try {
    console.log('🗑️  全データ削除中...');
    
    // 外部キー制約のため、関連テーブルから順番に削除
    
    // 1. PendingApprovalLogsテーブル削除
    const deletedLogs = await prisma.pendingApprovalLog.deleteMany({});
    console.log('✅ 承認ログ削除:', deletedLogs.count + '件');
    
    // 2. Adjustmentテーブル削除
    const deletedAdjustments = await prisma.adjustment.deleteMany({});
    console.log('✅ 申請予定削除:', deletedAdjustments.count + '件');
    
    // 3. Responsibilityテーブル削除（存在する場合）
    try {
      const deletedResponsibilities = await prisma.responsibility.deleteMany({});
      console.log('✅ 担当設定削除:', deletedResponsibilities.count + '件');
    } catch (error) {
      console.log('⚠️  担当設定テーブルが見つかりません（スキップ）');
    }
    
    // 4. DailyAssignmentテーブル削除（存在する場合）
    try {
      const deletedAssignments = await prisma.dailyAssignment.deleteMany({});
      console.log('✅ 日次割り当て削除:', deletedAssignments.count + '件');
    } catch (error) {
      console.log('⚠️  日次割り当てテーブルが見つかりません（スキップ）');
    }
    
    // 5. ContractDisplayCacheテーブル削除
    try {
      const deletedCache = await prisma.contractDisplayCache.deleteMany({});
      console.log('✅ 契約表示キャッシュ削除:', deletedCache.count + '件');
    } catch (error) {
      console.log('⚠️  契約表示キャッシュテーブルが見つかりません（スキップ）');
    }
    
    // 6. Contractテーブル削除
    const deletedContracts = await prisma.contract.deleteMany({});
    console.log('✅ 契約情報削除:', deletedContracts.count + '件');
    
    // 7. Staffテーブル削除
    const deletedStaff = await prisma.staff.deleteMany({});
    console.log('✅ スタッフ情報削除:', deletedStaff.count + '件');
    
    console.log('🎉 全データ削除完了');
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllData();