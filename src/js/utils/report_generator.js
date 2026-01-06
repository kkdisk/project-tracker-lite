/**
 * Report Generator - 每週報告產生器
 * 功能：匯出 Excel 快照、比對快照、產生報告
 */

// ========================================
// 📥 匯出 Excel 快照
// ========================================

/**
 * 匯出當前任務清單為 Excel 快照
 * @param {Array} tasks - 當前任務清單
 * @param {string} filename - 檔案名稱 (可選)
 */
const exportSnapshot = (tasks) => {
    if (!tasks || tasks.length === 0) {
        alert('沒有任務可匯出');
        return;
    }

    // 準備匯出資料
    const today = new Date().toISOString().split('T')[0];
    const filename = `TaskSnapshot_${today}.xlsx`;

    // 轉換為匯出格式
    const exportData = tasks.map(t => ({
        'ID': t.id,
        'Team': t.team || '',
        'Project': t.project || '',
        'Task': t.task || '',
        'Owner': t.owner || '',
        'StartDate': t.startDate || '',
        'DueDate': t.date || '',
        'Duration': t.duration || 0,
        'Status': t.status || 'Todo',
        'Priority': t.priority || 'Medium',
        'Dependency': t.dependency || '',
        'Notes': t.notes || '',
        'IsCheckpoint': t.isCheckpoint ? 'TRUE' : 'FALSE',
        'IssuePool': t.issuePool ? 'TRUE' : 'FALSE',
        '_SnapshotDate': today  // 識別這是快照檔案
    }));

    // 使用 XLSX 生成工作簿
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TaskSnapshot');

    // 下載檔案
    XLSX.writeFile(wb, filename);

    console.log(`✅ 快照已匯出: ${filename} (${tasks.length} 筆)`);
};

// ========================================
// 🔍 比對快照
// ========================================

/**
 * 比對舊快照與新資料
 * @param {Array} oldTasks - 舊快照任務清單
 * @param {Array} newTasks - 當前任務清單
 * @returns {Object} 比對結果
 */
const compareSnapshots = (oldTasks, newTasks) => {
    const oldMap = new Map(oldTasks.map(t => [String(t.id || t.ID), t]));
    const newMap = new Map(newTasks.map(t => [String(t.id || t.ID), t]));

    const today = new Date().toISOString().split('T')[0];

    const result = {
        snapshotDate: oldTasks[0]?._SnapshotDate || oldTasks[0]?.['_SnapshotDate'] || '未知',
        reportDate: today,
        added: [],       // 🆕 新增
        removed: [],     // 🗑️ 刪除
        completed: [],   // ✅ 完成
        dateChanged: [], // 📅 時程變更
        statusChanged: [], // 🔄 狀態變更
        delayed: []      // ⚠️ 延遲
    };

    // 正規化取值函數
    const getVal = (task, key) => task[key] || task[key.toLowerCase()] || '';
    const getStatus = (task) => getVal(task, 'status') || getVal(task, 'Status') || 'Todo';
    const getDate = (task) => getVal(task, 'date') || getVal(task, 'DueDate') || '';
    const getId = (task) => String(getVal(task, 'id') || getVal(task, 'ID'));

    // 找新增項目 (新資料有，舊快照無)
    for (const [id, task] of newMap) {
        if (!oldMap.has(id)) {
            result.added.push(task);
        }
    }

    // 找刪除項目 (舊快照有，新資料無)
    for (const [id, task] of oldMap) {
        if (!newMap.has(id)) {
            result.removed.push(task);
        }
    }

    // 找變更項目
    for (const [id, newTask] of newMap) {
        const oldTask = oldMap.get(id);
        if (!oldTask) continue;

        const oldStatus = getStatus(oldTask);
        const newStatus = getStatus(newTask);
        const oldDate = getDate(oldTask);
        const newDate = getDate(newTask);

        // 完成 (之前非完成，現在完成)
        if (!['Done', 'Closed'].includes(oldStatus) && ['Done', 'Closed'].includes(newStatus)) {
            result.completed.push(newTask);
        }
        // 狀態變更 (非完成類別的變更)
        else if (oldStatus !== newStatus) {
            result.statusChanged.push({
                task: newTask,
                oldStatus: oldStatus,
                newStatus: newStatus
            });
        }

        // 時程變更
        if (oldDate !== newDate) {
            result.dateChanged.push({
                task: newTask,
                oldDate: oldDate,
                newDate: newDate
            });
        }
    }

    // 找延遲項目 (Due Date 已過且未完成)
    for (const task of newTasks) {
        const dueDate = getDate(task);
        const status = getStatus(task);

        if (dueDate && dueDate < today && !['Done', 'Closed'].includes(status)) {
            result.delayed.push(task);
        }
    }

    console.log('📊 比對結果:', result);
    return result;
};

// ========================================
// 📝 產生報告
// ========================================

/**
 * 將比對結果格式化為報告
 * @param {Object} diff - 比對結果
 * @returns {string} Markdown 格式報告
 */
const generateReportMarkdown = (diff) => {
    const lines = [];

    lines.push(`# 每週任務報告`);
    lines.push(`> 快照日期: ${diff.snapshotDate} | 報告日期: ${diff.reportDate}`);
    lines.push('');

    // 統計摘要
    lines.push('## 📊 摘要');
    lines.push(`| 類別 | 數量 |`);
    lines.push(`|---|---|`);
    lines.push(`| 🆕 新增 | ${diff.added.length} |`);
    lines.push(`| 🗑️ 刪除 | ${diff.removed.length} |`);
    lines.push(`| ✅ 完成 | ${diff.completed.length} |`);
    lines.push(`| 📅 時程變更 | ${diff.dateChanged.length} |`);
    lines.push(`| 🔄 狀態變更 | ${diff.statusChanged.length} |`);
    lines.push(`| ⚠️ 延遲 | ${diff.delayed.length} |`);
    lines.push('');

    // 詳細列表
    if (diff.added.length > 0) {
        lines.push('## 🆕 本週新增');
        lines.push('| ID | 任務 | 負責人 | Due Date |');
        lines.push('|---|---|---|---|');
        diff.added.forEach(t => {
            lines.push(`| ${t.id || t.ID} | ${t.task || t.Task} | ${t.owner || t.Owner} | ${t.date || t.DueDate} |`);
        });
        lines.push('');
    }

    if (diff.completed.length > 0) {
        lines.push('## ✅ 本週完成');
        lines.push('| ID | 任務 | 負責人 |');
        lines.push('|---|---|---|');
        diff.completed.forEach(t => {
            lines.push(`| ${t.id || t.ID} | ${t.task || t.Task} | ${t.owner || t.Owner} |`);
        });
        lines.push('');
    }

    if (diff.dateChanged.length > 0) {
        lines.push('## 📅 時程變更');
        lines.push('| ID | 任務 | 原定 | 新日期 |');
        lines.push('|---|---|---|---|');
        diff.dateChanged.forEach(d => {
            const t = d.task;
            lines.push(`| ${t.id || t.ID} | ${t.task || t.Task} | ${d.oldDate} | ${d.newDate} |`);
        });
        lines.push('');
    }

    if (diff.statusChanged.length > 0) {
        lines.push('## 🔄 狀態變更');
        lines.push('| ID | 任務 | 原狀態 | 新狀態 |');
        lines.push('|---|---|---|---|');
        diff.statusChanged.forEach(d => {
            const t = d.task;
            lines.push(`| ${t.id || t.ID} | ${t.task || t.Task} | ${d.oldStatus} | ${d.newStatus} |`);
        });
        lines.push('');
    }

    if (diff.delayed.length > 0) {
        lines.push('## ⚠️ 延遲項目');
        lines.push('| ID | 任務 | 負責人 | 原定 Due | 延遲天數 |');
        lines.push('|---|---|---|---|---|');
        const today = new Date();
        diff.delayed.forEach(t => {
            const dueDate = new Date(t.date || t.DueDate);
            const delayDays = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
            lines.push(`| ${t.id || t.ID} | ${t.task || t.Task} | ${t.owner || t.Owner} | ${t.date || t.DueDate} | ${delayDays} 天 |`);
        });
        lines.push('');
    }

    if (diff.removed.length > 0) {
        lines.push('## 🗑️ 已刪除');
        lines.push('| ID | 任務 |');
        lines.push('|---|---|');
        diff.removed.forEach(t => {
            lines.push(`| ${t.id || t.ID} | ${t.task || t.Task} |`);
        });
        lines.push('');
    }

    return lines.join('\n');
};

/**
 * 檢查上傳的 Excel 是否為快照檔案
 * @param {Array} data - 解析後的資料
 * @returns {boolean}
 */
const isSnapshotFile = (data) => {
    if (!data || data.length === 0) return false;
    const firstRow = data[0];
    return firstRow.hasOwnProperty('_SnapshotDate') || firstRow.hasOwnProperty('_SnapshotDate');
};

// ========================================
// 🌐 Global Export
// ========================================

window.exportSnapshot = exportSnapshot;
window.compareSnapshots = compareSnapshots;
window.generateReportMarkdown = generateReportMarkdown;
window.isSnapshotFile = isSnapshotFile;
