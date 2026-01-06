// ContextMenu Component - 右鍵選單組件
// 功能: 編輯 / 刪除 / 複製ID / 狀態切換

const ContextMenu = ({ task, position, onClose, onEdit, onDelete, onChangeStatus, onCopyId, canDelete = true }) => {
    const menuRef = React.useRef(null);

    // 點擊外部關閉選單
    React.useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // ESC 關閉選單
    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!task || !position) return null;

    const menuItems = [
        {
            icon: '✏️',
            label: '編輯任務',
            onClick: () => { onEdit(task); onClose(); }
        },
        {
            icon: '📋',
            label: '複製 Task ID',
            onClick: () => { onCopyId(task.id); onClose(); }
        },
        { type: 'divider' },
        {
            icon: '⏸️',
            label: '標記為待辦',
            onClick: () => { onChangeStatus(task, 'Todo'); onClose(); },
            disabled: task.status === 'Todo'
        },
        {
            icon: '▶️',
            label: '標記為進行中',
            onClick: () => { onChangeStatus(task, 'InProgress'); onClose(); },
            disabled: task.status === 'InProgress'
        },
        {
            icon: '✅',
            label: '標記為完成',
            onClick: () => { onChangeStatus(task, 'Done'); onClose(); },
            disabled: task.status === 'Done'
        },
        // 只有有刪除權限時才顯示刪除選項
        ...(canDelete ? [
            { type: 'divider' },
            {
                icon: '🗑️',
                label: '刪除任務',
                onClick: () => { onDelete(task.id); onClose(); },
                danger: true
            }
        ] : [])
    ];

    return (
        <div
            ref={menuRef}
            className="fixed bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50 min-w-48"
            style={{
                left: Math.min(position.x, window.innerWidth - 200),
                top: Math.min(position.y, window.innerHeight - 300)
            }}
        >
            {menuItems.map((item, index) => {
                if (item.type === 'divider') {
                    return <div key={index} className="border-t border-slate-200 my-1" />;
                }
                return (
                    <button
                        key={index}
                        onClick={item.onClick}
                        disabled={item.disabled}
                        className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors
                            ${item.disabled
                                ? 'text-slate-300 cursor-not-allowed'
                                : item.danger
                                    ? 'text-red-600 hover:bg-red-50'
                                    : 'text-slate-700 hover:bg-slate-100'
                            }`}
                    >
                        <span className="text-base">{item.icon}</span>
                        <span>{item.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

window.ContextMenu = ContextMenu;
