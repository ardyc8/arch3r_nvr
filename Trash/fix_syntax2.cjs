const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

code = code.replace(/sysLog\('INFO', \`\[Superadmin\] Akun Administrator baru dibuat: \$\{newAdmin\.username\}\`\);, 'SECURITY'\);/g, "sysLog('INFO', `[Superadmin] Akun Administrator baru dibuat: ${newAdmin.username}`, 'SECURITY');");
code = code.replace(/sysLog\('INFO', \`\[Superadmin\] Akun Administrator dihapus: \$\{removed\.username\}\`\);, 'SECURITY'\);/g, "sysLog('INFO', `[Superadmin] Akun Administrator dihapus: ${removed.username}`, 'SECURITY');");
code = code.replace(/sysLog\('INFO', \`\[Administrator\] Akun User \(Klien\) baru dibuat: \$\{newUser\.username\}\`\);, 'SECURITY'\);/g, "sysLog('INFO', `[Administrator] Akun User (Klien) baru dibuat: ${newUser.username}`, 'SECURITY');");
code = code.replace(/sysLog\('INFO', \`\[Administrator\] Akun User \(Klien\) dihapus: \$\{removed\.username\}\`\);, 'SECURITY'\);/g, "sysLog('INFO', `[Administrator] Akun User (Klien) dihapus: ${removed.username}`, 'SECURITY');");

code = code.replace(/sysLog\('INFO', \`\[Retention\] Deleted by age \(\$\{cam\.id\}\): \$\{file\.path\}\`\);, 'STORAGE'\);/g, "sysLog('INFO', `[Retention] Deleted by age (${cam.id}): ${file.path}`, 'STORAGE');");
code = code.replace(/sysLog\('INFO', \`\[Retention\] Deleted by quota \(\$\{cam\.id\}\): \$\{file\.path\}\`\);, 'STORAGE'\);/g, "sysLog('INFO', `[Retention] Deleted by quota (${cam.id}): ${file.path}`, 'STORAGE');");

code = code.replace(/sysLog\('WARN', \`Global storage capacity > 90% \(\$\{\(percent\*100\)\.toFixed\(1\)\}%\)\. Executing emergency cleanup\.\`\);, 'STORAGE'\);/g, "sysLog('WARN', `Global storage capacity > 90% (${(percent*100).toFixed(1)}%). Executing emergency cleanup.`, 'STORAGE');");

code = code.replace(/sysLog\('INFO', \`\[Emergency Cleanup\] Deleted \$\{rec\.file_path\}\`\);, 'STORAGE'\);/g, "sysLog('INFO', `[Emergency Cleanup] Deleted ${rec.file_path}`, 'STORAGE');");

code = code.replace(/sysLog\('ERROR', \`Disk check failed: \$\{e\.message\}\`\);, 'STORAGE'\); \}/g, "sysLog('ERROR', `Disk check failed: ${e.message}`, 'STORAGE'); }");

code = code.replace(/sysLog\('INFO', \`\[PTZ\] Kamera \$\{cam\.name\} \(\$\{host\}\) bergerak ke \$\{direction\}\`\);, 'CAMERA'\);/g, "sysLog('INFO', `[PTZ] Kamera ${cam.name} (${host}) bergerak ke ${direction}`, 'CAMERA');");
code = code.replace(/sysLog\('ERROR', \`\[PTZ\] Gagal ONVIF untuk \$\{cam \? cam\.name : req\.params\.id\}: \$\{e\.message\}\`\);, 'CAMERA'\);/g, "sysLog('ERROR', `[PTZ] Gagal ONVIF untuk ${cam ? cam.name : req.params.id}: ${e.message}`, 'CAMERA');");

code = code.replace(/sysLog\('INFO', \`Lokasi Penyimpanan Rekaman Diperbarui: \$\{trimmedPath\} \(Tersimpan di data\/nvr_db\.json\)\`\);, 'STORAGE'\);/g, "sysLog('INFO', `Lokasi Penyimpanan Rekaman Diperbarui: ${trimmedPath} (Tersimpan di data/nvr_db.json)`, 'STORAGE');");

code = code.replace(/sysLog\('INFO', \`Pengaturan Sistem Diperbarui \(Storage: \$\{newSettings\.globalStoragePath \|\| newSettings\.globalStorageMode\}, Recording Quality: \$\{newSettings\.recordingQuality \|\| 'main'\}\)\`\);, 'STORAGE'\);/g, "sysLog('INFO', `Pengaturan Sistem Diperbarui (Storage: ${newSettings.globalStoragePath || newSettings.globalStorageMode}, Recording Quality: ${newSettings.recordingQuality || 'main'})`, 'STORAGE');");

fs.writeFileSync('server.js', code);
