// Dashboard Component
// Props: tasks, filteredTasks, stats, filterTeam, setFilterTeam, filterProject, setFilterProject, filterStat, toggleStatFilter, searchQuery, setSearchQuery, hideCompleted, setHideCompleted, highlightUrgent, setHighlightUrgent, setEditingTask, setIsModalOpen, handleDelete, TEAMS, PROJECTS, chartData, isLoading, todayStr
// 需引入: React, Recharts, Icon, paths, helpers.js

const Dashboard = () => {
    const {
        // Data
        tasks,
        filteredTasks,
        stats,
        chartData,
        isLoading,
        TEAMS,
        PROJECTS,
        OWNERS,
        todayStr,

        // State / Setters
        filterTeam,
        setFilterTeam,
        filterProject,
        setFilterProject,
        filterStat,
        toggleStatFilter,
        searchQuery,
        setSearchQuery,
        hideCompleted,
        setHideCompleted,
        highlightUrgent,
        setHighlightUrgent,
        setEditingTask,
        setIsModalOpen,
        handleDelete,
        handleSave,
        updateTaskStatus,

        // Auth
        user,
        hasPermission,

        // Alerts
        alerts
    } = useAppContext();

    // 狀態循環切換函數
    const cycleStatus = (task) => {
        const statusOrder = ['Todo', 'InProgress', 'Done'];
        const currentIndex = statusOrder.indexOf(task.status);
        const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
        updateTaskStatus(task, nextStatus);
    };

    // 展開行狀態
    const [expandedRow, setExpandedRow] = React.useState(null);

    // 緊密模式狀態 (從 localStorage 讀取)
    const [compactMode, setCompactMode] = React.useState(() => {
        const saved = localStorage.getItem('compactMode');
        return saved === 'true';
    });

    // 緊密模式切換時儲存到 localStorage
    const toggleCompactMode = () => {
        const newValue = !compactMode;
        setCompactMode(newValue);
        localStorage.setItem('compactMode', String(newValue));
    };

    // 右鍵選單狀態
    const [contextMenu, setContextMenu] = React.useState({ visible: false, task: null, position: { x: 0, y: 0 } });

    // 右鍵選單處理
    const handleContextMenu = (e, task) => {
        e.preventDefault();
        setContextMenu({
            visible: true,
            task: task,
            position: { x: e.clientX, y: e.clientY }
        });
    };

    // 關閉右鍵選單
    const closeContextMenu = () => {
        setContextMenu({ visible: false, task: null, position: { x: 0, y: 0 } });
    };

    // 變更狀態 (右鍵選單用)
    const changeStatus = (task, newStatus) => {
        updateTaskStatus(task, newStatus);
    };

    // 複製 Task ID
    const copyTaskId = (id) => {
        navigator.clipboard.writeText(String(id)).then(() => {
            // 可以加入 toast 通知
            console.log('✅ 已複製 Task ID:', id);
        }).catch(err => {
            console.error('複製失敗:', err);
        });
    };

    const { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } = window.Recharts || {};

    return (
        <div className="space-y-4">
            {/* Stat Cards - 1行緊湊版 */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
                {[
                    { label: '總任務', val: stats.total, color: 'text-slate-800', bgGradient: 'from-slate-50 to-slate-100', icon: '📊', type: null },
                    { label: '檢查點', val: stats.checkpoints, color: 'text-indigo-600', bgGradient: 'from-indigo-50 to-indigo-100', icon: '📍', type: 'Checkpoints' },
                    { label: '待辦急件', val: stats.pendingHigh, color: 'text-orange-600', bgGradient: 'from-orange-50 to-orange-100', icon: '⚡', type: 'Urgent' },
                    { label: '應開工未動', val: stats.lateStart, color: 'text-red-600', bgGradient: 'from-red-50 to-red-100', icon: '⏰', type: 'LateStart' },
                    { label: '已逾期', val: stats.delayed, color: 'text-rose-600', bgGradient: 'from-rose-50 to-rose-100', icon: '❌', type: 'Delayed' },
                    { label: '已完成', val: stats.completed, color: 'text-green-600', bgGradient: 'from-green-50 to-green-100', icon: '✓', type: 'Completed' }
                ].map((s, i) => (
                    <button
                        key={i}
                        onClick={() => s.type !== undefined && toggleStatFilter(s.type)}
                        className={`bg-gradient-to-br ${s.bgGradient} p-4 rounded-lg border-2 shadow-md text-left transition-all duration-200 hover:shadow-xl hover:-translate-y-1 hover:scale-105 ${filterStat === s.type
                            ? 'ring-2 ring-indigo-500 border-indigo-300'
                            : 'border-transparent hover:border-slate-200'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="text-xs text-slate-600 font-medium">{s.label}</div>
                            <div className="text-xl">{s.icon}</div>
                        </div>
                        <div className={`text-3xl font-bold ${s.color}`}>{s.val}</div>
                    </button>
                ))}
            </div>

            {/* 篩選與搜尋區 - 優化布局 */}
            <div className="space-y-3">
                {/* 第一行: Team 篩選按鈕 */}
                <div className="flex flex-wrap gap-2 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    {['All', ...TEAMS].map(t => (
                        <button
                            key={t}
                            onClick={() => setFilterTeam(t)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${filterTeam === t
                                ? 'bg-slate-800 text-white shadow-md'
                                : 'text-slate-600 hover:bg-slate-100 hover:shadow-sm'
                                }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {/* 第二行: 功能控制列 (搜尋 + 開關) */}
                <div className="flex flex-col md:flex-row gap-3">
                    {/* 搜尋框 */}
                    <div className="flex-1">
                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            tasks={tasks}
                            TEAMS={TEAMS}
                            PROJECTS={PROJECTS}
                            OWNERS={OWNERS}
                        />
                    </div>

                    {/* 控制開關群組 */}
                    <div className="flex gap-3">
                        {/* 隱藏已完成/擱置 */}
                        <label className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border shadow-sm cursor-pointer whitespace-nowrap h-10 hover:bg-slate-50">
                            <input
                                type="checkbox"
                                checked={hideCompleted}
                                onChange={(e) => setHideCompleted(e.target.checked)}
                                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 focus:ring-2"
                            />
                            <span className="font-medium">隱藏已完成/擱置</span>
                        </label>

                        {/* 高亮開關 */}
                        <div className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border shadow-sm h-10 hover:bg-slate-50">
                            <input
                                type="checkbox"
                                id="highlightUrgent"
                                checked={highlightUrgent}
                                onChange={(e) => setHighlightUrgent(e.target.checked)}
                                className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <label htmlFor="highlightUrgent" className="text-slate-600 cursor-pointer select-none whitespace-nowrap font-medium">
                                強調延遲/應開工
                            </label>
                        </div>

                        {/* 緊密模式切換 */}
                        <button
                            onClick={toggleCompactMode}
                            className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border shadow-sm h-10 transition-colors whitespace-nowrap font-medium ${compactMode
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            title="切換緊密/標準模式"
                        >
                            {compactMode ? '≡' : '☰'} {compactMode ? '緊密' : '標準'}
                        </button>

                        {/* 匯出快照按鈕 */}
                        <button
                            onClick={() => exportSnapshot(tasks)}
                            className="flex items-center gap-2 text-sm bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg border border-emerald-200 shadow-sm h-10 hover:bg-emerald-100 transition-colors whitespace-nowrap font-medium"
                            title="匯出當前任務清單作為週報基準快照"
                        >
                            <Icon path={paths.download || "M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"} size={16} />
                            📥 匯出快照
                        </button>
                    </div>
                </div>
            </div>

            {/* 搜尋結果提示 */}
            {searchQuery && (
                <div className="px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                    <span className="text-sm text-indigo-700 flex items-center gap-2">
                        <Icon path={paths.search} size={14} />
                        搜尋「<strong>{searchQuery}</strong>」找到 <strong>{filteredTasks.length}</strong> 個結果
                    </span>
                    <button
                        onClick={() => setSearchQuery('')}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors"
                    >
                        清除搜尋
                    </button>
                </div>
            )}

            {filteredTasks.length === 0 && !isLoading ? (
                <div className="p-12 text-center bg-white rounded-xl border shadow-sm">
                    <div className="text-slate-300 mb-4"><Icon path={paths.list} size={48} className="mx-auto" /></div>
                    <h3 className="text-lg font-bold text-slate-600 mb-2">沒有符合條件的任務</h3>
                    <p className="text-slate-400">請調整篩選條件或新增任務</p>
                </div>
            ) : (
                <>
                    {/* 手機版：卡片列表 */}
                    <div className="md:hidden space-y-3">
                        {filteredTasks.sort((a, b) => new Date(a.date) - new Date(b.date)).map(t => (
                            <div
                                key={t.id}
                                className={`bg-white rounded-lg border shadow-sm p-4 ${getRowHighlight(t, highlightUrgent, todayStr)}`}
                                onClick={() => { setEditingTask(t); setIsModalOpen(true); }}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    {getTaskIdBadge(t.id)}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); cycleStatus(t); }}
                                        className="hover:opacity-80"
                                    >
                                        {getStatusBadge(t, todayStr)}
                                    </button>
                                </div>
                                <h4 className="font-medium text-slate-900 mb-2 line-clamp-2">{t.task}</h4>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getTeamBadgeClass(t.team)}`}>{t.team}</span>
                                    {t.project && <span className={`text-[10px] px-2 py-0.5 rounded-md border font-medium ${getProjectColor(t.project)}`}>{t.project}</span>}
                                    {getPriorityBadge(t.priority)}
                                </div>
                                <div className="flex items-center justify-between text-sm text-slate-600">
                                    <span>📅 {t.date}</span>
                                    <span>👤 {getDisplayName(t.owner, OWNERS)}</span>
                                </div>
                                <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setEditingTask(t); setIsModalOpen(true); }}
                                        className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                    >
                                        ✏️ 編輯
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                                        className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                    >
                                        🗑️ 刪除
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 桌機版：表格 */}
                    <div className="hidden md:block bg-white rounded-xl border-2 border-slate-200 shadow-md overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                                    <tr>
                                        <th className={`px-4 ${compactMode ? 'py-2' : 'py-4'} text-left font-semibold text-slate-700 w-44`}>ID</th>
                                        <th className={`px-4 ${compactMode ? 'py-2' : 'py-4'} text-left font-semibold text-slate-700 ${compactMode ? 'w-48' : 'w-40'}`}>狀態</th>
                                        <th className={`px-4 ${compactMode ? 'py-2' : 'py-4'} text-left font-semibold text-slate-700`}>任務</th>
                                        <th className={`px-4 ${compactMode ? 'py-2' : 'py-4'} text-left font-semibold text-slate-700 w-36`}>工時/建議開始</th>
                                        <th className={`px-4 ${compactMode ? 'py-2' : 'py-4'} text-left font-semibold text-slate-700 w-28`}>完成日</th>
                                        <th className={`px-4 ${compactMode ? 'py-2' : 'py-4'} text-left font-semibold text-slate-700 w-20`}>負責人</th>
                                        <th className={`px-4 ${compactMode ? 'py-2' : 'py-4'} text-right font-semibold text-slate-700 w-24`}>動作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {filteredTasks.sort((a, b) => new Date(a.date) - new Date(b.date)).map(t => (
                                        <React.Fragment key={t.id}>
                                            <tr
                                                className={`hover:bg-slate-50 group transition-all duration-150 cursor-pointer ${t.isCheckpoint ? 'bg-indigo-50/50' : ''} ${getRowHighlight(t, highlightUrgent, todayStr)}`}
                                                tabIndex={0}
                                                onClick={() => setExpandedRow(expandedRow === t.id ? null : t.id)}
                                                onDoubleClick={() => { setEditingTask(t); setIsModalOpen(true); }}
                                                onContextMenu={(e) => handleContextMenu(e, t)}
                                                title="點擊展開詳情 | 雙擊編輯 | 右鍵更多選項"
                                            >
                                                <td className={`px-4 ${compactMode ? 'py-1.5' : 'py-4'}`}>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-slate-400 transition-transform ${expandedRow === t.id ? 'rotate-90' : ''}`}>▶</span>
                                                        {getTaskIdBadge(t.id)}
                                                    </div>
                                                </td>
                                                <td className={`px-4 ${compactMode ? 'py-1.5' : 'py-4'}`}>
                                                    <div className={compactMode ? 'flex items-center gap-2 flex-wrap' : ''}>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); cycleStatus(t); }}
                                                            className="hover:opacity-80 transition-opacity"
                                                            title="點擊切換狀態"
                                                        >
                                                            {getStatusBadge(t, todayStr)}
                                                        </button>
                                                        <div className={`text-[10px] ${compactMode ? '' : 'mt-1.5'} px-2 py-0.5 w-fit rounded-full border font-medium ${getTeamBadgeClass(t.team)}`}>{t.team}</div>
                                                        {t.project && <div className={`text-[10px] ${compactMode ? '' : 'mt-1'} px-2 py-0.5 w-fit rounded-md border font-medium ${getProjectColor(t.project)}`}>{t.project}</div>}
                                                    </div>
                                                </td>
                                                <td className={`px-4 ${compactMode ? 'py-1.5' : 'py-4'}`}>
                                                    <div className="font-medium text-slate-900 flex items-center gap-2">
                                                        {t.isCheckpoint && <Icon path={paths.flag} size={14} className="text-indigo-600 fill-indigo-100 flex-shrink-0" />}
                                                        <span className={compactMode ? 'line-clamp-1' : 'line-clamp-2'}>{t.task}</span>
                                                        {t.dependency && <div className="tooltip-container flex-shrink-0"><Icon path={paths.link} size={12} className="text-slate-400" /><span className="tooltip-text">前置任務: {parseDependencies(t.dependency).map(id => `#${id}`).join(', ')}</span></div>}
                                                        {t.notes && <div className="tooltip-container flex-shrink-0"><Icon path={paths.file} size={12} className="text-slate-400" /><span className="tooltip-text">{t.notes}</span></div>}
                                                    </div>
                                                    {!compactMode && <div className="mt-1">{getPriorityBadge(t.priority)}</div>}
                                                </td>
                                                <td className={`px-4 ${compactMode ? 'py-1.5' : 'py-4'} text-slate-600`}>
                                                    <div className="flex items-center gap-1.5"><Icon path={paths.timer} size={14} className="text-slate-400" /> <span className="font-medium">{t.duration}</span> 天</div>
                                                    {!compactMode && <div className="text-[10px] text-slate-400 mt-1">Start: {getStartDate(t.date, t.duration)}</div>}
                                                </td>
                                                <td className={`px-4 ${compactMode ? 'py-1.5' : 'py-4'}`}>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-semibold text-slate-700">{t.date}</span>
                                                        {/* 延期/週期標籤 */}
                                                        {(() => {
                                                            const history = Array.isArray(t.dateHistory) ? t.dateHistory : [];
                                                            const isRecurring = t.taskType === 'recurring';

                                                            // 週期性任務：顯示週期更新標籤
                                                            if (isRecurring && history.length > 1) {
                                                                return (
                                                                    <span
                                                                        className="bg-blue-100 text-blue-600 text-[10px] px-1 py-0.5 rounded font-medium"
                                                                        title={`週期性任務 - 已更新 ${history.length - 1} 次`}
                                                                    >
                                                                        🔄
                                                                    </span>
                                                                );
                                                            }

                                                            // 一次性任務：顯示延期天數
                                                            if (history.length > 1) {
                                                                const originalDate = history[0]?.date;
                                                                const currentDate = t.date;
                                                                if (originalDate && currentDate && originalDate !== currentDate) {
                                                                    const origEnd = new Date(originalDate);
                                                                    const currEnd = new Date(currentDate);
                                                                    const delayDays = Math.round((currEnd - origEnd) / (1000 * 60 * 60 * 24));
                                                                    if (delayDays > 0) {
                                                                        return (
                                                                            <span
                                                                                className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded font-medium"
                                                                                title={`原始規劃: ${originalDate}`}
                                                                            >
                                                                                +{delayDays}天
                                                                            </span>
                                                                        );
                                                                    } else if (delayDays < 0) {
                                                                        return (
                                                                            <span
                                                                                className="bg-green-100 text-green-600 text-[10px] px-1.5 py-0.5 rounded font-medium"
                                                                                title={`原始規劃: ${originalDate}`}
                                                                            >
                                                                                {delayDays}天
                                                                            </span>
                                                                        );
                                                                    }
                                                                }
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>
                                                </td>
                                                <td className={`px-4 ${compactMode ? 'py-1.5' : 'py-4'}`}>
                                                    <div
                                                        className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-xs font-bold text-slate-700 shadow-sm cursor-default"
                                                        title={getDisplayName(t.owner, OWNERS)}
                                                    >
                                                        {t.owner ? (t.owner.length <= 2 ? t.owner : t.owner.substring(0, 2)) : '?'}
                                                    </div>
                                                </td>
                                                <td className={`px-4 ${compactMode ? 'py-1.5' : 'py-4'} text-right`}>
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                                        <button
                                                            onClick={() => { setEditingTask(t); setIsModalOpen(true); }}
                                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                            title="編輯"
                                                        >
                                                            <Icon path={paths.edit} size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(t.id)}
                                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                            title="刪除"
                                                        >
                                                            <Icon path={paths.trash} size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {expandedRow === t.id && (
                                                <tr className="bg-slate-50 border-b border-slate-200">
                                                    <td colSpan={7} className="px-6 py-4">
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                            <div>
                                                                <span className="text-slate-500">目的:</span>
                                                                <span className="font-medium text-slate-700 ml-1">{t.purpose || '-'}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-500">專案:</span>
                                                                <span className="font-medium text-slate-700 ml-1">{t.project || '-'}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-500">分類:</span>
                                                                <span className="font-medium text-slate-700 ml-1">{t.category || '-'}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-500">Issue Date:</span>
                                                                <span className="font-medium text-slate-700 ml-1">{t.issueDate || '-'}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-500">相依任務:</span>
                                                                <span className="font-medium text-slate-700 ml-1">{t.dependency || '無'}</span>
                                                            </div>
                                                            <div className="col-span-2 md:col-span-4">
                                                                <span className="text-slate-500">備註:</span>
                                                                <span className="font-medium text-slate-700 ml-1">{t.notes || '無'}</span>
                                                            </div>
                                                            {/* 日期變更歷史 */}
                                                            {Array.isArray(t.dateHistory) && t.dateHistory.length > 1 && (
                                                                <div className="col-span-2 md:col-span-4 mt-2 pt-2 border-t border-slate-200">
                                                                    <span className="text-slate-500">📅 日期變更歷史:</span>
                                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                                        {t.dateHistory.map((h, idx) => (
                                                                            <span key={idx} className="inline-flex items-center gap-1 text-xs bg-slate-100 px-2 py-1 rounded">
                                                                                <span className="text-indigo-600 font-semibold">v{h.version}</span>
                                                                                <span className="font-medium">{h.date}</span>
                                                                                <span className="text-slate-500">({h.reason})</span>
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* 圓餅圖 - 移到任務列表下方 */}
            <div className="bg-white p-6 rounded-xl border-2 border-slate-200 shadow-md">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <span>📊</span>
                        專案分布
                    </h3>
                    <div className="text-xs text-slate-500">
                        依Team分類統計
                    </div>
                </div>
                <div className="h-80">
                    {window.Recharts && (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    dataKey="value"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={120}
                                    paddingAngle={5}
                                >
                                    {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* 右鍵選單 */}
            {
                contextMenu.visible && (
                    <ContextMenu
                        task={contextMenu.task}
                        position={contextMenu.position}
                        onClose={closeContextMenu}
                        onEdit={(t) => { setEditingTask(t); setIsModalOpen(true); }}
                        onDelete={handleDelete}
                        onChangeStatus={changeStatus}
                        onCopyId={copyTaskId}
                        canDelete={hasPermission('admin')}
                    />
                )
            }
        </div >
    );
};

window.Dashboard = Dashboard;
