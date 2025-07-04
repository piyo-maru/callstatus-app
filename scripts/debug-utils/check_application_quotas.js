const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkApplicationQuotas() {
  try {
    console.log('📊 7月申請予定の配分確認\n');
    
    // 7月の平日と土曜を計算
    const julyDays = [];
    for (let day = 3; day <= 31; day++) {
      const date = new Date(2025, 6, day); // 7月は6（0ベース）
      julyDays.push({
        date: date,
        dayOfWeek: date.getDay(),
        dateString: date.toISOString().split('T')[0]
      });
    }
    
    const weekdays = julyDays.filter(d => d.dayOfWeek >= 1 && d.dayOfWeek <= 5);
    const saturdays = julyDays.filter(d => d.dayOfWeek === 6);
    
    console.log(`対象期間: 7/3-7/31 (${julyDays.length}日間)`);
    console.log(`平日: ${weekdays.length}日、土曜: ${saturdays.length}日\n`);
    
    // 各種申請予定の件数確認
    const results = {};
    
    // 休暇 (status: off, 9:00-18:00の全日)
    const vacationData = await prisma.adjustment.findMany({
      where: {
        date: {
          gte: new Date('2025-07-03'),
          lte: new Date('2025-07-31')
        },
        status: 'off',
        start: {
          gte: new Date('2025-07-03T00:00:00Z'),
          lt: new Date('2025-07-03T01:00:00Z') // 9:00 UTC
        },
        end: {
          gte: new Date('2025-07-03T09:00:00Z'), // 18:00 UTC
          lt: new Date('2025-07-03T10:00:00Z')
        }
      }
    });
    
    // 日別でグループ化して統計
    const vacationByDate = {};
    vacationData.forEach(item => {
      const dateKey = item.date.toISOString().split('T')[0];
      vacationByDate[dateKey] = (vacationByDate[dateKey] || 0) + 1;
    });
    
    // 平日の休暇統計
    let vacationWeekdayTotal = 0;
    weekdays.forEach(day => {
      const count = vacationByDate[day.dateString] || 0;
      vacationWeekdayTotal += count;
    });
    
    console.log('🏖️  休暇 (status: off, 全日)');
    console.log(`   平日合計: ${vacationWeekdayTotal}件`);
    console.log(`   平均: ${(vacationWeekdayTotal / weekdays.length).toFixed(1)}人/日`);
    console.log(`   期待値: 25人/日 × ${weekdays.length}日 = ${25 * weekdays.length}件\n`);
    
    // 在宅勤務 (status: remote)
    const remoteCount = await prisma.adjustment.count({
      where: {
        date: {
          gte: new Date('2025-07-03'),
          lte: new Date('2025-07-31')
        },
        status: 'remote'
      }
    });
    
    console.log('🏠 在宅勤務 (status: remote)');
    console.log(`   合計: ${remoteCount}件`);
    console.log(`   平均: ${(remoteCount / weekdays.length).toFixed(1)}人/日`);
    console.log(`   期待値: 5人/日 × ${weekdays.length}日 = ${5 * weekdays.length}件\n`);
    
    // 夜間担当 (status: night duty) - 存在しない可能性
    const nightDutyCount = await prisma.adjustment.count({
      where: {
        date: {
          gte: new Date('2025-07-03'),
          lte: new Date('2025-07-31')
        },
        status: 'night duty'
      }
    });
    
    console.log('🌙 夜間担当 (status: night duty)');
    console.log(`   合計: ${nightDutyCount}件`);
    console.log(`   平均: ${(nightDutyCount / weekdays.length).toFixed(1)}人/日`);
    console.log(`   期待値: 6人/日 × ${weekdays.length}日 = ${6 * weekdays.length}件\n`);
    
    // 振出 (status: online, 土曜日)
    const substituteCount = await prisma.adjustment.count({
      where: {
        date: {
          gte: new Date('2025-07-03'),
          lte: new Date('2025-07-31')
        },
        status: 'online'
      }
    });
    
    console.log('🔄 振出 (status: online)');
    console.log(`   合計: ${substituteCount}件`);
    console.log(`   平均: ${(substituteCount / saturdays.length).toFixed(1)}人/日`);
    console.log(`   期待値: 6人/日 × ${saturdays.length}日 = ${6 * saturdays.length}件\n`);
    
    // 全ステータス統計（再掲）
    const statusCounts = await prisma.adjustment.groupBy({
      by: ['status'],
      where: {
        date: {
          gte: new Date('2025-07-03'),
          lte: new Date('2025-07-31')
        }
      },
      _count: {
        status: true
      }
    });
    
    console.log('📈 全ステータス統計:');
    statusCounts.forEach(item => {
      console.log(`   ${item.status}: ${item._count.status}件`);
    });
    
    // 期待値との比較
    console.log('\n🎯 期待値との比較:');
    console.log(`   休暇: ${vacationWeekdayTotal}件 / ${25 * weekdays.length}件 (${((vacationWeekdayTotal / (25 * weekdays.length)) * 100).toFixed(1)}%)`);
    console.log(`   在宅勤務: ${remoteCount}件 / ${5 * weekdays.length}件 (${((remoteCount / (5 * weekdays.length)) * 100).toFixed(1)}%)`);
    console.log(`   夜間担当: ${nightDutyCount}件 / ${6 * weekdays.length}件 (${nightDutyCount > 0 ? ((nightDutyCount / (6 * weekdays.length)) * 100).toFixed(1) : 0}%)`);
    console.log(`   振出: ${substituteCount}件 / ${6 * saturdays.length}件 (${((substituteCount / (6 * saturdays.length)) * 100).toFixed(1)}%)`);
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkApplicationQuotas();