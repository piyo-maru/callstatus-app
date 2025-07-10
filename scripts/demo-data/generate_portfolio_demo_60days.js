#!/usr/bin/env node

/**
 * ポートフォリオ用60日分申請データ生成スクリプト（50人版・動的日付）
 * 実行日から60日間のデータを自動生成
 * 対象スタッフ: ID 234-283（50人）
 */

const fs = require('fs');

// 設定（スタッフID範囲を動的に取得する必要があるが、とりあえず現在の範囲に修正）
const STAFF_ID_RANGE = { min: 284, max: 333 }; // 50人（最新のseed_portfolio.js実行後の範囲）
const TOTAL_STAFF = STAFF_ID_RANGE.max - STAFF_ID_RANGE.min + 1;
const DAYS_TO_GENERATE = 60; // 60日間

// システムプリセット定義（README.mdと同じ）
const SYSTEM_PRESETS = {
  'paid-leave': { name: '休暇', schedules: [{ status: 'off', start: 9, end: 18 }] },
  'custom-morning-off': { name: '午前休', schedules: [
    { status: 'online', start: 9, end: 12 },
    { status: 'off', start: 12, end: 18 }
  ]},
  'custom-afternoon-off': { name: '午後休', schedules: [
    { status: 'online', start: 12, end: 13 },
    { status: 'off', start: 13, end: 18 }
  ]},
  'custom-remote-work': { name: '在宅勤務', schedules: [{ status: 'remote', start: 9, end: 18 }] },
  'night-duty': { name: '夜間担当', schedules: [{ status: 'online', start: 18, end: 22 }] },
  'weekend-substitute': { name: '振出', schedules: [{ status: 'online', start: 9, end: 18 }] }
};

// 平日用申請種別配分（1日当たり）- 50人版適正密度（225人時の21%比率を維持）
const WEEKDAY_PATTERNS = [
  { presetId: 'paid-leave', rate: 6 },            // 6人/平日（12%の確率）
  { presetId: 'custom-morning-off', rate: 2 },    // 2人/平日（4%の確率）
  { presetId: 'custom-afternoon-off', rate: 2 },  // 2人/平日（4%の確率）
  { presetId: 'custom-remote-work', rate: 2 },    // 2人/平日（4%の確率）
  { presetId: 'night-duty', rate: 1 },            // 1人/平日（2%の確率）
];

// 土曜用申請種別配分
const SATURDAY_PATTERNS = [
  { presetId: 'weekend-substitute', rate: 2 },    // 2人/土曜（4%の確率）
];

// 動的祝日判定（年度に依存しない基本的な祝日）
function isHoliday(date) {
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();
  const year = date.getFullYear();
  
  // 固定祝日
  const fixedHolidays = [
    [1, 1],   // 元日
    [2, 11],  // 建国記念の日
    [4, 29],  // 昭和の日
    [5, 3],   // 憲法記念日
    [5, 4],   // みどりの日
    [5, 5],   // こどもの日
    [8, 11],  // 山の日
    [11, 3],  // 文化の日
    [11, 23], // 勤労感謝の日
    [12, 23], // 天皇誕生日
  ];
  
  // 固定祝日チェック
  for (const [hMonth, hDay] of fixedHolidays) {
    if (month === hMonth && day === hDay) {
      return true;
    }
  }
  
  // 移動祝日の簡易判定（完全ではないが実用的）
  if (month === 1 && day >= 8 && day <= 14 && date.getDay() === 1) {
    return true; // 成人の日（1月第2月曜日）
  }
  if (month === 7 && day >= 15 && day <= 21 && date.getDay() === 1) {
    return true; // 海の日（7月第3月曜日）
  }
  if (month === 9 && day >= 15 && day <= 21 && date.getDay() === 1) {
    return true; // 敬老の日（9月第3月曜日）
  }
  if (month === 10 && day >= 8 && day <= 14 && date.getDay() === 1) {
    return true; // スポーツの日（10月第2月曜日）
  }
  
  return false;
}

// 60日分申請データ生成
function generateApplicationsFor60Days(startDate) {
  console.log(`📅 ${startDate.toISOString().split('T')[0]} から${DAYS_TO_GENERATE}日間の申請データ生成中...`);
  
  const applications = [];
  const responsibilities = [];
  
  for (let dayOffset = 0; dayOffset < DAYS_TO_GENERATE; dayOffset++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + dayOffset);
    
    const dayOfWeek = date.getDay(); // 0=日曜日, 6=土曜日
    const dateStr = date.toISOString().split('T')[0];
    
    // 日曜日と祝日はスキップ
    if (dayOfWeek === 0 || isHoliday(date)) {
      continue;
    }
    
    // 平日の申請生成
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      for (const pattern of WEEKDAY_PATTERNS) {
        const selectedStaff = selectRandomStaff(pattern.rate);
        
        for (const staffId of selectedStaff) {
          const preset = SYSTEM_PRESETS[pattern.presetId];
          const schedulesWithMemo = preset.schedules.map(schedule => ({
            ...schedule,
            memo: `月次プランナー: ${preset.name}|presetId:${pattern.presetId}`
          }));
          
          applications.push({
            staffId: staffId,
            date: dateStr,
            presetId: pattern.presetId,
            presetName: preset.name,
            schedules: schedulesWithMemo
          });
        }
      }
      
      // 平日の担当設定（FAX・件名チェック）
      if (Math.random() < 0.8) { // 80%の確率で担当設定
        responsibilities.push({
          staffId: getRandomStaffId(),
          date: dateStr,
          responsibilities: ['FAX当番']
        });
      }
      
      if (Math.random() < 0.8) { // 80%の確率で担当設定
        responsibilities.push({
          staffId: getRandomStaffId(),
          date: dateStr,
          responsibilities: ['件名チェック担当']
        });
      }
    }
    
    // 土曜日の申請生成
    if (dayOfWeek === 6) {
      for (const pattern of SATURDAY_PATTERNS) {
        const selectedStaff = selectRandomStaff(pattern.rate);
        
        for (const staffId of selectedStaff) {
          const preset = SYSTEM_PRESETS[pattern.presetId];
          const schedulesWithMemo = preset.schedules.map(schedule => ({
            ...schedule,
            memo: `月次プランナー: ${preset.name}|presetId:${pattern.presetId}`
          }));
          
          applications.push({
            staffId: staffId,
            date: dateStr,
            presetId: pattern.presetId,
            presetName: preset.name,
            schedules: schedulesWithMemo
          });
        }
      }
    }
  }
  
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + DAYS_TO_GENERATE - 1);
  
  console.log(`✅ ${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}: 申請${applications.length}件、担当設定${responsibilities.length}件生成完了`);
  
  return { applications, responsibilities, startDate, endDate };
}

// ランダムスタッフ選択
function selectRandomStaff(count) {
  const available = [];
  
  // 利用可能なスタッフIDリスト作成
  for (let id = STAFF_ID_RANGE.min; id <= STAFF_ID_RANGE.max; id++) {
    available.push(id);
  }
  
  // シャッフル
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  
  // 指定数を選択
  return available.slice(0, Math.min(count, available.length));
}

// ランダムスタッフID取得
function getRandomStaffId() {
  return STAFF_ID_RANGE.min + Math.floor(Math.random() * TOTAL_STAFF);
}

// メイン実行関数
function main() {
  console.log('🚀 ポートフォリオ用60日分申請データ生成開始（50人版・動的日付）...');
  console.log(`👥 対象スタッフ: ID ${STAFF_ID_RANGE.min}-${STAFF_ID_RANGE.max} (${TOTAL_STAFF}人)`);
  
  // 今日を起点とした60日間
  const startDate = new Date();
  
  // 60日分データ生成
  const data = generateApplicationsFor60Days(startDate);
  
  // ファイル名生成（YYYYMMDD形式）
  const startDateStr = startDate.toISOString().split('T')[0].replace(/-/g, '');
  const fileName = `demo_data_${startDateStr}_60days.json`;
  
  // ファイル出力
  fs.writeFileSync(fileName, JSON.stringify(data, null, 2));
  console.log(`📄 ${fileName} 作成完了`);
  
  // 統計出力
  console.log('\n📊 生成統計:');
  console.log(`- 期間: ${data.startDate.toISOString().split('T')[0]} - ${data.endDate.toISOString().split('T')[0]} (${DAYS_TO_GENERATE}日間)`);
  console.log(`- 申請: ${data.applications.length}件`);
  console.log(`- 担当設定: ${data.responsibilities.length}件`);
  console.log(`- 1日平均申請数: ${(data.applications.length / DAYS_TO_GENERATE).toFixed(1)}件`);
  
  console.log('\n🎉 ポートフォリオ用60日分申請データ生成完了！');
  console.log('📋 次のステップ: register_portfolio_pending_60days.js で投入してください');
  
  return { fileName, ...data };
}

if (require.main === module) {
  main();
}

module.exports = { main, generateApplicationsFor60Days };