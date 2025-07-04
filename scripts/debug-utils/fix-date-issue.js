const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 正しいJST日付作成関数
function createCorrectJSTDate(dateString) {
  // UTC基準で日付を作成（時刻部分は0時）
  return new Date(`${dateString}T00:00:00.000Z`);
}

// 正しいJST時刻作成関数 
function createCorrectJSTDateTime(dateString, timeString) {
  // JST時刻をUTCに変換
  return new Date(`${dateString}T${timeString}:00+09:00`);
}

async function fixDateIssue() {
  try {
    console.log('=== 日付問題修正開始 ===');
    
    // 問題のある7月データを確認
    const problemSchedules = await prisma.adjustment.findMany({
      where: {
        isPending: true,
        pendingType: 'monthly-planner',
        date: {
          gte: new Date('2025-06-30'), // 日付ずれでJST7月1日がUTC6月30日になっている可能性
          lt: new Date('2025-08-01')
        }
      },
      select: {
        id: true,
        date: true,
        start: true,
        end: true
      },
      take: 10
    });
    
    console.log('問題のあるスケジュール例:');
    problemSchedules.forEach(s => {
      const dateStr = s.date.toISOString();
      const startStr = s.start.toISOString();
      console.log(`ID: ${s.id}, date: ${dateStr}, start: ${startStr}`);
      
      // 日付部分をチェック
      const dateOnly = dateStr.split('T')[0];
      const dayOfWeek = new Date(dateOnly).getDay(); // 0=日曜, 6=土曜
      const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
      console.log(`  ${dateOnly} (${dayNames[dayOfWeek]}曜日)`);
    });
    
    // 土日のデータを特定
    const weekendSchedules = await prisma.adjustment.findMany({
      where: {
        isPending: true,
        pendingType: 'monthly-planner',
        date: {
          gte: new Date('2025-06-30'),
          lt: new Date('2025-08-01')
        }
      },
      select: {
        id: true,
        date: true,
        memo: true
      }
    });
    
    console.log(`\n検索範囲でのスケジュール総数: ${weekendSchedules.length}件`);
    
    const weekendIds = [];
    weekendSchedules.forEach(s => {
      const dateStr = s.date.toISOString().split('T')[0];
      const dayOfWeek = new Date(dateStr + 'T12:00:00.000Z').getDay(); // UTC正午で判定
      
      if (dayOfWeek === 0 || dayOfWeek === 6) { // 日曜日または土曜日
        weekendIds.push(s.id);
        console.log(`土日スケジュール発見: ID ${s.id}, ${dateStr} (${dayOfWeek === 0 ? '日' : '土'}曜日) - ${s.memo}`);
      }
    });
    
    console.log(`\n土日に設定されたスケジュール: ${weekendIds.length}件`);
    
    if (weekendIds.length > 0) {
      console.log('\n土日スケジュールを削除しますか？ (削除実行)');
      
      const deleteResult = await prisma.adjustment.deleteMany({
        where: {
          id: {
            in: weekendIds
          }
        }
      });
      
      console.log(`土日スケジュール削除完了: ${deleteResult.count}件`);
    }
    
    // 修正後の統計
    const finalCount = await prisma.adjustment.count({
      where: {
        isPending: true,
        pendingType: 'monthly-planner',
        date: {
          gte: new Date('2025-07-01T00:00:00.000Z'),
          lt: new Date('2025-08-01T00:00:00.000Z')
        }
      }
    });
    
    console.log(`\n修正後の7月Pendingスケジュール数: ${finalCount}件`);
    
    // 曜日別分布確認
    const schedulesByDay = await prisma.adjustment.findMany({
      where: {
        isPending: true,
        pendingType: 'monthly-planner',
        date: {
          gte: new Date('2025-07-01T00:00:00.000Z'),
          lt: new Date('2025-08-01T00:00:00.000Z')
        }
      },
      select: {
        date: true
      }
    });
    
    const dayCount = [0, 0, 0, 0, 0, 0, 0]; // 日月火水木金土
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    
    schedulesByDay.forEach(s => {
      const dateStr = s.date.toISOString().split('T')[0];
      const dayOfWeek = new Date(dateStr + 'T12:00:00.000Z').getDay();
      dayCount[dayOfWeek]++;
    });
    
    console.log('\n=== 曜日別分布 ===');
    dayNames.forEach((name, index) => {
      console.log(`${name}曜日: ${dayCount[index]}件`);
    });
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDateIssue();