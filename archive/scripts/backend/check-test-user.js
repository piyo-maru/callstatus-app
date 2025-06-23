const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTestUser() {
  try {
    const user = await prisma.userAuth.findUnique({
      where: { email: 'test-new-user@example.com' },
      include: { staff: true }
    });
    
    if (user) {
      console.log('=== test-new-user@example.com の状態 ===');
      console.log('ID:', user.id);
      console.log('Email:', user.email);
      console.log('パスワード設定済み:', !!user.password);
      console.log('ユーザータイプ:', user.userType);
      console.log('アクティブ:', user.isActive);
      console.log('Staff情報:', user.staff ? user.staff.name : 'なし');
      console.log('作成日:', user.createdAt);
      console.log('パスワード設定日:', user.passwordSetAt);
      console.log('最終ログイン:', user.lastLoginAt);
      
      if (user.password) {
        console.log('パスワードハッシュ:', user.password.substring(0, 20) + '...');
      }
    } else {
      console.log('❌ test-new-user@example.com は存在しません');
    }
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTestUser();