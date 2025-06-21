const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function revertAndFix() {
  try {
    console.log('=== スタッフの修復 ===');
    
    // 全スタッフをアクティブに戻す
    await prisma.staff.updateMany({
      data: { isActive: true }
    });
    
    console.log('全スタッフをアクティブに戻しました');
    
    // 契約があるスタッフのIDリストを取得
    const contractStaffIds = await prisma.contract.findMany({
      select: { staffId: true },
      distinct: ['staffId']
    });
    
    const staffIdsWithContracts = contractStaffIds.map(c => c.staffId);
    console.log(`契約があるスタッフID数: ${staffIdsWithContracts.length}`);
    console.log(`ID範囲: ${Math.min(...staffIdsWithContracts)} - ${Math.max(...staffIdsWithContracts)}`);
    
    // 契約がないスタッフを無効化（明示的にIDで除外）
    const result = await prisma.staff.updateMany({
      where: {
        id: {
          notIn: staffIdsWithContracts
        }
      },
      data: {
        isActive: false
      }
    });
    
    console.log(`契約がないスタッフを無効化: ${result.count}件`);
    
    // 確認
    const activeCount = await prisma.staff.count({ where: { isActive: true } });
    const contractCount = await prisma.contract.count();
    
    console.log(`アクティブスタッフ数: ${activeCount}`);
    console.log(`契約数: ${contractCount}`);
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

revertAndFix();