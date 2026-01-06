/**
 * LoginScreen 組件 (Lite 版本)
 * 顯示載入畫面 - Lite 版本自動以 Local Admin 身份登入
 */

const LoginScreen = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-indigo-100">
                <div className="text-center mb-8">
                    <div className="bg-indigo-600 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
                        <Icon path={paths.list} size={32} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Project Tracker</h1>
                    <div className="text-slate-500 text-sm">Lite Version</div>
                </div>

                <div className="space-y-6 text-center">
                    <div className="animate-pulse flex flex-col items-center">
                        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                        <h3 className="text-lg font-medium text-slate-700">正在載入...</h3>
                        <p className="text-sm text-slate-500 mt-1">初始化應用程式</p>
                    </div>

                    <div className="mt-6 bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm text-left">
                        <div className="font-bold mb-1 flex items-center gap-2">
                            ✅ Lite 版本 - 無需登入
                        </div>
                        <ul className="list-disc list-inside space-y-1 opacity-80">
                            <li>自動以 Local Admin 身份運行</li>
                            <li>適合個人或小團隊使用</li>
                            <li>無需設定 Google OAuth</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

window.LoginScreen = LoginScreen;
