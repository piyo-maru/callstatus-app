const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTimezone() {
  try {
    console.log('=== 時刻確認 ===');
    
    // 7月1日のデータを確認
    const july1Data = await prisma.adjustment.findMany({
      where: {
        date: {
          gte: new Date('2025-07-01'),
          lt: new Date('2025-07-02')
        },
        memo: {
          contains: '（ランダム設定）'
        }
      },
      include: {
        Staff: { select: { name: true } }
      },
      take: 5
    });
    
    console.log('\n7月1日のデータ（UTCで作成）:');
    july1Data.forEach(adj => {
      console.log(`スタッフ: ${adj.Staff.name}`);
      console.log(`  date: ${adj.date.toISOString()}`);
      console.log(`  start: ${adj.start.toISOString()}`);
      console.log(`  end: ${adj.end.toISOString()}`);
      console.log('  ---');
    });
    
    console.log('\n=== JST基準でデータを再作成します ===');
    
    // JST基準で7月1日のデータを作成
    const jstTestData = {
      staffId: 1,
      date: new Date('2025-07-01T00:00:00+09:00'), // JST 7月1日 00:00
      status: 'online',
      start: new Date('2025-07-01T09:00:00+09:00'), // JST 7月1日 09:00
      end: new Date('2025-07-01T18:00:00+09:00'),   // JST 7月1日 18:00
      memo: 'JSTテスト（ランダム設定）',
      isPending: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const testRecord = await prisma.adjustment.create({
      data: jstTestData
    });
    
    console.log('\nJST基準で作成したテストデータ:');
    console.log(`  date: ${testRecord.date.toISOString()}`);
    console.log(`  start: ${testRecord.start.toISOString()}`);
    console.log(`  end: ${testRecord.end.toISOString()}`);
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTimezone();