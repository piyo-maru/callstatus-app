const fs = require('fs');

// 日付設定
const dates = ['2025-06-17', '2025-06-18'];

// スタッフIDは1-3（現在の実際のスタッフ数）
const staffIds = Array.from({length: 3}, (_, i) => i + 1);

// スケジュールパターン
const patterns = {
  normal: [
    { status: 'Online', start: 9, end: 12 },
    { status: 'Break', start: 12, end: 13 },
    { status: 'Online', start: 13, end: 18 }
  ],
  training: [
    { status: 'Training', start: 9, end: 12 },
    { status: 'Break', start: 12, end: 13 },
    { status: 'Online', start: 13, end: 18 }
  ],
  meeting: [
    { status: 'Online', start: 9, end: 10 },
    { status: 'Meeting', start: 10, end: 12 },
    { status: 'Break', start: 12, end: 13 },
    { status: 'Online', start: 13, end: 18 }
  ],
  nightDuty: [
    { status: 'Online', start: 9, end: 12 },
    { status: 'Break', start: 12, end: 13 },
    { status: 'Online', start: 13, end: 18 },
    { status: 'Night Duty', start: 18, end: 21 }
  ],
  off: [
    { status: 'Off', start: 9, end: 18 }
  ]
};

// 時間を日付に変換する関数
function createDateTime(dateStr, hour) {
  const date = new Date(dateStr);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
}

// スケジュール作成
const schedules = [];

dates.forEach(date => {
  staffIds.forEach(staffId => {
    const random = Math.random();
    let pattern;
    
    // パターン選択（確率ベース）
    if (random < 0.1) {
      pattern = patterns.off; // 10% Off
    } else if (random < 0.15) {
      pattern = patterns.nightDuty; // 5% Night Duty
    } else if (random < 0.25) {
      pattern = patterns.training; // 10% Training
    } else if (random < 0.35) {
      pattern = patterns.meeting; // 10% Meeting
    } else {
      pattern = patterns.normal; // 65% Normal
    }
    
    // パターンに基づいてスケジュール生成
    pattern.forEach(schedule => {
      schedules.push({
        staffId: staffId,
        status: schedule.status,
        start: createDateTime(date, schedule.start),
        end: createDateTime(date, schedule.end)
      });
    });
  });
});

console.log(`Created ${schedules.length} schedules for ${staffIds.length} staff over ${dates.length} days`);

// JSON形式で出力
fs.writeFileSync('/root/callstatus-app/schedules_data.json', JSON.stringify(schedules, null, 2));
console.log('Schedules saved to schedules_data.json');