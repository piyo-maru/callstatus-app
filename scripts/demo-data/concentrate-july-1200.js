const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function concentrateJuly1200() {
  try {
    console.log('=== 7月に1200件集中 ===');
    
    // 現在の件数確認
    const currentCount = await prisma.adjustment.count({
      where: {
        isPending: true,
        pendingType: 'monthly-planner'
      }
    });
    
    console.log(`現在の全件数: ${currentCount}件`);
    
    // 月別現状確認
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
    
    console.log('現在の月別分布:');
    Object.entries(monthMap).forEach(([month, count]) => {
      console.log(`  ${month}: ${count}件`);
    });
    
    // 6月と8月のデータを削除
    const deleteResult = await prisma.adjustment.deleteMany({
      where: {
        isPending: true,
        pendingType: 'monthly-planner',
        OR: [
          {
            date: {
              gte: new Date('2025-06-01T00:00:00.000Z'),
              lt: new Date('2025-07-01T00:00:00.000Z')
            }
          },
          {
            date: {
              gte: new Date('2025-08-01T00:00:00.000Z'),
              lt: new Date('2025-09-01T00:00:00.000Z')
            }
          }
        ]
      }
    });
    
    console.log(`\\n6月・8月データ削除: ${deleteResult.count}件`);
    
    // 現在の7月件数確認
    const julyCount = await prisma.adjustment.count({
      where: {
        date: {
          gte: new Date('2025-07-01T00:00:00.000Z'),
          lt: new Date('2025-08-01T00:00:00.000Z')
        },
        isPending: true,
        pendingType: 'monthly-planner'
      }
    });
    
    console.log(`現在の7月件数: ${julyCount}件`);
    
    const targetCount = 1200;
    const needToAdd = targetCount - julyCount;
    
    if (needToAdd <= 0) {
      console.log('7月に1200件以上あります。追加不要。');
      return;
    }
    
    console.log(`7月に追加が必要: ${needToAdd}件`);
    
    // スタッフ一覧取得
    const staffList = await prisma.staff.findMany({
      where: { isActive: true },
      select: { id: true, name: true }
    });
    
    console.log(`利用可能スタッフ: ${staffList.length}名`);
    
    // 7月の平日のみ取得
    const julyDates = [];
    for (let day = 1; day <= 31; day++) {
      const date = new Date(2025, 6, day); // 7月
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 土日除く
        julyDates.push(new Date(2025, 6, day, 0, 0, 0));
      }
    }
    
    console.log(`7月平日数: ${julyDates.length}日`);
    
    // 既存の7月データを取得（重複防止のため）
    const existingJuly = await prisma.adjustment.findMany({
      where: {
        date: {
          gte: new Date('2025-07-01T00:00:00.000Z'),
          lt: new Date('2025-08-01T00:00:00.000Z')
        },
        isPending: true,
        pendingType: 'monthly-planner'
      },
      select: { staffId: true, date: true }
    });
    
    // 既存の組み合わせをSetに格納（重複チェック用）
    const existingCombinations = new Set();
    existingJuly.forEach(item => {
      const dateString = new Date(item.date).toISOString().split('T')[0];
      const key = `${item.staffId}-${dateString}`;
      existingCombinations.add(key);
    });
    
    console.log(`既存の組み合わせ: ${existingCombinations.size}件`);
    
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
    
    // 可能な組み合わせを生成
    const allPossibleCombinations = [];
    staffList.forEach(staff => {
      julyDates.forEach(date => {
        const dateString = date.toISOString().split('T')[0];
        const key = `${staff.id}-${dateString}`;
        if (!existingCombinations.has(key)) {
          allPossibleCombinations.push({ staffId: staff.id, date: date });
        }
      });
    });
    
    console.log(`利用可能な新しい組み合わせ: ${allPossibleCombinations.length}件`);
    
    if (allPossibleCombinations.length < needToAdd) {
      console.log(`警告: 追加可能な組み合わせ(${allPossibleCombinations.length})が必要数(${needToAdd})より少ないです`);
      console.log(`最大 ${allPossibleCombinations.length}件まで追加します`);
    }
    
    // シャッフルして均等に分散
    const shuffled = allPossibleCombinations.sort(() => 0.5 - Math.random());
    const toAdd = Math.min(needToAdd, shuffled.length);
    
    // ランダムな申請データを生成
    const toCreate = [];
    
    for (let i = 0; i < toAdd; i++) {
      const combination = shuffled[i];
      
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
      
      // DateTimeオブジェクトを作成
      const startDateTime = new Date(combination.date);
      startDateTime.setUTCHours(startHour, 0, 0, 0);
      
      const endDateTime = new Date(combination.date);
      endDateTime.setUTCHours(endHour, 0, 0, 0);
      
      toCreate.push({
        staffId: combination.staffId,
        date: combination.date,
        status: selectedStatus.status,
        start: startDateTime,
        end: endDateTime,
        memo: `7月集中パフォーマンステスト用データ ${i + 1}`,
        isPending: true,
        pendingType: 'monthly-planner',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      if ((i + 1) % 100 === 0) {
        console.log(`進捗: ${i + 1}/${toAdd}件生成完了`);
      }
    }
    
    console.log(`\\n${toCreate.length}件のデータを一括作成中...`);
    
    // バッチで作成
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
    const finalJulyCount = await prisma.adjustment.count({
      where: {
        date: {
          gte: new Date('2025-07-01T00:00:00.000Z'),
          lt: new Date('2025-08-01T00:00:00.000Z')
        },
        isPending: true,
        pendingType: 'monthly-planner'
      }
    });
    
    const finalTotalCount = await prisma.adjustment.count({
      where: {
        isPending: true,
        pendingType: 'monthly-planner'
      }
    });
    
    console.log(`\\n=== 完了 ===`);
    console.log(`7月最終件数: ${finalJulyCount}件`);
    console.log(`全体最終件数: ${finalTotalCount}件`);
    console.log(`7月増加数: ${finalJulyCount - julyCount}件`);
    
    // 重複チェック
    const duplicateCheck = await prisma.adjustment.groupBy({
      by: ['staffId', 'date'],
      where: {
        date: {
          gte: new Date('2025-07-01T00:00:00.000Z'),
          lt: new Date('2025-08-01T00:00:00.000Z')
        },
        isPending: true,
        pendingType: 'monthly-planner'
      },
      _count: {
        id: true
      },
      having: {
        id: {
          _count: {
            gt: 1
          }
        }
      }
    });
    
    console.log(`\\n重複チェック: ${duplicateCheck.length}件の重複`);
    if (duplicateCheck.length > 0) {
      console.log('重複詳細:', duplicateCheck.slice(0, 5));
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

concentrateJuly1200();