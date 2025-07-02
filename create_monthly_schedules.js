#!/usr/bin/env node

const fs = require('fs');
const https = require('https');

// 設定
const API_BASE_URL = 'http://localhost:3002';
const CSV_FILE_PATH = '/root/callstatus-app/artifacts/07_plan_sample_utf8.csv';
const BATCH_SIZE = 25; // 25人ずつ処理
const TEST_MODE = false; // テストモード（最初の10人のみ処理）

// CSVのプリセット名とAPIプリセットIDのマッピング
const PRESET_MAPPING = {
  '夜間対応': 'night-duty',
  '夜間担当': 'night-duty',
  '出張': 'custom-1751379703893',
  '休暇': 'paid-leave',
  '夏休': 'custom-1751459461345',
  '夏季休暇': 'custom-1751459461345',
  '振休': 'custom-1751459477450',  // リフレッシュ休暇を振休として使用
  '振出': 'custom-1751466327183',
  '人間ドック休': 'custom-1751459497713',
  'ドック': 'custom-1751379600413',
  '人間ドック': 'custom-1751379600413',
  '午前休': 'custom-1751459171314',
  '午後休': 'custom-1751459196532',
  '在宅': 'custom-1751466304586',
  '通院後出社': 'early-shift',  // 通常勤務として扱う
  '14:00出社': 'early-shift',
  '10:30出社': 'early-shift',
  '15:50退社': 'custom-1751466294233',  // パートタイマーとして扱う
  '15:45退社': 'custom-1751466294233',
  '14:30退社': 'custom-1751466294233',
  '16:00退社': 'custom-1751466294233',
  '15:30退社': 'custom-1751466294233',
  '18:00退社': 'custom-1751466294233'
};

// HTTPリクエスト関数
function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = require('http').request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = body ? JSON.parse(body) : {};
          resolve(response);
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// CSVファイルを読み込み
function readCSV() {
  const content = fs.readFileSync(CSV_FILE_PATH, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  
  // ヘッダー行をスキップして、3行目（配列のindex 2）から開始
  const dataLines = lines.slice(2);
  
  console.log(`CSV読み込み完了: ${dataLines.length}行のデータ`);
  return dataLines;
}

// スタッフ情報を取得
async function getStaffList() {
  try {
    const staff = await makeRequest(`${API_BASE_URL}/api/staff`);
    console.log(`スタッフ情報取得完了: ${staff.length}人`);
    return staff.sort((a, b) => a.id - b.id); // IDでソート
  } catch (error) {
    console.error('スタッフ情報取得エラー:', error);
    throw error;
  }
}

// CSVの1行を解析してプリセット予定を作成
function parseCSVLine(csvLine, staffInfo, year = 2025, month = 7) {
  const schedules = [];
  const cells = csvLine.split(',');
  
  for (let day = 1; day <= 31; day++) {
    const cellIndex = day - 1;
    if (cellIndex >= cells.length) continue;
    
    const cellValue = cells[cellIndex].trim();
    if (!cellValue) continue;
    
    // プリセットIDを取得
    let presetId = PRESET_MAPPING[cellValue];
    
    // マッピングにない場合は、部分一致を試行
    if (!presetId) {
      for (const [csvName, apiId] of Object.entries(PRESET_MAPPING)) {
        if (cellValue.includes(csvName)) {
          presetId = apiId;
          break;
        }
      }
    }
    
    if (presetId) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      schedules.push({
        date,
        presetId,
        staffId: staffInfo.id,
        memo: cellValue !== presetId ? cellValue : ''
      });
    } else {
      console.log(`未知のプリセット: "${cellValue}" (スタッフ: ${staffInfo.name}, 日付: ${day}日)`);
    }
  }
  
  return schedules;
}

// プリセット情報キャッシュ
let PRESET_CACHE = null;

// プリセット情報を初期化
async function initializePresets() {
  try {
    // JSONファイルからプリセット情報を読み込み
    const content = fs.readFileSync('/tmp/current_presets.json', 'utf8');
    const data = JSON.parse(content);
    PRESET_CACHE = data.presets;
    console.log(`プリセット情報を初期化: ${PRESET_CACHE.length}件`);
    return true;
  } catch (error) {
    console.error('プリセット情報の初期化に失敗:', error.message);
    return false;
  }
}

// プリセット情報を取得してPending予定のペイロードを作成
async function getPresetInfo(presetId) {
  if (!PRESET_CACHE) {
    console.error('プリセット情報が初期化されていません');
    return null;
  }
  
  const preset = PRESET_CACHE.find(p => p.id === presetId);
  if (!preset) {
    console.error(`プリセットID ${presetId} が見つかりません`);
    return null;
  }
  
  // 代表スケジュールを使用
  const scheduleIndex = preset.representativeScheduleIndex || 0;
  const schedule = preset.schedules[scheduleIndex] || preset.schedules[0];
  
  return {
    status: schedule.status,
    start: schedule.startTime,
    end: schedule.endTime
  };
}

// 月次プランナーAPIでPending予定を作成
async function createPendingSchedule(schedule) {
  // プリセット情報を取得
  const presetInfo = await getPresetInfo(schedule.presetId);
  if (!presetInfo) {
    return null;
  }
  
  const payload = {
    staffId: schedule.staffId,
    date: schedule.date,
    status: presetInfo.status,
    start: presetInfo.start,
    end: presetInfo.end,
    memo: schedule.memo || '',
    pendingType: 'monthly-planner'
  };
  
  try {
    const response = await makeRequest(
      `${API_BASE_URL}/api/schedules/pending`,
      'POST',
      payload
    );
    return response;
  } catch (error) {
    console.error(`予定作成エラー (スタッフID: ${schedule.staffId}, 日付: ${schedule.date}):`, error.message);
    return null;
  }
}

// メイン処理
async function main() {
  console.log('=== 月次プランナー予定作成開始 ===');
  
  try {
    // プリセット情報を初期化
    const presetInitialized = await initializePresets();
    if (!presetInitialized) {
      console.error('プリセット情報の初期化に失敗しました。処理を中止します。');
      process.exit(1);
    }
    
    // データ取得
    const csvData = readCSV();
    const staffList = await getStaffList();
    
    // 最大225人まで処理（テストモードでは10人）
    const maxCount = TEST_MODE ? 10 : 225;
    const targetStaffCount = Math.min(maxCount, staffList.length, csvData.length);
    console.log(`処理対象: ${targetStaffCount}人${TEST_MODE ? ' (テストモード)' : ''}`);
    
    let totalSchedules = 0;
    let successCount = 0;
    let errorCount = 0;
    
    // バッチ処理で実行
    for (let batchStart = 0; batchStart < targetStaffCount; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, targetStaffCount);
      const batchNumber = Math.floor(batchStart / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(targetStaffCount / BATCH_SIZE);
      
      console.log(`\n--- バッチ ${batchNumber}/${totalBatches} (${batchStart + 1}-${batchEnd}人目) ---`);
      
      for (let i = batchStart; i < batchEnd; i++) {
        const staff = staffList[i];
        const csvLine = csvData[i];
        
        if (!csvLine) {
          console.log(`CSVデータなし: ${staff.name} (${i + 1}人目)`);
          continue;
        }
        
        console.log(`処理中: ${staff.name} (ID: ${staff.id}, ${i + 1}人目)`);
        
        // CSV行を解析して予定作成
        const schedules = parseCSVLine(csvLine, staff);
        console.log(`  予定数: ${schedules.length}件`);
        
        // 各予定を作成
        for (const schedule of schedules) {
          const result = await createPendingSchedule(schedule);
          totalSchedules++;
          
          if (result) {
            successCount++;
            console.log(`  ✓ ${schedule.date}: ${schedule.presetId}`);
          } else {
            errorCount++;
            console.log(`  ✗ ${schedule.date}: ${schedule.presetId}`);
          }
          
          // API負荷軽減のため少し待機
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      // バッチ間でちょっと休憩
      if (batchEnd < targetStaffCount) {
        console.log('バッチ間休憩中...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('\n=== 処理完了 ===');
    console.log(`処理対象スタッフ: ${targetStaffCount}人`);
    console.log(`作成予定総数: ${totalSchedules}件`);
    console.log(`成功: ${successCount}件`);
    console.log(`失敗: ${errorCount}件`);
    console.log(`成功率: ${((successCount / totalSchedules) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('メイン処理エラー:', error);
    process.exit(1);
  }
}

// プリセットマッピング表示
console.log('=== プリセットマッピング ===');
Object.entries(PRESET_MAPPING).forEach(([csv, api]) => {
  console.log(`${csv} → ${api}`);
});

// 実行
main().catch(console.error);