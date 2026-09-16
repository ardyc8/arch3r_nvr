const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// 1. Remove Hardware Binding Functions
const hwBlockRegex = /\/\/ =========================================================================\n\/\/ ANTI-PIRACY & LICENSE ENFORCEMENT V2 \(HARDWARE \+ OS LEVEL BINDING\)\n\/\/ =========================================================================[\s\S]*?function getSecureInstallDate\(settings\) \{/;

if (hwBlockRegex.test(code)) {
    code = code.replace(hwBlockRegex, 'function getSecureInstallDate(settings) {');
    console.log("Hardware binding functions removed.");
}

// 2. Remove the Tampering check in login
const tamperRegex = /\/\/ \[ANTI-PIRACY\] Verify HW Binding if license exists[\s\S]*?return res\.status\(403\)\.json\(\{ error: 'Sistem Terkunci: Deteksi Pembajakan \(Kloning STB\)\. Lisensi ini terikat pada MAC Address STB lain\.' \}\);\n\s+\}\n/;

if (tamperRegex.test(code)) {
    code = code.replace(tamperRegex, '');
    console.log("Tampering check removed from login.");
}

fs.writeFileSync('server.js', code);
