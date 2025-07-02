const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

async function createSystemAdmin() {
  try {
    console.log('=== システム管理者アカウント作成 ===');
    
    // 既存のadmin@example.comをチェック
    const existingAdmin = await prisma.user_auth.findUnique({
      where: { email: 'admin@example.com' }
    });
    
    if (existingAdmin) {
      console.log('✅ admin@example.com は既に存在します');
      console.log('既存Admin:', {
        id: existingAdmin.id,
        email: existingAdmin.email,
        userType: existingAdmin.userType,
        isActive: existingAdmin.isActive,
        hasPassword: !!existingAdmin.password
      });
      
      if (!existingAdmin.password) {
        // パスワードが未設定の場合、設定する
        const password = 'admin123';
        const hashedPassword = await bcrypt.hash(password, 12);
        
        await prisma.user_auth.update({
          where: { id: existingAdmin.id },
          data: { 
            password: hashedPassword,
            passwordSetAt: new Date()
          }
        });
        
        console.log('✅ パスワードを設定しました:', password);
      }
      
      return;
    }
    
    // 新しいシステム管理者アカウントを作成
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const systemAdmin = await prisma.user_auth.create({
      data: {
        id: randomUUID(),
        email: 'admin@example.com',
        password: hashedPassword,
        userType: 'ADMIN',
        isActive: true,
        passwordSetAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('✅ システム管理者アカウントを作成しました:');
    console.log('Email:', systemAdmin.email);
    console.log('Password:', password);
    console.log('UserType:', systemAdmin.userType);
    console.log('ID:', systemAdmin.id);
    
    // 一般ユーザーも作成
    const userPassword = 'user123';
    const userHashedPassword = await bcrypt.hash(userPassword, 12);
    
    const regularUser = await prisma.user_auth.create({
      data: {
        id: randomUUID(),
        email: 'user@example.com',
        password: userHashedPassword,
        userType: 'STAFF',
        isActive: true,
        passwordSetAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('\n✅ 一般ユーザーアカウントも作成しました:');
    console.log('Email:', regularUser.email);
    console.log('Password:', userPassword);
    console.log('UserType:', regularUser.userType);
    console.log('ID:', regularUser.id);
    
    console.log('\n=== 作成されたアカウント ===');
    console.log('管理者: admin@example.com / admin123');
    console.log('一般ユーザー: user@example.com / user123');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSystemAdmin();