const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 テストデータベース初期化中...');

  // 既存データクリア（依存関係を考慮した順序）
  console.log('既存データをクリア中...');
  await prisma.adjustment.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.temporaryAssignment.deleteMany();
  await prisma.dailyAssignment.deleteMany();
  await prisma.departmentSettings.deleteMany();
  await prisma.staff.deleteMany();

  // テスト用スタッフデータ作成
  console.log('スタッフデータ作成中...');
  const staffData = [
    { empNo: "1001", name: "田中太郎", department: "システム部", group: "開発グループ" },
    { empNo: "1002", name: "佐藤花子", department: "システム部", group: "運用グループ" },
    { empNo: "1003", name: "山田次郎", department: "営業部", group: "営業一課" },
    { empNo: "1004", name: "鈴木美咲", department: "営業部", group: "営業二課" },
    { empNo: "1005", name: "高橋健太", department: "経理部", group: "会計グループ" },
    { empNo: "1006", name: "渡辺雅子", department: "経理部", group: "財務グループ" },
    { empNo: "1007", name: "中村慎也", department: "人事部", group: "採用グループ" },
    { empNo: "1008", name: "小林知美", department: "人事部", group: "労務グループ" },
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
    { type: 'department', name: 'システム部', backgroundColor: '#3B82F6', displayOrder: 10 },
    { type: 'department', name: '営業部', backgroundColor: '#10B981', displayOrder: 20 },
    { type: 'department', name: '経理部', backgroundColor: '#F59E0B', displayOrder: 30 },
    { type: 'department', name: '人事部', backgroundColor: '#EF4444', displayOrder: 40 },
    { type: 'group', name: '開発グループ', backgroundColor: '#8B5CF6', displayOrder: 10 },
    { type: 'group', name: '運用グループ', backgroundColor: '#06B6D4', displayOrder: 20 },
    { type: 'group', name: '営業一課', backgroundColor: '#84CC16', displayOrder: 10 },
    { type: 'group', name: '営業二課', backgroundColor: '#22C55E', displayOrder: 20 },
    { type: 'group', name: '会計グループ', backgroundColor: '#F97316', displayOrder: 10 },
    { type: 'group', name: '財務グループ', backgroundColor: '#EAB308', displayOrder: 20 },
    { type: 'group', name: '採用グループ', backgroundColor: '#F43F5E', displayOrder: 10 },
    { type: 'group', name: '労務グループ', backgroundColor: '#EC4899', displayOrder: 20 },
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

  // 調整データ作成（個別スケジュール） - 今日の日付で作成
  console.log('調整データ作成中...');
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // UTC時刻でのスケジュール作成（JST基準時間 - 9時間）
  const adjustmentData = [
    {
      date: new Date(todayStr),
      status: 'Online',
      start: new Date(`${todayStr}T00:00:00Z`), // JST 9:00
      end: new Date(`${todayStr}T09:00:00Z`),   // JST 18:00
      memo: '通常業務',
      staffId: createdStaff[0].id
    },
    {
      date: new Date(todayStr),
      status: 'Meeting',
      start: new Date(`${todayStr}T01:00:00Z`), // JST 10:00
      end: new Date(`${todayStr}T03:00:00Z`),   // JST 12:00
      memo: '朝会',
      staffId: createdStaff[0].id
    },
    {
      date: new Date(todayStr),
      status: 'Remote',
      start: new Date(`${todayStr}T01:00:00Z`), // JST 10:00
      end: new Date(`${todayStr}T10:00:00Z`),   // JST 19:00
      memo: 'リモート作業',
      staffId: createdStaff[1].id
    },
    {
      date: new Date(todayStr),
      status: 'Training',
      start: new Date(`${todayStr}T04:00:00Z`), // JST 13:00
      end: new Date(`${todayStr}T06:00:00Z`),   // JST 15:00
      memo: '技術研修',
      staffId: createdStaff[1].id
    },
    {
      date: new Date(todayStr),
      status: 'Online',
      start: new Date(`${todayStr}T23:30:00Z`), // JST 8:30 (前日分なので +1日)
      end: new Date(`${todayStr}T08:30:00Z`),   // JST 17:30
      memo: '営業活動',
      staffId: createdStaff[2].id
    },
    {
      date: new Date(todayStr),
      status: 'Off',
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
  await prisma.dailyAssignment.create({
    data: {
      staffId: createdStaff[1].id, // 佐藤花子
      date: new Date(todayStr),
      assignmentType: 'reception',
      customLabel: 'FAX受信担当',
      updatedAt: new Date()
    }
  });

  console.log('✅ テストデータ準備完了');
  console.log(`作成されたデータ:`);
  console.log(`- スタッフ: ${createdStaff.length}名`);
  console.log(`- 部署設定: ${departmentSettings.length}件`);
  console.log(`- 契約データ: ${contractData.length}件`);
  console.log(`- 調整データ: ${adjustmentData.length}件`);
  console.log(`- 支援設定: 1件`);
  console.log(`- 担当設定: 1件`);
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