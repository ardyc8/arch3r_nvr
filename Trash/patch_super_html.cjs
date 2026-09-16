const fs = require('fs');
let code = fs.readFileSync('public/superadmin.html', 'utf8');

// Inject nav item
const navTarget = `<a href="#system" class="nav-item" data-target="view-system">
                    <span class="icon">⚙️</span>
                    <span class="text">Pengaturan Sistem</span>
                </a>`;
const navInject = `<a href="#system" class="nav-item" data-target="view-system">
                    <span class="icon">⚙️</span>
                    <span class="text">Pengaturan Sistem</span>
                </a>
                <a href="#maintenance" class="nav-item" data-target="view-maintenance">
                    <span class="icon">🛠️</span>
                    <span class="text">Maintenance & OTA</span>
                </a>`;
code = code.replace(navTarget, navInject);

// Inject View before final closing main
const viewTarget = `</main>`;
const viewInject = `<!-- TAB: MAINTENANCE -->
            <div id="view-maintenance" class="view-section" style="display:none;">
                <div class="section-header">
                    <h2>🛠️ Maintenance & OTA Update</h2>
                    <p>Perawatan sistem level Superadmin dan pembaruan firmware (OTA).</p>
                </div>
                
                <div class="card-grid">
                    <div class="card" style="grid-column: 1 / -1;">
                        <div class="card-header">
                            <h3 style="color:#10b981;">⬇️ OTA Update Firmware</h3>
                        </div>
                        <div class="card-body">
                            <div style="background:var(--bg-dark); padding:1rem; border-radius:8px; border:1px solid var(--border); margin-bottom:1rem;">
                                <p style="margin:0; font-size:0.9rem; color:var(--text-muted);">Memeriksa pembaruan otomatis dari repositori GitHub...</p>
                                <hr style="border-color:var(--border); margin:0.75rem 0;">
                                <div id="otaStatusBox" style="font-size:0.9rem;">
                                    <div><strong>Versi Saat Ini:</strong> <span id="otaCurrentVer" style="color:var(--text-muted);">Memuat...</span></div>
                                    <div><strong>Versi Terbaru:</strong> <span id="otaLatestVer" style="color:var(--text-muted);">Memuat...</span></div>
                                </div>
                                <div id="otaChangelogBox" style="margin-top:1rem; display:none; background:rgba(0,0,0,0.3); padding:0.75rem; border-radius:6px; font-size:0.85rem; border:1px solid var(--border-highlight); white-space:pre-wrap; color:#9ca3af;"></div>
                            </div>
                            <div style="display:flex; gap:0.75rem;">
                                <button class="btn btn-secondary" onclick="checkOtaUpdate()">Cek Pembaruan</button>
                                <button class="btn btn-primary" id="btnApplyOta" style="display:none;" onclick="applyOtaUpdate()">🚀 Update Sistem Sekarang</button>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3>Backup Full Data</h3>
                        </div>
                        <div class="card-body">
                            <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:1rem;">Unduh konfigurasi lengkap NVR (semua gedung, admin, kamera, dan lisensi).</p>
                            <button class="btn btn-primary" onclick="window.location.href='/api/maintenance/backup?token=' + localStorage.getItem('arch3r_token')">⬇️ Download Backup Master</button>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <h3 style="color:#f59e0b;">Reboot STB (Restart)</h3>
                        </div>
                        <div class="card-body">
                            <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:1rem;">Mulai ulang paksa perangkat STB atau layanan NVR secara keseluruhan.</p>
                            <button class="btn btn-warning" onclick="appMaintenanceReboot()">🔄 Reboot Sistem Sekarang</button>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <h3 style="color:#ef4444;">Factory Reset</h3>
                        </div>
                        <div class="card-body">
                            <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:1rem;">Hapus permanen SEMUA Administrator, Kamera, dan User. Lisensi tetap dipertahankan.</p>
                            <button class="btn btn-danger" onclick="appMaintenanceFactoryReset()">⚠️ Factory Reset</button>
                        </div>
                    </div>
                </div>
            </div>
            
        </main>`;
code = code.replace(viewTarget, viewInject);

fs.writeFileSync('public/superadmin.html', code);
console.log("Superadmin HTML patched.");
