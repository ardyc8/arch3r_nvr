// superadmin.js - Archer NVR V8.8 Developer Global Console


    document.addEventListener('DOMContentLoaded', () => {
    const saAuthOverlay = document.getElementById('saAuthOverlay');
    const saDashboard = document.getElementById('saDashboard');
    const saLoginForm = document.getElementById('saLoginForm');
    const saUsername = document.getElementById('saUsername');
    const saPassword = document.getElementById('saPassword');
    const saLoginError = document.getElementById('saLoginError');
    const saBtnLogout = document.getElementById('saBtnLogout');

    const saLicenseForm = document.getElementById('saLicenseForm');
    const saLicenseKey = document.getElementById('saLicenseKey');
    const saP2pForm = document.getElementById('saP2pForm');
    const saP2pHost = document.getElementById('saP2pHost');

    const btnToggleAddAdmin = document.getElementById('btnToggleAddAdmin');
    const formAddAdminBox = document.getElementById('formAddAdminBox');
    const btnCancelAddAdmin = document.getElementById('btnCancelAddAdmin');
    const saAddAdminForm = document.getElementById('saAddAdminForm');
    const saAdminTableBody = document.getElementById('saAdminTableBody');
    const saSystemInfoBox = document.getElementById('saSystemInfoBox');
    const saBtnFactoryReset = document.getElementById('saBtnFactoryReset');


    // Token Helper
    
    // UI Navigation Logic
    const navItems = document.querySelectorAll('.nav-item');
    const viewPanes = document.querySelectorAll('.view-pane');
    const btnMobileMenu = document.getElementById('btnMobileMenu');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (btnMobileMenu) {
        btnMobileMenu.addEventListener('click', () => {
            sidebar.classList.add('mobile-open');
            sidebarOverlay.classList.add('active');
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('mobile-open');
            sidebarOverlay.classList.remove('active');
        });
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(n => n.classList.remove('active'));
            viewPanes.forEach(v => v.classList.remove('active'));

            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            const targetPane = document.getElementById(targetId);
            if (targetPane) targetPane.classList.add('active');

            if (sidebar) sidebar.classList.remove('mobile-open');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        });
    });

    function getAuthToken() {
        return localStorage.getItem('nvr_auth_token') || '';
    }

    function authFetch(url, options = {}) {
        const opts = { ...options };
        opts.headers = opts.headers ? { ...opts.headers } : {};
        const token = getAuthToken();
        if (token) {
            opts.headers['Authorization'] = `Bearer ${token}`;
        }
        opts.credentials = 'include';
        return fetch(url, opts);
    }

    // Password Peek
    document.querySelectorAll('.btn-peek-pwd').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            const targetId = btn.dataset.target;
            const input = document.getElementById(targetId);
            if (!input) return;
            const icon = btn.querySelector('.peek-icon');
            if (input.type === 'password') {
                input.type = 'text';
                if (icon) icon.textContent = '🙈';
            } else {
                input.type = 'password';
                if (icon) icon.textContent = '👁️';
            }
        };
    });

    // Check Current Superadmin Auth
    async function checkAuth() {
        try {
            const res = await authFetch('/api/auth/status');
            const data = await res.json();
            if (data.authenticated && data.role === 'superadmin') {
                saAuthOverlay.style.display = 'none';
                saDashboard.style.display = 'flex';
                loadSuperSettings();
                loadAdmins();
                loadSystemInfo();
            } else {
                saAuthOverlay.style.display = 'flex';
                saDashboard.style.display = 'none';
            }
        } catch (err) {
            saAuthOverlay.style.display = 'flex';
            saDashboard.style.display = 'none';
        }
    }

    // Login Form Submit
    saLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        saLoginError.textContent = '';
        const username = saUsername.value.trim();
        const password = saPassword.value;

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                if (data.token) {
                    localStorage.setItem('nvr_auth_token', data.token);
                    localStorage.setItem('nvr_role', data.role);
                }
                if (data.role === 'superadmin') {
                    saAuthOverlay.style.display = 'none';
                    saDashboard.style.display = 'flex';
                    loadSuperSettings();
                loadAdmins();
                loadSystemInfo();
                    loadSystemInfo();
                } else {
                    saLoginError.textContent = 'Akun ini bukan role Superadmin. Gunakan admin@archer.nvr!';
                }
            } else {
                saLoginError.textContent = data.error || 'Login Superadmin gagal.';
            }
        } catch (err) {
            saLoginError.textContent = 'Gagal menghubungi server.';
        }
    });

    // Logout
    saBtnLogout.addEventListener('click', async () => {
        try {
            await authFetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {}
        localStorage.removeItem('nvr_auth_token');
        localStorage.removeItem('nvr_role');
        window.location.reload();
    });

    // Toggle Form Add Admin
    btnToggleAddAdmin.addEventListener('click', () => {
        const isHidden = formAddAdminBox.style.display === 'none';
        formAddAdminBox.style.display = isHidden ? 'block' : 'none';
        btnToggleAddAdmin.textContent = isHidden ? '✕ Tutup Form' : '+ Tambah Administrator Baru';
        if(isHidden) formAddAdminBox.scrollIntoView({behavior: 'smooth'});
    });

    btnCancelAddAdmin.addEventListener('click', () => {
        formAddAdminBox.style.display = 'none';
        btnToggleAddAdmin.textContent = '+ Tambah Administrator Baru';
        saAddAdminForm.reset();
    });

    // Load Super Settings
    async function loadSuperSettings() {
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
            
            const elOtaUrl = document.getElementById('otaGithubUrl');
            if(elOtaUrl) elOtaUrl.value = data.settings.ota_github_url || 'https://api.github.com/repos/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME/releases/latest';

            const badge = document.getElementById('saLicenseBadge');
            const trialBox = document.getElementById('trialInfoBox');
            
            if (data.licenseValid) {
                badge.textContent = 'LISENSI AKTIF';
                badge.style.background = '#10b981';
                trialBox.style.display = 'block';
                trialBox.style.background = 'rgba(16, 185, 129, 0.2)';
                trialBox.style.border = '1px solid #10b981';
                trialBox.style.color = '#a7f3d0';
                
                let expStr = 'Seumur Hidup';
                if (data.licenseExpiresAt) {
                    const days = Math.floor((data.licenseExpiresAt - Date.now()) / (1000 * 60 * 60 * 24));
                    expStr = `${days} Hari (Hingga ${new Date(data.licenseExpiresAt).toLocaleDateString('id-ID')})`;
                }
                trialBox.innerHTML = `<strong style="font-size:0.9rem;">Status Lisensi Premium</strong><br>Sisa Masa Aktif: <strong>${expStr}</strong>`;
            } else {
                badge.textContent = 'TIDAK AKTIF';
                badge.style.background = '#ef4444';
                
                trialBox.style.display = 'block';
                let reasonHtml = '';
                if (data.settings && data.settings.license && data.licenseReason) {
                    reasonHtml = `<div style="margin-bottom:0.75rem; padding:0.5rem 0.75rem; background:rgba(239, 68, 68, 0.25); border-radius:6px; border:1px solid #ef4444; color:#fca5a5; font-size:0.8rem; text-align:left; line-height:1.4;">
                        ⚠️ <strong>Penyebab Lisensi Belum Aktif:</strong><br>${data.licenseReason}
                    </div>`;
                }

                if (data.isTrialActive) {
                    trialBox.style.background = 'rgba(234, 179, 8, 0.15)';
                    trialBox.style.border = '1px solid #eab308';
                    trialBox.style.color = '#fef08a';
                    trialBox.innerHTML = `${reasonHtml}<strong style="font-size:0.9rem;">Masa Trial / Evaluasi Aktif</strong><br>Sisa Waktu Trial NVR: <strong>${data.trialDaysLeft} Hari</strong>`;
                } else {
                    trialBox.style.background = 'rgba(239, 68, 68, 0.2)';
                    trialBox.style.border = '1px solid #ef4444';
                    trialBox.style.color = '#fecaca';
                    trialBox.innerHTML = `${reasonHtml}<strong style="font-size:0.9rem;">Masa Trial Habis & Sistem Terkunci</strong><br>Harap masukkan Token Lisensi yang valid untuk mengaktifkan NVR.`;
                }
            }
        } catch (err) {
            console.error('Gagal memuat setting superadmin', err);
        }
    }

    // Copy Machine ID button
    const btnCopyMachineId = document.getElementById('btnCopyMachineId');
    if (btnCopyMachineId) {
        btnCopyMachineId.addEventListener('click', () => {
            const mid = (document.getElementById('saMachineId').textContent || '').trim();
            if (mid && mid !== '---') {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(mid).then(() => {
                        btnCopyMachineId.textContent = '✅ Tersalin!';
                        btnCopyMachineId.style.background = '#10b981';
                        btnCopyMachineId.style.color = '#ffffff';
                        setTimeout(() => { 
                            btnCopyMachineId.textContent = '📋 Salin ID'; 
                            btnCopyMachineId.style.background = '#1e293b';
                            btnCopyMachineId.style.color = '#cbd5e1';
                        }, 2500);
                    }).catch(() => {
                        prompt('Salin Machine ID ini:', mid);
                    });
                } else {
                    prompt('Salin Machine ID ini:', mid);
                }
            }
        });
    }

    // Save License
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
                    if (data.licenseValid) {
                        alert('✅ AKTIVASI SUKSES!\n\nLisensi berhasil diverifikasi. Status NVR sekarang: PREMIUM AKTIF.');
                    } else {
                        alert('⚠️ LISENSI TERSIMPAN TAPI BELUM AKTIF!\n\nPenyebab:\n' + (data.licenseReason || 'Token tidak cocok dengan Machine ID atau Email') + '\n\nSilakan periksa detailnya di kotak status merah di bawah ini.');
                    }
                    window.location.reload();
                } else {
                    alert('❌ GAGAL AKTIVASI:\n\n' + (data.error || 'Terjadi kesalahan dari server.'));
                }
            } catch (err) {
                alert('Gagal menyimpan lisensi: ' + err.message);
            }
        });
    }


    // Save P2P Relay
    if (saP2pForm) {
        saP2pForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const p2p_relay = saP2pHost.value.trim();
            try {
                const res = await authFetch('/api/superadmin/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ p2p_relay })
                });
                if (res.ok) {
                    alert('Server P2P Relay berhasil diperbarui!');
                } else {
                    alert('Gagal memperbarui server P2P.');
                }
            } catch (err) {
                alert('Kesalahan koneksi saat memperbarui P2P.');
            }
        });
    }

    // Change Superadmin Credentials
    const saCredForm = document.getElementById('saCredForm');
    if (saCredForm) {
        saCredForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newUsername = document.getElementById('saCredUser').value.trim();
            const newPassword = document.getElementById('saCredPass').value.trim();
            
            if (!confirm('Peringatan: Mengubah kredensial ini akan menimpa login default superadmin. Pastikan Anda mencatatnya! Lanjutkan?')) return;
            
            try {
                const res = await authFetch('/api/superadmin/change-credentials', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ newUsername, newPassword })
                });
                
                const data = await res.json();
                if (res.ok) {
                    alert(data.message);
                    localStorage.removeItem('nvr_auth_token');
                    window.location.reload();
                } else {
                    alert(data.error || 'Gagal mengubah kredensial.');
                }
            } catch (err) {
                alert('Kesalahan jaringan: ' + err.message);
            }
        });
    }

    // Load Administrators
    async function loadAdmins() {
        try {
            const res = await authFetch('/api/superadmin/admins');
            if (!res.ok) throw new Error('Gagal mengambil daftar admin');
            const data = await res.json();
            window._adminsList = data.administrators || [];
            renderAdminTable(window._adminsList);
        } catch (err) {
            saAdminTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:var(--accent);">Gagal memuat data administrator: ${err.message}</td></tr>`;
        }
    }

    function renderAdminTable(admins) {
        if (!saAdminTableBody) return;
        if (admins.length === 0) {
            saAdminTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:var(--text-muted);">Belum ada administrator yang terdaftar. Klik "+ Tambah Administrator Baru".</td></tr>`;
            return;
        }

        saAdminTableBody.innerHTML = admins.map(admin => {
            const formattedDate = admin.createdAt ? new Date(admin.createdAt).toLocaleString('id-ID') : '-';
            const maxCams = admin.max_cameras || 8;
            const curCams = admin.cameraCount || 0;
            const camUsagePercent = Math.min(100, Math.round((curCams / maxCams) * 100));
            const camBadgeColor = curCams >= maxCams ? '#ef4444' : (curCams > 0 ? '#3b82f6' : '#64748b');

            const maxStorage = admin.max_storage_gb || 100;
            const curStorage = admin.storageUsedGB || 0;

            return `
                <tr style="border-bottom:1px solid var(--border); transition:background 0.2s;">
                    <td style="padding:0.75rem 1rem; font-family:monospace; color:var(--text-muted); font-size:0.8rem;">${admin.id}</td>
                    <td style="padding:0.75rem 1rem; font-weight:600; color:#f8fafc;">${admin.name}</td>
                    <td style="padding:0.75rem 1rem; color:#60a5fa; font-family:monospace;">${admin.username}</td>
                    <td style="padding:0.75rem 1rem;">
                        <span class="badge" style="background:#1e293b; color:${camBadgeColor}; padding:3px 8px; border-radius:4px; font-weight:600;">
                            📹 ${curCams} / ${maxCams} Kamera
                        </span>
                    </td>
                    <td style="padding:0.75rem 1rem;">
                        <span class="badge" style="background:#1e293b; color:#cbd5e1; padding:3px 8px; border-radius:4px;">
                            💾 ${curStorage} / ${maxStorage} GB
                        </span>
                    </td>
                    <td style="padding:0.75rem 1rem;"><span class="badge" style="background:#1e293b; color:#86efac; padding:3px 8px; border-radius:4px;">👤 ${admin.userCount || 0} User</span></td>
                    <td style="padding:0.75rem 1rem; font-size:0.8rem; color:var(--text-muted);">${formattedDate}</td>
                    <td style="padding:0.75rem 1rem; text-align:right; white-space:nowrap;">
                        <button class="btn-sm" style="background:#6366f1; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:0.8rem; margin-right:4px;" onclick="openEditQuota('${admin.id}')">
                            ⚙️ Kuota
                        </button>
                        <button class="btn-sm btn-delete" style="background:#ef4444; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:0.8rem;" onclick="deleteAdmin('${admin.id}', '${admin.username}')">
                            🗑️ Hapus
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Modal Edit Quota
    const modalEditQuota = document.getElementById('modalEditQuota');
    const formEditQuota = document.getElementById('formEditQuota');
    const btnCancelEditQuota = document.getElementById('btnCancelEditQuota');

    window.openEditQuota = function(adminId) {
        const admin = (window._adminsList || []).find(a => a.id === adminId);
        if (!admin) return;
        document.getElementById('editAdminId').value = admin.id;
        document.getElementById('editAdminName').value = admin.name || '';
        document.getElementById('editAdminMaxCameras').value = admin.max_cameras || 8;
        document.getElementById('editAdminMaxStorageGB').value = admin.max_storage_gb || 100;
        document.getElementById('editAdminPassword').value = '';
        document.getElementById('editQuotaAdminInfo').textContent = `Username: ${admin.username} (Saat ini memakai ${admin.cameraCount || 0} kamera, ${admin.storageUsedGB || 0} GB storage)`;
        modalEditQuota.style.display = 'flex';
    };

    if (btnCancelEditQuota) {
        btnCancelEditQuota.addEventListener('click', () => {
            modalEditQuota.style.display = 'none';
        });
    }

    if (formEditQuota) {
        formEditQuota.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('editAdminId').value;
            const name = document.getElementById('editAdminName').value.trim();
            const max_cameras = parseInt(document.getElementById('editAdminMaxCameras').value) || 8;
            const max_storage_gb = parseFloat(document.getElementById('editAdminMaxStorageGB').value) || 100;
            const password = document.getElementById('editAdminPassword').value;

            const payload = { name, max_cameras, max_storage_gb };
            if (password && password.trim().length >= 4) {
                payload.password = password.trim();
            }

            try {
                const res = await authFetch(`/api/superadmin/admins/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    alert('Pengaturan kuota administrator berhasil disimpan!');
                    modalEditQuota.style.display = 'none';
                    loadAdmins();
                } else {
                    alert(data.error || 'Gagal memperbarui kuota administrator.');
                }
            } catch (err) {
                alert('Terjadi kesalahan jaringan.');
            }
        });
    }

    // Add Admin Submit
    saAddAdminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('newAdminName').value.trim();
        const username = document.getElementById('newAdminUsername').value.trim();
        const password = document.getElementById('newAdminPassword').value;
        const max_cameras = parseInt(document.getElementById('newAdminMaxCameras').value) || 8;
        const max_storage_gb = parseFloat(document.getElementById('newAdminMaxStorageGB').value) || 100;

        if (password.length < 4) {
            alert('Password minimal 4 karakter!');
            return;
        }

        try {
            const res = await authFetch('/api/superadmin/admins', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, username, password, max_cameras, max_storage_gb })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                alert(`Administrator Gedung '${username}' berhasil didaftarkan dengan kuota ${max_cameras} kamera & ${max_storage_gb} GB storage!`);
                saAddAdminForm.reset();
                formAddAdminBox.style.display = 'none';
                btnToggleAddAdmin.textContent = '+ Tambah Administrator Baru';
                loadAdmins();
            } else {
                alert(data.error || 'Gagal mendaftarkan administrator.');
            }
        } catch (err) {
            alert('Terjadi kesalahan jaringan.');
        }
    });

    // Delete Admin Global Function
    window.deleteAdmin = async function(id, username) {
        if (!confirm(`Apakah Anda yakin ingin menghapus akun Administrator '${username}'? Semua data terkait akun ini akan terputus.`)) {
            return;
        }

        try {
            const res = await authFetch(`/api/superadmin/admins/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok && data.success) {
                alert(`Administrator '${username}' berhasil dihapus.`);
                loadAdmins();
            } else {
                alert(data.error || 'Gagal menghapus administrator.');
            }
        } catch (err) {
            alert('Terjadi kesalahan jaringan.');
        }
    };

    // Run Auth Check

    async function loadSystemInfo() {
        try {
            const res = await authFetch('/api/superadmin/app-info');
            if (res.ok) {
                const data = await res.json();
                if(saSystemInfoBox) {
                    saSystemInfoBox.innerHTML = `
                        <table style="width:100%; border-collapse:collapse;">
                            <tr><td style="padding:4px 0; color:var(--text-muted); width:150px;">Aplikasi</td><td>: ${data.appName}</td></tr>
                            <tr><td style="padding:4px 0; color:var(--text-muted);">Versi</td><td>: <span style="color:#10b981;">${data.version}</span></td></tr>
                            <tr><td style="padding:4px 0; color:var(--text-muted);">OS / Arsitektur</td><td>: ${data.platform} / ${data.arch}</td></tr>
                            <tr><td style="padding:4px 0; color:var(--text-muted);">Node.js</td><td>: ${data.nodeVersion}</td></tr>
                            <tr><td style="padding:4px 0; color:var(--text-muted);">Direktori App</td><td>: ${data.appDirectory}</td></tr>
                            <tr><td style="padding:4px 0; color:var(--text-muted);">File Database</td><td>: <span style="color:#eab308;">${data.databaseFile}</span></td></tr>
                            <tr><td style="padding:4px 0; color:var(--text-muted);">Config MediaMTX</td><td>: ${data.mediaMtxConfig}</td></tr>
                        </table>
                    `;
                }
            }
        } catch(err) {
            console.error('Gagal memuat info sistem', err);
        }
    }

    if (saBtnFactoryReset) {
        saBtnFactoryReset.addEventListener('click', async () => {
            const conf = confirm('PERINGATAN KRITIS!\n\nApakah Anda yakin ingin melakukan Factory Reset?\nSeluruh pengaturan (User, Kamera, Lisensi) akan kembali ke kondisi awal (default).\nAnda harus login ulang setelah ini.\n\nLanjutkan?');
            if(conf) {
                try {
                    const res = await authFetch('/api/superadmin/factory-reset', { method: 'POST' });
                    if (res.ok) {
                        alert('Sistem berhasil di-reset ke pengaturan pabrik. Silakan login kembali.');
                        localStorage.removeItem('nvr_auth_token');
                        window.location.reload();
                    } else {
                        alert('Gagal melakukan factory reset.');
                    }
                } catch (err) {
                    alert('Terjadi kesalahan saat factory reset.');
                }
            }
        });
    }



    const btnSaBackup = document.getElementById('btnSaBackup');
    if (btnSaBackup) {
        btnSaBackup.addEventListener('click', async () => {
            const token = localStorage.getItem('nvr_auth_token');
            if (!token) return;
            
            try {
                // Using modern fetch API to trigger download
                const res = await fetch('/api/superadmin/backup', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                
                if (res.ok) {
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = 'arch3r_nvr_backup.json';
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                } else {
                    alert('Gagal mengunduh backup');
                }
            } catch (err) {
                alert('Kesalahan jaringan: ' + err.message);
            }
        });
    }

    const fileSaRestore = document.getElementById('fileSaRestore');
    if (fileSaRestore) {
        fileSaRestore.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            if (!confirm('Peringatan: Me-restore pengaturan akan menimpa seluruh konfigurasi NVR saat ini (Kamera, Akun, Lisensi). Lanjutkan?')) {
                fileSaRestore.value = '';
                return;
            }
            
            const reader = new FileReader();
            reader.onload = async (ev) => {
                try {
                    const jsonPayload = JSON.parse(ev.target.result);
                    const res = await authFetch('/api/superadmin/restore', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(jsonPayload)
                    });
                    
                    const data = await res.json();
                    if (res.ok) {
                        alert(data.message || 'Restore Berhasil!');
                        window.location.reload();
                    } else {
                        alert(data.error || 'Gagal restore data');
                    }
                } catch (err) {
                    alert('Gagal membaca file JSON: ' + err.message);
                }
                fileSaRestore.value = '';
            };
            reader.readAsText(file);
        });
    }
    
    // --- UPDATE SYSTEM LOGIC (OTA & LINUX PIPELINE) ---
    const btnCheckUpdate = document.getElementById('btnSaCheckUpdate');
    const btnExecuteUpdate = document.getElementById('btnSaExecuteUpdate');
    const btnSaveOta = document.getElementById('btnSaSaveOta');
    const updateStatusText = document.getElementById('saUpdateStatusText');
    const updateDescText = document.getElementById('saUpdateDescText');
    const inputOtaUrl = document.getElementById('otaGithubUrl');

    let currentUpdateData = null;

    window.toggleOtaChangelog = function() {
        const box = document.getElementById('saOtaChangelogContainer');
        if (!box) return;
        if (box.style.display === 'none' || !box.style.display) {
            box.style.display = 'block';
            if (!currentUpdateData) {
                window.checkOtaUpdate();
            }
        } else {
            box.style.display = 'none';
        }
    };

    window.openOtaWorkflowModal = function() {
        const modal = document.getElementById('modalOtaWorkflow');
        if (modal) {
            modal.style.setProperty('display', 'flex', 'important');
            modal.classList.add('active');
        }
    };

    window.closeOtaWorkflowModal = function() {
        const modal = document.getElementById('modalOtaWorkflow');
        if (modal) {
            modal.style.setProperty('display', 'none', 'important');
            modal.classList.remove('active');
        }
    };

    window.applyOtaUpdate = function() {
        window.openOtaWorkflowModal();
    };

    window.checkOtaUpdate = async function() {
        const btn = document.getElementById('btnSaCheckUpdate');
        if (btn) btn.textContent = "⏳ Memeriksa...";

        try {
            const res = await authFetch('/api/superadmin/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'check' })
            });
            const data = await res.json();
            currentUpdateData = data;

            if (updateStatusText) {
                const verText = data.latest_version || data.current_version || '9.6.4';
                const isNew = data.update_available || data.isUpdateAvailable;
                updateStatusText.innerHTML = `Versi Terpasang: <span class="badge" style="background:${isNew ? '#f59e0b' : '#2563eb'}; color:#fff;">v${data.current_version || '9.6.4'}</span> ${isNew ? '<span class="badge badge-online">Ada Update: v' + verText + '</span>' : '<span class="badge" style="background:#10b981; color:#fff;">Terbaru</span>'}`;
            }

            if (updateDescText) {
                updateDescText.textContent = data.message || `Sistem berjalan pada commit ${data.git_commit || 'terbaru'} (Branch: ${data.git_branch || 'main'}).`;
            }

            // Sync with Maintenance pane elements if present
            const otaCur = document.getElementById('otaCurrentVer');
            const otaLat = document.getElementById('otaLatestVer');
            const otaBtnApply = document.getElementById('btnApplyOta');
            if (otaCur) otaCur.textContent = `v${data.current_version || '9.6.4'}`;
            if (otaLat) otaLat.textContent = `v${data.latest_version || data.current_version || '9.6.4'}`;
            if (otaBtnApply) otaBtnApply.style.display = 'inline-block';

            // Render changelog list
            const changelogListContainer = document.getElementById('saOtaChangelogList');
            const branchInfo = document.getElementById('otaBranchInfo');
            if (branchInfo && data.git_branch) {
                branchInfo.textContent = `Branch: ${data.git_branch} (${data.git_commit || 'HEAD'})`;
            }

            if (changelogListContainer && Array.isArray(data.changelog)) {
                changelogListContainer.innerHTML = data.changelog.map(c => `
                    <div style="background:rgba(255,255,255,0.03); padding:0.65rem 0.85rem; border-radius:6px; border-left:3px solid #3b82f6;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                            <strong style="color:#93c5fd; font-size:0.85rem;">v${c.version} - ${c.title || 'Pembaruan Sistem'}</strong>
                            <span style="font-size:0.75rem; color:var(--text-muted);">${c.date || ''}</span>
                        </div>
                        <ul style="margin:0; padding-left:1.2rem; font-size:0.78rem; color:#cbd5e1; line-height:1.4;">
                            ${(c.items || []).map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    </div>
                `).join('');
            }

            // Also populate Maintenance Changelog Box
            const otaChangelogBox = document.getElementById('otaChangelogBox');
            if (otaChangelogBox && Array.isArray(data.changelog)) {
                otaChangelogBox.style.display = 'block';
                otaChangelogBox.textContent = data.changelog.map(c => `[v${c.version}] ${c.title}\n` + (c.items || []).map(i => ` - ${i}`).join('\n')).join('\n\n');
            }

            if (btn) btn.textContent = "✅ Diperiksa";
            setTimeout(() => {
                if (btn) btn.textContent = "🔄 Periksa Pembaruan";
            }, 2500);

        } catch (err) {
            console.error("[OTA Check Error]", err);
            if (btn) btn.textContent = "❌ Gagal Memeriksa";
            alert("Gagal memeriksa update: " + err.message);
        }
    };

    window.runOtaPipeline = async function() {
        const btnRun = document.getElementById('btnRunOtaPipeline');
        const consoleWrapper = document.getElementById('otaConsoleWrapper');
        const terminalLog = document.getElementById('otaTerminalLog');
        const spinner = document.getElementById('otaExecutionSpinner');

        const steps = {
            backup: document.getElementById('chkOtaBackup')?.checked ?? true,
            git_pull: document.getElementById('chkOtaGitPull')?.checked ?? true,
            npm_install: document.getElementById('chkOtaNpmInstall')?.checked ?? true,
            pm2_restart: document.getElementById('chkOtaPm2Restart')?.checked ?? true,
            git_reset_hard: document.getElementById('chkOtaGitReset')?.checked ?? false,
            clean_npm_cache: document.getElementById('chkOtaCleanCache')?.checked ?? false,
            reboot: document.getElementById('chkOtaReboot')?.checked ?? false
        };

        if (!steps.git_pull && !steps.git_reset_hard && !steps.npm_install && !steps.pm2_restart && !steps.reboot) {
            alert("Harap pilih setidaknya satu langkah pembaruan untuk dieksekusi.");
            return;
        }

        if (!confirm("Konfirmasi eksekusi alur pembaruan sistem pilihan Anda sekarang?")) {
            return;
        }

        if (consoleWrapper) consoleWrapper.style.display = 'block';
        if (spinner) spinner.style.display = 'inline';
        if (btnRun) {
            btnRun.disabled = true;
            btnRun.textContent = "⏳ Mengeksekusi...";
        }

        if (terminalLog) {
            terminalLog.textContent = `[ARCH3R-OTA] Memulai alur pembaruan sistem...\n[ARCH3R-OTA] Waktu: ${new Date().toLocaleString()}\n`;
        }

        try {
            const res = await authFetch('/api/superadmin/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'execute',
                    steps: steps
                })
            });

            const data = await res.json();

            if (terminalLog && data.logs) {
                terminalLog.textContent += "\n" + data.logs.join("\n");
                terminalLog.scrollTop = terminalLog.scrollHeight;
            }

            if (res.ok && data.success) {
                if (terminalLog) {
                    terminalLog.textContent += `\n\n[ARCH3R-OTA] ✅ SELURUH TAHAPAN SELESAI DENGAN SUKSES!`;
                    terminalLog.scrollTop = terminalLog.scrollHeight;
                }
                if (steps.reboot) {
                    alert("STB sedang melakukan reboot fisik. Sistem akan online kembali dalam 1-2 menit.");
                } else if (steps.pm2_restart) {
                    alert("Pembaruan tuntas! Service NVR telah dimuat ulang (PM2). Halaman akan di-refresh otomatis.");
                    setTimeout(() => window.location.reload(), 2500);
                } else {
                    alert("Alur pembaruan sistem selesai dijalankan.");
                }
                if (btnRun) btnRun.textContent = "✅ Berhasil Dieksekusi";
            } else {
                if (terminalLog) {
                    terminalLog.textContent += `\n\n[ARCH3R-OTA] ❌ GAGAL: ${data.error || 'Terjadi kesalahan pada alur eksekusi'}`;
                    terminalLog.scrollTop = terminalLog.scrollHeight;
                }
                alert("Eksekusi gagal: " + (data.error || 'Silakan cek terminal log'));
                if (btnRun) btnRun.textContent = "❌ Gagal Dieksekusi";
            }
        } catch (err) {
            if (terminalLog) {
                terminalLog.textContent += `\n\n[ARCH3R-OTA] ❌ KESALAHAN JARINGAN/TIMEOUT: ${err.message}\nCatatan: Jika PM2 melakukan reload, server mungkin sempat terputus sesaat. Muat ulang halaman dalam beberapa detik.`;
                terminalLog.scrollTop = terminalLog.scrollHeight;
            }
            alert("Proses eksekusi terputus atau server sedang restart: " + err.message);
            if (btnRun) btnRun.textContent = "🔄 Selesai / Terputus";
        } finally {
            if (spinner) spinner.style.display = 'none';
            if (btnRun) btnRun.disabled = false;
        }
    };

    if (btnSaveOta) {
        btnSaveOta.addEventListener('click', async (e) => {
            e.preventDefault();
            const otaUrl = inputOtaUrl.value.trim();
            btnSaveOta.textContent = "⏳ Menyimpan...";
            try {
                const res = await authFetch('/api/superadmin/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ota_github_url: otaUrl })
                });
                if (res.ok) {
                    btnSaveOta.textContent = "✅ Tersimpan";
                    alert("Berhasil! URL OTA Update telah disimpan.");
                    setTimeout(() => btnSaveOta.textContent = "💾 Simpan URL", 2000);
                } else {
                    btnSaveOta.textContent = "❌ Gagal";
                    alert("Gagal menyimpan URL OTA.");
                }
            } catch (err) {
                btnSaveOta.textContent = "❌ Error";
                alert("Terjadi kesalahan: " + err.message);
            }
        });
    }

    if (btnCheckUpdate) {
        btnCheckUpdate.addEventListener('click', window.checkOtaUpdate);
    }

    if (btnExecuteUpdate) {
        btnExecuteUpdate.addEventListener('click', window.openOtaWorkflowModal);
    }

checkAuth();
});
