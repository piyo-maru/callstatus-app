// 修正された時刻変換をテスト（+09:00方式）

function parseTimeToUtc(date, timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    // JST日付を取得
    const dateStr = date.toISOString().split('T')[0];
    
    // JST時刻文字列を作成してUTCに変換
    const jstIsoString = `${dateStr}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00.000+09:00`;
    
    return new Date(jstIsoString);
}

console.log('=== 修正された時刻変換テスト ===');

// 2025-06-23（月曜日）の9:00-18:00を変換
const testDate = '2025-06-23';
const [year, month, day] = testDate.split('-').map(Number);
const targetDate = new Date(year, month - 1, day);

console.log(`対象日: ${testDate} (${targetDate.toISOString()})`);
console.log(`曜日: ${['日','月','火','水','木','金','土'][targetDate.getDay()]}`);

const start = parseTimeToUtc(targetDate, '09:00');
const end = parseTimeToUtc(targetDate, '18:00');

console.log(`\nJST 09:00 → UTC: ${start.toISOString()}`);
console.log(`JST 18:00 → UTC: ${end.toISOString()}`);

// フロントエンド側での変換（UTC→JST表示）
const startJST = start.getUTCHours() + start.getUTCMinutes() / 60;
const endJST = end.getUTCHours() + end.getUTCMinutes() / 60;

console.log(`\nフロントエンド表示:`);
console.log(`開始時刻: ${startJST} (期待値: 9)`);
console.log(`終了時刻: ${endJST} (期待値: 18)`);

// 各曜日での確認
console.log('\n=== 週の各曜日での確認 ===');
const weekDates = [
    '2025-06-21', // 土
    '2025-06-22', // 日  
    '2025-06-23', // 月
    '2025-06-24', // 火
];

weekDates.forEach(dateStr => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dayName = ['日','月','火','水','木','金','土'][date.getDay()];
    console.log(`${dateStr} (${dayName}曜日)`);
});