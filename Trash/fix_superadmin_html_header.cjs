const fs = require('fs');

let html = fs.readFileSync('public/superadmin.html', 'utf8');

// The header might be too large because of flex centering or something.
// Let's check the brand styling in the header
// <div class="brand" style="justify-content:center; border:none; padding-bottom:0.5rem; display:flex; align-items:center; gap:0.5rem;">
// Let's scale down the auth card a bit and the fonts
html = html.replace(/<span style="font-size:1\.8rem;">⚡<\/span>/, '<span style="font-size:1.4rem;">⚡</span>');
html = html.replace(/<h2 style="margin:0; font-size:1\.3rem;">/, '<h2 style="margin:0; font-size:1.1rem;">');

// Inside Dashboard Top Header
html = html.replace(/<h1 style="margin:0; font-size:1\.5rem;/, '<h1 style="margin:0; font-size:1.3rem;');

fs.writeFileSync('public/superadmin.html', html);
console.log('Scaled down headers in superadmin.html');
