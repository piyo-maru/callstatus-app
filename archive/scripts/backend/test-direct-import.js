const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function directImport() {
  try {
    console.log('=== 直接インポートテスト ===');
    
    // テストデータを直接作成
    const testData = [
      {
        empNo: "12345",
        name: "テスト太郎",
        dept: "テスト部署",
        team: "テストチーム",
        email: "test1@example.com",
        mondayHours: "09:00-18:00",
        tuesdayHours: "09:00-18:00",
        wednesdayHours: "09:00-18:00",
        thursdayHours: "09:00-18:00",
        fridayHours: "09:00-18:00",
        saturdayHours: null,
        sundayHours: null
      },
      {
        empNo: "12346",
        name: "テスト花子",
        dept: "テスト部署",
        team: "テストチーム",
        email: "test2@example.com",
        mondayHours: "09:00-17:45",
        tuesdayHours: "09:00-17:45",
        wednesdayHours: "09:00-17:45",
        thursdayHours: "09:00-17:45",
        fridayHours: "09:00-17:45",
        saturdayHours: null,
        sundayHours: null
      }
    ];
    console.log('テストデータ:', testData.map(emp => ({ name: emp.name, empNo: emp.empNo })));
    
    for (const emp of testData) {
      console.log(`\n処理中: ${emp.name} (${emp.empNo})`);
      
      // スタッフ作成
      const staff = await prisma.staff.create({
        data: {
          empNo: emp.empNo,
          name: emp.name,
          department: emp.dept,
          group: emp.team,
          isActive: true
        }
      });
      console.log(`スタッフ作成完了: ID=${staff.id}`);
      
      // 契約作成
      const contract = await prisma.contract.create({
        data: {
          empNo: emp.empNo,
          name: emp.name,
          dept: emp.dept,
          team: emp.team,
          email: emp.email || '',
          mondayHours: emp.mondayHours || null,
          tuesdayHours: emp.tuesdayHours || null,
          wednesdayHours: emp.wednesdayHours || null,
          thursdayHours: emp.thursdayHours || null,
          fridayHours: emp.fridayHours || null,
          saturdayHours: emp.saturdayHours || null,
          sundayHours: emp.sundayHours || null,
          staffId: staff.id
        }
      });
      console.log(`契約作成完了: ID=${contract.id}`);
    }
    
    // 確認
    const staffCount = await prisma.staff.count();
    const contractCount = await prisma.contract.count();
    const activeStaffCount = await prisma.staff.count({ where: { isActive: true } });
    
    console.log(`\n=== 結果 ===`);
    console.log(`スタッフ総数: ${staffCount}`);
    console.log(`契約総数: ${contractCount}`);
    console.log(`アクティブスタッフ: ${activeStaffCount}`);
    
    if (staffCount === contractCount && activeStaffCount === staffCount) {
      console.log('✅ 正常にインポートされました！');
    } else {
      console.log('❌ 不整合があります');
    }
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

directImport();