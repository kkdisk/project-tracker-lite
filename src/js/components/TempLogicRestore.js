// ... inside App component ...

// Filter Logic
const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
        // Team Filter
        if (filterTeam !== 'All' && t.team !== filterTeam) return false;

        // Project Filter (New)
        if (filterProject !== 'All' && t.project !== filterProject) return false;

        // Stat Filter
        if (filterStat) {
            const today = todayStr;
            const startDate = getStartDate(t.date, t.duration);

            if (filterStat === 'Checkpoints' && !t.isCheckpoint) return false;
            if (filterStat === 'Urgent') { // Pending High/Urgent
                if (!(t.status === 'Todo' && t.priority === 'High')) return false;
            }
            if (filterStat === 'LateStart') {
                if (!(t.status === 'Todo' && startDate <= today)) return false;
            }
            if (filterStat === 'Delayed') { // Delayed or Overdue
                const isOverdue = t.date < today && t.status !== 'Done';
                if (!(t.status === 'Delayed' || isOverdue)) return false;
            }
            if (filterStat === 'Completed' && t.status !== 'Done') return false;
        }

        // Text Search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const matchTask = t.task && String(t.task).toLowerCase().includes(query);
            const matchOwner = t.owner && String(t.owner).toLowerCase().includes(query);
            const matchTeam = t.team && String(t.team).toLowerCase().includes(query);
            const matchNotes = t.notes && String(t.notes).toLowerCase().includes(query);
            if (!matchTask && !matchOwner && !matchTeam && !matchNotes) return false;
        }

        // Hide Completed
        if (hideCompleted && t.status === 'Done') return false;

        return true;
    });
}, [tasks, filterTeam, filterProject, filterStat, searchQuery, hideCompleted, todayStr]);

// Stats Calculation
const stats = useMemo(() => {
    const today = todayStr;
    return {
        total: tasks.length,
        checkpoints: tasks.filter(t => t.isCheckpoint).length,
        pendingHigh: tasks.filter(t => t.status === 'Todo' && t.priority === 'High').length,
        lateStart: tasks.filter(t => t.status === 'Todo' && getStartDate(t.date, t.duration) <= today).length,
        delayed: tasks.filter(t => t.status === 'Delayed' || (t.date < today && t.status !== 'Done')).length,
        completed: tasks.filter(t => t.status === 'Done').length
    };
}, [tasks, todayStr]);

// Chart Data
const chartData = useMemo(() => {
    // Use dynamicTeams if available, otherwise fallback to TEAMS
    const teamList = dynamicTeams.length > 0 ? dynamicTeams : TEAMS;
    return teamList.map(team => ({
        name: team,
        value: tasks.filter(t => t.team && t.team === team).length,
        color: getTeamColor(team)
    })).filter(item => item.value > 0);
}, [tasks, dynamicTeams]);
