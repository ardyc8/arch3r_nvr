const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

code = code.replace(/function syncRecordingsToDB\(\) \{[\s\S]*?enforceAdminStorageQuotas\(\);\n\}/, `async function syncRecordingsToDB() {
    const cams = getCameras();
    const dbData = getNvrDb();
    dbData.recordings = [];
    
    for (const cam of cams) {
        if (cam.recordMode !== 'continuous') continue;
        const storageDir = resolveStoragePath(cam.storagePath || path.join(getActualBaseStoragePath(), 'Arch3r_NVR', cam.id));
        if (!fs.existsSync(storageDir)) continue;

        try {
            const scanDir = async (dir) => {
                if (!fs.existsSync(dir)) return;
                const items = await fs.promises.readdir(dir, { withFileTypes: true });
                for (const item of items) {
                    const fullPath = path.join(dir, item.name);
                    if (item.isDirectory() && /^\\d{4}-\\d{2}-\\d{2}$/.test(item.name)) {
                        await scanDir(fullPath);
                    } else if (item.isFile() && (item.name.endsWith(".mp4") || item.name.endsWith(".ts"))) {
                        try {
                            const stats = await fs.promises.stat(fullPath);
                            dbData.recordings.push({
                                id: \`\${cam.id}_\${item.name}\`,
                                camera_id: cam.id,
                                file_path: fullPath,
                                file_size: stats.size,
                                start_time: new Date(stats.mtimeMs).toISOString()
                            });
                        } catch(e) {}
                    }
                }
            };
            await scanDir(storageDir);
        } catch (e) {
            sysLog('ERROR', \`Sync failed for \${cam.id}: \${e.message}\`, 'CAMERA');
        }
    }
    saveNvrDb(dbData);
    await enforceAdminStorageQuotas();
}`);

code = code.replace(/function enforceAdminStorageQuotas\(\) \{[\s\S]*?sysLog\('ERROR', \`Quota enforcement failed: \$\{e\.message\}\`, 'STORAGE'\);\n    \}\n\}/, `async function enforceAdminStorageQuotas() {
    try {
        const dbData = getNvrDb();
        const admins = dbData.administrators || [];
        const recordings = dbData.recordings || [];
        let changed = false;

        for (const admin of admins) {
            const maxGB = admin.max_storage_gb || 100;
            const maxBytes = maxGB * 1024 * 1024 * 1024;
            
            const adminCams = (dbData.cameras || []).filter(c => c.tenant_id === admin.id || c.admin_id === admin.id);
            const adminCamIds = new Set(adminCams.map(c => c.id));
            
            const adminRecs = recordings.filter(r => adminCamIds.has(r.camera_id)).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
            let totalBytes = adminRecs.reduce((sum, r) => sum + (r.file_size || 0), 0);
            
            while (totalBytes > maxBytes && adminRecs.length > 0) {
                const oldest = adminRecs.shift();
                try {
                    if (fs.existsSync(oldest.file_path)) {
                        await fs.promises.unlink(oldest.file_path);
                    }
                } catch (err) {}
                totalBytes -= (oldest.file_size || 0);
                const idx = dbData.recordings.findIndex(r => r.id === oldest.id);
                if (idx !== -1) {
                    dbData.recordings.splice(idx, 1);
                    changed = true;
                }
            }
        }
        if (changed) saveNvrDb(dbData);
    } catch(e) {
        sysLog('ERROR', \`Quota enforcement failed: \${e.message}\`, 'STORAGE');
    }
}`);

fs.writeFileSync('server.js', code);
console.log('Patched');
