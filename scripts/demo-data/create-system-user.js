const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

async function createSystemUser() {
  try {
    console.log('=== system@example.com システム管理者アカウント作成 ===');
    
    // 既存のsystem@example.comをチェック
    const existingSystem = await prisma.user_auth.findUnique({
      where: { email: 'system@example.com' }
    });
    
    if (existingSystem) {
      console.log('✅ system@example.com は既に存在します');
      console.log('既存System Admin:', {
        id: existingSystem.id,
        email: existingSystem.email,
        userType: existingSystem.userType,
        adminRole: existingSystem.adminRole,
        isActive: existingSystem.isActive,
        hasPassword: !!existingSystem.password
      });
      return;
    }
    
    // 新しいシステム管理者アカウントを作成
    const password = 'system123';
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const systemAdmin = await prisma.user_auth.create({
      data: {
        id: randomUUID(),
        email: 'system@example.com',
        password: hashedPassword,
        userType: 'ADMIN',
        adminRole: 'SYSTEM_ADMIN',  // システム管理者レベル
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
    console.log('AdminRole:', systemAdmin.adminRole);
    console.log('ID:', systemAdmin.id);
    
    console.log('\n=== 作成されたシステム管理者アカウント ===');
    console.log('システム管理者: system@example.com / system123');
    console.log('管理者権限: SYSTEM_ADMIN');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSystemUser();