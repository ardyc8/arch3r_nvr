const fs = require('fs');
let code = fs.readFileSync('public/superadmin.js', 'utf8');

// Bersihkan logic lawas
code = code.replace(/function checkLicenseLocal[\s\S]*?\}\s*\}\s*/, '');

const newLoad = `
    async function loadSuperadminSettings() {
        try {
            const res = await authFetch('/api/superadmin/license-info');
            const data = await res.json();
            
            document.getElementById('saMachineId').textContent = data.machineId;
            const elEmail = document.getElementById('saEmail');
            if(elEmail) elEmail.value = data.settings.email || '';
            const elLicense = document.getElementById('saLicenseKey');
            if(elLicense) elLicense.value = data.settings.license || '';
            const elP2p = document.getElementById('saP2pHost');
            if(elP2p) elP2p.value = data.settings.p2p_relay || 'p2p.archer-nvr.net:443';
            
            const badge = document.getElementById('saLicenseBadge');
            const trialBox = document.getElementById('trialInfoBox');
            
            if (data.licenseValid) {
                badge.textContent = 'LISENSI AKTIF';
                badge.style.background = '#10b981';
                trialBox.style.display = 'none';
            } else {
                badge.textContent = 'TIDAK AKTIF';
                badge.style.background = '#ef4444';
                
                trialBox.style.display = 'block';
                if (data.isTrialActive) {
                    trialBox.style.background = 'rgba(234, 179, 8, 0.2)';
                    trialBox.style.border = '1px solid #eab308';
                    trialBox.style.color = '#fef08a';
                    trialBox.innerHTML = \`<strong style="font-size:0.9rem;">Masa Trial / Evaluasi Aktif</strong><br>Sisa Waktu Trial NVR: <strong>\${data.trialDaysLeft} Hari</strong>\`;
                } else {
                    trialBox.style.background = 'rgba(239, 68, 68, 0.2)';
                    trialBox.style.border = '1px solid #ef4444';
                    trialBox.style.color = '#fecaca';
                    trialBox.innerHTML = \`<strong style="font-size:0.9rem;">Masa Trial Habis</strong><br>Sistem terkunci. Harap hubungi Developer dan masukkan Token Lisensi baru.\`;
                }
            }
        } catch (err) {
            console.error('Gagal memuat setting superadmin', err);
        }
    }
`;

code = code.replace(/async function loadSuperadminSettings\(\) \{[\s\S]*?catch \(err\) \{[\s\S]*?\}[\s\S]*?\}/, newLoad);

const newSave = `
    const saLicenseForm = document.getElementById('saLicenseForm');
    if (saLicenseForm) {
        saLicenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const license = document.getElementById('saLicenseKey').value.trim();
            const email = document.getElementById('saEmail').value.trim();
            try {
                const res = await authFetch('/api/superadmin/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ license, email })
                });
                const data = await res.json();
                if (data.success) {
                    alert('Data Aktivasi berhasil disimpan! Halaman akan dimuat ulang untuk memvalidasi status.');
                    window.location.reload();
                }
            } catch (err) {
                alert('Gagal menyimpan lisensi');
            }
        });
    }
`;
code = code.replace(/saLicenseForm\.addEventListener\('submit', async \(e\) => \{[\s\S]*?\}\);/, newSave);

fs.writeFileSync('public/superadmin.js', code);
console.log('Superadmin JS UI Updated');
