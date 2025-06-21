const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    // 1. 削除前の調整レイヤーレコード数を取得
    const adjustmentsBefore = await prisma.adjustment.findMany({
      select: { id: true }
    });
    console.log(`削除前の調整レイヤーレコード数: ${adjustmentsBefore.length}`);
    
    // 2. 全ての調整レイヤーレコードを削除
    const deleteResult = await prisma.adjustment.deleteMany({});
    console.log(`削除されたレコード数: ${deleteResult.count}`);
    
    // 3. 削除後の確認
    const adjustmentsAfter = await prisma.adjustment.findMany({
      select: { id: true }
    });
    console.log(`削除後の調整レイヤーレコード数: ${adjustmentsAfter.length}`);
    
    if (adjustmentsAfter.length === 0) {
      console.log('✅ 全ての調整レイヤーデータが正常に削除されました');
    } else {
      console.log('❌ 削除に失敗しました。まだレコードが残っています');
    }
    
  } catch (error) {
    console.error('削除処理中にエラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();