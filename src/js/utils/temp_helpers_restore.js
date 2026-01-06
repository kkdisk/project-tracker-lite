
// ... existing code ...

const getRowHighlight = (task, highlightUrgent, todayStr) => {
    if (!task) return '';
    const startDate = getStartDate(task.date, task.duration);

    // 依優先級排序: 延遲 > 應開工 > 急件
    if (task.status === 'Delayed' || (task.date < todayStr && task.status !== 'Done')) {
        return highlightUrgent ? 'bg-rose-50 border-l-4 border-rose-500' : 'bg-rose-50/50';
    }
    if (task.status === 'Todo' && startDate <= todayStr) {
        return highlightUrgent ? 'bg-red-50 border-l-4 border-red-500' : 'hover:bg-red-50/30';
    }
    if (task.status === 'Todo' && task.priority === 'High') {
        return highlightUrgent ? 'bg-orange-50 border-l-4 border-orange-500' : 'bg-orange-50/30';
    }
    if (task.status === 'Done') {
        return 'opacity-60 bg-slate-50 grayscale';
    }
    return '';
};

const getStatusBadge = (task, todayStr) => {
    const statusConfig = {
        'Todo': { label: '待執行', class: 'bg-slate-100 text-slate-600' },
        'InProgress': { label: '進行中', class: 'bg-indigo-100 text-indigo-700' },
        'Pending': { label: '暫停', class: 'bg-amber-100 text-amber-700' },
        'Done': { label: '完成', class: 'bg-green-100 text-green-700' },
        'Closed': { label: '不執行', class: 'bg-gray-200 text-gray-500' },
        'Delayed': { label: '延誤', class: 'bg-rose-100 text-rose-700' }
    };

    // 自動判斷延誤
    let status = task.status;
    if (task.date < todayStr && task.status !== 'Done' && task.status !== 'Closed') {
        status = 'Delayed';
    }

    const config = statusConfig[status] || statusConfig['Todo'];

    // 如果是 Pending 且 Priority High，顯示急件標記
    if (status === 'Todo' && task.priority === 'High') {
        return (
            <span className={`px-2 py-1 rounded-md text-xs font-bold bg-orange-100 text-orange-700 flex items-center gap-1 w-fit`}>
                ⚡ 急件
            </span>
        );
    }

    return (
        <span className={`px-2 py-1 rounded-md text-xs font-bold ${config.class} w-fit block`}>
            {config.label}
        </span>
    );
};
