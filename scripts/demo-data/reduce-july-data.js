const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function reduceJulyData() {
  try {
    console.log('=== 7月データ量削減開始 ===');
    
    // 現在の7月Pendingスケジュール数を確認
    const currentCount = await prisma.adjustment.count({
      where: {
        date: {
          gte: new Date('2025-07-01'),
          lt: new Date('2025-08-01')
        },
        isPending: true,
        pendingType: 'monthly-planner'
      }
    });
    
    console.log(`現在の7月Pendingスケジュール: ${currentCount}件`);
    
    // パフォーマンステスト用に1/10に削減（約100件程度に）
    const targetCount = Math.floor(currentCount / 10);
    console.log(`削減目標: 約${targetCount}件`);
    
    // ランダムに削減するため、全データを取得してランダムサンプリング
    const allPendingSchedules = await prisma.adjustment.findMany({
      where: {
        date: {
          gte: new Date('2025-07-01'),
          lt: new Date('2025-08-01')
        },
        isPending: true,
        pendingType: 'monthly-planner'
      },
      select: { id: true }
    });
    
    // ランダムにシャッフルして削除対象を選択
    const shuffled = allPendingSchedules.sort(() => 0.5 - Math.random());
    const toDelete = shuffled.slice(targetCount); // 残す分を除いて削除
    const deleteIds = toDelete.map(item => item.id);
    
    console.log(`削除対象: ${deleteIds.length}件`);
    
    // バッチ削除実行
    const deleteResult = await prisma.adjustment.deleteMany({
      where: {
        id: {
          in: deleteIds
        }
      }
    });
    
    console.log(`削除完了: ${deleteResult.count}件`);
    
    // 削減後の件数確認
    const afterCount = await prisma.adjustment.count({
      where: {
        date: {
          gte: new Date('2025-07-01'),
          lt: new Date('2025-08-01')
        },
        isPending: true,
        pendingType: 'monthly-planner'
      }
    });
    
    console.log(`削減後の7月Pendingスケジュール: ${afterCount}件`);
    
    // スタッフ別・日付別の分布を確認
    const distribution = await prisma.adjustment.groupBy({
      by: ['staffId'],
      where: {
        date: {
          gte: new Date('2025-07-01'),
          lt: new Date('2025-08-01')
        },
        isPending: true,
        pendingType: 'monthly-planner'
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });
    
    console.log('\n=== 削減後のスタッフ別分布（TOP10） ===');
    for (const dist of distribution) {
      console.log(`スタッフ${dist.staffId}: ${dist._count.id}件`);
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

reduceJulyData();