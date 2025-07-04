const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 正しい7月の平日日付を生成（土日を除外）
function getJulyWorkdays(year = 2025) {
  const workdays = [];
  const daysInMonth = new Date(year, 7, 0).getDate(); // 7月の日数
  
  for (let day = 1; day <= daysInMonth; day++) {
    // UTC基準で日付を作成して曜日を正確に判定
    const date = new Date(Date.UTC(year, 6, day)); // 月は0ベース、UTC基準
    const dayOfWeek = date.getUTCDay(); // 0=日曜, 6=土曜
    
    // 土日を除外
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workdays.push({
        date: date,
        dateString: `${year}-07-${day.toString().padStart(2, '0')}`,
        dayOfWeek: dayOfWeek,
        dayName: ['日', '月', '火', '水', '木', '金', '土'][dayOfWeek]
      });
    }
  }
  
  return workdays;
}

// 利用可能なプリセット
const availablePresets = [
  { id: 'standard-work', name: '標準勤務', start: '09:00', end: '18:00', status: 'online' },
  { id: 'remote-work', name: '在宅勤務', start: '09:00', end: '18:00', status: 'remote' },
  { id: 'early-work', name: '早番勤務', start: '08:00', end: '17:00', status: 'online' },
  { id: 'late-work', name: '遅番勤務', start: '10:00', end: '19:00', status: 'online' },
  { id: 'short-time-work', name: '時短勤務', start: '10:00', end: '15:00', status: 'online' },
  { id: 'morning-off', name: '午前休', start: '13:00', end: '18:00', status: 'off' },
  { id: 'afternoon-off', name: '午後休', start: '09:00', end: '13:00', status: 'off' },
  { id: 'full-day-off', name: '終日休み', start: '09:00', end: '18:00', status: 'off' }
];

// ランダム選択関数
function getRandomPreset() {
  const randomIndex = Math.floor(Math.random() * availablePresets.length);
  return availablePresets[randomIndex];
}

// 正しいUTC日付作成（日付部分のみ）
function createCorrectUTCDate(dateString) {
  return new Date(`${dateString}T00:00:00.000Z`);
}

// 正しいJST時刻をUTCに変換
function createCorrectJSTDateTime(dateString, timeString) {
  return new Date(`${dateString}T${timeString}:00+09:00`);
}

async function createCorrectJulyPresets() {
  try {
    console.log('=== 正しい7月月次プランナーPendingプリセット作成開始 ===');
    
    // 既存の7月データをクリア
    const deleteResult = await prisma.adjustment.deleteMany({
      where: {
        date: {
          gte: new Date('2025-07-01T00:00:00.000Z'),
          lt: new Date('2025-08-01T00:00:00.000Z')
        },
        isPending: true,
        pendingType: 'monthly-planner'
      }
    });
    
    console.log(`既存データ削除: ${deleteResult.count}件`);
    
    // 全スタッフを取得
    const staff = await prisma.staff.findMany({
      where: { isActive: true },
      select: { id: true, name: true, empNo: true }
    });
    
    console.log(`対象スタッフ: ${staff.length}名`);
    
    // 7月の平日を取得（正確な曜日判定）
    const workdays = getJulyWorkdays(2025);
    console.log(`7月の平日: ${workdays.length}日間`);
    
    // 平日の詳細を表示
    console.log('平日一覧:');
    workdays.forEach(wd => {
      console.log(`  ${wd.dateString} (${wd.dayName}曜日)`);
    });
    
    let totalSlots = staff.length * workdays.length;
    let addedCount = 0;
    const presetStats = {};
    const targetDensity = 0.2; // 20% = 1/5
    
    console.log(`\n=== 正しいPendingプリセット作成開始（1/5確率） ===`);
    console.log(`総スロット数: ${totalSlots}`);
    console.log(`期待設定数: 約${Math.round(totalSlots * targetDensity)}件`);
    
    // 各スタッフ × 各平日の組み合わせでランダム処理
    for (const staffMember of staff) {
      for (const workday of workdays) {
        // 1/5の確率でプリセットを追加
        if (Math.random() < targetDensity) {
          const preset = getRandomPreset();
          
          try {
            // PendingScheduleとして作成（正しい日付処理）
            const pendingSchedule = await prisma.adjustment.create({
              data: {
                staffId: staffMember.id,
                date: createCorrectUTCDate(workday.dateString), // 正しいUTC日付
                status: preset.status,
                start: createCorrectJSTDateTime(workday.dateString, preset.start), // JSTをUTCに変換
                end: createCorrectJSTDateTime(workday.dateString, preset.end),
                memo: `${preset.name}（正しい月次プランナー設定）`,
                isPending: true, // 承認待ちとして作成
                pendingType: 'monthly-planner', // 月次プランナー由来
                approvedAt: null, // 未承認
                approvedBy: null,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
            
            addedCount++;
            presetStats[preset.name] = (presetStats[preset.name] || 0) + 1;
            
          } catch (error) {
            console.log(`  ❌ ${workday.dateString}: ${preset.name} - エラー: ${error.message}`);
          }
        }
      }
      
      if (staffMember.id % 50 === 0) {
        console.log(`  進捗: スタッフID ${staffMember.id}まで処理完了（現在${addedCount}件）`);
      }
    }
    
    console.log(`\n=== 正しいPendingプリセット作成完了 ===`);
    console.log(`設定完了: ${addedCount}件 / ${totalSlots}件 (${((addedCount / totalSlots) * 100).toFixed(1)}%)`);
    
    console.log(`\n=== プリセット別統計 ===`);
    Object.entries(presetStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([preset, count]) => {
        console.log(`${preset}: ${count}件`);
      });
    
    // 曜日別分布確認
    const createdSchedules = await prisma.adjustment.findMany({
      where: {
        date: {
          gte: new Date('2025-07-01T00:00:00.000Z'),
          lt: new Date('2025-08-01T00:00:00.000Z')
        },
        isPending: true,
        pendingType: 'monthly-planner'
      },
      select: {
        date: true
      }
    });
    
    const dayCount = [0, 0, 0, 0, 0, 0, 0]; // 日月火水木金土
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    
    createdSchedules.forEach(s => {
      const dayOfWeek = new Date(s.date).getUTCDay();
      dayCount[dayOfWeek]++;
    });
    
    console.log('\n=== 作成後の曜日別分布確認 ===');
    dayNames.forEach((name, index) => {
      console.log(`${name}曜日: ${dayCount[index]}件`);
    });
    
    // 土日チェック
    const weekendCount = dayCount[0] + dayCount[6];
    if (weekendCount > 0) {
      console.log(`\n⚠️  土日に${weekendCount}件のスケジュールが作成されています！`);
    } else {
      console.log(`\n✅ 土日にスケジュールは作成されていません。`);
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createCorrectJulyPresets();