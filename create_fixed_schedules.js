const fs = require('fs');
const http = require('http');

async function createSchedules() {
  console.log('Fetching staff information...');
  
  // スタッフ情報を取得
  const staffResponse = await new Promise((resolve, reject) => {
    const req = http.request('http://localhost:3002/api/staff', { method: 'GET' }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });

  console.log(`Found ${staffResponse.length} staff members (IDs: ${Math.min(...staffResponse.map(s => s.id))}-${Math.max(...staffResponse.map(s => s.id))})`);

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

  // スケジュール作成
  let totalSchedules = 0;
  let totalErrors = 0;

  for (const date of dates) {
    console.log(`Creating schedules for ${date}...`);
    
    for (let i = 0; i < staffResponse.length; i++) {
      const staff = staffResponse[i];
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
      for (const schedule of pattern) {
        try {
          // バックエンドが期待する形式: start/endは数値（時間）、dateは文字列
          const scheduleData = {
            staffId: staff.id,
            status: schedule.status,
            start: schedule.start,  // 数値（時間）
            end: schedule.end,      // 数値（時間）
            date: date              // 日付文字列
          };

          await new Promise((resolve, reject) => {
            const postData = JSON.stringify(scheduleData);
            const req = http.request('http://localhost:3002/api/schedules', {
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
                  totalSchedules++;
                  resolve();
                } else {
                  reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
              });
            });
            req.on('error', reject);
            req.write(postData);
            req.end();
          });
          
          // 進捗表示
          if (totalSchedules % 100 === 0) {
            console.log(`Created ${totalSchedules} schedules...`);
          }
          
        } catch (error) {
          totalErrors++;
          if (totalErrors <= 5) { // 最初の5個のエラーのみ表示
            console.error(`Error creating schedule for staff ${staff.id} (${staff.name}):`, error.message);
          }
        }
      }
    }
  }

  console.log(`\nCompleted! Created ${totalSchedules} schedules with ${totalErrors} errors`);
  console.log(`Processed ${staffResponse.length} staff over ${dates.length} days`);
}

createSchedules().catch(console.error);