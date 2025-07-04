const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function reduceToPracticalSizeSafe() {
  try {
    console.log('=== 実用的なサイズに削減（安全版） ===');
    
    // 現在の7月Pendingスケジュール数確認
    const currentCount = await prisma.adjustment.count({
      where: {
        date: {
          gte: new Date('2025-07-01T00:00:00.000Z'),
          lt: new Date('2025-08-01T00:00:00.000Z')
        },
        isPending: true,
        pendingType: 'monthly-planner'
      }
    });
    
    console.log(`現在の7月Pendingスケジュール: ${currentCount}件`);
    
    // 実用的な目標: 300-400件程度（10-15%密度）
    const targetCount = 350;
    
    if (currentCount <= targetCount) {
      console.log(`既に目標以下です。削減不要。`);
      return;
    }
    
    console.log(`目標: ${targetCount}件まで削減`);
    console.log(`削除予定: ${currentCount - targetCount}件`);
    
    // 全Pendingスケジュールをランダムに並べて、上位targetCount件だけ残す
    const allPendings = await prisma.adjustment.findMany({
      where: {
        date: {
          gte: new Date('2025-07-01T00:00:00.000Z'),
          lt: new Date('2025-08-01T00:00:00.000Z')
        },
        isPending: true,
        pendingType: 'monthly-planner'
      },
      select: { id: true }
    });
    
    // ランダムシャッフル
    const shuffled = allPendings.sort(() => 0.5 - Math.random());
    
    // 残すものと削除するものに分ける
    const toDelete = shuffled.slice(targetCount);
    const deleteIds = toDelete.map(p => p.id);
    
    console.log(`削除対象: ${deleteIds.length}件`);
    
    // 関連する承認ログを先に削除
    if (deleteIds.length > 0) {
      const logDeleteResult = await prisma.pendingApprovalLog.deleteMany({
        where: {
          adjustmentId: {
            in: deleteIds
          }
        }
      });
      
      console.log(`関連承認ログ削除: ${logDeleteResult.count}件`);
      
      // Adjustmentを削除
      const deleteResult = await prisma.adjustment.deleteMany({
        where: {
          id: {
            in: deleteIds
          }
        }
      });
      
      console.log(`Pendingスケジュール削除: ${deleteResult.count}件`);
    }
    
    // 最終確認
    const finalCount = await prisma.adjustment.count({
      where: {
        date: {
          gte: new Date('2025-07-01T00:00:00.000Z'),
          lt: new Date('2025-08-01T00:00:00.000Z')
        },
        isPending: true,
        pendingType: 'monthly-planner'
      }
    });
    
    const totalSlots = 225 * 23; // 225名 × 23平日
    const finalDensity = ((finalCount / totalSlots) * 100).toFixed(1);
    
    console.log(`\n=== 削減完了 ===`);
    console.log(`最終件数: ${finalCount}件`);
    console.log(`最終密度: ${finalDensity}% (目標: 約7%)`);
    
    // 曜日別分布確認
    const finalSchedules = await prisma.adjustment.findMany({
      where: {
        date: {
          gte: new Date('2025-07-01T00:00:00.000Z'),
          lt: new Date('2025-08-01T00:00:00.000Z')
        },
        isPending: true,
        pendingType: 'monthly-planner'
      },
      select: { date: true }
    });
    
    const dayCount = [0, 0, 0, 0, 0, 0, 0]; // 日月火水木金土
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    
    finalSchedules.forEach(s => {
      const dayOfWeek = new Date(s.date).getUTCDay();
      dayCount[dayOfWeek]++;
    });
    
    console.log('\n=== 最終曜日別分布 ===');
    dayNames.forEach((name, index) => {
      if (dayCount[index] > 0) {
        console.log(`${name}曜日: ${dayCount[index]}件`);
      }
    });
    
    const avgPerDay = (finalCount / 23).toFixed(1);
    console.log(`平均: ${avgPerDay}件/日`);
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

reduceToPracticalSizeSafe();