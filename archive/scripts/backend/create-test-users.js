const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * テストユーザーを直接作成する
 */
async function createTestUsers() {
  try {
    console.log('=== テストユーザー作成開始 ===');
    
    // テストユーザーリスト
    const testUsers = [
      {
        email: 'admin@example.com',
        role: 'ADMIN',
        name: '管理者'
      },
      {
        email: 'user@example.com', 
        role: 'USER',
        name: 'テストユーザー'
      }
    ];
    
    for (const userData of testUsers) {
      try {
        // 既存確認
        const existing = await prisma.user.findUnique({
          where: { email: userData.email }
        });
        
        if (existing) {
          console.log(`スキップ: ${userData.email} - 既に存在`);
          continue;
        }
        
        // Staff も存在しない場合は作成
        let staff = await prisma.staff.findFirst({
          where: { name: userData.name }
        });
        
        if (!staff) {
          staff = await prisma.staff.create({
            data: {
              name: userData.name,
              department: 'テスト部署',
              group: 'テストグループ',
              isActive: true
            }
          });
          console.log(`Staff作成: ${staff.name} (ID: ${staff.id})`);
        }
        
        // User作成
        const user = await prisma.user.create({
          data: {
            email: userData.email,
            role: userData.role,
            staffId: staff.id,
            isActive: true,
            password: null // 初回ログイン時に設定
          }
        });
        
        console.log(`User作成: ${user.email} → Role: ${user.role} (ID: ${user.id})`);
        
      } catch (error) {
        console.error(`エラー - ${userData.email}:`, error.message);
      }
    }
    
    // 結果確認
    const users = await prisma.user.findMany({
      include: { staff: true },
      orderBy: { email: 'asc' }
    });
    
    console.log(`\n=== 全Userアカウント (${users.length}件) ===`);
    users.forEach(user => {
      console.log(`${user.email} | Role: ${user.role} | Staff: ${user.staff?.name || 'なし'} | Password: ${user.password ? 'あり' : 'なし'}`);
    });
    
    console.log('\n✅ テストユーザー作成完了');
    
  } catch (error) {
    console.error('テストユーザー作成エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();