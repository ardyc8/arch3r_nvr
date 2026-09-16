const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const targetStr = `        data.super_settings = s_set.super_settings || data.super_settings;`;
const replacementStr = `        data.super_settings = { ...data.super_settings, ...(s_set.super_settings || {}) };`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('server.js', code);
console.log("getNvrDb settings merge patched.");
