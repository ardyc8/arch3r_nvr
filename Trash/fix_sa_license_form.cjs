const fs = require('fs');
let code = fs.readFileSync('public/superadmin.js', 'utf8');

// Replace the second declaration
code = code.replace(/const saLicenseForm = document\.getElementById\('saLicenseForm'\);/g, (match, offset) => {
    // If it's not the first one (near the top)
    if (offset > 1000) {
        return '';
    }
    return match;
});

fs.writeFileSync('public/superadmin.js', code);
console.log('Fixed redeclaration in superadmin.js');
