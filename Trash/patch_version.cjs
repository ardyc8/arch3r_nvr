const fs = require('fs');

// Patch server.js
let serverCode = fs.readFileSync('server.js', 'utf8');
serverCode = serverCode.replace(/9\.3\.11/g, '9.3.12');
fs.writeFileSync('server.js', serverCode);

// Patch package.json
let pkgCode = fs.readFileSync('package.json', 'utf8');
pkgCode = pkgCode.replace(/"version": "9\.3\.11"/, '"version": "9.3.12"');
fs.writeFileSync('package.json', pkgCode);

// Patch HTML files
const htmlFiles = ['public/index.html', 'public/superadmin.html'];
for (const file of htmlFiles) {
    if (fs.existsSync(file)) {
        let html = fs.readFileSync(file, 'utf8');
        html = html.replace(/9\.3\.11/g, '9.3.12');
        fs.writeFileSync(file, html);
    }
}

// Patch JS files
const jsFiles = ['public/script.js', 'public/superadmin.js', 'keygen.js'];
for (const file of jsFiles) {
    if (fs.existsSync(file)) {
        let js = fs.readFileSync(file, 'utf8');
        js = js.replace(/9\.3\.11/g, '9.3.12');
        fs.writeFileSync(file, js);
    }
}
console.log("Version bumped to 9.3.12");
