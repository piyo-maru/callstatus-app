const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugContractHours() {
  try {
    console.log('=== 契約の勤務時間確認 ===');
    
    // 契約データのサンプルを取得
    const contracts = await prisma.contract.findMany({
      take: 5,
      include: {
        staff: {
          select: { id: true, name: true }
        }
      }
    });
    
    console.log('契約サンプル:');
    contracts.forEach(contract => {
      console.log(`\nスタッフ: ${contract.staff.name} (ID: ${contract.staff.id})`);
      console.log(`  社員番号: ${contract.empNo}`);
      console.log(`  月曜: ${contract.mondayHours}`);
      console.log(`  火曜: ${contract.tuesdayHours}`);
      console.log(`  水曜: ${contract.wednesdayHours}`);
      console.log(`  木曜: ${contract.thursdayHours}`);
      console.log(`  金曜: ${contract.fridayHours}`);
      console.log(`  土曜: ${contract.saturdayHours}`);
      console.log(`  日曜: ${contract.sundayHours}`);
    });
    
    // 各曜日の勤務時間が設定されている契約数
    const dayCountsPromises = [
      { day: '月曜', field: 'mondayHours' },
      { day: '火曜', field: 'tuesdayHours' },
      { day: '水曜', field: 'wednesdayHours' },
      { day: '木曜', field: 'thursdayHours' },
      { day: '金曜', field: 'fridayHours' },
      { day: '土曜', field: 'saturdayHours' },
      { day: '日曜', field: 'sundayHours' }
    ].map(async ({ day, field }) => {
      const count = await prisma.contract.count({
        where: {
          [field]: {
            not: null
          }
        }
      });
      return { day, count };
    });
    
    const dayCounts = await Promise.all(dayCountsPromises);
    
    console.log('\n=== 各曜日の勤務設定数 ===');
    dayCounts.forEach(({ day, count }) => {
      console.log(`${day}: ${count}件`);
    });
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugContractHours();