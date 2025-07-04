const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function insertDemoData() {
  try {
    console.log('🔄 申請予定をAdjustmentテーブルに直接登録中...');
    
    // 申請予定データ（簡略版：最初の30件のみ）
    const sampleApplications = [
      {staffId: 40, date: '2025-07-07', status: 'office', startTime: 9, endTime: 20, memo: '残業'},
      {staffId: 215, date: '2025-07-07', status: 'office', startTime: 11, endTime: 18, memo: '遅刻'},
      {staffId: 13, date: '2025-07-07', status: 'off', startTime: 9, endTime: 13, memo: '午前半休'},
      {staffId: 206, date: '2025-07-07', status: 'office', startTime: 9, endTime: 13, memo: '午後半休'},
      {staffId: 178, date: '2025-07-07', status: 'off', startTime: 9, endTime: 13, memo: '午前半休'},
      {staffId: 209, date: '2025-07-07', status: 'office', startTime: 9, endTime: 16, memo: '早退'},
      {staffId: 14, date: '2025-07-07', status: 'off', startTime: 9, endTime: 18, memo: '休暇'},
      {staffId: 157, date: '2025-07-07', status: 'office', startTime: 11, endTime: 18, memo: '遅刻'},
      {staffId: 180, date: '2025-07-07', status: 'office', startTime: 9, endTime: 13, memo: '午後半休'},
      {staffId: 179, date: '2025-07-07', status: 'office', startTime: 9, endTime: 20, memo: '残業'},
      {staffId: 137, date: '2025-07-07', status: 'off', startTime: 9, endTime: 18, memo: '休暇'},
      {staffId: 184, date: '2025-07-07', status: 'office', startTime: 9, endTime: 16, memo: '早退'},
      {staffId: 207, date: '2025-07-07', status: 'off', startTime: 9, endTime: 18, memo: '休暇'},
      {staffId: 33, date: '2025-07-07', status: 'office', startTime: 11, endTime: 18, memo: '遅刻'},
      {staffId: 140, date: '2025-07-07', status: 'off', startTime: 9, endTime: 18, memo: '休暇'},
      // 7/8分
      {staffId: 47, date: '2025-07-08', status: 'office', startTime: 9, endTime: 20, memo: '残業'},
      {staffId: 174, date: '2025-07-08', status: 'off', startTime: 9, endTime: 18, memo: '休暇'},
      {staffId: 221, date: '2025-07-08', status: 'office', startTime: 11, endTime: 18, memo: '遅刻'},
      {staffId: 175, date: '2025-07-08', status: 'office', startTime: 9, endTime: 16, memo: '早退'},
      {staffId: 84, date: '2025-07-08', status: 'off', startTime: 9, endTime: 13, memo: '午前半休'},
      // 7/9分  
      {staffId: 199, date: '2025-07-09', status: 'office', startTime: 9, endTime: 20, memo: '残業'},
      {staffId: 41, date: '2025-07-09', status: 'off', startTime: 9, endTime: 18, memo: '休暇'},
      {staffId: 177, date: '2025-07-09', status: 'office', startTime: 11, endTime: 18, memo: '遅刻'},
      {staffId: 159, date: '2025-07-09', status: 'office', startTime: 9, endTime: 16, memo: '早退'},
      {staffId: 146, date: '2025-07-09', status: 'off', startTime: 9, endTime: 13, memo: '午前半休'},
      // 7/10分
      {staffId: 63, date: '2025-07-10', status: 'office', startTime: 9, endTime: 20, memo: '残業'},
      {staffId: 178, date: '2025-07-10', status: 'off', startTime: 9, endTime: 18, memo: '休暇'},
      {staffId: 32, date: '2025-07-10', status: 'office', startTime: 11, endTime: 18, memo: '遅刻'},
      {staffId: 160, date: '2025-07-10', status: 'office', startTime: 9, endTime: 16, memo: '早退'},
      {staffId: 88, date: '2025-07-10', status: 'off', startTime: 9, endTime: 13, memo: '午前半休'}
    ];
    
    let successCount = 0;
    for (const app of sampleApplications) {
      try {
        // 時刻を正しいDateTime形式に変換
        const startDateTime = new Date(`${app.date}T${String(app.startTime).padStart(2, '0')}:00:00Z`);
        const endDateTime = new Date(`${app.date}T${String(app.endTime).padStart(2, '0')}:00:00Z`);
        
        await prisma.adjustment.create({
          data: {
            staffId: app.staffId,
            date: new Date(app.date + 'T00:00:00Z'),
            status: app.status,
            start: startDateTime,
            end: endDateTime,
            memo: app.memo + ' (デモデータ)',
            isPending: false, // 承認済みとして登録
            approvedBy: 1,
            approvedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        successCount++;
        console.log(`  ✅ 申請予定 ${successCount}件 登録完了`);
      } catch (error) {
        console.error(`  ❌ 申請予定登録エラー (Staff ${app.staffId}, ${app.date}):`, error.message);
      }
    }
    
    console.log(`\n📝 申請予定登録完了: ${successCount}件`);
    
    console.log('🔄 担当設定をResponsibilityテーブルに直接登録中...');
    
    // 担当設定データ（サンプル）
    const sampleResponsibilities = [
      {staffId: 1, date: '2025-07-07', responsibilities: {fax: true}},
      {staffId: 5, date: '2025-07-07', responsibilities: {subjectCheck: true}},
      {staffId: 10, date: '2025-07-08', responsibilities: {fax: true}},
      {staffId: 15, date: '2025-07-08', responsibilities: {subjectCheck: true}},
      {staffId: 20, date: '2025-07-09', responsibilities: {fax: true}},
      {staffId: 25, date: '2025-07-09', responsibilities: {subjectCheck: true}},
      {staffId: 30, date: '2025-07-10', responsibilities: {fax: true}},
      {staffId: 35, date: '2025-07-10', responsibilities: {subjectCheck: true}},
      {staffId: 40, date: '2025-07-11', responsibilities: {fax: true}},
      {staffId: 45, date: '2025-07-11', responsibilities: {subjectCheck: true}}
    ];
    
    successCount = 0;
    for (const resp of sampleResponsibilities) {
      try {
        await prisma.responsibility.create({
          data: {
            staffId: resp.staffId,
            date: new Date(resp.date + 'T00:00:00Z'),
            responsibilities: resp.responsibilities,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        successCount++;
        console.log(`  ✅ 担当設定 ${successCount}件 登録完了`);
      } catch (error) {
        console.error(`  ❌ 担当設定登録エラー (Staff ${resp.staffId}, ${resp.date}):`, error.message);
      }
    }
    
    console.log(`\n👥 担当設定登録完了: ${successCount}件`);
    console.log('\n🎉 デモデータ直接登録が完了しました！');
    
  } catch (error) {
    console.error('❌ データ登録エラー:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

insertDemoData();