const fs = require('fs');
let js = fs.readFileSync('public/script.js', 'utf8');

js = js.replace(/        }\n\n    if \(systemForm\)/g, "    if (systemForm)");
js = js.replace(/        }\n\n    \/\/ Refresh Storage button/g, "\n    // Refresh Storage button");
fs.writeFileSync('public/script.js', js);
console.log('Fixed extra braces!');
