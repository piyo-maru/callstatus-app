const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDateDistribution() {
  try {
    console.log('=== 7月スケジュール日付分布確認 ===');
    
    // 全7月Pendingスケジュールを取得
    const schedules = await prisma.adjustment.findMany({
      where: {
        date: {
          gte: new Date('2025-07-01T00:00:00.000Z'),
          lt: new Date('2025-08-01T00:00:00.000Z')
        },
        isPending: true,
        pendingType: 'monthly-planner'
      },
      select: {
        date: true,
        memo: true
      }
    });
    
    console.log(`総スケジュール数: ${schedules.length}件`);
    
    // 日付別にグループ化
    const dateGroups = {};
    schedules.forEach(schedule => {
      const dateStr = schedule.date.toISOString().split('T')[0];
      if (!dateGroups[dateStr]) {
        dateGroups[dateStr] = 0;
      }
      dateGroups[dateStr]++;
    });
    
    // 日付順にソート
    const sortedDates = Object.keys(dateGroups).sort();
    
    console.log('\n=== 日付別分布 ===');
    sortedDates.forEach(dateStr => {
      const date = new Date(dateStr + 'T12:00:00.000Z');
      const dayOfWeek = date.getUTCDay();
      const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
      const count = dateGroups[dateStr];
      
      console.log(`${dateStr} (${dayNames[dayOfWeek]}): ${count}件`);
    });
    
    // 問題のあるパターンをチェック
    console.log('\n=== 問題分析 ===');
    
    const firstFewDays = sortedDates.slice(0, 5);
    const firstFewTotal = firstFewDays.reduce((sum, date) => sum + dateGroups[date], 0);
    
    console.log(`最初の5日間の合計: ${firstFewTotal}件 / ${schedules.length}件 (${((firstFewTotal / schedules.length) * 100).toFixed(1)}%)`);
    
    // 7月1日の詳細
    const july1Count = dateGroups['2025-07-01'] || 0;
    console.log(`7月1日だけで: ${july1Count}件 (${((july1Count / schedules.length) * 100).toFixed(1)}%)`);
    
    if (july1Count > 100) {
      console.log('🚨 7月1日に異常にデータが集中しています！');
      
      // 7月1日のサンプルデータを確認
      const july1Samples = await prisma.adjustment.findMany({
        where: {
          date: new Date('2025-07-01T00:00:00.000Z'),
          isPending: true,
          pendingType: 'monthly-planner'
        },
        select: {
          id: true,
          staffId: true,
          date: true,
          start: true,
          memo: true
        },
        take: 10
      });
      
      console.log('\n7月1日のサンプルデータ:');
      july1Samples.forEach(s => {
        console.log(`ID: ${s.id}, staffId: ${s.staffId}, date: ${s.date.toISOString()}, start: ${s.start.toISOString()}, memo: ${s.memo}`);
      });
    }
    
    // 各日付の分布統計
    const counts = Object.values(dateGroups);
    const maxCount = Math.max(...counts);
    const minCount = Math.min(...counts);
    const avgCount = (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1);
    
    console.log(`\n統計: 最大${maxCount}件、最小${minCount}件、平均${avgCount}件/日`);
    
    if (maxCount > avgCount * 3) {
      console.log('🚨 データ分布に大きな偏りがあります！');
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDateDistribution();