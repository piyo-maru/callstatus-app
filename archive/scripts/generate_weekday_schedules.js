// 全スタッフの平日スケジュール一括登録スクリプト
// 09:00-18:00 Online, 12:00-13:00 Break を JST で生成

const staffIds = [544, 545, 546, 547, 548, 549, 550, 551, 552, 553, 554, 555, 556, 557, 558];

// 今週の平日日付を生成（2025-06-16〜2025-06-20）
const weekdays = [
  '2025-06-16', // 月曜日
  '2025-06-17', // 火曜日  
  '2025-06-18', // 水曜日
  '2025-06-19', // 木曜日
  '2025-06-20'  // 金曜日
];

// JST時刻をUTCに変換する関数
function jstToUtc(dateStr, timeStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  
  // JST時刻をUTCで直接作成（データベースにはUTCとして保存）
  // JST 09:00 → UTC 00:00 として保存し、フロントエンドでJST 09:00として表示
  const utcDate = new Date(Date.UTC(year, month - 1, day, hour - 9, minute, 0, 0));
  
  return utcDate.toISOString();
}

// 日付をUTC 00:00に変換する関数
function dateToUtc(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)).toISOString();
}

// MonthlySchedule挿入用のSQLを生成
let insertStatements = [];

staffIds.forEach(staffId => {
  weekdays.forEach(dateStr => {
    // 1. 09:00-18:00 Online スケジュール
    const onlineStart = jstToUtc(dateStr, '09:00');
    const onlineEnd = jstToUtc(dateStr, '18:00');
    const scheduleDate = dateToUtc(dateStr);
    
    insertStatements.push(
      `INSERT INTO "MonthlySchedule" ("staffId", "date", "status", "start", "end", "source", "updatedAt") VALUES (${staffId}, '${scheduleDate}', 'online', '${onlineStart}', '${onlineEnd}', 'system_generated', NOW());`
    );
    
    // 2. 12:00-13:00 Break スケジュール
    const breakStart = jstToUtc(dateStr, '12:00');
    const breakEnd = jstToUtc(dateStr, '13:00');
    
    insertStatements.push(
      `INSERT INTO "MonthlySchedule" ("staffId", "date", "status", "start", "end", "source", "updatedAt") VALUES (${staffId}, '${scheduleDate}', 'break', '${breakStart}', '${breakEnd}', 'system_generated', NOW());`
    );
  });
});

// SQLファイルとして出力
console.log('-- 全スタッフ平日スケジュール一括登録SQL');
console.log('-- JST 09:00-18:00 Online + 12:00-13:00 Break');
console.log('');
insertStatements.forEach(sql => console.log(sql));
console.log('');
console.log(`-- 合計 ${insertStatements.length} 件のスケジュールを登録`);