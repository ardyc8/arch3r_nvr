const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const getMachineIdFunc = `
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

if (!code.includes('function getMachineId()')) {
    // If missing, inject at top just after requires
    code = code.replace(/(const .*?require.*?;\n)+/, (match) => {
        return match + '\n' + getMachineIdFunc + '\n';
    });
    fs.writeFileSync('server.js', code);
    console.log('Force injected getMachineId');
} else {
    console.log('getMachineId exists but seems to be throwing error? Let us check global scope.');
}
