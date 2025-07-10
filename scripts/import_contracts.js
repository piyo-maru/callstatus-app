const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importContractData() {
  try {
    console.log('🔄 契約データインポート開始...');
    
    // JSON ファイルを読み込み
    const filePath = path.join(__dirname, 'artifacts', 'contract_dammy.json');
    const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const employeeData = jsonData.employeeData;
    
    console.log(`📊 インポート対象: ${employeeData.length}件の社員データ`);
    
    // 既存データを削除（外部キー制約の順序に注意）
    console.log('🗑️ 既存データ削除中...');
    await prisma.adjustment.deleteMany();
    await prisma.contract.deleteMany();
    await prisma.temporaryAssignment.deleteMany();
    await prisma.dailyAssignment.deleteMany();
    await prisma.monthlySchedule.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.staff.deleteMany();
    
    // 部署とグループのマッピングを作成
    const getDepartmentAndGroup = (dept) => {
      // 部署名から部署とグループを分離
      if (dept.includes('システム')) {
        return { department: 'システム部', group: dept };
      } else if (dept.includes('財務')) {
        return { department: '財務部', group: dept };
      } else if (dept.includes('営業')) {
        return { department: '営業部', group: dept };
      } else if (dept.includes('人事')) {
        return { department: '人事部', group: dept };
      } else if (dept.includes('経理')) {
        return { department: '経理部', group: dept };
      } else if (dept.includes('総務')) {
        return { department: '総務部', group: dept };
      } else if (dept.includes('企画')) {
        return { department: '企画部', group: dept };
      } else if (dept.includes('受付')) {
        return { department: '受付', group: '受付グループ' };
      } else {
        return { department: '営業部', group: dept }; // デフォルト
      }
    };
    
    // スタッフと契約データを作成
    console.log('👥 スタッフデータ作成中...');
    
    for (let i = 0; i < employeeData.length; i++) {
      const employee = employeeData[i];
      const { department, group } = getDepartmentAndGroup(employee.dept);
      
      // スタッフ作成
      const staff = await prisma.staff.create({
        data: {
          name: employee.name,
          department: department,
          group: group,
          empNo: employee.empNo,
          isActive: true
        }
      });
      
      // 契約作成
      await prisma.contract.create({
        data: {
          empNo: employee.empNo,
          name: employee.name,
          team: employee.team,
          email: employee.email,
          dept: employee.dept,
          staffId: staff.id,
          mondayHours: employee.mondayHours,
          tuesdayHours: employee.tuesdayHours,
          wednesdayHours: employee.wednesdayHours,
          thursdayHours: employee.thursdayHours,
          fridayHours: employee.fridayHours,
          saturdayHours: employee.saturdayHours,
          sundayHours: employee.sundayHours
        }
      });
      
      if ((i + 1) % 25 === 0) {
        console.log(`📝 進捗: ${i + 1}/${employeeData.length} 完了`);
      }
    }
    
    console.log('✅ 契約データインポート完了！');
    console.log(`📊 作成されたデータ:`);
    console.log(`   - スタッフ: ${employeeData.length}名`);
    console.log(`   - 契約: ${employeeData.length}件`);
    
  } catch (error) {
    console.error('❌ インポートエラー:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importContractData();