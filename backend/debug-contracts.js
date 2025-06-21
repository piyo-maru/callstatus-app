const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugContracts() {
  try {
    console.log('=== 契約とスタッフの関係詳細調査 ===');
    
    // 契約テーブルの内容確認
    const contracts = await prisma.contract.findMany({
      take: 5,
      include: {
        staff: {
          select: { id: true, name: true }
        }
      }
    });
    
    console.log('契約サンプル:');
    contracts.forEach(contract => {
      console.log(`  契約ID: ${contract.id}, empNo: ${contract.empNo}, staffId: ${contract.staffId}`);
      console.log(`  関連スタッフ: ${contract.staff ? `${contract.staff.id} - ${contract.staff.name}` : 'なし'}`);
    });
    
    // スタッフテーブルで契約があるもの
    const staffWithContracts = await prisma.staff.findMany({
      where: {
        contracts: {
          some: {}
        }
      },
      take: 5,
      include: {
        contracts: {
          select: { id: true, empNo: true }
        }
      }
    });
    
    console.log('\n契約があるスタッフ:');
    staffWithContracts.forEach(staff => {
      console.log(`  スタッフID: ${staff.id}, 名前: ${staff.name}`);
      staff.contracts.forEach(contract => {
        console.log(`    契約: ${contract.id} (${contract.empNo})`);
      });
    });
    
    // 問題の確認: 外部キー制約
    const contractStaffIds = await prisma.contract.findMany({
      select: { staffId: true },
      distinct: ['staffId']
    });
    
    const actualStaffIds = await prisma.staff.findMany({
      select: { id: true }
    });
    
    console.log(`\n契約のstaffId数: ${contractStaffIds.length}`);
    console.log(`実際のスタッフ数: ${actualStaffIds.length}`);
    
    const contractStaffIdSet = new Set(contractStaffIds.map(c => c.staffId));
    const actualStaffIdSet = new Set(actualStaffIds.map(s => s.id));
    
    console.log('契約のstaffIdで実際に存在するスタッフ数:', 
      contractStaffIds.filter(c => actualStaffIdSet.has(c.staffId)).length);
      
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugContracts();