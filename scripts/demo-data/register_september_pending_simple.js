// 手動登録と同じ単一スケジュール形式で9月申請予定を登録
const fs = require('fs');

// 9月デモデータを読み込み
const demoData = JSON.parse(fs.readFileSync('demo_data_september_system_presets.json', 'utf8'));

const API_BASE_URL = 'http://localhost:3002/api';

// 手動登録と同じ単一スケジュール形式でPending作成
async function createPendingSimple(applicationData) {
  const results = [];
  
  // 各スケジュールを個別に申請予定として登録（手動登録と同じ方式）
  for (const schedule of applicationData.schedules) {
    const pendingData = {
      staffId: applicationData.staffId,
      date: applicationData.date,
      status: schedule.status,
      start: schedule.start,
      end: schedule.end,
      memo: `月次計画: ${applicationData.presetName}|presetId:${applicationData.presetId}`,
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

    const result = await response.json();
    results.push(result);
  }
  
  return results;
}

// 担当設定作成（既存と同じ）
async function createResponsibilityDirect(respData) {
  const responsibilities = {
    fax: false,
    subjectCheck: false,
    lunch: false,
    cs: false,
    custom: ''
  };
  
  if (respData.responsibilities.includes('FAX当番')) {
    responsibilities.fax = true;
  }
  if (respData.responsibilities.includes('件名チェック担当')) {
    responsibilities.subjectCheck = true;
  }
  
  const response = await fetch(`${API_BASE_URL}/daily-assignments`, {
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
async function registerSeptemberPendingSimple() {
  console.log('🚀 9月申請予定登録開始（手動登録と同じ単一スケジュール形式）...');
  console.log(`📊 申請予定: ${demoData.applications.length}件`);
  console.log(`👥 担当設定: ${demoData.responsibilities.length}件`);

  let successCount = 0;
  let errorCount = 0;
  let totalSchedules = 0;

  // 申請予定を手動登録と同じ形式で登録
  console.log('\n📝 申請予定登録開始...');
  for (const app of demoData.applications) {
    try {
      const results = await createPendingSimple(app);
      
      console.log(`✅ 申請予定成功: スタッフ${app.staffId} ${app.date} ${app.presetName} (${results.length}スケジュール)`);
      successCount++;
      totalSchedules += results.length;

    } catch (error) {
      console.error(`❌ 申請予定失敗: スタッフ${app.staffId} ${app.date} ${app.presetName} - ${error.message}`);
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
      await createResponsibilityDirect(resp);
      const description = resp.responsibilities.join(', ');
      console.log(`✅ 担当設定成功: スタッフ${resp.staffId} ${resp.date} ${description}`);
      respSuccessCount++;
      
    } catch (error) {
      const description = resp.responsibilities.join(', ');
      console.error(`❌ 担当設定失敗: スタッフ${resp.staffId} ${resp.date} ${description} - ${error.message}`);
      respErrorCount++;
    }
    
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  console.log('\n📊 登録結果:');
  console.log(`申請予定: ✅ 成功 ${successCount}件 (${totalSchedules}スケジュール) / ❌ 失敗 ${errorCount}件`);
  console.log(`担当設定: ✅ 成功 ${respSuccessCount}件 / ❌ 失敗 ${respErrorCount}件`);
  console.log(`📋 合計処理: ${successCount + errorCount + respSuccessCount + respErrorCount}件`);

  const totalErrors = errorCount + respErrorCount;
  if (totalErrors === 0) {
    console.log('🎉 全ての9月申請予定・担当設定が手動登録と同じ形式で正常に登録されました！');
    console.log('\n✅ 手動登録形式での成功:');
    console.log('  ✅ 単一スケジュール形式（手動登録と完全一致）');
    console.log('  ✅ 月次プランナーでの表示統一');
    console.log('  ✅ 承認・却下処理対応');
  } else {
    console.log('⚠️  一部登録に失敗がありました。ログを確認してください。');
  }
}

// 実行
registerSeptemberPendingSimple().catch(console.error);