/**
 * Helper Functions
 * 輔助函數集合
 */

// 取得 Team 顏色
const getTeamColor = (team) => {
    const colors = {
        '晶片': '#3b82f6',      // blue
        '機構': '#8b5cf6',      // purple
        '軟體': '#10b981',      // emerald
        '電控': '#f59e0b',      // amber
        '流道': '#06b6d4',      // cyan
        '生醫': '#ec4899',      // pink
        'QA': '#6366f1',        // indigo
        '管理': '#84cc16',      // lime
        'issue': '#ef4444'      // red
    };
    return colors[team] || '#64748b'; // slate as default
};

// 取得專案顏色
const getProjectColor = (project) => {
    const colorMap = {
        'CKSX': 'bg-blue-100 text-blue-700 border-blue-200',
        'Jamstec': 'bg-purple-100 text-purple-700 border-purple-200',
        'Genentech': 'bg-emerald-100 text-emerald-700 border-emerald-200',
        '5880 Chip': 'bg-amber-100 text-amber-700 border-amber-200',
        'Internal': 'bg-cyan-100 text-cyan-700 border-cyan-200',
        'TBD': 'bg-slate-100 text-slate-600 border-slate-200',
        'Other': 'bg-pink-100 text-pink-700 border-pink-200'
    };
    return colorMap[project] || 'bg-slate-100 text-slate-600 border-slate-200';
};
const getTeamBadgeClass = (team) => {
    const classes = {
        '晶片': 'text-blue-600 border-blue-200 bg-blue-50',
        '機構': 'text-purple-600 border-purple-200 bg-purple-50',
        '軟體': 'text-emerald-600 border-emerald-200 bg-emerald-50',
        '電控': 'text-amber-600 border-amber-200 bg-amber-50',
        '流道': 'text-cyan-600 border-cyan-200 bg-cyan-50',
        '生醫': 'text-pink-600 border-pink-200 bg-pink-50',
        'QA': 'text-indigo-600 border-indigo-200 bg-indigo-50',
        '管理': 'text-lime-600 border-lime-200 bg-lime-50',
        'issue': 'text-red-600 border-red-200 bg-red-50'
    };
    return classes[team] || 'text-slate-600 border-slate-200 bg-slate-50';
};

// 取得優先級徽章
const getPriorityBadge = (priority) => {
    switch (priority) {
        case 'High':
            return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">🔴 緊急</span>;
        case 'Medium':
            return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">🟡 一般</span>;
        case 'Low':
            return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">🟢 低</span>;
        default:
            return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">{priority || '未設定'}</span>;
    }
};

// ========================================
// 📋 Task ID 顯示函數
// ========================================

// 取得縮短版 Task ID
const getShortTaskId = (taskId) => {
    if (!taskId) return '';
    const id = String(taskId);

    // 新格式: SOFT-2025-12-0003 → #SOFT-12-0003 (省略年份)
    const newFormatMatch = id.match(/^([A-Z]+)-\d{4}-(\d{2})-(\d+)$/);
    if (newFormatMatch) {
        return `#${newFormatMatch[1]}-${newFormatMatch[2]}-${newFormatMatch[3]}`;
    }

    // YAML 格式: 016_vacuum_pump_control_M3 → #016
    const yamlFormatMatch = id.match(/^(\d{3})_/);
    if (yamlFormatMatch) {
        return `#${yamlFormatMatch[1]}`;
    }

    // 純數字（舊格式時間戳）→ 顯示後 6 位
    if (/^\d+$/.test(id) && id.length > 6) {
        return `#...${id.slice(-6)}`;
    }

    // 其他: 截斷到 10 字元
    if (id.length > 10) {
        return `#${id.substring(0, 10)}...`;
    }

    return `#${id}`;
};

// 取得 Task ID 徽章 (縮短顯示 + Tooltip)
const getTaskIdBadge = (taskId) => {
    const shortId = getShortTaskId(taskId);
    const fullId = `#${taskId}`;

    return (
        <span
            className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded cursor-default hover:bg-slate-200 transition-colors"
            title={fullId}
        >
            {shortId}
        </span>
    );
};


// ========================================
// 📅 日期正規化函式 (支援 Excel 序列號 + ISO 字串)
// ========================================
const normalizeDate = (dateInput) => {
    if (!dateInput && dateInput !== 0) return '';

    // 已經是 YYYY-MM-DD 格式
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        return dateInput;
    }

    try {
        let date;

        // 處理 Excel 日期序列號（數字類型）
        if (typeof dateInput === 'number') {
            // Excel 的日期序列號基準是 1900-01-01 (實際上是 1899-12-30)
            const excelEpoch = new Date(1899, 11, 30);
            const milliseconds = dateInput * 86400000;
            date = new Date(excelEpoch.getTime() + milliseconds);
        } else if (typeof dateInput === 'string') {
            // 處理 ISO 字串（Google Sheets）或其他日期字串
            date = new Date(dateInput);

            // 如果是 ISO 字串格式（含時區），調整為當地日期
            if (/^\d{4}-\d{2}-\d{2}T/.test(dateInput)) {
                const utcDate = new Date(dateInput);
                date = new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate());
            }
        } else {
            // 其他類型嘗試直接解析
            date = new Date(dateInput);
        }

        if (isNaN(date.getTime())) {
            return '';
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        console.error('[normalizeDate] 錯誤:', dateInput, e);
        return '';
    }
};

// 取得台灣當天日期
const getTaiwanToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });

// 計算開始日期
const getStartDate = (endDateStr, duration) => {
    if (!duration || !endDateStr) return '';
    try {
        const end = new Date(endDateStr);
        const start = new Date(end);
        start.setDate(end.getDate() - duration);
        return start.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
    } catch (e) { return ''; }
};

// 解析相依性字串為陣列
const parseDependencies = (depStr) => {
    if (!depStr || typeof depStr !== 'string') return [];
    return depStr.split(',').map(id => id.trim()).filter(id => id);
};

// 驗證相依性格式與有效性
const validateDependencies = (depStr, currentTaskId, allTasks) => {
    const errors = [];
    if (!depStr || !depStr.trim()) return errors;

    const depIds = parseDependencies(depStr);

    // 限制最大相依數量
    if (depIds.length > 10) {
        errors.push('⚠️ 相依性數量不可超過 10 個');
        return errors;
    }

    for (const depId of depIds) {
        // 新版 Task ID 格式: DEPT-YEAR-MONTH-SEQ (例如: CHIP-2025-12-0005)
        // 舊版 Task ID 格式: 純數字 (例如: 12345)
        // YAML 匯入格式: 專案代碼_任務ID (例如: 016_vacuum_pump_control_task_sys_arch_design)
        const newIdPattern = /^[A-Z]{2,4}-\d{4}-\d{2}-\d{4}$/;
        const legacyIdPattern = /^\d+$/;
        const yamlIdPattern = /^\d{3}_[a-zA-Z0-9_]+$/;  // 如 016_vacuum_pump_control_task_xxx

        if (!newIdPattern.test(depId) && !legacyIdPattern.test(depId) && !yamlIdPattern.test(depId)) {
            errors.push(`❌ 相依性 ID "${depId}" 格式不正確（應為 DEPT-YEAR-MM-NNNN、純數字或 YAML 格式）`);
            continue;
        }

        // 檢查是否相依自己
        if (String(depId) === String(currentTaskId)) {
            errors.push(`❌ 任務不能相依自己 (ID: ${depId})`);
            continue;
        }

        // 檢查相依的任務是否存在
        const depTask = allTasks.find(t => String(t.id) === String(depId));
        if (!depTask) {
            errors.push(`⚠️ 找不到相依任務 ID: ${depId}`);
        }
    }

    return errors;
};

// 驗證任務
const validateTask = (task) => {
    const errors = [];

    // 任務名稱驗證
    if (!task.task?.trim()) {
        errors.push('❌ 任務名稱不能為空');
    } else if (task.task.length > 100) {
        errors.push('❌ 任務名稱不能超過100字元');
    }

    // 日期驗證
    // 假設 normalizeDate 是全域函數，如果不是，需要在此檔案定義或傳入
    // index.html 定義了 window.normalizeDate，所以這裡是可用的
    const normalizedDate = typeof window !== 'undefined' && window.normalizeDate ? window.normalizeDate(task.date) : task.date;

    if (!task.date || !normalizedDate) {
        errors.push('❌ 完成日期格式不正確');
    } else {
        const taskDate = new Date(normalizedDate);
        const startDate = new Date(getStartDate(normalizedDate, task.duration));

        if (startDate > taskDate) {
            errors.push('⚠️ 開始日期晚於完成日期，請確認工時設定');
        }

        // 檢查日期是否在合理範圍內（過去5年到未來5年）
        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
        const fiveYearsLater = new Date();
        fiveYearsLater.setFullYear(fiveYearsLater.getFullYear() + 5);

        if (taskDate < fiveYearsAgo || taskDate > fiveYearsLater) {
            errors.push('⚠️ 日期超出合理範圍（5年內）');
        }
    }

    // 工時驗證
    if (task.duration < 0) {
        errors.push('❌ 工時不能為負數');
    } else if (task.duration > 365) {
        errors.push('⚠️ 工時超過365天，請確認是否正確');
    }

    // 負責人驗證
    if (!task.owner?.trim()) {
        errors.push('❌ 負責人不能為空');
    }

    return errors;
};

// 循環相依性檢查
const detectCircularDependency = (taskId, dependencyStr, currentTasks) => {
    const depIds = parseDependencies(dependencyStr);
    if (depIds.length === 0) return false;

    // 使用 BFS 檢查每個相依性鏈
    for (const depId of depIds) {
        const visited = new Set();
        const queue = [depId];
        let depth = 0;

        while (queue.length > 0 && depth < 100) {
            const current = queue.shift();

            // 檢查是否形成循環
            if (String(current) === String(taskId)) return true;

            // 避免重複訪問
            if (visited.has(current)) continue;
            visited.add(current);

            // 找到當前任務的所有相依性
            const parent = currentTasks.find(t => String(t.id) === String(current));
            if (parent?.dependency) {
                const parentDeps = parseDependencies(parent.dependency);
                queue.push(...parentDeps);
            }

            depth++;
        }
    }
    return false;
};

// 取得狀態徽章
const getStatusBadge = (t, todayStr) => {
    // 若未傳入 todayStr，嘗試獲取
    if (!todayStr) todayStr = getTaiwanToday();

    // 如果是 JSX，因為 helpers.js 是純 JS，不能直接寫 JSX，除非使用 Babel 編譯
    // 這裡我們假設使用 React.createElement 或返回物件結構供組件使用
    // 但為了方便，我們假設 helpers.js 也會被 Babel 處理
    // 如果不行的話，這些函數應該保留在組件內或 index.html
    // 既然 index.html 有 babel，它引入 helpers.js (type="text/babel") 應該沒問題

    // Closed 狀態優先判斷 (不執行/取消的任務不算逾期)
    if (t.status === 'Closed') return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-300">✗ 不執行</span>;

    // Pending 狀態優先判斷 (擱置中的任務不算逾期)
    if (t.status === 'Pending') return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">⏸ Pending</span>;

    // 逾期判斷 (排除 Done、Closed、Pending)
    if (t.date < todayStr && t.status !== 'Done' && t.status !== 'Closed' && t.status !== 'Pending') return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">⛔ 逾期</span>;

    const startDate = getStartDate(t.date, t.duration);
    if (t.status === 'Todo' && startDate <= todayStr) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">⚠️ 應開工</span>;
    switch (t.status) {
        case 'Todo': return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">待辦</span>;
        case 'InProgress': return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">進行中</span>;
        case 'Done': return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">完成</span>;
        case 'Delayed': return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">延誤</span>;
        default: return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">{t.status}</span>;
    }
};

// 取得行高亮樣式
const getRowHighlight = (task, highlightUrgent, todayStr) => {
    if (!highlightUrgent) return '';
    if (!todayStr) todayStr = getTaiwanToday();

    // 已完成、不執行、或擱置中的任務不高亮
    if (task.status === 'Done' || task.status === 'Closed' || task.status === 'Pending') return '';

    // 延遲任務（最高優先）- 包含 status 為 Delayed 或完成日期已過（排除 Done、Closed、Pending）
    const isOverdue = task.date < todayStr;
    if (task.status === 'Delayed' || (task.status !== 'Done' && task.status !== 'Closed' && task.status !== 'Pending' && isOverdue)) {
        return 'bg-red-50 border-l-4 border-red-500';
    }

    // 應開工未動
    const startDate = getStartDate(task.date, task.duration);
    if (task.status === 'Todo' && startDate <= todayStr && task.date >= todayStr) {
        return 'bg-yellow-50 border-l-4 border-yellow-500';
    }

    return '';
};

// ========================================
// 📧 PIC Email Format Helpers (方案 A)
// ========================================

/**
 * 將 email 帳號轉換為顯示名稱
 * 使用 Owners 表進行對照，找不到則直接顯示帳號
 * @param {string} emailAccount - email 帳號 (如 james.lu)
 * @param {Array} owners - Owners 清單 (來自 API 或 Context)
 * @returns {string} 顯示名稱 (如 宗穎) 或 fallback 帳號
 */
const getDisplayName = (emailAccount, owners = []) => {
    if (!emailAccount) return '';

    // 標準化比對
    const accountLower = emailAccount.toLowerCase().trim();

    // 從 Owners 表找對應的顯示名稱
    const owner = owners.find(o => {
        if (!o.email) return false;
        const ownerAccount = o.email.split('@')[0].toLowerCase().trim();
        return ownerAccount === accountLower;
    });

    return owner?.ownerName || emailAccount;  // fallback 顯示 email 帳號
};

/**
 * 將顯示名稱轉換為 email 帳號
 * 反向查詢，用於表單提交
 * @param {string} displayName - 顯示名稱 (如 宗穎)
 * @param {Array} owners - Owners 清單
 * @returns {string} email 帳號 (如 james.lu) 或原始名稱
 */
const getOwnerEmail = (displayName, owners = []) => {
    if (!displayName) return '';

    const owner = owners.find(o => o.ownerName === displayName);

    if (owner?.email) {
        return owner.email.split('@')[0];  // 回傳 email 帳號部分
    }

    return displayName;  // fallback
};

// ========================================
// 🌐 Global Export (讓其他檔案可以使用這些函數)
// ========================================
// 因為使用 Babel 載入，const 聲明是模組作用域
// 需要明確附加到 window 才能跨檔案訪問

window.getTeamColor = getTeamColor;
window.getProjectColor = getProjectColor;
window.getTeamBadgeClass = getTeamBadgeClass;
window.getPriorityBadge = getPriorityBadge;
window.getTaskIdBadge = getTaskIdBadge;
window.normalizeDate = normalizeDate;
window.getTaiwanToday = getTaiwanToday;
window.getStartDate = getStartDate;
window.parseDependencies = parseDependencies;
window.validateDependencies = validateDependencies;
window.validateTask = validateTask;
window.detectCircularDependency = detectCircularDependency;
window.getStatusBadge = getStatusBadge;
window.getRowHighlight = getRowHighlight;
window.getDisplayName = getDisplayName;
window.getOwnerEmail = getOwnerEmail;


