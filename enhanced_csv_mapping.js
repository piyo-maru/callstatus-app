const fs = require('fs');

// CSVデータの詳細分析と拡張マッピング
function analyzeAndMapCsvData() {
  const csvContent = fs.readFileSync('artifacts/07_plan_sample_utf8.csv', 'utf8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  // CSVの全パターンを収集
  const allPatterns = new Set();
  
  lines.forEach((line, lineIndex) => {
    if (lineIndex < 2) return; // ヘッダー行をスキップ
    
    const values = line.split(',');
    values.forEach(value => {
      const trimmed = value.trim();
      if (trimmed && trimmed !== '') {
        allPatterns.add(trimmed);
      }
    });
  });
  
  console.log('=== CSVデータから抽出した全パターン ===');
  const patterns = Array.from(allPatterns).sort();
  patterns.forEach(pattern => {
    console.log(`"${pattern}"`);
  });
  
  // 拡張されたマッピング定義
  const enhancedMapping = {
    // 休暇系
    '全休': 'full-day-off',
    '夏休': 'full-day-off', // 夏休みも全休として扱う
    'ドック休': 'full-day-off', // 健康診断も全休として扱う
    '振休': 'full-day-off', // 振替休日も全休として扱う
    
    // 時間制限勤務（遅刻・早退）
    '12:00退社': 'morning-work', // 午前のみ勤務（仮想プリセット）
    '13:00退社': 'morning-work',
    '14:00退社': 'morning-work',
    '15:00退社': 'morning-work',
    '16:00退社': 'part-time-employee', // パートタイマーに近い
    '17:00退社': 'part-time-employee',
    '18:00退社': 'part-time-employee',
    
    '10:00出社': 'late-start', // 遅刻（仮想プリセット）
    '11:00出社': 'late-start',
    '13:00出社': 'afternoon-off', // 午後出社として午前休扱い
    '14:00出社': 'afternoon-off',
    '16:00出社': 'afternoon-off',
    '9:30出社': 'late-start',
    '10:30出社': 'late-start',
    
    // 特殊勤務
    '出張': 'business-trip', // 仮想プリセット、実際にはfull-time-employeeで代用
    'チェック': 'training', // 研修・トレーニングで代用
    '在宅': 'remote-full-time',
    '振出': 'full-time-employee', // 振替出勤は通常勤務
    
    // 組み合わせパターン
    '通院後出社': 'afternoon-off', // 午前休扱い
    '11:30退社': 'morning-off', // 午後休扱い（逆）
    '15:50退社': 'part-time-employee',
    '15:45退社': 'part-time-employee'
  };
  
  // 実際に存在するプリセットIDにマッピング
  const availablePresets = [
    'full-time-employee',
    'part-time-employee', 
    'remote-full-time',
    'remote-part-time',
    'full-day-off',
    'sudden-off',
    'morning-off',
    'afternoon-off',
    'lunch-break',
    'night-duty',
    'night-duty-extended',
    'meeting-block',
    'training'
  ];
  
  console.log('\n=== 拡張マッピング結果 ===');
  const finalMapping = {};
  
  Object.entries(enhancedMapping).forEach(([csvValue, presetId]) => {
    // 存在するプリセットのみ使用
    if (availablePresets.includes(presetId)) {
      finalMapping[csvValue] = presetId;
      console.log(`✅ "${csvValue}" -> ${presetId}`);
    } else {
      // 存在しないプリセットは代替案を提案
      let alternativePreset = 'full-time-employee'; // デフォルト
      
      if (csvValue.includes('休')) {
        alternativePreset = 'full-day-off';
      } else if (csvValue.includes('出社')) {
        alternativePreset = 'afternoon-off';
      } else if (csvValue.includes('退社')) {
        alternativePreset = 'part-time-employee';
      } else if (csvValue.includes('出張') || csvValue.includes('チェック')) {
        alternativePreset = 'training';
      }
      
      finalMapping[csvValue] = alternativePreset;
      console.log(`⚠️  "${csvValue}" -> ${presetId} (存在しない) -> ${alternativePreset} (代替)`);
    }
  });
  
  // 無視するパターン（数値のみなど）
  const ignoredPatterns = patterns.filter(p => {
    return /^\d+$/.test(p) || // 数字のみ
           /^[月火水木金土日]$/.test(p) || // 曜日
           p.includes('月') && p.includes('日'); // 日付形式
  });
  
  console.log('\n=== 無視するパターン ===');
  ignoredPatterns.forEach(pattern => {
    console.log(`🚫 "${pattern}"`);
  });
  
  console.log('\n=== 統計 ===');
  console.log(`全パターン数: ${patterns.length}`);
  console.log(`マッピング対象: ${Object.keys(finalMapping).length}`);
  console.log(`無視パターン: ${ignoredPatterns.length}`);
  console.log(`マッピング率: ${Math.round(Object.keys(finalMapping).length / patterns.length * 100)}%`);
  
  return finalMapping;
}

// 実行
const mapping = analyzeAndMapCsvData();