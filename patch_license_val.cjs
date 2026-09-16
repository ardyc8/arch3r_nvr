const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const targetCheck = `if (!licenseCheck.valid) {`;
const replaceCheck = `if (!licenseCheck.valid) {
        // [ANTI-PIRACY] Verify HW Binding if license exists
        if (currentSettings.license && !verifyHardwareBinding(machineId, currentSettings.license)) {
            sysLog('ERROR', 'TAMPERING DETECTED: Hardware UUID Mismatch! STB cloned?', 'SECURITY');
            return res.status(403).json({ error: 'Sistem Terkunci: Deteksi Pembajakan (Kloning STB). Lisensi ini terikat pada MAC Address STB lain.' });
        }
`;

if (code.includes(targetCheck)) {
    code = code.replace(targetCheck, replaceCheck);
    fs.writeFileSync('server.js', code);
    console.log("Hardware Verification injected into Login.");
}
