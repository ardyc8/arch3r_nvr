const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const targetFunc = `function getSecureInstallDate(settings) {`;

const newSec = `// =========================================================================
// ANTI-PIRACY & LICENSE ENFORCEMENT V2 (HARDWARE + OS LEVEL BINDING)
// =========================================================================
const HW_BINDING_PATH = '/etc/.arch3r_hw_bind.dat';
const HW_SECRET_SALT = 'ARMBIAN_SECURE_BOOT_ARCH3R_2026';

function verifyHardwareBinding(currentMachineId, providedLicense) {
    // Membaca file tersembunyi di level root OS (bukan JSON lokal NVR)
    try {
        if (!fs.existsSync(HW_BINDING_PATH)) {
            // First time bind
            const payload = crypto.createHash('sha256').update(currentMachineId + HW_SECRET_SALT + providedLicense).digest('hex');
            try { fs.writeFileSync(HW_BINDING_PATH, payload, { mode: 0o400 }); } catch(e){} // 0400 = Read only owner
            return true;
        }
        // Verify existing bind
        const existingPayload = fs.readFileSync(HW_BINDING_PATH, 'utf8').trim();
        const expectedPayload = crypto.createHash('sha256').update(currentMachineId + HW_SECRET_SALT + providedLicense).digest('hex');
        return existingPayload === expectedPayload;
    } catch(e) {
        return false; // Gagal read/write /etc/ (dibajak / salah permission)
    }
}

function getSecureInstallDate(settings) {`;

if (code.includes(targetFunc)) {
    code = code.replace(targetFunc, newSec);
    fs.writeFileSync('server.js', code);
    console.log("Hardware Binding logic patched.");
}
