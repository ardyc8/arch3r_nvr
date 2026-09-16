const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const getDbMatch = code.match(/function getNvrDb\(\) \{[\s\S]*?return data;\n\}/);
const saveDbMatch = code.match(/function scheduleDbSave\(\) \{[\s\S]*?console\.error\('Error saving DB:', e\);\n    \}\n\}/);

const newGetDb = `function getNvrDb() {
    if (cachedDb) return cachedDb;
    
    // ==========================================
    // SPLIT DB ARCHITECTURE (ANTI-CORRUPTION)
    // ==========================================
    const fSettings = path.join(dataDir, 'db_settings.json');
    const fAccounts = path.join(dataDir, 'db_accounts.json');
    const fCameras = path.join(dataDir, 'db_cameras.json');
    const fRecordings = path.join(dataDir, 'db_recordings.json');
    const fLogs = path.join(dataDir, 'db_logs.json');
    
    function tryParse(fPath) {
        if (!fs.existsSync(fPath)) return null;
        try {
            return JSON.parse(fs.readFileSync(fPath, 'utf8'));
        } catch(e) { return null; }
    }
    
    // Migration Logic: If monolithic DB exists, migrate it
    if (fs.existsSync(nvrDbFile)) {
        let oldData = tryParse(nvrDbFile) || tryParse(path.join(dataDir, 'nvr_db_safe_backup.json')) || getDefaultDb();
        cachedDb = oldData;
        scheduleDbSave(); // Saves into split format
        try {
            fs.renameSync(nvrDbFile, nvrDbFile + '.migrated.bak');
            if (fs.existsSync(path.join(dataDir, 'nvr.db.json'))) fs.renameSync(path.join(dataDir, 'nvr.db.json'), path.join(dataDir, 'nvr.db.json.migrated.bak'));
            if (fs.existsSync(path.join(dataDir, 'nvr_db_safe_backup.json'))) fs.renameSync(path.join(dataDir, 'nvr_db_safe_backup.json'), path.join(dataDir, 'nvr_db_safe_backup.json.migrated.bak'));
        } catch(e){}
        return cachedDb;
    }

    let data = getDefaultDb();
    
    // Load individual modules
    const s_set = tryParse(fSettings);
    if (s_set) {
        data.super_settings = s_set.super_settings || data.super_settings;
        data.recording_path = s_set.recording_path || '';
    }
    
    const s_acc = tryParse(fAccounts);
    if (s_acc) {
        data.administrators = s_acc.administrators || [];
        data.users = s_acc.users || [];
    }
    
    const s_cam = tryParse(fCameras);
    if (s_cam) data.cameras = s_cam.cameras || [];
    
    const s_rec = tryParse(fRecordings);
    if (s_rec) data.recordings = s_rec.recordings || [];
    
    const s_log = tryParse(fLogs);
    if (s_log) data.system_logs = s_log.system_logs || [];

    cachedDb = data;
    return data;
}`;

const newSaveDb = `function scheduleDbSave() {
    try {
        if (!cachedDb) return;
        
        function atomicWrite(fPath, dataObj) {
            const tmp = fPath + '.tmp';
            fs.writeFileSync(tmp, JSON.stringify(dataObj, null, 2));
            fs.renameSync(tmp, fPath);
        }

        // ==========================================
        // SPLIT DB ARCHITECTURE (ANTI-CORRUPTION)
        // Write each module into its own file
        // ==========================================
        atomicWrite(path.join(dataDir, 'db_settings.json'), { super_settings: cachedDb.super_settings, recording_path: cachedDb.recording_path });
        atomicWrite(path.join(dataDir, 'db_accounts.json'), { administrators: cachedDb.administrators, users: cachedDb.users });
        atomicWrite(path.join(dataDir, 'db_cameras.json'), { cameras: cachedDb.cameras });
        atomicWrite(path.join(dataDir, 'db_recordings.json'), { recordings: cachedDb.recordings });
        atomicWrite(path.join(dataDir, 'db_logs.json'), { system_logs: cachedDb.system_logs });

    } catch(e) {
        console.error('Error saving Split DB:', e);
    }
}`;

code = code.replace(getDbMatch[0], newGetDb);
code = code.replace(saveDbMatch[0], newSaveDb);

fs.writeFileSync('server.js', code);
console.log("DB Split logic patched successfully!");
