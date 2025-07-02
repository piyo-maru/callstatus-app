const fs = require('fs');

// 拡張マッピング定義
const enhancedMapping = {
  '全休': 'full-day-off',
  '夏休': 'full-day-off',
  'ドック休': 'full-day-off',
  '振休': 'full-day-off',
  '12:00退社': 'part-time-employee',
  '13:00退社': 'part-time-employee',
  '14:00退社': 'part-time-employee',
  '15:00退社': 'part-time-employee',
  '16:00退社': 'part-time-employee',
  '17:00退社': 'part-time-employee',
  '18:00退社': 'part-time-employee',
  '10:00出社': 'afternoon-off',
  '11:00出社': 'afternoon-off',
  '13:00出社': 'afternoon-off',
  '14:00出社': 'afternoon-off',
  '16:00出社': 'afternoon-off',
  '9:30出社': 'afternoon-off',
  '10:30出社': 'afternoon-off',
  '出張': 'training',
  'チェック': 'training',
  '在宅': 'remote-full-time',
  '振出': 'full-time-employee',
  '通院後出社': 'afternoon-off',
  '11:30退社': 'morning-off',
  '15:50退社': 'part-time-employee',
  '15:45退社': 'part-time-employee',
  '14:30退社': 'part-time-employee',
  '15:30退社': 'part-time-employee',
  'ドック': 'training', // 健康診断関連
};

// プリセットIDから具体的なスケジュール配列に変換
function getSchedulesFromPresetId(presetId) {
  const presetSchedules = {
    'full-time-employee': [
      { status: '出社', startTime: 9, endTime: 12, memo: '' },
      { status: '休憩', startTime: 12, endTime: 13, memo: '' },
      { status: '出社', startTime: 13, endTime: 18, memo: '' }
    ],
    'part-time-employee': [
      { status: '出社', startTime: 9, endTime: 12, memo: '' },
      { status: '休憩', startTime: 12, endTime: 13, memo: '' },
      { status: '出社', startTime: 13, endTime: 16, memo: '' }
    ],
    'remote-full-time': [
      { status: 'リモート', startTime: 9, endTime: 12, memo: '' },
      { status: '休憩', startTime: 12, endTime: 13, memo: '' },
      { status: 'リモート', startTime: 13, endTime: 18, memo: '' }
    ],
    'remote-part-time': [
      { status: 'リモート', startTime: 9, endTime: 12, memo: '' },
      { status: '休憩', startTime: 12, endTime: 13, memo: '' },
      { status: 'リモート', startTime: 13, endTime: 16, memo: '' }
    ],
    'full-day-off': [
      { status: '休暇', startTime: 9, endTime: 18, memo: '終日休暇' }
    ],
    'sudden-off': [
      { status: '休暇', startTime: 9, endTime: 18, memo: '突発休' }
    ],
    'morning-off': [
      { status: '休暇', startTime: 9, endTime: 13, memo: '午前休' }
    ],
    'afternoon-off': [
      { status: '休暇', startTime: 13, endTime: 18, memo: '午後休' }
    ],
    'lunch-break': [
      { status: '休憩', startTime: 12, endTime: 13, memo: '昼休憩' }
    ],
    'night-duty': [
      { status: '夜間勤務', startTime: 18, endTime: 21, memo: '夜間担当' }
    ],
    'night-duty-extended': [
      { status: '夜間勤務', startTime: 17, endTime: 21, memo: '夜間担当(延長)' }
    ],
    'meeting-block': [
      { status: '会議', startTime: 14, endTime: 15, memo: '定例会議' }
    ],
    'training': [
      { status: '研修', startTime: 10, endTime: 16, memo: '研修・出張' }
    ]
  };
  
  return presetSchedules[presetId] || [
    { status: '出社', startTime: 9, endTime: 18, memo: 'デフォルト' }
  ];
}

// スタッフ名マッピング（既存）
const staffNameToIdMapping = {
  '清水美月': 238, '山田真由美': 239, '山口一郎': 240, '伊藤葵': 241, '佐々木一郎': 242,
  '伊藤美優': 243, '井上悠人': 244, '佐々木葵': 245, '清水真由美': 246, '木村千尋': 247,
  '田中拓海': 248, '井上直樹': 249, '渡辺真由美': 250, '佐藤健太': 251, '佐々木健太': 252,
  '清水一郎': 253, '清水千尋': 254, '山口葵': 255, '小林彩香': 256, '山口優斗': 257,
  '佐藤結衣': 258, '田中美優': 259, '山田葵': 260, '佐々木健一': 261, '加藤悠人': 262,
  '加藤健一': 263, '山田健一': 264, '山本千尋': 265, '吉田悠人': 266, '松本直樹': 267,
  '林直樹': 268, '小林優斗': 269, '高橋一郎': 270, '加藤太郎': 271, '伊藤美月': 272,
  '井上愛': 273, '山本真由美': 274, '吉田颯太': 275, '高橋悠人': 276, '渡辺健太': 277
};

// CSVデータから拡張デモデータを生成
function generateEnhancedDemoData() {
  const csvContent = fs.readFileSync('artifacts/07_plan_sample_utf8.csv', 'utf8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  // 日付行（2行目）を解析
  const dateLine = lines[1];
  const days = dateLine.split(',');
  
  const enhancedSchedules = [];
  const staffNames = Object.keys(staffNameToIdMapping);
  
  // 各行（スタッフ）を処理
  lines.slice(2).forEach((line, staffIndex) => {
    if (!line.trim()) return;
    
    const values = line.split(',');
    const staffName = staffNames[staffIndex % staffNames.length];
    const staffId = staffNameToIdMapping[staffName];
    
    values.forEach((value, dayIndex) => {
      const trimmedValue = value.trim();
      
      // マッピング対象の値のみ処理
      if (trimmedValue && enhancedMapping[trimmedValue]) {
        const presetId = enhancedMapping[trimmedValue];
        const schedules = getSchedulesFromPresetId(presetId);
        
        // 7月の日付を計算
        const day = dayIndex + 1;
        if (day <= 31) {
          const date = `2025-07-${day.toString().padStart(2, '0')}`;
          
          // 主要スケジュールを使用
          const mainSchedule = schedules[0];
          
          enhancedSchedules.push({
            staffName: staffName,
            staffId: staffId,
            date: date,
            csvValue: trimmedValue,
            presetId: presetId,
            status: mainSchedule.status,
            startTime: mainSchedule.startTime,
            endTime: mainSchedule.endTime,
            memo: `${trimmedValue} (${presetId})`
          });
        }
      }
    });
  });
  
  console.log(`=== 拡張デモデータ生成結果 ===`);
  console.log(`生成されたスケジュール数: ${enhancedSchedules.length}`);
  
  // ステータス別集計
  const statusCount = {};
  const presetCount = {};
  enhancedSchedules.forEach(schedule => {
    statusCount[schedule.status] = (statusCount[schedule.status] || 0) + 1;
    presetCount[schedule.presetId] = (presetCount[schedule.presetId] || 0) + 1;
  });
  
  console.log('\n=== ステータス別集計 ===');
  Object.entries(statusCount).forEach(([status, count]) => {
    console.log(`${status}: ${count}件`);
  });
  
  console.log('\n=== プリセット別集計 ===');
  Object.entries(presetCount).forEach(([preset, count]) => {
    console.log(`${preset}: ${count}件`);
  });
  
  // ファイルに保存
  fs.writeFileSync('artifacts/enhanced_demo_schedules_july_2025.json', JSON.stringify(enhancedSchedules, null, 2));
  console.log('\n✅ 拡張デモデータを保存: artifacts/enhanced_demo_schedules_july_2025.json');
  
  return enhancedSchedules;
}

// 実行
generateEnhancedDemoData();