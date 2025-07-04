// 全担当設定登録スクリプト
const fs = require('fs');

const API_BASE_URL = 'http://localhost:3002/api';

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

// 全担当設定登録
async function registerAllResponsibilities() {
  const demoData = JSON.parse(fs.readFileSync('demo_data_july_system_presets.json', 'utf8'));
  
  console.log('🚀 全担当設定登録開始...');
  console.log(`📊 担当設定: ${demoData.responsibilities.length}件`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const resp of demoData.responsibilities) {
    try {
      const result = await createResponsibilityDirect(resp);
      console.log(`✅ 担当設定成功: スタッフ${resp.staffId} ${resp.date} ${resp.description} (作成: ${result.assignmentsCreated}件)`);
      successCount++;
      
      await new Promise(resolve => setTimeout(resolve, 20));
    } catch (error) {
      console.error(`❌ 担当設定失敗: スタッフ${resp.staffId} ${resp.date} ${resp.description} - ${error.message}`);
      errorCount++;
    }
  }
  
  console.log('\n📊 最終結果:');
  console.log(`担当設定: ✅ 成功 ${successCount}件 / ❌ 失敗 ${errorCount}件`);
  
  if (errorCount === 0) {
    console.log('🎉 全ての担当設定が正常に登録されました！');
  } else {
    console.log('⚠️  一部登録に失敗がありました。');
  }
}

registerAllResponsibilities().catch(console.error);