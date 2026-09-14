const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

code = code.replace(/path\.join\(recBase, "%Y-%m-%d", "%H-%M-%S\.mp4"\)/g, 'path.join(recBase, "%Y-%m-%d_%H-%M-%S.mp4")');

const newRunRetention = `function runRetention() {
    sysLog('INFO', 'Running retention check...', 'STORAGE');
    ensureRecordFolders();
    const cams = getCameras();
    let filesDeleted = false;
    
    for (const cam of cams) {
        if (cam.recordMode !== 'continuous') continue;
        const maxDays = cam.maxStorageDays || 7;
        const maxGB = cam.maxFolderSizeGB || 10;
        const base = resolveStoragePath(cam.storagePath || path.join(getActualBaseStoragePath(), 'Arch3r_NVR', cam.id));
        if (!fs.existsSync(base)) continue;

        const limitMs = Date.now() - (maxDays * 86400000);
        
        let allFiles = [];
        try {
            const items = fs.readdirSync(base);
            for (const item of items) {
                const itemPath = path.join(base, item);
                const stats = fs.lstatSync(itemPath);
                if (stats.isDirectory() && /^\\d{4}-\\d{2}-\\d{2}$/.test(item)) {
                    const files = fs.readdirSync(itemPath).filter(f => f.endsWith('.mp4'));
                    files.forEach(f => {
                        const filePath = path.join(itemPath, f);
                        const fileStats = fs.statSync(filePath);
                        allFiles.push({ path: filePath, size: fileStats.size, mtime: fileStats.mtimeMs });
                    });
                } else if (stats.isFile() && item.endsWith('.mp4')) {
                    allFiles.push({ path: itemPath, size: stats.size, mtime: stats.mtimeMs });
                }
            }
        } catch (e) {
            sysLog('ERROR', \`Retention read failed for \${cam.id}: \${e.message}\`, 'STORAGE');
        }

        // 1. Delete by Age
        for (const file of allFiles) {
            if (file.mtime < limitMs) {
                try {
                    fs.unlinkSync(file.path);
                    filesDeleted = true;
                } catch(e) {}
            }
        }

        // 2. Delete by Quota Size
        allFiles = allFiles.filter(f => f.mtime >= limitMs).sort((a,b) => a.mtime - b.mtime);
        let totalBytes = allFiles.reduce((sum, f) => sum + f.size, 0);
        const maxBytes = maxGB * 1024 * 1024 * 1024;

        while (totalBytes > maxBytes && allFiles.length > 0) {
            const oldest = allFiles.shift();
            try {
                fs.unlinkSync(oldest.path);
                totalBytes -= oldest.size;
                filesDeleted = true;
            } catch(e) {}
        }
    }
    if (filesDeleted) syncRecordingsToDB();
}`;

code = code.replace(/function runRetention\(\) \{[\s\S]*?if \(filesDeleted\) syncRecordingsToDB\(\);\n\}/, newRunRetention);

fs.writeFileSync('server.js', code);
console.log('Patched ffmpeg revert and runRetention');
