#!/usr/bin/env node

/**
 * 9/1-9/30 システムプリセット準拠のデモ申請予定と担当設定生成スクリプト
 * 指定された人数配分に基づき、有効なプリセット設定でデモデータを生成
 */

const fs = require('fs');
const { format, addDays } = require('date-fns');

// デモ期間設定（9月全期間）
const START_DATE = new Date('2025-09-01'); 
const END_DATE = new Date('2025-09-30');

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
    schedules: [{ status: 'off', start: 9, end: 18, memo: '月次プランナー: 休暇|presetId:paid-leave' }]
  },
  morning_half: {
    presetId: 'custom-1751459171314',
    name: '午前休',
    schedules: [{ status: 'off', start: 9, end: 14, memo: '月次プランナー: 午前休|presetId:custom-1751459171314' }]
  },
  afternoon_half: {
    presetId: 'custom-1751459196532',
    name: '午後休',
    schedules: [
      { status: 'online', start: 12, end: 13, memo: '月次プランナー: 午後休|presetId:custom-1751459196532' },
      { status: 'off', start: 13, end: 18, memo: '月次プランナー: 午後休|presetId:custom-1751459196532' }
    ]
  },
  remote_work: {
    presetId: 'custom-1751466304586',
    name: '在宅勤務（出向社員）',
    schedules: [
      { status: 'remote', start: 9, end: 12, memo: '月次プランナー: 在宅勤務（出向社員）|presetId:custom-1751466304586' },
      { status: 'break', start: 12, end: 13, memo: '月次プランナー: 在宅勤務（出向社員）|presetId:custom-1751466304586' },
      { status: 'remote', start: 13, end: 18, memo: '月次プランナー: 在宅勤務（出向社員）|presetId:custom-1751466304586' }
    ]
  },
  night_shift: {
    presetId: 'night-duty',
    name: '夜間担当',
    schedules: [
      { status: 'off', start: 9, end: 12, memo: '月次プランナー: 夜間担当|presetId:night-duty' },
      { status: 'online', start: 12, end: 13, memo: '月次プランナー: 夜間担当|presetId:night-duty' },
      { status: 'break', start: 17, end: 18, memo: '月次プランナー: 夜間担当|presetId:night-duty' },
      { status: 'night duty', start: 18, end: 21, memo: '月次プランナー: 夜間担当|presetId:night-duty' }
    ]
  },
  substitute_work: {
    presetId: 'custom-1751466327183',
    name: '振出（出向社員）',
    schedules: [
      { status: '出社', start: 9, end: 12, memo: '月次プランナー: 振出（出向社員）|presetId:custom-1751466327183' },
      { status: 'break', start: 12, end: 13, memo: '月次プランナー: 振出（出向社員）|presetId:custom-1751466327183' },
      { status: 'online', start: 13, end: 18, memo: '月次プランナー: 振出（出向社員）|presetId:custom-1751466327183' }
    ]
  }
};

// スタッフID範囲
const STAFF_ID_MIN = 73;
const STAFF_ID_MAX = 297;
const TOTAL_STAFF = STAFF_ID_MAX - STAFF_ID_MIN + 1;

// ユーティリティ関数
function getRandomStaffIds(count, exclude = []) {
  const availableIds = [];
  for (let i = STAFF_ID_MIN; i <= STAFF_ID_MAX; i++) {
    if (!exclude.includes(i)) {
      availableIds.push(i);
    }
  }
  
  const selected = [];
  for (let i = 0; i < Math.min(count, availableIds.length); i++) {
    const randomIndex = Math.floor(Math.random() * availableIds.length);
    selected.push(availableIds.splice(randomIndex, 1)[0]);
  }
  
  return selected;
}

function isWeekday(date) {
  const day = date.getDay();
  return day >= 1 && day <= 5; // 月曜日(1)から金曜日(5)
}

function isSaturday(date) {
  return date.getDay() === 6;
}

function generateResponsibilities(date, usedStaffIds) {
  const responsibilities = [];
  const dateString = format(date, 'yyyy-MM-dd');
  
  // FAX当番
  const faxStaffIds = getRandomStaffIds(DAILY_QUOTAS.responsibilities.fax, usedStaffIds);
  faxStaffIds.forEach(staffId => {
    responsibilities.push({
      staffId,
      date: dateString,
      responsibilities: ['FAX当番'],
      description: 'FAX当番'
    });
    usedStaffIds.push(staffId);
  });
  
  // 件名チェック担当
  const subjectStaffIds = getRandomStaffIds(DAILY_QUOTAS.responsibilities.subject_check, usedStaffIds);
  subjectStaffIds.forEach(staffId => {
    responsibilities.push({
      staffId,
      date: dateString,
      responsibilities: ['件名チェック担当'],
      description: '件名チェック担当'
    });
    usedStaffIds.push(staffId);
  });
  
  return responsibilities;
}

// メイン生成関数
function generateSeptemberDemoData() {
  const applications = [];
  const responsibilities = [];
  
  console.log('🚀 9月デモデータ生成開始...');
  console.log(`📅 期間: ${format(START_DATE, 'yyyy-MM-dd')} 〜 ${format(END_DATE, 'yyyy-MM-dd')}`);
  console.log(`👥 対象スタッフ: ${TOTAL_STAFF}名 (ID: ${STAFF_ID_MIN}-${STAFF_ID_MAX})`);
  
  let currentDate = new Date(START_DATE);
  
  while (currentDate <= END_DATE) {
    const dateString = format(currentDate, 'yyyy-MM-dd');
    const usedStaffIds = [];
    
    console.log(`📝 ${dateString} (${['日', '月', '火', '水', '木', '金', '土'][currentDate.getDay()]}) のデータ生成中...`);
    
    if (isWeekday(currentDate)) {
      // 平日の申請予定生成
      const quotas = DAILY_QUOTAS.weekday;
      
      // 休暇
      const vacationStaffIds = getRandomStaffIds(quotas.vacation, usedStaffIds);
      vacationStaffIds.forEach(staffId => {
        applications.push({
          staffId,
          date: dateString,
          presetId: SYSTEM_PRESETS.vacation.presetId,
          presetName: SYSTEM_PRESETS.vacation.name,
          schedules: SYSTEM_PRESETS.vacation.schedules
        });
        usedStaffIds.push(staffId);
      });
      
      // 午前休
      const morningHalfStaffIds = getRandomStaffIds(quotas.morning_half, usedStaffIds);
      morningHalfStaffIds.forEach(staffId => {
        applications.push({
          staffId,
          date: dateString,
          presetId: SYSTEM_PRESETS.morning_half.presetId,
          presetName: SYSTEM_PRESETS.morning_half.name,
          schedules: SYSTEM_PRESETS.morning_half.schedules
        });
        usedStaffIds.push(staffId);
      });
      
      // 午後休
      const afternoonHalfStaffIds = getRandomStaffIds(quotas.afternoon_half, usedStaffIds);
      afternoonHalfStaffIds.forEach(staffId => {
        applications.push({
          staffId,
          date: dateString,
          presetId: SYSTEM_PRESETS.afternoon_half.presetId,
          presetName: SYSTEM_PRESETS.afternoon_half.name,
          schedules: SYSTEM_PRESETS.afternoon_half.schedules
        });
        usedStaffIds.push(staffId);
      });
      
      // 在宅勤務
      const remoteWorkStaffIds = getRandomStaffIds(quotas.remote_work, usedStaffIds);
      remoteWorkStaffIds.forEach(staffId => {
        applications.push({
          staffId,
          date: dateString,
          presetId: SYSTEM_PRESETS.remote_work.presetId,
          presetName: SYSTEM_PRESETS.remote_work.name,
          schedules: SYSTEM_PRESETS.remote_work.schedules
        });
        usedStaffIds.push(staffId);
      });
      
      // 夜間担当
      const nightShiftStaffIds = getRandomStaffIds(quotas.night_shift, usedStaffIds);
      nightShiftStaffIds.forEach(staffId => {
        applications.push({
          staffId,
          date: dateString,
          presetId: SYSTEM_PRESETS.night_shift.presetId,
          presetName: SYSTEM_PRESETS.night_shift.name,
          schedules: SYSTEM_PRESETS.night_shift.schedules
        });
        usedStaffIds.push(staffId);
      });
      
      // 担当設定生成
      const dailyResponsibilities = generateResponsibilities(currentDate, usedStaffIds);
      responsibilities.push(...dailyResponsibilities);
      
    } else if (isSaturday(currentDate)) {
      // 土曜日の申請予定生成
      const quotas = DAILY_QUOTAS.saturday;
      
      // 振出（出張として扱い）
      const substituteWorkStaffIds = getRandomStaffIds(quotas.substitute_work, usedStaffIds);
      substituteWorkStaffIds.forEach(staffId => {
        applications.push({
          staffId,
          date: dateString,
          presetId: SYSTEM_PRESETS.substitute_work.presetId,
          presetName: SYSTEM_PRESETS.substitute_work.name,
          schedules: SYSTEM_PRESETS.substitute_work.schedules
        });
        usedStaffIds.push(staffId);
      });
    }
    
    currentDate = addDays(currentDate, 1);
  }
  
  console.log(`\n📊 生成結果:`);
  console.log(`申請予定: ${applications.length}件`);
  console.log(`担当設定: ${responsibilities.length}件`);
  
  // スケジュール総数計算
  let totalSchedules = 0;
  applications.forEach(app => {
    totalSchedules += app.schedules.length;
  });
  console.log(`スケジュール総数: ${totalSchedules}件`);
  
  return {
    applications,
    responsibilities,
    metadata: {
      generated_at: new Date().toISOString(),
      period: `${format(START_DATE, 'yyyy-MM-dd')} to ${format(END_DATE, 'yyyy-MM-dd')}`,
      total_applications: applications.length,
      total_responsibilities: responsibilities.length,
      total_schedules: totalSchedules,
      staff_range: `${STAFF_ID_MIN}-${STAFF_ID_MAX}`,
      daily_quotas: DAILY_QUOTAS
    }
  };
}

// 実行
if (require.main === module) {
  const demoData = generateSeptemberDemoData();
  
  const filename = 'demo_data_september_2025.json';
  fs.writeFileSync(filename, JSON.stringify(demoData, null, 2));
  
  console.log(`\n💾 ファイル保存完了: ${filename}`);
  console.log('🎉 9月デモデータ生成完了！');
}

module.exports = { generateSeptemberDemoData };