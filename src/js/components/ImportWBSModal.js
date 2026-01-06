/**
 * ImportWBSModal Component
 * WBS 匯入模態框 - 支援 Markdown 貼上
 * Phase 3 - Markdown Import Only
 */

const { useState, useCallback, useRef } = React;

const ImportWBSModal = ({ isOpen, onClose, onImport }) => {
    // Markdown 狀態
    const [markdownText, setMarkdownText] = useState('');
    const [previewTasks, setPreviewTasks] = useState(null);

    // 通用狀態
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // 使用 WBS API
    const { parseMarkdown, importTasks } = useWbsApi();

    // === Markdown 預覽解析 ===
    const handlePreview = useCallback(async () => {
        console.log('[ImportWBSModal] handlePreview called, markdownText length:', markdownText.length);
        console.log('[ImportWBSModal] markdownText first 100 chars:', markdownText.slice(0, 100));

        if (!markdownText.trim()) {
            setError('請輸入 Markdown 內容');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            console.log('[ImportWBSModal] Calling parseMarkdown with text length:', markdownText.length);
            const tasks = await parseMarkdown(markdownText);
            if (tasks) {
                setPreviewTasks(tasks);
                console.log('[ImportWBSModal] 解析成功:', tasks.length, '個任務');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [markdownText, parseMarkdown]);

    // === 匯入處理 ===
    const handleImport = useCallback(async () => {
        if (!previewTasks || previewTasks.length === 0) {
            setError('請先預覽解析結果');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await importTasks(previewTasks);
            if (result && result.success) {
                alert(`✅ 匯入成功！\n建立: ${result.created} 筆\n依賴更新: ${result.dependenciesUpdated || 0} 筆`);
                handleReset();
                onClose();
                if (onImport) onImport();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [previewTasks, importTasks, onClose, onImport]);

    // 重置狀態
    const handleReset = useCallback(() => {
        setMarkdownText('');
        setPreviewTasks(null);
        setError(null);
    }, []);

    // 載入範本
    const loadTemplate = useCallback(() => {
        const template = `# Epic: 專案名稱
  > 專案描述

## Story: 第一階段
  - [ ] 任務 A (負責人) [2025-01-01 ~ 2025-01-05] #T:軟體 #P:高
    > 任務描述
  - [ ] 任務 B (負責人) [2025-01-06 ~ 2025-01-10] #T:軟體 #depends:任務 A

## Story: 第二階段
  - [ ] 任務 C (負責人) [2025-01-11 ~ 2025-01-15] #T:電控
`;
        setMarkdownText(template);
        setPreviewTasks(null);
        setError(null);
    }, []);

    // 預覽任務列表渲染
    const renderPreviewList = (tasks) => {
        if (!tasks || tasks.length === 0) return null;

        const getNodeTypeStyle = (type) => {
            switch (type) {
                case 'epic': return 'bg-purple-100 text-purple-700';
                case 'story': return 'bg-blue-100 text-blue-700';
                case 'task': return 'bg-green-100 text-green-700';
                default: return 'bg-slate-100 text-slate-600';
            }
        };

        const getStatusStyle = (status) => {
            switch (status) {
                case 'Done': return 'bg-green-100 text-green-700';
                case 'InProgress': return 'bg-yellow-100 text-yellow-700';
                case 'Pending': return 'bg-orange-100 text-orange-700';
                default: return 'bg-slate-100 text-slate-600';
            }
        };

        return (
            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
                {tasks.map((task, idx) => (
                    <div
                        key={task.tempId || idx}
                        className="flex items-center px-3 py-2 border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                        style={{ paddingLeft: `${12 + (task.level || 0) * 16}px` }}
                    >
                        {/* Node Type Badge */}
                        <span className={`text-xs px-1.5 py-0.5 rounded mr-2 ${getNodeTypeStyle(task.nodeType)}`}>
                            {task.nodeType === 'epic' ? 'E' : task.nodeType === 'story' ? 'S' : 'T'}
                        </span>

                        {/* Task Name */}
                        <span className="flex-1 text-sm truncate">{task.task}</span>

                        {/* Team */}
                        {task.team && (
                            <span className="text-xs text-slate-400 mx-2">{task.team}</span>
                        )}

                        {/* Date Range */}
                        {task.startDate && task.date && (
                            <span className="text-xs text-slate-400 mx-2 hidden md:inline">
                                {task.startDate} ~ {task.date}
                            </span>
                        )}

                        {/* Status */}
                        <span className={`text-xs px-1.5 py-0.5 rounded ml-2 ${getStatusStyle(task.status)}`}>
                            {task.status}
                        </span>
                    </div>
                ))}
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-indigo-50 to-white">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">📝</span>
                        <h3 className="text-lg font-semibold text-slate-800">匯入 WBS (Markdown)</h3>
                    </div>
                    <button
                        onClick={() => { handleReset(); onClose(); }}
                        className="text-slate-400 hover:text-slate-600 text-xl p-1"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    {/* Format Hint */}
                    <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <p className="font-medium">支援格式:</p>
                            <button
                                onClick={loadTemplate}
                                className="text-xs text-indigo-600 hover:text-indigo-800"
                            >
                                📋 載入範本
                            </button>
                        </div>
                        <code className="text-xs bg-white px-2 py-1 rounded block">
                            # Epic 名稱<br />
                            ## Story 名稱<br />
                            &nbsp;&nbsp;- [ ] Task 名稱 (Owner) [StartDate ~ EndDate] #T:團隊 #P:優先級
                        </code>
                    </div>

                    {/* Markdown 輸入 */}
                    <textarea
                        value={markdownText}
                        onChange={(e) => { setMarkdownText(e.target.value); setPreviewTasks(null); }}
                        placeholder={`貼上 Markdown 格式的 WBS...

# Epic: 專案名稱
## Story: 功能模組
  - [ ] 任務描述 (負責人) [2025-01-01 ~ 2025-01-10] #T:軟體`}
                        className="w-full h-48 p-3 border border-slate-300 rounded-lg text-sm font-mono resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />

                    {/* 預覽按鈕 */}
                    <button
                        onClick={handlePreview}
                        disabled={isLoading || !markdownText.trim()}
                        className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                                解析中...
                            </span>
                        ) : '👁️ 預覽解析結果'}
                    </button>

                    {/* 預覽結果 */}
                    {previewTasks && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-700">
                                    ✅ 解析結果 ({previewTasks.length} 個任務)
                                </span>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span className="px-1.5 py-0.5 bg-purple-100 rounded">E</span> Epic
                                    <span className="px-1.5 py-0.5 bg-blue-100 rounded">S</span> Story
                                    <span className="px-1.5 py-0.5 bg-green-100 rounded">T</span> Task
                                </div>
                            </div>
                            {renderPreviewList(previewTasks)}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50">
                    <button
                        onClick={handleReset}
                        className="text-sm text-slate-500 hover:text-slate-700"
                    >
                        🔄 重置
                    </button>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => { handleReset(); onClose(); }}
                            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={isLoading || !previewTasks || previewTasks.length === 0}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm transition-colors"
                        >
                            {isLoading ? '匯入中...' : `✅ 確認匯入 (${previewTasks?.length || 0} 筆)`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 導出到 window
window.ImportWBSModal = ImportWBSModal;
