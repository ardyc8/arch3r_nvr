const fs = require('fs');

let html = fs.readFileSync('public/superadmin.html', 'utf8');

// The body style currently is <body style="overflow-y:auto; display:block; min-height:100vh;">
// Let's ensure it overrides style.css which might have body { height: 100vh; overflow: hidden; display: flex; }
// Also fix the padding/margin on body
html = html.replace(/<body[^>]*>/, '<body style="overflow-y:scroll !important; display:block !important; height:auto !important; min-height:100vh; margin:0; padding:0; background:var(--bg-main);">');

fs.writeFileSync('public/superadmin.html', html);
console.log('Fixed superadmin.html body styling for scrolling');
