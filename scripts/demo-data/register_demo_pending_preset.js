// プリセット対応Pending APIでデモデータ登録スクリプト
const fs = require('fs');

// デモデータを読み込み（7月全期間・システムプリセット準拠）
const demoData = JSON.parse(fs.readFileSync('demo_data_july_system_presets.json', 'utf8'));

const API_BASE_URL = 'http://localhost:3002/api';

// プリセット対応Pending API呼び出し
async function createPendingWithPreset(scheduleData) {
  const pendingData = {
    staffId: scheduleData.staffId,
    date: scheduleData.date, // 文字列形式 "YYYY-MM-DD"
    presetId: scheduleData.presetId,
    presetName: scheduleData.presetName,
    schedules: scheduleData.schedules, // 複数スケジュール対応
    pendingType: 'monthly-planner'
  };
  
  const response = await fetch(`${API_BASE_URL}/schedules/pending`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(pendingData)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return await response.json();
}

// 担当設定作成API呼び出し
async function createResponsibilityDirect(respData) {
  // 配列形式をboolean形式に変換
  const responsibilities = {
    fax: false,
    subjectCheck: false,
    lunch: false,
    cs: false,
    custom: ''
  };
  
  // responsibilitiesの配列から対応するフラグを設定
  if (respData.responsibilities.includes('FAX当番')) {
    responsibilities.fax = true;
  }
  if (respData.responsibilities.includes('件名チェック担当')) {
    responsibilities.subjectCheck = true;
  }
  // 他の担当があればcustomに設定
  const otherResponsibilities = respData.responsibilities.filter(r => 
    !['FAX当番', '件名チェック担当'].includes(r)
  );
  if (otherResponsibilities.length > 0) {
    responsibilities.custom = otherResponsibilities.join(', ');
  }

  const response = await fetch(`${API_BASE_URL}/responsibilities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      staffId: respData.staffId,
      date: respData.date,
      responsibilities: responsibilities
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return await response.json();
}

// メイン実行関数
async function registerDemoPendingData() {
  console.log('🚀 プリセット対応Pending APIデモデータ登録開始...');
  console.log(`📊 申請予定: ${demoData.applications.length}件`);
  console.log(`👥 担当設定: ${demoData.responsibilities.length}件`);

  let successCount = 0;
  let errorCount = 0;
  let totalSchedules = 0;
  let batchIds = [];

  // 申請予定をPending APIで登録
  for (const app of demoData.applications) {
    try {
      const result = await createPendingWithPreset(app);
      
      if (result.batchId) {
        // 複数スケジュール（プリセット）の場合
        console.log(`✅ Pending登録成功: スタッフ${app.staffId} ${app.date} ${app.presetName} (${result.totalSchedules}スケジュール) BatchID: ${result.batchId}`);
        batchIds.push(result.batchId);
        totalSchedules += result.totalSchedules;
        
        // 詳細ログ（複合予定の場合）
        if (result.totalSchedules > 1) {
          result.schedules.forEach((schedule, index) => {
            console.log(`   └─ スケジュール${index + 1}: ${schedule.status} ${schedule.start}-${schedule.end} (ID: ${schedule.id})`);
          });
        }
      } else {
        // 単一スケジュールの場合
        console.log(`✅ Pending登録成功: スタッフ${app.staffId} ${app.date} ${app.presetName} (1スケジュール) ID: ${result.id}`);
        totalSchedules += 1;
      }
      
      successCount++;

    } catch (error) {
      console.error(`❌ Pending登録失敗: スタッフ${app.staffId} ${app.date} ${app.presetName} - ${error.message}`);
      errorCount++;
    }
    
    // API負荷軽減のため少し待機
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  // 担当設定を登録
  console.log('\n👥 担当設定登録開始...');
  let respSuccessCount = 0;
  let respErrorCount = 0;
  
  for (const resp of demoData.responsibilities) {
    try {
      const result = await createResponsibilityDirect(resp);
      console.log(`✅ 担当設定成功: スタッフ${resp.staffId} ${resp.date} ${resp.description}`);
      respSuccessCount++;
      
      // API負荷軽減のため少し待機
      await new Promise(resolve => setTimeout(resolve, 10));
    } catch (error) {
      console.error(`❌ 担当設定失敗: スタッフ${resp.staffId} ${resp.date} ${resp.description} - ${error.message}`);
      respErrorCount++;
    }
  }

  console.log('\n📊 登録結果:');
  console.log(`申請予定(Pending): ✅ 成功 ${successCount}件 (${totalSchedules}スケジュール) / ❌ 失敗 ${errorCount}件`);
  console.log(`担当設定: ✅ 成功 ${respSuccessCount}件 / ❌ 失敗 ${respErrorCount}件`);
  console.log(`📋 合計処理: ${successCount + errorCount + respSuccessCount + respErrorCount}件`);
  console.log(`🔗 生成BatchID数: ${batchIds.length}件`);

  const totalErrors = errorCount + respErrorCount;
  if (totalErrors === 0) {
    console.log('🎉 全ての申請予定・担当設定がPending状態で正常に登録されました！');
    console.log('\n🎯 プリセット対応結果:');
    console.log('  ✅ 夜間担当: off + break + night duty の3スケジュール（BatchID管理）');
    console.log('  ✅ 午前休: off + online の2スケジュール（BatchID管理）');
    console.log('  ✅ 午後休: online + off の2スケジュール（BatchID管理）');
    console.log('  ✅ 在宅勤務: remote + break + remote の3スケジュール（BatchID管理）');
    console.log('  ✅ 休暇・振出: 単一スケジュール');
    console.log('\n📝 次のステップ:');
    console.log('  1. 月次プランナーで申請予定を確認');
    console.log('  2. 管理者権限で一括承認/却下テスト');
    console.log('  3. 承認後のスケジュール表示確認');
  } else {
    console.log('⚠️  一部登録に失敗がありました。ログを確認してください。');
  }
  
  // BatchID一覧をファイルに保存（承認テスト用）
  if (batchIds.length > 0) {
    fs.writeFileSync('demo_batch_ids.json', JSON.stringify(batchIds, null, 2));
    console.log(`\n💾 BatchID一覧を demo_batch_ids.json に保存しました (${batchIds.length}件)`);
  }
}

// 実行
registerDemoPendingData().catch(console.error);