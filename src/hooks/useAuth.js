/**
 * useAuth Hook
 * 管理使用者認證狀態
 */

// 確保 React Hooks 可用
const { useState, useEffect } = React;

const useAuth = () => {
    // 狀態
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null); // { email, name, permission }
    const [isLoading, setIsLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    // 初始化檢查
    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        setIsLoading(true);
        setAuthError(null);
        try {
            // ✅ Lite 版本：Local Admin 模式，跳過 OAuth 驗證
            // 所有使用者預設為 Admin，適合個人或小團隊使用
            console.log('✅ Lite 版本：啟用 Local Admin 模式');
            setUser({
                email: 'local@admin',
                name: 'Local Admin',
                permission: 'admin'
            });
            setIsAuthenticated(true);

        } catch (err) {
            console.warn('❌ 初始化失敗:', err);
            setIsAuthenticated(false);
            setUser(null);
            setAuthError(err.message || '初始化錯誤');
        } finally {
            setIsLoading(false);
        }
    };

    // 登出 (Lite 版本重新整理頁面即可)
    const handleLogout = () => {
        setIsAuthenticated(false);
        setUser(null);
        window.location.reload();
    };

    return {
        isAuthenticated,
        user,
        isLoading,
        authError,
        checkSession, // 供 LoginScreen 重試用
        handleLogout
    };
};
