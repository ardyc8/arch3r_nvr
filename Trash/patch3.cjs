const fs = require('fs');

let content = fs.readFileSync('server.js', 'utf8');
content = content.replace(/exec\('systemctl restart mediamtx \|\| pm2 restart mediamtx', \(err, stdout, stderr\) => \{[\s\S]*?\}\);/, `exec('pm2 reload mediamtx || systemctl restart mediamtx || pm2 restart mediamtx', (err, stdout, stderr) => {
            if (err) {
                if (!err.message.includes('not found') && !err.message.includes('No command')) {
                    sysLog('WARN', \`[MediaMTX] Info restart: \${err.message}\`);
                }
            } else {
                sysLog('INFO', \`[MediaMTX] MediaMTX berhasil di-restart/reload.\`);
            }
        });`);
fs.writeFileSync('server.js', content, 'utf8');
