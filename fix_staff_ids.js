#!/usr/bin/env node

/**
 * スタッフIDを実際の範囲（73-297）に修正するスクリプト
 */

const fs = require('fs');

// 実際のスタッフID範囲
const MIN_STAFF_ID = 73;
const MAX_STAFF_ID = 297;
const STAFF_COUNT = MAX_STAFF_ID - MIN_STAFF_ID + 1; // 225人

// 元の想定範囲から実際の範囲へのマッピング関数
function mapStaffId(originalId) {
  // 元の想定範囲は226-450だったと思われるので、それを73-297にマップ
  const originalMin = 1;
  const originalMax = 450;
  
  // 1-450の範囲を73-297の範囲にマップ
  const ratio = (originalId - originalMin) / (originalMax - originalMin);
  const newId = Math.floor(MIN_STAFF_ID + ratio * STAFF_COUNT);
  
  // 範囲内に収める
  return Math.max(MIN_STAFF_ID, Math.min(MAX_STAFF_ID, newId));
}

// ファイルを修正する関数
function fixStaffIds(filename) {
  console.log(`🔧 修正中: ${filename}`);
  
  try {
    const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
    let fixedCount = 0;
    
    if (data.applications) {
      data.applications.forEach(app => {
        const oldId = app.staffId;
        app.staffId = mapStaffId(oldId);
        if (oldId !== app.staffId) {
          fixedCount++;
        }
      });
    }
    
    if (data.responsibilities) {
      data.responsibilities.forEach(resp => {
        const oldId = resp.staffId;
        resp.staffId = mapStaffId(oldId);
        if (oldId !== resp.staffId) {
          fixedCount++;
        }
      });
    }
    
    // 修正されたデータを保存
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`✅ ${filename}: ${fixedCount}件のスタッフID修正完了`);
    
  } catch (error) {
    console.error(`❌ ${filename}の修正エラー:`, error.message);
  }
}

// メイン処理
console.log('🚀 スタッフID範囲修正開始 (73-297に調整)');

const files = [
  'scripts/demo-data/demo_data_july_2025.json',
  'scripts/demo-data/demo_data_august_2025.json',
  'scripts/demo-data/demo_data_september_2025.json'
];

files.forEach(fixStaffIds);

console.log('✅ 全ファイルの修正完了');