// 直接スケジュール登録（手動登録と同じ方式）
const fs = require('fs');

// デモデータを読み込み
const demoData = JSON.parse(fs.readFileSync('demo_data_july_system_presets.json', 'utf8'));

const API_BASE_URL = 'http://localhost:3002/api';

// 直接スケジュール作成API呼び出し（手動登録と同じ方式）
async function createDirectSchedule(scheduleData) {
  // 手動登録と同じデータ構造
  const directData = {
    staffId: scheduleData.staffId,
    status: scheduleData.status,
    start: scheduleData.start,     // 小数点形式
    end: scheduleData.end,         // 小数点形式
    memo: scheduleData.memo,
    date: scheduleData.date        // YYYY-MM-DD形式
  };
  
  const response = await fetch(`${API_BASE_URL}/schedules`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(directData)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return await response.json();
}

// 担当設定作成API呼び出し（既存と同じ）
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
  
  const directData = {
    staffId: respData.staffId,
    date: respData.date,
    responsibilities: responsibilities
  };
  
  const response = await fetch(`${API_BASE_URL}/daily-assignments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(directData)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return await response.json();
}

// メイン実行関数
async function main() {
  console.log('🚀 直接スケジュール登録（手動登録方式）デモデータ登録開始...');
  console.log(`📊 申請予定: ${demoData.applications.length}件`);
  console.log(`👥 担当設定: ${demoData.responsibilities.length}件`);
  
  let successCount = 0;
  let failureCount = 0;
  let scheduleCount = 0;
  const failureDetails = [];
  
  // 担当設定登録（既に成功している分はスキップ）
  console.log('\n👥 担当設定登録開始...');
  let respSuccessCount = 0;
  let respFailureCount = 0;
  
  for (const respData of demoData.responsibilities) {
    try {
      await createResponsibilityDirect(respData);
      const desc = respData.responsibilities.join(', ');
      console.log(`✅ 担当設定成功: スタッフ${respData.staffId} ${respData.date} ${desc}`);
      respSuccessCount++;
    } catch (error) {
      console.log(`❌ 担当設定失敗: スタッフ${respData.staffId} ${respData.date} - ${error.message}`);
      respFailureCount++;
    }
  }
  
  // 申請予定を個別スケジュールに展開して登録
  console.log('\n📝 申請予定登録開始...');
  
  for (const appData of demoData.applications) {
    try {
      // プリセットの各スケジュールを個別に登録（手動登録と同じ方式）
      for (const schedule of appData.schedules) {
        const scheduleData = {
          staffId: appData.staffId,
          status: schedule.status,
          start: schedule.start,   // 小数点形式（例: 9.5）
          end: schedule.end,       // 小数点形式
          memo: schedule.memo,
          date: appData.date
        };
        
        await createDirectSchedule(scheduleData);
        scheduleCount++;
      }
      
      const desc = `${appData.presetName}`;
      console.log(`✅ 申請予定成功: スタッフ${appData.staffId} ${appData.date} ${desc} (${appData.schedules.length}スケジュール)`);
      successCount++;
    } catch (error) {
      const desc = `${appData.presetName}`;
      console.log(`❌ 申請予定失敗: スタッフ${appData.staffId} ${appData.date} ${desc} - ${error.message}`);
      failureDetails.push(`❌ 申請予定失敗: スタッフ${appData.staffId} ${appData.date} ${desc} - ${error.message}`);
      failureCount++;
    }
  }
  
  // 結果サマリー
  console.log('\n📊 登録結果:');
  console.log(`申請予定: ✅ 成功 ${successCount}件 (${scheduleCount}スケジュール) / ❌ 失敗 ${failureCount}件`);
  console.log(`担当設定: ✅ 成功 ${respSuccessCount}件 / ❌ 失敗 ${respFailureCount}件`);
  console.log(`📋 合計処理: ${demoData.applications.length + demoData.responsibilities.length}件`);
  
  if (failureCount > 0) {
    console.log('\n⚠️  一部登録に失敗がありました。ログを確認してください。');
    if (failureDetails.length <= 10) {
      failureDetails.forEach(detail => console.log(detail));
    } else {
      console.log(`❌ 失敗件数が多いため最初の10件のみ表示:`);
      failureDetails.slice(0, 10).forEach(detail => console.log(detail));
      console.log(`... 他 ${failureDetails.length - 10}件の失敗`);
    }
  }
  
  if (successCount === demoData.applications.length && respSuccessCount === demoData.responsibilities.length) {
    console.log('\n🎉 全データ登録完了！');
  }
}

// スクリプト実行
if (require.main === module) {
  main().catch(console.error);
}