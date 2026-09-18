const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

code = code.replace(
  'const localISOTime = (getLocalTimeString(new Date(dateObj.getTime() - tzOffset))).slice(0, -1);',
  'const localISOTime = (new Date(dateObj.getTime() - tzOffset)).toISOString().slice(0, -1);'
);

fs.writeFileSync('server.js', code);
