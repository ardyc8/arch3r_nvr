const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const target = `app.post('/api/superadmin/settings', verifyToken, requireSuperadmin, (req, res) => {
    const dbData = getNvrDb();
    dbData.super_settings = { ...dbData.super_settings, ...req.body };
    saveNvrDb(dbData);
    sysLog('INFO', '[Superadmin] Pengaturan Lisensi & P2P Relay diperbarui.');

    const machineId = getMachineId();
    const currentLicense = dbData.super_settings.license || '';
    const currentEmail = dbData.super_settings.email || '';
    const licenseCheck = validateLicense(currentLicense, currentEmail, machineId);

    res.json({ 
        success: true, 
        settings: dbData.super_settings,
        licenseValid: licenseCheck.valid,
        licenseReason: licenseCheck.reason,
        licenseExpiresAt: licenseCheck.expiresAt || null
    });
});`;

const replacement = `app.post('/api/superadmin/settings', verifyToken, requireSuperadmin, (req, res) => {
    const dbData = getNvrDb();
    const machineId = getMachineId();
    
    // STRICT VALIDATION FOR LICENSE INPUT
    if (req.body.license !== undefined && req.body.license.trim() !== '') {
        const inputEmail = req.body.email || '';
        const check = validateLicense(req.body.license, inputEmail, machineId);
        
        // JIKA LISENSI TIDAK VALID, TOLAK TOTAL PENYIMPANAN
        if (!check.valid) {
            return res.status(400).json({ 
                success: false, 
                error: "Lisensi Ditolak: " + check.reason 
            });
        }
    }

    dbData.super_settings = { ...dbData.super_settings, ...req.body };
    saveNvrDb(dbData);
    sysLog('INFO', '[Superadmin] Pengaturan Lisensi / P2P Relay diperbarui.');

    const currentLicense = dbData.super_settings.license || '';
    const currentEmail = dbData.super_settings.email || '';
    const licenseCheck = validateLicense(currentLicense, currentEmail, machineId);

    res.json({ 
        success: true, 
        settings: dbData.super_settings,
        licenseValid: licenseCheck.valid,
        licenseReason: licenseCheck.reason,
        licenseExpiresAt: licenseCheck.expiresAt || null
    });
});`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('server.js', code);
    console.log("Patched license successfully!");
} else {
    console.log("Target not found!");
}
