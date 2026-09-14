const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

code = code.replace(/function ensureRecordFolders\(\) \{[\s\S]*?\}\n\}/, `function ensureRecordFolders() {
    const getLocal = (offsetDays = 0) => {
        const d = new Date(Date.now() + offsetDays * 86400000);
        const pad = n => n.toString().padStart(2, '0');
        return \`\${d.getFullYear()}-\${pad(d.getMonth()+1)}-\${pad(d.getDate())}\`;
    };
    const yesterday = getLocal(-1);
    const today = getLocal(0);
    const tomorrow = getLocal(1);
    
    getCameras().forEach(cam => {
        if (cam.recordMode === 'continuous') {
            const base = resolveStoragePath(cam.storagePath || path.join(getActualBaseStoragePath(), 'Arch3r_NVR', cam.id));
            [yesterday, today, tomorrow].forEach(date => {
                const d = path.join(base, date);
                if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
            });
        }
    });
}`);

fs.writeFileSync('server.js', code);
console.log('Patched');
