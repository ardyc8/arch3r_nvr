const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// 1. Add crypto and os
if (!code.includes("const os = require('os');")) {
    code = code.replace(/const path = require\('path'\);/, "const path = require('path');\nconst crypto = require('crypto');\nconst os = require('os');");
}

// 2. Add Machine ID & Crypto License Logic
const licenseLogic = `
function getMachineId() {
    const interfaces = os.networkInterfaces();
    for (let name of Object.keys(interfaces)) {
        for (let iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal && iface.mac !== '00:00:00:00:00:00') {
                return crypto.createHash('md5').update(iface.mac).digest('hex').substring(0, 12).toUpperCase();
            }
        }
    }
    return 'UNKNOWN-MACHINE';
}

const SECRET_KEY = "ARCH3R_NVR_SUP3R_S3CR3T_2026"; 

function validateLicense(key, email, machineId) {
    if (!key) return { valid: false, reason: "Lisensi kosong" };
    try {
        const parts = key.split('.');
        if (parts.length !== 2) return { valid: false, reason: "Format lisensi salah" };
        
        const payloadStr = Buffer.from(parts[0], 'base64').toString('utf8');
        const signature = parts[1];
        
        const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(parts[0]).digest('base64');
        if (signature !== expectedSignature) return { valid: false, reason: "Lisensi palsu atau telah dimodifikasi (Segel Rusak)" };
        
        const payload = JSON.parse(payloadStr);
        if (payload.email !== email) return { valid: false, reason: "Email tidak cocok dengan lisensi ini" };
        if (payload.machineId !== machineId) return { valid: false, reason: "Lisensi ini diperuntukkan bagi mesin STB lain (Machine ID tidak cocok)" };
        if (Date.now() > payload.exp) return { valid: false, reason: "Masa aktif lisensi telah habis/kedaluwarsa" };
        
        return { valid: true, reason: "Lisensi Valid & Aktif" };
    } catch (e) {
        return { valid: false, reason: "Kunci Lisensi Invalid" };
    }
}
`;
code = code.replace(/\/\/ --- LICENSE VALIDATION ---[\s\S]*?return \{ valid: false, reason: "Kunci Lisensi tidak valid atau telah kadaluarsa" \};\n\}/, licenseLogic);

// 3. Update Database Default
code = code.replace(/super_settings:\s*\{[\s\S]*?license:\s*"ARCHER-PRO-COMMUNITY-2026",/, `super_settings: {\n            license: "",\n            email: "",\n            install_date: Date.now(),`);

// 4. Update Login API Check
const newLoginLogic = `
    const currentSettings = getSettings();
    const machineId = getMachineId();
    const licenseCheck = validateLicense(currentSettings.license, currentSettings.email, machineId);
    
    if (!licenseCheck.valid) {
        // Cek apakah Trial masih aktif
        const installDate = currentSettings.install_date || Date.now();
        const trialDaysLeft = 30 - Math.floor((Date.now() - installDate) / (1000 * 60 * 60 * 24));
        
        if (trialDaysLeft <= 0) {
            return res.status(403).json({ error: \`Sistem Terkunci: Masa Trial Habis & \${licenseCheck.reason}. Silakan hubungi Developer atau login Superadmin.\` });
        }
    }
`;
code = code.replace(/const currentSettings = getSettings\(\);[\s\S]*?if \(!licenseCheck\.valid\) \{[\s\S]*?return res\.status\(403\).*?;[\s\S]*?\}[\s\S]*?\}[\s\S]*?if \(isSuperadmin\) \{/, newLoginLogic + "\n    if (isSuperadmin) {");

// 5. Inject Superadmin Info API
const infoApi = `
app.get('/api/superadmin/license-info', verifyToken, requireSuperadmin, (req, res) => {
    const currentSettings = getSettings();
    const machineId = getMachineId();
    const installDate = currentSettings.install_date || Date.now();
    const trialDaysLeft = 30 - Math.floor((Date.now() - installDate) / (1000 * 60 * 60 * 24));
    const licenseCheck = validateLicense(currentSettings.license, currentSettings.email, machineId);
    
    res.json({
        machineId,
        installDate,
        trialDaysLeft,
        isTrialActive: trialDaysLeft > 0,
        licenseValid: licenseCheck.valid,
        licenseReason: licenseCheck.reason,
        settings: currentSettings
    });
});
`;
code = code.replace(/app\.get\('\/api\/superadmin\/settings',/, infoApi + "\napp.get('/api/superadmin/settings',");

fs.writeFileSync('server.js', code);
console.log('Server Logic Updated');
