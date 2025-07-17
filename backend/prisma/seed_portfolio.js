#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 ポートフォリオ用データベース初期化中（50人版）...');

  // 🚨🚨🚨 【重要警告】全データベース完全削除実行中 🚨🚨🚨
  console.log('🚨🚨🚨 データベース完全リセット開始 🚨🚨🚨');
  console.log('🗑️  全スタッフデータを完全削除します');
  console.log('🗑️  全スケジュール・契約データを完全削除します');
  console.log('⚠️  この操作は取り消せません！');
  console.log('📝  新しく50人のポートフォリオ用データを作成します');
  // 外部キー制約を考慮した削除順序
  await prisma.pending_approval_logs.deleteMany(); // 承認ログを先に削除
  await prisma.adjustment.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.contractDisplayCache.deleteMany(); // 外部キー制約対応
  await prisma.temporaryAssignment.deleteMany();
  await prisma.dailyAssignment.deleteMany();
  await prisma.departmentSettings.deleteMany();
  await prisma.staff.deleteMany();
  console.log('✅ データベース完全削除完了');

  // ポートフォリオ用スタッフデータ作成（50人）
  console.log('スタッフデータ作成中（50人版）...');
  
  // 部署・グループ配置設計（現在の配色との統一感重視）
  const DEPARTMENT_GROUPS = [
    {
      dept: 'システム部',
      groups: [
        { name: '開発グループ', positions: ['エンジニア', 'シニアエンジニア', 'リードエンジニア', '主任'], arrangements: ['出社', 'リモート', 'ハイブリッド'] },
        { name: '運用グループ', positions: ['運用担当', '運用エンジニア', '主任'], arrangements: ['出社', 'ハイブリッド'] },
        { name: 'インフラグループ', positions: ['インフラエンジニア', 'ネットワーク担当', '係長'], arrangements: ['出社', 'リモート'] }
      ]
    },
    {
      dept: '営業部',
      groups: [
        { name: '営業一課', positions: ['営業担当', '営業主任', '係長'], arrangements: ['出社', 'ハイブリッド'] },
        { name: '営業二課', positions: ['営業担当', '主任', '営業マネージャー'], arrangements: ['出社', 'ハイブリッド'] },
        { name: '営業企画', positions: ['企画担当', '企画主任', '課長'], arrangements: ['出社', 'リモート'] }
      ]
    },
    {
      dept: '経理部',
      groups: [
        { name: '会計グループ', positions: ['会計士', '会計担当', '主任'], arrangements: ['出社', 'リモート'] },
        { name: '財務グループ', positions: ['財務担当', '財務アナリスト', '課長'], arrangements: ['出社', 'ハイブリッド'] }
      ]
    },
    {
      dept: '人事部',
      groups: [
        { name: '採用グループ', positions: ['採用担当', '採用コーディネーター', '主任'], arrangements: ['出社', 'ハイブリッド'] },
        { name: '労務グループ', positions: ['労務担当', '労務主任', '係長'], arrangements: ['出社', 'リモート'] }
      ]
    },
    {
      dept: '総務部',
      groups: [
        { name: '総務グループ', positions: ['総務担当', '総務主任'], arrangements: ['出社'] },
        { name: '法務グループ', positions: ['法務担当', '法務スペシャリスト'], arrangements: ['出社', 'リモート'] }
      ]
    },
    {
      dept: '企画部',
      groups: [
        { name: '事業企画', positions: ['企画担当', '事業企画主任'], arrangements: ['出社', 'ハイブリッド'] },
        { name: '戦略企画', positions: ['戦略企画担当', '戦略アナリスト'], arrangements: ['出社', 'リモート'] }
      ]
    }
  ];

  // 日本の姓名リスト（50人分）
  const SURNAMES = ['田中', '佐藤', '山田', '鈴木', '高橋', '渡辺', '中村', '小林', '加藤', '吉田',
                   '山本', '松本', '井上', '木村', '林', '清水', '山口', '森', '池田', '橋本',
                   '石川', '前田', '藤田', '後藤', '岡田', '長谷川', '村上', '近藤', '石井', '斎藤',
                   '坂本', '遠藤', '青木', '藤井', '西村', '福田', '太田', '三浦', '藤原', '岡本',
                   '松田', '中島', '金子', '上田', '原田', '和田', '武田', '村田', '竹内', '柴田'];
  const GIVEN_NAMES_M = ['太郎', '次郎', '健太', '慎也', '雄一', '大輔', '直樹', '英雄', '正樹', '博史',
                        '秀樹', '和也', '学', '誠', '聡', '浩', '修', '隆', '勇', '豊', '進', '徹', '実', '登', '昇'];
  const GIVEN_NAMES_F = ['花子', '美咲', '雅子', '知美', '由美', '真理', '恵子', '智子', '美穂', '香織',
                        '理恵', '裕子', '優子', '綾子', '麻衣', '美樹', '直美', '千春', '愛', '舞', '瞳', '萌', '桜', '彩', '葵'];

  // 50人のスタッフデータ生成
  const staffData = [];
  let empNoCounter = 1001;
  let nameIndex = 0;
  
  for (const deptConfig of DEPARTMENT_GROUPS) {
    for (const groupConfig of deptConfig.groups) {
      // 各グループに5-9人を配置
      const groupSize = Math.floor(Math.random() * 5) + 5; // 5-9人
      
      for (let i = 0; i < groupSize && nameIndex < 50; i++) {
        const isManager = Math.random() < 0.15; // 15%が管理職
        const gender = Math.random() < 0.6 ? 'M' : 'F'; // 60%男性、40%女性
        const surname = SURNAMES[nameIndex];
        const givenName = gender === 'M' ? 
          GIVEN_NAMES_M[Math.floor(Math.random() * GIVEN_NAMES_M.length)] :
          GIVEN_NAMES_F[Math.floor(Math.random() * GIVEN_NAMES_F.length)];
        
        const position = isManager ? 
          (Math.random() < 0.5 ? '課長' : '係長') :
          groupConfig.positions[Math.floor(Math.random() * groupConfig.positions.length)];
        
        const workArrangement = groupConfig.arrangements[Math.floor(Math.random() * groupConfig.arrangements.length)];
        
        staffData.push({
          empNo: empNoCounter.toString().padStart(4, '0'),
          name: surname + givenName,
          department: deptConfig.dept,
          group: groupConfig.name,
          position: position,
          workArrangement: workArrangement,
          isManager: isManager
        });
        
        empNoCounter++;
        nameIndex++;
      }
    }
  }

  const createdStaff = [];
  for (const staff of staffData) {
    const createdRecord = await prisma.staff.create({
      data: staff
    });
    createdStaff.push(createdRecord);
  }

  // 部署設定作成（統一感のある配色デザイン）
  console.log('部署設定作成中（統一配色版）...');
  const departmentSettings = [
    // 部署: ベース色（現在の配色を踏襲）
    { type: 'department', name: 'システム部', backgroundColor: '#8BB5F7', displayOrder: 10 },    // 淡い青（現在と同じ）
    { type: 'department', name: '営業部', backgroundColor: '#7DDDB5', displayOrder: 20 },        // 淡い緑（現在と同じ）
    { type: 'department', name: '経理部', backgroundColor: '#F7C574', displayOrder: 30 },        // 淡い金（現在と同じ）
    { type: 'department', name: '人事部', backgroundColor: '#F79999', displayOrder: 40 },        // 淡い赤（現在と同じ）
    { type: 'department', name: '総務部', backgroundColor: '#D4A5F7', displayOrder: 50 },        // 淡い紫
    { type: 'department', name: '企画部', backgroundColor: '#A5E6D4', displayOrder: 60 },        // 淡いターコイズ
    
    // グループ: 部署色との統一感を重視した同系統色
    // システム部グループ（青系統）
    { type: 'group', name: '開発グループ', backgroundColor: '#C4B5F7', displayOrder: 10 },      // 淡い紫（現在と同じ）
    { type: 'group', name: '運用グループ', backgroundColor: '#7DD3F0', displayOrder: 20 },      // 淡い水色（現在と同じ）
    { type: 'group', name: 'インフラグループ', backgroundColor: '#A5C9F7', displayOrder: 30 },  // 青系統
    
    // 営業部グループ（緑系統）
    { type: 'group', name: '営業一課', backgroundColor: '#B8E673', displayOrder: 10 },          // 淡い黄緑（現在と同じ）
    { type: 'group', name: '営業二課', backgroundColor: '#99E6B3', displayOrder: 20 },          // 淡い薄緑（現在と同じ）
    { type: 'group', name: '営業企画', backgroundColor: '#85D4A5', displayOrder: 30 },          // 緑系統
    
    // 経理部グループ（オレンジ・イエロー系統）
    { type: 'group', name: '会計グループ', backgroundColor: '#F7B574', displayOrder: 10 },      // 淡いオレンジ（現在と同じ）
    { type: 'group', name: '財務グループ', backgroundColor: '#E6D973', displayOrder: 20 },      // 淡いベージュ（現在と同じ）
    
    // 人事部グループ（ピンク・ローズ系統）
    { type: 'group', name: '採用グループ', backgroundColor: '#F7B5E6', displayOrder: 10 },      // 淡いピンク（現在と同じ）
    { type: 'group', name: '労務グループ', backgroundColor: '#E6B5CC', displayOrder: 20 },      // 淡いローズ（現在と同じ）
    
    // 総務部グループ（紫系統）
    { type: 'group', name: '総務グループ', backgroundColor: '#E6C4F7', displayOrder: 10 },      // 淡い薄紫
    { type: 'group', name: '法務グループ', backgroundColor: '#D4B5E6', displayOrder: 20 },      // 紫系統
    
    // 企画部グループ（ターコイズ系統）
    { type: 'group', name: '事業企画', backgroundColor: '#B8E6D4', displayOrder: 10 },          // 淡いターコイズ
    { type: 'group', name: '戦略企画', backgroundColor: '#99D4C4', displayOrder: 20 },          // ターコイズ系統
  ];

  for (const setting of departmentSettings) {
    await prisma.departmentSettings.create({
      data: {
        ...setting,
        updatedAt: new Date()
      }
    });
  }

  // 契約データ作成（基本勤務時間・50人分）
  console.log('契約データ作成中（50人版）...');
  
  // 多様な勤務パターン定義
  const WORK_PATTERNS = [
    { name: '標準', hours: '09:00-18:00' },     // 50%
    { name: '早番', hours: '08:00-17:00' },     // 15%
    { name: '遅番', hours: '10:00-19:00' },     // 15%
    { name: 'フレックス', hours: '09:30-18:30' }, // 10%
    { name: '時短', hours: '09:00-15:00' },     // 5%
    { name: '特殊', hours: '08:30-17:30' }      // 5%
  ];
  
  function getWorkPattern() {
    const rand = Math.random();
    if (rand < 0.5) return WORK_PATTERNS[0];      // 50%: 標準
    if (rand < 0.65) return WORK_PATTERNS[1];     // 15%: 早番
    if (rand < 0.8) return WORK_PATTERNS[2];      // 15%: 遅番
    if (rand < 0.9) return WORK_PATTERNS[3];      // 10%: フレックス
    if (rand < 0.95) return WORK_PATTERNS[4];     // 5%: 時短
    return WORK_PATTERNS[5];                      // 5%: 特殊
  }
  
  const contractData = [];
  for (let i = 0; i < createdStaff.length; i++) {
    const staff = createdStaff[i];
    const pattern = getWorkPattern();
    
    // メールアドレス生成（簡易版）
    const email = `user${i+1}@company.com`;
    
    contractData.push({
      empNo: staff.empNo,
      name: staff.name,
      dept: staff.department,
      team: staff.group,
      email: email,
      mondayHours: pattern.hours,
      tuesdayHours: pattern.hours,
      wednesdayHours: pattern.hours,
      thursdayHours: pattern.hours,
      fridayHours: pattern.hours,
      staffId: staff.id
    });
  }

  for (const contract of contractData) {
    await prisma.contract.create({
      data: {
        ...contract,
        updatedAt: new Date()
      }
    });
  }

  // 調整データ作成（個別スケジュール・今日の日付でサンプル作成）
  console.log('調整データ作成中（サンプルデータ）...');
  const today = new Date();
  const jstToday = new Date(today.getTime() + 9 * 60 * 60 * 1000); // JST変換
  const todayStr = jstToday.toISOString().split('T')[0];
  console.log(`📅 データ作成日付: ${todayStr} (JST基準)`);
  
  // サンプル調整データ（今日の分のみ、メインはあとでdemo-dataスクリプトで投入）
  const adjustmentData = [
    {
      date: new Date(todayStr),
      status: 'online',
      start: new Date(`${todayStr}T00:00:00Z`), // JST 9:00
      end: new Date(`${todayStr}T09:00:00Z`),   // JST 18:00
      memo: '通常業務（シードデータ）',
      staffId: createdStaff[0].id
    },
    {
      date: new Date(todayStr),
      status: 'remote',
      start: new Date(`${todayStr}T01:00:00Z`), // JST 10:00
      end: new Date(`${todayStr}T10:00:00Z`),   // JST 19:00
      memo: 'リモート作業（シードデータ）',
      staffId: createdStaff[1].id
    },
    {
      date: new Date(todayStr),
      status: 'meeting',
      start: new Date(`${todayStr}T04:00:00Z`), // JST 13:00
      end: new Date(`${todayStr}T06:00:00Z`),   // JST 15:00
      memo: '会議参加（シードデータ）',
      staffId: createdStaff[2].id
    },
    {
      date: new Date(todayStr),
      status: 'off',
      start: new Date(`${todayStr}T00:00:00Z`), // JST 9:00
      end: new Date(`${todayStr}T09:00:00Z`),   // JST 18:00
      memo: '有給休暇（シードデータ）',
      staffId: createdStaff[3].id
    },
    {
      date: new Date(todayStr),
      status: 'training',
      start: new Date(`${todayStr}T01:00:00Z`), // JST 10:00
      end: new Date(`${todayStr}T04:00:00Z`),   // JST 13:00
      memo: '研修参加（シードデータ）',
      staffId: createdStaff[4].id
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

  // 支援設定作成（サンプル）
  console.log('支援設定作成中（サンプル）...');
  
  // 複数の支援設定サンプル作成
  const supportAssignments = [
    {
      staffId: createdStaff[0].id,
      startDate: new Date(todayStr),
      endDate: new Date(new Date(todayStr).getTime() + 3 * 24 * 60 * 60 * 1000), // 3日後
      tempDept: "営業部",
      tempGroup: "営業一課",
      reason: "プロジェクト支援",
      updatedAt: new Date()
    },
    {
      staffId: createdStaff[5].id,
      startDate: new Date(new Date(todayStr).getTime() + 7 * 24 * 60 * 60 * 1000), // 1週間後
      endDate: new Date(new Date(todayStr).getTime() + 14 * 24 * 60 * 60 * 1000), // 2週間後
      tempDept: "システム部",
      tempGroup: "運用グループ",
      reason: "システムメンテナンス支援",
      updatedAt: new Date()
    }
  ];
  
  for (const assignment of supportAssignments) {
    await prisma.temporaryAssignment.create({ data: assignment });
  }

  // 担当設定作成（サンプル）
  console.log('担当設定作成中（サンプル）...');
  
  // 異なる日付での担当設定サンプル
  const responsibilityAssignments = [];
  
  // 今日の担当
  responsibilityAssignments.push(
    {
      staffId: createdStaff[1].id,
      date: new Date(todayStr),
      assignmentType: 'fax',
      customLabel: null,
      updatedAt: new Date()
    },
    {
      staffId: createdStaff[2].id,
      date: new Date(todayStr),
      assignmentType: 'subjectCheck',
      customLabel: null,
      updatedAt: new Date()
    },
    {
      staffId: createdStaff[3].id,
      date: new Date(todayStr),
      assignmentType: 'custom',
      customLabel: '来客対応',
      updatedAt: new Date()
    }
  );
  
  // 明日の担当
  const tomorrow = new Date(new Date(todayStr).getTime() + 24 * 60 * 60 * 1000);
  responsibilityAssignments.push(
    {
      staffId: createdStaff[4].id,
      date: tomorrow,
      assignmentType: 'fax',
      customLabel: null,
      updatedAt: new Date()
    },
    {
      staffId: createdStaff[6].id,
      date: tomorrow,
      assignmentType: 'subjectCheck',
      customLabel: null,
      updatedAt: new Date()
    }
  );
  
  await prisma.dailyAssignment.createMany({
    data: responsibilityAssignments
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
  
  // バルクインサート（updatedAt追加）
  if (cacheEntries.length > 0) {
    const cacheEntriesWithTimestamp = cacheEntries.map(entry => ({
      ...entry,
      updatedAt: new Date()
    }));
    await prisma.contractDisplayCache.createMany({
      data: cacheEntriesWithTimestamp,
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

  console.log('✅ ポートフォリオ用データ準備完了（50人版）');
  console.log(`作成されたデータ:`);
  console.log(`- スタッフ: ${createdStaff.length}名（ポートフォリオ用）`);
  console.log(`- 部署設定: ${departmentSettings.length}件（統一配色）`);
  console.log(`- 契約データ: ${contractData.length}件（多様な勤務パターン）`);
  console.log(`- 調整データ: ${adjustmentData.length}件（サンプル）`);
  console.log(`- 支援設定: ${supportAssignments.length}件`);
  console.log(`- 担当設定: ${responsibilityAssignments.length}件`);
  console.log(`- 契約表示キャッシュ: ${cacheEntries.length}件`);
  console.log(`- 昼休み（break）: ${breakEntries.length}件`);
  console.log('\n🚀 次のステップ: demo-dataスクリプトで本格的なスケジュールデータを投入してください。');
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