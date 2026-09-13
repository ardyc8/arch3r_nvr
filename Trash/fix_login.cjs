const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// Update version
html = html.replace(/Ver\. 9\.0\.2/g, 'Ver. 9.0.3');

// Remove "Arsitektur Shinobi CCTV"
html = html.replace(/<p style="text-align:center; color:var\(--text-muted\); font-size:0\.8rem; margin-bottom:1\.5rem;">[\s\S]*?Armbian STB Multi-Tenant NVR &bull; Arsitektur Shinobi CCTV[\s\S]*?<\/p>/m, 
`<p style="text-align:center; color:var(--text-muted); font-size:0.8rem; margin-bottom:1.5rem;">
                Professional Armbian STB NVR System
            </p>`);

// Remove "Akun Bawaan Sistem" block completely
html = html.replace(/<!-- Petunjuk Akun Bawaan \(Default Credentials\) -->[\s\S]*?<\/a>\s*<\/div>\s*<\/div>/m, '');

fs.writeFileSync('public/index.html', html);
console.log('Login UI updated');
