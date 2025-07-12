#!/usr/bin/env node

/**
 * ポートフォリオ用2ヶ月分申請データ生成スクリプト（50人版）
 * 対象期間: 2025年8月・9月
 * 対象スタッフ: ID 234-283（50人）
 */

const fs = require('fs');

// 設定
const STAFF_ID_RANGE = { min: 234, max: 283 }; // 50人
const TOTAL_STAFF = STAFF_ID_RANGE.max - STAFF_ID_RANGE.min + 1;

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

// 祝日判定（簡易版）
function isHoliday(date) {
  const holidays_2025 = [
    '2025-08-11', // 山の日
    '2025-09-15', // 敬老の日  
    '2025-09-23', // 秋分の日
  ];
  return holidays_2025.includes(date.toISOString().split('T')[0]);
}

// 申請データ生成（単月）
function generateApplicationsForMonth(year, month) {
  console.log(`📅 ${year}年${month}月の申請データ生成中...`);
  
  const applications = [];
  const responsibilities = [];
  
  const daysInMonth = new Date(year, month, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
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
  
  console.log(`✅ ${year}年${month}月: 申請${applications.length}件、担当設定${responsibilities.length}件生成完了`);
  
  return { applications, responsibilities };
}

// ランダムスタッフ選択
function selectRandomStaff(count) {
  const selected = [];
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
  console.log('🚀 ポートフォリオ用2ヶ月分申請データ生成開始（50人版）...');
  console.log(`👥 対象スタッフ: ID ${STAFF_ID_RANGE.min}-${STAFF_ID_RANGE.max} (${TOTAL_STAFF}人)`);
  
  // 8月データ生成
  const augustData = generateApplicationsForMonth(2025, 8);
  fs.writeFileSync(
    'demo_data_august_2025_portfolio.json',
    JSON.stringify(augustData, null, 2)
  );
  console.log('📄 demo_data_august_2025_portfolio.json 作成完了');
  
  // 9月データ生成
  const septemberData = generateApplicationsForMonth(2025, 9);
  fs.writeFileSync(
    'demo_data_september_2025_portfolio.json',
    JSON.stringify(septemberData, null, 2)
  );
  console.log('📄 demo_data_september_2025_portfolio.json 作成完了');
  
  // 統計出力
  const totalApplications = augustData.applications.length + septemberData.applications.length;
  const totalResponsibilities = augustData.responsibilities.length + septemberData.responsibilities.length;
  
  console.log('\n📊 生成統計:');
  console.log(`- 8月申請: ${augustData.applications.length}件、担当設定: ${augustData.responsibilities.length}件`);
  console.log(`- 9月申請: ${septemberData.applications.length}件、担当設定: ${septemberData.responsibilities.length}件`);
  console.log(`- 合計申請: ${totalApplications}件、合計担当設定: ${totalResponsibilities}件`);
  
  console.log('\n🎉 ポートフォリオ用2ヶ月分申請データ生成完了！');
  console.log('📋 次のステップ: register_pending_applications_2025.js で投入してください');
}

if (require.main === module) {
  main();
}

module.exports = { main };