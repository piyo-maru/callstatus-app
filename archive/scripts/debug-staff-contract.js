const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugStaffContract() {
  try {
    console.log('=== スタッフと契約の関連調査 ===');
    
    // スタッフの数とID範囲
    const staffCount = await prisma.staff.count();
    const staffIds = await prisma.staff.findMany({
      select: { id: true },
      orderBy: { id: 'asc' }
    });
    console.log(`スタッフ数: ${staffCount}`);
    console.log(`スタッフID範囲: ${staffIds[0]?.id} - ${staffIds[staffIds.length-1]?.id}`);
    
    // 契約の数とstaffId範囲
    const contractCount = await prisma.contract.count();
    const contractStaffIds = await prisma.contract.findMany({
      select: { staffId: true },
      orderBy: { staffId: 'asc' }
    });
    console.log(`契約数: ${contractCount}`);
    if (contractStaffIds.length > 0) {
      console.log(`契約のstaffId範囲: ${contractStaffIds[0]?.staffId} - ${contractStaffIds[contractStaffIds.length-1]?.staffId}`);
    }
    
    // マッチング状況確認
    const staffWithContracts = await prisma.staff.findMany({
      include: {
        contracts: true
      },
      take: 5
    });
    
    console.log('\n=== サンプルデータ（最初の5人） ===');
    staffWithContracts.forEach(staff => {
      console.log(`スタッフID: ${staff.id}, 名前: ${staff.name}, 契約数: ${staff.contracts.length}`);
      if (staff.contracts.length > 0) {
        console.log(`  契約empNo: ${staff.contracts[0].empNo}`);
      }
    });
    
    // 契約はあるがスタッフが見つからないケース
    const orphanContracts = await prisma.contract.findMany({
      where: {
        staff: null
      },
      take: 5
    });
    
    if (orphanContracts.length > 0) {
      console.log('\n=== 孤立した契約（スタッフが見つからない） ===');
      orphanContracts.forEach(contract => {
        console.log(`契約ID: ${contract.id}, empNo: ${contract.empNo}, staffId: ${contract.staffId}`);
      });
    }
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugStaffContract();