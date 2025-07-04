const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixDuplicates() {
  try {
    console.log('=== 重複削除・1200件調整 ===');
    
    // 重複を特定
    const duplicates = await prisma.adjustment.groupBy({
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
    
    console.log(`重複組み合わせ数: ${duplicates.length}件`);
    
    // 各重複組み合わせから最新以外を削除
    let totalDeleted = 0;
    
    for (const duplicate of duplicates) {
      // その組み合わせの全レコードを取得（作成日時順）
      const records = await prisma.adjustment.findMany({
        where: {
          staffId: duplicate.staffId,
          date: duplicate.date,
          isPending: true,
          pendingType: 'monthly-planner'
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      // 最新以外を削除対象に
      const toDelete = records.slice(1);
      
      if (toDelete.length > 0) {
        const deleteIds = toDelete.map(r => r.id);
        const deleteResult = await prisma.adjustment.deleteMany({
          where: {
            id: {
              in: deleteIds
            }
          }
        });
        
        totalDeleted += deleteResult.count;
        console.log(`スタッフ${duplicate.staffId} ${new Date(duplicate.date).toISOString().split('T')[0]}: ${deleteResult.count}件削除`);
      }
    }
    
    console.log(`\\n重複削除完了: ${totalDeleted}件削除`);
    
    // 現在の7月件数確認
    const currentJulyCount = await prisma.adjustment.count({
      where: {
        date: {
          gte: new Date('2025-07-01T00:00:00.000Z'),
          lt: new Date('2025-08-01T00:00:00.000Z')
        },
        isPending: true,
        pendingType: 'monthly-planner'
      }
    });
    
    console.log(`重複削除後の7月件数: ${currentJulyCount}件`);
    
    // 1200件に調整
    const targetCount = 1200;
    
    if (currentJulyCount < targetCount) {
      console.log(`${targetCount - currentJulyCount}件追加が必要です`);
      
      // 利用可能な新しい組み合わせを探す
      const staffList = await prisma.staff.findMany({
        where: { isActive: true },
        select: { id: true }
      });
      
      // 7月の平日
      const julyDates = [];
      for (let day = 1; day <= 31; day++) {
        const date = new Date(2025, 6, day);
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          julyDates.push(new Date(2025, 6, day, 0, 0, 0));
        }
      }
      
      // 既存の組み合わせを取得
      const existing = await prisma.adjustment.findMany({
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
      
      const existingSet = new Set();
      existing.forEach(item => {
        const dateString = new Date(item.date).toISOString().split('T')[0];
        existingSet.add(`${item.staffId}-${dateString}`);
      });
      
      // 利用可能な組み合わせを生成
      const available = [];
      staffList.forEach(staff => {
        julyDates.forEach(date => {
          const dateString = date.toISOString().split('T')[0];
          const key = `${staff.id}-${dateString}`;
          if (!existingSet.has(key)) {
            available.push({ staffId: staff.id, date: date });
          }
        });
      });
      
      console.log(`利用可能な組み合わせ: ${available.length}件`);
      
      const needToAdd = targetCount - currentJulyCount;
      const shuffled = available.sort(() => 0.5 - Math.random());
      const toAdd = shuffled.slice(0, needToAdd);
      
      // 追加データ生成
      const toCreate = toAdd.map((combination, i) => ({
        staffId: combination.staffId,
        date: combination.date,
        status: 'off',
        start: new Date(combination.date.getTime()).setUTCHours(9, 0, 0, 0),
        end: new Date(combination.date.getTime()).setUTCHours(18, 0, 0, 0),
        memo: `重複修正追加データ ${i + 1}`,
        isPending: true,
        pendingType: 'monthly-planner',
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      // DateTimeオブジェクトに修正
      toCreate.forEach(item => {
        item.start = new Date(item.start);
        item.end = new Date(item.end);
      });
      
      // バッチ作成
      const batchSize = 100;
      for (let i = 0; i < toCreate.length; i += batchSize) {
        const batch = toCreate.slice(i, i + batchSize);
        await prisma.adjustment.createMany({
          data: batch
        });
        console.log(`追加バッチ ${Math.floor(i/batchSize) + 1}: ${Math.min(batch.length, toCreate.length - i)}件追加`);
      }
      
    } else if (currentJulyCount > targetCount) {
      const excess = currentJulyCount - targetCount;
      console.log(`${excess}件削除が必要です`);
      
      // ランダムに削除対象を選択
      const allRecords = await prisma.adjustment.findMany({
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
      
      const shuffled = allRecords.sort(() => 0.5 - Math.random());
      const toDelete = shuffled.slice(0, excess).map(r => r.id);
      
      await prisma.adjustment.deleteMany({
        where: {
          id: {
            in: toDelete
          }
        }
      });
      
      console.log(`${excess}件削除完了`);
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
    
    // 最終重複チェック
    const finalDuplicates = await prisma.adjustment.groupBy({
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
    
    console.log(`\\n=== 最終結果 ===`);
    console.log(`7月最終件数: ${finalCount}件`);
    console.log(`残存重複: ${finalDuplicates.length}件`);
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDuplicates();