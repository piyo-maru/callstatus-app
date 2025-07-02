const fs = require('fs');

// グループ2のデータを修正
const originalData = JSON.parse(fs.readFileSync('artifacts/pending_requests_group2.json', 'utf8'));
const validStaffIds = Array.from({ length: 225 }, (_, i) => 238 + i);

const staffIdMapping = {};
let currentValidIndex = 30; // グループ2なので30番目から開始

const updatedData = originalData.map(item => {
  if (!staffIdMapping[item.staffId]) {
    staffIdMapping[item.staffId] = validStaffIds[currentValidIndex % validStaffIds.length];
    currentValidIndex++;
  }
  
  return {
    ...item,
    staffId: staffIdMapping[item.staffId]
  };
});

fs.writeFileSync('artifacts/pending_requests_group2_fixed.json', JSON.stringify(updatedData, null, 2));
console.log(`Group 2: Updated ${updatedData.length} records for ${Object.keys(staffIdMapping).length} unique staff`);