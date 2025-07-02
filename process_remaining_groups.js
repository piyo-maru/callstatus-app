const fs = require('fs');

async function processGroup(groupNumber, startIndex) {
  console.log(`\n=== グループ${groupNumber} 処理開始 ===`);
  
  // 1. データ修正
  const originalData = JSON.parse(fs.readFileSync(`artifacts/pending_requests_group${groupNumber}.json`, 'utf8'));
  const validStaffIds = Array.from({ length: 225 }, (_, i) => 238 + i);
  
  const staffIdMapping = {};
  let currentValidIndex = startIndex;
  
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
  
  fs.writeFileSync(`artifacts/pending_requests_group${groupNumber}_fixed.json`, JSON.stringify(updatedData, null, 2));
  console.log(`データ修正完了: ${updatedData.length}件 (${Object.keys(staffIdMapping).length}名分)`);
  
  // 2. API登録
  let successCount = 0;
  let errorCount = 0;
  
  for (const [index, request] of updatedData.entries()) {
    try {
      const response = await fetch('http://localhost:3002/api/schedules/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      
      if (response.ok) {
        successCount++;
        if (index % 15 === 0 && index > 0) {
          console.log(`進捗: ${index + 1}/${updatedData.length}`);
        }
      } else {
        errorCount++;
        if (errorCount <= 3) {
          console.log(`❌ Error ${index + 1}: staffId=${request.staffId}, status=${response.status}`);
        }
      }
    } catch (error) {
      errorCount++;
      if (errorCount <= 3) {
        console.log(`❌ Network Error ${index + 1}: ${error.message}`);
      }
    }
    
    // レート制限対策
    if (index % 10 === 9) {
      await new Promise(resolve => setTimeout(resolve, 30));
    }
  }
  
  console.log(`=== グループ${groupNumber} 結果 ===`);
  console.log(`✅ 成功: ${successCount}件`);
  console.log(`❌ 失敗: ${errorCount}件`);
  
  return { successCount, errorCount };
}

async function main() {
  try {
    const results = [];
    
    // グループ3を処理 (60番目から)
    results.push(await processGroup(3, 60));
    
    // グループ4を処理 (90番目から)
    results.push(await processGroup(4, 90));
    
    console.log('\n=== 全体結果 ===');
    const totalSuccess = results.reduce((sum, r) => sum + r.successCount, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errorCount, 0);
    console.log(`総成功件数: ${totalSuccess}件`);
    console.log(`総失敗件数: ${totalErrors}件`);
    
  } catch (error) {
    console.error('Processing error:', error.message);
  }
}

main();