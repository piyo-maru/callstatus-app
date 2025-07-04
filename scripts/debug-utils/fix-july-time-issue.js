const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixJulyTimeIssue() {
  try {
    console.log('7月の時刻問題修正開始...');
    
    // 7月のadjustmentに関連する承認ログを先に削除
    const julyAdjustments = await prisma.adjustment.findMany({
      where: {
        date: {
          gte: new Date('2025-07-01T00:00:00.000Z'),
          lt: new Date('2025-08-01T00:00:00.000Z')
        }
      },
      select: { id: true }
    });
    
    const adjustmentIds = julyAdjustments.map(adj => adj.id);
    
    if (adjustmentIds.length > 0) {
      // 関連する承認ログを削除
      const logDeleteResult = await prisma.pendingApprovalLog.deleteMany({
        where: {
          adjustmentId: { in: adjustmentIds }
        }
      });
      console.log(`削除した承認ログ数: ${logDeleteResult.count}`);
    }
    
    // 7月の全adjustmentを削除（テストデータなので）
    const deleteResult = await prisma.adjustment.deleteMany({
      where: {
        date: {
          gte: new Date('2025-07-01T00:00:00.000Z'),
          lt: new Date('2025-08-01T00:00:00.000Z')
        }
      }
    });
    
    console.log(`削除したレコード数: ${deleteResult.count}`);
    
    // スタッフリストを取得
    const staffList = await prisma.staff.findMany({
      select: { id: true, name: true }
    });
    
    console.log(`スタッフ数: ${staffList.length}`);
    
    // 7月の平日を取得（UTC時刻で正確に）
    const dates = [];
    for (let day = 1; day <= 31; day++) {
      const date = new Date(Date.UTC(2025, 6, day)); // UTC時刻で作成
      const dayOfWeek = date.getUTCDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 土日以外
        dates.push(date);
      }
    }
    
    console.log(`7月の平日数: ${dates.length}`);
    
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
    
    // 1200件作成
    const targetCount = 1200;
    const toCreate = [];
    const existingCombinations = new Set();
    
    for (let i = 0; i < targetCount; i++) {
      let attempts = 0;
      let key;
      let randomStaff, randomDate;
      
      // 重複チェック（最大100回試行）
      do {
        randomStaff = staffList[Math.floor(Math.random() * staffList.length)];
        randomDate = dates[Math.floor(Math.random() * dates.length)];
        const dateString = randomDate.toISOString().split('T')[0];
        key = `${randomStaff.id}-${dateString}`;
        attempts++;
      } while (existingCombinations.has(key) && attempts < 100);
      
      if (attempts >= 100) {
        console.log(`重複回避に失敗。${i}件で終了。`);
        break;
      }
      
      existingCombinations.add(key);
      
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
      
      // 正しいUTC時刻でDateTimeオブジェクトを作成
      const startDateTime = new Date(randomDate);
      startDateTime.setUTCHours(startHour - 9, 0, 0, 0); // JST時刻になるように-9時間
      
      const endDateTime = new Date(randomDate);
      endDateTime.setUTCHours(endHour - 9, 0, 0, 0); // JST時刻になるように-9時間
      
      toCreate.push({
        staffId: randomStaff.id,
        date: randomDate,
        status: selectedStatus.status,
        start: startDateTime,
        end: endDateTime,
        memo: `時刻修正テストデータ ${i + 1}`,
        isPending: true,
        pendingType: 'monthly-planner',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    console.log(`作成予定件数: ${toCreate.length}`);
    
    // バッチサイズで挿入
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < toCreate.length; i += batchSize) {
      const batch = toCreate.slice(i, i + batchSize);
      await prisma.adjustment.createMany({
        data: batch
      });
      inserted += batch.length;
      console.log(`挿入済み: ${inserted}/${toCreate.length}`);
    }
    
    // 確認
    const finalCount = await prisma.adjustment.count({
      where: {
        date: {
          gte: new Date('2025-07-01T00:00:00.000Z'),
          lt: new Date('2025-08-01T00:00:00.000Z')
        },
        isPending: true
      }
    });
    
    console.log(`最終件数: ${finalCount}`);
    
    // サンプル時刻チェック
    const samples = await prisma.adjustment.findMany({
      where: {
        date: {
          gte: new Date('2025-07-01T00:00:00.000Z'),
          lt: new Date('2025-08-01T00:00:00.000Z')
        },
        isPending: true
      },
      take: 3,
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\\n時刻確認（最新3件）:');
    samples.forEach(adj => {
      console.log(`ID: ${adj.id}, start: ${adj.start}, end: ${adj.end}`);
    });
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixJulyTimeIssue();