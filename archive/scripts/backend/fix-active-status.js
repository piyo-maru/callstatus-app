const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixActiveStatus() {
  try {
    console.log('=== アクティブ状態の修正 ===');
    
    // 契約があるスタッフをアクティブにする
    const result = await prisma.staff.updateMany({
      where: {
        contracts: {
          some: {}
        }
      },
      data: {
        isActive: true
      }
    });
    
    console.log(`契約があるスタッフをアクティブ化: ${result.count}件`);
    
    // 契約がないスタッフを非アクティブにする
    const inactiveResult = await prisma.staff.updateMany({
      where: {
        contracts: {
          none: {}
        }
      },
      data: {
        isActive: false
      }
    });
    
    console.log(`契約がないスタッフを非アクティブ化: ${inactiveResult.count}件`);
    
    // 確認
    const activeCount = await prisma.staff.count({ where: { isActive: true } });
    const contractCount = await prisma.contract.count();
    const activeWithContracts = await prisma.staff.count({
      where: {
        isActive: true,
        contracts: {
          some: {}
        }
      }
    });
    
    console.log('\n=== 修正後の状態 ===');
    console.log(`アクティブスタッフ数: ${activeCount}`);
    console.log(`契約数: ${contractCount}`);
    console.log(`アクティブで契約があるスタッフ: ${activeWithContracts}`);
    
    if (activeCount === contractCount && activeWithContracts === contractCount) {
      console.log('\n✅ 修正成功：アクティブスタッフ = 契約があるスタッフ');
    } else {
      console.log('\n⚠️  まだ不整合があります');
    }
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixActiveStatus();