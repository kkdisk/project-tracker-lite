/**
 * Project Tracker Build Script
 * 將 src/ 目錄中的模組化代碼合併為單一 HTML 檔案
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
    srcDir: 'src',
    buildDir: 'build',
    templateFile: 'src/index.template.html',
    outputFile: 'build/index.html',

    // 需要注入的模組
    modules: {
        hooks: [
            'hooks/useAuth.js',
            'hooks/useTaskData.js',
            'hooks/useFilters.js'
        ],
        contexts: [
            'contexts/AppContext.jsx'
        ],
        app: 'App.jsx'
    }
};

/**
 * 讀取檔案內容
 */
function readFile(filePath) {
    const fullPath = path.join(__dirname, '..', filePath);
    if (!fs.existsSync(fullPath)) {
        // 嘗試在srcDir中查找
        const srcFullPath = path.join(__dirname, '..', CONFIG.srcDir, filePath);
        if (fs.existsSync(srcFullPath)) {
            return fs.readFileSync(srcFullPath, 'utf-8');
        }
        console.warn(`⚠️  檔案不存在: ${filePath}`);
        return '';
    }
    return fs.readFileSync(fullPath, 'utf-8');
}

/**
 * 確保目錄存在
 */
function ensureDir(dirPath) {
    const fullPath = path.join(__dirname, '..', dirPath);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
}

/**
 * 合併模組為單一腳本標籤
 */
function bundleModules(modules, label) {
    if (!modules || modules.length === 0) return '';

    const code = modules
        .map(modulePath => {
            // 優先從 src 目錄讀取
            const srcPath = path.join(CONFIG.srcDir, modulePath);
            let content = readFile(srcPath);

            // 如果沒讀到，試試直接路徑
            if (!content) content = readFile(modulePath);

            if (!content) return '';
            return `// ===== ${modulePath} =====\n${content}\n`;
        })
        .filter(c => c)
        .join('\n');

    if (!code) return '';

    return `
    <!-- ${label} -->
    <script type="text/babel">
${code}
    </script>`;
}

/**
 * 主構建函數
 */
function build() {
    console.log('🔨 開始構建...\n');

    // 確保構建目錄存在
    ensureDir(CONFIG.buildDir);

    // 讀取模板
    console.log('📖 讀取模板:', CONFIG.templateFile);
    let template = readFile(CONFIG.templateFile);

    if (!template) {
        console.error('❌ 模板檔案不存在，無法構建');
        process.exit(1);
    }

    // 🔄 Inline Scripts (單檔部署)
    console.log('🔄 內聯外部腳本...');
    const scriptRegex = /<script\s+(?:type="([^"]+)"\s+)?src="([^"]+)"\s*><\/script>/g;
    template = template.replace(scriptRegex, (match, type, src) => {
        // 移除 query string
        const cleanSrc = src.split('?')[0];

        // 嘗試從專案根目錄讀取腳本
        let scriptPath = path.join(__dirname, '..', cleanSrc);

        // 備用：嘗試從 src 目錄讀取 (因為檔案都在 src/js 下，但html中的src可能還是 js/...)
        // 如果 html src 是 "js/config.js"，而檔案在 "src/js/config.js"，那麼:
        // path.join(..., 'src', "js/config.js") -> "src/js/config.js" - THIS IS CORRECT
        if (!fs.existsSync(scriptPath)) {
            scriptPath = path.join(__dirname, '..', CONFIG.srcDir, cleanSrc);
        }

        if (fs.existsSync(scriptPath)) {
            console.log(`   └─ 內聯: ${src}`);
            let content = fs.readFileSync(scriptPath, 'utf8');
            const typeAttr = type ? ` type="${type}"` : '';
            return `<script${typeAttr}>\n${content}\n</script>`;
        } else {
            console.warn(`   ⚠️ 找不到腳本: ${src} (路徑: ${scriptPath})`);
            return match;
        }
    });

    // 合併 hooks
    console.log('📦 合併 Hooks...');
    const hooksCode = bundleModules(CONFIG.modules.hooks, 'Custom Hooks');

    // 合併 contexts
    console.log('📦 合併 Contexts...');
    const contextsCode = bundleModules(CONFIG.modules.contexts, 'React Contexts');

    // 讀取 App.jsx
    console.log('📦 讀取 App 組件...');
    const appPath = path.join(CONFIG.srcDir, CONFIG.modules.app);
    const appCode = readFile(appPath); // readFile 會處理 srcDir
    const appBundle = appCode ? `
    <!-- App Component -->
    <script type="text/babel">
${appCode}
    </script>` : '';

    // 替換模板標記
    let output = template
        .replace('<!-- INJECT_HOOKS -->', hooksCode)
        .replace('<!-- INJECT_CONTEXTS -->', contextsCode)
        .replace('<!-- INJECT_APP -->', appBundle);

    // 寫入輸出檔案
    const outputPath = path.join(__dirname, '..', CONFIG.outputFile);
    fs.writeFileSync(outputPath, output, 'utf-8');

    console.log('\n✅ 構建完成!');
    console.log(`📄 輸出: ${CONFIG.outputFile}`);
    console.log(`📊 大小: ${(output.length / 1024).toFixed(2)} KB`);
}

/**
 * Watch 模式
 */
function watch() {
    console.log('👀 Watch 模式啟動...\n');

    const srcPath = path.join(__dirname, '..', CONFIG.srcDir);

    fs.watch(srcPath, { recursive: true }, (eventType, filename) => {
        if (filename && (filename.endsWith('.js') || filename.endsWith('.jsx') || filename.endsWith('.html'))) {
            console.log(`\n🔄 檔案變更: ${filename}`);
            build();
        }
    });

    // 初始構建
    build();
    console.log('\n👀 監聽檔案變更中... (Ctrl+C 停止)\n');
}

// 執行
if (process.argv.includes('--watch')) {
    watch();
} else {
    build();
}
