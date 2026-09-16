const fs = require('fs');
let code = fs.readFileSync('public/script.js', 'utf8');

// Force PTZ to always be active
code = code.replace(
`        const hasPtz = (cam && cam.ptzEnabled) ? true : false;`,
`        const hasPtz = true; // Forced active by user request`
);

fs.writeFileSync('public/script.js', code);
console.log("PTZ JS patched.");
