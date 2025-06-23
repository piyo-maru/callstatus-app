const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * テストユーザーにパスワードを設定
 */
async function setTestPasswords() {
  try {
    console.log('=== テストユーザーのパスワード設定開始 ===');
    
    // テストアカウント用のパスワード設定
    const testAccounts = [
      { email: 'admin@example.com', password: 'admin123' },
      { email: 'user@example.com', password: 'user123' },
      { email: 'sato@example.com', password: 'sato123' }
    ];
    
    for (const account of testAccounts) {
      try {
        // ユーザー検索
        const user = await prisma.user.findUnique({
          where: { email: account.email }
        });
        
        if (!user) {
          console.log(`スキップ: ${account.email} - ユーザーが見つかりません`);
          continue;
        }
        
        // パスワードハッシュ化
        const hashedPassword = await bcrypt.hash(account.password, 12);
        
        // パスワード設定
        await prisma.user.update({
          where: { id: user.id },
          data: { 
            password: hashedPassword,
            emailVerified: new Date()
          }
        });
        
        console.log(`パスワード設定完了: ${account.email} -> ${account.password}`);
        
      } catch (error) {
        console.error(`エラー - ${account.email}:`, error.message);
      }
    }
    
    console.log('\n=== テストパスワード設定完了 ===');
    console.log('認証テスト用ログイン情報:');
    console.log('管理者: admin@example.com / admin123');
    console.log('一般ユーザー: user@example.com / user123');
    console.log('一般ユーザー: sato@example.com / sato123');
    
  } catch (error) {
    console.error('パスワード設定エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setTestPasswords();