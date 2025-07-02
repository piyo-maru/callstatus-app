const fs = require('fs');

async function registerPendingSchedules(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`Registering ${data.length} pending schedules...`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const [index, request] of data.entries()) {
      try {
        const response = await fetch('http://localhost:3002/api/schedules/pending', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request)
        });
        
        if (response.ok) {
          const result = await response.json();
          successCount++;
          if (index % 10 === 0) {
            console.log(`Progress: ${index + 1}/${data.length} - Latest success ID: ${result.id}`);
          }
        } else {
          errorCount++;
          const errorText = await response.text();
          errors.push({
            index: index + 1,
            staffId: request.staffId,
            date: request.date,
            status: response.status,
            error: errorText
          });
          console.log(`❌ Error ${index + 1}: staffId=${request.staffId}, status=${response.status}`);
        }
      } catch (networkError) {
        errorCount++;
        errors.push({
          index: index + 1,
          staffId: request.staffId,
          date: request.date,
          error: networkError.message
        });
        console.log(`❌ Network Error ${index + 1}: ${networkError.message}`);
      }
      
      // APIレート制限対策
      if (index % 10 === 9) {
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms待機
      }
    }
    
    console.log('\n=== 登録結果 ===');
    console.log(`✅ 成功: ${successCount}件`);
    console.log(`❌ 失敗: ${errorCount}件`);
    
    if (errors.length > 0) {
      console.log('\n=== エラー詳細 ===');
      errors.slice(0, 5).forEach(error => {
        console.log(`- Index ${error.index}: staffId=${error.staffId}, date=${error.date}`);
        console.log(`  Error: ${error.error}`);
      });
      
      if (errors.length > 5) {
        console.log(`... and ${errors.length - 5} more errors`);
      }
    }
    
    return { successCount, errorCount, errors };
    
  } catch (error) {
    console.error('Registration failed:', error.message);
    return { successCount: 0, errorCount: 0, errors: [error.message] };
  }
}

// 第1グループのデータを登録
registerPendingSchedules('artifacts/pending_requests_group1_fixed.json');