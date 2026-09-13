const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

// SECURITY
code = code.replace(/sysLog\('INFO', \`\[Superadmin\] Pengaturan/g, "sysLog('INFO', `[Superadmin] Pengaturan`, 'SECURITY')");
code = code.replace(/sysLog\('WARNING', 'SuperAdmin triggered a Factory Reset\.'\);/g, "sysLog('WARNING', 'SuperAdmin triggered a Factory Reset.', 'SECURITY');");
code = code.replace(/sysLog\('INFO', \`\[Superadmin\] Akun/g, "sysLog('INFO', `[Superadmin] Akun`, 'SECURITY')");
code = code.replace(/sysLog\('INFO', \`\[Administrator\] Akun/g, "sysLog('INFO', `[Administrator] Akun`, 'SECURITY')");

// CAMERA
code = code.replace(/sysLog\('INFO', \`Kamera/g, "sysLog('INFO', `Kamera`, 'CAMERA')");
code = code.replace(/sysLog\('ERROR', \`Sync failed for/g, "sysLog('ERROR', `Sync failed for`, 'CAMERA')");
code = code.replace(/sysLog\('INFO', \`\[\${cam\.id}\] Memulai perekaman/g, "sysLog('INFO', `[${cam.id}] Memulai perekaman`, 'CAMERA')");
code = code.replace(/sysLog\('WARN', \`\[\${cam\.id}\] Perekaman/g, "sysLog('WARN', `[${cam.id}] Perekaman`, 'CAMERA')");
code = code.replace(/sysLog\('WARN', \`\[\${cam\.id}\] URL RTSP/g, "sysLog('WARN', `[${cam.id}] URL RTSP`, 'CAMERA')");
code = code.replace(/sysLog\('INFO', \`\[PTZ\] Kamera/g, "sysLog('INFO', `[PTZ] Kamera`, 'CAMERA')");
code = code.replace(/sysLog\('ERROR', \`\[PTZ\] Gagal/g, "sysLog('ERROR', `[PTZ] Gagal`, 'CAMERA')");

// STORAGE
code = code.replace(/sysLog\('INFO', 'Running retention/g, "sysLog('INFO', 'Running retention', 'STORAGE')");
code = code.replace(/sysLog\('INFO', \`\[Retention\]/g, "sysLog('INFO', `[Retention]`, 'STORAGE')");
code = code.replace(/sysLog\('WARN', \`Global storage capacity/g, "sysLog('WARN', `Global storage capacity`, 'STORAGE')");
code = code.replace(/sysLog\('INFO', \`\[Emergency Cleanup\]/g, "sysLog('INFO', `[Emergency Cleanup]`, 'STORAGE')");
code = code.replace(/sysLog\('ERROR', \`Disk check failed/g, "sysLog('ERROR', `Disk check failed`, 'STORAGE')");
code = code.replace(/sysLog\('INFO', \`Lokasi Penyimpanan/g, "sysLog('INFO', `Lokasi Penyimpanan`, 'STORAGE')");
code = code.replace(/sysLog\('INFO', \`Pengaturan Sistem Diperbarui \(Storage:/g, "sysLog('INFO', `Pengaturan Sistem Diperbarui (Storage:`, 'STORAGE')");

fs.writeFileSync('server.js', code);
console.log('sysLog calls patched!');
