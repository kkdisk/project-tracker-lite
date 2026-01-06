/**
 * AppContext
 * 提供全域狀態管理，避免 Prop Drilling
 */

const AppContext = React.createContext(null);

const AppProvider = ({ children, value }) => {
    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

// Custom Hook for easier usage
const useAppContext = () => {
    const context = React.useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};

// 導出到 window
window.AppContext = AppContext;
window.AppProvider = AppProvider;
window.useAppContext = useAppContext;
