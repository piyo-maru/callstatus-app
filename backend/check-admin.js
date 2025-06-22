const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    console.log('=== Admin アカウント確認 ===');
    
    const adminUser = await prisma.userAuth.findUnique({
      where: { email: 'admin@example.com' },
      include: { staff: true }
    });
    
    if (adminUser) {
      console.log('Admin user found:', {
        id: adminUser.id,
        email: adminUser.email,
        hasPassword: !!adminUser.password,
        userType: adminUser.userType,
        isActive: adminUser.isActive,
        staffName: adminUser.staff?.name
      });
      
      if (adminUser.password) {
        console.log('Password hash (first 20 chars):', adminUser.password.substring(0, 20) + '...');
      } else {
        console.log('❌ Password is not set!');
      }
    } else {
      console.log('❌ Admin user not found!');
    }
    
    // 全ユーザー一覧も確認
    console.log('\n=== 全ユーザー一覧 ===');
    const allUsers = await prisma.userAuth.findMany({
      include: { staff: true }
    });
    
    allUsers.forEach(user => {
      console.log(`- ${user.email}: ${user.userType}, hasPassword: ${!!user.password}, active: ${user.isActive}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();
