const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const targetHook = `app.use(express.static(publicDir));`;

const maintenanceEndpoints = `
// ==========================================
// MAINTENANCE & OTA API (v9.3.15)
// ==========================================
app.get('/api/maintenance/backup', verifyToken, (req, res) => {
    sysLog('INFO', \`[Maintenance] Backup database requested\`, 'SYSTEM');
    const db = getNvrDb();
    res.setHeader('Content-disposition', 'attachment; filename=arch3r_backup_' + Date.now() + '.json');
    res.setHeader('Content-type', 'application/json');
    res.send(JSON.stringify(db, null, 2));
});

app.post('/api/maintenance/reboot', verifyToken, (req, res) => {
    sysLog('WARN', \`[Maintenance] System reboot requested\`, 'SYSTEM');
    res.json({ success: true, message: 'Rebooting system in 3 seconds...' });
    setTimeout(() => {
        child_process.exec('sudo reboot || pm2 restart all || exit 1');
    }, 3000);
});

app.post('/api/maintenance/reset', verifyToken, (req, res) => {
    const dbData = getNvrDb();
    if (req.userRole === 'superadmin') {
        dbData.cameras = [];
        dbData.users = [];
        dbData.administrators = [];
        sysLog('WARN', \`[Maintenance] FACTORY RESET by superadmin\`, 'SECURITY');
    } else if (req.userRole === 'administrator') {
        dbData.cameras = [];
        dbData.users = [];
        sysLog('WARN', \`[Maintenance] Reset Admin Data\`, 'SECURITY');
    } else {
        return res.status(403).json({ error: 'Akses ditolak.' });
    }
    saveNvrDb(dbData);
    res.json({ success: true, message: 'Reset successful' });
});

app.get('/api/system/ota/check', verifyToken, requireSuperadmin, async (req, res) => {
    try {
        const dbData = getNvrDb();
        const otaUrl = dbData.super_settings.ota_github_url || "https://api.github.com/repos/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME/releases/latest";
        
        if (otaUrl.includes('YOUR_GITHUB_USERNAME')) {
            return res.json({
                current_version: require('./package.json').version,
                latest_version: '9.4.0',
                changelog: '- Perbaikan perlindungan database saat OTA\\n- Fitur Maintenance Terpadu',
                update_available: true
            });
        }
        
        const response = await fetch(otaUrl, { headers: { 'User-Agent': 'Arch3r-NVR' } });
        if (!response.ok) throw new Error('Gagal cek OTA');
        const release = await response.json();
        
        const currentVer = require('./package.json').version;
        const latestVer = (release.tag_name || '').replace('v', '');
        
        res.json({
            current_version: currentVer,
            latest_version: latestVer || 'Unknown',
            changelog: release.body || 'Tidak ada catatan rilis.',
            update_available: (latestVer && latestVer !== currentVer)
        });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/system/ota/apply', verifyToken, requireSuperadmin, (req, res) => {
    sysLog('WARN', \`[OTA] Firmware update started by superadmin\`, 'SYSTEM');
    res.json({ success: true, message: 'Update dimulai, sistem akan otomatis restart (PM2/Service).' });
    setTimeout(() => {
        const cmd = \`
            mkdir -p /tmp/arch3r_data_backup &&
            cp -r data/* /tmp/arch3r_data_backup/ 2>/dev/null || true &&
            git fetch --all &&
            git reset --hard origin/main &&
            git pull &&
            cp -r /tmp/arch3r_data_backup/* data/ &&
            npm install &&
            pm2 restart all
        \`;
        child_process.exec(cmd, (err, stdout, stderr) => {
            if (err) console.error("OTA Update failed:", err);
        });
    }, 2000);
});
`;

code = code.replace(targetHook, maintenanceEndpoints + '\n' + targetHook);
fs.writeFileSync('server.js', code);
console.log("OTA and Maintenance API patched.");
