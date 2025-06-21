// フロントエンド時刻変換をテスト

console.log('=== フロントエンド変換テスト ===');

// API応答をシミュレート
const apiResponse = {
  staffId: 466,
  status: "Online", 
  start: "2025-06-23T00:00:00.000Z",
  end: "2025-06-23T09:00:00.000Z"
};

console.log('API応答:', apiResponse);

// フロントエンドでの変換
const start = new Date(apiResponse.start);
const end = new Date(apiResponse.end);

console.log('\nDate objects:');
console.log('start:', start.toISOString());
console.log('end:', end.toISOString());

const startJST = start.getUTCHours() + start.getUTCMinutes() / 60;
const endJST = end.getUTCHours() + end.getUTCMinutes() / 60;

console.log('\n変換結果:');
console.log(`startJST: ${startJST} (期待値: 9)`);
console.log(`endJST: ${endJST} (期待値: 18)`);

// より詳細な確認
console.log('\n詳細確認:');
console.log(`start.getUTCHours(): ${start.getUTCHours()}`);
console.log(`start.getUTCMinutes(): ${start.getUTCMinutes()}`);
console.log(`end.getUTCHours(): ${end.getUTCHours()}`);
console.log(`end.getUTCMinutes(): ${end.getUTCMinutes()}`);

// JST表示時刻の逆算確認
console.log('\nJST表示時刻の逆算:');
console.log(`UTC 0:00 → JST ${0 + 9}:00`);
console.log(`UTC 9:00 → JST ${9 + 9}:00`);