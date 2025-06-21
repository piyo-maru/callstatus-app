// 修正されたフロントエンド変換をテスト

console.log('=== 修正されたフロントエンド変換テスト ===');

// API応答をシミュレート（月曜日）
const mondayResponse = {
  staffId: 466,
  status: "Online", 
  start: "2025-06-23T00:00:00.000Z", // UTC 0:00 = JST 9:00
  end: "2025-06-23T09:00:00.000Z"     // UTC 9:00 = JST 18:00
};

console.log('月曜日のAPI応答:', mondayResponse);

// 修正されたフロントエンド変換
const start = new Date(mondayResponse.start);
const end = new Date(mondayResponse.end);

const startJST = (start.getUTCHours() + start.getUTCMinutes() / 60 + 9) % 24;
const endJST = (end.getUTCHours() + end.getUTCMinutes() / 60 + 9) % 24;

console.log(`\n月曜日の変換結果:`);
console.log(`startJST: ${startJST} (期待値: 9)`);
console.log(`endJST: ${endJST} (期待値: 18)`);

// 土曜日の契約スケジュールが表示されないことを確認
console.log('\n=== 土曜日の確認 ===');

// 土曜日の契約には勤務時間が設定されていないはず
console.log('土曜日は契約に勤務時間が設定されていないため、スケジュールが生成されないはず');

// 日付別の曜日確認
const testDates = [
  '2025-06-21', // 土曜日
  '2025-06-22', // 日曜日 
  '2025-06-23', // 月曜日
];

testDates.forEach(dateStr => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dayName = ['日','月','火','水','木','金','土'][date.getDay()];
  const dayCode = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()];
  console.log(`${dateStr}: ${dayName}曜日 (${dayCode})`);
});