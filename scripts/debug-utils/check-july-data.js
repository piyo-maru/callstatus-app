const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkJulyData() {
  try {
    console.log('=== 7月データ確認 ===');
    
    // 7月のAdjustmentデータを確認
    const julyAdjustments = await prisma.adjustment.findMany({
      where: {
        date: {
          gte: new Date('2025-07-01'),
          lt: new Date('2025-08-01')
        },
        memo: {
          contains: '（ランダム設定）'
        }
      },
      include: {
        Staff: { select: { name: true } }
      },
      orderBy: [{ date: 'asc' }, { staffId: 'asc' }],
      take: 20
    });
    
    console.log(`\n7月のランダム設定データ: ${julyAdjustments.length}件`);
    
    if (julyAdjustments.length > 0) {
      console.log('\n最初の20件:');
      julyAdjustments.forEach(adj => {
        const dateStr = adj.date.toISOString().split('T')[0];
        const startTime = adj.start.toISOString().split('T')[1].substring(0, 5);
        const endTime = adj.end.toISOString().split('T')[1].substring(0, 5);
        console.log(`${dateStr} ${adj.Staff.name}: ${adj.memo} (${startTime}-${endTime}) [${adj.status}]`);
      });
    }
    
    // 全体の7月Adjustmentデータ
    const allJulyData = await prisma.adjustment.count({
      where: {
        date: {
          gte: new Date('2025-07-01'),
          lt: new Date('2025-08-01')
        }
      }
    });
    
    console.log(`\n7月の全Adjustmentデータ: ${allJulyData}件`);
    
    // 月次プランナー用APIでの取得テスト
    console.log('\n=== APIでの取得テスト ===');
    
    // 統合APIでの7月データ取得
    const unifiedData = await prisma.adjustment.findMany({
      where: {
        date: {
          gte: new Date('2025-07-01'),
          lt: new Date('2025-08-01')
        },
        OR: [
          { isPending: false },
          { isPending: null }
        ]
      },
      include: {
        Staff: {
          select: {
            id: true,
            name: true,
            empNo: true,
            department: true,
            group: true
          }
        }
      },
      take: 10
    });
    
    console.log(`統合API形式での7月データ: ${unifiedData.length}件`);
    
    if (unifiedData.length > 0) {
      console.log('統合API最初の10件:');
      unifiedData.forEach(adj => {
        const dateStr = adj.date.toISOString().split('T')[0];
        console.log(`${dateStr} ${adj.Staff.name}: ${adj.status} (${adj.memo})`);
      });
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkJulyData();