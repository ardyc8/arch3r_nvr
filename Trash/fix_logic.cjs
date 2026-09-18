const fs = require('fs');
const path = require('path');
let code = fs.readFileSync('server.js', 'utf8');

const newMigration = `
    const isAlreadyMigrated = fs.existsSync(fAccounts) || fs.existsSync(fCameras);
    
    // Fallback Auto-Migration from db_*.json to local_db_*.json
    ['settings', 'accounts', 'cameras', 'recordings', 'logs', 'addons'].forEach(mod => {
        const newFile = path.join(dataDir, 'local_db_' + mod + '.json');
        const oldFile = path.join(dataDir, 'db_' + mod + '.json');
        if (!fs.existsSync(newFile) && fs.existsSync(oldFile) && fs.statSync(oldFile).size > 50) {
            try {
                fs.copyFileSync(oldFile, newFile);
                console.log('[SYSTEM] Auto-migrated ' + oldFile + ' to ' + newFile);
            } catch(e){}
        }
    });
`;

if (!code.includes('Fallback Auto-Migration from db_*.json')) {
    code = code.replace('const isAlreadyMigrated = fs.existsSync(fAccounts) || fs.existsSync(fCameras);', newMigration);
}

fs.writeFileSync('server.js', code);
