const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// Replace the hardcoded tryParse with migration logic
const newMigration = `
    const isAlreadyMigrated = fs.existsSync(fAccounts) || fs.existsSync(fCameras);
    
    // Fallback Auto-Migration from db_*.json to local_db_*.json
    ['settings', 'accounts', 'cameras', 'recordings', 'logs', 'addons'].forEach(mod => {
        const newFile = path.join(dataDir, 'local_db_' + mod + '.json');
        const oldFile = path.join(dataDir, 'db_' + mod + '.json');
        if (!fs.existsSync(newFile) && fs.existsSync(oldFile) && fs.statSync(oldFile).size > 50) {
            try {
                fs.copyFileSync(oldFile, newFile);
                sysLog('INFO', 'Auto-migrated ' + oldFile + ' to ' + newFile, 'SYSTEM');
            } catch(e){}
        }
    });
`;

if (!code.includes('Fallback Auto-Migration from db_*.json')) {
    code = code.replace('const isAlreadyMigrated = fs.existsSync(fAccounts) || fs.existsSync(fCameras);', newMigration);
}

fs.writeFileSync('server.js', code);
