const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNightShiftData() {
  try {
    // 夜間担当の申請予定を確認
    const nightShiftCount = await prisma.adjustment.count({
      where: {
        OR: [
          { memo: { contains: '夜間担当' } },
          { status: 'night duty' }
        ]
      }
    });
    
    console.log('夜間担当申請予定:', nightShiftCount + '件');
    
    // 詳細データをいくつか確認
    const sampleData = await prisma.adjustment.findMany({
      where: {
        OR: [
          { memo: { contains: '夜間担当' } },
          { status: 'night duty' }
        ]
      },
      take: 5,
      select: {
        id: true,
        staffId: true,
        date: true,
        status: true,
        start: true,
        end: true,
        memo: true
      }
    });
    
    console.log('\n夜間担当データサンプル:');
    sampleData.forEach((item, index) => {
      const startTime = item.start ? item.start.toISOString().split('T')[1].slice(0,5) : 'なし';
      const endTime = item.end ? item.end.toISOString().split('T')[1].slice(0,5) : 'なし';
      const dateStr = item.date.toISOString().split('T')[0];
      console.log(`${index + 1}. スタッフ${item.staffId} ${dateStr} ステータス:${item.status} 時間:${startTime}-${endTime} メモ:${item.memo || 'なし'}`);
    });
    
    // 全ステータス種類を確認
    const statusCounts = await prisma.adjustment.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });
    
    console.log('\n全ステータス統計:');
    statusCounts.forEach(item => {
      console.log(`${item.status}: ${item._count.status}件`);
    });
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNightShiftData();