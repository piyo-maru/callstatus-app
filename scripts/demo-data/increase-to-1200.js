const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function increaseTo1200() {
  try {
    console.log('=== 申請予定を1200件まで増加 ===');
    
    // 現在の件数確認
    const currentCount = await prisma.adjustment.count({
      where: {
        isPending: true,
        pendingType: 'monthly-planner'
      }
    });
    
    console.log(`現在の件数: ${currentCount}件`);
    
    const targetCount = 1200;
    const needToAdd = targetCount - currentCount;
    
    if (needToAdd <= 0) {
      console.log('既に1200件以上あります。追加不要。');
      return;
    }
    
    console.log(`追加が必要: ${needToAdd}件`);
    
    // スタッフ一覧取得
    const staffList = await prisma.staff.findMany({
      where: { isActive: true },
      select: { id: true, name: true }
    });
    
    console.log(`利用可能スタッフ: ${staffList.length}名`);
    
    // 既存の7月データ分析（パターンを参考にする）
    const existingJuly = await prisma.adjustment.findMany({
      where: {
        date: {
          gte: new Date('2025-07-01T00:00:00.000Z'),
          lt: new Date('2025-08-01T00:00:00.000Z')
        },
        isPending: true,
        pendingType: 'monthly-planner'
      },
      select: { status: true, start: true, end: true }
    });
    
    // ステータス分布を分析
    const statusDist = {};
    existingJuly.forEach(item => {
      statusDist[item.status] = (statusDist[item.status] || 0) + 1;
    });
    
    console.log('既存ステータス分布:', statusDist);
    
    // よく使われるステータスのリスト
    const commonStatuses = [
      { status: 'off', start: 9, end: 18, weight: 40 },
      { status: 'morning-off', start: 9, end: 13, weight: 15 },
      { status: 'afternoon-off', start: 13, end: 18, weight: 15 },
      { status: 'training', start: 9, end: 18, weight: 10 },
      { status: 'meeting', start: 10, end: 12, weight: 8 },
      { status: 'night duty', start: 18, end: 21, weight: 7 },
      { status: 'conference', start: 9, end: 17, weight: 5 }
    ];
    
    // 7月と8月の平日を取得
    const dates = [];
    
    // 7月の平日（土日除く）
    for (let day = 1; day <= 31; day++) {
      const date = new Date(2025, 6, day); // 7月
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 土日除く
        dates.push(new Date(2025, 6, day, 0, 0, 0));
      }
    }
    
    // 8月の平日（土日除く）
    for (let day = 1; day <= 31; day++) {
      const date = new Date(2025, 7, day); // 8月
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 土日除く
        dates.push(new Date(2025, 7, day, 0, 0, 0));
      }
    }
    
    console.log(`利用可能日数: ${dates.length}日`);
    
    // ランダムな申請データを生成
    const toCreate = [];
    
    for (let i = 0; i < needToAdd; i++) {
      const randomStaff = staffList[Math.floor(Math.random() * staffList.length)];
      const randomDate = dates[Math.floor(Math.random() * dates.length)];
      
      // 重み付きランダム選択
      let totalWeight = commonStatuses.reduce((sum, s) => sum + s.weight, 0);
      let randomWeight = Math.random() * totalWeight;
      let selectedStatus = commonStatuses[0];
      
      for (const status of commonStatuses) {
        randomWeight -= status.weight;
        if (randomWeight <= 0) {
          selectedStatus = status;
          break;
        }
      }
      
      // 時間に少しランダム性を追加
      const startVariation = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
      const endVariation = Math.floor(Math.random() * 3) - 1;
      
      const startHour = Math.max(8, Math.min(20, selectedStatus.start + startVariation));
      const endHour = Math.max(startHour + 1, Math.min(21, selectedStatus.end + endVariation));
      
      // DateTimeオブジェクトを作成（同じ日付で時間のみ異なる）
      const startDateTime = new Date(randomDate);
      startDateTime.setUTCHours(startHour, 0, 0, 0);
      
      const endDateTime = new Date(randomDate);
      endDateTime.setUTCHours(endHour, 0, 0, 0);
      
      toCreate.push({
        staffId: randomStaff.id,
        date: randomDate,
        status: selectedStatus.status,
        start: startDateTime,
        end: endDateTime,
        memo: `パフォーマンステスト用データ ${i + 1}`,
        isPending: true,
        pendingType: 'monthly-planner',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      if ((i + 1) % 100 === 0) {
        console.log(`進捗: ${i + 1}/${needToAdd}件生成完了`);
      }
    }
    
    console.log(`\\n${toCreate.length}件のデータを一括作成中...`);
    
    // バッチで作成（Prismaの制限対応）
    const batchSize = 100;
    let created = 0;
    
    for (let i = 0; i < toCreate.length; i += batchSize) {
      const batch = toCreate.slice(i, i + batchSize);
      await prisma.adjustment.createMany({
        data: batch,
        skipDuplicates: true
      });
      created += batch.length;
      console.log(`バッチ ${Math.floor(i/batchSize) + 1}: ${created}/${toCreate.length}件作成完了`);
    }
    
    // 最終確認
    const finalCount = await prisma.adjustment.count({
      where: {
        isPending: true,
        pendingType: 'monthly-planner'
      }
    });
    
    console.log(`\\n=== 完了 ===`);
    console.log(`最終件数: ${finalCount}件`);
    console.log(`増加数: ${finalCount - currentCount}件`);
    
    // 月別分布確認
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
    
    console.log('\\n最終月別分布:');
    Object.entries(monthMap).forEach(([month, count]) => {
      console.log(`  ${month}: ${count}件`);
    });
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

increaseTo1200();