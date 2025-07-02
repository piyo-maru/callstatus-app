// 月次プランナーPending申請API登録スクリプト
const fs = require('fs');
const path = require('path');

// 生成されたデータを読み込み
function loadPendingSchedules() {
  try {
    const dataPath = path.join(__dirname, 'artifacts/pending_schedules_july_2025.json');
    const jsonContent = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(jsonContent);
  } catch (error) {
    console.error('データファイルの読み込みエラー:', error);
    return [];
  }
}

// スタッフ名からスタッフIDを取得する（実際のシステムのスタッフ一覧から）
const staffNameToIdMapping = {
  '清水美月': 1, '山田真由美': 2, '山口一郎': 3, '伊藤葵': 4, '佐々木一郎': 5,
  '伊藤美優': 6, '井上悠人': 7, '佐々木葵': 8, '清水真由美': 9, '木村千尋': 10,
  '田中拓海': 11, '井上直樹': 12, '渡辺真由美': 13, '佐藤健太': 14, '佐々木健太': 15,
  '清水一郎': 16, '清水千尋': 17, '山口葵': 18, '小林彩香': 19, '山口優斗': 20,
  '佐藤結衣': 21, '田中美優': 22, '山田葵': 23, '佐々木健一': 24, '加藤悠人': 25,
  '加藤健一': 26, '山田健一': 27, '山本千尋': 28, '吉田悠人': 29, '松本直樹': 30,
  '林直樹': 31, '小林優斗': 32, '高橋一郎': 33, '加藤太郎': 34, '伊藤美月': 35,
  '井上愛': 36, '山本真由美': 37, '吉田颯太': 38, '高橋悠人': 39, '渡辺健太': 40,
  '松本美月': 41, '斎藤太郎': 42, '山口美咲': 43, '佐々木彩香': 44, '鈴木太郎': 45,
  '鈴木悠人': 46, '佐藤優斗': 47, '田中千尋': 48, '加藤彩香': 49, '中村美咲': 50,
  '伊藤一郎': 51, '木村真由美': 52, '松本結衣': 53, '鈴木美月': 54, '林結衣': 55,
  '林健太': 56, '伊藤優斗': 57, '渡辺太郎': 58, '佐藤拓海': 59, '山田一郎': 60,
  '林翔太': 61, '小林真由美': 62, '山田直樹': 63, '井上颯太': 64, '木村美月': 65,
  '山田翔太': 66, '佐藤花子': 67, '鈴木美優': 68, '佐々木拓海': 69, '井上美咲': 70,
  '渡辺拓海': 71, '田中葵': 72, '斎藤真由美': 73, '渡辺花子': 74, '斎藤花子': 75,
  '小林拓海': 76, '佐藤千尋': 77, '斎藤一郎': 78, '中村健一': 79, '木村優斗': 80,
  '山田美咲': 81, '佐々木千尋': 82, '木村一郎': 83, '吉田優斗': 84, '松本優斗': 85,
  '山口美優': 86, '木村悠人': 87, '清水直樹': 88, '木村結衣': 89, '山田颯太': 90,
  '木村翔太': 91, '渡辺愛': 92, '高橋拓海': 93, '木村健太': 94, '伊藤結衣': 95,
  '松本拓海': 96, '小林颯太': 97, '山本美月': 98, '小林悠人': 99, '吉田太郎': 100,
  '斎藤拓海': 101, '井上美月': 102, '松本颯太': 103, '山口千尋': 104, '山田拓海': 105,
  '山口美月': 106, '高橋美月': 107, '佐々木美優': 108, '高橋結衣': 109, '林千尋': 110,
  '林美咲': 111, '清水葵': 112, '佐藤太郎': 113, '田中一郎': 114, '加藤健太': 115,
  '伊藤健一': 116, '佐々木悠人': 117, '清水悠人': 118, '林彩香': 119, '山本悠人': 120,
  '加藤颯太': 121, '田中結衣': 122, '渡辺彩香': 123, '木村健一': 124, '加藤真由美': 125,
  '山口花子': 126
};

// プリセットIDから具体的なスケジュール配列に変換
function getSchedulesFromPresetId(presetId) {
  const presetSchedules = {
    'full-time-employee': [
      { status: 'online', startTime: 9, endTime: 12, memo: '' },
      { status: 'break', startTime: 12, endTime: 13, memo: '' },
      { status: 'online', startTime: 13, endTime: 18, memo: '' }
    ],
    'part-time-employee': [
      { status: 'online', startTime: 9, endTime: 12, memo: '' },
      { status: 'break', startTime: 12, endTime: 13, memo: '' },
      { status: 'online', startTime: 13, endTime: 16, memo: '' }
    ],
    'remote-full-time': [
      { status: 'remote', startTime: 9, endTime: 12, memo: '' },
      { status: 'break', startTime: 12, endTime: 13, memo: '' },
      { status: 'remote', startTime: 13, endTime: 18, memo: '' }
    ],
    'remote-part-time': [
      { status: 'remote', startTime: 9, endTime: 12, memo: '' },
      { status: 'break', startTime: 12, endTime: 13, memo: '' },
      { status: 'remote', startTime: 13, endTime: 16, memo: '' }
    ],
    'full-day-off': [
      { status: 'off', startTime: 9, endTime: 18, memo: '終日休暇' }
    ],
    'sudden-off': [
      { status: 'off', startTime: 9, endTime: 18, memo: '突発休' }
    ],
    'morning-off': [
      { status: 'off', startTime: 9, endTime: 13, memo: '午前休' }
    ],
    'afternoon-off': [
      { status: 'off', startTime: 13, endTime: 18, memo: '午後休' }
    ],
    'lunch-break': [
      { status: 'break', startTime: 12, endTime: 13, memo: '昼休憩' }
    ],
    'night-duty': [
      { status: 'night duty', startTime: 18, endTime: 21, memo: '夜間担当' }
    ],
    'night-duty-extended': [
      { status: 'night duty', startTime: 17, endTime: 21, memo: '夜間担当(延長)' }
    ],
    'meeting-block': [
      { status: 'meeting', startTime: 14, endTime: 15, memo: '定例会議' }
    ],
    'training': [
      { status: 'training', startTime: 10, endTime: 16, memo: '研修・トレーニング' }
    ]
  };
  
  return presetSchedules[presetId] || [
    { status: 'online', startTime: 9, endTime: 18, memo: 'デフォルト' }
  ];
}

// スタッフグループ別にデータを分割
function groupSchedulesByStaff(schedules, groupNumber, groupSize = 30) {
  const startIndex = (groupNumber - 1) * groupSize;
  const endIndex = groupNumber * groupSize;
  
  // スタッフ名でユニークなリストを作成
  const uniqueStaffNames = [...new Set(schedules.map(s => s.staffName))];
  const groupStaffNames = uniqueStaffNames.slice(startIndex, endIndex);
  
  return schedules.filter(schedule => 
    groupStaffNames.includes(schedule.staffName)
  );
}

// APIリクエスト用のデータフォーマット（正しいPending申請形式）
function formatForAPI(schedule) {
  const staffId = staffNameToIdMapping[schedule.staffName];
  if (!staffId) {
    console.warn(`スタッフIDが見つかりません: ${schedule.staffName}`);
    return null;
  }
  
  const scheduleDetails = getSchedulesFromPresetId(schedule.presetId);
  
  // プリセットが複数のスケジュールを持つ場合は、主要なスケジュールのみを使用
  const mainSchedule = scheduleDetails[0]; // 最初のスケジュールを使用
  
  return {
    staffId: staffId,
    date: schedule.date,
    status: getStatusDisplayName(mainSchedule.status),
    start: parseFloat(mainSchedule.startTime.toString()), // 小数点形式に変換
    end: parseFloat(mainSchedule.endTime.toString()),     // 小数点形式に変換
    memo: schedule.memo || `月次プランナー申請: ${schedule.csvValue}`,
    pendingType: 'monthly-planner'
  };
}

// ステータス名を日本語表示名に変換
function getStatusDisplayName(status) {
  const statusMapping = {
    'online': '出社',
    'remote': 'リモート',
    'off': '休暇',
    'break': '休憩',
    'meeting': '会議',
    'training': '研修',
    'night duty': '夜間担当'
  };
  
  return statusMapping[status] || status;
}

// 指定グループのPending申請を生成
function generateGroupPendingRequests(groupNumber) {
  const allSchedules = loadPendingSchedules();
  const groupSchedules = groupSchedulesByStaff(allSchedules, groupNumber);
  
  console.log(`\nグループ${groupNumber}の処理開始`);
  console.log(`対象スケジュール数: ${groupSchedules.length}`);
  
  const apiRequests = groupSchedules
    .map(formatForAPI)
    .filter(req => req !== null);
  
  console.log(`API呼び出し数: ${apiRequests.length}`);
  
  // グループ別にファイル保存
  const outputPath = path.join(__dirname, `artifacts/pending_requests_group${groupNumber}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(apiRequests, null, 2), 'utf8');
  
  console.log(`データファイル保存: ${outputPath}`);
  
  return apiRequests;
}

// 全グループの概要を表示
function showAllGroupsOverview() {
  const allSchedules = loadPendingSchedules();
  console.log('\n=== 全グループ概要 ===');
  console.log(`総スケジュール数: ${allSchedules.length}`);
  
  for (let group = 1; group <= 8; group++) {
    const groupSchedules = groupSchedulesByStaff(allSchedules, group);
    const groupSize = group === 8 ? 15 : 30; // 最後のグループは15名
    console.log(`グループ${group}: ${groupSchedules.length}件 (${groupSize}名分)`);
  }
}

// メイン実行関数
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showAllGroupsOverview();
    console.log('\n使用方法: node api_registration.js [group_number]');
    console.log('例: node api_registration.js 1  # グループ1を処理');
    return;
  }
  
  const groupNumber = parseInt(args[0]);
  if (isNaN(groupNumber) || groupNumber < 1 || groupNumber > 8) {
    console.error('グループ番号は1-8で指定してください');
    return;
  }
  
  generateGroupPendingRequests(groupNumber);
}

if (require.main === module) {
  main();
}

module.exports = {
  generateGroupPendingRequests,
  formatForAPI,
  getSchedulesFromPresetId
};