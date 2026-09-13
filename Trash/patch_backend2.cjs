const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

// 1. Remove the global 'let settings = {};'
code = code.replace(/let settings = \{\};\n?/g, '');

// 2. Remove 'settings = getSettings();' in boot()
code = code.replace(/settings = getSettings\(\);\n?/g, '');

// 3. Fix /api/settings POST logic entirely
// Let's find the start and end of app.post('/api/settings'
const startIdx = code.indexOf("app.post('/api/settings', verifyToken, requireAdmin");
if (startIdx !== -1) {
    const endIdx = code.indexOf("});", startIdx);
    if (endIdx !== -1) {
        const fullBlock = code.substring(startIdx, endIdx + 3);
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
    
    sysLog('INFO', \`Pengaturan Sistem Diperbarui (Storage: \${newSettings.globalStoragePath || newSettings.globalStorageMode}, Recording Quality: \${newSettings.recordingQuality || 'main'})\`);
    
    if (prevQuality !== newSettings.recordingQuality || prevStorageMode !== newSettings.globalStorageMode || prevStoragePath !== newSettings.globalStoragePath) {
        ensureRecordFolders();
        startAllStreams();
        syncRecordingsToDB();
    }
    
    res.json({ success: true, settings: newSettings });
});`;
        code = code.replace(fullBlock, newApiSettingsStr);
    }
}

// 4. Fix other usages of 'settings'
code = code.replace(/if \(!settings\.telegramBotToken/g, 'const settings = getSettings();\n    if (!settings.telegramBotToken');
code = code.replace(/if \(settings\.globalStorageMode === 'disabled'\)/g, "if (getSettings().globalStorageMode === 'disabled')");
code = code.replace(/const prefIf = settings\.netInterface/g, "const prefIf = getSettings().netInterface");
code = code.replace(/if \(settings\.globalStoragePath && settings\.globalStoragePath/g, "const settings = getSettings();\n    if (settings.globalStoragePath && settings.globalStoragePath");

// 5. Fix app.post('/api/storage-path') where settings is used globally
const stPathIdx = code.indexOf("app.post('/api/storage-path'");
if(stPathIdx !== -1) {
    code = code.replace(/settings\.globalStoragePath = trimmedPath;/g, '');
    code = code.replace(/settings\.globalStorageMode = 'custom';/g, '');
    code = code.replace(/dbData\.super_settings = settings;/g, `
        dbData.super_settings = dbData.super_settings || {};
        dbData.super_settings.globalStoragePath = trimmedPath;
        dbData.super_settings.globalStorageMode = 'custom';
    `);
}

// 6. Fix version string from 9.0.4 to 9.0.5
code = code.replace(/version: '9\.0\.4'/g, "version: '9.0.5'");

fs.writeFileSync('server.js', code);
console.log('Backend patched!');
