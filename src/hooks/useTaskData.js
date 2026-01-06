/**
 * useTaskData Hook
 * 管理任務資料的載入、上傳、儲存和刪除
 */

function useTaskData(isAuthenticated) {
    // Fallback data if API fails and no backup exists
    const INITIAL_DATA = [];

    // Helper: 統一的 Task 格式化函數
    const formatTaskItem = (item) => {
        const normalizedDate = normalizeDate(item.date);

        // 解析 dateHistory (處理可能被舊格式污染的資料)
        let dateHistory = [];
        if (item.dateHistory) {
            let historyStr = String(item.dateHistory);
            try {
                // 如果以 [ 開頭，可能是 JSON 格式
                if (historyStr.trim().startsWith('[')) {
                    // 處理被分號追加舊格式的情況: "[{...}];oldformat"
                    const jsonEndIndex = historyStr.indexOf('];');
                    if (jsonEndIndex !== -1) {
                        historyStr = historyStr.substring(0, jsonEndIndex + 1);
                    }
                    dateHistory = JSON.parse(historyStr);
                }
            } catch (e) {
                console.warn('[dateHistory] 解析失敗:', e.message, '原始資料:', item.dateHistory);
                dateHistory = [];
            }
        }

        // 若無歷史記錄，以當前 date 建立初始記錄
        if (dateHistory.length === 0 && normalizedDate) {
            dateHistory = [{
                date: normalizedDate,
                changedAt: new Date().toISOString(),
                reason: '初始規劃',
                version: 1
            }];
        }

        return {
            ...item,
            id: item.id,
            duration: Math.max(Number(item.duration) || 1, 1), // 最小值為 1，避免甘特圖異常
            isCheckpoint: item.isCheckpoint === true || item.isCheckpoint === "TRUE",
            date: normalizedDate,
            issueDate: normalizeDate(item.issueDate) || '',
            startDate: normalizeDate(item.startDate) || '',
            dependency: item.dependency || '',
            notes: item.notes || '',
            category: item.category || item.team || 'Mechanism',
            dateHistory: dateHistory, // 已解析的陣列
            taskType: item.taskType || 'one-time', // 任務類型
            recurringCycle: item.recurringCycle || '', // 週期設定
            // Phase 2.0 Task 品質強化欄位
            background: item.background || '',
            expectedResult: item.expectedResult || '',
            acceptanceCriteria: item.acceptanceCriteria || '',
            assistants: item.assistants || '',
            verificationFiles: item.verificationFiles || '[]',
            reviewer: item.reviewer || ''
        };
    };
    const [tasks, setTasks] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isOffline, setIsOffline] = React.useState(false);
    const [apiError, setApiError] = React.useState(null);
    const [dataSource, setDataSource] = React.useState('google');
    const [uploadProgress, setUploadProgress] = React.useState('');
    const fileInputRef = React.useRef(null);

    // 載入任務資料
    React.useEffect(() => {
        if (!isAuthenticated) return;

        setIsLoading(true);
        const fetchData = async () => {
            try {
                setApiError(null);
                const result = await window.callApi('read');

                if (!result.success) {
                    throw new Error(result.error || '讀取失敗');
                }

                const data = result.data || [];

                if (Array.isArray(data) && data.length > 0) {
                    const firstItem = data[0];
                    const isUTMFormat = firstItem.hasOwnProperty('ID') || firstItem.hasOwnProperty('Task');

                    let formatted;
                    if (isUTMFormat) {
                        const convertResult = convertUTMToTracker(data);
                        formatted = convertResult.data;
                    } else {
                        formatted = data.map(formatTaskItem);
                    }
                    setTasks(formatted);
                    setDataSource('google');
                    setIsOffline(false);
                } else {
                    setTasks(INITIAL_DATA);
                    setIsOffline(false);
                }

            } catch (err) {
                console.error("API Error:", err);
                let errorMsg = err.message || '未知錯誤';

                if (errorMsg.includes('Failed to fetch')) {
                    errorMsg = '網路連線失敗，請檢查網路';
                }

                setApiError(errorMsg);

                const backup = localStorage.getItem('tasks_backup');
                if (backup) {
                    try {
                        const backupTasks = JSON.parse(backup);
                        const backupTime = localStorage.getItem('tasks_backup_time');
                        setTasks(backupTasks);
                        setApiError(`${errorMsg} - 使用本地備份 (${new Date(backupTime).toLocaleString('zh-TW')})`);
                    } catch (e) {
                        setTasks(INITIAL_DATA);
                    }
                } else {
                    setTasks(INITIAL_DATA);
                }
                setIsOffline(true);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [isAuthenticated]);

    // Excel 檔案上傳處理
    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const validExtensions = ['.xlsx', '.xls', '.csv'];
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!validExtensions.includes(fileExtension)) {
            alert('檔案格式不支援！請上傳 Excel (.xlsx, .xls) 或 CSV (.csv) 檔案');
            return;
        }

        setIsLoading(true);
        setUploadProgress(`正在讀取 ${file.name}...`);

        try {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    setUploadProgress('正在解析檔案...');

                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });

                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: true });

                    setUploadProgress('正在轉換資料格式...');

                    // 🆕 檢查是否為快照檔案 (用於週報比對)
                    if (jsonData[0] && (jsonData[0]._SnapshotDate || jsonData[0]['_SnapshotDate'])) {
                        console.log('📊 偵測到快照檔案，進行週報比對...');
                        setUploadProgress('偵測到快照檔案，正在比對...');

                        // 取得當前任務清單進行比對
                        const currentTasks = tasks;
                        const diff = compareSnapshots(jsonData, currentTasks);

                        // 透過 window 事件通知 App 顯示報告 Modal
                        window.dispatchEvent(new CustomEvent('showWeeklyReport', { detail: diff }));

                        setUploadProgress(`✓ 比對完成！快照日期: ${diff.snapshotDate}`);
                        setTimeout(() => setUploadProgress(''), 3000);
                        setIsLoading(false);
                        return;
                    }

                    const result = convertUTMToTracker(jsonData);

                    if (!result.success) {
                        const errorMsg = result.errors.join('\n');
                        if (result.data.length > 0) {
                            alert(`部分資料轉換失敗:\n${errorMsg}\n\n已成功載入 ${result.stats.converted} / ${result.stats.total} 筆任務`);
                        } else {
                            throw new Error(`資料轉換失敗:\n${errorMsg}`);
                        }
                    }

                    if (result.data.length === 0) {
                        throw new Error('檔案中沒有有效的任務資料');
                    }

                    setTasks(result.data);
                    setDataSource('excel');
                    setIsOffline(true);
                    setApiError(null);

                    try {
                        localStorage.setItem('tasks_backup', JSON.stringify(result.data));
                        localStorage.setItem('tasks_backup_time', new Date().toISOString());
                        localStorage.setItem('tasks_backup_source', file.name);
                    } catch (e) {
                        console.warn('本地儲存失敗:', e);
                    }

                    setUploadProgress(`✓ 成功載入 ${result.data.length} 筆任務 (來自 ${file.name})`);
                    setTimeout(() => setUploadProgress(''), 3000);

                } catch (parseError) {
                    console.error('解析錯誤:', parseError);
                    alert(`檔案解析失敗: ${parseError.message}`);
                    setUploadProgress('');
                } finally {
                    setIsLoading(false);
                }
            };

            reader.onerror = (error) => {
                console.error('檔案讀取錯誤:', error);
                alert('檔案讀取失敗，請重試');
                setUploadProgress('');
                setIsLoading(false);
            };

            reader.readAsArrayBuffer(file);

        } catch (error) {
            console.error('上傳錯誤:', error);
            alert(`上傳失敗: ${error.message}`);
            setUploadProgress('');
            setIsLoading(false);
        }
    };

    // 處理儲存
    const handleSave = (e, editingTask, todayStr) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const dateChangeReason = fd.get('dateChangeReason')?.trim() || '';
        const defaultDate = getTaiwanToday();
        const newDate = fd.get('date') || defaultDate;

        // 處理 dateHistory - 確保是陣列
        let dateHistory = [];
        if (Array.isArray(editingTask?.dateHistory)) {
            dateHistory = editingTask.dateHistory;
        } else if (typeof editingTask?.dateHistory === 'string') {
            // 嘗試解析字串
            try {
                const parsed = JSON.parse(editingTask.dateHistory);
                dateHistory = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                console.warn('⚠️ dateHistory 解析失敗，重置為空陣列');
                dateHistory = [];
            }
        }

        const oldDate = editingTask?.date;
        const isDateChanged = editingTask && oldDate !== newDate;
        const isNewTask = !editingTask;

        if (isNewTask || isDateChanged) {
            dateHistory = [...dateHistory, {
                date: newDate,
                changedAt: new Date().toISOString(),
                reason: isNewTask ? '初始規劃' : (dateChangeReason || '日期調整'),
                version: dateHistory.length + 1
            }];
        }

        const isEditing = !!editingTask;
        const newItem = {
            ...(isEditing && { id: editingTask.id }),
            project: fd.get('project'),
            purpose: fd.get('purpose') || '',
            team: fd.get('team'),
            task: fd.get('task'),
            owner: fd.get('owner'),
            issueDate: fd.get('issueDate') || '',
            startDate: fd.get('startDate') || '',
            date: newDate,
            duration: parseInt(fd.get('duration') || 0),
            isCheckpoint: fd.get('isCheckpoint') === 'on',
            issuePool: fd.get('issuePool') === 'on',
            priority: fd.get('priority'),
            status: fd.get('status'),
            dependency: fd.get('dependency'),
            verification: fd.get('verification'),
            notes: fd.get('notes'),
            dateHistory: JSON.stringify(dateHistory), // 傳送給後端時轉為 JSON 字串
            taskType: fd.get('taskType') || 'one-time',
            recurringCycle: fd.get('recurringCycle') || '',
            // Phase 2.0 Task 品質強化欄位
            background: fd.get('background') || '',
            expectedResult: fd.get('expectedResult') || '',
            acceptanceCriteria: fd.get('acceptanceCriteria') || '',
            assistants: fd.get('assistants') || '',
            verificationFiles: fd.get('verificationFiles') || '[]',
            reviewer: fd.get('reviewer') || ''
        };

        const validationErrors = validateTask(newItem);
        if (validationErrors.length > 0) {
            alert('驗證失敗:\n' + validationErrors.join('\n'));
            return;
        }

        if (isEditing) {
            const depErrors = validateDependencies(newItem.dependency, newItem.id, tasks);
            if (depErrors.length > 0) {
                alert('相依性驗證失敗:\n' + depErrors.join('\n'));
                return;
            }
            if (newItem.dependency && detectCircularDependency(newItem.id, newItem.dependency, tasks)) {
                alert('錯誤：偵測到循環相依性！');
                return;
            }
        }

        let updatedTasks = tasks;
        if (isEditing) {
            updatedTasks = tasks.map(t => t.id === newItem.id ? newItem : t);
            setTasks(updatedTasks);
        }

        if (isEditing) {
            try {
                localStorage.setItem('tasks_backup', JSON.stringify(updatedTasks));
                localStorage.setItem('tasks_backup_time', new Date().toISOString());
            } catch (e) {
                console.warn('本地儲存失敗:', e);
            }
        }

        if (!isOffline) {
            const action = isEditing ? 'update' : 'upsert';
            // ✅ 使用 callApi
            window.callApi(action, newItem)
                .then((result) => {
                    if (!result.success) throw new Error(result.error);

                    console.log('✅ 已發送至 Google Sheets');
                    if (!isEditing) {
                        setIsLoading(true);
                        setTimeout(() => {
                            // Reload data
                            window.callApi('read')
                                .then(result => {
                                    if (result.success && Array.isArray(result.data)) {
                                        const data = result.data;
                                        const formatted = data.map(formatTaskItem);
                                        setTasks(formatted);
                                    }
                                })
                                .finally(() => setIsLoading(false));
                        }, 1000);
                    }
                })
                .catch(err => {
                    console.error("❌ 發送失敗:", err);
                    alert('儲存到 Google Sheets 時發生錯誤，但本地已更新: ' + err.message);
                });
        }

        return true; // 表示儲存成功，由 App 關閉 modal
    };

    const handleDelete = (id) => {
        if (!confirm('確定要刪除此任務嗎？(將同步刪除 Google Sheet 資料)')) return;
        setTasks(prev => prev.filter(x => x.id !== id));

        if (!isOffline) {
            // ✅ 使用 callApi
            window.callApi('delete', { id: id })
                .then((res) => {
                    if (!res.success) throw new Error(res.error);
                    console.log('✅ 刪除成功');
                })
                .catch(err => console.error("❌ Delete Error:", err));
        }
    };

    // 快速更新任務狀態（用於右鍵選單、點擊切換等）
    const updateTaskStatus = (task, newStatus) => {
        if (!task || !task.id) return;

        // 🆕 [v7.5.13] 強制 AC 檢查：若嘗試標記為 Done，必須完成所有驗收準則
        if (newStatus === 'Done') {
            let acItems = [];
            try {
                if (Array.isArray(task.acceptanceCriteria)) {
                    acItems = task.acceptanceCriteria;
                } else if (typeof task.acceptanceCriteria === 'string') {
                    const acStr = task.acceptanceCriteria.trim();
                    if (acStr.startsWith('[')) {
                        // JSON 格式
                        acItems = JSON.parse(acStr);
                    } else if (acStr.includes('- [')) {
                        // Markdown 格式: "- [ ] Task 1"
                        acItems = acStr.split('\n')
                            .filter(line => line.trim())
                            .map(line => ({
                                checked: line.includes('[x]') || line.includes('[X]'),
                                content: line.replace(/^-?\s*\[[ xX]?\]\s*/, '').trim()
                            }));
                    }
                }
            } catch (e) {
                console.warn('AC 解析失敗:', e);
            }

            // 檢查是否有未勾選的項目
            const uncheckedCount = acItems.filter(item => !item.checked).length;

            if (uncheckedCount > 0) {
                alert(`⚠️ 無法標記為「完成」！\n\n此任務尚有 ${uncheckedCount} 項驗收準則 (AC) 未通過。\n\n請雙擊任務開啟編輯視窗，並勾選所有驗收項目。`);
                return false; // 阻擋更新
            }
        }

        const updatedTask = { ...task, status: newStatus };

        // 更新本地狀態
        setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));

        // 同步到遠端
        if (!isOffline) {
            // 回傳 Promise 以便調用者知道結果
            return window.callApi('update', updatedTask)
                .then((res) => {
                    if (!res.success) throw new Error(res.error);
                    console.log('✅ 狀態更新成功:', newStatus);
                    return true;
                })
                .catch(err => {
                    console.error("❌ 狀態更新失敗:", err);
                    // 回滾本地狀態
                    setTasks(prev => prev.map(t => t.id === task.id ? task : t));
                    return false;
                });
        }
        return Promise.resolve(true);
    };

    // 🆕 同步到雲端（Admin Only）- 將 Excel 匯入的資料寫入 Google Sheets
    const [syncProgress, setSyncProgress] = React.useState('');
    const [isSyncing, setIsSyncing] = React.useState(false);

    const handleSyncToCloud = async () => {
        if (!tasks || tasks.length === 0) {
            alert('❌ 沒有任務資料可同步');
            return;
        }

        if (!confirm(`確定要將 ${tasks.length} 筆任務同步到 Google Sheets？\n\n⚠️ 這會將所有 Excel 匯入的資料寫入雲端資料庫。`)) {
            return;
        }

        setIsSyncing(true);
        setSyncProgress(`開始同步 ${tasks.length} 筆任務...`);

        let successCount = 0;
        let failCount = 0;
        const errors = [];

        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            setSyncProgress(`同步中... ${i + 1}/${tasks.length} (${task.task?.substring(0, 20)}...)`);

            try {
                // 🆕 檢測 YAML 格式 ID (如 016_vacuum_pump_control_M3)
                const isYamlFormatId = (id) => {
                    if (!id) return false;
                    return /^\d{3}_/.test(String(id));
                };

                // 準備任務資料
                let taskData = {
                    ...task,
                    dateHistory: Array.isArray(task.dateHistory)
                        ? JSON.stringify(task.dateHistory)
                        : task.dateHistory || '[]'
                };

                // 🆕 YAML ID → Legacy_ID 轉換
                if (isYamlFormatId(task.id)) {
                    taskData.legacy_id = task.id;  // 保留原 YAML ID 為 legacy_id
                    delete taskData.id;             // 移除 id，讓後端產生新格式 ID
                    console.log(`[Sync] 轉換 YAML ID: ${task.id} → legacy_id`);
                }

                const result = await window.callApi('upsert', taskData);

                if (result.success) {
                    successCount++;
                } else {
                    failCount++;
                    errors.push(`${task.id}: ${result.error}`);
                }
            } catch (err) {
                failCount++;
                errors.push(`${task.id}: ${err.message}`);
            }

            // 每 10 筆暫停一下，避免 API 過載
            if ((i + 1) % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        setIsSyncing(false);
        setSyncProgress('');
        setIsOffline(false);
        setDataSource('google');

        if (failCount === 0) {
            alert(`✅ 同步完成！成功: ${successCount} 筆`);
        } else {
            alert(`⚠️ 同步完成\n成功: ${successCount} 筆\n失敗: ${failCount} 筆\n\n失敗項目:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`);
        }
    };

    return {
        tasks,
        setTasks,
        isLoading,
        setIsLoading,
        isOffline,
        apiError,
        dataSource,
        uploadProgress,
        fileInputRef,
        handleFileUpload,
        handleSave,
        handleDelete,
        updateTaskStatus,
        // 🆕 同步到雲端
        handleSyncToCloud,
        syncProgress,
        isSyncing
    };
}

// 導出到 window
window.useTaskData = useTaskData;
