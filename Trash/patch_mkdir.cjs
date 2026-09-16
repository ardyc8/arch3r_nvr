const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

// Patch ensureRecordFolders
code = code.replace(/if \(!fs\.existsSync\(d\)\) fs\.mkdirSync\(d, \{ recursive: true \}\);/g, 
`try { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); } catch (err) { sysLog('ERROR', 'Gagal membuat folder: ' + d, 'STORAGE'); }`);

// Patch spawnRecordingFFmpeg
code = code.replace(/if \(!fs\.existsSync\(recBase\)\) \{\s*fs\.mkdirSync\(recBase, \{ recursive: true \}\);\s*\}/g, 
`try { if (!fs.existsSync(recBase)) fs.mkdirSync(recBase, { recursive: true }); } catch (err) { sysLog('ERROR', 'Gagal membuat folder base: ' + recBase, 'STORAGE'); }`);

fs.writeFileSync('server.js', code);
console.log("Patched fs.mkdirSync");
