const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testLayerManager() {
  try {
    // 契約データがあるスタッフを取得
    const staffWithContract = await prisma.staff.findFirst({
      where: {
        contracts: {
          some: {}
        }
      },
      include: {
        contracts: true
      }
    });

    if (!staffWithContract) {
      console.log('No staff with contracts found');
      return;
    }

    console.log('=== Staff with Contract ===');
    console.log(`Staff: ${staffWithContract.name} (ID: ${staffWithContract.id})`);
    console.log(`Contract: ${JSON.stringify(staffWithContract.contracts[0], null, 2)}`);

    // 今日が何曜日か確認
    const today = new Date();
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayOfWeek = dayNames[today.getDay()];
    console.log(`\nToday is: ${dayOfWeek} (${today.toDateString()})`);

    const contract = staffWithContract.contracts[0];
    const dayHours = contract[`${dayOfWeek}dayHours`];
    console.log(`Working hours for ${dayOfWeek}: ${dayHours}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLayerManager();