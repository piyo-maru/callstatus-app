const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDuplicatePendings() {
  try {
    console.log('=== 重複Pendingスケジュール確認 ===');
    
    // 7月のPendingスケジュールで重複を確認
    const pendings = await prisma.adjustment.findMany({
      where: {
        date: {
          gte: new Date('2025-07-01T00:00:00.000Z'),
          lt: new Date('2025-08-01T00:00:00.000Z')
        },
        isPending: true,
        pendingType: 'monthly-planner'
      },
      select: {
        id: true,
        staffId: true,
        date: true,
        memo: true
      },
      orderBy: [
        { staffId: 'asc' },
        { date: 'asc' }
      ]
    });
    
    console.log(`総Pendingスケジュール: ${pendings.length}件`);
    
    // staffId + date の組み合わせで重複をチェック
    const combinations = {};
    const duplicates = [];
    
    pendings.forEach(pending => {
      const dateStr = pending.date.toISOString().split('T')[0];
      const key = `${pending.staffId}-${dateStr}`;
      
      if (combinations[key]) {
        // 重複発見
        combinations[key].push(pending);
        if (combinations[key].length === 2) {
          // 最初の重複をリストに追加
          duplicates.push({
            key,
            items: combinations[key]
          });
        }
      } else {
        combinations[key] = [pending];
      }
    });
    
    console.log(`\n重複する組み合わせ: ${duplicates.length}組`);
    
    if (duplicates.length > 0) {
      console.log('\n=== 重複データの詳細 ===');
      duplicates.slice(0, 10).forEach(dup => {
        console.log(`\n${dup.key}:`);
        dup.items.forEach(item => {
          console.log(`  ID: ${item.id}, memo: ${item.memo}`);
        });
      });
      
      // 重複削除スクリプトを提案
      console.log('\n=== 重複削除処理 ===');
      let deleteCount = 0;
      const idsToDelete = [];
      
      duplicates.forEach(dup => {
        // 各重複グループで最初の1件を残し、残りを削除対象とする
        const toDelete = dup.items.slice(1); // 最初以外を削除
        toDelete.forEach(item => {
          idsToDelete.push(item.id);
          deleteCount++;
        });
      });
      
      console.log(`削除対象: ${deleteCount}件`);
      console.log(`削除対象ID (最初の10件): ${idsToDelete.slice(0, 10).join(', ')}`);
      
      // 実際に削除実行
      if (idsToDelete.length > 0) {
        const deleteResult = await prisma.adjustment.deleteMany({
          where: {
            id: {
              in: idsToDelete
            }
          }
        });
        
        console.log(`重複削除完了: ${deleteResult.count}件`);
      }
    } else {
      console.log('✅ 重複は見つかりませんでした。');
    }
    
    // 最終統計
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
    
    console.log(`\n最終Pendingスケジュール数: ${finalCount}件`);
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicatePendings();