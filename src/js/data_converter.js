/**
 * UnifiedTaskManager Excel 格式轉換器
 * 將 Excel 資料格式轉換為 Project Tracker 所需格式
 * VERSION: 2025-12-11_1300 - 支援 Excel 序列號日期格式
 */

// 確認此版本已載入
console.log('✅ data_converter.js 已載入 - 版本: 2025-12-11_1300 (支援 Excel 日期序列號)');

/**
 * normalizeDate 函數已在 index.html 中定義（覆寫版本）
 * 此處不再定義，直接使用全域版本
 * 該函數支援 Excel 日期序列號和字串格式
 */

/**
 * 計算兩個日期之間的天數差
 */
function calculateDuration(startDateStr, endDateStr) {
    if (!startDateStr || !endDateStr) return 0;

    try {
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return Math.max(0, diffDays); // 確保不為負數
    } catch (e) {
        console.error('Duration 計算錯誤:', startDateStr, endDateStr, e);
        return 0;
    }
}

/**
 * 對應狀態值
 * UnifiedTaskManager: done, closed, report, in-progress, todo 等
 * Project Tracker: Done, InProgress, Todo
 */
function mapStatus(utmStatus) {
    if (!utmStatus) return 'Todo';

    const status = String(utmStatus).toLowerCase().trim();

    // 完成狀態
    if (['done', 'closed', 'report', 'completed'].includes(status)) {
        return 'Done';
    }

    // 進行中
    if (['in-progress', 'in progress', 'ongoing', 'active'].includes(status)) {
        return 'InProgress';
    }

    // 預設為待辦
    return 'Todo';
}

/**
 * 對應優先級
 * UnifiedTaskManager: p0, p1, p2, p3 等
 * Project Tracker: High, Medium, Low
 */
function mapPriority(utmPriority) {
    if (!utmPriority) return 'Medium';

    const priority = String(utmPriority).toLowerCase().trim();

    // 高優先級
    if (['p0', 'p1', 'high', 'critical', 'urgent'].includes(priority)) {
        return 'High';
    }

    // 低優先級
    if (['p3', 'p4', 'low'].includes(priority)) {
        return 'Low';
    }

    // 預設中優先級
    return 'Medium';
}

/**
 * 欄位名稱映射表 - 處理不同的欄位命名慣例
 */
const FIELD_ALIASES = {
    'ID': ['ID', 'id'],
    'Project': ['Project', 'project'],
    'Team': ['Team', 'team'],
    'Purpose': ['Purpose', 'purpose'],
    'Task': ['Task', 'task'],
    'PIC': ['PIC', 'pic', 'Owner', 'owner'],
    'Issue Date': ['Issue Date', 'Issue date', 'issue date', 'IssueDate'],
    'Start Date': ['Start Date', 'Start date', 'start date', 'StartDate'],
    'End Date': ['End Date', 'end date', 'Due Date', 'Due date', 'due date', 'DueDate'],
    'Status': ['Status', 'status'],
    'Priority': ['Priority', 'priority'],
    'Dependencies': ['Dependencies', 'dependencies', 'Dependency', 'dependency'],
    'Note': ['Note', 'note', 'Notes', 'notes'],
    'Verification': ['Verification', 'verification']
};

/**
 * 取得欄位值 - 自動處理欄位名稱變體
 */
function getFieldValue(row, standardFieldName) {
    const aliases = FIELD_ALIASES[standardFieldName] || [standardFieldName];
    for (const alias of aliases) {
        if (row.hasOwnProperty(alias) && row[alias] !== undefined && row[alias] !== '') {
            return row[alias];
        }
    }
    return undefined;
}

/**
 * 判斷是否為里程碑
 * 規則：優先級為 p0/p1 或任務名稱包含特定關鍵字
 */
function isCheckpoint(row) {
    const priority = String(getFieldValue(row, 'Priority') || '').toLowerCase();
    const task = String(getFieldValue(row, 'Task') || '').toLowerCase();
    const purpose = String(getFieldValue(row, 'Purpose') || '').toLowerCase();

    // P0/P1 視為里程碑
    if (['p0', 'p1'].includes(priority)) return true;

    // 包含里程碑關鍵字
    const checkpointKeywords = ['milestone', '里程碑', 'checkpoint', 'release', '發布', 'review', '審查'];
    return checkpointKeywords.some(keyword =>
        task.includes(keyword) || purpose.includes(keyword)
    );
}

/**
 * 驗證單筆資料的必填欄位
 */
function validateRow(row, rowIndex) {
    const errors = [];

    const id = getFieldValue(row, 'ID');
    const task = getFieldValue(row, 'Task');

    if (!id) {
        errors.push(`第 ${rowIndex + 1} 列：缺少 ID`);
    }

    if (!task) {
        errors.push(`第 ${rowIndex + 1} 列 (ID: ${id})：缺少 Task`);
    }

    // End Date 改為選填 - 允許 TBD 或未定義截止日期的任務

    return errors;
}

/**
 * 主要轉換函數
 * 將 UnifiedTaskManager Excel 資料轉換為 Project Tracker 格式
 * 
 * @param {Array} utmData - Excel 解析後的 JSON 資料
 * @returns {Object} { success: boolean, data: Array, errors: Array }
 */
function convertUTMToTracker(utmData) {
    if (!Array.isArray(utmData)) {
        return {
            success: false,
            data: [],
            errors: ['輸入資料格式錯誤：必須是陣列']
        };
    }

    const convertedData = [];
    const allErrors = [];

    utmData.forEach((row, index) => {
        // 驗證必填欄位
        const validationErrors = validateRow(row, index);
        if (validationErrors.length > 0) {
            allErrors.push(...validationErrors);
            return; // 跳過無效資料列
        }

        try {
            // 使用 getFieldValue 取得欄位值,支援多種名稱格式
            // 強制使用全域版本的 normalizeDate（支援 Excel 序列號）
            const rawEndDate = getFieldValue(row, 'End Date');
            const rawStartDate = getFieldValue(row, 'Start Date');

            const endDate = window.normalizeDate(rawEndDate);
            const startDate = window.normalizeDate(rawStartDate);

            // 如果沒有 endDate 和 startDate,使用空字串(允許 TBD 任務)
            const finalEndDate = endDate || '';
            const finalStartDate = startDate || endDate || '';

            const duration = (finalStartDate && finalEndDate) ? calculateDuration(finalStartDate, finalEndDate) : 0;

            const convertedRow = {
                // 基本欄位對應
                id: Number(getFieldValue(row, 'ID')) || getFieldValue(row, 'ID'),
                team: getFieldValue(row, 'Team') || '其他', // Excel 的 Team 欄位直接映射到 team
                category: getFieldValue(row, 'Category') || 'Unassigned',
                task: getFieldValue(row, 'Task') || '',
                owner: getFieldValue(row, 'PIC') || 'Unassigned',
                date: finalEndDate,
                status: mapStatus(getFieldValue(row, 'Status')),
                priority: mapPriority(getFieldValue(row, 'Priority')),
                duration: duration,
                isCheckpoint: isCheckpoint(row),
                dependency: getFieldValue(row, 'Dependencies') || '',
                notes: getFieldValue(row, 'Note') || '',

                // 擴充欄位（保留 UnifiedTaskManager 特有資料）
                verification: getFieldValue(row, 'Verification') || '',
                issueDate: window.normalizeDate(getFieldValue(row, 'Issue Date')) || '',
                purpose: getFieldValue(row, 'Purpose') || '',
                startDate: finalStartDate
            };

            convertedData.push(convertedRow);

        } catch (error) {
            allErrors.push(`第 ${index + 1} 列 (ID: ${getFieldValue(row, 'ID')})：轉換失敗 - ${error.message}`);
        }
    });

    return {
        success: allErrors.length === 0,
        data: convertedData,
        errors: allErrors,
        stats: {
            total: utmData.length,
            converted: convertedData.length,
            failed: utmData.length - convertedData.length
        }
    };
}

/**
 * 反向轉換：Project Tracker 格式轉回 UnifiedTaskManager 格式
 * 用於匯出 Excel 時使用
 */
function convertTrackerToUTM(trackerData) {
    return trackerData.map(row => ({
        'ID': row.id,
        'Project': row.project,
        'Team': row.category,
        'Purpose': row.purpose || '',
        'Task': row.task,
        'PIC': row.owner,
        'Issue Date': row.issueDate || '',
        'Start Date': row.startDate || '',
        'End Date': row.date,
        'Status': row.status,
        'Priority': row.priority,
        'Dependencies': row.dependency || '',
        'Note': row.notes || '',
        'Verification': row.verification || ''
    }));
}

// 如果在 Node.js 環境中，匯出模組
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        convertUTMToTracker,
        convertTrackerToUTM,
        normalizeDate,
        calculateDuration,
        mapStatus,
        mapPriority
    };
}
