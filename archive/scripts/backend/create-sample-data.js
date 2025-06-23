const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * 認証機能テスト用のサンプルデータを作成
 */
async function createSampleData() {
  try {
    console.log('=== 認証テスト用サンプルデータ作成開始 ===');
    
    // サンプルスタッフとコントラクトデータ
    const sampleStaff = [
      {
        empNo: "1001",
        name: "管理者太郎",
        department: "総務部",
        group: "管理チーム",
        email: "admin@example.com",
        role: "ADMIN"
      },
      {
        empNo: "1002", 
        name: "一般花子",
        department: "営業部",
        group: "営業1チーム",
        email: "user@example.com",
        role: "USER"
      },
      {
        empNo: "1003",
        name: "佐藤次郎",
        department: "開発部",
        group: "システムチーム",
        email: "sato@example.com",
        role: "USER"
      }
    ];
    
    let createdStaff = 0;
    let createdContracts = 0;
    let createdUsers = 0;
    
    for (const data of sampleStaff) {
      try {
        // Staff作成
        const staff = await prisma.staff.create({
          data: {
            empNo: data.empNo,
            name: data.name,
            department: data.department,
            group: data.group,
            isActive: true
          }
        });
        
        console.log(`Staff作成: ${staff.name} (ID: ${staff.id})`);
        createdStaff++;
        
        // Contract作成
        const contract = await prisma.contract.create({
          data: {
            empNo: data.empNo,
            name: data.name,
            dept: data.department,
            team: data.group,
            email: data.email,
            mondayHours: "09:00-18:00",
            tuesdayHours: "09:00-18:00",
            wednesdayHours: "09:00-18:00",
            thursdayHours: "09:00-18:00",
            fridayHours: "09:00-18:00",
            saturdayHours: null,
            sundayHours: null,
            staffId: staff.id
          }
        });
        
        console.log(`Contract作成: ${contract.email}`);
        createdContracts++;
        
        // User作成
        const user = await prisma.user.create({
          data: {
            email: data.email,
            role: data.role,
            isActive: true,
            staffId: staff.id,
            password: null // 後でパスワード設定
          }
        });
        
        console.log(`User作成: ${user.email} (Role: ${user.role})`);
        createdUsers++;
        
      } catch (error) {
        console.error(`エラー - ${data.name}:`, error.message);
      }
    }
    
    console.log('\n=== 作成結果 ===');
    console.log(`Staff: ${createdStaff}件`);
    console.log(`Contract: ${createdContracts}件`);
    console.log(`User: ${createdUsers}件`);
    
    // 確認用データ表示
    const users = await prisma.user.findMany({
      include: { staff: true },
      orderBy: { role: 'desc' }
    });
    
    console.log('\n=== 作成されたユーザーアカウント ===');
    users.forEach(user => {
      console.log(`${user.email} | Role: ${user.role} | Staff: ${user.staff?.name} | Active: ${user.isActive}`);
    });
    
    console.log('\n✅ サンプルデータ作成完了');
    console.log('\n📋 認証テスト用アカウント:');
    console.log('- 管理者: admin@example.com (ADMIN権限)');
    console.log('- 一般ユーザー: user@example.com (USER権限)');
    console.log('- 一般ユーザー: sato@example.com (USER権限)');
    
  } catch (error) {
    console.error('サンプルデータ作成エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSampleData();