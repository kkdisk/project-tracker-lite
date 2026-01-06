/**
 * App Component
 * 重構後使用 hooks 管理資料與篩選
 */

// 確保 React Hooks 可用
const { useState, useEffect, useMemo, useRef } = React;
// 確保 Recharts 組件可用
const { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } = window.Recharts || {};

const App = () => {
    // ✅ 使用 useAuth hook 管理認證 (Session Mode)
    const { isAuthenticated, user, isLoading: isAuthLoading, authError, checkSession, handleLogout } = useAuth();

    // 權限檢查 Helper
    const hasPermission = (role) => {
        if (!user || !user.permission) return false;
        if (user.permission === 'admin') return true; // Admin has all permissions
        if (role === 'editor' && user.permission === 'editor') return true;
        return user.permission === role;
    };

    // ✅ UI 相關狀態
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [todayStr, setTodayStr] = useState('');
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [isMobile, setIsMobile] = useState(false);

    // 🆕 週報 Modal 狀態
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportData, setReportData] = useState(null);


    // ✅ Phase 1: 動態主資料
    const [dynamicTeams, setDynamicTeams] = useState([]);
    const [dynamicProjects, setDynamicProjects] = useState([]);
    const [dynamicOwners, setDynamicOwners] = useState([]);
    const [teamsFullData, setTeamsFullData] = useState([]); // 新增：含 Leader 資訊的完整 Teams

    // 備份列表
    const TEAMS_FALLBACK = ['晶片', '機構', '軟體', '電控', '流道', '生醫', 'QA', '管理', 'issue'];
    const PROJECTS_FALLBACK = ['CKSX', 'Jamstec', 'Genentech', '5880 Chip', 'Internal', 'TBD', 'Other'];
    const OWNERS_FALLBACK = ['Anting', '宗轅', 'Jerry', '子宗', 'Jun', '慶德', 'HW', 'EE', 'RD', 'QA', 'SW', 'All', 'Unassigned'];

    const TEAMS = dynamicTeams.length > 0 ? dynamicTeams : TEAMS_FALLBACK;
    const PROJECTS = dynamicProjects.length > 0 ? dynamicProjects : PROJECTS_FALLBACK;
    const OWNERS = dynamicOwners.length > 0 ? dynamicOwners : OWNERS_FALLBACK;

    const {
        tasks,
        setTasks,
        isLoading,
        isOffline,
        apiError,
        dataSource,
        uploadProgress,
        fileInputRef,
        handleFileUpload,
        handleSave: taskDataHandleSave,
        handleDelete,
        updateTaskStatus,
        // 🆕 同步到雲端
        handleSyncToCloud,
        syncProgress,
        isSyncing
    } = useTaskData(isAuthenticated);

    // ✅ 使用 useFilters hook
    const {
        filterTeam,
        setFilterTeam,
        filterProject,
        setFilterProject,
        filterStat,
        searchQuery,
        setSearchQuery,
        ganttFilterTeam,
        setGanttFilterTeam,
        showDependencies,
        setShowDependencies,
        viewMode,
        setViewMode,
        highlightUrgent,
        setHighlightUrgent,
        hideCompleted,
        setHideCompleted,
        stats,
        filteredTasks,
        alerts,
        chartData,
        toggleStatFilter
    } = useFilters(tasks, todayStr, apiError, dynamicTeams, TEAMS);

    // ==================== Effects ====================

    // 偵測行動裝置
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // 初始化日期
    useEffect(() => {
        setTodayStr(getTaiwanToday());
        setCalendarMonth(new Date());
    }, []);

    // 🆕 監聽週報事件
    useEffect(() => {
        const handleShowReport = (e) => {
            setReportData(e.detail);
            setIsReportModalOpen(true);
        };

        window.addEventListener('showWeeklyReport', handleShowReport);
        return () => window.removeEventListener('showWeeklyReport', handleShowReport);
    }, []);

    // ✅ Phase 1: 載入動態主資料
    useEffect(() => {
        const loadMasterData = async () => {
            try {
                // ✅ 使用 callApi平行請求
                const [teamsData, projectsData, ownersData] = await Promise.all([
                    window.callApi('getTeams'),
                    window.callApi('getProjects'),
                    window.callApi('getOwners')
                ]);

                if (teamsData.success) {
                    setDynamicTeams(teamsData.data.filter(t => t.isActive).map(t => t.teamName));
                    setTeamsFullData(teamsData.data.filter(t => t.isActive)); // 保存完整資料含 Leader
                    console.log('✅ 動態載入 Teams:', teamsData.data.length);
                }

                if (projectsData.success) {
                    setDynamicProjects(projectsData.data.map(p => p.projectName));
                    console.log('✅ 動態載入 Projects:', projectsData.data.length);
                }

                if (ownersData.success) {
                    setDynamicOwners(ownersData.data.filter(o => o.isActive).map(o => o.ownerName));
                    console.log('✅ 動態載入 Owners:', ownersData.data.length);
                }
            } catch (error) {
                console.error('❌ 載入主資料失敗:', error);
            }
        };
        if (isAuthenticated && !isOffline) {
            loadMasterData();
        }
    }, [isAuthenticated, isOffline]);

    // ==================== 事件處理函數 ====================

    // 包裝 handleSave 以關閉 modal
    const handleSave = (e) => {
        const success = taskDataHandleSave(e, editingTask, todayStr);
        if (success) {
            setIsModalOpen(false);
        }
    };

    // 解析相依性字串
    const parseDependencies = (depStr) => {
        if (!depStr || typeof depStr !== 'string') return [];
        return depStr.split(',').map(id => id.trim()).filter(id => id);
    };



    const changeMonth = (delta) => {
        const d = new Date(calendarMonth);
        d.setMonth(d.getMonth() + delta);
        setCalendarMonth(d);
    };

    // ==================== 準備 Context Value ====================

    const contextValue = {
        // Auth
        isAuthenticated, checkSession, handleLogout,

        // UI State
        isModalOpen, setIsModalOpen,
        editingTask, setEditingTask,
        todayStr,
        calendarMonth, setCalendarMonth,
        isMobile,
        viewMode, setViewMode,

        // Master Data
        dynamicTeams, setDynamicTeams,
        dynamicProjects, setDynamicProjects,
        dynamicOwners, setDynamicOwners,
        TEAMS, PROJECTS, OWNERS,

        // Task Data (from useTaskData)
        tasks, setTasks,
        isLoading, isOffline, apiError, dataSource,
        uploadProgress, fileInputRef,
        handleFileUpload,
        handleSave: handleSave, // Use the wrapper
        handleDelete,
        updateTaskStatus,

        // Auth info for permission checking
        user, hasPermission,

        // Filters & Stats (from useFilters)
        filterTeam, setFilterTeam,
        filterProject, setFilterProject,
        filterStat, toggleStatFilter,
        searchQuery, setSearchQuery,
        ganttFilterTeam, setGanttFilterTeam,
        showDependencies, setShowDependencies,
        highlightUrgent, setHighlightUrgent,
        hideCompleted, setHideCompleted,
        stats, filteredTasks, alerts, chartData
    };

    // ==================== 渲染視圖 ====================

    // 登入檢查
    if (!isAuthenticated) {
        if (authError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
                    <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-red-100 text-center">
                        <div className="mb-4 text-red-500">
                            <Icon path={paths.alert} size={48} className="mx-auto" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">驗證失敗</h3>
                        <span className="text-slate-400 text-xs text-center block mt-4">v7.6.0</span>
                        <p className="text-red-600 mb-6 bg-red-50 p-3 rounded">{authError}</p>
                        <button onClick={checkSession} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">
                            重試驗證
                        </button>
                    </div>
                </div>
            );
        }
        return <LoginScreen />;
    }

    return (
        <AppProvider value={contextValue}>
            <div className="min-h-screen pb-10">
                {/* Header */}
                <div className="bg-white border-b sticky top-0 z-30 shadow-sm px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 text-white p-2 rounded-lg"><Icon path={paths.list} /></div>
                        <h1 className="text-xl font-bold text-slate-800">Project Tracker <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">v7.6.0</span></h1>
                        {isLoading && <div className="flex items-center text-sm text-slate-500 gap-2 ml-4"><div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full spinner"></div> 載入中...</div>}
                        {uploadProgress && <div className="flex items-center text-sm text-indigo-600 gap-2 ml-4 bg-indigo-50 px-2 py-1 rounded"><Icon path={paths.file} size={14} /> {uploadProgress}</div>}
                        {syncProgress && <div className="flex items-center text-sm text-blue-600 gap-2 ml-4 bg-blue-50 px-2 py-1 rounded"><div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full spinner"></div> {syncProgress}</div>}
                        {isOffline && dataSource === 'excel' && (
                            <div className="flex items-center gap-2 ml-4">
                                <div className="flex items-center text-sm text-emerald-600 gap-2 bg-emerald-50 px-2 py-1 rounded"><Icon path={paths.file} size={14} /> Excel 模式</div>
                                {hasPermission('admin') && (
                                    <button
                                        onClick={handleSyncToCloud}
                                        disabled={isSyncing}
                                        className="flex items-center text-sm text-white gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        title="將 Excel 資料同步到 Google Sheets (Admin Only)"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                        {isSyncing ? '同步中...' : '同步到雲端'}
                                    </button>
                                )}
                            </div>
                        )}
                        {isOffline && dataSource === 'google' && <div className="flex items-center text-sm text-red-500 gap-2 ml-4 bg-red-50 px-2 py-1 rounded"><Icon path={paths.alert} size={14} /> 離線</div>}

                        <div className="text-xs bg-slate-100 text-slate-500 px-3 py-1 rounded-full hidden sm:block ml-4 flex items-center gap-1">
                            <Icon path={paths.clock} size={12} /> {todayStr}
                        </div>
                        {isAuthenticated && user && (
                            <div className="ml-4 text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded border border-yellow-200" title="Debug Info">
                                🔧 Role: {user.permission} ({user.email})
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        {/* 視圖切換按鈕組 */}
                        <div className="bg-slate-100 p-1 rounded-lg flex gap-1">
                            <button onClick={() => setViewMode('dashboard')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${viewMode === 'dashboard' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-600 hover:text-slate-900'}`} title="列表"><Icon path={paths.list} size={16} /><span className="hidden sm:inline">列表</span></button>
                            <button onClick={() => setViewMode('calendar')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${viewMode === 'calendar' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-600 hover:text-slate-900'}`} title="日曆"><Icon path={paths.calendar} size={16} /><span className="hidden sm:inline">日曆</span></button>
                            <button onClick={() => setViewMode('gantt')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${viewMode === 'gantt' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-600 hover:text-slate-900'}`} title="甘特圖"><Icon path={paths.gantt} size={16} /><span className="hidden sm:inline">甘特圖</span></button>
                            <button onClick={() => setViewMode('topic')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${viewMode === 'topic' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-600 hover:text-slate-900'}`} title="Topic追蹤">📋<span className="hidden sm:inline">Topic</span></button>
                            <button onClick={() => setViewMode('wbs')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${viewMode === 'wbs' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-600 hover:text-slate-900'}`} title="WBS 結構">🎯<span className="hidden sm:inline">WBS</span></button>
                            {hasPermission('admin') && (
                                <button onClick={() => setViewMode('settings')} className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all duration-200 ${viewMode === 'settings' ? 'bg-indigo-100 text-indigo-700 shadow-sm ring-2 ring-indigo-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'}`} title="設定"><Icon path={paths.settings} size={16} /><span className="hidden sm:inline">設定</span></button>
                            )}

                        </div>
                        <div className="w-px h-8 bg-slate-300"></div>
                        {/* Excel 上傳按鈕 */}
                        <button onClick={() => fileInputRef.current?.click()} className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"><Icon path={paths.file} size={16} /><span className="hidden sm:inline">上傳 Excel</span></button>
                        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
                        {/* 登出按鈕 */}
                        <button onClick={handleLogout} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all duration-200" title="登出"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg><span className="hidden sm:inline">登出</span></button>
                        <button onClick={() => { setEditingTask(null); setIsModalOpen(true); }} className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"><Icon path={paths.plus} size={16} /><span className="hidden sm:inline">新增</span></button>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 py-8">
                    {/* Alerts */}
                    {alerts.length > 0 && (
                        <div className="mb-6 grid gap-2">
                            {alerts.map((a, i) => (
                                <div key={i} className={`p-3 rounded-md border flex items-center gap-2 text-sm font-medium ${a.type === 'danger' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
                                    <Icon path={paths.alert} size={16} /> {a.msg}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Main Content */}
                    {viewMode === 'gantt' ? (
                        <>
                            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-3 mb-6">
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"><Icon path={paths.search} size={16} /></div>
                                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜尋任務或負責人..." className="w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                                    {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"><Icon path={paths.x} size={16} /></button>}
                                </div>
                            </div>
                            <GanttView />
                        </>
                    ) : viewMode === 'settings' ? (
                        <SettingsView />
                    ) : viewMode === 'calendar' ? (
                        <CalendarView />
                    ) : viewMode === 'topic' ? (
                        <TopicView />
                    ) : viewMode === 'wbs' ? (
                        <WBSView />
                    ) : (
                        <Dashboard />
                    )}
                </div>

                {/* Modal */}
                {isModalOpen && (
                    <TaskModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        editingTask={editingTask}
                        onSubmit={handleSave}

                        TEAMS={TEAMS}
                        PROJECTS={PROJECTS}
                        OWNERS={OWNERS}
                        CATEGORIES={['Frontend', 'Backend', 'Database', 'DevOps', 'Testing', 'Design', 'Other']}
                        tasks={tasks}
                        userPermission={user?.permission || 'viewer'}
                        teamsData={teamsFullData}
                        apiUrl={window.GAS_API_URL || ''}
                    />
                )}



                {/* 🆕 週報 Modal */}
                <ReportModal
                    isOpen={isReportModalOpen}
                    onClose={() => setIsReportModalOpen(false)}
                    reportData={reportData}
                />
            </div>
        </AppProvider>
    );
};
