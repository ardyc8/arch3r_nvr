const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const oldLogic = `    // Auto-detect and prioritize external drive if no path is configured!
    if (!skipAutoDetect) {
        try {
            const external = detectStorageDevices(true).filter(d => d.category === 'External' && d.totalGB > 0);
            if (external.length > 0) {
                // Sort by free space descending
                external.sort((a, b) => b.freeGB - a.freeGB);
                return external[0].mountPath;
            }
        } catch(e) {}
    }`;

const newLogic = `    // Disabled deep synchronous scanning during path resolution to prevent 502 Bad Gateway
    // If no path is configured, default to local data/recordings directory.
    // The user can set the path explicitly in the settings.
    /*
    if (!skipAutoDetect) {
        try {
            const external = detectStorageDevices(true).filter(d => d.category === 'External' && d.totalGB > 0);
            if (external.length > 0) {
                external.sort((a, b) => b.freeGB - a.freeGB);
                return external[0].mountPath;
            }
        } catch(e) {}
    }
    */`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('server.js', code);
console.log("Fixed getActualBaseStoragePath");
