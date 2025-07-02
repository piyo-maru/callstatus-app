const fs = require('fs');

function analyzeCSVDistribution() {
  const csvContent = fs.readFileSync('artifacts/07_plan_sample_utf8.csv', 'utf8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  console.log('=== CSVデータの実際の分布分析 ===');
  
  // 日付行（2行目）を解析
  const dateLine = lines[1];
  const days = dateLine.split(',');
  console.log(`日数: ${days.length}日`);
  
  let totalCells = 0;
  let filledCells = 0;
  let emptySpaceCount = 0;
  
  const patternCount = {};
  const dailyCount = Array(31).fill(0);
  
  // 各行（スタッフ）を処理
  lines.slice(2).forEach((line, staffIndex) => {
    if (!line.trim()) return;
    
    const values = line.split(',');
    
    values.forEach((value, dayIndex) => {
      totalCells++;
      
      const trimmedValue = value.trim();
      
      if (trimmedValue === '') {
        emptySpaceCount++;
      } else {
        filledCells++;
        dailyCount[dayIndex]++;
        
        // パターンカウント
        patternCount[trimmedValue] = (patternCount[trimmedValue] || 0) + 1;
      }
    });
  });
  
  console.log(`\n=== 基本統計 ===`);
  console.log(`総マス数: ${totalCells}`);
  console.log(`空欄: ${emptySpaceCount}マス (${Math.round(emptySpaceCount/totalCells*100)}%)`);
  console.log(`予定あり: ${filledCells}マス (${Math.round(filledCells/totalCells*100)}%)`);
  console.log(`スタッフ数: ${lines.length - 2}人`);
  
  console.log(`\n=== 予定密度 ===`);
  console.log(`平均予定数/スタッフ: ${Math.round(filledCells / (lines.length - 2) * 100) / 100}件`);
  console.log(`平均予定数/日: ${Math.round(filledCells / 31 * 100) / 100}件`);
  
  console.log(`\n=== パターン分析 ===`);
  const sortedPatterns = Object.entries(patternCount)
    .filter(([pattern]) => !/^\d+$/.test(pattern) && !pattern.includes('月') && !pattern.includes('日'))
    .sort((a, b) => b[1] - a[1]);
  
  sortedPatterns.forEach(([pattern, count]) => {
    console.log(`"${pattern}": ${count}回`);
  });
  
  console.log(`\n=== 現在のデモデータとの比較 ===`);
  console.log(`CSV実データ: ${filledCells}件の予定`);
  console.log(`現在のデモ: 667件の申請`);
  console.log(`比率: ${Math.round(667 / filledCells * 100) / 100}倍`);
  
  if (667 > filledCells * 2) {
    console.log(`⚠️ デモデータが実データの2倍以上になっています！`);
    console.log(`推奨: CSVの実際の分布に合わせて${filledCells}件程度に調整`);
  }
  
  console.log(`\n=== 日別分布（上位10日） ===`);
  const sortedDays = dailyCount
    .map((count, index) => ({ day: index + 1, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
    
  sortedDays.forEach(({ day, count }) => {
    console.log(`${day}日: ${count}件`);
  });
  
  return { totalCells, filledCells, emptySpaceCount, patternCount };
}

const result = analyzeCSVDistribution();

// 推奨対策
console.log(`\n=== 推奨対策 ===`);
console.log(`1. CSVの実際のパターン分布に合わせて予定を間引く`);
console.log(`2. 空欄の多い現実的な分布に調整する`);
console.log(`3. 特定の日に集中しすぎないよう分散させる`);