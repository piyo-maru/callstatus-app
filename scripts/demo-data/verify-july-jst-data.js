const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyJulyJSTData() {
  try {
    console.log('=== JST版7月データ確認 ===');
    
    // JST版ランダム設定データをカウント
    const jstRandomCount = await prisma.adjustment.count({
      where: {
        date: {
          gte: new Date('2025-07-01'),
          lt: new Date('2025-08-01')
        },
        memo: {
          contains: '（JST版ランダム設定）'
        }
      }
    });
    
    console.log(`JST版ランダム設定データ: ${jstRandomCount}件`);
    
    // サンプルデータを確認
    const sampleData = await prisma.adjustment.findMany({
      where: {
        date: {
          gte: new Date('2025-07-01'),
          lt: new Date('2025-08-01')
        },
        memo: {
          contains: '（JST版ランダム設定）'
        }
      },
      include: {
        Staff: { select: { name: true } }
      },
      orderBy: [{ date: 'asc' }, { staffId: 'asc' }],
      take: 10
    });
    
    console.log('\n=== JST版データサンプル ===');
    sampleData.forEach(adj => {
      const dateStr = adj.date.toISOString();
      const startStr = adj.start.toISOString();
      const endStr = adj.end.toISOString();
      console.log(`${adj.Staff.name}: ${adj.memo}`);
      console.log(`  date: ${dateStr}`);
      console.log(`  start: ${startStr}`);
      console.log(`  end: ${endStr}`);
      console.log('');
    });
    
    // 月次プランナー用統合データ取得テスト
    const unifiedData = await prisma.adjustment.findMany({
      where: {
        date: {
          gte: new Date('2025-07-01'),
          lt: new Date('2025-08-01')
        },
        memo: {
          contains: '（JST版ランダム設定）'
        }
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
      take: 5
    });
    
    console.log(`\n=== 月次プランナー用統合データ ===`);
    console.log(`取得件数: ${unifiedData.length}件`);
    
    unifiedData.forEach(adj => {
      const dateStr = adj.date.toISOString().split('T')[0];
      const startTime = adj.start.toISOString().split('T')[1].substring(0, 5);
      const endTime = adj.end.toISOString().split('T')[1].substring(0, 5);
      console.log(`${dateStr} ${adj.Staff.name}: ${adj.status} (${startTime}-${endTime})`);
    });
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyJulyJSTData();