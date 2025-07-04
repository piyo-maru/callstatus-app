// デモデータをPending予定として登録するスクリプト
const fs = require('fs');

// デモデータを読み込み（7月全期間・システムプリセット準拠）
const demoData = JSON.parse(fs.readFileSync('demo_data_july_system_presets.json', 'utf8'));

const API_BASE_URL = 'http://localhost:3002/api';

// Pending予定作成API呼び出し
async function createPendingSchedule(scheduleData) {
  const response = await fetch(`${API_BASE_URL}/schedules/pending`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      staffId: scheduleData.staffId,
      date: scheduleData.date,
      status: scheduleData.schedules[0].status,
      start: scheduleData.schedules[0].start,
      end: scheduleData.schedules[0].end,
      memo: null,
      pendingType: 'monthly-planner'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return await response.json();
}

// 担当設定作成API呼び出し（責任設定用）
async function createResponsibility(respData) {
  const responsibilities = {};
  
  // タイプに応じて責任設定を構築
  if (respData.type === 'fax') {
    responsibilities.fax = true;
  } else if (respData.type === 'subjectCheck') {
    responsibilities.subjectCheck = true;
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
async function registerDemoData() {
  console.log('🚀 デモデータ登録開始...');
  console.log(`📊 申請予定: ${demoData.applications.length}件`);
  console.log(`👥 担当設定: ${demoData.responsibilities.length}件`);

  let successCount = 0;
  let errorCount = 0;

  // 申請予定を登録
  for (const app of demoData.applications) {
    try {
      // 複数スケジュールでも1つのpending予定として登録
      if (app.schedules.length === 1) {
        // 単一スケジュールの場合
        const result = await createPendingSchedule({
          staffId: app.staffId,
          date: app.date,
          schedules: app.schedules,
          memo: app.memo
        });
        console.log(`✅ 登録成功: スタッフ${app.staffId} ${app.date} ${app.presetName}`);
        successCount++;
      } else {
        // 複数スケジュール（午前休・午後休）の場合、最初のスケジュールだけを登録
        const result = await createPendingSchedule({
          staffId: app.staffId,
          date: app.date,
          schedules: [app.schedules[0]], // 最初のスケジュールのみ
          memo: app.memo
        });
        console.log(`✅ 登録成功: スタッフ${app.staffId} ${app.date} ${app.presetName} (最初のスケジュールのみ)`);
        successCount++;
      }

      // API負荷軽減のため少し待機
      await new Promise(resolve => setTimeout(resolve, 10));
    } catch (error) {
      console.error(`❌ 登録失敗: スタッフ${app.staffId} ${app.date} - ${error.message}`);
      errorCount++;
    }
  }

  // 担当設定を登録
  console.log('\n👥 担当設定登録開始...');
  let respSuccessCount = 0;
  let respErrorCount = 0;
  
  for (const resp of demoData.responsibilities) {
    try {
      const result = await createResponsibility(resp);
      console.log(`✅ 担当設定成功: スタッフ${resp.staffId} ${resp.date} ${resp.description}`);
      respSuccessCount++;
      
      // API負荷軽減のため少し待機
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      console.error(`❌ 担当設定失敗: スタッフ${resp.staffId} ${resp.date} ${resp.description} - ${error.message}`);
      respErrorCount++;
    }
  }

  console.log('\n📊 登録結果:');
  console.log(`申請予定: ✅ 成功 ${successCount}件 / ❌ 失敗 ${errorCount}件`);
  console.log(`担当設定: ✅ 成功 ${respSuccessCount}件 / ❌ 失敗 ${respErrorCount}件`);
  console.log(`📋 合計処理: ${successCount + errorCount + respSuccessCount + respErrorCount}件`);

  const totalErrors = errorCount + respErrorCount;
  if (totalErrors === 0) {
    console.log('🎉 全ての申請予定・担当設定が正常に登録されました！');
  } else {
    console.log('⚠️  一部登録に失敗がありました。ログを確認してください。');
  }
}

// 実行
registerDemoData().catch(console.error);