const fs = require('fs');

async function createAugustDemo() {
  try {
    console.log('=== 8月のデモデータ作成開始 ===');
    
    // 7月の正しいデモデータを読み込み
    const julySchedules = JSON.parse(fs.readFileSync('artifacts/correct_demo_schedules_july_2025.json', 'utf8'));
    console.log(`7月のベースデータ: ${julySchedules.length}件`);
    
    // 8月用にデータを変換（日付のみ変更）
    const augustSchedules = julySchedules.map(schedule => {
      // 7月の日付を8月に変換
      const julyDate = new Date(schedule.date);
      const day = julyDate.getDate();
      
      // 8月は31日まであるので、そのまま同じ日に設定
      const augustDate = `2025-08-${day.toString().padStart(2, '0')}`;
      
      return {
        ...schedule,
        date: augustDate,
        memo: schedule.memo?.replace('(', '8月: (') || `8月: ${schedule.csvValue}` // メモに8月表示を追加
      };
    });
    
    console.log(`8月用データ生成完了: ${augustSchedules.length}件`);
    
    // 8月用データファイルに保存
    fs.writeFileSync('artifacts/august_demo_schedules_2025.json', JSON.stringify(augustSchedules, null, 2));
    
    // ステータス別集計
    const statusCount = {};
    augustSchedules.forEach(schedule => {
      statusCount[schedule.status] = (statusCount[schedule.status] || 0) + 1;
    });
    
    console.log('\n=== 8月データ ステータス別集計 ===');
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`${status}: ${count}件`);
    });
    
    // スタッフ別統計
    const staffScheduleCount = {};
    augustSchedules.forEach(schedule => {
      staffScheduleCount[schedule.staffId] = (staffScheduleCount[schedule.staffId] || 0) + 1;
    });
    
    const scheduleCounts = Object.values(staffScheduleCount);
    console.log('\n=== 8月データ スタッフ別予定数統計 ===');
    console.log(`平均予定数/人: ${Math.round(scheduleCounts.reduce((a, b) => a + b, 0) / scheduleCounts.length * 100) / 100}件`);
    console.log(`予定ありスタッフ: ${scheduleCounts.length}人`);
    console.log(`予定なしスタッフ: ${225 - scheduleCounts.length}人`);
    
    console.log('\n✅ 8月用デモデータ生成完了: artifacts/august_demo_schedules_2025.json');
    
    return augustSchedules;
    
  } catch (error) {
    console.error('8月データ作成エラー:', error.message);
    return [];
  }
}

async function registerAugustDemo() {
  try {
    console.log('\n=== 8月デモデータのAPI登録開始 ===');
    
    const augustSchedules = JSON.parse(fs.readFileSync('artifacts/august_demo_schedules_2025.json', 'utf8'));
    console.log(`登録予定: ${augustSchedules.length}件`);
    
    let registerCount = 0;
    let registerErrors = 0;
    
    for (const schedule of augustSchedules) {
      try {
        const pendingData = {
          staffId: schedule.staffId,
          date: schedule.date,
          status: schedule.status, // 英語ステータス名を使用
          start: parseFloat(schedule.startTime.toString()),
          end: parseFloat(schedule.endTime.toString()),
          memo: schedule.memo || `8月月次プランナー申請: ${schedule.csvValue}`,
          pendingType: 'monthly-planner'
        };
        
        const registerResponse = await fetch('http://localhost:3002/api/schedules/pending', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pendingData)
        });
        
        if (registerResponse.ok) {
          registerCount++;
          if (registerCount % 50 === 0) {
            console.log(`登録進捗: ${registerCount}/${augustSchedules.length}`);
          }
        } else {
          registerErrors++;
          if (registerErrors <= 3) {
            const errorText = await registerResponse.text();
            console.log(`❌ 登録エラー: staffId=${pendingData.staffId}, ${errorText.substring(0, 50)}`);
          }
        }
      } catch (error) {
        registerErrors++;
        if (registerErrors <= 3) {
          console.log(`❌ ネットワークエラー: ${error.message}`);
        }
      }
      
      if (registerCount % 25 === 24) {
        await new Promise(resolve => setTimeout(resolve, 30));
      }
    }
    
    console.log('\n=== 8月デモデータ登録完了 ===');
    console.log(`✅ 登録成功: ${registerCount}件`);
    console.log(`❌ 登録失敗: ${registerErrors}件`);
    
    // 最終確認
    console.log('\n--- 8月データ確認 ---');
    const finalResponse = await fetch('http://localhost:3002/api/schedules/pending/monthly-planner?year=2025&month=8');
    const finalData = await finalResponse.json();
    console.log(`8月最終申請数: ${finalData.length}件`);
    
    // スタッフ別の分布確認
    const staffCount = {};
    finalData.forEach(item => {
      staffCount[item.staffId] = (staffCount[item.staffId] || 0) + 1;
    });
    
    const counts = Object.values(staffCount);
    console.log(`対象スタッフ数: ${Object.keys(staffCount).length}人`);
    console.log(`平均予定数/人: ${Math.round(counts.reduce((a, b) => a + b, 0) / counts.length * 100) / 100}件`);
    
    // 重複チェック
    const grouped = {};
    finalData.forEach(item => {
      const date = item.date.split('T')[0];
      const key = `${item.staffId}-${date}`;
      grouped[key] = (grouped[key] || 0) + 1;
    });
    
    const duplicates = Object.values(grouped).filter(count => count > 1).length;
    console.log(`重複マス: ${duplicates}個`);
    
    if (duplicates === 0 && counts.length > 100) {
      console.log('🎉 8月の正しい分布のデモデータ完成！');
    }
    
  } catch (error) {
    console.error('8月データ登録エラー:', error.message);
  }
}

async function main() {
  // 1. 8月用データを生成
  await createAugustDemo();
  
  // 2. APIに登録
  await registerAugustDemo();
}

main();