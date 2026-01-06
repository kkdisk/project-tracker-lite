/**
 * Project Tracker Lite - Google Apps Script API
 * Open Source Version - MIT License
 * 
 * A lightweight task management system backend.
 * For deployment instructions, see README.md
 */

// ==================== Configuration ====================
const SHEET_NAME = 'Tasks';  // ⚠️ Change to your actual sheet name
const SEQUENCE_SHEET_NAME = 'TaskSequences';
const SETTINGS_TEAMS_SHEET = '系統設定_Teams';
const SETTINGS_PROJECTS_SHEET = '系統設定_Projects';
const SETTINGS_OWNERS_SHEET = '系統設定_Owners';
const VERSION = 'v1.0.0-lite';

const HEADER_ROW = 1;
const DATA_START_ROW = 2;

// Column mapping
const COLUMNS = {
  ID: 1, Legacy_ID: 2, Team: 3, Project: 4, Purpose: 5,
  Task: 6, PIC: 7, Issue_Date: 8, Start_Date: 9,
  Due_Date: 10, Workday: 11, Status: 12, Priority: 13,
  Dependencies: 14, Verification: 15, Notes: 16,
  Is_Checkpoint: 17, Last_Updated: 18,
  // WBS fields
  Parent_ID: 19, Level: 20, Sort_Order: 21, Node_Type: 22
};

// Default department codes (customize as needed)
const DEPT_CODES = {
  'Dev': 'DEV',
  'Design': 'DES',
  'QA': 'QA',
  'PM': 'PM',
  'Ops': 'OPS'
};

// ==================== API Dispatcher (for google.script.run) ====================

/**
 * Unified API dispatcher for frontend calls via google.script.run
 * @param {string} action - API action name
 * @param {Object} payload - Request data
 * @returns {Object} JSON response
 */
function apiDispatcher(action, payload = {}) {
  try {
    switch (action) {
      // Read operations
      case 'read':
        return { success: true, data: getAllTasks(), count: getAllTasks().length };
      case 'getTeams':
        return { success: true, data: getTeams() };
      case 'getProjects':
        return { success: true, data: getProjects() };
      case 'getOwners':
        return { success: true, data: getOwners() };
      case 'getDatabaseStatus':
        return { success: true, data: getDatabaseStatus() };
      case 'getVersion':
        return { success: true, version: VERSION };
      
      // Write operations
      case 'create':
      case 'update':
      case 'upsert':
        const msg = upsertTask(payload);
        return { success: true, message: msg };
      case 'delete':
        const delMsg = deleteTask(payload.id);
        return { success: true, message: delMsg };
      case 'initializeDatabase':
        return initializeDatabase(payload);
      
      // Settings CRUD
      case 'addTeam':
        return addTeam(payload);
      case 'updateTeam':
        return updateTeam(payload);
      case 'deleteTeam':
        return deleteTeam(payload);
      case 'addProject':
        return addProject(payload);
      case 'updateProject':
        return updateProject(payload);
      case 'deleteProject':
        return deleteProject(payload);
      case 'addOwner':
        return addOwner(payload);
      case 'updateOwner':
        return updateOwner(payload);
      case 'deleteOwner':
        return deleteOwner(payload);
      
      // WBS operations
      case 'getTaskTree':
        return getTaskTree(payload);
      case 'updateTaskParent':
        return updateTaskParent(payload);
      case 'batchUpdateTasks':
        return batchUpdateTasks(payload);
      case 'parseMarkdownWBS':
        return parseMarkdownWBS(payload);
      
      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  } catch (error) {
    Logger.log(`❌ apiDispatcher error: ${action} - ${error}`);
    return { success: false, error: error.toString() };
  }
}

// ==================== Database Initialization ====================

/**
 * Initialize all required worksheets
 * Run this function once after first deployment
 * 
 * @param {Object} options - { forceReset: boolean, skipSampleData: boolean }
 */
function initializeDatabase(options = {}) {
  const startTime = new Date();
  const results = {
    success: true,
    sheets: [],
    errors: [],
    timestamp: startTime.toISOString()
  };
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log('');
  Logger.log('╔══════════════════════════════════════════╗');
  Logger.log('║       Database Initialization             ║');
  Logger.log('╚══════════════════════════════════════════╝');
  
  try {
    // 1. Main Tasks sheet
    results.sheets.push(initTasksSheet(ss, options.forceReset));
    
    // 2. Sequence management
    results.sheets.push(initSequenceSheet(ss, options.forceReset));
    
    // 3. Teams settings
    results.sheets.push(initTeamsSheet(ss, options.forceReset, options.skipSampleData));
    
    // 4. Projects settings
    results.sheets.push(initProjectsSheet(ss, options.forceReset, options.skipSampleData));
    
    // 5. Owners settings
    results.sheets.push(initOwnersSheet(ss, options.forceReset));
    
    const elapsedMs = new Date() - startTime;
    Logger.log('');
    Logger.log(`✅ Initialization complete in ${elapsedMs}ms`);
    
    for (const sheet of results.sheets) {
      const icon = sheet.status === 'created' ? '🆕' : '✅';
      Logger.log(`  ${icon} ${sheet.name}: ${sheet.status}`);
    }
    
    return results;
    
  } catch (error) {
    Logger.log(`❌ Initialization error: ${error}`);
    results.success = false;
    results.errors.push(error.toString());
    return results;
  }
}

function initTasksSheet(ss, forceReset) {
  const sheetName = SHEET_NAME;
  let sheet = ss.getSheetByName(sheetName);
  
  if (sheet && !forceReset) {
    return { name: sheetName, status: 'existed' };
  }
  
  if (sheet && forceReset) {
    ss.deleteSheet(sheet);
  }
  
  sheet = ss.insertSheet(sheetName);
  const headers = [
    'ID', 'Legacy_ID', 'Team', 'Project', 'Purpose', 'Task', 'PIC',
    'Issue_Date', 'Start_Date', 'Due_Date', 'Workday', 'Status', 'Priority',
    'Dependencies', 'Verification', 'Notes', 'Is_Checkpoint', 'Last_Updated',
    'Parent_ID', 'Level', 'Sort_Order', 'Node_Type'
  ];
  
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  
  Logger.log(`🆕 Created: ${sheetName}`);
  return { name: sheetName, status: 'created' };
}

function initSequenceSheet(ss, forceReset) {
  const sheetName = SEQUENCE_SHEET_NAME;
  let sheet = ss.getSheetByName(sheetName);
  
  if (sheet && !forceReset) {
    return { name: sheetName, status: 'existed' };
  }
  
  if (sheet && forceReset) {
    ss.deleteSheet(sheet);
  }
  
  sheet = ss.insertSheet(sheetName);
  sheet.appendRow(['Dept_Code', 'Year', 'Month', 'Last_Sequence']);
  sheet.getRange('A1:D1').setFontWeight('bold');
  
  return { name: sheetName, status: 'created' };
}

function initTeamsSheet(ss, forceReset, skipSampleData) {
  const sheetName = SETTINGS_TEAMS_SHEET;
  let sheet = ss.getSheetByName(sheetName);
  
  if (sheet && !forceReset) {
    return { name: sheetName, status: 'existed' };
  }
  
  if (sheet && forceReset) {
    ss.deleteSheet(sheet);
  }
  
  sheet = ss.insertSheet(sheetName);
  sheet.appendRow(['ID', 'Team_Name', 'Dept_Code', 'Is_Active', 'Created_Date', 'Updated_Date']);
  sheet.getRange('A1:F1').setFontWeight('bold');
  
  if (!skipSampleData) {
    const now = new Date();
    const defaultTeams = [
      [1, 'Dev', 'DEV', true, now, now],
      [2, 'Design', 'DES', true, now, now],
      [3, 'QA', 'QA', true, now, now],
      [4, 'PM', 'PM', true, now, now],
      [5, 'Ops', 'OPS', true, now, now]
    ];
    
    for (const team of defaultTeams) {
      sheet.appendRow(team);
    }
  }
  
  return { name: sheetName, status: 'created' };
}

function initProjectsSheet(ss, forceReset, skipSampleData) {
  const sheetName = SETTINGS_PROJECTS_SHEET;
  let sheet = ss.getSheetByName(sheetName);
  
  if (sheet && !forceReset) {
    return { name: sheetName, status: 'existed' };
  }
  
  if (sheet && forceReset) {
    ss.deleteSheet(sheet);
  }
  
  sheet = ss.insertSheet(sheetName);
  sheet.appendRow(['ID', 'Project_Name', 'Status', 'Description', 'Created_Date', 'Updated_Date']);
  sheet.getRange('A1:F1').setFontWeight('bold');
  
  if (!skipSampleData) {
    const now = new Date();
    sheet.appendRow([1, 'Demo Project', 'Active', 'Sample project - can be deleted', now, now]);
    sheet.appendRow([2, 'Internal', 'Active', 'Internal tasks', now, now]);
  }
  
  return { name: sheetName, status: 'created' };
}

function initOwnersSheet(ss, forceReset) {
  const sheetName = SETTINGS_OWNERS_SHEET;
  let sheet = ss.getSheetByName(sheetName);
  
  if (sheet && !forceReset) {
    return { name: sheetName, status: 'existed' };
  }
  
  if (sheet && forceReset) {
    ss.deleteSheet(sheet);
  }
  
  sheet = ss.insertSheet(sheetName);
  sheet.appendRow(['ID', 'Owner_Name', 'Email', 'Is_Active', 'Created_Date', 'Updated_Date']);
  sheet.getRange('A1:F1').setFontWeight('bold');
  
  return { name: sheetName, status: 'created' };
}

/**
 * Get database status - check which sheets exist
 */
function getDatabaseStatus() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const requiredSheets = [
    { name: SHEET_NAME, description: 'Main Tasks' },
    { name: SEQUENCE_SHEET_NAME, description: 'Sequence Manager' },
    { name: SETTINGS_TEAMS_SHEET, description: 'Teams' },
    { name: SETTINGS_PROJECTS_SHEET, description: 'Projects' },
    { name: SETTINGS_OWNERS_SHEET, description: 'Owners' }
  ];
  
  const status = {
    initialized: true,
    spreadsheetName: ss.getName(),
    sheets: []
  };
  
  for (const req of requiredSheets) {
    const sheet = ss.getSheetByName(req.name);
    const exists = sheet !== null;
    
    status.sheets.push({
      name: req.name,
      description: req.description,
      exists: exists,
      rowCount: exists ? sheet.getLastRow() : 0
    });
    
    if (!exists) {
      status.initialized = false;
    }
  }
  
  return status;
}

// ==================== API Endpoints ====================

function doGet(e) {
  // Serve HTML page if no action specified
  if (!e.parameter.action) {
    try {
      return HtmlService.createTemplateFromFile('index')
        .evaluate()
        .setTitle('Project Tracker')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (err) {
      return ContentService.createTextOutput('Error: Please create index.html in Apps Script');
    }
  }

  try {
    const action = e.parameter.action;
    
    if (action === 'read') {
      const data = getAllTasks();
      return createJsonResponse({ 
        success: true, 
        data: data, 
        count: data.length 
      });
    }
    
    if (action === 'getTeams') {
      return createJsonResponse({ success: true, data: getTeams() });
    }
    
    if (action === 'getProjects') {
      return createJsonResponse({ success: true, data: getProjects() });
    }
    
    if (action === 'getOwners') {
      return createJsonResponse({ success: true, data: getOwners() });
    }
    
    if (action === 'getDatabaseStatus') {
      return createJsonResponse({ success: true, data: getDatabaseStatus() });
    }
    
    if (action === 'getVersion') {
      return createJsonResponse({ success: true, version: VERSION });
    }
    
    return createJsonResponse({ success: false, error: 'Unknown action' });
    
  } catch (error) {
    return createJsonResponse({ success: false, error: error.toString() });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const payload = data.data;
    
    if (action === 'create' || action === 'update' || action === 'upsert') {
      const message = upsertTask(payload);
      return createJsonResponse({ success: true, message: message });
    }
    
    if (action === 'delete') {
      const message = deleteTask(payload.id || data.id);
      return createJsonResponse({ success: true, message: message });
    }
    
    if (action === 'initializeDatabase') {
      return createJsonResponse(initializeDatabase(payload || {}));
    }
    
    // Settings CRUD
    if (action === 'addTeam') return createJsonResponse(addTeam(payload));
    if (action === 'updateTeam') return createJsonResponse(updateTeam(payload));
    if (action === 'deleteTeam') return createJsonResponse(deleteTeam(payload));
    
    if (action === 'addProject') return createJsonResponse(addProject(payload));
    if (action === 'updateProject') return createJsonResponse(updateProject(payload));
    if (action === 'deleteProject') return createJsonResponse(deleteProject(payload));
    
    if (action === 'addOwner') return createJsonResponse(addOwner(payload));
    if (action === 'updateOwner') return createJsonResponse(updateOwner(payload));
    if (action === 'deleteOwner') return createJsonResponse(deleteOwner(payload));
    
    return createJsonResponse({ success: false, error: 'Unknown action' });
    
  } catch (error) {
    return createJsonResponse({ success: false, error: error.toString() });
  }
}

// ==================== Task CRUD ====================

function getAllTasks() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow < DATA_START_ROW) {
    return [];
  }
  
  const dataRange = sheet.getRange(DATA_START_ROW, 1, lastRow - HEADER_ROW, Object.keys(COLUMNS).length);
  const values = dataRange.getValues();
  
  const tasks = [];
  
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    if (!row[COLUMNS.ID - 1] || !row[COLUMNS.Task - 1]) continue;
    
    tasks.push({
      id: row[COLUMNS.ID - 1] || '',
      legacy_id: row[COLUMNS.Legacy_ID - 1] || '',
      team: row[COLUMNS.Team - 1] || '',
      project: row[COLUMNS.Project - 1] || '',
      purpose: row[COLUMNS.Purpose - 1] || '',
      task: row[COLUMNS.Task - 1] || '',
      owner: row[COLUMNS.PIC - 1] || '',
      issueDate: formatDate(row[COLUMNS.Issue_Date - 1]),
      startDate: formatDate(row[COLUMNS.Start_Date - 1]),
      date: formatDate(row[COLUMNS.Due_Date - 1]),
      duration: parseFloat(row[COLUMNS.Workday - 1]) || 0,
      status: row[COLUMNS.Status - 1] || 'Todo',
      priority: row[COLUMNS.Priority - 1] || 'Medium',
      dependency: row[COLUMNS.Dependencies - 1] || '',
      verification: row[COLUMNS.Verification - 1] || '',
      notes: row[COLUMNS.Notes - 1] || '',
      isCheckpoint: row[COLUMNS.Is_Checkpoint - 1] === true,
      parentId: row[COLUMNS.Parent_ID - 1] || '',
      level: parseInt(row[COLUMNS.Level - 1]) || 0,
      sortOrder: parseInt(row[COLUMNS.Sort_Order - 1]) || 0,
      nodeType: row[COLUMNS.Node_Type - 1] || 'independent'
    });
  }
  
  return tasks;
}

function upsertTask(taskData) {
  const sheet = getSheet();
  const taskId = taskData.id;
  
  // Check if task exists
  if (taskId) {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][COLUMNS.ID - 1]) === String(taskId)) {
        // Update existing
        updateTaskRow(sheet, i + 1, taskData);
        return `Updated: ${taskId}`;
      }
    }
  }
  
  // Create new task
  const newId = taskId || generateTaskId(taskData.team);
  taskData.id = newId;
  appendTaskRow(sheet, taskData);
  return `Created: ${newId}`;
}

function deleteTask(taskId) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][COLUMNS.ID - 1]) === String(taskId)) {
      sheet.deleteRow(i + 1);
      return `Deleted: ${taskId}`;
    }
  }
  
  throw new Error(`Task not found: ${taskId}`);
}

function appendTaskRow(sheet, task) {
  const row = new Array(Object.keys(COLUMNS).length).fill('');
  
  row[COLUMNS.ID - 1] = task.id;
  row[COLUMNS.Legacy_ID - 1] = task.legacy_id || '';
  row[COLUMNS.Team - 1] = task.team || '';
  row[COLUMNS.Project - 1] = task.project || '';
  row[COLUMNS.Purpose - 1] = task.purpose || '';
  row[COLUMNS.Task - 1] = task.task || '';
  row[COLUMNS.PIC - 1] = task.owner || '';
  row[COLUMNS.Issue_Date - 1] = parseUserDate(task.issueDate);
  row[COLUMNS.Start_Date - 1] = parseUserDate(task.startDate);
  row[COLUMNS.Due_Date - 1] = parseUserDate(task.date);
  row[COLUMNS.Workday - 1] = task.duration || 0;
  row[COLUMNS.Status - 1] = task.status || 'Todo';
  row[COLUMNS.Priority - 1] = task.priority || 'Medium';
  row[COLUMNS.Dependencies - 1] = task.dependency || '';
  row[COLUMNS.Verification - 1] = task.verification || '';
  row[COLUMNS.Notes - 1] = task.notes || '';
  row[COLUMNS.Is_Checkpoint - 1] = task.isCheckpoint || false;
  row[COLUMNS.Last_Updated - 1] = new Date();
  row[COLUMNS.Parent_ID - 1] = task.parentId || '';
  row[COLUMNS.Level - 1] = task.level || 0;
  row[COLUMNS.Sort_Order - 1] = task.sortOrder || 0;
  row[COLUMNS.Node_Type - 1] = task.nodeType || 'independent';
  
  sheet.appendRow(row);
}

function updateTaskRow(sheet, rowNumber, task) {
  sheet.getRange(rowNumber, COLUMNS.Team).setValue(task.team || '');
  sheet.getRange(rowNumber, COLUMNS.Project).setValue(task.project || '');
  sheet.getRange(rowNumber, COLUMNS.Purpose).setValue(task.purpose || '');
  sheet.getRange(rowNumber, COLUMNS.Task).setValue(task.task || '');
  sheet.getRange(rowNumber, COLUMNS.PIC).setValue(task.owner || '');
  sheet.getRange(rowNumber, COLUMNS.Issue_Date).setValue(parseUserDate(task.issueDate));
  sheet.getRange(rowNumber, COLUMNS.Start_Date).setValue(parseUserDate(task.startDate));
  sheet.getRange(rowNumber, COLUMNS.Due_Date).setValue(parseUserDate(task.date));
  sheet.getRange(rowNumber, COLUMNS.Workday).setValue(task.duration || 0);
  sheet.getRange(rowNumber, COLUMNS.Status).setValue(task.status || 'Todo');
  sheet.getRange(rowNumber, COLUMNS.Priority).setValue(task.priority || 'Medium');
  sheet.getRange(rowNumber, COLUMNS.Dependencies).setValue(task.dependency || '');
  sheet.getRange(rowNumber, COLUMNS.Verification).setValue(task.verification || '');
  sheet.getRange(rowNumber, COLUMNS.Notes).setValue(task.notes || '');
  sheet.getRange(rowNumber, COLUMNS.Is_Checkpoint).setValue(task.isCheckpoint || false);
  sheet.getRange(rowNumber, COLUMNS.Last_Updated).setValue(new Date());
  sheet.getRange(rowNumber, COLUMNS.Parent_ID).setValue(task.parentId || '');
  sheet.getRange(rowNumber, COLUMNS.Level).setValue(task.level || 0);
  sheet.getRange(rowNumber, COLUMNS.Sort_Order).setValue(task.sortOrder || 0);
  sheet.getRange(rowNumber, COLUMNS.Node_Type).setValue(task.nodeType || 'independent');
}

// ==================== Settings CRUD ====================

function getTeams() {
  const sheet = getSettingsSheet(SETTINGS_TEAMS_SHEET);
  const data = sheet.getDataRange().getValues();
  const teams = [];
  
  for (let i = 1; i < data.length; i++) {
    teams.push({
      id: data[i][0],
      teamName: data[i][1],
      deptCode: data[i][2],
      isActive: data[i][3]
    });
  }
  
  return teams;
}

function addTeam(teamData) {
  const sheet = getSettingsSheet(SETTINGS_TEAMS_SHEET);
  const newId = sheet.getLastRow();
  const now = new Date();
  
  sheet.appendRow([
    newId, teamData.teamName, teamData.deptCode, 
    teamData.isActive !== false, now, now
  ]);
  
  return { success: true, id: newId };
}

function updateTeam(teamData) {
  const sheet = getSettingsSheet(SETTINGS_TEAMS_SHEET);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (Number(data[i][0]) === Number(teamData.id)) {
      sheet.getRange(i + 1, 2).setValue(teamData.teamName);
      sheet.getRange(i + 1, 3).setValue(teamData.deptCode);
      sheet.getRange(i + 1, 4).setValue(teamData.isActive !== false);
      sheet.getRange(i + 1, 6).setValue(new Date());
      return { success: true };
    }
  }
  
  throw new Error('Team not found');
}

function deleteTeam(data) {
  const sheet = getSettingsSheet(SETTINGS_TEAMS_SHEET);
  const rows = sheet.getDataRange().getValues();
  const id = data.id;
  
  for (let i = 1; i < rows.length; i++) {
    if (Number(rows[i][0]) === Number(id)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  
  throw new Error('Team not found');
}

function getProjects() {
  const sheet = getSettingsSheet(SETTINGS_PROJECTS_SHEET);
  const data = sheet.getDataRange().getValues();
  const projects = [];
  
  for (let i = 1; i < data.length; i++) {
    projects.push({
      id: data[i][0],
      projectName: data[i][1],
      status: data[i][2],
      description: data[i][3] || ''
    });
  }
  
  return projects;
}

function addProject(projectData) {
  const sheet = getSettingsSheet(SETTINGS_PROJECTS_SHEET);
  const newId = sheet.getLastRow();
  const now = new Date();
  
  sheet.appendRow([
    newId, projectData.projectName, projectData.status || 'Active',
    projectData.description || '', now, now
  ]);
  
  return { success: true, id: newId };
}

function updateProject(projectData) {
  const sheet = getSettingsSheet(SETTINGS_PROJECTS_SHEET);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (Number(data[i][0]) === Number(projectData.id)) {
      sheet.getRange(i + 1, 2).setValue(projectData.projectName);
      sheet.getRange(i + 1, 3).setValue(projectData.status || 'Active');
      sheet.getRange(i + 1, 4).setValue(projectData.description || '');
      sheet.getRange(i + 1, 6).setValue(new Date());
      return { success: true };
    }
  }
  
  throw new Error('Project not found');
}

function deleteProject(data) {
  const sheet = getSettingsSheet(SETTINGS_PROJECTS_SHEET);
  const rows = sheet.getDataRange().getValues();
  const id = data.id;
  
  for (let i = 1; i < rows.length; i++) {
    if (Number(rows[i][0]) === Number(id)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  
  throw new Error('Project not found');
}

function getOwners() {
  const sheet = getSettingsSheet(SETTINGS_OWNERS_SHEET);
  const data = sheet.getDataRange().getValues();
  const owners = [];
  
  for (let i = 1; i < data.length; i++) {
    owners.push({
      id: data[i][0],
      ownerName: data[i][1],
      email: data[i][2] || '',
      isActive: data[i][3]
    });
  }
  
  return owners;
}

function addOwner(ownerData) {
  const sheet = getSettingsSheet(SETTINGS_OWNERS_SHEET);
  const newId = sheet.getLastRow();
  const now = new Date();
  
  sheet.appendRow([
    newId, ownerData.ownerName, ownerData.email || '',
    ownerData.isActive !== false, now, now
  ]);
  
  return { success: true, id: newId };
}

function updateOwner(ownerData) {
  const sheet = getSettingsSheet(SETTINGS_OWNERS_SHEET);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (Number(data[i][0]) === Number(ownerData.id)) {
      sheet.getRange(i + 1, 2).setValue(ownerData.ownerName);
      sheet.getRange(i + 1, 3).setValue(ownerData.email || '');
      sheet.getRange(i + 1, 4).setValue(ownerData.isActive !== false);
      sheet.getRange(i + 1, 6).setValue(new Date());
      return { success: true };
    }
  }
  
  throw new Error('Owner not found');
}

function deleteOwner(data) {
  const sheet = getSettingsSheet(SETTINGS_OWNERS_SHEET);
  const rows = sheet.getDataRange().getValues();
  const id = data.id;
  
  for (let i = 1; i < rows.length; i++) {
    if (Number(rows[i][0]) === Number(id)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  
  throw new Error('Owner not found');
}

// ==================== Task ID Generation ====================

function generateTaskId(team) {
  const deptCode = DEPT_CODES[team] || 'GEN';
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  
  const sequence = getNextSequence(deptCode, year, month);
  
  return `${deptCode}-${year}-${String(month).padStart(2, '0')}-${String(sequence).padStart(4, '0')}`;
}

function getNextSequence(deptCode, year, month) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let seqSheet = ss.getSheetByName(SEQUENCE_SHEET_NAME);
  
  if (!seqSheet) {
    seqSheet = ss.insertSheet(SEQUENCE_SHEET_NAME);
    seqSheet.appendRow(['Dept_Code', 'Year', 'Month', 'Last_Sequence']);
    seqSheet.getRange('A1:D1').setFontWeight('bold');
  }
  
  const data = seqSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === deptCode && data[i][1] === year && data[i][2] === month) {
      const newSeq = data[i][3] + 1;
      seqSheet.getRange(i + 1, 4).setValue(newSeq);
      return newSeq;
    }
  }
  
  seqSheet.appendRow([deptCode, year, month, 1]);
  return 1;
}

// ==================== Helper Functions ====================

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    throw new Error(`Sheet "${SHEET_NAME}" not found. Please run initializeDatabase() first.`);
  }
  return sheet;
}

function getSettingsSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    // Add headers based on sheet type
    if (sheetName === SETTINGS_TEAMS_SHEET) {
      sheet.appendRow(['ID', 'Team_Name', 'Dept_Code', 'Is_Active', 'Created_Date', 'Updated_Date']);
    } else if (sheetName === SETTINGS_PROJECTS_SHEET) {
      sheet.appendRow(['ID', 'Project_Name', 'Status', 'Description', 'Created_Date', 'Updated_Date']);
    } else if (sheetName === SETTINGS_OWNERS_SHEET) {
      sheet.appendRow(['ID', 'Owner_Name', 'Email', 'Is_Active', 'Created_Date', 'Updated_Date']);
    }
    sheet.getRange('A1:F1').setFontWeight('bold');
  }
  
  return sheet;
}

function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function formatDate(dateValue) {
  if (!dateValue) return '';
  if (dateValue === 'TBD') return 'TBD';
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    return '';
  }
}

function parseUserDate(dateStr) {
  if (!dateStr || dateStr === 'TBD') return dateStr;
  
  try {
    return new Date(dateStr);
  } catch (e) {
    return '';
  }
}

// ==================== WBS Functions ====================

/**
 * Get task tree structure for WBS view
 * @param {Object} payload - { project: string (optional) }
 * @returns {Object} { success: boolean, data: { tree: [], independent: [] } }
 */
function getTaskTree(payload = {}) {
  try {
    const allTasks = getAllTasks();
    const projectFilter = payload.project;
    
    // Filter by project if specified
    let tasks = projectFilter && projectFilter !== '全部專案'
      ? allTasks.filter(t => t.project === projectFilter)
      : allTasks;
    
    // Build tree structure
    const taskMap = new Map();
    tasks.forEach(t => taskMap.set(String(t.id), { ...t, children: [] }));
    
    const tree = [];
    const independent = [];
    
    tasks.forEach(task => {
      const node = taskMap.get(String(task.id));
      const parentId = task.parentId || task.parent_id;
      
      if (parentId && taskMap.has(String(parentId))) {
        // Has parent - add as child
        taskMap.get(String(parentId)).children.push(node);
      } else if (parentId) {
        // Parent not found in current filter - treat as independent
        independent.push(node);
      } else {
        // No parent - root level
        tree.push(node);
      }
    });
    
    // Sort by sortOrder if available
    const sortNodes = (nodes) => {
      nodes.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      nodes.forEach(n => {
        if (n.children && n.children.length > 0) {
          sortNodes(n.children);
        }
      });
    };
    
    sortNodes(tree);
    sortNodes(independent);
    
    return { 
      success: true, 
      data: { tree, independent },
      count: tasks.length
    };
  } catch (error) {
    Logger.log(`❌ getTaskTree error: ${error}`);
    return { success: false, error: error.toString() };
  }
}

/**
 * Update task parent relationship
 * @param {Object} payload - { taskId, newParentId, sortOrder }
 */
function updateTaskParent(payload) {
  try {
    const { taskId, newParentId, sortOrder } = payload;
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      return { success: false, error: 'Tasks sheet not found' };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    const parentIdCol = headers.indexOf('Parent_ID');
    const sortOrderCol = headers.indexOf('Sort_Order');
    const idCol = 0;
    
    // Find the task row
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(taskId)) {
        if (parentIdCol >= 0) {
          sheet.getRange(i + 1, parentIdCol + 1).setValue(newParentId || '');
        }
        if (sortOrderCol >= 0 && sortOrder !== undefined) {
          sheet.getRange(i + 1, sortOrderCol + 1).setValue(sortOrder);
        }
        
        return { success: true, message: 'Parent updated successfully' };
      }
    }
    
    return { success: false, error: `Task ${taskId} not found` };
  } catch (error) {
    Logger.log(`❌ updateTaskParent error: ${error}`);
    return { success: false, error: error.toString() };
  }
}

/**
 * Batch update multiple tasks
 * @param {Object} payload - { tasks: [{ id, ...fields }] }
 */
function batchUpdateTasks(payload) {
  try {
    const { tasks } = payload;
    if (!tasks || !Array.isArray(tasks)) {
      return { success: false, error: 'Invalid tasks array' };
    }
    
    let updated = 0;
    let errors = [];
    
    tasks.forEach(task => {
      try {
        upsertTask(task);
        updated++;
      } catch (e) {
        errors.push(`Task ${task.id}: ${e.message}`);
      }
    });
    
    return { 
      success: errors.length === 0, 
      message: `Updated ${updated} tasks`,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    Logger.log(`❌ batchUpdateTasks error: ${error}`);
    return { success: false, error: error.toString() };
  }
}

/**
 * Parse WBS Markdown format to task structure
 * @param {Object} payload - { markdownText: string }
 * @returns {Object} { success: boolean, data: { tree: [], flatList: [] } }
 */
function parseMarkdownWBS(payload) {
  try {
    const { markdownText } = payload;
    if (!markdownText) {
      return { success: false, error: 'No markdown text provided' };
    }
    
    const lines = markdownText.split('\n');
    const tree = [];
    const flatList = [];
    
    let currentEpic = null;
    let currentStory = null;
    let taskId = 1;
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      // Epic: # Epic: 名稱
      if (trimmed.startsWith('# Epic:') || trimmed.startsWith('#Epic:')) {
        const name = trimmed.replace(/^#\s*Epic:\s*/i, '').trim();
        currentEpic = {
          id: `E${taskId++}`,
          task: name,
          nodeType: 'Epic',
          level: 0,
          children: []
        };
        tree.push(currentEpic);
        flatList.push({ ...currentEpic, children: undefined });
        currentStory = null;
      }
      // Story: ## Story: 名稱
      else if (trimmed.startsWith('## Story:') || trimmed.startsWith('##Story:')) {
        const name = trimmed.replace(/^##\s*Story:\s*/i, '').trim();
        currentStory = {
          id: `S${taskId++}`,
          task: name,
          nodeType: 'Story',
          level: 1,
          parentId: currentEpic ? currentEpic.id : null,
          children: []
        };
        if (currentEpic) {
          currentEpic.children.push(currentStory);
        } else {
          tree.push(currentStory);
        }
        flatList.push({ ...currentStory, children: undefined });
      }
      // Task: - [ ] 任務名稱 (負責人) [StartDate ~ EndDate] #T:Team #P:Priority
      else if (trimmed.startsWith('- [ ]') || trimmed.startsWith('- [x]')) {
        const isDone = trimmed.startsWith('- [x]');
        let taskText = trimmed.replace(/^-\s*\[[x ]\]\s*/i, '');
        
        // Parse owner: (負責人)
        let owner = '';
        const ownerMatch = taskText.match(/\(([^)]+)\)/);
        if (ownerMatch) {
          owner = ownerMatch[1];
          taskText = taskText.replace(ownerMatch[0], '').trim();
        }
        
        // Parse dates: [StartDate ~ EndDate]
        let startDate = '';
        let endDate = '';
        const dateMatch = taskText.match(/\[([^\]]+)\]/);
        if (dateMatch) {
          const dateStr = dateMatch[1];
          const dateParts = dateStr.split('~').map(s => s.trim());
          startDate = dateParts[0] || '';
          endDate = dateParts[1] || dateParts[0] || '';
          taskText = taskText.replace(dateMatch[0], '').trim();
        }
        
        // Parse team: #T:Team
        let team = '';
        const teamMatch = taskText.match(/#T:(\S+)/);
        if (teamMatch) {
          team = teamMatch[1];
          taskText = taskText.replace(teamMatch[0], '').trim();
        }
        
        // Parse priority: #P:Priority
        let priority = 'Medium';
        const priorityMatch = taskText.match(/#P:(\S+)/);
        if (priorityMatch) {
          const p = priorityMatch[1].toLowerCase();
          priority = p === '高' || p === 'high' ? 'High' : 
                    p === '低' || p === 'low' ? 'Low' : 'Medium';
          taskText = taskText.replace(priorityMatch[0], '').trim();
        }
        
        // Parse dependency: #depends:TaskName
        let dependency = '';
        const depMatch = taskText.match(/#depends?:(\S+)/i);
        if (depMatch) {
          dependency = depMatch[1];
          taskText = taskText.replace(depMatch[0], '').trim();
        }
        
        const taskNode = {
          id: `T${taskId++}`,
          task: taskText.trim(),
          nodeType: 'Task',
          level: currentStory ? 2 : (currentEpic ? 1 : 0),
          owner: owner,
          startDate: startDate,
          date: endDate,
          team: team,
          priority: priority,
          dependency: dependency,
          status: isDone ? 'Done' : 'Todo',
          parentId: currentStory ? currentStory.id : (currentEpic ? currentEpic.id : null),
          children: []
        };
        
        if (currentStory) {
          currentStory.children.push(taskNode);
        } else if (currentEpic) {
          currentEpic.children.push(taskNode);
        } else {
          tree.push(taskNode);
        }
        flatList.push({ ...taskNode, children: undefined });
      }
    });
    
    return {
      success: true,
      tasks: flatList,
      count: flatList.length
    };
  } catch (error) {
    Logger.log(`❌ parseMarkdownWBS error: ${error}`);
    return { success: false, error: error.toString() };
  }
}
