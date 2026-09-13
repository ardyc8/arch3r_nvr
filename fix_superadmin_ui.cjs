const fs = require('fs');
let html = fs.readFileSync('public/superadmin.html', 'utf8');

html = html.replace(/<span class="badge" style="background:#10b981; font-size:0\.75rem; padding:2px 6px; border-radius:4px;">ACTIVE<\/span>/, '<span id="saLicenseBadge" class="badge" style="background:#64748b; font-size:0.75rem; padding:2px 6px; border-radius:4px;">MENGHITUNG...</span>');

fs.writeFileSync('public/superadmin.html', html);
console.log('Badge updated');
