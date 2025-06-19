const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// APIエンドポイントの設定
const API_BASE_URL = 'http://localhost:3002/api';

// 日付範囲の設定
const START_DATE = '2025-06-18';
const END_DATE = '2025-06-22';

// 日付の範囲を生成する関数
function generateDateRange(startDate, endDate) {
    const dates = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
    }
    
    return dates;
}

// ISO文字列から時刻（HH:MM）を抽出する関数
function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Tokyo'
    });
}

// スタッフ情報をマップする関数
function mapStaffInfo(staffId, staffArray) {
    const staff = staffArray.find(s => s.id === staffId);
    if (staff) {
        return {
            empNo: staff.empNo,
            name: staff.name,
            dept: staff.department,
            group: staff.group
        };
    }
    return {
        empNo: '',
        name: 'Unknown',
        dept: '',
        group: ''
    };
}

// CSVデータを生成する関数
function generateCSVContent(data) {
    const headers = ['date', 'empNo', 'name', 'dept', 'group', 'status', 'start_time', 'end_time', 'source'];
    const csvRows = [headers.join(',')];
    
    // データをソート: 日付、従業員番号、開始時刻順
    data.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if (a.empNo !== b.empNo) return a.empNo.localeCompare(b.empNo);
        return a.start_time.localeCompare(b.start_time);
    });
    
    // データ行を生成
    data.forEach(row => {
        const csvRow = [
            row.date,
            row.empNo,
            `"${row.name}"`, // 名前はクォートで囲む
            row.dept,
            row.group,
            row.status,
            row.start_time,
            row.end_time,
            row.source
        ].join(',');
        csvRows.push(csvRow);
    });
    
    return csvRows.join('\n');
}

// メイン処理
async function exportAdjustmentData() {
    try {
        console.log('調整レイヤーデータのエクスポートを開始します...');
        
        const dates = generateDateRange(START_DATE, END_DATE);
        const allAdjustmentData = [];
        
        // 各日付のデータを取得
        for (const date of dates) {
            console.log(`${date}のデータを取得中...`);
            
            try {
                const response = await fetch(`${API_BASE_URL}/schedules?date=${date}`);
                
                if (!response.ok) {
                    console.warn(`${date}のデータ取得に失敗しました: ${response.status}`);
                    continue;
                }
                
                const data = await response.json();
                
                // 調整レイヤーのスケジュールのみをフィルタリング
                const adjustmentSchedules = data.schedules.filter(schedule => 
                    schedule.layer === 'adjustment'
                );
                
                console.log(`${date}: ${adjustmentSchedules.length}件の調整データを発見`);
                
                // データを変換
                adjustmentSchedules.forEach(schedule => {
                    const staffInfo = mapStaffInfo(schedule.staffId, data.staff);
                    
                    allAdjustmentData.push({
                        date: date,
                        empNo: staffInfo.empNo,
                        name: staffInfo.name,
                        dept: staffInfo.dept,
                        group: staffInfo.group,
                        status: schedule.status,
                        start_time: formatTime(schedule.start),
                        end_time: formatTime(schedule.end),
                        source: 'CSV投入'
                    });
                });
                
            } catch (error) {
                console.error(`${date}のデータ取得中にエラーが発生しました:`, error.message);
            }
        }
        
        console.log(`\n合計 ${allAdjustmentData.length} 件の調整データを処理しました`);
        
        if (allAdjustmentData.length === 0) {
            console.log('エクスポートするデータがありません。');
            return;
        }
        
        // CSVコンテンツを生成
        const csvContent = generateCSVContent(allAdjustmentData);
        
        // ファイルに保存
        const outputPath = '/root/callstatus-app/exported-adjustment-data.csv';
        fs.writeFileSync(outputPath, csvContent, 'utf8');
        
        console.log(`\nエクスポート完了: ${outputPath}`);
        console.log(`合計レコード数: ${allAdjustmentData.length}`);
        
        // データサマリーを表示
        const summary = {};
        allAdjustmentData.forEach(item => {
            const key = `${item.date}_${item.empNo}`;
            if (!summary[key]) {
                summary[key] = {
                    date: item.date,
                    empNo: item.empNo,
                    name: item.name,
                    count: 0
                };
            }
            summary[key].count++;
        });
        
        console.log('\n=== データサマリー ===');
        Object.values(summary).forEach(item => {
            console.log(`${item.date} - ${item.empNo} (${item.name}): ${item.count}件`);
        });
        
    } catch (error) {
        console.error('エクスポート処理中にエラーが発生しました:', error);
        process.exit(1);
    }
}

// スクリプト実行
if (require.main === module) {
    exportAdjustmentData();
}

module.exports = { exportAdjustmentData };