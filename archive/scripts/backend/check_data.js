const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const contracts = await prisma.contract.count();
    const monthlySchedules = await prisma.monthlySchedule.count();
    const adjustments = await prisma.adjustment.count();
    const staff = await prisma.staff.count();
    
    console.log('=== データベース状況 ===');
    console.log('スタッフ数:', staff);
    console.log('レイヤー1（Contract）:', contracts);
    console.log('レイヤー2（MonthlySchedule）:', monthlySchedules);
    console.log('レイヤー3（Adjustment）:', adjustments);
  } catch (error) {
    console.error('確認に失敗:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
