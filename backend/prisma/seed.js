const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 テストデータベース初期化中...');

  // 🚨🚨🚨 【重要警告】全データベース完全削除実行中 🚨🚨🚨
  console.log('🚨🚨🚨 データベース完全リセット開始 🚨🚨🚨');
  console.log('🗑️  全スタッフデータ（225人分含む）を完全削除します');
  console.log('🗑️  全スケジュール・契約データを完全削除します');
  console.log('⚠️  この操作は取り消せません！');
  await prisma.adjustment.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.contractDisplayCache.deleteMany(); // 外部キー制約対応
  await prisma.temporaryAssignment.deleteMany();
  await prisma.dailyAssignment.deleteMany();
  await prisma.departmentSettings.deleteMany();
  await prisma.staff.deleteMany();
  console.log('✅ データベース完全削除完了');

  // テスト用スタッフデータ作成
  console.log('スタッフデータ作成中...');
  const staffData = [
    { empNo: "1001", name: "田中太郎", department: "システム部", group: "開発グループ", workArrangement: "出社" },
    { empNo: "1002", name: "佐藤花子", department: "システム部", group: "運用グループ", workArrangement: "リモート" },
    { empNo: "1003", name: "山田次郎", department: "営業部", group: "営業一課", workArrangement: "出社" },
    { empNo: "1004", name: "鈴木美咲", department: "営業部", group: "営業二課", workArrangement: "ハイブリッド" },
    { empNo: "1005", name: "高橋健太", department: "経理部", group: "会計グループ", workArrangement: "出社" },
    { empNo: "1006", name: "渡辺雅子", department: "経理部", group: "財務グループ", workArrangement: "リモート" },
    { empNo: "1007", name: "中村慎也", department: "人事部", group: "採用グループ", workArrangement: "出社" },
    { empNo: "1008", name: "小林知美", department: "人事部", group: "労務グループ", workArrangement: "ハイブリッド" },
  ];

  const createdStaff = [];
  for (const staff of staffData) {
    const createdRecord = await prisma.staff.create({
      data: staff
    });
    createdStaff.push(createdRecord);
  }

  // 部署設定作成
  console.log('部署設定作成中...');
  const departmentSettings = [
    // 部署: 彩度キープ×明度アップ = 淡いパステル調
    { type: 'department', name: 'システム部', backgroundColor: '#8BB5F7', displayOrder: 10 },    // 淡い青 (明度78%, 彩度75%)
    { type: 'department', name: '営業部', backgroundColor: '#7DDDB5', displayOrder: 20 },        // 淡い緑 (明度75%, 彩度70%)
    { type: 'department', name: '経理部', backgroundColor: '#F7C574', displayOrder: 30 },        // 淡い金 (明度80%, 彩度75%)
    { type: 'department', name: '人事部', backgroundColor: '#F79999', displayOrder: 40 },        // 淡い赤 (明度78%, 彩度72%)
    
    // グループ: より淡めで統一感を保持
    { type: 'group', name: '開発グループ', backgroundColor: '#C4B5F7', displayOrder: 10 },      // 淡い紫 (明度80%, 彩度68%)
    { type: 'group', name: '運用グループ', backgroundColor: '#7DD3F0', displayOrder: 20 },      // 淡い水色 (明度78%, 彩度70%)
    { type: 'group', name: '営業一課', backgroundColor: '#B8E673', displayOrder: 10 },          // 淡い黄緑 (明度80%, 彩度72%)
    { type: 'group', name: '営業二課', backgroundColor: '#99E6B3', displayOrder: 20 },          // 淡い薄緑 (明度78%, 彩度68%)
    { type: 'group', name: '会計グループ', backgroundColor: '#F7B574', displayOrder: 10 },      // 淡いオレンジ (明度78%, 彩度75%)
    { type: 'group', name: '財務グループ', backgroundColor: '#E6D973', displayOrder: 20 },      // 淡いベージュ (明度78%, 彩度70%)
    { type: 'group', name: '採用グループ', backgroundColor: '#F7B5E6', displayOrder: 10 },      // 淡いピンク (明度80%, 彩度65%)
    { type: 'group', name: '労務グループ', backgroundColor: '#E6B5CC', displayOrder: 20 },      // 淡いローズ (明度75%, 彩度60%)
  ];

  for (const setting of departmentSettings) {
    await prisma.departmentSettings.create({
      data: setting
    });
  }

  // 契約データ作成（基本勤務時間）
  console.log('契約データ作成中...');
  const contractData = [
    {
      empNo: "1001", name: "田中太郎", dept: "システム部", team: "開発グループ", email: "tanaka@company.com",
      mondayHours: "09:00-18:00", tuesdayHours: "09:00-18:00", wednesdayHours: "09:00-18:00",
      thursdayHours: "09:00-18:00", fridayHours: "09:00-18:00", staffId: createdStaff[0].id
    },
    {
      empNo: "1002", name: "佐藤花子", dept: "システム部", team: "運用グループ", email: "sato@company.com",
      mondayHours: "10:00-19:00", tuesdayHours: "10:00-19:00", wednesdayHours: "10:00-19:00",
      thursdayHours: "10:00-19:00", fridayHours: "10:00-19:00", staffId: createdStaff[1].id
    },
    {
      empNo: "1003", name: "山田次郎", dept: "営業部", team: "営業一課", email: "yamada@company.com",
      mondayHours: "08:30-17:30", tuesdayHours: "08:30-17:30", wednesdayHours: "08:30-17:30",
      thursdayHours: "08:30-17:30", fridayHours: "08:30-17:30", staffId: createdStaff[2].id
    },
    {
      empNo: "1004", name: "鈴木美咲", dept: "営業部", team: "営業二課", email: "suzuki@company.com",
      mondayHours: "09:00-18:00", tuesdayHours: "09:00-18:00", wednesdayHours: "09:00-18:00",
      thursdayHours: "09:00-18:00", fridayHours: "09:00-18:00", staffId: createdStaff[3].id
    },
    {
      empNo: "1005", name: "高橋健太", dept: "経理部", team: "会計グループ", email: "takahashi@company.com",
      mondayHours: "09:30-18:30", tuesdayHours: "09:30-18:30", wednesdayHours: "09:30-18:30",
      thursdayHours: "09:30-18:30", fridayHours: "09:30-18:30", staffId: createdStaff[4].id
    },
    {
      empNo: "1006", name: "渡辺雅子", dept: "経理部", team: "財務グループ", email: "watanabe@company.com",
      mondayHours: "08:00-17:00", tuesdayHours: "08:00-17:00", wednesdayHours: "08:00-17:00",
      thursdayHours: "08:00-17:00", fridayHours: "08:00-17:00", staffId: createdStaff[5].id
    },
    {
      empNo: "1007", name: "中村慎也", dept: "人事部", team: "採用グループ", email: "nakamura@company.com",
      mondayHours: "09:00-18:00", tuesdayHours: "09:00-18:00", wednesdayHours: "09:00-18:00",
      thursdayHours: "09:00-18:00", fridayHours: "09:00-18:00", staffId: createdStaff[6].id
    },
    {
      empNo: "1008", name: "小林知美", dept: "人事部", team: "労務グループ", email: "kobayashi@company.com",
      mondayHours: "10:00-19:00", tuesdayHours: "10:00-19:00", wednesdayHours: "10:00-19:00",
      thursdayHours: "10:00-19:00", fridayHours: "10:00-19:00", staffId: createdStaff[7].id
    },
  ];

  for (const contract of contractData) {
    await prisma.contract.create({
      data: contract
    });
  }

  // 調整データ作成（個別スケジュール） - 今日の日付で作成（JST基準）
  console.log('調整データ作成中...');
  const today = new Date();
  const jstToday = new Date(today.getTime() + 9 * 60 * 60 * 1000); // JST変換
  const todayStr = jstToday.toISOString().split('T')[0];
  console.log(`📅 データ作成日付: ${todayStr} (JST基準)`);
  
  // UTC時刻でのスケジュール作成（JST基準時間 - 9時間）
  const adjustmentData = [
    {
      date: new Date(todayStr),
      status: 'online',
      start: new Date(`${todayStr}T00:00:00Z`), // JST 9:00
      end: new Date(`${todayStr}T09:00:00Z`),   // JST 18:00
      memo: '通常業務',
      staffId: createdStaff[0].id
    },
    {
      date: new Date(todayStr),
      status: 'meeting',
      start: new Date(`${todayStr}T01:00:00Z`), // JST 10:00
      end: new Date(`${todayStr}T03:00:00Z`),   // JST 12:00
      memo: '朝会',
      staffId: createdStaff[0].id
    },
    {
      date: new Date(todayStr),
      status: 'remote',
      start: new Date(`${todayStr}T01:00:00Z`), // JST 10:00
      end: new Date(`${todayStr}T10:00:00Z`),   // JST 19:00
      memo: 'リモート作業',
      staffId: createdStaff[1].id
    },
    {
      date: new Date(todayStr),
      status: 'training',
      start: new Date(`${todayStr}T04:00:00Z`), // JST 13:00
      end: new Date(`${todayStr}T06:00:00Z`),   // JST 15:00
      memo: '技術研修',
      staffId: createdStaff[1].id
    },
    {
      date: new Date(todayStr),
      status: 'online',
      start: new Date(`${todayStr}T23:30:00Z`), // JST 8:30 (前日分なので +1日)
      end: new Date(`${todayStr}T08:30:00Z`),   // JST 17:30
      memo: '営業活動',
      staffId: createdStaff[2].id
    },
    {
      date: new Date(todayStr),
      status: 'off',
      start: new Date(`${todayStr}T00:00:00Z`), // JST 9:00
      end: new Date(`${todayStr}T09:00:00Z`),   // JST 18:00
      memo: '有給休暇',
      staffId: createdStaff[3].id
    },
  ];

  for (const adjustment of adjustmentData) {
    await prisma.adjustment.create({
      data: {
        ...adjustment,
        updatedAt: new Date()
      }
    });
  }

  // 支援設定作成
  console.log('支援設定作成中...');
  await prisma.temporaryAssignment.create({
    data: {
      staffId: createdStaff[0].id, // 田中太郎
      startDate: new Date(todayStr),
      endDate: new Date(new Date(todayStr).getTime() + 2 * 24 * 60 * 60 * 1000), // 2日後
      tempDept: "営業部",
      tempGroup: "営業一課",
      reason: "プロジェクト支援",
      updatedAt: new Date()
    }
  });

  // 担当設定作成
  console.log('担当設定作成中...');
  await prisma.dailyAssignment.createMany({
    data: [
      {
        staffId: createdStaff[1].id, // 佐藤花子
        date: new Date(todayStr),
        assignmentType: 'fax',
        customLabel: null,
        updatedAt: new Date()
      },
      {
        staffId: createdStaff[2].id, // 山田次郎
        date: new Date(todayStr),
        assignmentType: 'subjectCheck',
        customLabel: null,
        updatedAt: new Date()
      },
      {
        staffId: createdStaff[3].id, // 鈴木美咲
        date: new Date(todayStr),
        assignmentType: 'custom',
        customLabel: '来客対応',
        updatedAt: new Date()
      }
    ]
  });

  // 契約表示キャッシュ生成
  console.log('契約表示キャッシュ生成中...');
  
  // 現在日時から3ヶ月分のキャッシュを生成
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  // 3ヶ月分（現在月含む）
  const monthsToGenerate = [
    { year: currentYear, month: currentMonth },
    { year: currentMonth === 12 ? currentYear + 1 : currentYear, month: currentMonth === 12 ? 1 : currentMonth + 1 },
    { year: currentMonth >= 11 ? currentYear + 1 : currentYear, month: currentMonth >= 11 ? currentMonth - 10 : currentMonth + 2 }
  ];
  
  const cacheEntries = [];
  
  for (const { year, month } of monthsToGenerate) {
    // その月の日数を取得
    const daysInMonth = new Date(year, month, 0).getDate();
    
    for (const staff of createdStaff) {
      // スタッフの契約データを取得
      const contract = await prisma.contract.findFirst({
        where: { staffId: staff.id }
      });
      
      if (contract) {
        // 各日についてキャッシュエントリを生成
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month - 1, day);
          const dayOfWeek = date.getDay(); // 0=日曜日, 1=月曜日, ...
          
          // 曜日に対応する勤務時間を取得
          const dayKeys = ['sundayHours', 'mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours', 'fridayHours', 'saturdayHours'];
          const workHours = contract[dayKeys[dayOfWeek]];
          
          // 勤務時間が設定されているかチェック
          const hasContract = !!(workHours && workHours !== '' && workHours !== null);
          
          cacheEntries.push({
            staffId: staff.id,
            year: year,
            month: month,
            day: day,
            hasContract: hasContract
          });
        }
      }
    }
  }
  
  // バルクインサート
  if (cacheEntries.length > 0) {
    await prisma.contractDisplayCache.createMany({
      data: cacheEntries,
      skipDuplicates: true
    });
  }
  
  console.log(`✅ 契約表示キャッシュ生成完了: ${cacheEntries.length}件`);

  // 昼休み（break）自動追加
  console.log('昼休み（break）データ生成中...');
  
  const breakEntries = [];
  
  for (const { year, month } of monthsToGenerate) {
    const daysInMonth = new Date(year, month, 0).getDate();
    
    for (const staff of createdStaff) {
      const contract = await prisma.contract.findFirst({
        where: { staffId: staff.id }
      });
      
      if (contract) {
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month - 1, day);
          const dayOfWeek = date.getDay();
          
          // 曜日に対応する勤務時間を確認
          const dayKeys = ['sundayHours', 'mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours', 'fridayHours', 'saturdayHours'];
          const workHours = contract[dayKeys[dayOfWeek]];
          
          // 勤務時間がある日のみ昼休みを追加
          if (workHours && workHours !== '' && workHours !== null) {
            const dateStr = date.toISOString().split('T')[0];
            
            breakEntries.push({
              staffId: staff.id,
              date: date,
              status: 'break',
              start: new Date(`${dateStr}T03:00:00.000Z`), // JST 12:00 = UTC 03:00
              end: new Date(`${dateStr}T04:00:00.000Z`),   // JST 13:00 = UTC 04:00
              memo: '昼休み（シードデータ自動生成）',
              reason: 'シードデータ生成',
              isPending: false,
              updatedAt: new Date()
            });
          }
        }
      }
    }
  }
  
  // 昼休みデータをバルクインサート
  if (breakEntries.length > 0) {
    await prisma.adjustment.createMany({
      data: breakEntries,
      skipDuplicates: true
    });
  }
  
  console.log(`✅ 昼休み（break）生成完了: ${breakEntries.length}件`);

  console.log('✅ テストデータ準備完了');
  console.log(`作成されたデータ:`);
  console.log(`- スタッフ: ${createdStaff.length}名`);
  console.log(`- 部署設定: ${departmentSettings.length}件`);
  console.log(`- 契約データ: ${contractData.length}件`);
  console.log(`- 調整データ: ${adjustmentData.length}件`);
  console.log(`- 支援設定: 1件`);
  console.log(`- 担当設定: 3件`);
  console.log(`- 契約表示キャッシュ: ${cacheEntries.length}件`);
  console.log(`- 昼休み（break）: ${breakEntries.length}件`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('シードデータ作成エラー:', e);
    await prisma.$disconnect();
    process.exit(1);
  });