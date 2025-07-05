// 7月4日-31日、8月1日-31日期間の担当設定生成スクリプト
const fs = require('fs');

// 対象期間の平日を生成
function getWeekdaysInRange(startDate, endDate) {
  const weekdays = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    // 月曜日(1)から金曜日(5)まで
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      weekdays.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  
  return weekdays;
}

// 日付をYYYY-MM-DD形式でフォーマット
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// スタッフIDの範囲（実際のデータベースに基づく：226-450）
const STAFF_IDS = Array.from({ length: 225 }, (_, i) => i + 226);

// ランダムにスタッフを選択（重複なし）
function selectRandomStaff(excludeIds = []) {
  const availableIds = STAFF_IDS.filter(id => !excludeIds.includes(id));
  return availableIds[Math.floor(Math.random() * availableIds.length)];
}

function generateResponsibilityData() {
  console.log('🎯 担当設定データ生成開始');
  
  // 対象期間の平日を取得
  const julyWeekdays = getWeekdaysInRange(new Date('2025-07-04'), new Date('2025-07-31'));
  const augustWeekdays = getWeekdaysInRange(new Date('2025-08-01'), new Date('2025-08-31'));
  const allWeekdays = [...julyWeekdays, ...augustWeekdays];
  
  console.log(`📅 対象平日数: ${allWeekdays.length}日`);
  console.log(`📅 7月平日: ${julyWeekdays.length}日, 8月平日: ${augustWeekdays.length}日`);
  
  const responsibilities = [];
  
  // 各平日に対して担当を割り当て
  allWeekdays.forEach(date => {
    const dateStr = formatDate(date);
    const usedStaffIds = []; // 同日重複防止用
    
    // FAX当番を1名ランダム選択
    const faxStaffId = selectRandomStaff(usedStaffIds);
    usedStaffIds.push(faxStaffId);
    
    responsibilities.push({
      staffId: faxStaffId,
      date: dateStr,
      responsibilities: ['FAX当番']
    });
    
    // 件名チェック担当を1名ランダム選択（FAX当番と重複なし）
    const subjectCheckStaffId = selectRandomStaff(usedStaffIds);
    usedStaffIds.push(subjectCheckStaffId);
    
    responsibilities.push({
      staffId: subjectCheckStaffId,
      date: dateStr,
      responsibilities: ['件名チェック担当']
    });
    
    console.log(`📋 ${dateStr}: FAX(ID:${faxStaffId}), 件名チェック(ID:${subjectCheckStaffId})`);
  });
  
  console.log(`✅ 担当設定生成完了: ${responsibilities.length}件`);
  
  // 統計情報
  const faxCount = responsibilities.filter(r => r.responsibilities.includes('FAX当番')).length;
  const subjectCheckCount = responsibilities.filter(r => r.responsibilities.includes('件名チェック担当')).length;
  
  console.log('📊 生成統計:');
  console.log(`  - FAX当番: ${faxCount}件`);
  console.log(`  - 件名チェック担当: ${subjectCheckCount}件`);
  console.log(`  - 合計: ${responsibilities.length}件`);
  
  return responsibilities;
}

// データ生成・保存
function main() {
  try {
    const responsibilities = generateResponsibilityData();
    
    // ファイルに保存
    const outputFile = 'demo_responsibility_july_august.json';
    fs.writeFileSync(outputFile, JSON.stringify({
      responsibilities,
      metadata: {
        generatedAt: new Date().toISOString(),
        period: '2025-07-04 to 2025-08-31 (weekdays only)',
        totalCount: responsibilities.length,
        distribution: {
          fax: responsibilities.filter(r => r.responsibilities.includes('FAX当番')).length,
          subjectCheck: responsibilities.filter(r => r.responsibilities.includes('件名チェック担当')).length
        }
      }
    }, null, 2));
    
    console.log(`💾 データファイル保存完了: ${outputFile}`);
    console.log('🎉 担当設定データ生成完了！');
    
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

// 実行
if (require.main === module) {
  main();
}

module.exports = { generateResponsibilityData };