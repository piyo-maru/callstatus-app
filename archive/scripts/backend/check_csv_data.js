const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCsvData() {
  try {
    const csvCount = await prisma.adjustment.count({
      where: {
        batchId: { not: null }
      }
    });
    
    const manualCount = await prisma.adjustment.count({
      where: {
        batchId: null
      }
    });
    
    const csvAdjustments = await prisma.adjustment.findMany({
      where: {
        batchId: { not: null }
      },
      select: {
        id: true,
        batchId: true,
        date: true,
        status: true,
        staffId: true
      },
      take: 5
    });
    
    console.log('=== CSVレイヤー2データ確認 ===');
    console.log('CSVインポートデータ数:', csvCount);
    console.log('手動作成データ数:', manualCount);
    console.log('');
    
    if (csvAdjustments.length > 0) {
      console.log('=== CSVデータサンプル ===');
      csvAdjustments.forEach(adj => {
        console.log('ID:', adj.id, 'BatchID:', adj.batchId, '日付:', adj.date.toISOString().split('T')[0], 'ステータス:', adj.status);
      });
    }
    
  } catch (error) {
    console.error('確認に失敗:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCsvData();
