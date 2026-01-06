/**
 * Excel to Google Sheets 轉換腳本
 * 讀取 Excel 檔案，排除 Done/Closed 任務，輸出 Google Sheets 格式 CSV
 * 包含自動產生結構化 ID 功能
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Team 到 DEPT 代碼對應表
const TEAM_TO_DEPT = {
    '晶片': 'CHIP',
    '機構': 'MECH',
    '軟體': 'SOFT',
    '電控': 'CTRL',
    '流道': 'FLOW',
    '生醫': 'BIO',
    'QA': 'QA',
    '管理': 'MGT',
    'issue': 'ISS'
};

// Status 正規化對應表
const STATUS_MAP = {
    'pending': 'Pending',
    'ongoing': 'InProgress',
    'planning': 'Todo',
    '': 'Todo'  // 空白預設 Todo
};

// 不匯入的狀態（不分大小寫）
const EXCLUDE_STATUS = ['done', 'closed', 'close', 'report'];

// Google Sheets 欄位順序 (共 25 欄)
const GS_COLUMNS = [
    'ID', 'Legacy_ID', 'Team', 'Project', 'Purpose',
    'Task', 'PIC', 'Issue_Date', 'Start_Date',
    'Due_Date', 'Workday', 'Status', 'Priority',
    'Dependencies', 'Verification', 'Notes',
    'Is_Checkpoint', 'Issue_Pool', 'Date_History',
    'Impact', 'Risk', 'Urgency', 'Last_Updated',
    'Task_Type', 'Recurring_Cycle'
];

// Excel 欄位索引 (0-based)
const EXCEL_COL = {
    Project: 0,
    Team: 1,
    Purpose: 2,
    Task: 3,
    PIC: 4,
    Issue_Date: 5,
    Start_Date: 6,
    Due_Date: 7,
    Workday: 8,
    Status: 9,
    Dependencies: 10,
    Priority: 11,
    Verification: 12,
    Notes: 13,
    Legacy_ID: 14,  // Excel 的 ID 欄位作為 Legacy_ID
    Impact: 16,
    Risk: 17,
    Urgency: 18
};

// ID 計數器 (按 DEPT-YEAR-MONTH 分組)
const idCounters = {};

// 產生結構化 ID
function generateId(team, issueDate) {
    // 取得 DEPT 代碼
    const dept = TEAM_TO_DEPT[team] || 'OTH';  // 未知 team 用 OTH

    // 解析日期取得 YEAR-MONTH
    let yearMonth;
    if (issueDate) {
        const dateParts = String(issueDate).split('-');
        if (dateParts.length >= 2) {
            yearMonth = `${dateParts[0]}-${dateParts[1].padStart(2, '0')}`;
        }
    }

    // 如果沒有日期，使用當前日期
    if (!yearMonth) {
        const now = new Date();
        yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    // 計數器 key
    const counterKey = `${dept}-${yearMonth}`;

    // 遞增計數器
    if (!idCounters[counterKey]) {
        idCounters[counterKey] = 0;
    }
    idCounters[counterKey]++;

    // 產生 ID: DEPT-YEAR-MONTH-SEQ
    const seq = String(idCounters[counterKey]).padStart(4, '0');
    return `${dept}-${yearMonth}-${seq}`;
}

// 日期格式化
function formatDate(value, defaultForTBD = null) {
    if (!value) return defaultForTBD || '';

    const strValue = String(value).trim();
    const upperValue = strValue.toUpperCase();

    // TBD 開頭或空值特殊處理
    if (upperValue === 'TBD' || upperValue === '' || upperValue.startsWith('TBD')) {
        return defaultForTBD || '';
    }

    if (typeof value === 'number') {
        // Excel 日期序號
        const date = new Date((value - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
    }
    if (value instanceof Date) {
        return value.toISOString().split('T')[0];
    }
    // 嘗試解析字串日期
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
    }
    // 無法解析時使用預設值
    console.warn(`⚠️ 無法解析日期: "${strValue}", 使用預設值`);
    return defaultForTBD || '';
}

// 正規化 Status
function normalizeStatus(status) {
    const lower = String(status || '').toLowerCase().trim();
    return STATUS_MAP[lower] || 'Todo';
}

// 正規化 Priority
// P0/P1 -> High, P2 -> Medium, P3/P4 -> Low, 其他 -> Medium
function normalizePriority(priority) {
    const value = String(priority || '').toUpperCase().trim();

    // P0, P1 -> High
    if (value === 'P0' || value === 'P1' || value === 'HIGH') {
        return 'High';
    }

    // P2 -> Medium
    if (value === 'P2' || value === 'MEDIUM' || value === 'MED') {
        return 'Medium';
    }

    // P3, P4 -> Low
    if (value === 'P3' || value === 'P4' || value === 'LOW') {
        return 'Low';
    }

    // 數字處理：0-1 -> High, 2 -> Medium, 3+ -> Low
    const num = parseInt(value);
    if (!isNaN(num)) {
        if (num <= 1) return 'High';
        if (num === 2) return 'Medium';
        return 'Low';
    }

    // 預設 Medium
    return 'Medium';
}

// 轉換單筆資料
function transformRow(excelRow) {
    const gsRow = new Array(GS_COLUMNS.length).fill('');

    // 先取得 Team 和 Issue_Date 用於產生 ID
    const team = excelRow[EXCEL_COL.Team] || '';
    const issueDate = formatDate(excelRow[EXCEL_COL.Issue_Date]);
    // Due_Date: TBD 轉為 2026-01-01
    const dueDate = formatDate(excelRow[EXCEL_COL.Due_Date], '2026-01-01');

    // ID - 自動產生結構化 ID
    gsRow[0] = generateId(team, issueDate);

    // Legacy_ID - Excel 的 ID
    gsRow[1] = excelRow[EXCEL_COL.Legacy_ID] || '';

    // Team
    gsRow[2] = team;

    // Project
    gsRow[3] = excelRow[EXCEL_COL.Project] || '';

    // Purpose
    gsRow[4] = excelRow[EXCEL_COL.Purpose] || '';

    // Task
    gsRow[5] = excelRow[EXCEL_COL.Task] || '';

    // PIC
    gsRow[6] = excelRow[EXCEL_COL.PIC] || '';

    // Issue_Date
    gsRow[7] = issueDate;

    // Start_Date
    gsRow[8] = formatDate(excelRow[EXCEL_COL.Start_Date]);

    // Due_Date
    gsRow[9] = dueDate;

    // Workday - 預設至少為 1（避免甘特圖異常）
    const workday = parseFloat(excelRow[EXCEL_COL.Workday]) || 0;
    gsRow[10] = workday > 0 ? workday : 1;

    // Status (正規化)
    gsRow[11] = normalizeStatus(excelRow[EXCEL_COL.Status]);

    // Priority (正規化：P0/P1 -> High, P2 -> Medium, P3/P4 -> Low)
    gsRow[12] = normalizePriority(excelRow[EXCEL_COL.Priority]);

    // Dependencies
    gsRow[13] = excelRow[EXCEL_COL.Dependencies] || '';

    // Verification
    gsRow[14] = excelRow[EXCEL_COL.Verification] || '';

    // Notes
    gsRow[15] = excelRow[EXCEL_COL.Notes] || '';

    // Is_Checkpoint
    gsRow[16] = false;

    // Issue_Pool
    gsRow[17] = false;

    // Date_History - 初始化為 JSON 陣列
    const initialHistory = [{
        date: dueDate || new Date().toISOString().split('T')[0],
        changedAt: new Date().toISOString(),
        reason: '初始規劃',
        version: 1
    }];
    gsRow[18] = JSON.stringify(initialHistory);

    // Impact
    gsRow[19] = parseInt(excelRow[EXCEL_COL.Impact]) || 0;

    // Risk
    gsRow[20] = parseInt(excelRow[EXCEL_COL.Risk]) || 0;

    // Urgency
    gsRow[21] = parseInt(excelRow[EXCEL_COL.Urgency]) || 0;

    // Last_Updated
    gsRow[22] = new Date().toISOString();

    // Task_Type - 預設為一次性任務
    gsRow[23] = 'one-time';

    // Recurring_Cycle - 預設為空
    gsRow[24] = '';

    return gsRow;
}

// 主程式
function main() {
    const inputFile = process.argv[2] || 'temp/1218_task.xlsx';
    const outputFile = process.argv[3] || 'temp/import_to_gs.csv';

    console.log('📖 讀取 Excel:', inputFile);

    const wb = XLSX.readFile(inputFile);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

    console.log('📊 總筆數:', data.length - 1);

    // 過濾並轉換
    const rows = data.slice(1).filter(row => {
        const status = String(row[EXCEL_COL.Status] || '').toLowerCase().trim();
        return !EXCLUDE_STATUS.includes(status);
    }).map(transformRow);

    console.log('✅ 待匯入:', rows.length, '筆');

    // 輸出 CSV
    const header = GS_COLUMNS.join(',');
    const csvRows = rows.map(row =>
        row.map(cell => {
            const str = String(cell);
            // 如果包含逗號、換行或引號，需要加引號並轉義
            if (str.includes(',') || str.includes('\n') || str.includes('"')) {
                return '"' + str.replace(/"/g, '""') + '"';
            }
            return str;
        }).join(',')
    );

    const csv = [header, ...csvRows].join('\n');
    fs.writeFileSync(outputFile, csv, 'utf-8');

    console.log('📄 輸出:', outputFile);
    console.log('\n=== Status 分布 ===');

    const statusDist = {};
    rows.forEach(row => {
        const s = row[11];
        statusDist[s] = (statusDist[s] || 0) + 1;
    });
    Object.entries(statusDist).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

    console.log('\n=== ID 分布 ===');
    Object.entries(idCounters).forEach(([k, v]) => console.log(`  ${k}: ${v} 筆`));

    console.log('\n=== 範例 ID ===');
    rows.slice(0, 5).forEach(row => console.log(`  ${row[0]} (Legacy: ${row[1]})`));

    console.log('\n✨ 完成！請將 CSV 匯入 Google Sheets');
}

main();
