const fs = require('fs');

let html = fs.readFileSync('public/superadmin.html', 'utf8');

// The issue might be a stale cache in the user's browser, OR some missing CSS.
// Let's add a random query parameter to the CSS import to force browser cache reset.
html = html.replace(/<link rel="stylesheet" href="style.css[^"]*">/, '<link rel="stylesheet" href="style.css?v=' + Date.now() + '">');
html = html.replace(/<script src="superadmin.js[^"]*"><\/script>/, '<script src="superadmin.js?v=' + Date.now() + '"></script>');

fs.writeFileSync('public/superadmin.html', html);
console.log('Forced cache refresh on superadmin resources');
