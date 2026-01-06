/**
 * Google Apps Script API Wrapper
 * 封裝 google.script.run 為 Promise 形式，方便 React Hooks 使用 (async/await)
 */

const callApi = (action, payload = {}) => {
    return new Promise((resolve, reject) => {
        // 1. 檢查是否在 GAS 環境
        if (typeof google !== 'undefined' && google.script && google.script.run) {
            console.log(`📡 [GAS] 呼叫 API: ${action}`, payload);
            google.script.run
                .withSuccessHandler((response) => {
                    // 🔍 Debug: 記錄原始回應
                    console.log(`📡 [GAS] ${action} 原始回應類型:`, typeof response);
                    console.log(`📡 [GAS] ${action} 原始回應:`, response);

                    // 若後端回傳的是 JSON 字串 (為了兼容 doGet)，嘗試解析
                    if (typeof response === 'string') {
                        console.log(`📡 [GAS] ${action} 是字串，嘗試解析 JSON...`);
                        try {
                            const json = JSON.parse(response);
                            console.log(`📡 [GAS] ${action} 解析後:`, json);
                            resolve(json);
                        } catch (e) {
                            // 若不是 JSON，直接回傳
                            console.log(`📡 [GAS] ${action} 不是 JSON，直接回傳字串`);
                            resolve(response);
                        }
                    } else {
                        console.log(`📡 [GAS] ${action} 直接回傳物件`);
                        resolve(response);
                    }
                })
                .withFailureHandler((error) => {
                    console.error(`❌ [GAS] API 錯誤:`, error);
                    reject(error);
                })
                .apiDispatcher(action, payload); // 呼叫後端單一入口函數
        } else {
            // 2. 本地開發模式 (Local Dev Fallback) -> 使用 fetch
            // 從 config.js 獲取 API_URL (本地開發時 config.js 會定義預設 URL)
            // 注意: 本地開發無法測試 google.script.run，必須依賴 Web App URL 的 doGet/doPost
            console.warn(`⚠️ [Local] 非 GAS 環境，嘗試使用 fetch: ${action}`);

            // 構建請求
            // 如果只有 action 且無 payload，視為 GET
            // 但為了統一，建議後端 apiDispatcher 接收物件
            // 這裡模擬 POST 行為因為 Apps Script "run" 類似 RPC

            // 為了簡單起見，本地測試時我們假設 API_URL 指向測試部署
            if (typeof API_URL === 'undefined') {
                reject(new Error('Local Dev Error: API_URL not defined'));
                return;
            }

            // 本地無法完美模擬 Session Auth，除非 target URL 是 "Anyone" access
            // 這裡僅作簡單模擬
            const url = `${API_URL}?action=${action}`;

            // GET 模擬 (如果 payload 空)
            let fetchOptions = {
                method: 'POST',
                body: JSON.stringify({ action, data: payload }) // 模擬 doPost 結構
            };

            // 使用 POST 傳送 (fetch 到 Apps Script Web App url)
            fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action, data: payload }),
                headers: { "Content-Type": "text/plain;charset=utf-8" }, // GAS 不支援 application/json
            })
                .then(res => res.json())
                .then(data => resolve(data))
                .catch(err => reject(err));
        }
    });
};

// 匯出到全域 (因為沒有模組系統)
window.callApi = callApi;
