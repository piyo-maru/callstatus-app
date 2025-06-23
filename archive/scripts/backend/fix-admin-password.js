const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('管理者パスワードを修正します...');
    
    // 管理者用の強固なパスワードをハッシュ化
    const plainPassword = 'admin123456';
    const hashedPassword = await bcrypt.hash(plainPassword, 12);
    
    console.log('New hashed password length:', hashedPassword.length);
    
    // 管理者のパスワードを更新
    const updatedAdmin = await prisma.userAuth.update({
      where: { email: 'admin@example.com' },
      data: {
        password: hashedPassword,
        passwordSetAt: new Date()
      }
    });
    
    console.log('✅ 管理者パスワードを正常に更新しました');
    console.log('📋 管理者ログイン情報:');
    console.log('Email: admin@example.com');
    console.log('Password: admin123456');
    
    // パスワード検証テスト
    const isValid = await bcrypt.compare(plainPassword, hashedPassword);
    console.log('🔐 パスワード検証テスト:', isValid ? '成功' : '失敗');
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
})();