// TopicView Component
// Topic 追蹤視圖 - 按 Purpose 分組顯示任務進度
// Props: 從 AppContext 取得

const TopicView = () => {
    const {
        tasks = [],
        setEditingTask,
        setIsModalOpen,
        todayStr,
        searchQuery = '',
        setSearchQuery
    } = useAppContext();

    const { useState, useMemo } = React;

    // 展開狀態管理
    const [expandedTopics, setExpandedTopics] = useState({});
    const [showCompleted, setShowCompleted] = useState(false);
    const [topicSearch, setTopicSearch] = useState('');

    // 按 Purpose 分組任務
    const groupedTopics = useMemo(() => {
        // 先按搜尋條件過濾
        let filteredTasks = tasks;
        if (topicSearch.trim()) {
            const lowerSearch = topicSearch.toLowerCase();
            filteredTasks = tasks.filter(t =>
                (t.purpose && t.purpose.toLowerCase().includes(lowerSearch)) ||
                (t.task && t.task.toLowerCase().includes(lowerSearch))
            );
        }

        // 按 Purpose 分組
        const grouped = filteredTasks.reduce((acc, task) => {
            const purpose = task.purpose || '(未分類)';
            if (!acc[purpose]) {
                acc[purpose] = {
                    name: purpose,
                    tasks: [],
                    completed: 0,
                    total: 0
                };
            }
            acc[purpose].tasks.push(task);
            acc[purpose].total++;
            if (task.status === 'Done' || task.status === 'Closed') {
                acc[purpose].completed++;
            }
            return acc;
        }, {});

        // 轉換為陣列並計算進度
        return Object.values(grouped).map(topic => ({
            ...topic,
            progress: topic.total > 0 ? Math.round((topic.completed / topic.total) * 100) : 0,
            isCompleted: topic.completed === topic.total && topic.total > 0
        })).sort((a, b) => {
            // 進行中的排前面，已完成的排後面
            if (a.isCompleted !== b.isCompleted) {
                return a.isCompleted ? 1 : -1;
            }
            // 同狀態按任務數量排序（多的在前）
            return b.total - a.total;
        });
    }, [tasks, topicSearch]);

    // 分離進行中和已完成
    const inProgressTopics = groupedTopics.filter(t => !t.isCompleted);
    const completedTopics = groupedTopics.filter(t => t.isCompleted);

    // 切換展開狀態
    const toggleExpand = (topicName) => {
        setExpandedTopics(prev => ({
            ...prev,
            [topicName]: !prev[topicName]
        }));
    };

    // 取得狀態圖示
    const getStatusIcon = (status) => {
        switch (status) {
            case 'Done': return '✅';
            case 'Closed': return '🚫';
            case 'InProgress': return '🔵';
            case 'Pending': return '⏸️';
            case 'Delayed': return '🔴';
            default: return '⬜';
        }
    };

    // 取得進度條顏色
    const getProgressColor = (progress) => {
        if (progress === 100) return 'bg-green-500';
        if (progress >= 75) return 'bg-emerald-500';
        if (progress >= 50) return 'bg-blue-500';
        if (progress >= 25) return 'bg-yellow-500';
        return 'bg-orange-500';
    };

    // Topic 卡片渲染
    const renderTopicCard = (topic) => {
        const isExpanded = expandedTopics[topic.name];

        return (
            <div key={topic.name} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-3">
                {/* Topic 標題列 */}
                <div
                    className="p-4 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between"
                    onClick={() => toggleExpand(topic.name)}
                >
                    <div className="flex items-center gap-3 flex-1">
                        <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800">{topic.name}</span>
                                <span className="text-sm text-slate-500">
                                    ({topic.completed}/{topic.total})
                                </span>
                                {topic.isCompleted && <span className="text-green-500">✓ 完成</span>}
                            </div>
                            {/* 進度條 */}
                            <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${getProgressColor(topic.progress)} transition-all duration-300`}
                                        style={{ width: `${topic.progress}%` }}
                                    />
                                </div>
                                <span className="text-xs font-medium text-slate-600 w-10">{topic.progress}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 展開的任務清單 */}
                {isExpanded && (
                    <div className="border-t border-slate-200 bg-slate-50">
                        <div className="divide-y divide-slate-200">
                            {topic.tasks
                                .sort((a, b) => new Date(a.date) - new Date(b.date))
                                .map(task => (
                                    <div
                                        key={task.id}
                                        className="p-3 hover:bg-slate-100 cursor-pointer transition-colors flex items-center gap-3"
                                        onClick={() => { setEditingTask(task); setIsModalOpen(true); }}
                                    >
                                        <span className="text-lg">{getStatusIcon(task.status)}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                {getTaskIdBadge(task.id)}
                                                <span className={`text-xs px-1.5 py-0.5 rounded ${task.team === '晶片' ? 'bg-purple-100 text-purple-700' :
                                                    task.team === 'QA' ? 'bg-green-100 text-green-700' :
                                                        task.team === '軟體' ? 'bg-blue-100 text-blue-700' :
                                                            task.team === '機構' ? 'bg-orange-100 text-orange-700' :
                                                                'bg-slate-100 text-slate-700'
                                                    }`}>{task.team}</span>
                                            </div>
                                            <div className="font-medium text-slate-800 truncate">{task.task}</div>
                                            <div className="text-xs text-slate-500">
                                                📅 {task.date} • 👤 {task.owner}
                                            </div>
                                        </div>
                                        <Icon path={paths.edit} size={16} className="text-slate-400" />
                                    </div>
                                ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {/* 標題和搜尋 */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 text-white p-2 rounded-lg">📋</div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Topic 追蹤</h2>
                            <p className="text-sm text-slate-500">按目的 (Purpose) 追蹤跨部門任務進度</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Icon path={paths.search} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="搜尋 Topic..."
                                value={topicSearch}
                                onChange={(e) => setTopicSearch(e.target.value)}
                                className="pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64"
                            />
                        </div>
                    </div>
                </div>

                {/* 統計摘要 */}
                <div className="mt-4 grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-blue-600">{groupedTopics.length}</div>
                        <div className="text-xs text-blue-600">總 Topics</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-orange-600">{inProgressTopics.length}</div>
                        <div className="text-xs text-orange-600">進行中</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-green-600">{completedTopics.length}</div>
                        <div className="text-xs text-green-600">已完成</div>
                    </div>
                </div>
            </div>

            {/* 進行中的 Topics */}
            {inProgressTopics.length > 0 && (
                <div>
                    <h3 className="text-sm font-bold text-slate-600 mb-2 flex items-center gap-2">
                        🔴 進行中 ({inProgressTopics.length})
                    </h3>
                    {inProgressTopics.map(renderTopicCard)}
                </div>
            )}

            {/* 已完成的 Topics */}
            {completedTopics.length > 0 && (
                <div>
                    <button
                        className="text-sm font-bold text-slate-600 mb-2 flex items-center gap-2 hover:text-slate-800"
                        onClick={() => setShowCompleted(!showCompleted)}
                    >
                        <span className={`transform transition-transform ${showCompleted ? 'rotate-90' : ''}`}>▶</span>
                        🟢 已完成 ({completedTopics.length})
                    </button>
                    {showCompleted && completedTopics.map(renderTopicCard)}
                </div>
            )}

            {/* 空狀態 */}
            {groupedTopics.length === 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
                    <div className="text-6xl mb-4">📋</div>
                    <h3 className="text-xl font-bold text-slate-600 mb-2">尚無 Topic</h3>
                    <p className="text-slate-400">
                        {topicSearch ? '沒有符合搜尋條件的 Topic' : '在任務中填寫 Purpose 欄位即可建立 Topic'}
                    </p>
                </div>
            )}
        </div>
    );
};

window.TopicView = TopicView;
