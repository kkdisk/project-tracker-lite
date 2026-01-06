// SearchInput Component
// 搜尋自動完成元件 - 類似 Google 搜尋的前綴提示功能
// Props: value, onChange, tasks, TEAMS, PROJECTS, OWNERS

const SearchInput = ({ value, onChange, tasks, TEAMS, PROJECTS, OWNERS }) => {
    const { useState, useEffect, useRef, useMemo } = React;

    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const suggestionsRef = useRef(null);

    // 支援的前綴類型
    const PREFIXES = ['project:', 'purpose:', 'owner:', 'team:', 'task:', 'note:', 'status:'];

    // 支援的狀態值
    const STATUS_VALUES = ['Todo', 'InProgress', 'Done', 'Pending', 'Closed'];

    // 從任務中提取唯一的 Purpose 值
    const uniquePurposes = useMemo(() => {
        if (!tasks) return [];
        return [...new Set(tasks.map(t => t.purpose).filter(Boolean))].sort();
    }, [tasks]);

    // 從任務中提取唯一的 Owner 值
    const uniqueOwners = useMemo(() => {
        if (!tasks) return [];
        const taskOwners = tasks.map(t => t.owner).filter(Boolean);
        const allOwners = [...new Set([...taskOwners, ...(OWNERS || [])])];
        return allOwners.sort();
    }, [tasks, OWNERS]);

    // 分析輸入並產生建議
    const suggestions = useMemo(() => {
        if (!value) {
            // 空值時顯示可用的前綴提示
            return [];
        }

        const lowerValue = value.toLowerCase();

        // 檢查是否正在輸入前綴
        const partialPrefixMatch = PREFIXES.find(p =>
            p.startsWith(lowerValue) && p !== lowerValue
        );

        if (partialPrefixMatch && lowerValue.length > 0 && !lowerValue.includes(':')) {
            // 使用者正在輸入前綴，顯示可能的前綴
            return PREFIXES
                .filter(p => p.startsWith(lowerValue))
                .map(p => ({ type: 'prefix', value: p, display: p }));
        }

        // 檢查是否已輸入完整前綴
        const prefixMatch = value.match(/^(project|purpose|owner|team|task|note|status):(.*)$/i);

        if (prefixMatch) {
            const field = prefixMatch[1].toLowerCase();
            const partial = prefixMatch[2].toLowerCase();

            let items = [];
            switch (field) {
                case 'project':
                    items = (PROJECTS || []).filter(p =>
                        p && p.toLowerCase().includes(partial)
                    );
                    break;
                case 'purpose':
                    items = uniquePurposes.filter(p =>
                        p.toLowerCase().includes(partial)
                    );
                    break;
                case 'owner':
                    items = uniqueOwners.filter(o =>
                        o && o.toLowerCase().includes(partial)
                    );
                    break;
                case 'team':
                    items = (TEAMS || []).filter(t =>
                        t && t.toLowerCase().includes(partial)
                    );
                    break;
                case 'status':
                    items = STATUS_VALUES.filter(s =>
                        s.toLowerCase().includes(partial)
                    );
                    break;
                default:
                    items = [];
            }

            return items.slice(0, 8).map(item => ({
                type: 'value',
                value: `${field}:${item}`,
                display: item,
                field: field
            }));
        }

        return [];
    }, [value, PROJECTS, TEAMS, uniquePurposes, uniqueOwners]);

    // 是否顯示建議清單
    useEffect(() => {
        setShowSuggestions(suggestions.length > 0);
        setSelectedIndex(0);
    }, [suggestions]);

    // 點擊外部關閉建議
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (inputRef.current && !inputRef.current.contains(e.target) &&
                suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 選取建議
    const selectSuggestion = (suggestion) => {
        onChange(suggestion.value);
        setShowSuggestions(false);
        inputRef.current?.focus();
    };

    // 鍵盤導航
    const handleKeyDown = (e) => {
        if (!showSuggestions || suggestions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < suggestions.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev > 0 ? prev - 1 : suggestions.length - 1
                );
                break;
            case 'Enter':
                if (showSuggestions && suggestions[selectedIndex]) {
                    e.preventDefault();
                    selectSuggestion(suggestions[selectedIndex]);
                }
                break;
            case 'Escape':
                setShowSuggestions(false);
                break;
        }
    };

    // 取得前綴的中文標籤
    const getPrefixLabel = (prefix) => {
        const labels = {
            'project:': '專案',
            'purpose:': '目的',
            'owner:': '負責人',
            'team:': '部門',
            'task:': '任務',
            'note:': '備註',
            'status:': '狀態'
        };
        return labels[prefix] || prefix;
    };

    return (
        <div className="relative w-full">
            {/* 搜尋輸入框 */}
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                <Icon path={paths.search} size={16} />
            </div>
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="搜尋任務、負責人、備註... (輸入 project: 或 purpose: 進階搜尋)"
                className="w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm h-10"
            />
            {value && (
                <button
                    onClick={() => { onChange(''); setShowSuggestions(false); }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                    <Icon path={paths.x} size={16} />
                </button>
            )}

            {/* 建議清單 */}
            {showSuggestions && suggestions.length > 0 && (
                <div
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                >
                    <div className="px-3 py-2 text-xs text-slate-500 border-b bg-slate-50 font-medium">
                        {suggestions[0]?.type === 'prefix' ? '💡 可用的搜尋前綴' : '📋 建議選項'}
                    </div>
                    {suggestions.map((suggestion, index) => (
                        <div
                            key={suggestion.value}
                            onClick={() => selectSuggestion(suggestion)}
                            className={`px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors ${index === selectedIndex
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'hover:bg-slate-50'
                                }`}
                        >
                            {suggestion.type === 'prefix' ? (
                                <>
                                    <span className="text-indigo-500 font-mono text-sm">{suggestion.value}</span>
                                    <span className="text-slate-400 text-xs">- 搜尋{getPrefixLabel(suggestion.value)}</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-xs text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                        {suggestion.field}:
                                    </span>
                                    <span className="font-medium">{suggestion.display}</span>
                                </>
                            )}
                        </div>
                    ))}
                    <div className="px-3 py-1.5 text-[10px] text-slate-400 border-t bg-slate-50">
                        ↑↓ 選擇 • Enter 確認 • Esc 關閉
                    </div>
                </div>
            )}
        </div>
    );
};

window.SearchInput = SearchInput;
