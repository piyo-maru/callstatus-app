const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteCsvLayer2Data() {
  try {
    // まず、CSVインポートデータの確認
    const csvCount = await prisma.adjustment.count({
      where: {
        batchId: { not: null }
      }
    });
    
    console.log('削除対象のCSVレイヤー2データ数:', csvCount);
    
    if (csvCount > 0) {
      // CSVインポートデータ（batchIdがnullでないもの）を削除
      const result = await prisma.adjustment.deleteMany({
        where: {
          batchId: { not: null }
        }
      });
      
      console.log('削除されたレコード数:', result.count);
      console.log('CSVレイヤー2データを全削除しました');
    } else {
      console.log('削除対象のCSVデータが見つかりません');
    }
    
    // 残りのデータ確認
    const remainingManual = await prisma.adjustment.count({
      where: {
        batchId: null
      }
    });
    
    console.log('残存する手動作成データ数:', remainingManual);
    
  } catch (error) {
    console.error('削除に失敗:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteCsvLayer2Data();
