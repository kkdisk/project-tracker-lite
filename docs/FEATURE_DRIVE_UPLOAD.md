# Google Drive 檔案上傳功能 - 實作指南

> 此功能已從 Lite 版移除，本文件說明如何日後加回。

---

## 概述

Google Drive 上傳功能允許使用者將檔案附加到任務中，檔案會上傳到指定的 Google Drive 資料夾。

---

## 前置需求

1. **Google Drive 資料夾** - 建立一個資料夾並取得其 ID
2. **OAuth Scope** - 需要 `https://www.googleapis.com/auth/drive` 權限

---

## 後端實作 (apps_script.gs)

### 1. 設定常數

```javascript
// 在 Configuration 區段新增
const UPLOAD_FOLDER_ID = 'YOUR_DRIVE_FOLDER_ID'; // 替換為實際 ID
```

### 2. 新增 API 函數

```javascript
// ==================== File Upload ====================

/**
 * 上傳檔案到 Google Drive
 * @param {Object} fileData - { name, mimeType, base64Content, taskId }
 */
function uploadFile(fileData) {
  const folder = DriveApp.getFolderById(UPLOAD_FOLDER_ID);
  const blob = Utilities.newBlob(
    Utilities.base64Decode(fileData.base64Content),
    fileData.mimeType,
    fileData.name
  );
  
  const file = folder.createFile(blob);
  file.setDescription(`Task: ${fileData.taskId}`);
  
  return {
    success: true,
    fileId: file.getId(),
    fileName: file.getName(),
    fileUrl: file.getUrl(),
    mimeType: file.getMimeType()
  };
}

/**
 * 取得任務的附件清單
 * @param {string} taskId
 */
function getTaskAttachments(taskId) {
  const folder = DriveApp.getFolderById(UPLOAD_FOLDER_ID);
  const files = folder.getFiles();
  const attachments = [];
  
  while (files.hasNext()) {
    const file = files.next();
    if (file.getDescription().includes(`Task: ${taskId}`)) {
      attachments.push({
        id: file.getId(),
        name: file.getName(),
        url: file.getUrl(),
        mimeType: file.getMimeType(),
        size: file.getSize()
      });
    }
  }
  
  return { success: true, data: attachments };
}

/**
 * 刪除附件
 * @param {Object} data - { fileId }
 */
function deleteAttachment(data) {
  const file = DriveApp.getFileById(data.fileId);
  file.setTrashed(true);
  return { success: true };
}
```

### 3. 註冊到 doPost

```javascript
// 在 doPost 函數的 action 判斷中新增
if (action === 'uploadFile') return createJsonResponse(uploadFile(payload));
if (action === 'getTaskAttachments') return createJsonResponse(getTaskAttachments(payload.taskId));
if (action === 'deleteAttachment') return createJsonResponse(deleteAttachment(payload));
```

---

## 前端實作 (FileUploader.js)

可參考原版 `project_task_list_HTML/src/js/components/FileUploader.js`，主要功能：

1. **檔案選擇** - 拖放或點擊選擇
2. **預覽** - 顯示檔案名稱和大小
3. **上傳進度** - 顯示上傳狀態
4. **附件列表** - 顯示已上傳檔案，可下載/刪除

### 關鍵程式碼片段

```javascript
// 讀取檔案為 Base64
const readFileAsBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// 上傳檔案
const handleUpload = async (file, taskId) => {
  const base64 = await readFileAsBase64(file);
  const result = await window.callApi('uploadFile', {
    name: file.name,
    mimeType: file.type,
    base64Content: base64,
    taskId: taskId
  });
  return result;
};
```

---

## 整合到 TaskModal

在 `TaskModal.js` 中引入 FileUploader：

```jsx
// 在 Step 4 (驗收設定) 中加入
<FileUploader
  taskId={editingTask?.id}
  apiUrl={apiUrl}
  onUploadComplete={(file) => console.log('Uploaded:', file)}
/>
```

---

## 部署注意事項

1. 首次部署時，會要求授權 Google Drive 存取權限
2. 建議將上傳資料夾設為「限制存取」，避免公開
3. 大檔案上傳可能超時，建議限制檔案大小 (< 10MB)
