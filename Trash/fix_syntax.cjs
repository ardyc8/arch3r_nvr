const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

code = code.replace(/sysLog\('INFO', \`\[Superadmin\] Akun\`, 'SECURITY'\) (Administrator baru dibuat: \$\{newAdmin\.username\}\`\);)/g, "sysLog('INFO', `[Superadmin] Akun $1, 'SECURITY');");
code = code.replace(/sysLog\('INFO', \`\[Superadmin\] Akun\`, 'SECURITY'\) (Administrator dihapus: \$\{removed\.username\}\`\);)/g, "sysLog('INFO', `[Superadmin] Akun $1, 'SECURITY');");
code = code.replace(/sysLog\('INFO', \`\[Administrator\] Akun\`, 'SECURITY'\) (User \(Klien\) baru dibuat: \$\{newUser\.username\}\`\);)/g, "sysLog('INFO', `[Administrator] Akun $1, 'SECURITY');");
code = code.replace(/sysLog\('INFO', \`\[Administrator\] Akun\`, 'SECURITY'\) (User \(Klien\) dihapus: \$\{removed\.username\}\`\);)/g, "sysLog('INFO', `[Administrator] Akun $1, 'SECURITY');");

code = code.replace(/sysLog\('INFO', 'Running retention', 'STORAGE'\) (check\.\.\.'\);)/g, "sysLog('INFO', 'Running retention check...', 'STORAGE');");

code = code.replace(/sysLog\('INFO', \`\[Retention\]\`, 'STORAGE'\) (Deleted by age \(\$\{cam\.id\}\): \$\{file\.path\}\`\);)/g, "sysLog('INFO', `[Retention] $1, 'STORAGE');");
code = code.replace(/sysLog\('INFO', \`\[Retention\]\`, 'STORAGE'\) (Deleted by quota \(\$\{cam\.id\}\): \$\{file\.path\}\`\);)/g, "sysLog('INFO', `[Retention] $1, 'STORAGE');");

code = code.replace(/sysLog\('WARN', \`Global storage capacity\`, 'STORAGE'\) (.*? Executing emergency cleanup\.\`\);)/g, "sysLog('WARN', `Global storage capacity $1, 'STORAGE');");

code = code.replace(/sysLog\('INFO', \`\[Emergency Cleanup\]\`, 'STORAGE'\) (Deleted \$\{rec\.file_path\}\`\);)/g, "sysLog('INFO', `[Emergency Cleanup] $1, 'STORAGE');");

code = code.replace(/sysLog\('ERROR', \`Disk check failed\`, 'STORAGE'\)(: \$\{e\.message\}\`\); \})/g, "sysLog('ERROR', `Disk check failed $1, 'STORAGE'); }");

code = code.replace(/sysLog\('INFO', \`\[PTZ\] Kamera\`, 'CAMERA'\) (\$\{cam\.name\} \(\$\{host\}\) bergerak ke \$\{direction\}\`\);)/g, "sysLog('INFO', `[PTZ] Kamera $1, 'CAMERA');");
code = code.replace(/sysLog\('ERROR', \`\[PTZ\] Gagal\`, 'CAMERA'\) (ONVIF untuk \$\{cam \? cam\.name : req\.params\.id\}: \$\{e\.message\}\`\);)/g, "sysLog('ERROR', `[PTZ] Gagal $1, 'CAMERA');");

code = code.replace(/sysLog\('INFO', \`Lokasi Penyimpanan\`, 'STORAGE'\) (Rekaman Diperbarui: \$\{trimmedPath\} \(Tersimpan di data\/nvr_db\.json\)\`\);)/g, "sysLog('INFO', `Lokasi Penyimpanan $1, 'STORAGE');");

code = code.replace(/sysLog\('INFO', \`Pengaturan Sistem Diperbarui \(Storage:\`, 'STORAGE'\) (\$\{newSettings\.globalStoragePath \|\| newSettings\.globalStorageMode\}, Recording Quality: \$\{newSettings\.recordingQuality \|\| 'main'\}\}\`\);)/g, "sysLog('INFO', `Pengaturan Sistem Diperbarui (Storage: $1, 'STORAGE');");
code = code.replace(/sysLog\('INFO', \`Pengaturan Sistem Diperbarui \(Storage:\`, 'STORAGE'\) (\$\{newSettings\.globalStoragePath \|\| newSettings\.globalStorageMode\}, Recording Quality: \$\{newSettings\.recordingQuality \|\| 'main'\}\)\`\);)/g, "sysLog('INFO', `Pengaturan Sistem Diperbarui (Storage: $1, 'STORAGE');");

// Let's remove the extra comments I added with `//` in previous patch
code = code.replace(/, 'CAMERA'\); \/\/.*$/gm, ", 'CAMERA');");

fs.writeFileSync('server.js', code);
