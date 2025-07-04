const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDemoDates() {
  try {
    console.log('🔄 デモデータの日時を日本時間に修正中...');
    
    // デモデータを取得
    const demoData = await prisma.adjustment.findMany({
      where: { memo: { contains: 'デモデータ' } }
    });
    
    console.log(`見つかったデモデータ: ${demoData.length}件`);
    
    for (const item of demoData) {
      // UTCからJSTに9時間加算されているので、9時間戻す
      const correctDate = new Date(item.date.getTime() - 9 * 60 * 60 * 1000);
      const correctStart = new Date(item.start.getTime() - 9 * 60 * 60 * 1000);
      const correctEnd = new Date(item.end.getTime() - 9 * 60 * 60 * 1000);
      
      await prisma.adjustment.update({
        where: { id: item.id },
        data: {
          date: correctDate,
          start: correctStart,
          end: correctEnd
        }
      });
      
      console.log(`✅ Staff ${item.staffId}: ${item.date.toISOString().split('T')[0]} → ${correctDate.toISOString().split('T')[0]}`);
    }
    
    console.log('🎉 デモデータの日時修正完了！');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

fixDemoDates();