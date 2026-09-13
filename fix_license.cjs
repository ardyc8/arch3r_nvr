const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const licenseFunc = `
// --- LICENSE VALIDATION ---
function validateLicenseKey(key) {
    if (!key) return { valid: false, reason: "Lisensi kosong" };
    key = key.trim();
    if (key === "ARCHER-PRO-COMMUNITY-2026") return { valid: true, type: "Community", reason: "Lisensi Komunitas Bawaan" };
    // Format ARCH3R-[TIPE]-[KODE]
    const regex = /^ARCH3R-(PRO|ENTERPRISE|LIFETIME)-[A-Z0-9]{5,25}$/;
    if (regex.test(key)) {
        return { valid: true, type: "Premium", reason: "Lisensi Premium Valid" };
    }
    return { valid: false, reason: "Kunci Lisensi tidak valid atau telah kadaluarsa" };
}
`;

// Insert the license logic before app.post('/api/login')
code = code.replace(/app\.post\('\/api\/login', \(req, res\) => \{/, licenseFunc + "\napp.post('/api/login', (req, res) => {");

// Add check inside /api/login
const checkLogic = `
    const isSuperadmin = ((username === 'admin@archer.nvr' || username === 'superadmin') && (password === 'archer' || password === 'superadmin'));

    if (!isSuperadmin) {
        const currentSettings = getSettings();
        const licenseCheck = validateLicenseKey(currentSettings.license);
        if (!licenseCheck.valid) {
            return res.status(403).json({ error: \`Sistem Terkunci: \${licenseCheck.reason}. Silakan login sebagai Superadmin untuk memperbarui lisensi.\` });
        }
    }

    if (isSuperadmin) {
`;

code = code.replace(/if \(\(username === 'admin@archer\.nvr' \|\| username === 'superadmin'\) && \(password === 'archer' \|\| password === 'superadmin'\)\) \{/, checkLogic);

fs.writeFileSync('server.js', code);
console.log('License mechanism added to server.js');
