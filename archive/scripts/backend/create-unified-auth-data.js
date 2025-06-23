const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// bcryptの代わりにシンプルなパスワードハッシュ（開発用）
async function hashPassword(password) {
  // 本番環境ではbcryptを使用、開発用として一時的にプレーンテキスト
  return `hashed_${password}`;
}

/**
 * 統一認証システム用のテストデータを作成する
 */
async function createUnifiedAuthData() {
  try {
    console.log('=== 統一認証システム テストデータ作成開始 ===');
    
    // 1. テストスタッフとコントラクトを作成
    console.log('1. テストスタッフとコントラクトを作成...');
    
    const testStaff = await prisma.staff.create({
      data: {
        name: 'テストユーザー',
        department: '情報システム部',
        group: 'システム開発課',
        isActive: true
      }
    });
    console.log(`Staff作成: ${testStaff.name} (ID: ${testStaff.id})`);
    
    const testContract = await prisma.contract.create({
      data: {
        empNo: 'USER001',
        name: 'テストユーザー',
        dept: '情報システム部',
        team: 'システム開発課',
        email: 'user@example.com',
        mondayHours: '09:00-18:00',
        tuesdayHours: '09:00-18:00',
        wednesdayHours: '09:00-18:00',
        thursdayHours: '09:00-18:00',
        fridayHours: '09:00-18:00',
        saturdayHours: null,
        sundayHours: null,
        staffId: testStaff.id
      }
    });
    console.log(`Contract作成: ${testContract.email} (empNo: ${testContract.empNo})`);
    
    // 2. 管理者UserAuthを作成
    console.log('2. 管理者UserAuthを作成...');
    
    const adminStaff = await prisma.staff.create({
      data: {
        name: '管理者',
        department: '管理部',
        group: '総務課',
        isActive: true
      }
    });
    
    const adminPassword = await hashPassword('admin123456');
    const adminUserAuth = await prisma.userAuth.create({
      data: {
        email: 'admin@example.com',
        password: adminPassword,
        userType: 'ADMIN',
        adminRole: 'SUPER_ADMIN',
        staffId: adminStaff.id,
        isActive: true,
        passwordSetAt: new Date()
      }
    });
    console.log(`管理者UserAuth作成: ${adminUserAuth.email} (Type: ${adminUserAuth.userType})`);
    
    // 3. 管理者のコントラクトも作成（一貫性のため）
    await prisma.contract.create({
      data: {
        empNo: 'ADMIN001',
        name: '管理者',
        dept: '管理部',
        team: '総務課',
        email: 'admin@example.com',
        mondayHours: '09:00-17:00',
        tuesdayHours: '09:00-17:00',
        wednesdayHours: '09:00-17:00',
        thursdayHours: '09:00-17:00',
        fridayHours: '09:00-17:00',
        saturdayHours: null,
        sundayHours: null,
        staffId: adminStaff.id
      }
    });
    
    // 4. 削除済みスタッフ（猶予期間テスト用）
    console.log('3. 削除済みスタッフ（猶予期間テスト用）を作成...');
    
    const deletedStaff = await prisma.staff.create({
      data: {
        name: '削除済みユーザー',
        department: '営業部',
        group: '営業一課',
        isActive: false,
        deletedAt: new Date(),
        authGracePeriod: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5日後まで
      }
    });
    
    await prisma.contract.create({
      data: {
        empNo: 'DEL001',
        name: '削除済みユーザー',
        dept: '営業部',
        team: '営業一課',
        email: 'deleted@example.com',
        mondayHours: '09:00-18:00',
        tuesdayHours: '09:00-18:00',
        wednesdayHours: '09:00-18:00',
        thursdayHours: '09:00-18:00',
        fridayHours: '09:00-18:00',
        saturdayHours: null,
        sundayHours: null,
        staffId: deletedStaff.id
      }
    });
    
    const deletedPassword = await hashPassword('deleted123456');
    await prisma.userAuth.create({
      data: {
        email: 'deleted@example.com',
        password: deletedPassword,
        userType: 'STAFF',
        staffId: deletedStaff.id,
        isActive: true, // 猶予期間中はactive
        passwordSetAt: new Date()
      }
    });
    console.log(`削除済みスタッフ作成: deleted@example.com (猶予期間: 5日間)`);
    
    // 5. 結果確認
    console.log('\n=== 作成結果確認 ===');
    
    const userAuths = await prisma.userAuth.findMany({
      include: { staff: true },
      orderBy: { email: 'asc' }
    });
    
    console.log(`\n全UserAuthアカウント (${userAuths.length}件):`);
    userAuths.forEach(auth => {
      console.log(`${auth.email} | Type: ${auth.userType} | Staff: ${auth.staff?.name || 'なし'} | Password: ${auth.password ? 'あり' : 'なし'} | Active: ${auth.isActive}`);
    });
    
    const contracts = await prisma.contract.findMany({
      include: { staff: true },
      orderBy: { email: 'asc' }
    });
    
    console.log(`\n全Contractアカウント (${contracts.length}件):`);
    contracts.forEach(contract => {
      console.log(`${contract.email} | Staff: ${contract.staff.name} | Active: ${contract.staff.isActive} | empNo: ${contract.empNo}`);
    });
    
    console.log('\n✅ 統一認証システム テストデータ作成完了');
    
    console.log('\n📋 テストアカウント情報:');
    console.log('1. 管理者: admin@example.com / admin123456');
    console.log('2. 一般ユーザー（新規）: user@example.com / パスワード未設定');
    console.log('3. 削除済み（猶予期間中）: deleted@example.com / deleted123456');
    
  } catch (error) {
    console.error('テストデータ作成エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUnifiedAuthData();