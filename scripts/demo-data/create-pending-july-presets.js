const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 7月の平日日付を生成（土日を除外）
function getJulyWorkdays(year = 2025) {
  const workdays = [];
  const daysInMonth = new Date(year, 7, 0).getDate(); // 7月の日数
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, 6, day); // 月は0ベース
    const dayOfWeek = date.getDay(); // 0=日曜, 6=土曜
    
    // 土日を除外
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workdays.push({
        date: date,
        dateString: `${year}-07-${day.toString().padStart(2, '0')}`
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

// 1/5の確率でtrueを返す
function shouldAddPreset() {
  return Math.random() < 0.2; // 20% = 1/5の確率
}

// JST基準での日時作成（月次プランナー用）
function createJSTDateTime(dateString, timeString) {
  return new Date(`${dateString}T${timeString}:00+09:00`);
}

async function createPendingJulyPresets() {
  try {
    console.log('=== 7月月次プランナーPendingプリセット作成開始 ===');
    
    // 既存のJST版ランダム設定を削除
    const deleteResult = await prisma.adjustment.deleteMany({
      where: {
        memo: {
          contains: '（JST版ランダム設定）'
        }
      }
    });
    
    console.log(`既存JST版データ削除: ${deleteResult.count}件`);
    
    // 全スタッフを取得
    const staff = await prisma.staff.findMany({
      where: { isActive: true },
      select: { id: true, name: true, empNo: true }
    });
    
    console.log(`対象スタッフ: ${staff.length}名`);
    
    // 7月の平日を取得
    const workdays = getJulyWorkdays(2025);
    console.log(`7月の平日: ${workdays.length}日間`);
    
    let totalSlots = staff.length * workdays.length;
    let addedCount = 0;
    const presetStats = {};
    
    console.log(`\n=== Pendingプリセット作成開始（1/5確率・正式フロー） ===`);
    console.log(`総スロット数: ${totalSlots}`);
    console.log(`期待設定数: 約${Math.round(totalSlots * 0.2)}件`);
    
    // 各スタッフ × 各日付の組み合わせでランダム処理
    for (const staffMember of staff) {
      console.log(`\n処理中: ${staffMember.name} (ID: ${staffMember.id})`);
      
      for (const workday of workdays) {
        if (shouldAddPreset()) {
          const preset = getRandomPreset();
          
          try {
            // PendingScheduleとして作成（月次プランナー正式フロー）
            const pendingSchedule = await prisma.adjustment.create({
              data: {
                staffId: staffMember.id,
                date: createJSTDateTime(workday.dateString, '00:00'),
                status: preset.status,
                start: createJSTDateTime(workday.dateString, preset.start),
                end: createJSTDateTime(workday.dateString, preset.end),
                memo: `${preset.name}（月次プランナーテスト）`,
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
            
            console.log(`  ✅ ${workday.dateString}: ${preset.name} (Pending ID: ${pendingSchedule.id})`);
            
          } catch (error) {
            console.log(`  ❌ ${workday.dateString}: ${preset.name} - エラー: ${error.message}`);
          }
        }
      }
    }
    
    console.log(`\n=== Pendingプリセット作成完了 ===`);
    console.log(`設定完了: ${addedCount}件 / ${totalSlots}件 (${((addedCount / totalSlots) * 100).toFixed(1)}%)`);
    
    console.log(`\n=== プリセット別統計 ===`);
    Object.entries(presetStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([preset, count]) => {
        console.log(`${preset}: ${count}件`);
      });
    
    // 月次プランナー用pending API確認
    console.log(`\n=== 月次プランナーでの表示確認 ===`);
    const pendingForMonthly = await prisma.adjustment.findMany({
      where: {
        date: {
          gte: new Date('2025-07-01'),
          lt: new Date('2025-08-01')
        },
        isPending: true,
        pendingType: 'monthly-planner'
      },
      include: {
        Staff: { select: { name: true } }
      },
      take: 10
    });
    
    console.log(`月次プランナー用Pending: ${pendingForMonthly.length}件`);
    pendingForMonthly.forEach(pending => {
      const dateStr = pending.date.toISOString().split('T')[0];
      const startTime = pending.start.toISOString().split('T')[1].substring(0, 5);
      const endTime = pending.end.toISOString().split('T')[1].substring(0, 5);
      console.log(`  ${dateStr} ${pending.Staff.name}: ${pending.status} (${startTime}-${endTime}) - ${pending.memo}`);
    });
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createPendingJulyPresets();