// GanttView Component
// 需確保引入: React, Recharts(雖然此組件沒用), helpers.js, icons.js
// Props: tasks, ganttFilterTeam, searchQuery, setGanttFilterTeam, setEditingTask, setIsModalOpen, setViewMode, isMobile, todayStr, showDependencies, setShowDependencies (if managed externally, but here it manages its own state for showDependencies unless lifted) 

// Note: In original code, showDependencies was state in App? 
// Let's check App: line 573: const [showDependencies, setShowDependencies] = useState(false);
// So it is passed as props or context.
// In the original GanttView definition in index.html, it used showDependencies from App scope.
// So I must add showDependencies and setShowDependencies to props.

const GanttView = () => {
    const {
        tasks = [],
        ganttFilterTeam = 'All',
        searchQuery = '',
        setGanttFilterTeam,
        setEditingTask,
        setIsModalOpen,
        setViewMode,
        isMobile,
        todayStr,
        showDependencies,
        setShowDependencies,
        TEAMS = []
    } = useAppContext();

    // Constants
    const PX_PER_DAY = 40;
    const ROW_HEIGHT = 40;
    const { useState, useEffect, useMemo, useRef } = React;

    // ============================================
    // 專案顏色配置 - 依需求自行擴充
    // ============================================
    const PROJECT_COLORS = {
        'PlanB': { bg: 'bg-emerald-500', border: '#10b981' },      // 綠色
        'Machine': { bg: 'bg-purple-500', border: '#a855f7' },     // 紫色
        'Genentech': { bg: 'bg-blue-500', border: '#3b82f6' },     // 藍色
        'Platform': { bg: 'bg-orange-500', border: '#f97316' },    // 橘色
        'Chip': { bg: 'bg-cyan-500', border: '#06b6d4' },          // 青色
        'Software': { bg: 'bg-pink-500', border: '#ec4899' },      // 粉紅
        'QC': { bg: 'bg-amber-500', border: '#f59e0b' },           // 黃色
    };
    const DEFAULT_COLOR = { bg: 'bg-slate-500', border: '#64748b' };

    // 取得專案顏色的函式
    const getProjectColor = (projectName) => {
        if (!projectName) return DEFAULT_COLOR;
        // 支援部分匹配（例如 projectName 包含關鍵字）
        const exactMatch = PROJECT_COLORS[projectName];
        if (exactMatch) return exactMatch;
        // 嘗試部分匹配
        for (const [key, value] of Object.entries(PROJECT_COLORS)) {
            if (projectName.toLowerCase().includes(key.toLowerCase())) {
                return value;
            }
        }
        return DEFAULT_COLOR;
    };

    const { sortedTasks, minDate, totalDays } = useMemo(() => {
        // 先依據 Team 篩選
        let ganttTasks = tasks.filter(t => ganttFilterTeam === 'All' || (t.team && t.team === ganttFilterTeam));

        // 再依據搜尋條件篩選（支援前綴詞搜尋）
        if (searchQuery.trim()) {
            const query = searchQuery.trim();

            // 檢查是否使用前綴詞搜尋 (例如: "project:Genentech" 或 "purpose:孔盤")
            const prefixMatch = query.match(/^(project|purpose|owner|pic|team|task|note|status):(.*)/i);

            if (prefixMatch) {
                // 前綴詞搜尋模式
                const field = prefixMatch[1].toLowerCase();
                const searchValue = prefixMatch[2].toLowerCase();

                ganttTasks = ganttTasks.filter(t => {
                    switch (field) {
                        case 'project':
                            return t.project && String(t.project).toLowerCase().includes(searchValue);
                        case 'purpose':
                            return t.purpose && String(t.purpose).toLowerCase().includes(searchValue);
                        case 'owner':
                        case 'pic':
                            return t.owner && String(t.owner).toLowerCase().includes(searchValue);
                        case 'team':
                            return t.team && String(t.team).toLowerCase().includes(searchValue);
                        case 'task':
                            return t.task && String(t.task).toLowerCase().includes(searchValue);
                        case 'note':
                            return t.notes && String(t.notes).toLowerCase().includes(searchValue);
                        case 'status':
                            return t.status && String(t.status).toLowerCase().includes(searchValue);
                        default:
                            return false;
                    }
                });
            } else {
                // 一般搜尋模式（搜尋所有欄位，包含 purpose）
                const lowerQuery = query.toLowerCase();
                ganttTasks = ganttTasks.filter(t => {
                    const matchTask = t.task && String(t.task).toLowerCase().includes(lowerQuery);
                    const matchOwner = t.owner && String(t.owner).toLowerCase().includes(lowerQuery);
                    const matchTeam = t.team && String(t.team).toLowerCase().includes(lowerQuery);
                    const matchProject = t.project && String(t.project).toLowerCase().includes(lowerQuery);
                    const matchPurpose = t.purpose && String(t.purpose).toLowerCase().includes(lowerQuery);
                    const matchNotes = t.notes && String(t.notes).toLowerCase().includes(lowerQuery);
                    return matchTask || matchOwner || matchTeam || matchProject || matchPurpose || matchNotes;
                });
            }
        }

        // 輔助函數：驗證日期是否有效
        const isValidDate = (d) => d instanceof Date && !isNaN(d.getTime());

        // 去重邏輯：使用 Map 確保相同 ID 的任務只保留一筆
        const uniqueTasksMap = new Map();
        ganttTasks.forEach(t => {
            if (!uniqueTasksMap.has(t.id)) {
                uniqueTasksMap.set(t.id, t);
            }
        });
        const uniqueTasks = Array.from(uniqueTasksMap.values());

        const sorted = uniqueTasks
            // 先過濾掉沒有有效日期的任務
            .filter(t => {
                const endDate = new Date(t.date);
                return isValidDate(endDate);
            })
            .sort((a, b) => new Date(getStartDate(a.date, a.duration)) - new Date(getStartDate(b.date, b.duration)));

        let min = new Date();
        let max = new Date();
        if (sorted.length > 0) {
            // 過濾掉無效日期，避免 NaN 問題
            const dates = sorted.flatMap(t => {
                const startDate = new Date(getStartDate(t.date, t.duration));
                const endDate = new Date(t.date);
                return [startDate, endDate].filter(isValidDate);
            });

            if (dates.length > 0) {
                min = new Date(Math.min(...dates));
                max = new Date(Math.max(...dates));
            }
        }
        min.setDate(min.getDate() - 5);
        max.setDate(max.getDate() + 15);
        const days = Math.ceil((max - min) / (1000 * 60 * 60 * 24));
        return { sortedTasks: sorted, minDate: min, totalDays: days };
    }, [tasks, ganttFilterTeam, searchQuery]);

    const getLeftPos = (dStr) => {
        const d = new Date(dStr);
        const diff = Math.ceil((d - minDate) / (1000 * 60 * 60 * 24));
        return diff * PX_PER_DAY;
    };

    const todayPos = getLeftPos(todayStr);

    const drawDependencies = () => {
        if (!showDependencies) return null;
        const lines = [];

        sortedTasks.forEach((task, taskIndex) => {
            if (!task.dependency) return;

            // 解析多個相依性
            const depIds = parseDependencies(task.dependency);

            depIds.forEach(depId => {
                const parent = sortedTasks.find(p => String(p.id) === String(depId));
                const parentIndex = sortedTasks.indexOf(parent);
                if (!parent || parentIndex === -1) return;

                const parentStartStr = getStartDate(parent.date, parent.duration);
                const parentX = getLeftPos(parentStartStr) + (parent.duration * PX_PER_DAY);
                const parentY = parentIndex * ROW_HEIGHT + 20;
                const childStartStr = getStartDate(task.date, task.duration);
                const childX = getLeftPos(childStartStr);
                const childY = taskIndex * ROW_HEIGHT + 20;

                // 衝突偵測：子任務開始日期早於或等於父任務完成日期
                const hasConflict = parent.date >= childStartStr;
                const strokeColor = hasConflict ? '#dc2626' : '#94a3b8';
                const strokeWidth = hasConflict ? '2.5' : '1.5';
                const markerEnd = hasConflict ? 'url(#arrowhead-red)' : 'url(#arrowhead)';

                const path = `M ${parentX} ${parentY} C ${parentX + 20} ${parentY}, ${childX - 20} ${childY}, ${childX} ${childY}`;
                lines.push(
                    <path key={`${parent.id}-${task.id}`} d={path} stroke={strokeColor} strokeWidth={strokeWidth} fill="none" markerEnd={markerEnd} />
                );
            });
        });

        return lines;
    };

    // Group days by month for the month header
    const monthHeaders = useMemo(() => {
        const headers = [];
        let currentMonth = -1;
        let monthStartDay = 0;

        for (let i = 0; i < totalDays; i++) {
            const d = new Date(minDate);
            d.setDate(d.getDate() + i);
            const month = d.getMonth();

            if (month !== currentMonth) {
                if (currentMonth !== -1) {
                    headers.push({
                        month: currentMonth,
                        year: new Date(minDate.getTime() + (monthStartDay * 24 * 60 * 60 * 1000)).getFullYear(),
                        startDay: monthStartDay,
                        daysCount: i - monthStartDay
                    });
                }
                currentMonth = month;
                monthStartDay = i;
            }
        }
        // Add last month segment
        headers.push({
            month: currentMonth,
            year: new Date(minDate.getTime() + (monthStartDay * 24 * 60 * 60 * 1000)).getFullYear(),
            startDay: monthStartDay,
            daysCount: totalDays - monthStartDay
        });

        return headers;
    }, [minDate, totalDays]);

    // Grid lines for timeline
    const gridLines = Array.from({ length: totalDays }).map((_, i) => {
        const d = new Date(minDate);
        d.setDate(d.getDate() + i);
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        return <div key={i} className={`gantt-grid-col ${isWeekend ? 'bg-slate-50' : ''}`} style={{ width: `${PX_PER_DAY}px` }}></div>
    });

    // Timeline day header cells
    const timelineDayHeaders = Array.from({ length: totalDays }).map((_, i) => {
        const d = new Date(minDate);
        d.setDate(d.getDate() + i);
        return <div key={i} className={`gantt-day-cell ${d.getDay() === 0 || d.getDay() === 6 ? 'is-weekend' : ''}`} style={{ width: `${PX_PER_DAY}px` }}>{d.getDate()}</div>
    });

    // 同步滾動 refs
    const headerRef = useRef(null);
    const bodyRef = useRef(null);
    const hasScrolledToToday = useRef(false);

    // 初次載入：滾動到今天位置（置中顯示）
    useEffect(() => {
        const bodyEl = bodyRef.current;
        if (!bodyEl || hasScrolledToToday.current) return;

        // 計算滾動位置：今天紅線置中
        const containerWidth = bodyEl.clientWidth;
        const scrollTarget = todayPos - (containerWidth / 2) + 200; // 200 是左側任務欄寬度

        if (scrollTarget > 0) {
            bodyEl.scrollLeft = scrollTarget;
            hasScrolledToToday.current = true;
        }
    }, [todayPos, sortedTasks]);

    // 同步水平滾動
    useEffect(() => {
        const bodyEl = bodyRef.current;
        const headerEl = headerRef.current;

        if (!bodyEl || !headerEl) return;

        const handleBodyScroll = () => {
            if (headerEl) {
                headerEl.scrollLeft = bodyEl.scrollLeft;
            }
        };

        bodyEl.addEventListener('scroll', handleBodyScroll);
        return () => bodyEl.removeEventListener('scroll', handleBodyScroll);
    }, []);

    // 行動版友善提示
    if (isMobile) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-8 text-center">
                <div className="text-6xl mb-4">📱</div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">建議使用桌面版瀏覽</h3>
                <p className="text-slate-600 mb-4">
                    甘特圖在大螢幕上有更好的使用體驗。<br />
                    建議您在桌上型電腦或平板橫向模式下查看。
                </p>
                <button
                    onClick={() => setViewMode('dashboard')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                    返回列表視圖
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-700">專案甘特圖 (Gantt)</h3>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-xs text-slate-600 bg-white px-2 py-1 rounded border shadow-sm">
                        <input type="checkbox" id="toggleDeps" checked={showDependencies} onChange={(e) => setShowDependencies(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                        <label htmlFor="toggleDeps" className="cursor-pointer select-none">顯示連線 (Beta)</label>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {TEAMS.map(t => (
                            <button
                                key={t}
                                onClick={() => {
                                    setGanttFilterTeam(prev => prev === t ? 'All' : t);
                                }}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${ganttFilterTeam === 'All' || ganttFilterTeam === t
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {t || '(無名稱)'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="gantt-wrapper">
                {/* Header Row */}
                <div className="gantt-header-row" ref={headerRef} style={{ overflowX: 'hidden' }}>
                    <div className="gantt-header-wrapper">
                        <div className="gantt-header-task">任務名稱</div>
                        <div className="gantt-header-timeline" style={{ width: `${totalDays * PX_PER_DAY}px` }}>
                            <div className="gantt-header-month-row">
                                {monthHeaders.map((m, idx) => (
                                    <div key={idx} className={`gantt-month-cell ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`} style={{ width: `${m.daysCount * PX_PER_DAY}px` }}>
                                        {m.year}年{m.month + 1}月
                                    </div>
                                ))}
                            </div>
                            <div className="gantt-header-day-row">
                                {timelineDayHeaders}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="gantt-body" ref={bodyRef}>
                    <div className="gantt-body-content" style={{ width: `${200 + totalDays * PX_PER_DAY}px` }}>
                        {/* Grid Background */}
                        <div className="gantt-grid-lines" style={{ width: `${totalDays * PX_PER_DAY}px` }}>{gridLines}</div>

                        {/* Today Line */}
                        {todayPos > 0 && <div className="today-line" style={{ left: `${200 + todayPos}px`, height: '100%' }}></div>}

                        {/* SVG Lines */}
                        <svg className="dependency-svg" style={{ left: '200px', width: `${totalDays * PX_PER_DAY}px`, height: `${sortedTasks.length * ROW_HEIGHT}px` }}>
                            <defs>
                                <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                                    <polygon points="0 0, 6 2, 0 4" fill="#94a3b8" />
                                </marker>
                                <marker id="arrowhead-red" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                                    <polygon points="0 0, 6 2, 0 4" fill="#dc2626" />
                                </marker>
                            </defs>
                            {drawDependencies()}
                        </svg>

                        {/* Task Rows */}
                        {sortedTasks.map(t => {
                            const start = getStartDate(t.date, t.duration);
                            let left = getLeftPos(start);
                            let width = t.duration * PX_PER_DAY;

                            // 限制 left 不為負數，並調整寬度
                            if (left < 0) {
                                width = Math.max(width + left, 0); // 減少超出的部分
                                left = 0;
                            }
                            // 確保最小寬度
                            width = Math.max(width, PX_PER_DAY / 2);

                            // 使用顏色配置系統
                            const projectColor = getProjectColor(t.project);
                            const colorClass = projectColor.bg;
                            const borderColor = projectColor.border;
                            const isClosed = t.status === 'Closed';

                            // 日期變更歷史計算
                            const history = Array.isArray(t.dateHistory) ? t.dateHistory : [];
                            const originalDate = history.length > 0 ? history[0].date : null;
                            const hasDateChange = history.length > 1 && originalDate !== t.date;
                            const isRecurring = t.taskType === 'recurring';

                            // 原始時程位置計算
                            let origLeft = 0, origWidth = 0, delayDays = 0;
                            if (hasDateChange && originalDate) {
                                const origStart = getStartDate(originalDate, t.duration);
                                origLeft = Math.max(getLeftPos(origStart), 0);
                                origWidth = t.duration * PX_PER_DAY;
                                delayDays = Math.round((new Date(t.date) - new Date(originalDate)) / (1000 * 60 * 60 * 24));
                            }

                            // 相依性衝突偵測
                            let hasConflict = false;
                            if (t.dependency) {
                                const depIds = parseDependencies(t.dependency);
                                const taskStart = start;
                                for (const depId of depIds) {
                                    const parent = sortedTasks.find(p => String(p.id) === String(depId));
                                    if (parent && parent.date >= taskStart) {
                                        hasConflict = true;
                                        break;
                                    }
                                }
                            }

                            return (
                                <div key={t.id} className={`gantt-row ${hasConflict ? 'bg-red-50' : ''}`}>
                                    <div className="gantt-task-col truncate flex items-center gap-1" title={t.task}>
                                        <span className="truncate">{t.task}</span>
                                        {hasConflict && <span className="bg-orange-100 text-orange-600 text-[9px] px-1 rounded flex-shrink-0">⚠️</span>}
                                        {/* Closed 狀態：灰色標籤 */}
                                        {isClosed && <span className="bg-slate-100 text-slate-500 text-[9px] px-1 rounded flex-shrink-0">✗</span>}
                                        {/* 週期性任務：藍色週期標籤 */}
                                        {isRecurring && hasDateChange && <span className="bg-blue-100 text-blue-600 text-[9px] px-1 rounded flex-shrink-0" title="週期性任務">🔄</span>}
                                        {/* 一次性任務：紅色延期標籤 */}
                                        {!isRecurring && hasDateChange && delayDays > 0 && <span className="bg-red-100 text-red-600 text-[9px] px-1 rounded flex-shrink-0">+{delayDays}天</span>}
                                    </div>
                                    <div className="gantt-timeline-col">
                                        {/* 原始時程淺色條 */}
                                        {hasDateChange && (
                                            <div
                                                className="gantt-bar absolute"
                                                style={{
                                                    left: `${origLeft}px`,
                                                    width: `${origWidth}px`,
                                                    backgroundColor: isRecurring ? 'rgba(59, 130, 246, 0.3)' : 'rgba(148, 163, 184, 0.4)',
                                                    border: isRecurring ? '2px dashed #3b82f6' : '2px dashed #64748b',
                                                    zIndex: 10
                                                }}
                                                title={isRecurring ? `上次週期: ${originalDate}` : `原始規劃: ${originalDate}`}
                                            />
                                        )}
                                        {/* 目前時程條 */}
                                        <div
                                            className={`gantt-bar ${isClosed ? '' : colorClass} ${t.status === 'Done' ? 'opacity-50 grayscale' : ''} ${hasConflict ? 'ring-2 ring-red-500 shadow-lg shadow-red-200' : ''}`}
                                            style={{
                                                left: `${left}px`,
                                                width: `${width}px`,
                                                zIndex: 20,
                                                // Closed 狀態：透明背景 + 專案顏色虛線外框
                                                ...(isClosed ? {
                                                    backgroundColor: 'rgba(148, 163, 184, 0.3)',
                                                    border: `3px dashed ${borderColor}`,
                                                    boxShadow: 'none'
                                                } : {})
                                            }}
                                            onClick={() => { setEditingTask(t); setIsModalOpen(true); }}
                                            title={`${t.task} (${t.duration}天)${hasConflict ? ' - ⚠️相依性衝突' : ''}${isClosed ? ' - 已取消' : ''}`}
                                        >
                                            {t.duration > 2 && <span className="text-[10px] pl-1">{t.owner}</span>}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

window.GanttView = GanttView;
