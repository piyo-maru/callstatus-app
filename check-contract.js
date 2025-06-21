const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkContracts() {
  try {
    console.log('=== Contract Table Check ===');
    const contracts = await prisma.contract.findMany({
      take: 5
    });
    console.log(`Total contracts: ${contracts.length}`);
    console.log('Sample contracts:', JSON.stringify(contracts, null, 2));

    console.log('\n=== Staff-Contract Relationship ===');
    const staffWithContracts = await prisma.staff.findMany({
      take: 3,
      include: {
        contracts: true
      }
    });
    
    staffWithContracts.forEach(staff => {
      console.log(`Staff: ${staff.name} (ID: ${staff.id})`);
      console.log(`  Contracts: ${staff.contracts.length}`);
      if (staff.contracts.length > 0) {
        const contract = staff.contracts[0];
        console.log(`  Monday: ${contract.mondayHours}, Tuesday: ${contract.tuesdayHours}`);
      }
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkContracts();