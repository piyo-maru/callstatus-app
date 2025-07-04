// 7月3日-31日期間デモデータ生成スクリプト
const fs = require('fs');

// デモデータ配分設定（実際のWebアプリプリセットID使用）
const DEMO_CONFIG = {
  applications: {
    '休暇': { count: 25, presetId: 'paid-leave', presetName: '休暇' },
    '午前休': { count: 5, presetId: 'custom-1751459171314', presetName: '午前休' },
    '午後休': { count: 7, presetId: 'custom-1751459196532', presetName: '午後休' },
    '在宅勤務（出向社員）': { count: 5, presetId: 'custom-1751466304586', presetName: '在宅勤務（出向社員）' },
    '夜間担当': { count: 6, presetId: 'night-duty', presetName: '夜間担当' },
    '振出（出向社員）': { count: 6, presetId: 'custom-1751466327183', presetName: '振出（出向社員）' }
  },
  responsibilities: {
    'FAX当番': { count: 1, description: 'FAX当番' },
    '件名チェック担当': { count: 1, description: '件名チェック担当' }
  }
};

// システムプリセット定義（実際のWebアプリプリセットに準拠・手動登録形式統一）
const SYSTEM_PRESETS = {
  'paid-leave': {
    name: '休暇',
    schedules: [{ status: 'off', start: 9, end: 18, memo: '月次プランナー: 休暇|presetId:paid-leave' }]
  },
  'custom-1751459171314': {
    name: '午前休',
    schedules: [{ status: 'off', start: 9, end: 14, memo: '月次プランナー: 午前休|presetId:custom-1751459171314' }]
  },
  'custom-1751459196532': {
    name: '午後休',
    schedules: [{ status: 'off', start: 13, end: 18, memo: '月次プランナー: 午後休|presetId:custom-1751459196532' }]
  },
  'custom-1751466304586': {
    name: '在宅勤務（出向社員）',
    schedules: [
      { status: 'remote', start: 9, end: 12, memo: '月次プランナー: 在宅勤務（出向社員）|presetId:custom-1751466304586' },
      { status: 'break', start: 12, end: 13, memo: '月次プランナー: 在宅勤務（出向社員）|presetId:custom-1751466304586' },
      { status: 'remote', start: 13, end: 18, memo: '月次プランナー: 在宅勤務（出向社員）|presetId:custom-1751466304586' }
    ]
  },
  'night-duty': {
    name: '夜間担当',
    schedules: [
      { status: 'off', start: 9, end: 12, memo: '月次プランナー: 夜間担当|presetId:night-duty' },
      { status: 'break', start: 17, end: 18, memo: '月次プランナー: 夜間担当|presetId:night-duty' },
      { status: 'night duty', start: 18, end: 21, memo: '月次プランナー: 夜間担当|presetId:night-duty' }
    ]
  },
  'custom-1751466327183': {
    name: '振出（出向社員）',
    schedules: [
      { status: '出社', start: 9, end: 12, memo: '月次プランナー: 振出（出向社員）|presetId:custom-1751466327183' },
      { status: 'break', start: 12, end: 13, memo: '月次プランナー: 振出（出向社員）|presetId:custom-1751466327183' },
      { status: 'online', start: 13, end: 18, memo: '月次プランナー: 振出（出向社員）|presetId:custom-1751466327183' }
    ]
  }
};

// 日付ユーティリティ
function getDateRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

function getWeekdaysOnly(dates) {
  return dates.filter(date => {
    const dayOfWeek = date.getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 5; // 月曜日-金曜日
  });
}

function getSaturdaysOnly(dates) {
  return dates.filter(date => date.getDay() === 6); // 土曜日
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// スタッフIDをランダムに選択（重複避け）
function selectRandomStaff(staffIds, count, usedStaffIds = new Set()) {
  const availableStaff = staffIds.filter(id => !usedStaffIds.has(id));
  
  if (availableStaff.length < count) {
    console.warn(`警告: 利用可能スタッフ数(${availableStaff.length})が必要数(${count})より少ないです`);
    return availableStaff.slice(0, count);
  }
  
  const selected = [];
  const shuffled = [...availableStaff].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < count; i++) {
    selected.push(shuffled[i]);
    usedStaffIds.add(shuffled[i]);
  }
  
  return selected;
}

// メイン生成関数
function generateDemoData() {
  console.log('🚀 7月3日-31日期間デモデータ生成開始...');
  
  // 期間設定
  const startDate = new Date('2025-07-03');
  const endDate = new Date('2025-07-31');
  const allDates = getDateRange(startDate, endDate);
  const weekdays = getWeekdaysOnly(allDates);
  const saturdays = getSaturdaysOnly(allDates);
  
  console.log(`📅 対象期間: ${formatDate(startDate)} - ${formatDate(endDate)}`);
  console.log(`📊 平日: ${weekdays.length}日, 土曜日: ${saturdays.length}日`);
  
  // スタッフID範囲（226-450の225人）
  const staffIds = Array.from({ length: 225 }, (_, i) => 226 + i);
  
  const applications = [];
  const responsibilities = [];
  
  // 申請予定生成
  console.log('\n📝 申請予定生成中...');
  
  // 平日申請予定（休暇、午前休、午後休、在宅勤務、夜間担当）
  for (const weekday of weekdays) {
    const dateStr = formatDate(weekday);
    const usedStaffIds = new Set();
    
    for (const [appType, config] of Object.entries(DEMO_CONFIG.applications)) {
      if (appType === '振出（出向社員）') continue; // 土曜日で処理
      
      const selectedStaff = selectRandomStaff(staffIds, config.count, usedStaffIds);
      const preset = SYSTEM_PRESETS[config.presetId];
      
      if (!preset) {
        console.warn(`警告: プリセットID '${config.presetId}' が見つかりません`);
        continue;
      }
      
      for (const staffId of selectedStaff) {
        applications.push({
          staffId,
          date: dateStr,
          presetId: config.presetId,
          presetName: config.presetName,
          schedules: preset.schedules.map(s => ({ ...s })) // ディープコピー
        });
      }
      
      console.log(`  ${appType}: ${selectedStaff.length}人 (${dateStr})`);
    }
  }
  
  // 土曜日申請予定（振出）
  for (const saturday of saturdays) {
    const dateStr = formatDate(saturday);
    const usedStaffIds = new Set();
    
    const config = DEMO_CONFIG.applications['振出（出向社員）'];
    const selectedStaff = selectRandomStaff(staffIds, config.count, usedStaffIds);
    const preset = SYSTEM_PRESETS[config.presetId];
    
    if (!preset) {
      console.warn(`警告: プリセットID '${config.presetId}' が見つかりません`);
      continue;
    }
    
    for (const staffId of selectedStaff) {
      applications.push({
        staffId,
        date: dateStr,
        presetId: config.presetId,
        presetName: config.presetName,
        schedules: preset.schedules.map(s => ({ ...s }))
      });
    }
    
    console.log(`  振出（出向社員）: ${selectedStaff.length}人 (${dateStr})`);
  }
  
  // 担当設定生成
  console.log('\n👥 担当設定生成中...');
  
  for (const weekday of weekdays) {
    const dateStr = formatDate(weekday);
    const usedStaffIds = new Set();
    
    for (const [respType, config] of Object.entries(DEMO_CONFIG.responsibilities)) {
      const selectedStaff = selectRandomStaff(staffIds, config.count, usedStaffIds);
      
      for (const staffId of selectedStaff) {
        responsibilities.push({
          staffId,
          date: dateStr,
          description: config.description,
          responsibilities: [config.description]
        });
      }
      
      console.log(`  ${respType}: ${selectedStaff.length}人 (${dateStr})`);
    }
  }
  
  const demoData = { applications, responsibilities };
  
  // ファイル保存
  fs.writeFileSync('demo_data_july_system_presets.json', JSON.stringify(demoData, null, 2));
  
  console.log('\n📊 生成結果:');
  console.log(`申請予定: ${applications.length}件`);
  console.log(`担当設定: ${responsibilities.length}件`);
  console.log(`合計: ${applications.length + responsibilities.length}件`);
  
  // 詳細統計
  const appStats = {};
  applications.forEach(app => {
    appStats[app.presetName] = (appStats[app.presetName] || 0) + 1;
  });
  
  console.log('\n📈 申請予定内訳:');
  Object.entries(appStats).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}件`);
  });
  
  const respStats = {};
  responsibilities.forEach(resp => {
    respStats[resp.description] = (respStats[resp.description] || 0) + 1;
  });
  
  console.log('\n📈 担当設定内訳:');
  Object.entries(respStats).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}件`);
  });
  
  console.log('\n✅ デモデータ生成完了: demo_data_july_system_presets.json');
  console.log('📝 次のステップ: node register_demo_pending_preset.js でPending API登録');
  
  return demoData;
}

// 実行
generateDemoData();