const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const getDbMatch = code.match(/function getNvrDb\(\) \{[\s\S]*?return data;\n\}/);
const saveDbMatch = code.match(/function scheduleDbSave\(\) \{[\s\S]*?console\.error\('Error saving DB:', e\);\n    \}\n\}/);

console.log("GetDB Match:", !!getDbMatch);
console.log("SaveDB Match:", !!saveDbMatch);
