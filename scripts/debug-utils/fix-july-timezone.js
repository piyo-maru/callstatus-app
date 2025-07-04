const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// JST基準での日時文字列を作成
function createJSTDateTime(dateString, timeString) {
  return new Date(`${dateString}T${timeString}:00+09:00`);
}

async function fixJulyTimezone() {
  try {
    console.log('=== 7月データのタイムゾーン修正開始 ===');
    
    // 既存のランダム設定データを削除
    const deleteResult = await prisma.adjustment.deleteMany({
      where: {
        date: {
          gte: new Date('2025-07-01'),
          lt: new Date('2025-08-01')
        },
        memo: {
          contains: '（ランダム設定）'
        }
      }
    });
    
    console.log(`既存データ削除: ${deleteResult.count}件`);
    
    // JST基準で再作成（少数のテストデータ）
    const testData = [
      {
        staffId: 1,
        date: createJSTDateTime('2025-07-01', '00:00'),
        status: 'online',
        start: createJSTDateTime('2025-07-01', '09:00'),
        end: createJSTDateTime('2025-07-01', '18:00'),
        memo: '標準勤務（JST修正版）',
        isPending: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        staffId: 2,
        date: createJSTDateTime('2025-07-01', '00:00'),
        status: 'remote',
        start: createJSTDateTime('2025-07-01', '09:00'),
        end: createJSTDateTime('2025-07-01', '18:00'),
        memo: '在宅勤務（JST修正版）',
        isPending: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        staffId: 3,
        date: createJSTDateTime('2025-07-02', '00:00'),
        status: 'online',
        start: createJSTDateTime('2025-07-02', '08:00'),
        end: createJSTDateTime('2025-07-02', '17:00'),
        memo: '早番勤務（JST修正版）',
        isPending: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    console.log('\nJST基準テストデータ作成中...');
    
    for (const data of testData) {
      const result = await prisma.adjustment.create({ data });
      console.log(`✅ 作成: ${result.id} - ${data.memo}`);
    }
    
    // 作成されたデータを確認
    const createdData = await prisma.adjustment.findMany({
      where: {
        memo: {
          contains: '（JST修正版）'
        }
      },
      include: {
        Staff: { select: { name: true } }
      }
    });
    
    console.log('\n=== 作成されたJSTデータ ===');
    createdData.forEach(adj => {
      const dateStr = adj.date.toISOString();
      const startStr = adj.start.toISOString();
      const endStr = adj.end.toISOString();
      console.log(`${adj.Staff.name}: ${adj.memo}`);
      console.log(`  date: ${dateStr} (UTC)`);
      console.log(`  start: ${startStr} (UTC)`);
      console.log(`  end: ${endStr} (UTC)`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixJulyTimezone();