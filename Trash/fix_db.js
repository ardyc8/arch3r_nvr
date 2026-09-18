const fs = require('fs');
const path = require('path');
const dataDir = path.join(__dirname, 'data', 'live_db');

const files = ['settings', 'accounts', 'cameras', 'recordings', 'logs', 'addons'];
let migrated = false;

files.forEach(f => {
    const oldFile = path.join(dataDir, `db_${f}.json`);
    const newFile = path.join(dataDir, `local_db_${f}.json`);
    
    // Also check the root data directory just in case
    const oldFileRoot = path.join(__dirname, 'data', `db_${f}.json`);
    
    if (!fs.existsSync(newFile) || fs.statSync(newFile).size < 100) {
        if (fs.existsSync(oldFile) && fs.statSync(oldFile).size > 50) {
            console.log(`Migrating ${oldFile} to ${newFile}`);
            fs.copyFileSync(oldFile, newFile);
            migrated = true;
        } else if (fs.existsSync(oldFileRoot) && fs.statSync(oldFileRoot).size > 50) {
            console.log(`Migrating ${oldFileRoot} to ${newFile}`);
            fs.copyFileSync(oldFileRoot, newFile);
            migrated = true;
        }
    }
});

if(migrated) console.log("Data migrated successfully");
else console.log("No migration needed");
