const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

code = code.replace(/const sourceUrl = cam\.mainStreamUrl \|\| cam\.rtspUrl;/g, 
`const sourceUrl = cam.mainStreamUrl || cam.rtspUrl || "";`);

// And make sure startsWith is guarded
code = code.replace(/const isRtsp = sourceUrl\.startsWith\('rtsp:\/\/'\);/g,
`const isRtsp = typeof sourceUrl === 'string' && sourceUrl.startsWith('rtsp://');`);

fs.writeFileSync('server.js', code);
console.log("sourceUrl bug patched.");
