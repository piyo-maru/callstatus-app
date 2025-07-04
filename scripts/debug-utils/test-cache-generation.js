const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCacheGeneration() {
  try {
    console.log('=== 手動ContractDisplayCache生成テスト ===');
    
    // スタッフIDを取得
    const staffIds = await prisma.staff.findMany({
      select: { id: true },
      take: 5
    });
    
    console.log(`対象スタッフ: ${staffIds.length}名`);
    console.log('スタッフIDs:', staffIds.map(s => s.id));
    
    // 契約データを取得
    const contracts = await prisma.contract.findMany({
      where: { 
        staffId: { in: staffIds.map(s => s.id) } 
      },
      select: {
        staffId: true,
        mondayHours: true,
        tuesdayHours: true,
        wednesdayHours: true,
        thursdayHours: true,
        fridayHours: true,
        saturdayHours: true,
        sundayHours: true
      }
    });
    
    console.log(`契約データ: ${contracts.length}件`);
    
    // キャッシュデータ生成テスト
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    
    console.log(`対象年月: ${year}年${month}月`);
    
    const cacheEntries = [];
    const contractMap = new Map(contracts.map(c => [c.staffId, c]));
    
    for (const staffData of staffIds) {
      const staffId = staffData.id;
      const contract = contractMap.get(staffId);
      
      console.log(`スタッフID ${staffId}の契約:`, contract);
      
      // 今月の1-7日をテスト
      for (let day = 1; day <= 7; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        
        let hasContract = false;
        if (contract) {
          const dayKeys = ['sundayHours', 'mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours', 'fridayHours', 'saturdayHours'];
          const dayKey = dayKeys[dayOfWeek];
          const workHours = contract[dayKey];
          hasContract = workHours != null && typeof workHours === 'string' && workHours.trim() !== '';
          
          console.log(`  ${day}日 (${dayKey}): ${workHours} -> ${hasContract}`);
        }
        
        cacheEntries.push({
          staffId,
          year,
          month,
          day,
          hasContract
        });
      }
    }
    
    console.log(`生成エントリ数: ${cacheEntries.length}`);
    console.log('サンプルエントリ:', cacheEntries.slice(0, 5));
    
    // データベースに挿入
    const result = await prisma.contractDisplayCache.createMany({
      data: cacheEntries,
      skipDuplicates: true
    });
    
    console.log(`挿入完了: ${result.count}件`);
    
    // 確認
    const count = await prisma.contractDisplayCache.count();
    console.log(`総キャッシュ件数: ${count}件`);
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCacheGeneration();
EOF < /dev/null
