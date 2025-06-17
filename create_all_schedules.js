const fs = require('fs');
const https = require('http');

async function createSchedules() {
  // スタッフ情報を取得
  const staffResponse = await new Promise((resolve, reject) => {
    const req = https.request('http://localhost:3002/api/staff', { method: 'GET' }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.end();
  });

  console.log(`Found ${staffResponse.length} staff members`);

  // 日付設定
  const dates = ['2025-06-17', '2025-06-18'];

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
    staffResponse.forEach(staff => {
      const random = Math.random();
      let pattern;
      
      // パターン選択（確率ベース）
      if (random < 0.15) {
        pattern = patterns.off; // 15% Off
      } else if (random < 0.2) {
        pattern = patterns.nightDuty; // 5% Night Duty
      } else if (random < 0.35) {
        pattern = patterns.training; // 15% Training
      } else if (random < 0.5) {
        pattern = patterns.meeting; // 15% Meeting
      } else {
        pattern = patterns.normal; // 50% Normal
      }
      
      // パターンに基づいてスケジュール生成
      pattern.forEach(schedule => {
        schedules.push({
          staffId: staff.id,
          status: schedule.status,
          start: createDateTime(date, schedule.start),
          end: createDateTime(date, schedule.end)
        });
      });
    });
  });

  console.log(`Created ${schedules.length} schedules for ${staffResponse.length} staff over ${dates.length} days`);

  // APIに一括送信
  for (let i = 0; i < schedules.length; i += 50) { // 50件ずつ送信
    const batch = schedules.slice(i, i + 50);
    
    for (const schedule of batch) {
      try {
        await new Promise((resolve, reject) => {
          const postData = JSON.stringify(schedule);
          const req = https.request('http://localhost:3002/api/schedules', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData)
            }
          }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              if (res.statusCode === 201) {
                resolve(JSON.parse(data));
              } else {
                reject(new Error(`HTTP ${res.statusCode}: ${data}`));
              }
            });
          });
          req.on('error', reject);
          req.write(postData);
          req.end();
        });
        
        if ((i + batch.indexOf(schedule)) % 25 === 0) {
          console.log(`Created ${i + batch.indexOf(schedule) + 1}/${schedules.length} schedules`);
        }
      } catch (error) {
        console.error(`Error creating schedule for staff ${schedule.staffId}:`, error.message);
      }
    }
  }

  console.log('All schedules created successfully!');
}

createSchedules().catch(console.error);