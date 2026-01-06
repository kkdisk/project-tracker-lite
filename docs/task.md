# Project Tracker Lite - 開發進度記錄

> 完成日期: 2026-01-07  
> 版本: v1.0.0  
> GitHub: https://github.com/kkdisk/project-tracker-lite

---

## 📋 任務總覽

### 1. 專案設定 ✅
- [x] 從原專案複製 `src/`、`scripts/`、`package.json` 到目標目錄
- [x] 刪除舊的 `github-release/` 資料夾
- [x] 初始化 Git repository

### 2. 簡化認證系統 ✅
- [x] 修改 `useAuth.js` - 改為 Local Admin 模式，跳過 OAuth 驗證
- [x] 簡化 `LoginScreen.js` 為 Lite 版本載入畫面

### 3. 移除企業專屬組件 ✅
- [x] 刪除 `DateChangeReviewPanel.js` (時程變更審核)
- [x] 刪除 `FileUploader.js` (Google Drive 上傳)
- [x] 修改 `App.jsx` - 移除時程審核相關 UI 和狀態
- [x] 更新 `index.template.html` - 移除已刪除組件的 script 引用

### 4. 簡化 TaskModal ✅
- [x] 移除 `onSubmitDateChangeRequest` 相關邏輯
- [x] 移除 `PendingReview` 狀態選項
- [x] 移除 FileUploader 區塊，改為說明文字

### 5. 後端更新 ✅
- [x] 新增 `apiDispatcher` 函數支援 `google.script.run` 呼叫
- [x] 確認與 Lite 版 frontend 相容

### 6. 文件更新 ✅
- [x] 更新 `README.md` - 專案結構說明
- [x] 新增 `docs/FEATURE_DRIVE_UPLOAD.md` - 檔案上傳功能實作指南
- [x] 更新 `.gitignore` - 加入 `*.code-workspace`

### 7. 版本更新 ✅
- [x] 統一版本號為 `1.0.0`
  - `package.json`: 1.0.0
  - `apps_script_lite.gs`: v1.0.0-lite
  - `App.jsx`: v1.0.0
  - `index.template.html`: v1.0.0

### 8. Build 與部署測試 ✅
- [x] 執行 `npm run build` 產生 `build/index.html`
- [x] 部署到 Google Apps Script
- [x] 驗證功能正常運作

### 9. Git 推送 ✅
- [x] 初始化 Git repository
- [x] Commit: `feat: Initial release of Project Tracker Lite`
- [x] Commit: `chore: Update version to 1.0.0`
- [x] 推送到 GitHub `main` 分支

---

## 🗑️ 已移除的企業功能

| 功能 | 相關檔案 | 說明 |
|------|----------|------|
| Google OAuth 權限驗證 | `useAuth.js` | 改為 Local Admin 模式 |
| 時程變更審核流程 | `DateChangeReviewPanel.js` | 已刪除 |
| PendingReview 狀態 | `TaskModal.js`, `App.jsx` | 已移除 |
| Google Drive 檔案上傳 | `FileUploader.js` | 已刪除，保留文件供日後加回 |
| 權限白名單管理 | - | Lite 版自動授予 Admin 權限 |

---

## 📁 最終檔案結構

```
project-tracker-lite/
├── apps_script_lite.gs      # 後端 API (~850 行)
├── build/
│   └── index.html           # 前端 Build 輸出 (~360KB)
├── src/
│   ├── App.jsx
│   ├── index.template.html
│   ├── hooks/
│   └── js/components/
├── scripts/
│   └── build.js
├── docs/
│   └── FEATURE_DRIVE_UPLOAD.md
├── README.md
├── LICENSE (MIT)
├── CONTRIBUTING.md
├── package.json
└── .gitignore
```

---

## 🔗 相關連結

- **GitHub Repository**: https://github.com/kkdisk/project-tracker-lite
- **Web App URL**: https://script.google.com/macros/s/AKfycbwYWJGfMPi7ivbKJ8c39MKztSWyrzU-nTaIlYz5in8VGk1JRsPBENTjqcACR3aiPEj1TA/exec
