// 現在の曜日判定問題をデバッグ

console.log('=== 曜日判定デバッグ ===');

const testDate = '2025-06-23'; // 月曜日

// 現在の方法（問題あり）
const utcDate = new Date(testDate + 'T00:00:00.000Z');
console.log(`UTC方式: ${testDate} → ${utcDate.toISOString()} → 曜日: ${utcDate.getDay()}`);

// 正しいJST方式
const jstDate = new Date(testDate + 'T00:00:00+09:00');
console.log(`JST方式: ${testDate} → ${jstDate.toISOString()} → 曜日: ${jstDate.getDay()}`);

// 別の正しい方式（Dateコンストラクタで直接指定）
const [year, month, day] = testDate.split('-').map(Number);
const localDate = new Date(year, month - 1, day); // monthは0ベース
console.log(`Local方式: ${testDate} → ${localDate.toISOString()} → 曜日: ${localDate.getDay()}`);

// 曜日の意味
const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
console.log('\n曜日番号の意味:');
[0,1,2,3,4,5,6].forEach(i => console.log(`${i}: ${dayNames[i]}`));

console.log('\n=== 2025-06-23は月曜日のはず ===');
console.log(`UTC方式の曜日: ${dayNames[utcDate.getDay()]}`);
console.log(`JST方式の曜日: ${dayNames[jstDate.getDay()]}`);
console.log(`Local方式の曜日: ${dayNames[localDate.getDay()]}`);

// テスト用：いくつかの日付で確認
console.log('\n=== 週末の確認 ===');
['2025-06-21', '2025-06-22', '2025-06-23'].forEach(date => {
  const utc = new Date(date + 'T00:00:00.000Z');
  const [y, m, d] = date.split('-').map(Number);
  const local = new Date(y, m - 1, d);
  console.log(`${date}: UTC曜日=${dayNames[utc.getDay()]}, Local曜日=${dayNames[local.getDay()]}`);
});