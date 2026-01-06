// CalendarView Component
// Props: tasks, calendarMonth, setCalendarMonth, setEditingTask, setIsModalOpen
// 需引入: React, icons.js, helpers.js (getProjectColor)

const CalendarView = () => {
    const {
        tasks,
        calendarMonth,
        setCalendarMonth,
        setEditingTask,
        setIsModalOpen,
        searchQuery = ''
    } = useAppContext();
    const { useMemo } = React;

    // 效能優化：快取日曆視圖資料（添加搜尋過濾）
    // 只有在月份、任務或搜尋條件改變時才重新計算
    const calendarDays = useMemo(() => {
        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days = [];

        for (let i = 0; i < firstDay.getDay(); i++) days.push(null);

        for (let i = 1; i <= lastDay.getDate(); i++) {
            const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            let dayTasks = tasks.filter(t => t.date === dStr);

            // ✅ 應用搜尋過濾（與 Dashboard/GanttView 一致）
            if (searchQuery.trim()) {
                const query = searchQuery.trim();
                const prefixMatch = query.match(/^(project|purpose|owner|pic|team|task|note|category|status):(.*)/i);

                if (prefixMatch) {
                    // 前綴詞搜尋
                    const field = prefixMatch[1].toLowerCase();
                    const searchValue = prefixMatch[2].toLowerCase();

                    dayTasks = dayTasks.filter(t => {
                        switch (field) {
                            case 'project':
                                return t.project && String(t.project).toLowerCase().includes(searchValue);
                            case 'owner':
                            case 'pic':
                                return t.owner && String(t.owner).toLowerCase().includes(searchValue);
                            case 'team':
                                return t.team && String(t.team).toLowerCase().includes(searchValue);
                            case 'task':
                                return t.task && String(t.task).toLowerCase().includes(searchValue);
                            case 'note':
                                return t.notes && String(t.notes).toLowerCase().includes(searchValue);
                            case 'category':
                                return t.category && String(t.category).toLowerCase().includes(searchValue);
                            case 'purpose':
                                return t.purpose && String(t.purpose).toLowerCase().includes(searchValue);
                            case 'status':
                                return t.status && String(t.status).toLowerCase().includes(searchValue);
                            default:
                                return false;
                        }
                    });
                } else {
                    // 一般搜尋
                    const lowerQuery = query.toLowerCase();
                    dayTasks = dayTasks.filter(t => {
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

            days.push({ date: i, fullDate: dStr, tasks: dayTasks });
        }
        return days;
    }, [calendarMonth, tasks, searchQuery]);

    const changeMonth = (offset) => {
        setCalendarMonth(prev => {
            const next = new Date(prev);
            next.setMonth(next.getMonth() + offset);
            return next;
        });
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800">
                    {calendarMonth.toLocaleString('default', { year: 'numeric', month: 'long' })}
                </h2>
                <div className="flex gap-2">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-full">
                        <Icon path={paths.left} />
                    </button>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-full">
                        <Icon path={paths.right} />
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="bg-slate-50 py-2 text-center text-xs font-bold text-slate-500 uppercase">{d}</div>
                ))}
                {calendarDays.map((day, idx) => (
                    <div key={idx} className={`bg-white min-h-[120px] p-2 relative calendar-cell ${!day ? 'bg-slate-50/50' : ''}`}>
                        {day && (
                            <>
                                <span className={`text-xs font-medium ${day.date === new Date().getDate() && calendarMonth.getMonth() === new Date().getMonth() ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-slate-400'}`}>{day.date}</span>
                                <div className="mt-1 space-y-1 overflow-y-auto max-h-[100px] scrollbar-hide">
                                    {day.tasks.map(t => (
                                        <div key={t.id}
                                            onClick={() => { setEditingTask(t); setIsModalOpen(true); }}
                                            className={`group text-[10px] p-1 rounded border-l-2 cursor-pointer hover:opacity-80 flex items-center gap-1 ${getProjectColor(t.project)} ${t.isCheckpoint ? 'font-bold' : ''}`}>
                                            {t.isCheckpoint && <Icon path={paths.flag} size={8} />}
                                            <span className="truncate">
                                                <span className="font-mono text-[9px] mr-1 opacity-70 hidden group-hover:inline">#{t.id}</span>
                                                {t.task}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

window.CalendarView = CalendarView;
