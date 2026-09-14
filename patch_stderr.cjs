const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

code = code.replace(/const child = spawn\('ffmpeg', args\);\n    child\.killedByUser = false;/, `const child = spawn('ffmpeg', args);
    child.killedByUser = false;
    child.lastErr = '';
    child.stderr.on('data', d => {
        let str = d.toString();
        child.lastErr = str;
    });`);

code = code.replace(/sysLog\('WARN', \`\\[\$\{cam\.id\}\\] Perekaman FFmpeg berhenti \\(Code: \$\{code\}\\)\. Reconnect otomatis dalam 10 detik\.\.\.\`, 'CAMERA'\);/, `sysLog('WARN', \`[\${cam.id}] Perekaman FFmpeg berhenti (Code: \${code}). Err: \${child.lastErr.substring(0, 200)} Reconnect...\`, 'CAMERA');`);

fs.writeFileSync('server.js', code);
console.log('Patched stderr');
