const fs = require('fs');
const path = require('path');
const dataDir = path.join(__dirname, 'data');

function fixTime(isoStr) {
    if (typeof isoStr !== 'string' || !isoStr.endsWith('Z')) return isoStr;
    const dateObj = new Date(isoStr);
    const tzOffset = dateObj.getTimezoneOffset() * 60000; 
    const localISOTime = (new Date(dateObj.getTime() - tzOffset)).toISOString().slice(0, -1);
    const offsetHours = Math.floor(Math.abs(dateObj.getTimezoneOffset()) / 60);
    const offsetMinutes = Math.abs(dateObj.getTimezoneOffset()) % 60;
    const sign = dateObj.getTimezoneOffset() > 0 ? '-' : '+';
    const offsetStr = sign + String(offsetHours).padStart(2, '0') + ':' + String(offsetMinutes).padStart(2, '0');
    return localISOTime + offsetStr;
}

function processFile(filename) {
    const p = path.join(dataDir, filename);
    if (!fs.existsSync(p)) return;
    try {
        let content = fs.readFileSync(p, 'utf8');
        let data = JSON.parse(content);
        let modified = false;

        if (data.administrators) {
            data.administrators.forEach(a => {
                if (a.createdAt && a.createdAt.endsWith('Z')) { a.createdAt = fixTime(a.createdAt); modified = true; }
            });
        }
        if (data.users) {
            data.users.forEach(u => {
                if (u.createdAt && u.createdAt.endsWith('Z')) { u.createdAt = fixTime(u.createdAt); modified = true; }
            });
        }
        if (data.system_logs) {
            data.system_logs.forEach(l => {
                if (l.timestamp && l.timestamp.endsWith('Z')) { l.timestamp = fixTime(l.timestamp); modified = true; }
            });
        }

        if (modified) {
            fs.writeFileSync(p, JSON.stringify(data, null, 2));
            console.log(`Fixed timestamps in ${filename}`);
        }
    } catch(e) {}
}

const files = fs.readdirSync(dataDir);
files.forEach(f => {
    if (f.endsWith('.json')) processFile(f);
});

