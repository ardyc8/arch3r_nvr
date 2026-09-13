const fs = require('fs');

let js = fs.readFileSync('public/superadmin.js', 'utf8');

// Ensure the JS isn't hiding the form on load, or we change it so it just works 
// The HTML has it block by default. We should make sure JS matches.
js = js.replace(/btnToggleAddAdmin\.textContent = isHidden \? '✕ Tutup Form' : '\+ Tambah Administrator Baru';/g, 
"btnToggleAddAdmin.textContent = isHidden ? '✕ Tutup Form' : '+ Tambah Administrator Baru';\n        if(isHidden) formAddAdminBox.scrollIntoView({behavior: 'smooth'});");

fs.writeFileSync('public/superadmin.js', js);
console.log('Updated superadmin.js toggle logic');
