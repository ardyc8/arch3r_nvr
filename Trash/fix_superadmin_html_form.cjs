const fs = require('fs');

let html = fs.readFileSync('public/superadmin.html', 'utf8');

// Ensure the form is styled nicely and doesn't conflict
html = html.replace(/<div id="formAddAdminBox" style="display:none;/, '<div id="formAddAdminBox" style="display:block;');
// Change button text
html = html.replace(/>\s*\+ Tambah Administrator Baru\s*<\/button>/, '>✕ Tutup Form</button>');

fs.writeFileSync('public/superadmin.html', html);
console.log('Fixed superadmin.html form display state');
