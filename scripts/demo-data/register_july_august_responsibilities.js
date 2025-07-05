// 7月-8月担当設定登録スクリプト
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

  const payload = {
    staffId: respData.staffId,
    date: respData.date,
    responsibilities: responsibilities
  };

  console.log('担当設定作成:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(`${API_BASE_URL}/responsibilities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ 担当設定作成成功:', {
      staffId: respData.staffId,
      date: respData.date,
      responsibilities: respData.responsibilities.join(', ')
    });
    
    return result;
  } catch (error) {
    console.error('❌ 担当設定作成失敗:', {
      staffId: respData.staffId,
      date: respData.date,
      error: error.message
    });
    throw error;
  }
}

// 遅延関数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function registerAllResponsibilities() {
  console.log('🚀 担当設定一括登録開始');
  
  // データファイル読み込み
  const dataFile = 'demo_responsibility_july_august.json';
  if (!fs.existsSync(dataFile)) {
    console.error(`❌ データファイルが見つかりません: ${dataFile}`);
    console.log('💡 まずはgenerate_july_august_responsibilities.jsを実行してください');
    process.exit(1);
  }
  
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const responsibilities = data.responsibilities;
  
  console.log(`📊 登録対象: ${responsibilities.length}件`);
  console.log(`📅 期間: ${data.metadata.period}`);
  console.log(`📋 配分: FAX${data.metadata.distribution.fax}件, 件名チェック${data.metadata.distribution.subjectCheck}件`);
  
  let successCount = 0;
  let failureCount = 0;
  const errors = [];
  
  // バッチ処理（10件ずつ）
  const batchSize = 10;
  for (let i = 0; i < responsibilities.length; i += batchSize) {
    const batch = responsibilities.slice(i, i + batchSize);
    console.log(`\n📦 バッチ ${Math.floor(i / batchSize) + 1}/${Math.ceil(responsibilities.length / batchSize)} (${batch.length}件)`);
    
    // 並列処理
    const promises = batch.map(async (resp, index) => {
      try {
        await delay(index * 100); // 100ms間隔でリクエスト
        await createResponsibilityDirect(resp);
        successCount++;
      } catch (error) {
        failureCount++;
        errors.push({
          responsibility: resp,
          error: error.message
        });
      }
    });
    
    await Promise.all(promises);
    
    // バッチ間の待機
    if (i + batchSize < responsibilities.length) {
      console.log('⏳ 次のバッチまで1秒待機...');
      await delay(1000);
    }
  }
  
  // 結果サマリー
  console.log('\n🎯 登録結果サマリー:');
  console.log(`  ✅ 成功: ${successCount}件`);
  console.log(`  ❌ 失敗: ${failureCount}件`);
  console.log(`  📊 成功率: ${((successCount / responsibilities.length) * 100).toFixed(1)}%`);
  
  if (errors.length > 0) {
    console.log('\n❌ エラー詳細:');
    errors.slice(0, 5).forEach((error, index) => {
      console.log(`  ${index + 1}. ${error.responsibility.date} Staff${error.responsibility.staffId}: ${error.error}`);
    });
    if (errors.length > 5) {
      console.log(`  ... 他${errors.length - 5}件のエラー`);
    }
  }
  
  if (successCount === responsibilities.length) {
    console.log('\n🎉 すべての担当設定登録が完了しました！');
  } else {
    console.log('\n⚠️  一部の担当設定登録に失敗しました。');
  }
}

// スクリプト実行時の処理
if (require.main === module) {
  registerAllResponsibilities().catch(error => {
    console.error('❌ 実行エラー:', error);
    process.exit(1);
  });
}

module.exports = { registerAllResponsibilities };