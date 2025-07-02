const fs = require('fs');

// 拡張マッピング定義（既存）
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
  'ドック': 'training',
};

// プリセットIDから具体的なスケジュール配列に変換
function getSchedulesFromPresetId(presetId) {
  const presetSchedules = {
    'full-time-employee': [{ status: 'online', startTime: 9, endTime: 18, memo: '通常勤務' }],
    'part-time-employee': [{ status: 'online', startTime: 9, endTime: 16, memo: '早退' }],
    'remote-full-time': [{ status: 'remote', startTime: 9, endTime: 18, memo: '在宅勤務' }],
    'full-day-off': [{ status: 'off', startTime: 9, endTime: 18, memo: '終日休暇' }],
    'morning-off': [{ status: 'off', startTime: 9, endTime: 13, memo: '午前休' }],
    'afternoon-off': [{ status: 'off', startTime: 13, endTime: 18, memo: '午後休' }],
    'training': [{ status: 'training', startTime: 10, endTime: 16, memo: '研修・出張' }]
  };
  
  return presetSchedules[presetId] || [{ status: 'online', startTime: 9, endTime: 18, memo: 'デフォルト' }];
}

async function createCorrectDemoMapping() {
  try {
    console.log('=== 正しいデモデータマッピング開始 ===');
    
    // 1. 月次プランナーのスタッフ一覧を取得（上から順番）
    const staffResponse = await fetch('http://localhost:3002/api/staff');
    const allStaff = await staffResponse.json();
    const activeStaff = allStaff.filter(staff => staff.isActive !== false).sort((a, b) => a.id - b.id);
    console.log(`対象スタッフ数: ${activeStaff.length}人`);
    
    // 2. CSVデータを読み込み
    const csvContent = fs.readFileSync('artifacts/07_plan_sample_utf8.csv', 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const csvDataLines = lines.slice(2); // 3行目から
    console.log(`CSVデータ行数: ${csvDataLines.length}行`);
    
    // 3. 正しいマッピング: CSV行 → スタッフ順
    const correctSchedules = [];
    
    activeStaff.forEach((staff, staffIndex) => {
      if (staffIndex < csvDataLines.length) {
        // CSVデータがある場合
        const csvLine = csvDataLines[staffIndex];
        const values = csvLine.split(',');
        
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
              
              const mainSchedule = schedules[0];
              
              correctSchedules.push({
                staffId: staff.id,
                staffName: staff.name,
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
      }
      // CSVデータがない場合はスキップ（空欄）
    });
    
    console.log(`\n=== 正しいマッピング結果 ===`);
    console.log(`生成されたスケジュール数: ${correctSchedules.length}件`);
    console.log(`対象スタッフ数: ${new Set(correctSchedules.map(s => s.staffId)).size}人`);
    
    // ステータス別集計
    const statusCount = {};
    correctSchedules.forEach(schedule => {
      statusCount[schedule.status] = (statusCount[schedule.status] || 0) + 1;
    });
    
    console.log('\n=== ステータス別集計 ===');
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`${status}: ${count}件`);
    });
    
    // スタッフ別の予定数統計
    const staffScheduleCount = {};
    correctSchedules.forEach(schedule => {
      staffScheduleCount[schedule.staffId] = (staffScheduleCount[schedule.staffId] || 0) + 1;
    });
    
    const scheduleCounts = Object.values(staffScheduleCount);
    console.log('\n=== スタッフ別予定数統計 ===');
    console.log(`平均予定数/人: ${Math.round(scheduleCounts.reduce((a, b) => a + b, 0) / scheduleCounts.length * 100) / 100}件`);
    console.log(`最大予定数: ${Math.max(...scheduleCounts)}件/人`);
    console.log(`最小予定数: ${Math.min(...scheduleCounts)}件/人`);
    console.log(`予定ありスタッフ: ${scheduleCounts.length}人`);
    console.log(`予定なしスタッフ: ${activeStaff.length - scheduleCounts.length}人`);
    
    // ファイルに保存
    fs.writeFileSync('artifacts/correct_demo_schedules_july_2025.json', JSON.stringify(correctSchedules, null, 2));
    console.log('\n✅ 正しいデモデータを保存: artifacts/correct_demo_schedules_july_2025.json');
    
    return correctSchedules;
    
  } catch (error) {
    console.error('正しいマッピング生成エラー:', error.message);
    return [];
  }
}

createCorrectDemoMapping();