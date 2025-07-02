// Pending申請を実際にAPIに登録するスクリプト
const fs = require('fs');
const path = require('path');

async function registerPendingSchedules(groupNumber) {
  try {
    // グループデータを読み込み
    const dataPath = path.join(__dirname, `artifacts/pending_requests_group${groupNumber}.json`);
    
    if (!fs.existsSync(dataPath)) {
      console.error(`データファイルが見つかりません: ${dataPath}`);
      return;
    }
    
    const pendingRequests = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    console.log(`グループ${groupNumber}: ${pendingRequests.length}件の申請を登録開始...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // バッチサイズ（一度に送信する件数）
    const batchSize = 10;
    
    for (let i = 0; i < pendingRequests.length; i += batchSize) {
      const batch = pendingRequests.slice(i, i + batchSize);
      console.log(`\nバッチ ${Math.floor(i/batchSize) + 1}: ${batch.length}件処理中...`);
      
      // バッチ内の各申請を並行処理
      const promises = batch.map(async (request, index) => {
        try {
          const response = await fetch('http://localhost:3002/api/schedules/pending', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(request)
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }
          
          const result = await response.json();
          console.log(`  ✓ ${i + index + 1}: スタッフID ${request.staffId}, ${request.date} - ${request.presetId}`);
          return { success: true, data: result };
          
        } catch (error) {
          console.error(`  ✗ ${i + index + 1}: エラー - ${error.message}`);
          console.error(`    データ: スタッフID ${request.staffId}, ${request.date}, ${request.presetId}`);
          return { success: false, error: error.message };
        }
      });
      
      // バッチの結果を集計
      const results = await Promise.all(promises);
      const batchSuccess = results.filter(r => r.success).length;
      const batchErrors = results.filter(r => !r.success).length;
      
      successCount += batchSuccess;
      errorCount += batchErrors;
      
      console.log(`  バッチ結果: 成功 ${batchSuccess}件, エラー ${batchErrors}件`);
      
      // 次のバッチまで少し待機（API負荷軽減）
      if (i + batchSize < pendingRequests.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`\n=== グループ${groupNumber} 登録完了 ===`);
    console.log(`総件数: ${pendingRequests.length}`);
    console.log(`成功: ${successCount}件`);
    console.log(`エラー: ${errorCount}件`);
    console.log(`成功率: ${((successCount / pendingRequests.length) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('登録処理中にエラーが発生しました:', error);
  }
}

// メイン実行
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('使用方法: node register_pending.js [group_number]');
    console.log('例: node register_pending.js 1  # グループ1を登録');
    return;
  }
  
  const groupNumber = parseInt(args[0]);
  if (isNaN(groupNumber) || groupNumber < 1 || groupNumber > 8) {
    console.error('グループ番号は1-8で指定してください');
    return;
  }
  
  await registerPendingSchedules(groupNumber);
}

if (require.main === module) {
  main();
}