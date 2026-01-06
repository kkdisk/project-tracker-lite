/**
 * useWbsApi Hook
 * WBS (Work Breakdown Structure) 相關 API 封裝
 * 管理任務樹結構的載入、移動、排序和匯入
 */

const { useState, useCallback } = React;

const useWbsApi = () => {
    // 狀態
    const [treeData, setTreeData] = useState({ tree: [], independent: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * 取得任務樹結構
     * @param {string} projectId - 可選，篩選特定專案
     */
    const fetchTaskTree = useCallback(async (projectId = '') => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await window.callApi('getTaskTree', {
                projectId,
                includeIndependent: true
            });
            if (result.success) {
                setTreeData({
                    tree: result.tree || [],
                    independent: result.independent || []
                });
                console.log('[useWbsApi] 任務樹載入成功:', result.tree?.length, '根節點');
            } else {
                throw new Error(result.error || '未知錯誤');
            }
        } catch (err) {
            console.error('[useWbsApi] fetchTaskTree 錯誤:', err);
            setError(err.message || err.toString());
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * 移動任務到新父節點
     * @param {string} taskId - 要移動的任務 ID
     * @param {string} newParentId - 新父節點 ID (空字串表示移至根節點)
     * @param {number} newSortOrder - 新排序位置
     */
    const moveTask = useCallback(async (taskId, newParentId, newSortOrder = 0) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await window.callApi('moveTask', {
                taskId,
                newParentId,
                newSortOrder
            });
            if (result.success) {
                console.log('[useWbsApi] 任務移動成功:', result.message);
                // 重新載入樹狀結構
                await fetchTaskTree();
                return true;
            } else {
                throw new Error(result.error || '移動失敗');
            }
        } catch (err) {
            console.error('[useWbsApi] moveTask 錯誤:', err);
            setError(err.message || err.toString());
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [fetchTaskTree]);

    /**
     * 批次排序任務
     * @param {string} parentId - 父節點 ID
     * @param {string[]} taskIds - 排序後的任務 ID 陣列
     */
    const reorderTasks = useCallback(async (parentId, taskIds) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await window.callApi('reorderTasks', { parentId, taskIds });
            if (result.success) {
                console.log('[useWbsApi] 排序成功');
                await fetchTaskTree();
                return true;
            } else {
                throw new Error(result.error || '排序失敗');
            }
        } catch (err) {
            console.error('[useWbsApi] reorderTasks 錯誤:', err);
            setError(err.message || err.toString());
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [fetchTaskTree]);

    /**
     * 解析 Markdown WBS 文字
     * @param {string} markdownText - Markdown 格式的 WBS 文字
     */
    const parseMarkdown = useCallback(async (markdownText) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await window.callApi('parseMarkdownWBS', { markdownText });
            if (result.success) {
                console.log('[useWbsApi] Markdown 解析成功:', result.count, '個任務');
                return result.tasks;
            } else {
                throw new Error(result.error || '解析失敗');
            }
        } catch (err) {
            console.error('[useWbsApi] parseMarkdown 錯誤:', err);
            setError(err.message || err.toString());
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * 解析 YAML WBS 物件
     * @param {Object} yamlObj - 由 js-yaml 解析後的 JavaScript 物件
     * @param {string} projectStartDate - 專案起始日期 (YYYY-MM-DD)
     */
    const parseYaml = useCallback(async (yamlObj, projectStartDate) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await window.callApi('parseYamlWBS', { yamlObj, projectStartDate });
            if (result.success) {
                console.log('[useWbsApi] YAML 解析成功:', result.count, '個任務');
                return result.tasks;
            } else {
                throw new Error(result.error || '解析失敗');
            }
        } catch (err) {
            console.error('[useWbsApi] parseYaml 錯誤:', err);
            setError(err.message || err.toString());
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * 批次匯入 WBS 任務
     * @param {Array} tasks - 解析後的任務陣列 (包含 tempId, parentId 等)
     */
    const importTasks = useCallback(async (tasks) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await window.callApi('importWBSTasks', { tasks });
            if (result.success) {
                console.log('[useWbsApi] 匯入成功:', result.message);
                // 重新載入樹狀結構
                await fetchTaskTree();
                return result;
            } else {
                throw new Error(result.error || '匯入失敗');
            }
        } catch (err) {
            console.error('[useWbsApi] importTasks 錯誤:', err);
            setError(err.message || err.toString());
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [fetchTaskTree]);

    /**
     * 檢查重複任務
     * @param {string} scope - 'global' | 'project'
     * @param {string} projectId - 專案 ID (scope 為 'project' 時必填)
     * @param {string} mode - 'strict' | 'fuzzy'
     */
    const checkDuplicates = useCallback(async (scope = 'global', projectId = '', mode = 'strict') => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await window.callApi('checkDuplicateTasks', { scope, projectId, mode });
            if (result.success) {
                console.log('[useWbsApi] 重複檢查完成:', result.totalDuplicates, '個重複');
                return result;
            } else {
                throw new Error(result.error || '檢查失敗');
            }
        } catch (err) {
            console.error('[useWbsApi] checkDuplicates 錯誤:', err);
            setError(err.message || err.toString());
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * 更新本地任務樹資料 (不重新 fetch)
     * 用於樂觀更新 (Optimistic Update)
     */
    const updateLocalTask = useCallback((taskId, updates) => {
        setTreeData(prev => {
            const newTree = structuredClone(prev.tree);
            const newIndependent = [...prev.independent];

            // 遞迴尋找並更新
            const updateNode = (nodes) => {
                for (let i = 0; i < nodes.length; i++) {
                    if (nodes[i].id === taskId) {
                        nodes[i] = { ...nodes[i], ...updates };
                        return true;
                    }
                    if (nodes[i].children && nodes[i].children.length > 0) {
                        if (updateNode(nodes[i].children)) return true;
                    }
                }
                return false;
            };

            // 先找 Tree
            if (!updateNode(newTree)) {
                // 沒找到，找 Independent
                const idx = newIndependent.findIndex(t => t.id === taskId);
                if (idx !== -1) {
                    newIndependent[idx] = { ...newIndependent[idx], ...updates };
                }
            }

            return { tree: newTree, independent: newIndependent };
        });
    }, []);

    return {
        // 狀態
        treeData,
        isLoading,
        error,

        // 方法
        fetchTaskTree,
        moveTask,
        reorderTasks,
        parseMarkdown,
        parseYaml,
        importTasks,
        checkDuplicates,
        updateLocalTask // 🆕 匯出此方法
    };
};

// 導出到 window (遵循現有慣例)
window.useWbsApi = useWbsApi;
