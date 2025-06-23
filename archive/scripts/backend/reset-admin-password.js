const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function resetAdminPassword() {
  try {
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    console.log('=== Admin パスワードリセット ===');
    console.log('新しいパスワード:', newPassword);
    console.log('ハッシュ化:', hashedPassword.substring(0, 20) + '...');
    
    const updated = await prisma.userAuth.update({
      where: { email: 'admin@example.com' },
      data: { password: hashedPassword }
    });
    
    console.log('✅ Admin パスワードを更新しました');
    console.log('ユーザーID:', updated.id);
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();