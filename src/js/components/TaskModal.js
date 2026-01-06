// TaskModal Component v2.1 - Step-by-Step Wizard (Lite Version)
// 4 步驟引導式表單
// 需要引入: React, icons.js


const TaskModal = ({
    isOpen,
    onClose,
    editingTask,
    onSubmit,
    TEAMS,
    PROJECTS,
    OWNERS,
    CATEGORIES,
    tasks = [],
    userPermission = 'viewer',
    teamsData = [] // 含有 Leader 資訊的 Teams 資料
}) => {
    const { useState, useEffect, useMemo } = React;
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });

    // ==================== 權限判斷 ====================
    const canDirectEdit = userPermission === 'admin' || userPermission === 'editor';

    // ==================== Step 精靈狀態 ====================
    const [currentStep, setCurrentStep] = useState(1);
    const [isQuickMode, setIsQuickMode] = useState(true);

    // ==================== 表單資料狀態 (必須在 forceFullMode 之前定義) ====================
    const [formData, setFormData] = useState({});

    // 初始化表單資料
    useEffect(() => {
        if (isOpen) {
            setFormData({
                task: editingTask?.task || '',
                project: editingTask?.project || PROJECTS[0] || '',
                purpose: editingTask?.purpose || '',
                team: editingTask?.team || '晶片',
                owner: editingTask?.owner || '',
                duration: editingTask?.duration || 1,
                issueDate: editingTask?.issueDate || todayStr,
                startDate: editingTask?.startDate || '',
                date: editingTask?.date || todayStr,
                status: editingTask?.status || 'Todo',
                priority: editingTask?.priority || 'Medium',
                dependency: editingTask?.dependency || '',
                verification: editingTask?.verification || '',
                notes: editingTask?.notes || '',
                isCheckpoint: editingTask?.isCheckpoint || false,
                issuePool: editingTask?.issuePool || false,
                taskType: editingTask?.taskType || 'one-time',
                recurringCycle: editingTask?.recurringCycle || '',
                // Phase 2.0 新欄位
                background: editingTask?.background || '',
                expectedResult: editingTask?.expectedResult || '',
                acceptanceCriteria: editingTask?.acceptanceCriteria || '',
                assistants: editingTask?.assistants || '',
                verificationFiles: editingTask?.verificationFiles || '[]',
                reviewer: editingTask?.reviewer || ''
            });
        }
    }, [editingTask, isOpen, PROJECTS, todayStr]);

    // ==================== 判斷是否為「大 case」需強制完整模式 ====================
    // 同時檢查 editingTask (初始) 和 formData (動態輸入)
    const forceFullMode = useMemo(() => {
        // 先檢查 editingTask (打開編輯現有任務時)
        if (editingTask) {
            if ((editingTask.duration >= 5) ||
                (editingTask.priority === 'High') ||
                (editingTask.isCheckpoint === true) ||
                (editingTask.nodeType === 'epic')) {
                return true;
            }
        }
        // 再檢查 formData (用戶在表單中的輸入)
        const duration = formData?.duration ?? 0;
        const priority = formData?.priority ?? '';
        const isCheckpoint = formData?.isCheckpoint ?? false;

        if (duration >= 5 || priority === 'High' || isCheckpoint === true) {
            return true;
        }
        return false;
    }, [editingTask, formData?.duration, formData?.priority, formData?.isCheckpoint]);

    // 初始化模式 (打開 Modal 時)
    useEffect(() => {
        if (isOpen) {
            // 初始判斷：編輯大 case 時強制完整模式
            const initialForce = editingTask && (
                (editingTask.duration >= 5) ||
                (editingTask.priority === 'High') ||
                (editingTask.isCheckpoint === true) ||
                (editingTask.nodeType === 'epic')
            );
            setIsQuickMode(!initialForce);
            setCurrentStep(1);
        }
    }, [editingTask, isOpen]);

    // 動態切換：當 formData 觸發 forceFullMode 時自動切換到完整模式
    useEffect(() => {
        if (forceFullMode && isQuickMode) {
            setIsQuickMode(false);
            // 如果當前在快速模式的最後一步 (Step 3)，保持在 Step 3
            // 這樣用戶可以繼續完成剩餘的 Step 4
        }
    }, [forceFullMode, isQuickMode]);

    const totalSteps = isQuickMode ? 2 : 4;

    // 計算最後一步的 step number
    // 快速模式：最後一步是 Step 3
    // 完整模式：最後一步是 Step 4
    const lastStepNumber = isQuickMode ? 3 : 4;

    // 判斷是否在最後一步
    const isLastStep = currentStep === lastStepNumber;

    // ==================== 自動帶入 Reviewer ====================
    const handleTeamChange = (newTeam) => {
        setFormData(prev => {
            const teamInfo = teamsData.find(t => t.teamName === newTeam);
            return {
                ...prev,
                team: newTeam,
                // 只有 reviewer 為空時才自動帶入
                reviewer: prev.reviewer || (teamInfo?.leader || '')
            };
        });
    };

    // ==================== 時程變更處理 ====================
    const [dateChanged, setDateChanged] = useState(false);

    const handleDateChange = (newDate) => {
        setFormData(prev => ({ ...prev, date: newDate }));
        if (editingTask && newDate !== editingTask.date) {
            setDateChanged(true);
        } else {
            setDateChanged(false);
        }
    };

    // ==================== Purpose 建議 ====================
    const uniquePurposes = useMemo(() => {
        if (!tasks) return [];
        return [...new Set(tasks.map(t => t.purpose).filter(Boolean))].sort();
    }, [tasks]);

    // ==================== AC 驗收準則解析 ====================
    const parseAC = (text) => {
        if (!text) return [];
        return text.split('\n')
            .filter(line => line.trim())
            .map(line => {
                const checked = line.includes('[x]') || line.includes('[X]');
                const content = line.replace(/^-?\s*\[[ xX]?\]\s*/, '').trim();
                return { checked, content };
            });
    };

    const formatAC = (items) => {
        return items.map(item => `- [${item.checked ? 'x' : ' '}] ${item.content}`).join('\n');
    };

    const [acItems, setAcItems] = useState([]);
    const [newAcItem, setNewAcItem] = useState('');

    useEffect(() => {
        setAcItems(parseAC(formData.acceptanceCriteria));
    }, [formData.acceptanceCriteria]);

    const addAcItem = () => {
        if (!newAcItem.trim()) return;
        const newItems = [...acItems, { checked: false, content: newAcItem.trim() }];
        setAcItems(newItems);
        setFormData(prev => ({ ...prev, acceptanceCriteria: formatAC(newItems) }));
        setNewAcItem('');
    };

    const removeAcItem = (index) => {
        const newItems = acItems.filter((_, i) => i !== index);
        setAcItems(newItems);
        setFormData(prev => ({ ...prev, acceptanceCriteria: formatAC(newItems) }));
    };

    const toggleAcItem = (index) => {
        const newItems = acItems.map((item, i) =>
            i === index ? { ...item, checked: !item.checked } : item
        );
        setAcItems(newItems);
        setFormData(prev => ({ ...prev, acceptanceCriteria: formatAC(newItems) }));
    };

    // ==================== 狀態選項 ====================
    const getStatusOptions = () => {
        const options = [
            { value: 'Todo', label: '待執行' },
            { value: 'InProgress', label: '進行中' },
            { value: 'Pending', label: '暫停/等待' },
            { value: 'Done', label: '完成' },
            { value: 'Closed', label: '不執行/取消' },
            { value: 'Delayed', label: '延誤' }
        ];
        return options;
    };

    // ==================== 導航處理 ====================
    const handleNext = (e) => {
        if (e) e.preventDefault();

        // 快速模式：Step 1 → Step 3
        if (isQuickMode && currentStep === 1) {
            setCurrentStep(3);
            return;
        }

        // 完整模式或其他情況：正常遞增
        // Step 1 → 2 → 3 → 4
        if (currentStep < 4) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrev = (e) => {
        if (e) e.preventDefault();

        // 快速模式：Step 3 → Step 1
        if (isQuickMode && currentStep === 3) {
            setCurrentStep(1);
            return;
        }

        // 完整模式或其他情況：正常遞減
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    // ==================== 表單提交與驗證 ====================
    const validateForm = () => {
        // 1. 驗證 Step 3 (負責指派) - 這是「硬限制 (Hard Block)」，缺了無法運作
        // 無論是快速還是完整模式，都必須有 Owner 和 Date
        if (!formData.owner) {
            alert('請在 Step 3 選擇「負責人」');
            setCurrentStep(isQuickMode ? 3 : 3);
            return false;
        }
        if (!formData.date) {
            alert('請在 Step 3 設定「完成日」');
            setCurrentStep(isQuickMode ? 3 : 3);
            return false;
        }

        // 2. 驗證 AC 完成度 (若狀態設為 Done) - 這是「硬限制」
        // 只有當所有 AC 都打勾時，才允許設為 Done
        if (formData.status === 'Done' && acItems.length > 0) {
            const uncheckedCount = acItems.filter(item => !item.checked).length;
            if (uncheckedCount > 0) {
                const msg = `⚠️ 尚有 ${uncheckedCount} 項驗收準則 (AC) 未完成，無法標記為「完成」！\n\n請務必完成所有驗收條件。`;

                if (isQuickMode) {
                    const confirmSwitch = window.confirm(`${msg}\n\n是否切換至完整模式進行確認？`);
                    if (confirmSwitch) {
                        setIsQuickMode(false);
                        setCurrentStep(2); // AC 在 Step 2
                    }
                } else {
                    alert(msg);
                    setCurrentStep(2);
                }
                return false;
            }
        }

        // 3. 驗證完整模式下的 Step 2 (任務定義) - 改為「軟限制 (Soft Warning)」
        // 針對 Epic 或 大 Task (>5天)，建議填寫但不強制阻擋
        if (!isQuickMode) {
            const missingFields = [];

            if (!formData.background || formData.background.length < 15) {
                missingFields.push('問題背景 (Background) - 建議詳述');
            }
            if (!formData.expectedResult) {
                missingFields.push('預期結果 (Expected Result)');
            }

            // 若有缺漏，跳出確認視窗
            if (missingFields.length > 0) {
                const msg = `⚠️ 為了確保任務品質，建議填寫以下欄位：\n\n${missingFields.map(f => `• ${f}`).join('\n')}\n\n確定要忽略並存檔嗎？`;
                const ignoreAndSave = window.confirm(msg);

                if (!ignoreAndSave) {
                    // 用戶選擇「取消」去補填 -> 跳轉到 Step 2
                    setCurrentStep(2);
                    return false;
                }
                // 用戶選擇「確定」-> 允許存檔 (return true)
            }
        }

        return true;
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();

        // 執行手動驗證
        if (!validateForm()) return;

        // 建立隱藏的 form 並觸發 onSubmit
        const form = e.target;
        const formDataObj = new FormData(form);

        // 填入所有 formData 值
        Object.entries(formData).forEach(([key, value]) => {
            if (typeof value === 'boolean') {
                if (value) formDataObj.set(key, 'on');
            } else {
                formDataObj.set(key, value);
            }
        });

        onSubmit(e);
    };

    if (!isOpen) return null;

    // ==================== Step 內容渲染 ====================
    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return renderStep1();
            case 2:
                return renderStep2();
            case 3:
                return renderStep3();
            case 4:
                return renderStep4();
            default:
                return null;
        }
    };

    // Step 1: 基本資訊
    const renderStep1 = () => (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    任務內容 <span className="text-red-500">*</span>
                </label>
                <input
                    name="task"
                    value={formData.task}
                    onChange={(e) => setFormData(prev => ({ ...prev, task: e.target.value }))}
                    required
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="請描述要完成的任務..."
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    專案 (Project) <span className="text-red-500">*</span>
                </label>
                <select
                    name="project"
                    value={formData.project}
                    onChange={(e) => setFormData(prev => ({ ...prev, project: e.target.value }))}
                    required
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                    {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    目的 (Purpose)
                    <span className="text-xs text-slate-500 ml-1">(選填)</span>
                </label>
                <input
                    list="purpose-suggestions"
                    name="purpose"
                    value={formData.purpose}
                    onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                    placeholder="例如: 水珠漂移、產品品質提升..."
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <datalist id="purpose-suggestions">
                    {uniquePurposes.map(p => <option key={p} value={p} />)}
                </datalist>
            </div>
        </div>
    );

    // Step 2: 任務定義 (僅完整模式)
    const renderStep2 = () => (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    問題背景 (Background)
                    <span className="text-xs text-slate-500 ml-1">為什麼要做這個任務？</span>
                </label>
                <textarea
                    name="background"
                    value={formData.background}
                    onChange={(e) => setFormData(prev => ({ ...prev, background: e.target.value }))}
                    rows="3"
                    placeholder="描述問題的背景、現況、痛點..."
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    預期結果 (Expected Result)
                    <span className="text-xs text-slate-500 ml-1">完成後會是什麼樣子？</span>
                </label>
                <textarea
                    name="expectedResult"
                    value={formData.expectedResult}
                    onChange={(e) => setFormData(prev => ({ ...prev, expectedResult: e.target.value }))}
                    rows="2"
                    placeholder="例如: 水珠漂移問題歸零、良率提升至 95%..."
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    驗收準則 (Acceptance Criteria)
                    <span className="text-xs text-slate-500 ml-1">如何判斷任務完成？</span>
                </label>
                <div className="bg-slate-50 p-3 rounded-lg border space-y-2">
                    {acItems.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 bg-white p-2 rounded border">
                            <input
                                type="checkbox"
                                checked={item.checked}
                                onChange={() => toggleAcItem(index)}
                                className="w-4 h-4 text-indigo-600"
                            />
                            <span className={`flex-1 text-sm ${item.checked ? 'line-through text-slate-400' : ''}`}>
                                {item.content}
                            </span>
                            <button
                                type="button"
                                onClick={() => removeAcItem(index)}
                                className="text-red-400 hover:text-red-600 text-xs"
                            >
                                刪除
                            </button>
                        </div>
                    ))}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newAcItem}
                            onChange={(e) => setNewAcItem(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAcItem())}
                            placeholder="新增驗收條件..."
                            className="flex-1 border rounded p-2 text-sm"
                        />
                        <button
                            type="button"
                            onClick={addAcItem}
                            className="px-3 py-2 bg-indigo-100 text-indigo-600 rounded text-sm hover:bg-indigo-200"
                        >
                            + 新增
                        </button>
                    </div>
                    <p className="text-xs text-slate-500">💡 提示：驗收時需勾選所有條件才能標記為完成</p>
                </div>
                {/* 隱藏欄位儲存 AC */}
                <input type="hidden" name="acceptanceCriteria" value={formData.acceptanceCriteria} />
            </div>
        </div>
    );

    // Step 3: 負責指派
    const renderStep3 = () => (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        部門 (Team) <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="team"
                        value={formData.team}
                        onChange={(e) => handleTeamChange(e.target.value)}
                        className="w-full border rounded-lg p-2 text-sm"
                    >
                        {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        負責人 (PIC) <span className="text-red-500">*</span>
                    </label>
                    <input
                        list="owners"
                        name="owner"
                        value={formData.owner}
                        onChange={(e) => setFormData(prev => ({ ...prev, owner: e.target.value }))}
                        required
                        className="w-full border rounded-lg p-2 text-sm"
                    />
                    <datalist id="owners">{OWNERS.map(o => <option key={o} value={o} />)}</datalist>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        協助者 (Assistants)
                        <span className="text-xs text-slate-500 ml-1">逗號分隔</span>
                    </label>
                    <input
                        name="assistants"
                        value={formData.assistants}
                        onChange={(e) => setFormData(prev => ({ ...prev, assistants: e.target.value }))}
                        placeholder="例如: Alice, Bob"
                        className="w-full border rounded-lg p-2 text-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        驗收人 (Reviewer)
                        <span className="text-xs text-indigo-600 ml-1">⚡ 自動帶入部門主管</span>
                    </label>
                    <input
                        list="owners"
                        name="reviewer"
                        value={formData.reviewer}
                        onChange={(e) => setFormData(prev => ({ ...prev, reviewer: e.target.value }))}
                        placeholder="負責核准驗收的人"
                        className="w-full border rounded-lg p-2 text-sm bg-indigo-50"
                    />
                </div>
            </div>

            {/* Status & Priority - Moved to Step 3 for Quick Mode access */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">狀態</label>
                    <select
                        name="status"
                        value={formData.status}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full border rounded-lg p-2 text-sm"
                    >
                        {getStatusOptions().map(opt => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">優先級</label>
                    <select
                        name="priority"
                        value={formData.priority}
                        onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                        className="w-full border rounded-lg p-2 text-sm"
                    >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Issue Date</label>
                    <input
                        type="date"
                        name="issueDate"
                        value={formData.issueDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
                        className="w-full border rounded-lg p-2 text-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        完成日 <span className="text-red-500">*</span>
                        {!canDirectEdit && editingTask && <span className="text-xs text-amber-600 ml-1">(變更需審核)</span>}
                    </label>
                    <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={(e) => handleDateChange(e.target.value)}
                        required
                        className={`w-full border rounded-lg p-2 text-sm ${dateChanged && !canDirectEdit ? 'border-amber-400 bg-amber-50' : ''}`}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">工時 (天)</label>
                    <input
                        type="number"
                        name="duration"
                        value={formData.duration}
                        onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 1 }))}
                        min="1"
                        className="w-full border rounded-lg p-2 text-sm"
                    />
                </div>
            </div>

            {dateChanged && !canDirectEdit && (
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                    <p className="text-xs text-amber-600">⚠️ 時程變更將送出審核申請</p>
                    <input
                        name="dateChangeReason"
                        placeholder="請填寫變更原因..."
                        className="w-full border rounded p-2 text-sm mt-2"
                    />
                </div>
            )}
        </div>
    );

    // Step 4: 驗收設定 (僅完整模式)
    const renderStep4 = () => (
        <div className="space-y-4">

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">驗證方式 (Verification)</label>
                <textarea
                    name="verification"
                    value={formData.verification}
                    onChange={(e) => setFormData(prev => ({ ...prev, verification: e.target.value }))}
                    rows="2"
                    placeholder="如何驗證此任務已完成？"
                    className="w-full border rounded-lg p-2 text-sm"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">備註 (Notes)</label>
                <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows="2"
                    placeholder="其他說明..."
                    className="w-full border rounded-lg p-2 text-sm"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    前置任務 (Dependency)
                    <span className="text-xs text-slate-500 ml-1">多個請用逗號分隔</span>
                </label>
                <input
                    name="dependency"
                    value={formData.dependency}
                    onChange={(e) => setFormData(prev => ({ ...prev, dependency: e.target.value }))}
                    placeholder="例如: CHIP-2026-01-0001, SW-2026-01-0002"
                    className="w-full border rounded-lg p-2 text-sm"
                />
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border space-y-2">
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        name="isCheckpoint"
                        id="isCheckpoint"
                        checked={formData.isCheckpoint}
                        onChange={(e) => setFormData(prev => ({ ...prev, isCheckpoint: e.target.checked }))}
                        className="w-4 h-4 text-indigo-600"
                    />
                    <label htmlFor="isCheckpoint" className="text-sm font-medium text-slate-700">
                        🚩 設為檢查點 (Checkpoint)
                    </label>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        name="issuePool"
                        id="issuePool"
                        checked={formData.issuePool}
                        onChange={(e) => setFormData(prev => ({ ...prev, issuePool: e.target.checked }))}
                        className="w-4 h-4 text-indigo-600"
                    />
                    <label htmlFor="issuePool" className="text-sm font-medium text-slate-700">
                        🔖 加入 Issue 認領區
                    </label>
                </div>
            </div>


            {/* 驗收報告 (Lite 版本不支援檔案上傳) */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    驗收報告
                    <span className="text-xs text-slate-500 ml-1">(Lite 版本)</span>
                </label>
                <div className="bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg p-4 text-center">
                    <p className="text-sm text-slate-500">📁 檔案上傳功能在 Lite 版本中未啟用</p>
                    <p className="text-xs text-slate-400 mt-1">請參考 docs/FEATURE_DRIVE_UPLOAD.md 了解如何啟用</p>
                </div>
            </div>

            {/* 隱藏欄位 */}
            <input type="hidden" name="taskType" value={formData.taskType} />
            <input type="hidden" name="recurringCycle" value={formData.recurringCycle} />
            <input type="hidden" name="verificationFiles" value={formData.verificationFiles} />
        </div>
    );

    // ==================== Step Indicator ====================
    const renderStepIndicator = () => {
        const steps = isQuickMode
            ? [{ num: 1, label: '基本資訊' }, { num: 3, label: '負責指派' }]
            : [
                { num: 1, label: '基本資訊' },
                { num: 2, label: '任務定義' },
                { num: 3, label: '負責指派' },
                { num: 4, label: '驗收設定' }
            ];

        return (
            <div className="flex items-center justify-center gap-2 mb-4">
                {steps.map((step, idx) => (
                    <React.Fragment key={step.num}>
                        <div
                            onClick={() => setCurrentStep(step.num)}
                            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors cursor-pointer hover:bg-indigo-50
                                ${currentStep === step.num
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    : currentStep > step.num
                                        ? 'bg-indigo-100 text-indigo-600'
                                        : 'bg-slate-100 text-slate-400'}`}
                        >
                            {currentStep > step.num ? '✓' : step.num}
                        </div>
                        {idx < steps.length - 1 && (
                            <div className={`w-12 h-1 rounded ${currentStep > step.num ? 'bg-indigo-300' : 'bg-slate-200'}`} />
                        )}
                    </React.Fragment>
                ))}
            </div>
        );
    };

    // ==================== 主要渲染 ====================
    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
        >
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] animate-fade-in overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center bg-slate-50 flex-shrink-0">
                    <div>
                        <h3 className="font-bold text-slate-800">
                            {editingTask ? '編輯任務' : '新增任務'}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500">
                                Step {isQuickMode ? (currentStep === 1 ? 1 : 2) : currentStep} / {totalSteps}
                            </span>
                            {!forceFullMode && (
                                <button
                                    type="button"
                                    onClick={() => setIsQuickMode(!isQuickMode)}
                                    className="text-xs text-indigo-600 hover:underline"
                                >
                                    {isQuickMode ? '展開完整表單 ▼' : '收合 ▲'}
                                </button>
                            )}
                            {forceFullMode && (
                                <span className="text-xs text-amber-600">⚠️ 此任務需完整填寫</span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600"
                        aria-label="關閉"
                    >
                        <Icon path={paths.x} />
                    </button>
                </div>

                {/* Step Indicator */}
                <div className="px-6 pt-4">
                    {renderStepIndicator()}
                </div>

                {/* Form Content */}
                <div className="overflow-y-auto flex-1 px-6 pb-4">
                    <form onSubmit={handleFormSubmit} id="task-form">
                        {renderStepContent()}

                        {/* 隱藏欄位 - 確保所有資料都在 DOM 中可被 FormData 取得 */}
                        {/* Step 1 欄位 */}
                        <input type="hidden" name="task" value={formData.task || ''} />
                        <input type="hidden" name="project" value={formData.project || ''} />
                        <input type="hidden" name="purpose" value={formData.purpose || ''} />

                        {/* Step 2 欄位 (完整模式) */}
                        <input type="hidden" name="background" value={formData.background || ''} />
                        <input type="hidden" name="expectedResult" value={formData.expectedResult || ''} />
                        <input type="hidden" name="acceptanceCriteria" value={formData.acceptanceCriteria || ''} />

                        {/* Step 3 欄位 */}
                        <input type="hidden" name="team" value={formData.team || ''} />
                        <input type="hidden" name="owner" value={formData.owner || ''} />
                        <input type="hidden" name="assistants" value={formData.assistants || ''} />
                        <input type="hidden" name="reviewer" value={formData.reviewer || ''} />
                        <input type="hidden" name="issueDate" value={formData.issueDate || ''} />
                        <input type="hidden" name="startDate" value={formData.startDate || ''} />
                        <input type="hidden" name="date" value={formData.date || ''} />
                        <input type="hidden" name="duration" value={formData.duration || 1} />

                        {/* Step 4 欄位 (完整模式) */}
                        <input type="hidden" name="status" value={formData.status || 'Todo'} />
                        <input type="hidden" name="priority" value={formData.priority || 'Medium'} />
                        <input type="hidden" name="verification" value={formData.verification || ''} />
                        <input type="hidden" name="notes" value={formData.notes || ''} />
                        <input type="hidden" name="dependency" value={formData.dependency || ''} />
                        <input type="hidden" name="isCheckpoint" value={formData.isCheckpoint ? 'on' : ''} />
                        <input type="hidden" name="issuePool" value={formData.issuePool ? 'on' : ''} />
                        <input type="hidden" name="taskType" value={formData.taskType || 'one-time'} />
                        <input type="hidden" name="recurringCycle" value={formData.recurringCycle || ''} />
                        <input type="hidden" name="verificationFiles" value={formData.verificationFiles || '[]'} />
                    </form>
                </div>

                {/* Footer - Navigation Buttons */}
                <div className="p-4 border-t bg-white flex justify-between items-center flex-shrink-0">
                    <div>
                        {currentStep > 1 && (
                            <button
                                type="button"
                                onClick={handlePrev}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                            >
                                ← 上一步
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm"
                        >
                            取消
                        </button>

                        {isLastStep ? (
                            // 最後一步顯示儲存按鈕
                            dateChanged && !canDirectEdit && editingTask ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (onSubmitDateChangeRequest) {
                                            onSubmitDateChangeRequest({
                                                taskId: editingTask.id,
                                                newDate: formData.date,
                                                reason: document.querySelector('[name="dateChangeReason"]')?.value || ''
                                            });
                                        }
                                    }}
                                    className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
                                >
                                    📝 申請時程變更
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    form="task-form"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                                >
                                    💾 儲存
                                </button>
                            )
                        ) : (
                            // 非最後一步顯示下一步按鈕
                            <button
                                type="button"
                                onClick={handleNext}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                            >
                                下一步 →
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

window.TaskModal = TaskModal;
