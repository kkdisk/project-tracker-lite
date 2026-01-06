/**
 * Configuration Template for Project Tracker Lite
 * 
 * Instructions:
 * 1. Copy this file to config.js
 * 2. Fill in your Google Apps Script Web App URL
 * 3. Customize default values as needed
 * 
 * WARNING: Never commit config.js to version control!
 */

// ========================================
// API Configuration
// ========================================
// If deployed as GAS Web App, this is injected automatically
// For local development, set your Web App URL here
const API_URL = window.GAS_API_URL || "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL";

// ========================================
// Gantt Chart Constants
// ========================================
const PX_PER_DAY = 40;
const ROW_HEIGHT = 40;

// ========================================
// Default Data (Fallback when API fails)
// ========================================
const TEAMS = ['Dev', 'Design', 'QA', 'PM', 'Ops'];
const PROJECTS = ['Demo Project', 'Internal'];
const OWNERS = ['Unassigned'];
const CATEGORIES = ['Development', 'Design', 'Testing', 'Management'];

// Initial data (for offline testing)
const INITIAL_DATA = [];
