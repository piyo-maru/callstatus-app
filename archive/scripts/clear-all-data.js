const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearAllData() {
  try {
    console.log('=== 全データクリア開始 ===');
    
    // 1. 関連テーブルから順番に削除（外部キー制約を考慮）
    
    // 日次業務割り当て
    const deletedDailyAssignments = await prisma.dailyAssignment.deleteMany();
    console.log(`DailyAssignment削除: ${deletedDailyAssignments.count}件`);
    
    // 一時的割り当て
    const deletedTempAssignments = await prisma.temporaryAssignment.deleteMany();
    console.log(`TemporaryAssignment削除: ${deletedTempAssignments.count}件`);
    
    // 担当設定
    const deletedResponsibilities = await prisma.staffResponsibility.deleteMany();
    console.log(`StaffResponsibility削除: ${deletedResponsibilities.count}件`);
    
    // 調整データ
    const deletedAdjustments = await prisma.adjustment.deleteMany();
    console.log(`Adjustment削除: ${deletedAdjustments.count}件`);
    
    // 月次スケジュール
    const deletedMonthlySchedules = await prisma.monthlySchedule.deleteMany();
    console.log(`MonthlySchedule削除: ${deletedMonthlySchedules.count}件`);
    
    // 契約データ
    const deletedContracts = await prisma.contract.deleteMany();
    console.log(`Contract削除: ${deletedContracts.count}件`);
    
    // 従来のスケジュールデータ
    const deletedSchedules = await prisma.schedule.deleteMany();
    console.log(`Schedule削除: ${deletedSchedules.count}件`);
    
    // スタッフデータ
    const deletedStaff = await prisma.staff.deleteMany();
    console.log(`Staff削除: ${deletedStaff.count}件`);
    
    console.log('=== 全データクリア完了 ===');
    
    // 確認：各テーブルのカウント
    const counts = await Promise.all([
      prisma.staff.count(),
      prisma.contract.count(),
      prisma.schedule.count(),
      prisma.adjustment.count(),
      prisma.monthlySchedule.count(),
      prisma.temporaryAssignment.count(),
      prisma.dailyAssignment.count(),
      prisma.staffResponsibility.count()
    ]);
    
    console.log('\n=== 削除後の確認 ===');
    console.log(`Staff: ${counts[0]}件`);
    console.log(`Contract: ${counts[1]}件`);
    console.log(`Schedule: ${counts[2]}件`);
    console.log(`Adjustment: ${counts[3]}件`);
    console.log(`MonthlySchedule: ${counts[4]}件`);
    console.log(`TemporaryAssignment: ${counts[5]}件`);
    console.log(`DailyAssignment: ${counts[6]}件`);
    console.log(`StaffResponsibility: ${counts[7]}件`);
    
    if (counts.every(count => count === 0)) {
      console.log('\n✅ 全てのデータが正常にクリアされました');
    } else {
      console.log('\n⚠️  一部データが残っています');
    }
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllData();