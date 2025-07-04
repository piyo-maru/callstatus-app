const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPresets() {
  try {
    console.log('=== グローバルプリセット設定の確認 ===');
    
    // グローバルプリセット設定を取得
    const globalSettings = await prisma.globalPresetSettings.findFirst({
      where: { id: 1 }
    });
    
    if (globalSettings) {
      console.log('✅ グローバルプリセット設定が見つかりました');
      console.log(`バージョン: ${globalSettings.version}`);
      console.log(`更新日時: ${globalSettings.updatedAt}`);
      
      // プリセットのJSONデータを解析
      const presets = Array.isArray(globalSettings.presets) ? globalSettings.presets : [];
      console.log(`\nプリセット数: ${presets.length}`);
      
      // 夜間担当カテゴリのプリセットを確認
      const nightDutyPresets = presets.filter(preset => preset.category === 'night-duty');
      console.log(`\n夜間担当カテゴリプリセット数: ${nightDutyPresets.length}`);
      
      nightDutyPresets.forEach((preset, index) => {
        console.log(`\n--- 夜間担当プリセット ${index + 1} ---`);
        console.log(`ID: ${preset.id}`);
        console.log(`名前: ${preset.name}`);
        console.log(`表示名: ${preset.displayName}`);
        console.log(`説明: ${preset.description}`);
        console.log(`アクティブ: ${preset.isActive}`);
        console.log(`代表スケジュールインデックス: ${preset.representativeScheduleIndex}`);
        console.log('スケジュール:');
        preset.schedules.forEach((schedule, scheduleIndex) => {
          console.log(`  ${scheduleIndex + 1}. ステータス: ${schedule.status}, 開始: ${schedule.startTime}, 終了: ${schedule.endTime}, メモ: ${schedule.memo || 'なし'}`);
        });
      });
      
      // 月次プランナーページの設定を確認
      const pageSettings = globalSettings.pagePresetSettings || {};
      const monthlyPlannerSettings = pageSettings.monthlyPlanner || {};
      console.log('\n=== 月次プランナーページ設定 ===');
      console.log(`有効なプリセットID: ${JSON.stringify(monthlyPlannerSettings.enabledPresetIds)}`);
      console.log(`デフォルトプリセットID: ${monthlyPlannerSettings.defaultPresetId}`);
      console.log(`プリセット表示順: ${JSON.stringify(monthlyPlannerSettings.presetDisplayOrder)}`);
      
      // 夜間担当が有効になっているかチェック
      const nightDutyEnabled = (monthlyPlannerSettings.enabledPresetIds || []).includes('night-duty');
      console.log(`夜間担当プリセットが有効: ${nightDutyEnabled ? '✅ YES' : '❌ NO'}`);
      
      // 個人ページの設定を確認
      const personalPageSettings = pageSettings.personalPage || {};
      console.log('\n=== 個人ページ設定 ===');
      console.log(`有効なプリセットID: ${JSON.stringify(personalPageSettings.enabledPresetIds)}`);
      console.log(`デフォルトプリセットID: ${personalPageSettings.defaultPresetId}`);
      console.log(`プリセット表示順: ${JSON.stringify(personalPageSettings.presetDisplayOrder)}`);
      
      // 夜間担当が有効になっているかチェック
      const nightDutyEnabledPersonal = (personalPageSettings.enabledPresetIds || []).includes('night-duty');
      console.log(`夜間担当プリセットが有効: ${nightDutyEnabledPersonal ? '✅ YES' : '❌ NO'}`);
      
    } else {
      console.log('❌ グローバルプリセット設定が見つかりません');
    }
    
    // 実際のデータベースの夜間担当使用状況を確認
    console.log('\n=== 実際のデータベース使用状況 ===');
    const nightDutyUsage = await prisma.adjustment.count({
      where: {
        OR: [
          { status: 'night duty' },
          { memo: { contains: 'night-duty' } }
        ]
      }
    });
    console.log(`夜間担当ステータスの使用件数: ${nightDutyUsage}`);
    
    // 最近の夜間担当データを確認
    const recentNightDuty = await prisma.adjustment.findMany({
      where: {
        OR: [
          { status: 'night duty' },
          { memo: { contains: 'night-duty' } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true,
        staffId: true,
        date: true,
        status: true,
        start: true,
        end: true,
        memo: true,
        createdAt: true
      }
    });
    
    console.log('\n最近の夜間担当データ:');
    recentNightDuty.forEach((item, index) => {
      const startTime = item.start ? item.start.toISOString().split('T')[1].slice(0,5) : 'なし';
      const endTime = item.end ? item.end.toISOString().split('T')[1].slice(0,5) : 'なし';
      const dateStr = item.date.toISOString().split('T')[0];
      console.log(`${index + 1}. [${item.id}] スタッフ${item.staffId} ${dateStr} ${startTime}-${endTime} ステータス:${item.status}`);
      console.log(`   メモ: ${item.memo || 'なし'}`);
      console.log(`   作成日時: ${item.createdAt.toISOString()}`);
    });
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPresets();