const fs = require('fs');
let code = fs.readFileSync('public/superadmin.js', 'utf8');

const licenseFunc = `
    function checkLicenseLocal(key) {
        if (!key) return false;
        key = key.trim();
        if (key === "ARCHER-PRO-COMMUNITY-2026") return true;
        const regex = /^ARCH3R-(PRO|ENTERPRISE|LIFETIME)-[A-Z0-9]{5,25}$/;
        return regex.test(key);
    }
    
    function updateLicenseBadge(key) {
        const badge = document.getElementById('saLicenseBadge');
        if(!badge) return;
        if(checkLicenseLocal(key)) {
            badge.textContent = 'ACTIVE';
            badge.style.background = '#10b981';
        } else {
            badge.textContent = 'INVALID';
            badge.style.background = '#ef4444';
        }
    }
`;

// Insert the function at top level
code = code.replace(/document\.addEventListener\('DOMContentLoaded', \(\) => \{/, licenseFunc + "\ndocument.addEventListener('DOMContentLoaded', () => {");

// Update when settings are loaded
code = code.replace(/saLicenseKey\.value = data\.license \|\| '';/, "saLicenseKey.value = data.license || '';\n            updateLicenseBadge(data.license);");

// Update when saved
code = code.replace(/alert\('Pengaturan Superadmin berhasil disimpan\.'\);/, "alert('Pengaturan Superadmin berhasil disimpan.');\n                updateLicenseBadge(license);");

fs.writeFileSync('public/superadmin.js', code);
console.log('Superadmin js updated');
