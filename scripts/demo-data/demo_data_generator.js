// 月次プランナーデモデータ生成スクリプト
// 2025年7月用のPending申請を225名分作成

const fs = require('fs');
const path = require('path');

// 月次プランナーで有効なプリセットのみ使用
const AVAILABLE_PRESETS = ['full-day-off', 'morning-off', 'afternoon-off'];

// CSVからプリセットへのマッピング（有効なプリセットのみ）
const presetMapping = {
  '全休': 'full-day-off',                  // 終日休み
  '振休': 'full-day-off',                  // 振替休日（終日休み扱い）
  '夏休': 'full-day-off',                  // 夏季休暇
  'ドック休': 'full-day-off',              // 健康診断休み
  '半休': 'morning-off',                   // 午前休（デフォルト）
  '午休': 'afternoon-off',                 // 午後休
  // 時間指定パターン
  '12:00後': 'afternoon-off',              // 午後休扱い
  '13:00出社': 'afternoon-off',            // 午後休扱い
  '15:00後': 'afternoon-off',              // 午後休扱い
  '11:00出社': 'afternoon-off',            // 午後休扱い
  '14:00出社': 'afternoon-off',            // 午後休扱い
  '10:30出社': 'afternoon-off',            // 午後休扱い
  '15:50後': 'afternoon-off',              // 午後休扱い
  '15:45後': 'afternoon-off',              // 午後休扱い
  '午前休': 'morning-off',                 // 午前休
  '午後休': 'afternoon-off',               // 午後休
};

// スタッフリスト（実際のシステムから取得）
const staffList = [
  '清水美月', '山田真由美', '山口一郎', '伊藤葵', '佐々木一郎', '伊藤美優', '井上悠人', '佐々木葵', '清水真由美', '木村千尋',
  '田中拓海', '井上直樹', '渡辺真由美', '佐藤健太', '佐々木健太', '清水一郎', '清水千尋', '山口葵', '小林彩香', '山口優斗',
  '佐藤結衣', '田中美優', '山田葵', '佐々木健一', '加藤悠人', '加藤健一', '山田健一', '山本千尋', '吉田悠人', '松本直樹',
  '林直樹', '小林優斗', '高橋一郎', '加藤太郎', '伊藤美月', '井上愛', '山本真由美', '吉田颯太', '高橋悠人', '渡辺健太',
  '松本美月', '斎藤太郎', '山口美咲', '佐々木彩香', '鈴木太郎', '鈴木悠人', '佐藤優斗', '田中千尋', '加藤彩香', '中村美咲',
  '伊藤一郎', '木村真由美', '松本結衣', '鈴木美月', '林結衣', '林健太', '伊藤優斗', '渡辺太郎', '佐藤拓海', '山田一郎',
  '林翔太', '小林真由美', '山田直樹', '井上颯太', '木村美月', '山田翔太', '佐藤花子', '鈴木美優', '佐々木拓海', '井上美咲',
  '渡辺拓海', '田中葵', '斎藤真由美', '渡辺花子', '斎藤花子', '小林拓海', '佐藤千尋', '斎藤一郎', '中村健一', '木村優斗',
  '山田美咲', '佐々木千尋', '木村一郎', '吉田優斗', '松本優斗', '山口美優', '木村悠人', '清水直樹', '木村結衣', '山田颯太',
  '木村翔太', '渡辺愛', '高橋拓海', '木村健太', '伊藤結衣', '松本拓海', '小林颯太', '山本美月', '小林悠人', '吉田太郎',
  '斎藤拓海', '井上美月', '松本颯太', '山口千尋', '山田拓海', '山口美月', '高橋美月', '佐々木美優', '高橋結衣', '林千尋',
  '林美咲', '清水葵', '佐藤太郎', '田中一郎', '加藤健太', '伊藤健一', '佐々木悠人', '清水悠人', '林彩香', '山本悠人',
  '加藤颯太', '田中結衣', '渡辺彩香', '木村健一', '加藤真由美', '山口花子'
];

// CSVデータ読み込み
function loadCSVData() {
  try {
    const csvPath = path.join(__dirname, 'artifacts/07_plan_sample_utf8.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n');
    
    // ヘッダー行をスキップして、データ行のみ取得
    const dataLines = lines.slice(2).filter(line => line.trim().length > 0);
    
    return dataLines.map(line => {
      const cells = line.split(',');
      return cells.slice(0, 31); // 31日分のデータのみ
    });
  } catch (error) {
    console.error('CSVファイルの読み込みエラー:', error);
    return [];
  }
}

// プリセットIDを決定する（有効なプリセットのみ）
function determinePresetId(csvValue) {
  if (!csvValue || csvValue.trim() === '') {
    return null; // 空の場合は予定なし
  }
  
  const trimmed = csvValue.trim();
  
  // 直接マッピングを確認
  if (presetMapping[trimmed]) {
    return presetMapping[trimmed];
  }
  
  // 部分一致でチェック
  for (const [pattern, presetId] of Object.entries(presetMapping)) {
    if (trimmed.includes(pattern)) {
      return presetId;
    }
  }
  
  // 時間パターンのチェック（午後系のみ）
  if (trimmed.includes('後') || trimmed.includes('ご')) {
    return 'afternoon-off';
  }
  
  if (trimmed.includes('出社') && (trimmed.includes('13') || trimmed.includes('14') || trimmed.includes('15'))) {
    return 'afternoon-off';
  }
  
  // 意味不明なデータや対応していないパターンはスキップ
  console.log(`スキップ: ${trimmed} (対応プリセットなし)`);
  return null;
}

// 2025年7月の日付リストを生成
function generateJulyDates() {
  const dates = [];
  for (let day = 1; day <= 31; day++) {
    dates.push(`2025-07-${day.toString().padStart(2, '0')}`);
  }
  return dates;
}

// Pending申請データを生成
function generatePendingSchedules() {
  const csvData = loadCSVData();
  const julyDates = generateJulyDates();
  const pendingSchedules = [];
  
  console.log(`CSVデータ行数: ${csvData.length}`);
  console.log(`スタッフ数: ${staffList.length}`);
  
  // 225名分のデータを生成（CSVデータを循環利用）
  for (let staffIndex = 0; staffIndex < 225; staffIndex++) {
    const staffName = staffList[staffIndex % staffList.length];
    const csvRowIndex = staffIndex % csvData.length;
    const csvRow = csvData[csvRowIndex] || [];
    
    console.log(`処理中: ${staffIndex + 1}/225 - ${staffName}`);
    
    // 31日分の予定を作成
    for (let dayIndex = 0; dayIndex < 31; dayIndex++) {
      const date = julyDates[dayIndex];
      const csvValue = csvRow[dayIndex] || '';
      const presetId = determinePresetId(csvValue);
      
      if (presetId) {
        pendingSchedules.push({
          staffName: staffName,
          date: date,
          presetId: presetId,
          csvValue: csvValue,
          memo: `デモデータ: ${csvValue || '通常勤務'}`
        });
      }
    }
  }
  
  return pendingSchedules;
}

// メイン実行
function main() {
  console.log('月次プランナーデモデータ生成開始...');
  
  const pendingSchedules = generatePendingSchedules();
  
  console.log(`\n生成されたPending申請数: ${pendingSchedules.length}`);
  
  // プリセット別の統計
  const presetStats = {};
  pendingSchedules.forEach(schedule => {
    presetStats[schedule.presetId] = (presetStats[schedule.presetId] || 0) + 1;
  });
  
  console.log('\nプリセット別統計:');
  Object.entries(presetStats).forEach(([presetId, count]) => {
    console.log(`  ${presetId}: ${count}件`);
  });
  
  // JSONファイルとして保存
  const outputPath = path.join(__dirname, 'artifacts/pending_schedules_july_2025.json');
  fs.writeFileSync(outputPath, JSON.stringify(pendingSchedules, null, 2), 'utf8');
  
  console.log(`\nデータファイル保存完了: ${outputPath}`);
  console.log('\n次のステップ: APIを使ってPending申請を登録');
}

if (require.main === module) {
  main();
}

module.exports = {
  generatePendingSchedules,
  determinePresetId,
  presetMapping
};