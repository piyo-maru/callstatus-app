const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearAndPrepareReimport() {
  try {
    console.log('=== データクリア開始 ===');
    
    // Contract テーブルをクリア
    const deletedContracts = await prisma.contract.deleteMany();
    console.log(`Contract削除: ${deletedContracts.count}件`);
    
    // Staff テーブルをクリア（新しくインポートされたもののみ）
    const deletedStaff = await prisma.staff.deleteMany({
      where: {
        empNo: {
          not: null // empNoがnullでないもの（インポートされたデータ）
        }
      }
    });
    console.log(`Staff削除: ${deletedStaff.count}件`);
    
    // 古いテストスケジュールも削除
    const deletedSchedules = await prisma.schedule.deleteMany();
    console.log(`Schedule削除: ${deletedSchedules.count}件`);
    
    console.log('=== データクリア完了 ===');
    console.log('再インポートの準備ができました。');
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearAndPrepareReimport();