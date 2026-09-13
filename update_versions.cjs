const fs = require('fs');

['public/index.html', 'public/superadmin.html'].forEach(file => {
    if(fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        content = content.replace(/Ver\. 9\.0\.\d+/g, 'Ver. 9.0.4');
        fs.writeFileSync(file, content);
    }
});
console.log('Updated versions to 9.0.4');
