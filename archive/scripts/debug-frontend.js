// フロントエンドでのデータ処理をテスト
const testSchedule = {
  "id": 457,
  "staffId": 466,
  "status": "Online",
  "start": "2025-06-23T09:00:00.000Z",
  "end": "2025-06-23T18:00:00.000Z",
  "memo": null,
  "layer": "contract",
  "canMove": false
};

console.log('=== フロントエンドデータ処理テスト ===');
console.log('Original:', testSchedule);

// 現在のフロントエンド処理をシミュレート
const start = new Date(testSchedule.start);
const end = new Date(testSchedule.end);

console.log('Date objects:');
console.log('start:', start.toISOString());
console.log('end:', end.toISOString());

// 修正後の処理
const startJST = start.getUTCHours() + start.getUTCMinutes() / 60;
const endJST = end.getUTCHours() + end.getUTCMinutes() / 60;

console.log('Converted for display:');
console.log('startJST:', startJST, '(should be 9.0)');
console.log('endJST:', endJST, '(should be 18.0)');

// タイムライン表示範囲チェック (8:00-21:00)
console.log('Display range check:');
console.log('In range?', startJST >= 8 && endJST <= 21);