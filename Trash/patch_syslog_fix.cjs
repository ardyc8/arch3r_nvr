const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// Revert that specific broken line
code = code.replace(/sysLog\('INFO', \`\[\$\{cam\.id\}\] Memulai perekaman\`, 'CAMERA'\) kontinyu FFmpeg/g, 
    "sysLog('INFO', `[${cam.id}] Memulai perekaman kontinyu FFmpeg (-c:v copy -c:a copy) [${useSub ? 'SD/Sub' : 'HD/Main'}] -> ${recBase}`, 'CAMERA'); //");

// Let's check others
code = code.replace(/sysLog\('WARN', \`\[\$\{cam\.id\}\] Perekaman\`, 'CAMERA'\) FFmpeg berhenti/g,
    "sysLog('WARN', `[${cam.id}] Perekaman FFmpeg berhenti (Code: ${code}). Reconnect otomatis dalam 10 detik...`, 'CAMERA'); //");

code = code.replace(/sysLog\('WARN', \`\[\$\{cam\.id\}\] URL RTSP\`, 'CAMERA'\) tidak tersedia/g,
    "sysLog('WARN', `[${cam.id}] URL RTSP tidak tersedia untuk perekaman.`, 'CAMERA'); //");

code = code.replace(/sysLog\('INFO', \`Kamera\`, 'CAMERA'\) Ditambahkan/g, "sysLog('INFO', `Kamera Ditambahkan: ${newCam.name} (MediaMTX config updated)`, 'CAMERA'); //");
code = code.replace(/sysLog\('INFO', \`Kamera\`, 'CAMERA'\) Diperbarui/g, "sysLog('INFO', `Kamera Diperbarui: ${cams[index].name} (MediaMTX config updated)`, 'CAMERA'); //");
code = code.replace(/sysLog\('INFO', \`Kamera\`, 'CAMERA'\) Dihapus/g, "sysLog('INFO', `Kamera Dihapus: ${req.params.id} (MediaMTX config updated)`, 'CAMERA'); //");

code = code.replace(/sysLog\('ERROR', \`Sync failed for\`, 'CAMERA'\) \$\{cam\.id\}/g, "sysLog('ERROR', `Sync failed for ${cam.id}: ${e.message}`, 'CAMERA'); //");

fs.writeFileSync('server.js', code);
