const fs = require('fs');

// ステータス名を日本語表示名に変換
function getStatusDisplayName(status) {
  const statusMapping = {
    '出社': '出社',
    'リモート': 'リモート',
    '休暇': '休暇',
    '休憩': '休憩',
    '会議': '会議',
    '研修': '研修',
    '夜間勤務': '夜間勤務'
  };
  
  return statusMapping[status] || status;
}

// APIリクエスト用のデータフォーマット
function formatForAPI(schedule) {
  return {
    staffId: schedule.staffId,
    date: schedule.date,
    status: getStatusDisplayName(schedule.status),
    start: parseFloat(schedule.startTime.toString()),
    end: parseFloat(schedule.endTime.toString()),
    memo: schedule.memo || `月次プランナー申請: ${schedule.csvValue}`,
    pendingType: 'monthly-planner'
  };
}

async function registerEnhancedDemo() {
  try {
    // 既存のPending申請をクリア（念のため確認）
    console.log('=== 拡張デモデータ登録開始 ===');
    
    // 拡張デモデータを読み込み
    const enhancedSchedules = JSON.parse(fs.readFileSync('artifacts/enhanced_demo_schedules_july_2025.json', 'utf8'));
    console.log(`対象データ数: ${enhancedSchedules.length}件`);
    
    // API形式に変換
    const apiRequests = enhancedSchedules.map(formatForAPI);
    
    // ステータス別の事前集計
    const statusPreview = {};
    apiRequests.forEach(req => {
      statusPreview[req.status] = (statusPreview[req.status] || 0) + 1;
    });
    
    console.log('\n=== 登録予定データ ===');
    Object.entries(statusPreview).forEach(([status, count]) => {
      console.log(`${status}: ${count}件`);
    });
    
    console.log('\n=== 登録開始 ===');
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const [index, request] of apiRequests.entries()) {
      try {
        const response = await fetch('http://localhost:3002/api/schedules/pending', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request)
        });
        
        if (response.ok) {
          successCount++;
          if (index % 50 === 0) {
            console.log(`進捗: ${index + 1}/${apiRequests.length} (${Math.round((index + 1) / apiRequests.length * 100)}%)`);
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
          
          if (errorCount <= 5) {
            console.log(`❌ Error ${index + 1}: staffId=${request.staffId}, status=${response.status}`);
          }
        }
      } catch (networkError) {
        errorCount++;
        errors.push({
          index: index + 1,
          staffId: request.staffId,
          date: request.date,
          error: networkError.message
        });
        
        if (errorCount <= 5) {
          console.log(`❌ Network Error ${index + 1}: ${networkError.message}`);
        }
      }
      
      // レート制限対策
      if (index % 25 === 24) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('\n=== 拡張デモデータ登録結果 ===');
    console.log(`✅ 成功: ${successCount}件`);
    console.log(`❌ 失敗: ${errorCount}件`);
    console.log(`成功率: ${Math.round(successCount / apiRequests.length * 100)}%`);
    
    if (errors.length > 0) {
      console.log('\n=== エラーサンプル ===');
      errors.slice(0, 3).forEach(error => {
        console.log(`- Index ${error.index}: staffId=${error.staffId}, date=${error.date}`);
        console.log(`  Error: ${typeof error.error === 'string' ? error.error.substring(0, 100) : error.error}`);
      });
      
      if (errors.length > 3) {
        console.log(`... and ${errors.length - 3} more errors`);
      }
    }
    
    return { successCount, errorCount, errors };
    
  } catch (error) {
    console.error('Enhanced demo registration failed:', error.message);
    return { successCount: 0, errorCount: 0, errors: [error.message] };
  }
}

// 実行
registerEnhancedDemo();