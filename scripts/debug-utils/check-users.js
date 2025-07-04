const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('=== 現在のユーザーアカウント一覧 ===');
    
    const users = await prisma.user_auth.findMany({
      select: {
        email: true,
        userType: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { email: 'asc' }
    });
    
    if (users.length === 0) {
      console.log('❌ ユーザーアカウントが存在しません');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   - タイプ: ${user.userType}`);
        console.log(`   - 有効: ${user.isActive}`);
        console.log(`   - 作成日: ${user.createdAt}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();