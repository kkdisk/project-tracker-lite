# Project Tracker Lite

A lightweight, open-source project & task management system built with **React** + **Google Apps Script**.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- **Dashboard View** - Overview with status cards, task list, and pie charts
- **Gantt Chart** - Timeline visualization with dependency lines
- **Calendar View** - Monthly calendar view for task scheduling
- **WBS Hierarchy** - Epic → Story → Task structure with drag-and-drop
- **Excel Import/Export** - Bulk import via .xlsx/.csv files
- **Database Initialization** - One-click setup for new deployments

## 🚀 Quick Start

### Prerequisites
- Google Account
- Node.js >= 14.0.0 (for development only)

### Deployment Steps

1. **Create Google Sheets**
   - Create a new Google Spreadsheet
   - Note the Spreadsheet ID from the URL

2. **Setup Apps Script**
   - Go to `Extensions` → `Apps Script`
   - Copy `apps_script_lite.gs` contents into the editor
   - **Important**: Update `SHEET_NAME` constant if needed

3. **Initialize Database**
   - In Apps Script editor, run `initializeDatabase()` function
   - This creates all required worksheets with proper headers

4. **Deploy as Web App**
   - Click `Deploy` → `New deployment`
   - Select `Web app`
   - Set "Execute as" → `User accessing the web app`
   - Set "Who has access" → Your preference
   - Copy the deployed URL

5. **Configure Frontend**
   - Copy `config.example.js` to `config.js`
   - Update `API_URL` with your Web App URL
   - Build: `npm run build`
   - Copy `build/index.html` to Apps Script as `index.html`

## 📁 Project Structure

```
project-tracker-lite/
├── apps_script_lite.gs     # Backend API (Google Apps Script)
├── src/
│   ├── App.jsx              # Main application
│   ├── index.template.html  # HTML template
│   ├── hooks/               # React hooks (useAuth, useFilters, etc.)
│   └── js/
│       ├── config.example.js
│       ├── components/      # React components
│       └── utils/           # Helper functions
├── scripts/
│   └── build.js             # Build script
├── docs/
│   └── FEATURE_DRIVE_UPLOAD.md  # How to add file upload feature
├── build/                   # Build output
├── LICENSE
└── README.md
```

## 🔧 Configuration

### `config.js` Settings

```javascript
// API URL - Your Google Apps Script Web App URL
const API_URL = "YOUR_WEB_APP_URL";

// Default Teams (customize as needed)
const TEAMS = ['Dev', 'Design', 'QA', 'PM', 'Ops'];

// Default Projects
const PROJECTS = ['Internal', 'Demo'];
```

## 📊 Database Schema

The system automatically creates these worksheets:

| Sheet Name | Purpose |
|------------|---------|
| Tasks | Main task data |
| TaskSequences | Auto-increment ID management |
| 系統設定_Teams | Team/Department settings |
| 系統設定_Projects | Project settings |
| 系統設定_Owners | Owner/Assignee settings |
| AllowedUsers | User permissions (optional) |

## 🔐 Security Notes

> ⚠️ **Important**: Never commit `config.js` to version control!

- `config.js` contains your API URL
- Use `config.example.js` as a template
- The `.gitignore` already excludes sensitive files

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - See [LICENSE](./LICENSE) for details.

## 🙏 Acknowledgments

Based on the internal Project Tracker system. Simplified for public release.
