#!/usr/bin/env node

/**
 * 7/3-7/31 システムプリセット準拠のデモ申請予定と担当設定生成スクリプト
 * 指定された人数配分に基づき、有効なプリセット設定でデモデータを生成
 */

const fs = require('fs');
const { format, addDays } = require('date-fns');

// デモ期間設定
const START_DATE = new Date('2025-07-03'); 
const END_DATE = new Date('2025-07-31');

// 人数配分設定
const DAILY_QUOTAS = {
  // 平日の申請予定
  weekday: {
    vacation: 25,        // 休暇
    morning_half: 5,     // 午前休
    afternoon_half: 7,   // 午後休
    remote_work: 5,      // 在宅勤務
    night_shift: 6       // 夜間担当
  },
  // 土曜の申請予定
  saturday: {
    substitute_work: 6   // 振出
  },
  // 担当設定（平日のみ）
  responsibilities: {
    fax: 1,              // FAX当番
    subject_check: 1     // 件名チェック担当
  }
};

// システム準拠プリセット定義
const SYSTEM_PRESETS = {
  vacation: {
    presetId: 'paid-leave',
    name: '休暇',
    schedules: [{ status: 'off', start: 9, end: 18 }]
  },
  morning_half: {
    presetId: 'custom-1751459171314',
    name: '午前休',
    schedules: [{ status: 'off', start: 9, end: 14 }]
  },
  afternoon_half: {
    presetId: 'custom-1751459196532',
    name: '午後休',
    schedules: [{ status: 'off', start: 13, end: 18 }]
  },
  remote_work: {
    presetId: 'custom-1751466304586',
    name: '在宅勤務（出向社員）',
    schedules: [
      { status: 'remote', start: 9, end: 12 },
      { status: 'break', start: 12, end: 13 },
      { status: 'remote', start: 13, end: 18 }
    ]
  },
  night_shift: {
    presetId: 'night-duty',
    name: '夜間担当',
    schedules: [
      { status: 'off', start: 9, end: 12 },
      { status: 'break', start: 17, end: 18 },
      { status: 'night duty', start: 18, end: 21 }
    ]
  },
  substitute_work: {
    presetId: 'substitute-work-regular',
    name: '振出（出向社員）',
    schedules: [{ status: 'online', start: 9, end: 18 }]
  }
};

function getRandomStaffIds(totalStaff, count, excludeIds = []) {
  const ids = [];
  let attempts = 0;
  const maxAttempts = totalStaff * 2; // 無限ループ防止
  
  while (ids.length < count && attempts < maxAttempts) {
    const id = Math.floor(Math.random() * totalStaff) + 1;
    if (!ids.includes(id) && !excludeIds.includes(id)) {
      ids.push(id);
    }
    attempts++;
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
  console.log('🎯 システムプリセット準拠でデータ生成中...');

  // 申請予定生成
  days.forEach(currentDate => {
    const dateString = format(currentDate, 'yyyy-MM-dd');
    const dayOfWeek = currentDate.getDay(); // 0=日曜, 1=月曜, ..., 6=土曜
    const dayName = ['日', '月', '火', '水', '木', '金', '土'][dayOfWeek];
    
    console.log(`📅 ${dateString} (${dayName}) の申請予定を生成中...`);
    
    const usedStaffIds = []; // 同じ日に複数申請を防ぐため
    
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      // 平日（月〜金）
      const quotas = DAILY_QUOTAS.weekday;
      
      // 休暇
      const vacationIds = getRandomStaffIds(225, quotas.vacation, usedStaffIds);
      vacationIds.forEach(staffId => {
        const preset = SYSTEM_PRESETS.vacation;
        data.applications.push({
          staffId: staffId,
          date: dateString,
          presetId: preset.presetId,
          presetType: 'vacation',
          presetName: preset.name,
          schedules: preset.schedules
        });
        usedStaffIds.push(staffId);
      });
      
      // 午前休
      const morningHalfIds = getRandomStaffIds(225, quotas.morning_half, usedStaffIds);
      morningHalfIds.forEach(staffId => {
        const preset = SYSTEM_PRESETS.morning_half;
        data.applications.push({
          staffId: staffId,
          date: dateString,
          presetId: preset.presetId,
          presetType: 'morning_half',
          presetName: preset.name,
          schedules: preset.schedules
        });
        usedStaffIds.push(staffId);
      });
      
      // 午後休
      const afternoonHalfIds = getRandomStaffIds(225, quotas.afternoon_half, usedStaffIds);
      afternoonHalfIds.forEach(staffId => {
        const preset = SYSTEM_PRESETS.afternoon_half;
        data.applications.push({
          staffId: staffId,
          date: dateString,
          presetId: preset.presetId,
          presetType: 'afternoon_half',
          presetName: preset.name,
          schedules: preset.schedules
        });
        usedStaffIds.push(staffId);
      });
      
      // 在宅勤務
      const remoteWorkIds = getRandomStaffIds(225, quotas.remote_work, usedStaffIds);
      remoteWorkIds.forEach(staffId => {
        const preset = SYSTEM_PRESETS.remote_work;
        data.applications.push({
          staffId: staffId,
          date: dateString,
          presetId: preset.presetId,
          presetType: 'remote_work',
          presetName: preset.name,
          schedules: preset.schedules
        });
        usedStaffIds.push(staffId);
      });
      
      // 夜間担当
      const nightShiftIds = getRandomStaffIds(225, quotas.night_shift, usedStaffIds);
      nightShiftIds.forEach(staffId => {
        const preset = SYSTEM_PRESETS.night_shift;
        data.applications.push({
          staffId: staffId,
          date: dateString,
          presetId: preset.presetId,
          presetType: 'night_shift',
          presetName: preset.name,
          schedules: preset.schedules
        });
        usedStaffIds.push(staffId);
      });
      
    } else if (dayOfWeek === 6) {
      // 土曜日
      const quotas = DAILY_QUOTAS.saturday;
      
      // 振出
      const substituteWorkIds = getRandomStaffIds(225, quotas.substitute_work, usedStaffIds);
      substituteWorkIds.forEach(staffId => {
        const preset = SYSTEM_PRESETS.substitute_work;
        data.applications.push({
          staffId: staffId,
          date: dateString,
          presetId: preset.presetId,
          presetType: 'substitute_work',
          presetName: preset.name,
          schedules: preset.schedules
        });
        usedStaffIds.push(staffId);
      });
    }
    // 日曜日は申請予定なし
  });

  // 担当設定生成（平日のみ）
  days.forEach(currentDate => {
    const dateString = format(currentDate, 'yyyy-MM-dd');
    const dayOfWeek = currentDate.getDay();
    const dayName = ['日', '月', '火', '水', '木', '金', '土'][dayOfWeek];
    
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      // 平日のみ担当設定
      console.log(`👥 ${dateString} (${dayName}) の担当設定を生成中...`);
      
      const quotas = DAILY_QUOTAS.responsibilities;
      const responsibilityStaffIds = getRandomStaffIds(225, quotas.fax + quotas.subject_check);
      
      // FAX当番
      for (let i = 0; i < quotas.fax; i++) {
        const staffId = responsibilityStaffIds[i];
        data.responsibilities.push({
          staffId: staffId,
          date: dateString,
          type: 'fax',
          description: 'FAX当番',
          responsibilities: { fax: true }
        });
      }
      
      // 件名チェック担当
      for (let i = quotas.fax; i < quotas.fax + quotas.subject_check; i++) {
        const staffId = responsibilityStaffIds[i];
        data.responsibilities.push({
          staffId: staffId,
          date: dateString,
          type: 'subjectCheck',
          description: '件名チェック担当',
          responsibilities: { subjectCheck: true }
        });
      }
    }
  });

  // サマリー更新
  data.summary.applications = data.applications.length;
  data.summary.responsibilities = data.responsibilities.length;
  data.summary.totalItems = data.summary.applications + data.summary.responsibilities;

  return data;
}

function saveToFile(data) {
  const fileName = 'demo_data_july_system_presets.json';
  const filePath = `/root/callstatus-app/${fileName}`;
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  
  console.log(`\n✅ デモデータファイル生成完了: ${fileName}`);
  console.log(`📊 生成内容:`);
  console.log(`  - 申請予定: ${data.summary.applications}件`);
  console.log(`  - 担当設定: ${data.summary.responsibilities}件`);
  console.log(`  - 合計: ${data.summary.totalItems}件`);
  
  // 詳細統計
  const stats = calculateStats(data);
  console.log(`\n📈 配分統計:`);
  console.log(`  平日申請予定: ${stats.weekdayApplications}件 (${stats.weekdays}日間)`);
  console.log(`  土曜申請予定: ${stats.saturdayApplications}件 (${stats.saturdays}日間)`);
  console.log(`  担当設定: ${stats.responsibilities}件 (${stats.weekdays}日間)`);
  
  console.log(`\n🎯 システムプリセット対応確認:`);
  console.log(`  ✅ 休暇 → paid-leave`);
  console.log(`  ✅ 午前休 → custom-1751459171314`);
  console.log(`  ✅ 午後休 → custom-1751459196532`);
  console.log(`  ✅ 在宅勤務 → custom-1751466304586`);
  console.log(`  ✅ 夜間担当 → night-duty`);
  console.log(`  ✅ 振出 → substitute-work-regular`);
  console.log(`  ✅ FAX当番 → fax担当設定`);
  console.log(`  ✅ 件名チェック担当 → subjectCheck担当設定`);
  
  return filePath;
}

function calculateStats(data) {
  const days = getDaysBetween(START_DATE, END_DATE);
  let weekdays = 0;
  let saturdays = 0;
  let weekdayApplications = 0;
  let saturdayApplications = 0;
  
  days.forEach(date => {
    const dayOfWeek = date.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      weekdays++;
    } else if (dayOfWeek === 6) {
      saturdays++;
    }
  });
  
  data.applications.forEach(app => {
    const date = new Date(app.date);
    const dayOfWeek = date.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      weekdayApplications++;
    } else if (dayOfWeek === 6) {
      saturdayApplications++;
    }
  });
  
  return {
    weekdays,
    saturdays,
    weekdayApplications,
    saturdayApplications,
    responsibilities: data.responsibilities.length
  };
}

// メイン実行
if (require.main === module) {
  try {
    const demoData = generateDemoData();
    const filePath = saveToFile(demoData);
    
    console.log(`\n🎯 次のステップ:`);
    console.log(`1. register_demo_data.jsを更新`);
    console.log(`2. APIでデータ登録を実行`);
    console.log(`3. フロントエンドで動作確認`);
  } catch (error) {
    console.error('❌ デモデータ生成エラー:', error);
    process.exit(1);
  }
}

module.exports = { generateDemoData, saveToFile };