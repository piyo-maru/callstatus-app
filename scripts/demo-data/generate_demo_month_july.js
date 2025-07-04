#!/usr/bin/env node

/**
 * 7/3-7/31 (7月全期間) のデモ申請予定と担当設定生成スクリプト
 * 225人のスタッフに対してリアルなデモデータを生成
 */

const fs = require('fs');
const { format, addDays } = require('date-fns');

// デモ期間設定
const START_DATE = new Date('2025-07-03'); 
const END_DATE = new Date('2025-07-31');

// プリセット定義
const PRESETS = [
  { type: 'vacation', name: '休暇', schedules: [{ status: 'off', start: 9, end: 18 }] },
  { type: 'half_morning_off', name: '午前休', schedules: [{ status: 'off', start: 9, end: 13 }, { status: 'office', start: 13, end: 18 }] },
  { type: 'half_afternoon_off', name: '午後休', schedules: [{ status: 'office', start: 9, end: 13 }, { status: 'off', start: 13, end: 18 }] },
  { type: 'early_leave', name: '早退', schedules: [{ status: 'office', start: 9, end: 16 }] },
  { type: 'late_arrival', name: '遅刻', schedules: [{ status: 'office', start: 11, end: 18 }] },
  { type: 'overtime', name: '残業', schedules: [{ status: 'office', start: 9, end: 20 }] },
  { type: 'remote_work', name: '在宅勤務', schedules: [{ status: 'remote', start: 9, end: 18 }] },
  { type: 'substitute_work', name: '振出', schedules: [{ status: 'office', start: 9, end: 18 }] },
  { type: 'night_shift', name: '夜間担当', schedules: [{ status: 'office', start: 18, end: 21 }] }
];

// 担当設定定義
const RESPONSIBILITIES = {
  fax: 'FAX当番',
  subjectCheck: '件名チェック担当',
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

function getDaysBetween(startDate, endDate) {
  const days = [];
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    days.push(new Date(currentDate));
    currentDate = addDays(currentDate, 1);
  }
  
  return days;
}

function generateDemoData() {
  const days = getDaysBetween(START_DATE, END_DATE);
  const data = {
    period: `${format(START_DATE, 'yyyy-MM-dd')} to ${format(END_DATE, 'yyyy-MM-dd')}`,
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
  console.log('📅 対象日数:', days.length, '日間');

  // 申請予定生成
  days.forEach(currentDate => {
    const dateString = format(currentDate, 'yyyy-MM-dd');
    const dayName = ['日', '月', '火', '水', '木', '金', '土'][currentDate.getDay()];
    
    console.log(`📅 ${dateString} (${dayName}) の申請予定を生成中...`);
    
    // 各日の申請数を調整
    let applicationsPerDay;
    if (dayName === '月' || dayName === '金') {
      applicationsPerDay = Math.floor(Math.random() * 25) + 35; // 月金は多め 35-60件
    } else if (dayName === '土' || dayName === '日') {
      applicationsPerDay = Math.floor(Math.random() * 20) + 15; // 土日は少なめ 15-35件
    } else {
      applicationsPerDay = Math.floor(Math.random() * 20) + 25; // 平日 25-45件
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
  });

  // 担当設定生成（各日2-5件程度）
  days.forEach(currentDate => {
    const dateString = format(currentDate, 'yyyy-MM-dd');
    const dayName = ['日', '月', '火', '水', '木', '金', '土'][currentDate.getDay()];
    
    console.log(`👥 ${dateString} (${dayName}) の担当設定を生成中...`);
    
    // 各日の担当設定数
    const responsibilitiesPerDay = Math.floor(Math.random() * 4) + 2; // 2-5件
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
  });

  // サマリー更新
  data.summary.applications = data.applications.length;
  data.summary.responsibilities = data.responsibilities.length;
  data.summary.totalItems = data.summary.applications + data.summary.responsibilities;

  return data;
}

function saveToFile(data) {
  const fileName = 'demo_data_july_0703-0731.json';
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
    console.log(`1. APIでデータ登録を実行: node register_demo_data.js`);
    console.log(`2. フロントエンドで動作確認`);
  } catch (error) {
    console.error('❌ デモデータ生成エラー:', error);
    process.exit(1);
  }
}

module.exports = { generateDemoData, saveToFile };