const fs = require('fs');
let code = fs.readFileSync('public/superadmin.js', 'utf8');

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
    
    window.appMaintenanceFactoryReset = async function() {
        if(!confirm('PERINGATAN KRITIKAL!\\nSemua data (Kamera, Admin, User) akan dihapus permanen! Lanjutkan?')) return;
        if(!confirm('Apakah Anda benar-benar yakin ingin melakukan Factory Reset?')) return;
        try {
            const res = await authFetch('/api/maintenance/reset', { method: 'POST' });
            if(!res.ok) throw new Error('Gagal mereset');
            alert('Sistem berhasil di-Factory Reset. Memuat ulang...');
            window.location.reload();
        } catch(e) {
            alert(e.message);
        }
    };

    window.checkOtaUpdate = async function() {
        try {
            document.getElementById('otaCurrentVer').textContent = "Memeriksa...";
            document.getElementById('otaLatestVer').textContent = "Memeriksa...";
            
            const res = await authFetch('/api/system/ota/check');
            const data = await res.json();
            
            document.getElementById('otaCurrentVer').textContent = "v" + data.current_version;
            document.getElementById('otaLatestVer').textContent = "v" + data.latest_version;
            
            if (data.update_available) {
                document.getElementById('otaLatestVer').style.color = '#10b981';
                document.getElementById('otaLatestVer').textContent += " (Update Tersedia!)";
                document.getElementById('btnApplyOta').style.display = 'inline-block';
                
                const logBox = document.getElementById('otaChangelogBox');
                logBox.style.display = 'block';
                logBox.textContent = "Catatan Rilis (Changelog):\\n" + data.changelog;
            } else {
                document.getElementById('otaLatestVer').style.color = 'var(--text-muted)';
                document.getElementById('otaLatestVer').textContent += " (Sudah Mutakhir)";
                document.getElementById('btnApplyOta').style.display = 'none';
                document.getElementById('otaChangelogBox').style.display = 'none';
            }
        } catch (e) {
            alert("Gagal mengecek OTA: " + e.message);
            document.getElementById('otaCurrentVer').textContent = "Error";
            document.getElementById('otaLatestVer').textContent = "Error";
        }
    };

    window.applyOtaUpdate = async function() {
        if(!confirm('Proses ini akan mengunduh versi terbaru dan mereboot sistem secara otomatis. Lanjutkan?')) return;
        try {
            const res = await authFetch('/api/system/ota/apply', { method: 'POST' });
            const data = await res.json();
            alert(data.message || 'Pembaruan OTA dimulai, sistem akan restart sebentar lagi.');
        } catch(e) {
            alert('Gagal menjalankan OTA update: ' + e.message);
        }
    };

    // Auto check OTA when view is opened
    const mNavs = document.querySelectorAll('.sidebar-nav .nav-item');
    mNavs.forEach(nav => {
        nav.addEventListener('click', (e) => {
            if (nav.dataset.target === 'view-maintenance') {
                checkOtaUpdate();
            }
        });
    });

    window.logout = function() {`;

code = code.replace(targetFn, injectFn);
fs.writeFileSync('public/superadmin.js', code);
console.log("Superadmin JS patched.");
