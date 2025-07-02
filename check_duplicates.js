const fs = require('fs');

async function checkDuplicates() {
  try {
    const response = await fetch('http://localhost:3002/api/schedules/pending/monthly-planner?year=2025&month=7');
    const data = await response.json();

    // 同じスタッフID + 同じ日付のグループを作成
    const grouped = {};
    data.forEach(item => {
      const date = item.date.split('T')[0];
      const key = `${item.staffId}-${date}`;
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });

    console.log('=== 重複申請の確認 ===');
    console.log(`総申請数: ${data.length}`);
    console.log(`ユニークなマス数: ${Object.keys(grouped).length}`);

    // 重複があるものを表示
    const duplicates = Object.entries(grouped).filter(([key, items]) => items.length > 1);

    console.log(`重複しているマス: ${duplicates.length}個`);

    if (duplicates.length > 0) {
      console.log('\n=== 重複例（最初の5件） ===');
      duplicates.slice(0, 5).forEach(([key, items]) => {
        const [staffId, date] = key.split('-');
        console.log(`\nスタッフID: ${staffId}, 日付: ${date} (重複数: ${items.length})`);
        items.forEach((item, index) => {
          console.log(`  ${index + 1}. ID:${item.id}, ステータス:${item.status}, 時間:${item.start}-${item.end}`);
          console.log(`     メモ:${item.memo || 'なし'}`);
        });
      });
      
      console.log(`\n最大重複数: ${Math.max(...duplicates.map(([key, items]) => items.length))}`);
      
      // 重複の統計
      const duplicateStats = {};
      duplicates.forEach(([key, items]) => {
        const count = items.length;
        duplicateStats[count] = (duplicateStats[count] || 0) + 1;
      });
      
      console.log('\n=== 重複数別統計 ===');
      Object.entries(duplicateStats).forEach(([count, frequency]) => {
        console.log(`${count}重複: ${frequency}マス`);
      });
    }

  } catch (error) {
    console.error('Error checking duplicates:', error.message);
  }
}

checkDuplicates();