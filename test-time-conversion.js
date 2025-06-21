// 修正された時刻変換をテスト

function parseTimeToUtc(date, timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    // JST日付と時刻を組み合わせてJST Dateオブジェクトを作成
    const dateStr = date.toISOString().split('T')[0];
    const [year, month, day] = dateStr.split('-').map(Number);
    
    // JST時刻でDateオブジェクトを作成（ローカル時刻として）
    const jstDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
    
    // JST→UTC変換（-9時間）
    const utcDate = new Date(jstDate.getTime() - 9 * 60 * 60 * 1000);
    
    return utcDate;
}

console.log('=== 時刻変換テスト ===');

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

// 土曜日テスト
const saturdayDate = '2025-06-21';
const [satYear, satMonth, satDay] = saturdayDate.split('-').map(Number);
const satTargetDate = new Date(satYear, satMonth - 1, satDay);
console.log(`\n土曜日テスト: ${saturdayDate}`);
console.log(`曜日: ${['日','月','火','水','木','金','土'][satTargetDate.getDay()]}`);