const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

// 1. Patch sysLog
const oldSysLog = `function sysLog(level, message) {
    const timestamp = new Date().toISOString();
    console.log(\`[\${timestamp}] [\${level}] \${message}\`);
    try {
        const dbData = getNvrDb();
        if (!dbData.system_logs) dbData.system_logs = [];
        dbData.system_logs.push({ id: Date.now(), timestamp, level, message });
        if (dbData.system_logs.length > 1000) dbData.system_logs.shift(); // Keep last 1000 logs
        saveNvrDb(dbData);
    } catch (e) {}
}`;

const newSysLog = `function sysLog(level, message, category = 'SYSTEM') {
    const timestamp = new Date().toISOString();
    console.log(\`[\${timestamp}] [\${level}] [\${category}] \${message}\`);
    try {
        const dbData = getNvrDb();
        if (!dbData.system_logs) dbData.system_logs = [];
        
        // Auto cleanup > 60 days
        const cutoff = Date.now() - (60 * 24 * 60 * 60 * 1000);
        dbData.system_logs = dbData.system_logs.filter(log => log.id > cutoff);
        
        dbData.system_logs.push({ id: Date.now(), timestamp, level, category, message });
        if (dbData.system_logs.length > 5000) dbData.system_logs.shift(); // Keep last 5000 logs
        saveNvrDb(dbData);
    } catch (e) {}
}`;

if (code.includes('function sysLog(level, message) {')) {
    code = code.replace(oldSysLog, newSysLog);
}

// 2. Patch /api/cameras to include isRecording
// Find the map function inside app.get('/api/cameras'
const oldMapCam = `        const subStat = (cameraStatuses[c.id] && cameraStatuses[c.id].sub) || { status: c.enabled ? 'online' : 'offline', error: null };
        return {
            ...c,`;
const newMapCam = `        const subStat = (cameraStatuses[c.id] && cameraStatuses[c.id].sub) || { status: c.enabled ? 'online' : 'offline', error: null };
        const isRecording = !!ffProcesses[c.id];
        return {
            ...c,
            isRecording,`;

if (code.includes('const subStat =')) {
    code = code.replace(oldMapCam, newMapCam);
}

// 3. Patch /api/cameras for admin users? They hit the same endpoint? Yes.

fs.writeFileSync('server.js', code);
console.log('Backend Logs & Status patched!');
