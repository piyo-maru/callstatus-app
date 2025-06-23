const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestUser() {
  console.log('=== テストユーザー作成開始 ===');

  try {
    // 新しいスタッフを作成
    const newStaff = await prisma.staff.create({
      data: {
        name: '新規太郎',
        department: 'テスト部',
        group: 'セキュリティ課',
        empNo: 'TEST999',
        isActive: true
      }
    });

    console.log('新しいスタッフ作成:', newStaff);

    // 契約データを作成
    await prisma.contract.create({
      data: {
        empNo: 'TEST999',
        name: '新規太郎',
        department: 'テスト部',
        team: 'セキュリティ課',
        email: 'test-new-user@example.com',
        workDays: ['月', '火', '水', '木', '金'],
        workHours: '09:00-18:00',
        breakHours: '12:00-13:00',
        staffId: newStaff.id
      }
    });

    console.log('契約データ作成完了');

    // UserAuthレコードを作成（パスワード未設定）
    const newUserAuth = await prisma.userAuth.create({
      data: {
        email: 'test-new-user@example.com',
        userType: 'STAFF',
        staffId: newStaff.id,
        isActive: true
        // passwordは意図的に設定しない
      }
    });

    console.log('認証ユーザー作成:', {
      id: newUserAuth.id,
      email: newUserAuth.email,
      hasPassword: !!newUserAuth.password
    });

    console.log('\n=== テストユーザー作成完了 ===');
    console.log('テストアカウント: test-new-user@example.com (パスワード未設定)');
    console.log('このアカウントでログインを試行してください');

  } catch (error) {
    console.error('テストユーザー作成エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();