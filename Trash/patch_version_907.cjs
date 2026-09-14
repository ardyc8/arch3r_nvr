const fs = require('fs');

function updateFile(file) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    
    // Update versions
    content = content.replace(/Ver\. 9\.0\.6/g, 'Ver. 9.0.7');
    content = content.replace(/version: '9\.0\.6'/g, "version: '9.0.7'");
    content = content.replace(/9\.0\.6/g, '9.0.7');
    
    fs.writeFileSync(file, content);
}

['server.js', 'public/index.html', 'public/admin.html', 'public/superadmin.html', 'README.md', 'install.sh'].forEach(updateFile);

console.log('Version bumped to 9.0.7!');
