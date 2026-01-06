/**
 * WBSView Component
 * WBS 工作分解結構視圖 - 階層式樹狀任務管理
 * Phase 3 Day 2: 整合 TaskTreeNode 與 Drag & Drop
 * P1 功能: 專案篩選器 + 收合狀態記憶
 */

const { useState, useEffect, useCallback, useRef, useMemo } = React;

const WBSView = () => {
    // 使用 WBS API Hook
    const {
        treeData,
        isLoading,
        error,
        fetchTaskTree,
        moveTask,
        parseMarkdown,
        parseYaml,
        importTasks,
        updateLocalTask // 新增
    } = useWbsApi();

    // 使用 AppContext 獲取系統設定
    const {
        TEAMS,
        PROJECTS,
        OWNERS,
        tasks,
        userPermission,
        updateTaskStatus // 新增：為了支援狀態切換
    } = useAppContext();

    // 本地狀態
    const [expandedNodes, setExpandedNodes] = useState(() => {
        // P1: 從 localStorage 讀取已儲存的展開狀態
        try {
            const saved = localStorage.getItem('wbs_expandedNodes');
            return saved ? new Set(JSON.parse(saved)) : new Set();
        } catch {
            return new Set();
        }
    });
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // P1: 專案篩選器狀態
    const [selectedProject, setSelectedProject] = useState('');

    // 編輯任務狀態
    const [editingTask, setEditingTask] = useState(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

    // Drag & Drop 狀態
    const [draggingId, setDraggingId] = useState(null);
    const [dropTargetId, setDropTargetId] = useState(null);

    // Context Menu 狀態
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, node: null });

    // P1: 保存展開狀態到 localStorage
    useEffect(() => {
        try {
            localStorage.setItem('wbs_expandedNodes', JSON.stringify([...expandedNodes]));
        } catch (e) {
            console.warn('[WBS] 無法儲存展開狀態:', e);
        }
    }, [expandedNodes]);

    // P1: 根據專案篩選過濾 WBS 樹
    const filteredTreeData = useMemo(() => {
        if (!selectedProject) {
            return treeData; // 不篩選，顯示全部
        }

        const filterNodes = (nodes) => {
            return nodes.filter(node => {
                // 節點本身符合專案
                if (node.project === selectedProject) return true;
                // 或其子節點中有符合專案的
                if (node.children && node.children.length > 0) {
                    const filteredChildren = filterNodes(node.children);
                    if (filteredChildren.length > 0) {
                        node.children = filteredChildren;
                        return true;
                    }
                }
                return false;
            });
        };

        return {
            tree: filterNodes([...treeData.tree]),
            independent: treeData.independent.filter(t => t.project === selectedProject)
        };
    }, [treeData, selectedProject]);

    // 初始載入 + 版本檢查
    useEffect(() => {
        fetchTaskTree();

        // 檢查後端版本
        window.callApi('getVersion', {}).then(res => {
            console.log('🔧 [WBS] 後端版本:', res.version, 'build:', res.build);
        }).catch(err => {
            console.error('🔧 [WBS] 版本檢查失敗:', err);
        });
    }, [fetchTaskTree]);

    // 點擊空白處關閉 Context Menu
    useEffect(() => {
        const handleClick = () => setContextMenu({ visible: false, x: 0, y: 0, node: null });
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    // 切換節點展開
    const toggleNode = useCallback((nodeId) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    }, []);

    // 展開全部
    const expandAll = useCallback(() => {
        const allIds = new Set();
        const collectIds = (nodes) => {
            nodes.forEach(node => {
                allIds.add(node.id);
                if (node.children && node.children.length > 0) {
                    collectIds(node.children);
                }
            });
        };
        collectIds(treeData.tree);
        setExpandedNodes(allIds);
    }, [treeData.tree]);

    // 折疊全部
    const collapseAll = useCallback(() => {
        setExpandedNodes(new Set());
    }, []);

    // === Drag & Drop 處理 ===
    const handleDragStart = useCallback((nodeId) => {
        console.log(`[WBSView] 🚀 拖拽開始: ${nodeId}`);
        setDraggingId(nodeId);
    }, []);

    const handleDragOver = useCallback((nodeId, e) => {
        if (draggingId && nodeId !== draggingId) {
            // console.log(`[WBSView] 📍 拖拽經過: ${nodeId}`); // 避免太多 log
            setDropTargetId(nodeId);
        }
    }, [draggingId]);

    const handleDragEnd = useCallback(() => {
        console.log(`[WBSView] 🛑 拖拽結束`);
        setDraggingId(null);
        setDropTargetId(null);
    }, []);

    const handleDrop = useCallback(async (draggedId, targetId) => {
        console.log(`[WBSView] 🎯 放置: ${draggedId} -> ${targetId}`);

        // 防止拖入自己
        if (draggedId === targetId) {
            console.log('[WBSView] ⚠️ 不能拖拽到自己');
            handleDragEnd();
            return;
        }

        // 防止拖入自己的子孫 (前端預判) - 需同時檢查 tree 和 independent
        const isDescendant = (parentId, childId) => {
            const findNodeInTree = (id, nodeList) => {
                for (const node of nodeList) {
                    if (node.id === id) return node;
                    if (node.children) {
                        const found = findNodeInTree(id, node.children);
                        if (found) return found;
                    }
                }
                return null;
            };

            const checkDescendant = (node, targetChildId) => {
                if (!node || !node.children) return false;
                for (const child of node.children) {
                    if (child.id === targetChildId) return true;
                    if (checkDescendant(child, targetChildId)) return true;
                }
                return false;
            };

            // 搜尋 tree 和 independent
            const allNodes = [...(treeData.tree || []), ...(treeData.independent || [])];
            const parent = findNodeInTree(parentId, allNodes);
            return checkDescendant(parent, childId);
        };

        if (isDescendant(draggedId, targetId)) {
            alert('⚠️ 無法將任務移動到自己的子任務下');
            handleDragEnd();
            return;
        }

        console.log(`[WBSView] 📡 呼叫 moveTask API...`);

        // 呼叫 API 移動任務
        const success = await moveTask(draggedId, targetId, 0);
        if (success) {
            console.log('[WBSView] ✅ 移動成功');
        } else {
            console.log('[WBSView] ❌ 移動失敗');
        }
        handleDragEnd();
    }, [treeData.tree, treeData.independent, moveTask, handleDragEnd]);

    // === Context Menu 處理 ===
    const handleContextMenu = useCallback((e, node) => {
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            node: node
        });
    }, []);

    // === 新增子任務 ===
    const handleAddChild = useCallback((parentNode) => {
        // 建立新任務物件，預設 parentId 和 level
        const newTask = {
            id: null, // 新建任務
            task: '',
            project: parentNode.project || '',
            purpose: parentNode.purpose || '',
            team: parentNode.team || TEAMS?.[0] || '',
            owner: '',
            parentId: parentNode.id,
            level: (parentNode.level || 0) + 1,
            nodeType: parentNode.level === 0 ? 'story' : 'task',
            sortOrder: (parentNode.children?.length || 0),
            status: 'Todo',
            priority: 'Medium'
        };
        console.log('[WBSView] 新增子任務:', newTask);
        setEditingTask(newTask);
        setIsTaskModalOpen(true);
    }, [TEAMS]);

    // === 刪除任務 ===
    const handleDeleteNode = useCallback(async (node) => {
        if (!node || !node.id) return;

        // 檢查是否有子任務
        if (node.children && node.children.length > 0) {
            const confirmDeleteChildren = confirm(
                `⚠️ 「${node.task}」包含 ${node.children.length} 個子任務。\n\n刪除此任務將同時刪除所有子任務，確定要繼續嗎？`
            );
            if (!confirmDeleteChildren) return;
        }

        try {
            console.log('[WBSView] 刪除任務:', node.id);
            const result = await window.callApi('delete', { id: node.id });
            if (result.success) {
                console.log('[WBSView] 刪除成功');
                // 重新載入任務樹
                setTimeout(() => fetchTaskTree(), 300);
            } else {
                throw new Error(result.error || '刪除失敗');
            }
        } catch (error) {
            console.error('[WBSView] 刪除失敗:', error);
            alert('刪除失敗: ' + error.message);
        }
    }, [fetchTaskTree]);

    // === 上移/下移任務 ===
    const handleReorder = useCallback(async (node, direction) => {
        if (!node || !node.id) return;

        // 找出同層級的兄弟節點
        const parentId = node.parentId || '';
        let siblings = [];

        if (parentId) {
            // 從樹中找到父節點的 children
            const findParent = (nodes, targetId) => {
                for (const n of nodes) {
                    if (n.id === targetId) return n;
                    if (n.children) {
                        const found = findParent(n.children, targetId);
                        if (found) return found;
                    }
                }
                return null;
            };
            const parent = findParent(treeData.tree, parentId);
            siblings = parent?.children || [];
        } else {
            // 根節點，使用 tree 陣列
            siblings = treeData.tree;
        }

        // 找到當前位置
        const currentIndex = siblings.findIndex(s => s.id === node.id);
        if (currentIndex === -1) {
            console.error('[WBSView] 找不到節點在兄弟列表中');
            return;
        }

        // 計算新位置
        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (newIndex < 0 || newIndex >= siblings.length) {
            console.log('[WBSView] 已在邊界，無法移動');
            return;
        }

        // 重新排序：交換位置
        const newOrder = siblings.map(s => s.id);
        [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];

        console.log('[WBSView] 重新排序:', { parentId, oldIndex: currentIndex, newIndex, newOrder });

        try {
            const result = await window.callApi('reorderTasks', { parentId, taskIds: newOrder });
            if (result.success) {
                console.log('[WBSView] 排序成功');
                setTimeout(() => fetchTaskTree(), 300);
            } else {
                throw new Error(result.error || '排序失敗');
            }
        } catch (error) {
            console.error('[WBSView] 排序失敗:', error);
            alert('排序失敗: ' + error.message);
        }
    }, [treeData.tree, fetchTaskTree]);

    // === 設為獨立任務 ===
    const handleMakeIndependent = useCallback(async (node) => {
        if (!node || !node.id) return;

        // 檢查是否有子任務
        if (node.children && node.children.length > 0) {
            alert('⚠️ 此任務有子任務，請先處理子任務後再設為獨立任務');
            return;
        }

        console.log('[WBSView] 設為獨立任務:', node.id);

        try {
            // 使用 moveTask API，將 parentId 設為空字串（根節點）
            // 並且後端會自動設定 nodeType 為 independent（如果無父層）
            const result = await window.callApi('moveTask', {
                taskId: node.id,
                newParentId: '',  // 空字串表示移除父層
                newSortOrder: 0
            });

            if (result.success) {
                console.log('[WBSView] 已設為獨立任務');
                // 需要額外更新 nodeType
                await window.callApi('upsert', {
                    ...node,
                    parentId: '',
                    nodeType: 'independent',
                    level: 0
                });
                setTimeout(() => fetchTaskTree(), 300);
            } else {
                throw new Error(result.error || '設定失敗');
            }
        } catch (error) {
            console.error('[WBSView] 設定獨立任務失敗:', error);
            alert('設定失敗: ' + error.message);
        }
    }, [fetchTaskTree]);

    const handleContextMenuAction = useCallback((action) => {
        const node = contextMenu.node;
        if (!node) return;

        switch (action) {
            case 'expand':
                toggleNode(node.id);
                break;
            case 'addChild':
                handleAddChild(node);
                break;
            case 'moveUp':
                handleReorder(node, 'up');
                break;
            case 'moveDown':
                handleReorder(node, 'down');
                break;
            case 'makeIndependent':
                if (confirm(`確定要將「${node.task}」設為獨立任務嗎？`)) {
                    handleMakeIndependent(node);
                }
                break;
            case 'delete':
                if (confirm(`確定要刪除「${node.task}」嗎？`)) {
                    handleDeleteNode(node);
                }
                break;
            default:
                break;
        }
        setContextMenu({ visible: false, x: 0, y: 0, node: null });
    }, [contextMenu.node, toggleNode, handleAddChild, handleDeleteNode, handleReorder, handleMakeIndependent]);

    // 編輯任務
    const handleEdit = useCallback((node) => {
        console.log('[WBSView] 開啟編輯任務:', node);
        setEditingTask(node);
        setIsTaskModalOpen(true);
    }, []);

    // 關閉 TaskModal
    const handleModalClose = useCallback(() => {
        setEditingTask(null);
        setIsTaskModalOpen(false);
    }, []);

    // 儲存任務 (直接呼叫 API)
    const handleTaskSave = useCallback(async (e) => {
        if (e && e.preventDefault) {
            e.preventDefault();
        }
        const form = document.getElementById('task-form');
        if (!form) {
            console.error('[WBSView] 找不到表單');
            return;
        }
        const formData = new FormData(form);
        const updatedTask = {
            id: editingTask?.id, // 保留原 ID
            task: formData.get('task'),
            project: formData.get('project'),
            purpose: formData.get('purpose'),
            team: formData.get('team'),
            owner: formData.get('owner'),
            duration: parseInt(formData.get('duration') || 0),
            issueDate: formData.get('issueDate'),
            startDate: formData.get('startDate'),
            date: formData.get('date'),
            status: formData.get('status'),
            priority: formData.get('priority'),
            taskType: formData.get('taskType') || 'one-time',
            recurringCycle: formData.get('recurringCycle') || '',
            dependency: formData.get('dependency'),
            verification: formData.get('verification'),
            notes: formData.get('notes'),
            isCheckpoint: formData.get('isCheckpoint') === 'on',
            issuePool: formData.get('issuePool') === 'on',
            // 保留 WBS 相關欄位
            parentId: editingTask?.parentId || '',
            level: editingTask?.level ?? 0,
            sortOrder: editingTask?.sortOrder ?? 0,
            nodeType: editingTask?.nodeType || 'task'
        };

        console.log('[WBSView] 儲存任務:', updatedTask);

        try {
            // 直接呼叫 API 繞過需要表單事件的 handleSave
            const result = await window.callApi('upsert', updatedTask);
            if (result.success) {
                console.log('[WBSView] 儲存成功:', result);
                handleModalClose();
                // 重新載入任務樹
                setTimeout(() => fetchTaskTree(), 500);
            } else {
                throw new Error(result.error || '儲存失敗');
            }
        } catch (error) {
            console.error('[WBSView] 儲存失敗:', error);
            alert('儲存失敗: ' + error.message);
        }
    }, [editingTask, handleModalClose, fetchTaskTree]);

    // 🆕 處理狀態切換 (類似 Dashboard 的 cycleStatus)
    const handleStatusClick = useCallback(async (node) => {
        if (!node || !node.id) return;

        const statusOrder = ['Todo', 'InProgress', 'Done'];
        const currentIndex = statusOrder.indexOf(node.status);
        const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

        console.log(`[WBSView] 切換狀態: ${node.task} (${node.status} -> ${nextStatus})`);

        // 呼叫 useTaskData 的 updateTaskStatus (包含 AC 驗證邏輯)
        // 呼叫 useTaskData 的 updateTaskStatus (包含 AC 驗證邏輯)
        if (updateTaskStatus) {
            // 嘗試更新 (後端 + Global Tasks Context)
            const success = await updateTaskStatus(node, nextStatus);

            if (success) {
                // ✅ 成功更新：使用樂觀更新 (Optimistic Update) 修改 WBS 樹，不重新 fetch
                // 這樣可以大幅加速 UI 反應，避免 "loading..."
                if (updateLocalTask) {
                    updateLocalTask(node.id, { status: nextStatus });
                } else {
                    // Fallback (理論上不會發生)
                    fetchTaskTree();
                }
            } else {
                console.log('[WBSView] 狀態更新被阻擋或失敗');
            }
        }
    }, [updateTaskStatus, updateLocalTask, fetchTaskTree]);

    // 渲染單一節點 (使用 TaskTreeNode)
    const renderNode = (node) => (
        <TaskTreeNode
            key={node.id}
            node={node}
            level={0}
            isExpanded={expandedNodes.has(node.id)}
            onToggle={toggleNode}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            isDragging={draggingId}
            dropTarget={dropTargetId}
            onContextMenu={handleContextMenu}
            onEdit={handleEdit}
            onStatusClick={handleStatusClick}
        />
    );

    // 遞迴渲染樹 - 只渲染根節點，子節點由 TaskTreeNode 內部處理
    const renderTree = (nodes) => {
        return nodes.map(node => (
            <TaskTreeNode
                key={node.id}
                node={node}
                level={0}
                isExpanded={expandedNodes.has(node.id)}
                onToggle={toggleNode}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                isDragging={draggingId}
                dropTarget={dropTargetId}
                onContextMenu={handleContextMenu}
                onEdit={handleEdit}
                onStatusClick={handleStatusClick}
                expandedNodes={expandedNodes}
            />
        ));
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-white">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🎯</span>
                    <h2 className="text-lg font-semibold text-slate-800">WBS 工作分解結構</h2>
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                        {filteredTreeData.tree.length} 根節點
                    </span>
                    {filteredTreeData.independent.length > 0 && (
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            +{filteredTreeData.independent.length} 獨立
                        </span>
                    )}
                    {/* P1: 專案篩選器 */}
                    <select
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        className="text-sm border border-slate-300 rounded-lg px-2 py-1 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="">全部專案</option>
                        {PROJECTS && PROJECTS.map(p => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={expandAll}
                        className="text-xs text-slate-600 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100"
                    >
                        展開全部
                    </button>
                    <button
                        onClick={collapseAll}
                        className="text-xs text-slate-600 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100"
                    >
                        折疊全部
                    </button>
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 flex items-center gap-1"
                    >
                        <span>+</span> 匯入
                    </button>
                    <button
                        onClick={() => fetchTaskTree()}
                        className="text-sm bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-200 flex items-center gap-1"
                    >
                        🔄 重新整理
                    </button>
                </div>
            </div>

            {/* 操作提示 */}
            <div className="px-6 py-2 bg-slate-50 border-b border-slate-100 text-xs text-slate-500 flex items-center gap-4">
                <span>💡 提示: 拖拽節點可移動階層 | 右鍵開啟選單 | 雙擊編輯</span>
            </div>

            {/* Content */}
            <div className="max-h-[600px] overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="ml-3 text-slate-600">載入中...</span>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-12 text-red-600">
                        <span className="text-4xl mb-2">⚠️</span>
                        <p className="text-sm">{error}</p>
                        <button
                            onClick={() => fetchTaskTree()}
                            className="mt-4 text-sm bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200"
                        >
                            重試
                        </button>
                    </div>
                ) : filteredTreeData.tree.length === 0 && filteredTreeData.independent.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                        <span className="text-4xl mb-2">📭</span>
                        <p className="text-sm">{selectedProject ? `專案「${selectedProject}」無 WBS 資料` : '尚無 WBS 結構資料'}</p>
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="mt-4 text-sm bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-200"
                        >
                            匯入第一筆資料
                        </button>
                    </div>
                ) : (
                    <>
                        {/* WBS 樹狀結構 */}
                        {renderTree(filteredTreeData.tree)}

                        {/* 獨立任務區塊 */}
                        {filteredTreeData.independent.length > 0 && (
                            <div className="mt-4 border-t border-slate-200 pt-4">
                                <div className="px-4 py-2 text-sm font-medium text-slate-500 bg-slate-50 flex items-center gap-2">
                                    📋 獨立任務
                                    <span className="text-xs bg-slate-200 px-1.5 py-0.5 rounded">
                                        {filteredTreeData.independent.length}
                                    </span>
                                </div>
                                {filteredTreeData.independent.map(task => (
                                    <TaskTreeNode
                                        key={task.id}
                                        node={task}
                                        level={0}
                                        isExpanded={false}
                                        onToggle={() => { }}
                                        onDragStart={handleDragStart}
                                        onDragOver={handleDragOver}
                                        onDrop={handleDrop}
                                        onDragEnd={handleDragEnd}
                                        isDragging={draggingId}
                                        dropTarget={dropTargetId}
                                        onContextMenu={handleContextMenu}
                                        onEdit={handleEdit}
                                        onStatusClick={handleStatusClick}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Context Menu */}
            {contextMenu.visible && (
                <div
                    className="fixed bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50 min-w-[160px]"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="px-3 py-1.5 text-xs text-slate-400 border-b border-slate-100">
                        {contextMenu.node?.task?.slice(0, 20)}...
                    </div>
                    <button
                        onClick={() => handleContextMenuAction('expand')}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                    >
                        {expandedNodes.has(contextMenu.node?.id) ? '▼ 折疊' : '▶ 展開'}
                    </button>
                    <button
                        onClick={() => handleContextMenuAction('addChild')}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                    >
                        ➕ 新增子任務
                    </button>
                    <button
                        onClick={() => { handleEdit(contextMenu.node); setContextMenu({ visible: false, x: 0, y: 0, node: null }); }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                    >
                        ✏️ 編輯
                    </button>
                    <div className="border-t border-slate-100 my-1"></div>
                    <button
                        onClick={() => handleContextMenuAction('moveUp')}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                    >
                        ⬆️ 上移
                    </button>
                    <button
                        onClick={() => handleContextMenuAction('moveDown')}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                    >
                        ⬇️ 下移
                    </button>
                    <div className="border-t border-slate-100 my-1"></div>
                    <button
                        onClick={() => handleContextMenuAction('makeIndependent')}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-orange-50 text-orange-600 flex items-center gap-2"
                    >
                        📤 設為獨立任務
                    </button>
                    <button
                        onClick={() => handleContextMenuAction('delete')}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                    >
                        🗑️ 刪除
                    </button>
                </div>
            )}

            {/* Import Modal */}
            <ImportWBSModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={() => fetchTaskTree()}
            />

            {/* Task Edit Modal */}
            <TaskModal
                isOpen={isTaskModalOpen}
                onClose={handleModalClose}
                editingTask={editingTask}
                onSubmit={handleTaskSave}
                TEAMS={TEAMS || []}
                PROJECTS={PROJECTS || []}
                OWNERS={OWNERS || []}
                tasks={tasks || []}
                userPermission={userPermission || 'editor'}
            />
        </div>
    );
};

// 導出到 window
window.WBSView = WBSView;
