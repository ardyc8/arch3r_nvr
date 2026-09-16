const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const target = `    const isAlreadyMigrated = fs.existsSync(fAccounts) || fs.existsSync(fCameras);`;
const autoFixLogic = `
    // --- AUTO FIX OLD 'Z' TIMESTAMPS (Bugfix cleanup) ---
    const fixZTime = (isoStr) => {
        if (typeof isoStr === 'string' && isoStr.endsWith('Z')) {
            return getLocalTimeString(new Date(isoStr));
        }
        return isoStr;
    };
    [fAccounts, fLogs, nvrDbFile].forEach(f => {
        if (fs.existsSync(f)) {
            try {
                let d = JSON.parse(fs.readFileSync(f, 'utf8'));
                let mod = false;
                if (d.administrators) d.administrators.forEach(a => { if(a.createdAt?.endsWith('Z')) { a.createdAt = fixZTime(a.createdAt); mod = true; }});
                if (d.users) d.users.forEach(u => { if(u.createdAt?.endsWith('Z')) { u.createdAt = fixZTime(u.createdAt); mod = true; }});
                if (d.system_logs) d.system_logs.forEach(l => { if(l.timestamp?.endsWith('Z')) { l.timestamp = fixZTime(l.timestamp); mod = true; }});
                if (mod) fs.writeFileSync(f, JSON.stringify(d, null, 2));
            } catch(e){}
        }
    });
`;

if (code.includes(target) && !code.includes('AUTO FIX OLD')) {
    code = code.replace(target, autoFixLogic + '\n' + target);
    fs.writeFileSync('server.js', code);
    console.log("Auto-fix logic injected.");
}
