const fs = require('fs');

async function cleanAndReloadDemo() {
  try {
    console.log('=== 重複したPending申請のクリーンアップ開始 ===');
    
    // 1. 現在のPending申請をすべて取得
    const response = await fetch('http://localhost:3002/api/schedules/pending/monthly-planner?year=2025&month=7');
    const allPendings = await response.json();
    console.log(`現在の申請数: ${allPendings.length}件`);
    
    // 2. すべてのPending申請を削除
    console.log('\n=== 既存申請の削除開始 ===');
    let deleteCount = 0;
    let errorCount = 0;
    
    for (const pending of allPendings) {
      try {
        const deleteResponse = await fetch(`http://localhost:3002/api/schedules/pending/${pending.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (deleteResponse.ok) {
          deleteCount++;
          if (deleteCount % 50 === 0) {
            console.log(`削除進捗: ${deleteCount}/${allPendings.length}`);
          }
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
      }
      
      // レート制限対策
      if (deleteCount % 25 === 24) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    console.log(`削除完了: ${deleteCount}件成功, ${errorCount}件失敗`);
    
    // 3. 拡張版デモデータを再登録
    console.log('\n=== 拡張版デモデータの再登録開始 ===');
    
    const enhancedSchedules = JSON.parse(fs.readFileSync('artifacts/enhanced_demo_schedules_july_2025.json', 'utf8'));
    console.log(`登録予定データ数: ${enhancedSchedules.length}件`);
    
    let registerCount = 0;
    let registerErrors = 0;
    
    for (const schedule of enhancedSchedules) {
      try {
        const pendingData = {
          staffId: schedule.staffId,
          date: schedule.date,
          status: schedule.status, // 既に日本語ステータス名
          start: parseFloat(schedule.startTime.toString()),
          end: parseFloat(schedule.endTime.toString()),
          memo: schedule.memo || `月次プランナー申請: ${schedule.csvValue}`,
          pendingType: 'monthly-planner'
        };
        
        const registerResponse = await fetch('http://localhost:3002/api/schedules/pending', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pendingData)
        });
        
        if (registerResponse.ok) {
          registerCount++;
          if (registerCount % 50 === 0) {
            console.log(`登録進捗: ${registerCount}/${enhancedSchedules.length}`);
          }
        } else {
          registerErrors++;
          if (registerErrors <= 3) {
            const errorText = await registerResponse.text();
            console.log(`❌ 登録エラー: staffId=${pendingData.staffId}, ${errorText.substring(0, 100)}`);
          }
        }
      } catch (error) {
        registerErrors++;
        if (registerErrors <= 3) {
          console.log(`❌ ネットワークエラー: ${error.message}`);
        }
      }
      
      // レート制限対策
      if (registerCount % 25 === 24) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    console.log('\n=== クリーンアップ完了 ===');
    console.log(`削除: ${deleteCount}件`);
    console.log(`再登録: ${registerCount}件成功, ${registerErrors}件失敗`);
    
    // 4. 最終確認
    console.log('\n=== 最終確認 ===');
    const finalResponse = await fetch('http://localhost:3002/api/schedules/pending/monthly-planner?year=2025&month=7');
    const finalData = await finalResponse.json();
    console.log(`最終申請数: ${finalData.length}件`);
    
    // 重複チェック
    const grouped = {};
    finalData.forEach(item => {
      const date = item.date.split('T')[0];
      const key = `${item.staffId}-${date}`;
      grouped[key] = (grouped[key] || 0) + 1;
    });
    
    const duplicates = Object.values(grouped).filter(count => count > 1).length;
    console.log(`重複マス: ${duplicates}個`);
    
    if (duplicates === 0) {
      console.log('✅ 重複は解消されました！');
    } else {
      console.log('⚠️ まだ重複が残っています');
    }
    
  } catch (error) {
    console.error('クリーンアップ処理エラー:', error.message);
  }
}

cleanAndReloadDemo();