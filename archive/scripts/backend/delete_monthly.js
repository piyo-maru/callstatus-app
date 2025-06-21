const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteMonthlySchedules() {
  try {
    const result = await prisma.monthlySchedule.deleteMany({});
    console.log('削除されたレコード数:', result.count);
    console.log('レイヤー2（MonthlySchedule）のデータを全削除しました');
  } catch (error) {
    console.error('削除に失敗:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteMonthlySchedules();
