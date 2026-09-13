const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

if (!code.includes("import crypto from 'crypto';")) {
    code = code.replace(/import os from 'os';/, "import os from 'os';\nimport crypto from 'crypto';");
    fs.writeFileSync('server.js', code);
    console.log('Added crypto import');
}
