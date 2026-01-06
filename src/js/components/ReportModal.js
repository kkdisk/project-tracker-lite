/**
 * ReportModal - 每週報告顯示 Modal
 */

const ReportModal = ({ isOpen, onClose, reportData }) => {
    if (!isOpen || !reportData) return null;

    const diff = reportData;
    const today = new Date();

    // 計算延遲天數
    const getDelayDays = (dueDate) => {
        const due = new Date(dueDate);
        return Math.floor((today - due) / (1000 * 60 * 60 * 24));
    };

    // 下載 Markdown 報告
    const handleDownloadMarkdown = () => {
        const markdown = generateReportMarkdown(diff);
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `WeeklyReport_${diff.reportDate}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold">📊 每週任務報告</h2>
                            <p className="text-indigo-200 text-sm mt-1">
                                快照日期: {diff.snapshotDate} → 報告日期: {diff.reportDate}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Summary */}
                <div className="p-6 border-b bg-slate-50">
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                        <div className="bg-blue-100 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-blue-700">{diff.added.length}</div>
                            <div className="text-xs text-blue-600">🆕 新增</div>
                        </div>
                        <div className="bg-green-100 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-green-700">{diff.completed.length}</div>
                            <div className="text-xs text-green-600">✅ 完成</div>
                        </div>
                        <div className="bg-yellow-100 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-yellow-700">{diff.dateChanged.length}</div>
                            <div className="text-xs text-yellow-600">📅 時程變更</div>
                        </div>
                        <div className="bg-purple-100 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-purple-700">{diff.statusChanged.length}</div>
                            <div className="text-xs text-purple-600">🔄 狀態變更</div>
                        </div>
                        <div className="bg-red-100 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-red-700">{diff.delayed.length}</div>
                            <div className="text-xs text-red-600">⚠️ 延遲</div>
                        </div>
                        <div className="bg-slate-100 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-slate-700">{diff.removed.length}</div>
                            <div className="text-xs text-slate-600">🗑️ 刪除</div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[50vh] space-y-6">
                    {/* 新增 */}
                    {diff.added.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-blue-700 mb-2">🆕 本週新增 ({diff.added.length})</h3>
                            <div className="bg-blue-50 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-blue-100">
                                        <tr>
                                            <th className="px-3 py-2 text-left">ID</th>
                                            <th className="px-3 py-2 text-left">任務</th>
                                            <th className="px-3 py-2 text-left">負責人</th>
                                            <th className="px-3 py-2 text-left">Due Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {diff.added.map((t, i) => (
                                            <tr key={i} className="border-t border-blue-100">
                                                <td className="px-3 py-2 font-mono text-xs">{t.id || t.ID}</td>
                                                <td className="px-3 py-2">{t.task || t.Task}</td>
                                                <td className="px-3 py-2">{t.owner || t.Owner}</td>
                                                <td className="px-3 py-2">{t.date || t.DueDate}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* 完成 */}
                    {diff.completed.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-green-700 mb-2">✅ 本週完成 ({diff.completed.length})</h3>
                            <div className="bg-green-50 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-green-100">
                                        <tr>
                                            <th className="px-3 py-2 text-left">ID</th>
                                            <th className="px-3 py-2 text-left">任務</th>
                                            <th className="px-3 py-2 text-left">負責人</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {diff.completed.map((t, i) => (
                                            <tr key={i} className="border-t border-green-100">
                                                <td className="px-3 py-2 font-mono text-xs">{t.id || t.ID}</td>
                                                <td className="px-3 py-2">{t.task || t.Task}</td>
                                                <td className="px-3 py-2">{t.owner || t.Owner}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* 延遲 */}
                    {diff.delayed.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-red-700 mb-2">⚠️ 延遲項目 ({diff.delayed.length})</h3>
                            <div className="bg-red-50 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-red-100">
                                        <tr>
                                            <th className="px-3 py-2 text-left">ID</th>
                                            <th className="px-3 py-2 text-left">任務</th>
                                            <th className="px-3 py-2 text-left">負責人</th>
                                            <th className="px-3 py-2 text-left">Due Date</th>
                                            <th className="px-3 py-2 text-left">延遲</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {diff.delayed.map((t, i) => (
                                            <tr key={i} className="border-t border-red-100">
                                                <td className="px-3 py-2 font-mono text-xs">{t.id || t.ID}</td>
                                                <td className="px-3 py-2">{t.task || t.Task}</td>
                                                <td className="px-3 py-2">{t.owner || t.Owner}</td>
                                                <td className="px-3 py-2">{t.date || t.DueDate}</td>
                                                <td className="px-3 py-2 text-red-600 font-semibold">
                                                    {getDelayDays(t.date || t.DueDate)} 天
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* 時程變更 */}
                    {diff.dateChanged.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-yellow-700 mb-2">📅 時程變更 ({diff.dateChanged.length})</h3>
                            <div className="bg-yellow-50 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-yellow-100">
                                        <tr>
                                            <th className="px-3 py-2 text-left">ID</th>
                                            <th className="px-3 py-2 text-left">任務</th>
                                            <th className="px-3 py-2 text-left">原定</th>
                                            <th className="px-3 py-2 text-left">→</th>
                                            <th className="px-3 py-2 text-left">新日期</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {diff.dateChanged.map((d, i) => (
                                            <tr key={i} className="border-t border-yellow-100">
                                                <td className="px-3 py-2 font-mono text-xs">{d.task.id || d.task.ID}</td>
                                                <td className="px-3 py-2">{d.task.task || d.task.Task}</td>
                                                <td className="px-3 py-2 text-slate-500 line-through">{d.oldDate}</td>
                                                <td className="px-3 py-2">→</td>
                                                <td className="px-3 py-2 font-semibold">{d.newDate}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* 狀態變更 */}
                    {diff.statusChanged.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-purple-700 mb-2">🔄 狀態變更 ({diff.statusChanged.length})</h3>
                            <div className="bg-purple-50 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-purple-100">
                                        <tr>
                                            <th className="px-3 py-2 text-left">ID</th>
                                            <th className="px-3 py-2 text-left">任務</th>
                                            <th className="px-3 py-2 text-left">原狀態</th>
                                            <th className="px-3 py-2 text-left">→</th>
                                            <th className="px-3 py-2 text-left">新狀態</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {diff.statusChanged.map((d, i) => (
                                            <tr key={i} className="border-t border-purple-100">
                                                <td className="px-3 py-2 font-mono text-xs">{d.task.id || d.task.ID}</td>
                                                <td className="px-3 py-2">{d.task.task || d.task.Task}</td>
                                                <td className="px-3 py-2 text-slate-500">{d.oldStatus}</td>
                                                <td className="px-3 py-2">→</td>
                                                <td className="px-3 py-2 font-semibold">{d.newStatus}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-slate-50 flex justify-between">
                    <button
                        onClick={handleDownloadMarkdown}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    >
                        📥 下載 Markdown 報告
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                    >
                        關閉
                    </button>
                </div>
            </div>
        </div>
    );
};
