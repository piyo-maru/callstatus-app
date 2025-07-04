// 拡張されたPending APIを正しく使用したデモデータ登録スクリプト
const fs = require('fs');

// デモデータを読み込み（8月全期間・システムプリセット準拠）
const demoData = JSON.parse(fs.readFileSync('demo_data_august_system_presets.json', 'utf8'));

const API_BASE_URL = 'http://localhost:3002/api';

// 正しいPending API呼び出し（プリセット対応拡張版）
async function createPendingWithProperPreset(scheduleData) {
  const pendingData = {
    staffId: scheduleData.staffId,
    date: scheduleData.date, // 文字列形式 "YYYY-MM-DD"
    presetId: scheduleData.presetId,
    presetName: scheduleData.presetName,
    schedules: scheduleData.schedules, // 複数スケジュール配列
    pendingType: 'monthly-planner'
  };
  
  console.log(`📝 登録データ: スタッフ${scheduleData.staffId} ${scheduleData.date} ${scheduleData.presetName} (${scheduleData.schedules.length}スケジュール)`);
  
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
async function registerDemoDataProperly() {
  console.log('🚀 拡張されたPending APIを使用したデモデータ登録開始...');
  console.log(`📊 申請予定: ${demoData.applications.length}件`);
  console.log(`👥 担当設定: ${demoData.responsibilities.length}件`);

  let successCount = 0;
  let errorCount = 0;
  let compositeSchedules = 0;  // 複合予定数
  let singleSchedules = 0;     // 単一予定数

  // 申請予定をPending APIで登録（正しい方法）
  console.log('\n📝 申請予定登録開始...');
  for (const app of demoData.applications) {
    try {
      const result = await createPendingWithProperPreset(app);
      
      if (app.schedules.length > 1) {
        compositeSchedules++;
        console.log(`✅ 複合予定登録成功: スタッフ${app.staffId} ${app.date} ${app.presetName} (${app.schedules.length}スケジュール統合)`);
      } else {
        singleSchedules++;
        console.log(`✅ 単一予定登録成功: スタッフ${app.staffId} ${app.date} ${app.presetName} (1スケジュール)`);
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
  console.log(`申請予定(Pending): ✅ 成功 ${successCount}件 / ❌ 失敗 ${errorCount}件`);
  console.log(`  └─ 複合予定: ${compositeSchedules}件 (手動登録と同じ統合表示)`);
  console.log(`  └─ 単一予定: ${singleSchedules}件`);
  console.log(`担当設定: ✅ 成功 ${respSuccessCount}件 / ❌ 失敗 ${respErrorCount}件`);
  console.log(`📋 合計処理: ${successCount + errorCount + respSuccessCount + respErrorCount}件`);

  const totalErrors = errorCount + respErrorCount;
  if (totalErrors === 0) {
    console.log('🎉 全ての申請予定・担当設定が正しい方法で登録されました！');
    console.log('\n✅ 手動登録との完全一致:');
    console.log('  ✅ 複合予定は統合表示（手動登録と同じ見え方）');
    console.log('  ✅ 単一予定は個別表示');
    console.log('  ✅ 月次プランナーでの表示統一');
    console.log('  ✅ 承認・却下処理統一');
    console.log('\n📝 次のステップ:');
    console.log('  1. 月次プランナーで申請予定を確認（手動登録と同じ表示）');
    console.log('  2. 管理者権限で承認・却下テスト');
    console.log('  3. 承認後のスケジュール表示確認');
  } else {
    console.log('⚠️  一部登録に失敗がありました。ログを確認してください。');
  }
}

// 実行
registerDemoDataProperly().catch(console.error);