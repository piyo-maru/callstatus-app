const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTestStaff() {
  try {
    console.log('=== テストスタッフの無効化 ===');
    
    // 契約がないスタッフをisActive=falseに設定
    const result = await prisma.staff.updateMany({
      where: {
        contracts: {
          none: {} // 契約が0件のスタッフ
        },
        isActive: true // 現在アクティブなもの
      },
      data: {
        isActive: false
      }
    });
    
    console.log(`無効化されたスタッフ数: ${result.count}件`);
    
    // 確認：現在アクティブで契約があるスタッフ数
    const activeStaffWithContracts = await prisma.staff.count({
      where: {
        isActive: true,
        contracts: {
          some: {}
        }
      }
    });
    
    console.log(`アクティブで契約があるスタッフ数: ${activeStaffWithContracts}件`);
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTestStaff();