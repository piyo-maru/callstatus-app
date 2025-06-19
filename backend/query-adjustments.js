const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    const adjustments = await prisma.adjustment.findMany({
      select: {
        id: true,
        staffId: true,
        date: true,
        status: true,
        start: true,
        end: true,
        memo: true,
        reason: true
      }
    });
    
    console.log('Total adjustment records:', adjustments.length);
    adjustments.forEach(adj => {
      console.log(`ID: ${adj.id}, StaffID: ${adj.staffId}, Date: ${adj.date}, Status: ${adj.status}`);
    });
    
    return adjustments;
  } catch (error) {
    console.error('Error querying adjustments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();