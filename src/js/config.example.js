/**
 * 配置檔案範本
 * config.example.js
 * 
 * 使用說明:
 * 1. 複製此檔案為 config.js
 * 2. 填入您的 Google Apps Script Web App URL（如使用本地開發模式）
 * 3. 調整預設資料（如需要）
 * 
 * 注意：身分驗證現已使用 Google OAuth (Session)，不再需要 API Key
 */

// ========================================
// API 配置
// ========================================
// 優先使用 GAS 注入的 URL (Hosted Mode)，否則使用預設值 (Local Dev)
const API_URL = window.GAS_API_URL || "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL";

// ========================================
// 甘特圖常數
// ========================================
const PX_PER_DAY = 40;
const ROW_HEIGHT = 40;

// ========================================
// 預設資料 (Fallback) - 當 API 讀取失敗時使用
// ========================================
const TEAMS = ['晶片', '機構', '軟體', '電控', '流道', '生醫', 'QA', '管理'];
const PROJECTS = ['CKSX', 'Jamstec', 'Genentech', '5880 Chip', 'Internal', 'TBD'];
const OWNERS = ['未指定'];
const CATEGORIES = ['Mechanism', 'Electrical', 'Software', 'QA', 'Design', 'Flow'];

// 初始資料（本地離線測試用）
const INITIAL_DATA = [];
