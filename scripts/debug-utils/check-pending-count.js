const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCurrentPending() {
  try {
    const count = await prisma.adjustment.count({
      where: {
        isPending: true,
        pendingType: 'monthly-planner'
      }
    });
    
    console.log(`現在のpending件数: ${count}件`);
    
    // 月別内訳も確認
    const monthlyCount = await prisma.adjustment.groupBy({
      by: ['date'],
      where: {
        isPending: true,
        pendingType: 'monthly-planner'
      },
      _count: {
        id: true
      }
    });
    
    const monthMap = {};
    monthlyCount.forEach(item => {
      const month = new Date(item.date).toISOString().substring(0, 7);
      monthMap[month] = (monthMap[month] || 0) + item._count.id;
    });
    
    console.log('\n月別内訳:');
    Object.entries(monthMap).forEach(([month, count]) => {
      console.log(`  ${month}: ${count}件`);
    });
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCurrentPending();