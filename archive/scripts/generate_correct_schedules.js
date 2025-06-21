// 正しい時刻処理での全スタッフ平日スケジュール一括登録スクリプト
// JST時刻をそのまま保存（UTC変換しない）

const staffIds = [544, 545, 546, 547, 548, 549, 550, 551, 552, 553, 554, 555, 556, 557, 558];

// 今週の平日日付を生成（2025-06-16〜2025-06-20）
const weekdays = [
  '2025-06-16', // 月曜日
  '2025-06-17', // 火曜日  
  '2025-06-18', // 水曜日
  '2025-06-19', // 木曜日
  '2025-06-20'  // 金曜日
];

// JST時刻をJSTタイムゾーン付きで保存する関数
function createJstDateTime(dateStr, timeStr) {
  // JST時刻をJSTタイムゾーン（+09:00）で明示的に保存
  // フロントエンドでブラウザが正しくJST時刻として解釈する
  const iso = dateStr + 'T' + timeStr + ':00.000+09:00';
  return iso;
}

// 日付をISO形式に変換
function createJstDate(dateStr) {
  return dateStr + 'T00:00:00.000+09:00';
}

// MonthlySchedule挿入用のSQLを生成
let insertStatements = [];

staffIds.forEach(staffId => {
  weekdays.forEach(dateStr => {
    // 1. 09:00-18:00 Online スケジュール
    const onlineStart = createJstDateTime(dateStr, '09:00');
    const onlineEnd = createJstDateTime(dateStr, '18:00');
    const scheduleDate = createJstDate(dateStr);
    
    insertStatements.push(
      `INSERT INTO "MonthlySchedule" ("staffId", "date", "status", "start", "end", "source", "updatedAt") VALUES (${staffId}, '${scheduleDate}', 'online', '${onlineStart}', '${onlineEnd}', 'system_generated', NOW());`
    );
    
    // 2. 12:00-13:00 Break スケジュール
    const breakStart = createJstDateTime(dateStr, '12:00');
    const breakEnd = createJstDateTime(dateStr, '13:00');
    
    insertStatements.push(
      `INSERT INTO "MonthlySchedule" ("staffId", "date", "status", "start", "end", "source", "updatedAt") VALUES (${staffId}, '${scheduleDate}', 'break', '${breakStart}', '${breakEnd}', 'system_generated', NOW());`
    );
  });
});

// SQLファイルとして出力
console.log('-- 正しい時刻処理での全スタッフ平日スケジュール一括登録SQL');
console.log('-- JST時刻をそのまま保存（UTC変換なし）');
console.log('-- JST 09:00-18:00 Online + 12:00-13:00 Break');
console.log('');
insertStatements.forEach(sql => console.log(sql));
console.log('');
console.log(`-- 合計 ${insertStatements.length} 件のスケジュールを登録`);

// 時刻確認用のテストデータも出力
console.log('');
console.log('-- 時刻確認用テストデータ:');
console.log(`-- Online: ${createJstDateTime('2025-06-18', '09:00')} ～ ${createJstDateTime('2025-06-18', '18:00')}`);
console.log(`-- Break:  ${createJstDateTime('2025-06-18', '12:00')} ～ ${createJstDateTime('2025-06-18', '13:00')}`);