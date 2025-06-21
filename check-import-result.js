const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkImportResult() {
  try {
    console.log('=== インポート結果確認 ===');
    
    // 各テーブルのデータ数
    const counts = await Promise.all([
      prisma.staff.count(),
      prisma.contract.count(),
      prisma.schedule.count(),
      prisma.adjustment.count(),
      prisma.monthlySchedule.count()
    ]);
    
    console.log(`Staff: ${counts[0]}件`);
    console.log(`Contract: ${counts[1]}件`);
    console.log(`Schedule: ${counts[2]}件`);
    console.log(`Adjustment: ${counts[3]}件`);
    console.log(`MonthlySchedule: ${counts[4]}件`);
    
    // スタッフサンプル
    if (counts[0] > 0) {
      console.log('\n=== スタッフサンプル（最初の3人） ===');
      const staffSamples = await prisma.staff.findMany({
        take: 3,
        include: {
          contracts: true
        }
      });
      
      staffSamples.forEach(staff => {
        console.log(`ID: ${staff.id}, 名前: ${staff.name}, isActive: ${staff.isActive}, 契約数: ${staff.contracts.length}`);
      });
    }
    
    // アクティブスタッフ数
    const activeStaff = await prisma.staff.count({
      where: { isActive: true }
    });
    console.log(`\nアクティブスタッフ数: ${activeStaff}件`);
    
    // 契約があるスタッフ数
    if (counts[1] > 0) {
      const staffWithContracts = await prisma.staff.count({
        where: {
          contracts: {
            some: {}
          }
        }
      });
      console.log(`契約があるスタッフ数: ${staffWithContracts}件`);
    }
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkImportResult();