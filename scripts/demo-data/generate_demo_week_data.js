#!/usr/bin/env node

/**
 * 7/7-7/13 (1週間) のデモ申請予定と担当設定生成スクリプト
 * 225人のスタッフに対してリアルなデモデータを生成
 */

const fs = require('fs');
const { format, addDays } = require('date-fns');

// デモ期間設定
const START_DATE = new Date('2025-07-07'); // 月曜日
const DAYS_COUNT = 7; // 1週間

// プリセット定義
const PRESETS = [
  { type: 'vacation', name: '休暇', schedules: [{ status: 'off', start: 9, end: 18 }] },
  { type: 'half_morning_off', name: '午前半休', schedules: [{ status: 'off', start: 9, end: 13 }, { status: 'office', start: 13, end: 18 }] },
  { type: 'half_afternoon_off', name: '午後半休', schedules: [{ status: 'office', start: 9, end: 13 }, { status: 'off', start: 13, end: 18 }] },
  { type: 'early_leave', name: '早退', schedules: [{ status: 'office', start: 9, end: 16 }] },
  { type: 'late_arrival', name: '遅刻', schedules: [{ status: 'office', start: 11, end: 18 }] },
  { type: 'overtime', name: '残業', schedules: [{ status: 'office', start: 9, end: 20 }] }
];

// 担当設定定義
const RESPONSIBILITIES = {
  // 一般部署用
  fax: 'FAX当番',
  subjectCheck: '件名チェック担当',
  // 受付部署用（追加）
  lunch: '昼休み当番',
  cs: 'CS当番'
};

function getRandomStaffIds(totalStaff, count) {
  const ids = [];
  while (ids.length < count) {
    const id = Math.floor(Math.random() * totalStaff) + 1;
    if (!ids.includes(id)) {
      ids.push(id);
    }
  }
  return ids;
}

function generateDemoData() {
  const data = {
    period: `${format(START_DATE, 'yyyy-MM-dd')} to ${format(addDays(START_DATE, DAYS_COUNT - 1), 'yyyy-MM-dd')}`,
    generatedAt: new Date().toISOString(),
    summary: {
      applications: 0,
      responsibilities: 0,
      totalItems: 0
    },
    applications: [],
    responsibilities: []
  };

  console.log('🗓️  デモデータ生成期間:', data.period);

  // 申請予定生成（各日30-50件程度）
  for (let dayOffset = 0; dayOffset < DAYS_COUNT; dayOffset++) {
    const currentDate = addDays(START_DATE, dayOffset);
    const dateString = format(currentDate, 'yyyy-MM-dd');
    const dayName = ['日', '月', '火', '水', '木', '金', '土'][currentDate.getDay()];
    
    console.log(`📅 ${dateString} (${dayName}) の申請予定を生成中...`);
    
    // 各日の申請数を調整
    let applicationsPerDay;
    if (dayName === '月' || dayName === '金') {
      applicationsPerDay = Math.floor(Math.random() * 20) + 40; // 月金は多め 40-60件
    } else if (dayName === '土' || dayName === '日') {
      applicationsPerDay = Math.floor(Math.random() * 15) + 20; // 土日は少なめ 20-35件
    } else {
      applicationsPerDay = Math.floor(Math.random() * 15) + 30; // 平日 30-45件
    }
    
    const dayStaffIds = getRandomStaffIds(225, applicationsPerDay);
    
    dayStaffIds.forEach(staffId => {
      const preset = PRESETS[Math.floor(Math.random() * PRESETS.length)];
      
      data.applications.push({
        staffId: staffId,
        date: dateString,
        presetType: preset.type,
        presetName: preset.name,
        schedules: preset.schedules
      });
    });
  }

  // 担当設定生成（各日2-4件程度）
  for (let dayOffset = 0; dayOffset < DAYS_COUNT; dayOffset++) {
    const currentDate = addDays(START_DATE, dayOffset);
    const dateString = format(currentDate, 'yyyy-MM-dd');
    const dayName = ['日', '月', '火', '水', '木', '金', '土'][currentDate.getDay()];
    
    console.log(`👥 ${dateString} (${dayName}) の担当設定を生成中...`);
    
    // 各日の担当設定数
    const responsibilitiesPerDay = Math.floor(Math.random() * 3) + 2; // 2-4件
    const dayStaffIds = getRandomStaffIds(225, responsibilitiesPerDay);
    
    dayStaffIds.forEach((staffId, index) => {
      const responsibilities = {};
      
      // ランダムに担当を割り当て
      if (index === 0) {
        responsibilities.fax = true; // 1人目はFAX当番
      }
      if (index === 1) {
        responsibilities.subjectCheck = true; // 2人目は件名チェック
      }
      if (responsibilitiesPerDay > 2 && index === 2) {
        responsibilities.lunch = true; // 3人目がいれば昼休み当番
      }
      if (responsibilitiesPerDay > 3 && index === 3) {
        responsibilities.cs = true; // 4人目がいればCS当番
      }
      
      data.responsibilities.push({
        staffId: staffId,
        date: dateString,
        responsibilities: responsibilities
      });
    });
  }

  // サマリー更新
  data.summary.applications = data.applications.length;
  data.summary.responsibilities = data.responsibilities.length;
  data.summary.totalItems = data.summary.applications + data.summary.responsibilities;

  return data;
}

function saveToFile(data) {
  const fileName = 'demo_data_week_0707-0713.json';
  const filePath = `/root/callstatus-app/${fileName}`;
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  
  console.log(`\n✅ デモデータファイル生成完了: ${fileName}`);
  console.log(`📊 生成内容:`);
  console.log(`  - 申請予定: ${data.summary.applications}件`);
  console.log(`  - 担当設定: ${data.summary.responsibilities}件`);
  console.log(`  - 合計: ${data.summary.totalItems}件`);
  
  return filePath;
}

// メイン実行
if (require.main === module) {
  try {
    const demoData = generateDemoData();
    const filePath = saveToFile(demoData);
    
    console.log(`\n🎯 次のステップ:`);
    console.log(`1. APIでデータ登録を実行`);
    console.log(`2. フロントエンドで動作確認`);
  } catch (error) {
    console.error('❌ デモデータ生成エラー:', error);
    process.exit(1);
  }
}

module.exports = { generateDemoData, saveToFile };