/**
 * TaskTreeNode Component
 * 單一任務節點 - 支援展開/折疊、拖拽、右鍵選單
 * Phase 3 Day 2
 */

const TaskTreeNode = ({
    node,
    level = 0,
    isExpanded,
    onToggle,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    isDragging,
    dropTarget,
    onContextMenu,
    onEdit,
    onStatusClick, // 新增：狀態點擊回調
    expandedNodes = new Set() // 新增：用於子節點判斷展開狀態
}) => {
    const hasChildren = node.children && node.children.length > 0;
    const indent = level * 24;

    // 節點類型顏色
    const nodeTypeStyles = {
        epic: 'bg-purple-100 text-purple-700 border-purple-200',
        story: 'bg-blue-100 text-blue-700 border-blue-200',
        task: 'bg-green-100 text-green-700 border-green-200',
        independent: 'bg-slate-100 text-slate-600 border-slate-200'
    };

    // 狀態顏色
    const statusStyles = {
        'Done': 'bg-green-100 text-green-700',
        'In Progress': 'bg-yellow-100 text-yellow-700',
        'Todo': 'bg-slate-100 text-slate-600',
        'Blocked': 'bg-red-100 text-red-700'
    };

    // 進度條顏色
    const getProgressColor = (progress) => {
        if (progress >= 100) return 'bg-green-500';
        if (progress >= 75) return 'bg-emerald-500';
        if (progress >= 50) return 'bg-yellow-500';
        if (progress >= 25) return 'bg-orange-500';
        return 'bg-red-500';
    };

    // 處理拖拽開始
    const handleDragStart = (e) => {
        e.dataTransfer.setData('text/plain', node.id);
        e.dataTransfer.effectAllowed = 'move';
        if (onDragStart) onDragStart(node.id);
    };

    // 處理拖拽結束
    const handleDragEnd = (e) => {
        if (onDragEnd) onDragEnd();
    };

    // 處理拖拽經過
    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (onDragOver) onDragOver(node.id, e);
    };

    // 處理放置
    const handleDrop = (e) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/plain');
        if (draggedId !== node.id && onDrop) {
            onDrop(draggedId, node.id);
        }
    };

    // 處理右鍵選單
    const handleContextMenu = (e) => {
        e.preventDefault();
        if (onContextMenu) {
            onContextMenu(e, node);
        }
    };

    // 處理雙擊編輯
    const handleDoubleClick = () => {
        if (onEdit) onEdit(node);
    };

    const isDropTarget = dropTarget === node.id;

    return (
        <div className="select-none">
            <div
                className={`
                    flex items-center py-2 px-4 
                    hover:bg-slate-50 cursor-pointer transition-all duration-150
                    border-l-4 border-transparent
                    ${isDragging === node.id ? 'opacity-50 bg-slate-100' : ''}
                    ${isDropTarget ? 'border-l-indigo-500 bg-indigo-50' : ''}
                `}
                style={{ paddingLeft: `${16 + indent}px` }}
                draggable
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onContextMenu={handleContextMenu}
                onDoubleClick={handleDoubleClick}
            >
                {/* 展開/折疊按鈕 */}
                <button
                    onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
                    className={`
                        w-5 h-5 flex items-center justify-center 
                        text-slate-400 hover:text-slate-600 mr-2 
                        transition-transform duration-200
                        ${!hasChildren ? 'invisible' : ''}
                        ${isExpanded ? 'rotate-0' : '-rotate-90'}
                    `}
                >
                    {hasChildren ? '▼' : ''}
                </button>

                {/* 拖拽手柄 */}
                <span className="text-slate-300 mr-2 cursor-grab active:cursor-grabbing" title="拖拽移動">
                    ⋮⋮
                </span>

                {/* Node Type Badge */}
                <span className={`
                    text-xs px-1.5 py-0.5 rounded border mr-2 font-medium
                    ${nodeTypeStyles[node.nodeType] || nodeTypeStyles.independent}
                `}>
                    {node.nodeType === 'epic' ? 'E' :
                        node.nodeType === 'story' ? 'S' :
                            node.nodeType === 'task' ? 'T' : '-'}
                </span>

                {/* 任務 ID (可選顯示) */}
                <span className="text-xs text-slate-400 mr-2 font-mono hidden lg:inline">
                    {node.legacy_id || node.id?.slice(-8) || ''}
                </span>

                {/* 任務名稱 */}
                <span className="flex-1 text-sm text-slate-700 truncate font-medium">
                    {node.task}
                </span>

                {/* Team Badge */}
                {node.team && (
                    <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded ml-2 hidden md:inline">
                        {node.team}
                    </span>
                )}

                {/* 進度條 */}
                {node.calculatedProgress !== undefined && (
                    <div className="flex items-center gap-2 ml-4">
                        <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-300 ${getProgressColor(node.calculatedProgress)}`}
                                style={{ width: `${Math.min(node.calculatedProgress, 100)}%` }}
                            />
                        </div>
                        <span className="text-xs text-slate-500 w-10 text-right font-medium">
                            {Math.round(node.calculatedProgress)}%
                        </span>
                    </div>
                )}

                {/* 狀態 (可切換) */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onStatusClick) onStatusClick(node);
                    }}
                    className={`
                        ml-3 text-xs px-2 py-0.5 rounded font-medium transition-opacity hover:opacity-80
                        ${statusStyles[node.status] || statusStyles.Todo}
                    `}
                    title="點擊切換狀態"
                >
                    {node.status || 'Todo'}
                </button>

                {/* 子任務數量 */}
                {hasChildren && (
                    <span className="ml-2 text-xs text-slate-400">
                        ({node.children.length})
                    </span>
                )}
            </div>

            {/* 子節點 */}
            {hasChildren && isExpanded && (
                <div className="bg-slate-50/30">
                    {node.children.map(child => (
                        <TaskTreeNode
                            key={child.id}
                            node={child}
                            level={level + 1}
                            isExpanded={expandedNodes.has(child.id)}
                            onToggle={onToggle}
                            onDragStart={onDragStart}
                            onDragOver={onDragOver}
                            onDrop={onDrop}
                            onDragEnd={onDragEnd}
                            isDragging={isDragging}
                            dropTarget={dropTarget}
                            onContextMenu={onContextMenu}
                            onEdit={onEdit}
                            onStatusClick={onStatusClick}
                            expandedNodes={expandedNodes}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// 導出到 window
window.TaskTreeNode = TaskTreeNode;
