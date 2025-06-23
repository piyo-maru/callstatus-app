const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * 既存のContractデータから初期Userアカウントを作成する
 */
async function createInitialUsers() {
  try {
    console.log('=== 初期ユーザーアカウント作成開始 ===');
    
    // 既存のUserアカウント数確認
    const existingUserCount = await prisma.user.count();
    console.log(`既存Userアカウント数: ${existingUserCount}`);
    
    // Contractデータを取得（isActiveなStaffのみ）
    const contracts = await prisma.contract.findMany({
      include: { 
        staff: true 
      },
      where: {
        staff: {
          isActive: true
        }
      }
    });
    
    console.log(`アクティブなContract数: ${contracts.length}`);
    
    let created = 0;
    let skipped = 0;
    
    for (const contract of contracts) {
      try {
        // 既存のUserアカウントをチェック
        const existingUser = await prisma.user.findUnique({
          where: { email: contract.email }
        });
        
        if (existingUser) {
          console.log(`スキップ: ${contract.email} - 既に存在`);
          skipped++;
          continue;
        }
        
        // 新しいUserアカウントを作成
        const user = await prisma.user.create({
          data: {
            email: contract.email,
            role: 'USER', // デフォルトは一般ユーザー
            isActive: true,
            staffId: contract.staffId,
            password: null // 初回ログイン時に設定
          }
        });
        
        console.log(`作成: ${contract.email} → User ID: ${user.id} (Staff: ${contract.staff.name})`);
        created++;
        
      } catch (error) {
        console.error(`エラー - ${contract.email}:`, error.message);
      }
    }
    
    console.log('\n=== 作成結果 ===');
    console.log(`新規作成: ${created}件`);
    console.log(`スキップ: ${skipped}件`);
    
    // 作成されたUserアカウント一覧
    const users = await prisma.user.findMany({
      include: { staff: true },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`\n=== 全Userアカウント (${users.length}件) ===`);
    users.forEach(user => {
      console.log(`${user.email} | Role: ${user.role} | Staff: ${user.staff?.name || 'なし'} | Active: ${user.isActive}`);
    });
    
    console.log('\n✅ 初期ユーザーアカウント作成完了');
    
    // 管理者設定のヒント
    console.log('\n📝 次のステップ:');
    console.log('1. 管理者ロールの設定（手動）');
    console.log('2. パスワード設定フローの実装');
    console.log('3. NextAuth.jsの設定');
    
  } catch (error) {
    console.error('初期ユーザー作成エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createInitialUsers();