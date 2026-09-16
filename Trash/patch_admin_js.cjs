const fs = require('fs');
let code = fs.readFileSync('public/script.js', 'utf8');

// Inject JS handlers
const targetFn = `window.logout = function() {`;
const injectFn = `window.appMaintenanceReboot = async function() {
        if(!confirm('Yakin ingin merestart sistem NVR (STB)? Proses ini memakan waktu 1-2 menit.')) return;
        try {
            const res = await authFetch('/api/maintenance/reboot', { method: 'POST' });
            const data = await res.json();
            alert(data.message || 'Sistem sedang direboot...');
        } catch(e) {
            alert('Gagal mengirim perintah reboot: ' + e.message);
        }
    };
    
    window.appMaintenanceReset = async function() {
        if(!confirm('PERINGATAN KRITIKAL!\\nSemua data Kamera dan Sub-User Anda akan dihapus permanen! Lanjutkan?')) return;
        if(!confirm('Apakah Anda benar-benar yakin ingin mengosongkan data Admin ini?')) return;
        try {
            const res = await authFetch('/api/maintenance/reset', { method: 'POST' });
            if(!res.ok) throw new Error('Gagal mereset');
            alert('Data Admin telah direset sepenuhnya. Memuat ulang...');
            window.location.reload();
        } catch(e) {
            alert(e.message);
        }
    };

    window.logout = function() {`;

code = code.replace(targetFn, injectFn);
fs.writeFileSync('public/script.js', code);
console.log("Admin JS patched.");
