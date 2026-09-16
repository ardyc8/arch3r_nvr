const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const target = `    // Migration Logic: If monolithic DB exists, migrate it
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
    }`;

const replacement = `    const isAlreadyMigrated = fs.existsSync(fAccounts) || fs.existsSync(fCameras);
    
    // Hapus file bawaan Git jika Split-DB sudah aktif
    if (fs.existsSync(nvrDbFile) && isAlreadyMigrated) {
        try { fs.unlinkSync(nvrDbFile); } catch(e){}
    }

    // Migration Logic: Only if monolithic DB exists AND we haven't migrated yet
    if (fs.existsSync(nvrDbFile) && !isAlreadyMigrated) {
        let oldData = tryParse(nvrDbFile) || tryParse(path.join(dataDir, 'nvr_db_safe_backup.json')) || getDefaultDb();
        cachedDb = oldData;
        scheduleDbSave(); // Saves into split format
        try {
            fs.renameSync(nvrDbFile, nvrDbFile + '.migrated.bak');
            if (fs.existsSync(path.join(dataDir, 'nvr.db.json'))) fs.renameSync(path.join(dataDir, 'nvr.db.json'), path.join(dataDir, 'nvr.db.json.migrated.bak'));
            if (fs.existsSync(path.join(dataDir, 'nvr_db_safe_backup.json'))) fs.renameSync(path.join(dataDir, 'nvr_db_safe_backup.json'), path.join(dataDir, 'nvr_db_safe_backup.json.migrated.bak'));
        } catch(e){}
        return cachedDb;
    }`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('server.js', code);
    console.log("Migration loop patched successfully.");
} else {
    console.log("Failed to find target block!");
}
