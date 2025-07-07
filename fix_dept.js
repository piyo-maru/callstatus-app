const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 部署設定データ修正中...');
  
  // 不足している部署設定を追加
  const missingDepartments = [
    { name: '総務部', backgroundColor: '#8B5CF6', displayOrder: 50 },
    { name: '企画部', backgroundColor: '#06B6D4', displayOrder: 60 },
    { name: '受付', backgroundColor: '#EC4899', displayOrder: 70 }
  ];
  
  for (const dept of missingDepartments) {
    const existing = await prisma.departmentSettings.findFirst({
      where: { name: dept.name, type: 'department' }
    });
    
    if (!existing) {
      await prisma.departmentSettings.create({
        data: {
          type: 'department',
          name: dept.name,
          backgroundColor: dept.backgroundColor,
          displayOrder: dept.displayOrder
        }
      });
      console.log('✅ ' + dept.name + ' 追加完了');
    }
  }
  
  // 不足しているグループ設定を追加
  const missingGroups = [
    { name: '総務グループ', backgroundColor: '#8B5CF6', displayOrder: 10 },
    { name: '法務グループ', backgroundColor: '#A855F7', displayOrder: 20 },
    { name: 'マーケティンググループ', backgroundColor: '#06B6D4', displayOrder: 20 },
    { name: '受付グループ', backgroundColor: '#EC4899', displayOrder: 10 },
    { name: 'インフラグループ', backgroundColor: '#10B981', displayOrder: 30 },
    { name: '企画グループ', backgroundColor: '#0EA5E9', displayOrder: 10 },
    { name: '営業1グループ', backgroundColor: '#10B981', displayOrder: 20 },
    { name: '営業2グループ', backgroundColor: '#059669', displayOrder: 30 },
    { name: '経理グループ', backgroundColor: '#D97706', displayOrder: 20 }
  ];
  
  for (const group of missingGroups) {
    const existing = await prisma.departmentSettings.findFirst({
      where: { name: group.name, type: 'group' }
    });
    
    if (!existing) {
      await prisma.departmentSettings.create({
        data: {
          type: 'group',
          name: group.name,
          backgroundColor: group.backgroundColor,
          displayOrder: group.displayOrder
        }
      });
      console.log('✅ ' + group.name + ' 追加完了');
    }
  }
  
  console.log('🎉 部署設定データ修正完了！');
}

main()
  .catch(e => console.error('エラー:', e))
  .finally(() => prisma.$disconnect());