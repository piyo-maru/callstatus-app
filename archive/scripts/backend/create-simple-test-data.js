const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * 簡易版：現在のスキーマに合わせたテストデータ作成
 */
async function createSimpleTestData() {
  try {
    console.log('=== 簡易版テストデータ作成開始 ===');
    
    // 1. 既存データ確認
    const existingStaff = await prisma.staff.count();
    const existingContract = await prisma.contract.count();
    const existingUserAuth = await prisma.userAuth.count();
    
    console.log(`既存データ: Staff=${existingStaff}, Contract=${existingContract}, UserAuth=${existingUserAuth}`);
    
    // 2. テストスタッフ作成
    let testStaff;
    try {
      testStaff = await prisma.staff.create({
        data: {
          name: 'テストユーザー',
          department: '情報システム部',
          group: 'システム開発課'
        }
      });
      console.log(`Staff作成: ${testStaff.name} (ID: ${testStaff.id})`);
    } catch (error) {
      console.log('Staffは既存のものを使用します');
      testStaff = await prisma.staff.findFirst();
    }
    
    // 3. テストコントラクト作成（現在の構造に合わせて）
    try {
      const testContract = await prisma.contract.create({
        data: {
          empNo: `USER${Date.now()}`,
          name: 'テストユーザー',
          department: '情報システム部',
          team: 'システム開発課',
          email: 'user@example.com',
          workHours: '09:00-18:00',
          staffId: testStaff.id
        }
      });
      console.log(`Contract作成: ${testContract.email}`);
    } catch (error) {
      console.error('Contract作成エラー:', error.message);
    }
    
    // 4. 管理者UserAuth作成
    try {
      const adminUserAuth = await prisma.userAuth.create({
        data: {
          email: 'admin@example.com',
          password: 'hashed_admin123456', // 開発用ハッシュ
          userType: 'ADMIN',
          adminRole: 'SUPER_ADMIN',
          isActive: true,
          passwordSetAt: new Date()
        }
      });
      console.log(`管理者UserAuth作成: ${adminUserAuth.email}`);
    } catch (error) {
      console.error('管理者UserAuth作成エラー:', error.message);
    }
    
    // 5. 結果確認
    console.log('\n=== 作成結果 ===');
    
    const userAuths = await prisma.userAuth.findMany();
    console.log(`UserAuthアカウント数: ${userAuths.length}`);
    userAuths.forEach(auth => {
      console.log(`- ${auth.email} (${auth.userType})`);
    });
    
    const contracts = await prisma.contract.findMany();
    console.log(`\nContractアカウント数: ${contracts.length}`);
    contracts.forEach(contract => {
      console.log(`- ${contract.email} (${contract.empNo})`);
    });
    
    console.log('\n✅ 簡易版テストデータ作成完了');
    console.log('\n📋 テストアカウント:');
    console.log('管理者: admin@example.com');
    console.log('一般ユーザー: user@example.com (パスワード未設定)');
    
  } catch (error) {
    console.error('テストデータ作成エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSimpleTestData();