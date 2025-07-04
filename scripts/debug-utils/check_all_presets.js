const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllPresets() {
  try {
    console.log('=== 全プリセット設定の詳細確認 ===');
    
    // グローバルプリセット設定を取得
    const globalSettings = await prisma.globalPresetSettings.findFirst({
      where: { id: 1 }
    });
    
    if (!globalSettings) {
      console.log('❌ グローバルプリセット設定が見つかりません');
      return;
    }
    
    const presets = Array.isArray(globalSettings.presets) ? globalSettings.presets : [];
    
    // カテゴリごとにプリセットを整理
    const presetsByCategory = {};
    presets.forEach(preset => {
      if (!presetsByCategory[preset.category]) {
        presetsByCategory[preset.category] = [];
      }
      presetsByCategory[preset.category].push(preset);
    });
    
    console.log(`\n総プリセット数: ${presets.length}`);
    console.log('カテゴリ別プリセット数:');
    Object.keys(presetsByCategory).forEach(category => {
      console.log(`  ${category}: ${presetsByCategory[category].length}個`);
    });
    
    // 各カテゴリの詳細を表示
    Object.keys(presetsByCategory).forEach(category => {
      console.log(`\n================================`);
      console.log(`カテゴリ: ${category}`);
      console.log(`================================`);
      
      presetsByCategory[category].forEach((preset, index) => {
        console.log(`\n--- プリセット ${index + 1} ---`);
        console.log(`ID: ${preset.id}`);
        console.log(`名前: ${preset.name}`);
        console.log(`表示名: ${preset.displayName}`);
        console.log(`説明: ${preset.description || 'なし'}`);
        console.log(`アクティブ: ${preset.isActive}`);
        console.log(`カスタマイズ可能: ${preset.customizable}`);
        console.log(`デフォルト: ${preset.isDefault}`);
        console.log(`代表スケジュールインデックス: ${preset.representativeScheduleIndex ?? 0}`);
        console.log(`スケジュール数: ${preset.schedules.length}`);
        
        preset.schedules.forEach((schedule, scheduleIndex) => {
          const isRepresentative = scheduleIndex === (preset.representativeScheduleIndex ?? 0);
          console.log(`  ${scheduleIndex + 1}. ${isRepresentative ? '👑 ' : ''}ステータス: ${schedule.status}, 開始: ${schedule.startTime}, 終了: ${schedule.endTime}, メモ: ${schedule.memo || 'なし'}`);
        });
      });
    });
    
    // 使用状況の統計
    console.log('\n=== 使用状況統計 ===');
    
    // 各プリセットの使用回数を確認
    const presetUsageStats = [];
    for (const preset of presets) {
      const usageCount = await prisma.adjustment.count({
        where: {
          memo: { contains: `presetId:${preset.id}` }
        }
      });
      presetUsageStats.push({
        id: preset.id,
        displayName: preset.displayName,
        category: preset.category,
        usageCount
      });
    }
    
    // 使用回数でソート
    presetUsageStats.sort((a, b) => b.usageCount - a.usageCount);
    
    console.log('プリセット使用回数ランキング:');
    presetUsageStats.forEach((stat, index) => {
      console.log(`${index + 1}. ${stat.displayName} (${stat.category}): ${stat.usageCount}回`);
    });
    
    // 未使用プリセットを確認
    const unusedPresets = presetUsageStats.filter(stat => stat.usageCount === 0);
    if (unusedPresets.length > 0) {
      console.log('\n未使用プリセット:');
      unusedPresets.forEach(preset => {
        console.log(`  - ${preset.displayName} (${preset.category})`);
      });
    }
    
    // 問題のあるデータをチェック
    console.log('\n=== データ整合性チェック ===');
    
    // 夜間担当プリセットの実際の時間設定を確認
    const nightDutyAdjustments = await prisma.adjustment.findMany({
      where: {
        memo: { contains: 'presetId:night-duty' }
      },
      select: {
        id: true,
        staffId: true,
        date: true,
        start: true,
        end: true,
        status: true,
        memo: true
      },
      take: 10
    });
    
    console.log(`夜間担当プリセット使用データ例 (最新10件):`);
    nightDutyAdjustments.forEach((adj, index) => {
      const startTime = adj.start ? adj.start.toISOString().split('T')[1].slice(0,5) : 'なし';
      const endTime = adj.end ? adj.end.toISOString().split('T')[1].slice(0,5) : 'なし';
      const dateStr = adj.date.toISOString().split('T')[0];
      console.log(`${index + 1}. [${adj.id}] スタッフ${adj.staffId} ${dateStr} ${startTime}-${endTime} ステータス:${adj.status}`);
    });
    
    // 時間設定の不整合をチェック
    const nightDutyPreset = presets.find(p => p.id === 'night-duty');
    if (nightDutyPreset) {
      console.log('\n夜間担当プリセット定義:');
      nightDutyPreset.schedules.forEach((schedule, index) => {
        console.log(`  ${index + 1}. ${schedule.status}: ${schedule.startTime}-${schedule.endTime}`);
      });
      
      // 代表スケジュールは何番目？
      const representativeIndex = nightDutyPreset.representativeScheduleIndex ?? 0;
      const representativeSchedule = nightDutyPreset.schedules[representativeIndex];
      console.log(`代表スケジュール: ${representativeSchedule.status} (${representativeSchedule.startTime}-${representativeSchedule.endTime})`);
      
      // 実際のデータと比較
      const actualTimeRanges = nightDutyAdjustments.map(adj => {
        const start = adj.start ? adj.start.getUTCHours() + adj.start.getUTCMinutes() / 60 : 0;
        const end = adj.end ? adj.end.getUTCHours() + adj.end.getUTCMinutes() / 60 : 0;
        return { start, end };
      });
      
      console.log('\n実際の時間設定パターン:');
      const timePatterns = {};
      actualTimeRanges.forEach(range => {
        const key = `${range.start}-${range.end}`;
        timePatterns[key] = (timePatterns[key] || 0) + 1;
      });
      
      Object.entries(timePatterns).forEach(([pattern, count]) => {
        console.log(`  ${pattern}: ${count}件`);
      });
    }
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllPresets();