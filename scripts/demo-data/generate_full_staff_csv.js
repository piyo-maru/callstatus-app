#!/usr/bin/env node

/**
 * 225人分のスタッフデータCSVファイル生成スクリプト
 * コールステータスアプリ用
 */

const fs = require('fs');
const path = require('path');

// 姓・名のランダムリスト
const surnames = [
  '田中', '佐藤', '鈴木', '高橋', '渡辺', '伊藤', '山本', '中村', '小林', '加藤',
  '吉田', '山田', '佐々木', '山口', '松本', '井上', '木村', '林', '清水', '山崎',
  '森', '池田', '橋本', '山下', '石川', '中島', '前田', '藤田', '後藤', '岡田',
  '長谷川', '村上', '近藤', '石井', '斎藤', '坂本', '遠藤', '青木', '藤井', '西村',
  '福田', '太田', '三浦', '藤原', '岡本', '松田', '中川', '中野', '原田', '小川',
  '北村', '和田', '石田', '上田', '森田', '原', '柴田', '酒井', '工藤', '横山'
];

const firstNames = [
  '翔太', '大輝', '拓海', '健太', '翔平', '雄太', '涼太', '颯太', '陽向', '蓮',
  '大和', '陸', '悠真', '湊', '碧', '朝陽', '樹', '奏太', '悠斗', '陽翔',
  '美咲', '結愛', '陽菜', '葵', '美羽', '結衣', '心春', '美月', '花音', '莉子',
  '心愛', '結月', '美桜', '心優', '杏', '美緒', '結菜', '心結', '美織', '柚希',
  '太郎', '次郎', '三郎', '四郎', '花子', '恵子', '由美子', '洋子', '直子', '明美',
  '智子', '裕子', '真理子', '美智子', '久美子', '京子', '敏子', '良子', '弘子', '和子'
];

// 部署とグループの定義
const departments = [
  { name: '営業部', groups: ['第1営業', '第2営業', '第3営業'] },
  { name: '開発部', groups: ['フロントエンド', 'バックエンド', 'QA'] },
  { name: '人事部', groups: ['人事企画', '労務管理', '採用'] },
  { name: '総務部', groups: ['総務企画', '施設管理', '法務'] },
  { name: '経理部', groups: ['会計', '予算管理', '監査'] },
  { name: '受付部', groups: ['受付'] }
];

// ランダム選択ヘルパー
function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ランダム名前生成
function generateRandomName() {
  return randomChoice(surnames) + ' ' + randomChoice(firstNames);
}

// 部署・グループのランダム選択
function getRandomDepartmentGroup() {
  const dept = randomChoice(departments);
  const group = randomChoice(dept.groups);
  return { department: dept.name, group };
}

// 225人分のスタッフデータ生成
function generateStaffData() {
  const staffData = [];
  const usedNames = new Set();
  
  console.log('🏗️  225人分のスタッフデータを生成中...');
  
  for (let i = 1; i <= 225; i++) {
    let name;
    // 重複しない名前を生成
    do {
      name = generateRandomName();
    } while (usedNames.has(name));
    usedNames.add(name);
    
    const { department, group } = getRandomDepartmentGroup();
    
    staffData.push({
      id: i,
      name: name,
      department: department,
      group: group,
      // 基本勤務時間（全員9:00-18:00、金曜日は17:00まで）
      mondayHours: '9:00-18:00',
      tuesdayHours: '9:00-18:00',
      wednesdayHours: '9:00-18:00',
      thursdayHours: '9:00-18:00',
      fridayHours: '9:00-17:00',
      saturdayHours: '',
      sundayHours: ''
    });
  }
  
  return staffData;
}

// CSVファイル生成
function generateCSV() {
  const staffData = generateStaffData();
  
  // CSVヘッダー
  const headers = [
    'name',
    'department', 
    'group',
    'mondayHours',
    'tuesdayHours', 
    'wednesdayHours',
    'thursdayHours',
    'fridayHours',
    'saturdayHours',
    'sundayHours'
  ];
  
  // CSV行データ
  const csvRows = [
    headers.join(','), // ヘッダー行
    ...staffData.map(staff => [
      staff.name,
      staff.department,
      staff.group,
      staff.mondayHours,
      staff.tuesdayHours,
      staff.wednesdayHours,
      staff.thursdayHours,
      staff.fridayHours,
      staff.saturdayHours,
      staff.sundayHours
    ].join(','))
  ];
  
  const csvContent = csvRows.join('\n');
  
  // ファイル出力
  const outputPath = path.join(__dirname, 'staff_225_import.csv');
  fs.writeFileSync(outputPath, csvContent, 'utf8');
  
  console.log(`✅ CSVファイルを生成しました: ${outputPath}`);
  console.log(`📊 スタッフ数: ${staffData.length}名`);
  
  // 部署別統計
  const deptStats = {};
  staffData.forEach(staff => {
    deptStats[staff.department] = (deptStats[staff.department] || 0) + 1;
  });
  
  console.log('\n📈 部署別内訳:');
  Object.entries(deptStats).forEach(([dept, count]) => {
    console.log(`  - ${dept}: ${count}名`);
  });
  
  return outputPath;
}

// メイン実行
if (require.main === module) {
  try {
    const csvPath = generateCSV();
    console.log(`\n🎯 次のステップ:`);
    console.log(`1. ファイルをフロントエンドからアップロード: ${csvPath}`);
    console.log(`2. または backend containerでインポート実行`);
  } catch (error) {
    console.error('❌ CSV生成エラー:', error);
    process.exit(1);
  }
}

module.exports = { generateCSV };