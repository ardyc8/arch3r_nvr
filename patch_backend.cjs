const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

// 1. Remove the global 'let settings = {};'
code = code.replace('let settings = {};\n', '');

// 2. Replace 'settings.telegramBotToken' with 'getSettings().telegramBotToken' etc.
// But wait, there are too many places. It's safer to just dynamically call getSettings().
code = code.replace(/if \(!settings\.telegramBotToken/g, 'const settings = getSettings();\n    if (!settings.telegramBotToken');

code = code.replace(/if \(settings\.globalStorageMode === 'disabled'\)/g, "if (getSettings().globalStorageMode === 'disabled')");

code = code.replace(/const prefIf = settings\.netInterface/g, "const prefIf = getSettings().netInterface");

code = code.replace(/if \(settings\.globalStoragePath && settings\.globalStoragePath/g, "const settings = getSettings();\n    if (settings.globalStoragePath && settings.globalStoragePath");

// 3. Fix /api/settings POST logic entirely
const oldApiSettingsStr = `app.post('/api/settings', verifyToken, requireAdmin, (req, res) => {
    const prevQuality = settings.recordingQuality;
    const prevStorageMode = settings.globalStorageMode;
    const prevStoragePath = settings.globalStoragePath;
    
    settings = { ...settings, ...req.body };
    
    // Jika globalStoragePath atau recording_path di-update, simpan juga ke data/nvr_db.json
    const targetStorage = req.body.recording_path || req.body.globalStoragePath;
    
    const dbData = getNvrDb();
    dbData.super_settings = settings;
    
    if (targetStorage !== undefined) {
        settings.globalStoragePath = targetStorage;
        dbData.recording_path = targetStorage; // update global recording path
    }
    
    saveNvrDb(dbData);
    
    sysLog('INFO', \`Pengaturan Sistem Diperbarui (Storage: \${settings.globalStoragePath || settings.globalStorageMode}, Recording Quality: \${settings.recordingQuality || 'main'}, MediaMTX Port: \${settings.mediamtxPort || 8889})\`);
    
    // Restart stream recording jika path atau quality berubah
    if (prevQuality !== settings.recordingQuality || prevStorageMode !== settings.globalStorageMode || prevStoragePath !== settings.globalStoragePath) {
        ensureRecordFolders();
        startAllStreams();
        syncRecordingsToDB();
    }
    
    res.json({ success: true, settings });
});`;

const newApiSettingsStr = `app.post('/api/settings', verifyToken, requireAdmin, (req, res) => {
    const dbData = getNvrDb();
    const curSettings = dbData.super_settings || {};
    
    const prevQuality = curSettings.recordingQuality;
    const prevStorageMode = curSettings.globalStorageMode;
    const prevStoragePath = curSettings.globalStoragePath;
    
    const newSettings = { ...curSettings, ...req.body };
    const targetStorage = req.body.recording_path || req.body.globalStoragePath;
    
    if (targetStorage !== undefined) {
        newSettings.globalStoragePath = targetStorage;
        dbData.recording_path = targetStorage;
    }
    
    dbData.super_settings = newSettings;
    saveNvrDb(dbData);
    
    sysLog('INFO', \`Pengaturan Sistem Diperbarui (Storage: \${newSettings.globalStoragePath || newSettings.globalStorageMode}, Recording Quality: \${newSettings.recordingQuality || 'main'}, MediaMTX Port: \${newSettings.mediamtxPort || 8889})\`);
    
    if (prevQuality !== newSettings.recordingQuality || prevStorageMode !== newSettings.globalStorageMode || prevStoragePath !== newSettings.globalStoragePath) {
        ensureRecordFolders();
        startAllStreams();
        syncRecordingsToDB();
    }
    
    res.json({ success: true, settings: newSettings });
});`;

// Wait, let's just replace the whole app.post('/api/settings' block using regex or string match.
// Or we can just use regex for replacing the POST /api/settings.
