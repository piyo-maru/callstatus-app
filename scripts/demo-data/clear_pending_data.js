// Pending申請データ全削除スクリプト
const API_BASE_URL = 'http://localhost:3002/api';

async function clearAllPendingData() {
  console.log('🗑️  Pending申請データ全削除開始...');
  
  try {
    // 1. 全Pending申請を取得
    console.log('📋 Pending申請一覧を取得中...');
    const response = await fetch(`${API_BASE_URL}/schedules/pending`);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${await response.text()}`);
    }
    
    const pendingSchedules = await response.json();
    console.log(`📊 削除対象: ${pendingSchedules.length}件のPending申請`);
    
    if (pendingSchedules.length === 0) {
      console.log('✅ 削除対象のPending申請がありません');
      return;
    }
    
    // 2. 各Pending申請を削除
    let successCount = 0;
    let errorCount = 0;
    
    for (const pending of pendingSchedules) {
      try {
        const deleteResponse = await fetch(`${API_BASE_URL}/schedules/pending/${pending.id}`, {
          method: 'DELETE'
        });
        
        if (deleteResponse.ok) {
          console.log(`✅ 削除成功: ID ${pending.id} (スタッフ${pending.staffId} ${pending.date})`);
          successCount++;
        } else {
          const error = await deleteResponse.text();
          console.error(`❌ 削除失敗: ID ${pending.id} - ${deleteResponse.status}: ${error}`);
          errorCount++;
        }
        
        // API負荷軽減のため少し待機
        await new Promise(resolve => setTimeout(resolve, 5));
        
      } catch (error) {
        console.error(`❌ 削除エラー: ID ${pending.id} - ${error.message}`);
        errorCount++;
      }
    }
    
    console.log('\n📊 削除結果:');
    console.log(`✅ 削除成功: ${successCount}件`);
    console.log(`❌ 削除失敗: ${errorCount}件`);
    console.log(`📋 処理総数: ${successCount + errorCount}件`);
    
    if (errorCount === 0) {
      console.log('🎉 全てのPending申請が正常に削除されました！');
      console.log('\n📝 次のステップ: node register_demo_pending_preset.js でデモデータを再登録');
    } else {
      console.log('⚠️  一部削除に失敗がありました。ログを確認してください。');
    }
    
    // 3. 削除後の確認
    console.log('\n🔍 削除後確認中...');
    const checkResponse = await fetch(`${API_BASE_URL}/schedules/pending`);
    const remainingPending = await checkResponse.json();
    console.log(`📊 残存Pending申請: ${remainingPending.length}件`);
    
  } catch (error) {
    console.error('❌ Pending申請削除中にエラーが発生しました:', error.message);
    process.exit(1);
  }
}

// 実行
clearAllPendingData().catch(console.error);