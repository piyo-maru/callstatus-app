const fs = require('fs');

// 元のデモデータを読み込み
const originalData = JSON.parse(fs.readFileSync('artifacts/pending_requests_group1.json', 'utf8'));

// 有効なstaffID範囲（238-643）にマッピング
// 225名分のスタッフに割り振り（238-462）
const validStaffIds = Array.from({ length: 225 }, (_, i) => 238 + i);

// 各デモデータのstaffIdを有効な範囲に再マッピング
const staffIdMapping = {};
let currentValidIndex = 0;

const updatedData = originalData.map(item => {
  // 元のstaffIdを有効なIDにマッピング
  if (!staffIdMapping[item.staffId]) {
    staffIdMapping[item.staffId] = validStaffIds[currentValidIndex % validStaffIds.length];
    currentValidIndex++;
  }
  
  return {
    ...item,
    staffId: staffIdMapping[item.staffId]
  };
});

console.log(`Updated ${updatedData.length} records with valid staffIds`);
console.log('Staff ID mapping summary:', Object.keys(staffIdMapping).length, 'unique staff');

// 更新されたデータを保存
fs.writeFileSync('artifacts/pending_requests_group1_fixed.json', JSON.stringify(updatedData, null, 2));
console.log('Updated data saved to: artifacts/pending_requests_group1_fixed.json');