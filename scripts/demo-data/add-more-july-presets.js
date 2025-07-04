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

// 約20%の確率でtrueを返す（目標密度に向けて調整）
function shouldAddPreset() {
  return Math.random() < 0.2; // 20% = 1/5の確率
}

// JST基準での日時作成（月次プランナー用）
function createJSTDateTime(dateString, timeString) {
  return new Date(`${dateString}T${timeString}:00+09:00`);
}

async function addMoreJulyPresets() {
  try {
    console.log('=== 7月月次プランナー追加Pendingプリセット作成開始 ===');
    
    // 現在の件数確認
    const currentCount = await prisma.adjustment.count({
      where: {
        date: {
          gte: new Date('2025-07-01'),
          lt: new Date('2025-08-01')
        },
        isPending: true,
        pendingType: 'monthly-planner'
      }
    });
    
    console.log(`現在の7月Pendingスケジュール: ${currentCount}件`);
    
    // 目標密度は20%（約1035件）
    const targetCount = Math.round(225 * 23 * 0.2); // 1035件
    const needed = Math.max(0, targetCount - currentCount);
    
    console.log(`目標: ${targetCount}件（20%密度）`);
    console.log(`追加必要: ${needed}件`);
    
    if (needed === 0) {
      console.log('既に十分な数のプリセットが存在します。');
      return;
    }
    
    // 全スタッフを取得
    const staff = await prisma.staff.findMany({
      where: { isActive: true },
      select: { id: true, name: true, empNo: true }
    });
    
    console.log(`対象スタッフ: ${staff.length}名`);
    
    // 7月の平日を取得
    const workdays = getJulyWorkdays(2025);
    console.log(`7月の平日: ${workdays.length}日間`);
    
    // 既存のスケジュールを取得して重複を避ける
    const existingSchedules = await prisma.adjustment.findMany({
      where: {
        date: {
          gte: new Date('2025-07-01'),
          lt: new Date('2025-08-01')
        },
        isPending: true,
        pendingType: 'monthly-planner'
      },
      select: {
        staffId: true,
        date: true
      }
    });
    
    // 既存のキーセットを作成
    const existingKeys = new Set(
      existingSchedules.map(s => `${s.staffId}-${s.date.toISOString().split('T')[0]}`)
    );
    
    console.log(`既存スケジュール: ${existingKeys.size}件の重複チェック用キー`);
    
    let addedCount = 0;
    const presetStats = {};
    let attempts = 0;
    const maxAttempts = needed * 2; // 十分な試行回数
    
    console.log(`\n=== 追加Pendingプリセット作成開始 ===`);
    
    // 指定件数に達するまでランダム生成を続ける
    while (addedCount < needed && attempts < maxAttempts) {
      attempts++;
      
      // ランダムにスタッフと日付を選択
      const randomStaff = staff[Math.floor(Math.random() * staff.length)];
      const randomWorkday = workdays[Math.floor(Math.random() * workdays.length)];
      
      const key = `${randomStaff.id}-${randomWorkday.dateString}`;
      
      // 重複チェック
      if (existingKeys.has(key)) {
        continue; // 既に存在する組み合わせはスキップ
      }
      
      const preset = getRandomPreset();
      
      try {
        // PendingScheduleとして作成
        const pendingSchedule = await prisma.adjustment.create({
          data: {
            staffId: randomStaff.id,
            date: createJSTDateTime(randomWorkday.dateString, '00:00'),
            status: preset.status,
            start: createJSTDateTime(randomWorkday.dateString, preset.start),
            end: createJSTDateTime(randomWorkday.dateString, preset.end),
            memo: `${preset.name}（追加ランダム設定）`,
            isPending: true, // 承認待ちとして作成
            pendingType: 'monthly-planner', // 月次プランナー由来
            approvedAt: null, // 未承認
            approvedBy: null,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        // 重複チェック用セットに追加
        existingKeys.add(key);
        
        addedCount++;
        presetStats[preset.name] = (presetStats[preset.name] || 0) + 1;
        
        if (addedCount % 100 === 0) {
          console.log(`  進捗: ${addedCount}/${needed}件追加完了`);
        }
        
      } catch (error) {
        // 重複やその他のエラーをスキップ
        continue;
      }
    }
    
    console.log(`\n=== 追加Pendingプリセット作成完了 ===`);
    console.log(`追加完了: ${addedCount}件`);
    console.log(`試行回数: ${attempts}回`);
    
    // 最終統計
    const finalCount = await prisma.adjustment.count({
      where: {
        date: {
          gte: new Date('2025-07-01'),
          lt: new Date('2025-08-01')
        },
        isPending: true,
        pendingType: 'monthly-planner'
      }
    });
    
    const finalDensity = ((finalCount / (225 * 23)) * 100).toFixed(1);
    
    console.log(`最終件数: ${finalCount}件`);
    console.log(`最終密度: ${finalDensity}%`);
    
    console.log(`\n=== 追加プリセット別統計 ===`);
    Object.entries(presetStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([preset, count]) => {
        console.log(`${preset}: ${count}件`);
      });
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addMoreJulyPresets();