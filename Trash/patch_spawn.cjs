const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

code = code.replace(/child\.stderr\.on\('data', d => \{/g, 
`child.on('error', err => {
        sysLog('ERROR', 'FFmpeg spawn error (' + cam.id + '): ' + err.message, 'CAMERA');
    });
    child.stderr.on('data', d => {`);

fs.writeFileSync('server.js', code);
console.log("spawn error handler added.");
