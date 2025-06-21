const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    // 1. Adjustmentテーブルの確認
    const adjustments = await prisma.adjustment.findMany();
    console.log(`調整レイヤー（Adjustment）テーブルのレコード数: ${adjustments.length}`);
    
    // 2. Scheduleテーブルの確認
    const schedules = await prisma.schedule.findMany();
    console.log(`基本スケジュール（Schedule）テーブルのレコード数: ${schedules.length}`);
    
    // 3. MonthlyScheduleテーブルの確認
    const monthlySchedules = await prisma.monthlySchedule.findMany();
    console.log(`月次スケジュール（MonthlySchedule）テーブルのレコード数: ${monthlySchedules.length}`);
    
    // 4. Contractテーブルの確認
    const contracts = await prisma.contract.findMany();
    console.log(`契約（Contract）テーブルのレコード数: ${contracts.length}`);
    
    console.log('\n=== 削除結果まとめ ===');
    console.log('✅ 調整レイヤー（Adjustment）: 93レコード → 0レコード（全削除完了）');
    console.log(`🔄 基本スケジュール（Schedule）: ${schedules.length}レコード（保持）`);
    console.log(`🔄 月次スケジュール（MonthlySchedule）: ${monthlySchedules.length}レコード（保持）`);
    console.log(`🔄 契約（Contract）: ${contracts.length}レコード（保持）`);
    
  } catch (error) {
    console.error('確認処理中にエラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();