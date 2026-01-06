/**
 * useFilters Hook
 * 管理篩選、搜尋、統計和圖表資料
 */

function useFilters(tasks, todayStr, apiError, dynamicTeams, TEAMS) {
    // State
    const [filterTeam, setFilterTeam] = React.useState('All');
    const [filterProject, setFilterProject] = React.useState('All');
    const [filterStat, setFilterStat] = React.useState(null);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [ganttFilterTeam, setGanttFilterTeam] = React.useState('All');
    const [showDependencies, setShowDependencies] = React.useState(false);
    const [viewMode, setViewMode] = React.useState('dashboard');

    // 從 localStorage 讀取初始設定
    const [highlightUrgent, setHighlightUrgent] = React.useState(() => {
        const saved = localStorage.getItem('highlightUrgent');
        return saved !== null ? JSON.parse(saved) : true;
    });

    const [hideCompleted, setHideCompleted] = React.useState(() => {
        const saved = localStorage.getItem('hideCompleted');
        return saved !== null ? JSON.parse(saved) : true;
    });

    // 持久化設定
    React.useEffect(() => {
        localStorage.setItem('highlightUrgent', JSON.stringify(highlightUrgent));
    }, [highlightUrgent]);

    React.useEffect(() => {
        localStorage.setItem('hideCompleted', JSON.stringify(hideCompleted));
    }, [hideCompleted]);

    // 統計
    const stats = React.useMemo(() => {
        if (!todayStr) return { total: 0, checkpoints: 0, pendingHigh: 0, completed: 0, lateStart: 0, delayed: 0 };
        const baseTasks = tasks.filter(t => filterTeam === 'All' || (t.team && t.team === filterTeam));
        return {
            total: baseTasks.length,
            checkpoints: baseTasks.filter(t => t.isCheckpoint).length,
            pendingHigh: baseTasks.filter(t => t.priority === 'High' && t.status !== 'Done').length,
            completed: baseTasks.filter(t => t.status === 'Done').length,
            lateStart: baseTasks.filter(t => {
                const startDate = getStartDate(t.date, t.duration);
                return t.status === 'Todo' && startDate <= todayStr && t.date >= todayStr;
            }).length,
            delayed: baseTasks.filter(t => t.date < todayStr && t.status !== 'Done' && t.status !== 'Closed' && t.status !== 'Pending' && t.taskType !== 'recurring').length
        };
    }, [tasks, todayStr, filterTeam]);

    // 篩選任務
    const filteredTasks = React.useMemo(() => {
        const filterFunctions = {
            'Checkpoints': (t) => t.isCheckpoint,
            'Urgent': (t) => t.status !== 'Done' && t.priority === 'High',
            'Completed': (t) => t.status === 'Done',
            'LateStart': (t) => {
                const startDate = getStartDate(t.date, t.duration);
                return t.status === 'Todo' && startDate <= todayStr && t.date >= todayStr;
            },
            'Delayed': (t) => t.date < todayStr && t.status !== 'Done' && t.status !== 'Closed' && t.status !== 'Pending' && t.taskType !== 'recurring'
        };

        let result = tasks.filter(t => {
            if (filterTeam === 'All') return true;
            if (filterTeam === 'issue' || filterTeam === 'Issue') {
                return (t.team && (t.team === 'issue' || t.team === 'Issue')) || t.issuePool === true;
            }
            return t.team && t.team === filterTeam;
        });

        if (filterProject !== 'All') {
            result = result.filter(t => t.project && t.project === filterProject);
        }

        if (filterStat && filterFunctions[filterStat]) {
            result = result.filter(filterFunctions[filterStat]);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.trim();
            const prefixMatch = query.match(/^(project|owner|pic|team|task|note|category|purpose|status):(.*)/i);

            if (prefixMatch) {
                const field = prefixMatch[1].toLowerCase();
                const searchValue = prefixMatch[2].toLowerCase();
                result = result.filter(t => {
                    switch (field) {
                        case 'project': return t.project && String(t.project).toLowerCase().includes(searchValue);
                        case 'owner': case 'pic': return t.owner && String(t.owner).toLowerCase().includes(searchValue);
                        case 'team': return t.team && String(t.team).toLowerCase().includes(searchValue);
                        case 'task': return t.task && String(t.task).toLowerCase().includes(searchValue);
                        case 'note': return t.notes && String(t.notes).toLowerCase().includes(searchValue);
                        case 'category': return t.category && String(t.category).toLowerCase().includes(searchValue);
                        case 'purpose': return t.purpose && String(t.purpose).toLowerCase().includes(searchValue);
                        case 'status': return t.status && String(t.status).toLowerCase().includes(searchValue);
                        default: return false;
                    }
                });
            } else {
                const lowerQuery = query.toLowerCase();
                result = result.filter(t => {
                    const matchTask = t.task && String(t.task).toLowerCase().includes(lowerQuery);
                    const matchOwner = t.owner && String(t.owner).toLowerCase().includes(lowerQuery);
                    const matchNotes = t.notes && String(t.notes).toLowerCase().includes(lowerQuery);
                    const matchCategory = t.category && String(t.category).toLowerCase().includes(lowerQuery);
                    const matchTeam = t.team && String(t.team).toLowerCase().includes(lowerQuery);
                    const matchProject = t.project && String(t.project).toLowerCase().includes(lowerQuery);
                    const matchPurpose = t.purpose && String(t.purpose).toLowerCase().includes(lowerQuery);
                    return matchTask || matchOwner || matchNotes || matchCategory || matchTeam || matchProject || matchPurpose;
                });
            }
        }

        if (hideCompleted) {
            result = result.filter(t => t.status !== 'Done' && t.status !== 'Pending');
        }

        return result;
    }, [tasks, filterTeam, filterProject, filterStat, todayStr, searchQuery, hideCompleted]);

    // 警告訊息
    const alerts = React.useMemo(() => {
        if (!todayStr) return [];
        const list = [];
        const overdueCount = tasks.filter(t => t.date < todayStr && t.status !== 'Done' && t.status !== 'Closed' && t.status !== 'Pending' && t.taskType !== 'recurring').length;
        if (overdueCount > 0) list.push({ type: 'danger', msg: `有 ${overdueCount} 個任務已逾期` });
        if (apiError) list.push({ type: 'warning', msg: `系統離線中 (${apiError})` });
        return list;
    }, [tasks, todayStr, apiError]);

    // Chart Data
    const chartData = React.useMemo(() => {
        const teamList = dynamicTeams.length > 0 ? dynamicTeams : TEAMS;
        return teamList.map(team => ({
            name: team,
            value: tasks.filter(t => t.team && t.team === team).length,
            color: getTeamColor(team)
        })).filter(item => item.value > 0);
    }, [tasks, dynamicTeams, TEAMS]);

    const toggleStatFilter = (type) => {
        setFilterStat(prev => prev === type ? null : type);
        setViewMode('dashboard');
    };

    return {
        // State
        filterTeam,
        setFilterTeam,
        filterProject,
        setFilterProject,
        filterStat,
        setFilterStat,
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
        // Computed
        stats,
        filteredTasks,
        alerts,
        chartData,
        toggleStatFilter
    };
}

// 導出到 window
window.useFilters = useFilters;
