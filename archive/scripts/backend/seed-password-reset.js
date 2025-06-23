const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('=== パスワードリセット機能付きシードデータ投入開始 ===');

  // 既存データをクリア
  await prisma.authAuditLog.deleteMany({});
  await prisma.authSession.deleteMany({});
  await prisma.passwordResetToken.deleteMany({});
  await prisma.userAuth.deleteMany({});
  await prisma.adjustment.deleteMany({});
  await prisma.monthlySchedule.deleteMany({});
  await prisma.contract.deleteMany({});
  await prisma.temporaryAssignment.deleteMany({});
  await prisma.dailyAssignment.deleteMany({});
  await prisma.schedule.deleteMany({});
  await prisma.staff.deleteMany({});

  // 1. スタッフデータを作成
  const staff1 = await prisma.staff.create({
    data: {
      name: '田中太郎',
      department: '営業部',
      group: '第一営業課',
      empNo: 'EMP001',
      isActive: true
    }
  });

  const staff2 = await prisma.staff.create({
    data: {
      name: '佐藤花子', 
      department: '開発部',
      group: 'システム開発課',
      empNo: 'EMP002',
      isActive: true
    }
  });

  const staff3 = await prisma.staff.create({
    data: {
      name: '鈴木一郎',
      department: '総務部',
      group: '人事課',
      empNo: 'EMP003',
      isActive: true
    }
  });

  console.log('スタッフデータ作成完了:', { staff1: staff1.id, staff2: staff2.id, staff3: staff3.id });

  // 2. 契約データを作成
  await prisma.contract.create({
    data: {
      empNo: 'EMP001',
      name: '田中太郎',
      department: '営業部',
      team: '第一営業課',
      email: 'tanaka@example.com',
      workDays: ['月', '火', '水', '木', '金'],
      workHours: '09:00-18:00',
      breakHours: '12:00-13:00',
      staffId: staff1.id
    }
  });

  await prisma.contract.create({
    data: {
      empNo: 'EMP002',
      name: '佐藤花子',
      department: '開発部', 
      team: 'システム開発課',
      email: 'sato@example.com',
      workDays: ['月', '火', '水', '木', '金'],
      workHours: '10:00-19:00',
      breakHours: '12:00-13:00',
      staffId: staff2.id
    }
  });

  await prisma.contract.create({
    data: {
      empNo: 'EMP003',
      name: '鈴木一郎',
      department: '総務部',
      team: '人事課', 
      email: 'suzuki@example.com',
      workDays: ['月', '火', '水', '木', '金'],
      workHours: '09:00-18:00',
      breakHours: '12:00-13:00',
      staffId: staff3.id
    }
  });

  console.log('契約データ作成完了');

  // 3. 認証ユーザーを作成
  // 管理者ユーザー（パスワード設定済み）
  const hashedAdminPassword = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.userAuth.create({
    data: {
      email: 'admin@example.com',
      password: hashedAdminPassword,
      userType: 'ADMIN',
      adminRole: 'SUPER_ADMIN',
      isActive: true,
      passwordSetAt: new Date(),
      lastLoginAt: new Date()
    }
  });

  // 一般ユーザー（パスワード未設定）
  const staffUser1 = await prisma.userAuth.create({
    data: {
      email: 'tanaka@example.com',
      userType: 'STAFF',
      staffId: staff1.id,
      isActive: true
    }
  });

  const staffUser2 = await prisma.userAuth.create({
    data: {
      email: 'sato@example.com',
      userType: 'STAFF',
      staffId: staff2.id,
      isActive: true
    }
  });

  console.log('認証ユーザー作成完了:', {
    admin: adminUser.id,
    staff1: staffUser1.id,
    staff2: staffUser2.id
  });

  // 4. テスト用パスワードリセットトークンを作成（確認用）
  const testResetToken = await prisma.passwordResetToken.create({
    data: {
      userAuthId: staffUser1.id,
      token: 'test-reset-token-123456',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24時間後
      ipAddress: '127.0.0.1',
      userAgent: 'Test Browser'
    }
  });

  console.log('テスト用パスワードリセットトークン作成:', testResetToken.id);

  console.log('\n=== シードデータ投入完了 ===');
  console.log('作成されたアカウント:');
  console.log('管理者: admin@example.com (パスワード: admin123)');
  console.log('一般ユーザー: tanaka@example.com (パスワード未設定)');
  console.log('一般ユーザー: sato@example.com (パスワード未設定)');
  console.log('\nパスワードリセット機能テスト用:');
  console.log('テストトークン: test-reset-token-123456 (tanaka@example.com用)');
}

main()
  .catch((e) => {
    console.error('シードデータ投入エラー:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });