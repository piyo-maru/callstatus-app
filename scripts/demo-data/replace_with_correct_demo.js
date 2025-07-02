const fs = require('fs');

async function replaceWithCorrectDemo() {
  try {
    console.log('=== 正しいデモデータへの置き換え開始 ===');
    
    // 1. 既存の全Pending申請を削除
    console.log('\n--- 既存データの削除 ---');
    const response = await fetch('http://localhost:3002/api/schedules/pending/monthly-planner?year=2025&month=7');
    const existingPendings = await response.json();
    console.log(`削除対象: ${existingPendings.length}件`);
    
    let deleteCount = 0;
    for (const pending of existingPendings) {
      try {
        const deleteResponse = await fetch(`http://localhost:3002/api/schedules/pending/${pending.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (deleteResponse.ok) {
          deleteCount++;
          if (deleteCount % 50 === 0) {
            console.log(`削除進捗: ${deleteCount}/${existingPendings.length}`);
          }
        }
      } catch (error) {
        // エラーは無視して続行
      }
      
      if (deleteCount % 25 === 24) {
        await new Promise(resolve => setTimeout(resolve, 30));
      }
    }
    console.log(`削除完了: ${deleteCount}件`);
    
    // 2. 正しいデモデータを登録
    console.log('\n--- 正しいデモデータの登録 ---');
    const correctSchedules = JSON.parse(fs.readFileSync('artifacts/correct_demo_schedules_july_2025.json', 'utf8'));
    console.log(`登録予定: ${correctSchedules.length}件`);
    
    let registerCount = 0;
    let registerErrors = 0;
    
    for (const schedule of correctSchedules) {
      try {
        const pendingData = {
          staffId: schedule.staffId,
          date: schedule.date,
          status: schedule.status, // 英語ステータス名を使用
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
            console.log(`登録進捗: ${registerCount}/${correctSchedules.length}`);
          }
        } else {
          registerErrors++;
          if (registerErrors <= 3) {
            const errorText = await registerResponse.text();
            console.log(`❌ 登録エラー: staffId=${pendingData.staffId}, ${errorText.substring(0, 50)}`);
          }
        }
      } catch (error) {
        registerErrors++;
      }
      
      if (registerCount % 25 === 24) {
        await new Promise(resolve => setTimeout(resolve, 30));
      }
    }
    
    console.log('\n=== 置き換え完了 ===');
    console.log(`✅ 登録成功: ${registerCount}件`);
    console.log(`❌ 登録失敗: ${registerErrors}件`);
    
    // 3. 最終確認
    console.log('\n--- 最終確認 ---');
    const finalResponse = await fetch('http://localhost:3002/api/schedules/pending/monthly-planner?year=2025&month=7');
    const finalData = await finalResponse.json();
    console.log(`最終申請数: ${finalData.length}件`);
    
    // スタッフ別の分布確認
    const staffCount = {};
    finalData.forEach(item => {
      staffCount[item.staffId] = (staffCount[item.staffId] || 0) + 1;
    });
    
    const counts = Object.values(staffCount);
    console.log(`対象スタッフ数: ${Object.keys(staffCount).length}人`);
    console.log(`平均予定数/人: ${Math.round(counts.reduce((a, b) => a + b, 0) / counts.length * 100) / 100}件`);
    console.log(`最大予定数: ${Math.max(...counts)}件/人`);
    console.log(`最小予定数: ${Math.min(...counts)}件/人`);
    
    // 重複チェック
    const grouped = {};
    finalData.forEach(item => {
      const date = item.date.split('T')[0];
      const key = `${item.staffId}-${date}`;
      grouped[key] = (grouped[key] || 0) + 1;
    });
    
    const duplicates = Object.values(grouped).filter(count => count > 1).length;
    console.log(`重複マス: ${duplicates}個`);
    
    if (duplicates === 0 && counts.length > 100) {
      console.log('🎉 正しい分布のデモデータ完成！');
    }
    
  } catch (error) {
    console.error('置き換え処理エラー:', error.message);
  }
}

replaceWithCorrectDemo();