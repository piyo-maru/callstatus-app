// デモデータをAdjustment API直接登録するスクリプト（修正版）
const fs = require('fs');

// デモデータを読み込み（7月全期間・システムプリセット準拠）
const demoData = JSON.parse(fs.readFileSync('demo_data_july_system_presets.json', 'utf8'));

const API_BASE_URL = 'http://localhost:3002/api';

// Adjustment直接作成API呼び出し（正しいデータ形式）
async function createAdjustmentDirect(scheduleData) {
  const results = [];
  
  // 複数スケジュールを個別に作成
  for (const schedule of scheduleData.schedules) {
    const adjustmentData = {
      staffId: scheduleData.staffId,
      date: scheduleData.date, // 文字列形式 "YYYY-MM-DD"
      status: schedule.status,
      start: schedule.start, // JST小数点時刻 (例: 9.0, 18.0)
      end: schedule.end,     // JST小数点時刻 (例: 9.0, 18.0)
      memo: `${scheduleData.presetName} (プリセット: ${scheduleData.presetId})`
    };
    
    const response = await fetch(`${API_BASE_URL}/schedules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(adjustmentData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    results.push(result);
    
    // API負荷軽減のため少し待機
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  
  return results;
}

// 担当設定作成API呼び出し
async function createResponsibilityDirect(respData) {
  const response = await fetch(`${API_BASE_URL}/responsibilities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      staffId: respData.staffId,
      date: respData.date,
      responsibilities: respData.responsibilities
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return await response.json();
}

// メイン実行関数
async function registerDemoDataDirect() {
  console.log('🚀 デモデータ直接登録開始（修正版・正しいAPI形式）...');
  console.log(`📊 申請予定: ${demoData.applications.length}件`);
  console.log(`👥 担当設定: ${demoData.responsibilities.length}件`);

  let successCount = 0;
  let errorCount = 0;
  let totalSchedules = 0;

  // 申請予定を登録（修正版データ形式）
  for (const app of demoData.applications) {
    try {
      const results = await createAdjustmentDirect(app);
      
      console.log(`✅ 登録成功: スタッフ${app.staffId} ${app.date} ${app.presetName} (${results.length}スケジュール)`);
      successCount++;
      totalSchedules += results.length;
      
      // 詳細ログ（複合予定の場合）
      if (results.length > 1) {
        results.forEach((result, index) => {
          console.log(`   └─ スケジュール${index + 1}: ${result.status} ${result.start}-${result.end}`);
        });
      }

    } catch (error) {
      console.error(`❌ 登録失敗: スタッフ${app.staffId} ${app.date} ${app.presetName} - ${error.message}`);
      errorCount++;
    }
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
  console.log(`申請予定: ✅ 成功 ${successCount}件 (${totalSchedules}スケジュール) / ❌ 失敗 ${errorCount}件`);
  console.log(`担当設定: ✅ 成功 ${respSuccessCount}件 / ❌ 失敗 ${respErrorCount}件`);
  console.log(`📋 合計処理: ${successCount + errorCount + respSuccessCount + respErrorCount}件`);

  const totalErrors = errorCount + respErrorCount;
  if (totalErrors === 0) {
    console.log('🎉 全ての申請予定・担当設定が正常に登録されました！');
    console.log('\n🎯 複合予定対応結果:');
    console.log('  ✅ 夜間担当: off + break + night duty の3スケジュール');
    console.log('  ✅ 午前休: off + online の2スケジュール');
    console.log('  ✅ 午後休: online + off の2スケジュール');
    console.log('  ✅ 在宅勤務: remote + break + remote の3スケジュール');
  } else {
    console.log('⚠️  一部登録に失敗がありました。ログを確認してください。');
  }
}

// 実行
registerDemoDataDirect().catch(console.error);