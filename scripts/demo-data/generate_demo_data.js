// デモデータ生成スクリプト（7/3-7/9の1週間分）
// メモ挿入なしで高速処理

const fs = require('fs');

// 期間設定
const startDate = new Date('2025-07-03'); // 木曜日
const dates = [];
for (let i = 0; i < 7; i++) {
  const date = new Date(startDate);
  date.setDate(startDate.getDate() + i);
  dates.push(date.toISOString().split('T')[0]);
}

console.log('📅 対象期間:', dates);

// スタッフID（1-225の範囲でランダム選択）
const getRandomStaffIds = (count, excludeIds = []) => {
  const available = [];
  for (let i = 1; i <= 225; i++) {
    if (!excludeIds.includes(i)) available.push(i);
  }
  
  const selected = [];
  for (let i = 0; i < count && available.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * available.length);
    const selectedId = available.splice(randomIndex, 1)[0];
    selected.push(selectedId);
  }
  return selected;
};

// プリセット申請予定データ生成
const generateApplications = () => {
  const applications = [];
  
  // 平日（月〜金）のパターン
  const weekdays = dates.filter((date, index) => {
    const dayOfWeek = new Date(date).getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 5; // 月曜=1, 金曜=5
  });
  
  console.log('📋 平日:', weekdays);
  
  weekdays.forEach(date => {
    let usedStaffIds = [];
    
    // 休暇: 25人/日
    const vacationStaffIds = getRandomStaffIds(25, usedStaffIds);
    usedStaffIds.push(...vacationStaffIds);
    vacationStaffIds.forEach(staffId => {
      applications.push({
        staffId,
        date,
        presetType: 'vacation',
        presetName: '休暇',
        schedules: [{ status: 'off', start: 9.0, end: 18.0 }],
        memo: undefined // メモなし
      });
    });
    
    // 午前休: 5人/日 （1つの申請として処理）
    const morningOffStaffIds = getRandomStaffIds(5, usedStaffIds);
    usedStaffIds.push(...morningOffStaffIds);
    morningOffStaffIds.forEach(staffId => {
      applications.push({
        staffId,
        date,
        presetType: 'morning-off',
        presetName: '午前休',
        schedules: [
          { status: 'off', start: 9.0, end: 13.0 },
          { status: 'online', start: 13.0, end: 18.0 }
        ],
        memo: undefined
      });
    });
    
    // 午後休: 7人/日 （1つの申請として処理）
    const afternoonOffStaffIds = getRandomStaffIds(7, usedStaffIds);
    usedStaffIds.push(...afternoonOffStaffIds);
    afternoonOffStaffIds.forEach(staffId => {
      applications.push({
        staffId,
        date,
        presetType: 'afternoon-off',
        presetName: '午後休',
        schedules: [
          { status: 'online', start: 9.0, end: 13.0 },
          { status: 'off', start: 13.0, end: 18.0 }
        ],
        memo: undefined
      });
    });
    
    // 在宅勤務: 5人/日
    const remoteWorkStaffIds = getRandomStaffIds(5, usedStaffIds);
    usedStaffIds.push(...remoteWorkStaffIds);
    remoteWorkStaffIds.forEach(staffId => {
      applications.push({
        staffId,
        date,
        presetType: 'remote-work',
        presetName: '在宅勤務',
        schedules: [{ status: 'remote', start: 9.0, end: 18.0 }],
        memo: undefined
      });
    });
    
    // 夜間担当: 6人/日
    const nightDutyStaffIds = getRandomStaffIds(6, usedStaffIds);
    usedStaffIds.push(...nightDutyStaffIds);
    nightDutyStaffIds.forEach(staffId => {
      applications.push({
        staffId,
        date,
        presetType: 'night-duty',
        presetName: '夜間担当',
        schedules: [{ status: 'night duty', start: 18.0, end: 21.0 }],
        memo: undefined
      });
    });
    
    console.log(`📊 ${date}: ${usedStaffIds.length}人の申請予定生成完了`);
  });
  
  // 土曜日（振出）
  const saturday = dates.find(date => new Date(date).getDay() === 6);
  if (saturday) {
    const saturdayWorkStaffIds = getRandomStaffIds(6);
    saturdayWorkStaffIds.forEach(staffId => {
      applications.push({
        staffId,
        date: saturday,
        presetType: 'saturday-work',
        presetName: '振出',
        schedules: [{ status: 'online', start: 9.0, end: 18.0 }],
        memo: undefined
      });
    });
    console.log(`📊 ${saturday}: 6人の振出申請予定生成完了`);
  }
  
  return applications;
};

// 担当設定データ生成
const generateResponsibilities = () => {
  const responsibilities = [];
  
  const weekdays = dates.filter(date => {
    const dayOfWeek = new Date(date).getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  });
  
  weekdays.forEach(date => {
    let usedStaffIds = [];
    
    // FAX当番: 1人/日
    const faxStaffIds = getRandomStaffIds(1, usedStaffIds);
    usedStaffIds.push(...faxStaffIds);
    faxStaffIds.forEach(staffId => {
      responsibilities.push({
        staffId,
        date,
        type: 'fax',
        description: 'FAX当番'
      });
    });
    
    // 件名チェック担当: 1人/日
    const subjectCheckStaffIds = getRandomStaffIds(1, usedStaffIds);
    subjectCheckStaffIds.forEach(staffId => {
      responsibilities.push({
        staffId,
        date,
        type: 'subjectCheck',
        description: '件名チェック担当'
      });
    });
    
    console.log(`👥 ${date}: 2人の担当設定生成完了`);
  });
  
  return responsibilities;
};

// データ生成実行
console.log('🚀 デモデータ生成開始...');

const applications = generateApplications();
const responsibilities = generateResponsibilities();

const demoData = {
  period: '2025-07-03 to 2025-07-09',
  generatedAt: new Date().toISOString(),
  summary: {
    applications: applications.length,
    responsibilities: responsibilities.length,
    totalItems: applications.length + responsibilities.length
  },
  applications,
  responsibilities
};

// JSONファイルに出力
fs.writeFileSync('demo_data_week.json', JSON.stringify(demoData, null, 2));

console.log('✅ デモデータ生成完了!');
console.log(`📁 出力ファイル: demo_data_week.json`);
console.log(`📊 申請予定: ${applications.length}件`);
console.log(`👥 担当設定: ${responsibilities.length}件`);
console.log(`🎯 合計: ${demoData.summary.totalItems}件`);