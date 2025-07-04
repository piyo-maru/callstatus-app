const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugLayerManager() {
  try {
    console.log('=== レイヤーマネージャーデバッグ ===');
    
    // 7月1日のJST版ランダムプリセットを検索
    const dateString = '2025-07-01';
    
    console.log(`\n1. JST版ランダムプリセット確認 (${dateString})`);
    
    const jstPresets = await prisma.adjustment.findMany({
      where: {
        memo: {
          contains: '（JST版ランダム設定）'
        },
        date: {
          gte: new Date('2025-07-01'),
          lt: new Date('2025-07-02')
        }
      },
      take: 5
    });
    
    console.log(`JST版プリセット: ${jstPresets.length}件`);
    jstPresets.forEach(adj => {
      console.log(`  スタッフ${adj.staffId}: ${adj.start.toISOString()} - ${adj.end.toISOString()}`);
    });
    
    console.log(`\n2. レイヤーマネージャーの検索条件確認`);
    const startOfDayUtc = new Date(`${dateString}T00:00:00+09:00`);
    const endOfDayUtc = new Date(`${dateString}T23:59:59+09:00`);
    
    console.log(`検索範囲: ${startOfDayUtc.toISOString()} ～ ${endOfDayUtc.toISOString()}`);
    
    console.log(`\n3. レイヤーマネージャー条件でのadjustment検索`);
    
    const layerManagerResults = await prisma.adjustment.findMany({
      where: {
        start: {
          gte: startOfDayUtc,
          lt: endOfDayUtc
        },
        NOT: {
          AND: [
            { isPending: true },
            { approvedAt: null }
          ]
        }
      },
      take: 10
    });
    
    console.log(`レイヤーマネージャー条件: ${layerManagerResults.length}件`);
    layerManagerResults.forEach(adj => {
      console.log(`  スタッフ${adj.staffId}: start=${adj.start.toISOString()}, memo=${adj.memo}`);
    });
    
    console.log(`\n4. 時刻範囲比較`);
    if (jstPresets.length > 0) {
      const samplePreset = jstPresets[0];
      console.log(`サンプルプリセット start: ${samplePreset.start.toISOString()}`);
      console.log(`検索範囲開始: ${startOfDayUtc.toISOString()}`);
      console.log(`検索範囲終了: ${endOfDayUtc.toISOString()}`);
      console.log(`範囲内？: ${samplePreset.start >= startOfDayUtc && samplePreset.start < endOfDayUtc}`);
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugLayerManager();