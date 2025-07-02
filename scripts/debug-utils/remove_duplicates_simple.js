async function removeDuplicatesSimple() {
  try {
    console.log('=== 重複Pending申請の簡単削除開始 ===');
    
    // 1. 現在のPending申請をすべて取得
    const response = await fetch('http://localhost:3002/api/schedules/pending/monthly-planner?year=2025&month=7');
    const allPendings = await response.json();
    console.log(`現在の申請数: ${allPendings.length}件`);
    
    // 2. 重複を特定（最初の1件を残して他を削除）
    const keepMap = new Map(); // staffId-date -> 最初の申請ID
    const toDelete = []; // 削除対象のID配列
    
    allPendings.forEach(pending => {
      const date = pending.date.split('T')[0];
      const key = `${pending.staffId}-${date}`;
      
      if (!keepMap.has(key)) {
        // 最初の申請は保持
        keepMap.set(key, pending.id);
      } else {
        // 2番目以降は削除対象
        toDelete.push(pending.id);
      }
    });
    
    console.log(`保持: ${keepMap.size}件`);
    console.log(`削除対象: ${toDelete.length}件`);
    
    // 3. 重複分を削除
    let deleteCount = 0;
    let errorCount = 0;
    
    for (const pendingId of toDelete) {
      try {
        const deleteResponse = await fetch(`http://localhost:3002/api/schedules/pending/${pendingId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (deleteResponse.ok) {
          deleteCount++;
          if (deleteCount % 20 === 0) {
            console.log(`削除進捗: ${deleteCount}/${toDelete.length}`);
          }
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
      }
      
      // レート制限対策
      if (deleteCount % 10 === 9) {
        await new Promise(resolve => setTimeout(resolve, 30));
      }
    }
    
    console.log('\n=== 削除完了 ===');
    console.log(`✅ 削除成功: ${deleteCount}件`);
    console.log(`❌ 削除失敗: ${errorCount}件`);
    
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
      console.log('🎉 重複は完全に解消されました！');
    } else {
      console.log('⚠️ まだ重複が残っています');
    }
    
    // ステータス別集計
    const statusCount = {};
    finalData.forEach(item => {
      statusCount[item.status] = (statusCount[item.status] || 0) + 1;
    });
    
    console.log('\n=== 最終ステータス別集計 ===');
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`${status}: ${count}件`);
    });
    
  } catch (error) {
    console.error('重複削除エラー:', error.message);
  }
}

removeDuplicatesSimple();