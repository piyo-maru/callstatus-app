const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanResetAllData() {
  try {
    console.log('全データクリーンリセット開始...');
    
    // 1. 承認ログを先に削除（外部キー制約対応）
    console.log('1. 承認ログ削除中...');
    const logDeleteResult = await prisma.pendingApprovalLog.deleteMany({});
    console.log(`削除した承認ログ数: ${logDeleteResult.count}`);
    
    // 2. Adjustment（スケジュール調整）を削除
    console.log('2. スケジュール調整データ削除中...');
    const adjustmentDeleteResult = await prisma.adjustment.deleteMany({});
    console.log(`削除したAdjustment数: ${adjustmentDeleteResult.count}`);
    
    // 3. Contract（契約勤務時間）を削除
    console.log('3. 契約勤務時間削除中...');
    const contractDeleteResult = await prisma.contract.deleteMany({});
    console.log(`削除したContract数: ${contractDeleteResult.count}`);
    
    // 4. DailyAssignment（支援設定）を削除
    console.log('4. 支援設定削除中...');
    const assignmentDeleteResult = await prisma.dailyAssignment.deleteMany({});
    console.log(`削除したDailyAssignment数: ${assignmentDeleteResult.count}`);
    
    // 5. Responsibility（担当設定）を削除 - スキップ（テーブル存在しない可能性）
    console.log('5. 担当設定削除中...');
    let responsibilityDeleteResult = { count: 0 };
    try {
      responsibilityDeleteResult = await prisma.responsibility.deleteMany({});
    } catch (e) {
      console.log('Responsibilityテーブルが存在しないか、アクセスできません。スキップします。');
    }
    console.log(`削除したResponsibility数: ${responsibilityDeleteResult.count}`);
    
    // 6. ContractDisplayCache（契約表示キャッシュ）を削除
    console.log('6. 契約表示キャッシュ削除中...');
    let cacheDeleteResult = { count: 0 };
    try {
      cacheDeleteResult = await prisma.contractDisplayCache.deleteMany({});
    } catch (e) {
      console.log('ContractDisplayCacheテーブルが存在しないか、アクセスできません。スキップします。');
    }
    console.log(`削除したContractDisplayCache数: ${cacheDeleteResult.count}`);
    
    // 7. Staff（スタッフ情報）を削除
    console.log('7. スタッフ情報削除中...');
    const staffDeleteResult = await prisma.staff.deleteMany({});
    console.log(`削除したStaff数: ${staffDeleteResult.count}`);
    
    // 8. DepartmentSetting（部署設定）を削除
    console.log('8. 部署設定削除中...');
    let deptDeleteResult = { count: 0 };
    try {
      deptDeleteResult = await prisma.departmentSetting.deleteMany({});
    } catch (e) {
      console.log('DepartmentSettingテーブルが存在しないか、アクセスできません。スキップします。');
    }
    console.log(`削除したDepartmentSetting数: ${deptDeleteResult.count}`);
    
    // 9. Snapshot（履歴スナップショット）を削除
    console.log('9. 履歴スナップショット削除中...');
    let snapshotDeleteResult = { count: 0 };
    try {
      snapshotDeleteResult = await prisma.snapshot.deleteMany({});
    } catch (e) {
      console.log('Snapshotテーブルが存在しないか、アクセスできません。スキップします。');
    }
    console.log(`削除したSnapshot数: ${snapshotDeleteResult.count}`);
    
    // 確認
    console.log('\n削除後の確認:');
    const counts = await Promise.all([
      prisma.staff.count(),
      prisma.contract.count(),
      prisma.adjustment.count(),
      prisma.dailyAssignment.count(),
      Promise.resolve(0), // responsibility skip
      Promise.resolve(0), // departmentSetting skip
      Promise.resolve(0), // snapshot skip
      prisma.pendingApprovalLog.count()
    ]);
    
    console.log(`Staff: ${counts[0]}`);
    console.log(`Contract: ${counts[1]}`);
    console.log(`Adjustment: ${counts[2]}`);
    console.log(`DailyAssignment: ${counts[3]}`);
    console.log(`Responsibility: ${counts[4]}`);
    console.log(`DepartmentSetting: ${counts[5]}`);
    console.log(`Snapshot: ${counts[6]}`);
    console.log(`PendingApprovalLog: ${counts[7]}`);
    
    console.log('\n✅ 全データクリーンリセット完了！');
    console.log('👉 次は社員情報インポート機能を使ってデータを再構築してください。');
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanResetAllData();