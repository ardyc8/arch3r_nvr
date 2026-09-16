const fs = require('fs');
let code = fs.readFileSync('public/index.html', 'utf8');

// Inject nav item
const navTarget = `<a href="#about" class="nav-item" data-target="view-about">
                    <span class="icon">ℹ️</span>
                    <span class="text">Tentang</span>
                </a>`;
const navInject = `<a href="#maintenance" class="nav-item" data-target="view-maintenance">
                    <span class="icon">🛠️</span>
                    <span class="text">Maintenance</span>
                </a>
                <a href="#about" class="nav-item" data-target="view-about">
                    <span class="icon">ℹ️</span>
                    <span class="text">Tentang</span>
                </a>`;
code = code.replace(navTarget, navInject);

// Inject View
const viewTarget = `<!-- TAB: ABOUT -->`;
const viewInject = `<!-- TAB: MAINTENANCE -->
            <div id="view-maintenance" class="view-section" style="display:none;">
                <div class="section-header">
                    <h2>🛠️ Sistem Maintenance</h2>
                    <p>Perawatan dan pemulihan sistem NVR.</p>
                </div>
                
                <div class="card-grid">
                    <div class="card">
                        <div class="card-header">
                            <h3>Backup Data</h3>
                        </div>
                        <div class="card-body">
                            <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:1rem;">Unduh konfigurasi database NVR Anda saat ini sebagai cadangan (termasuk daftar kamera & user).</p>
                            <button class="btn btn-primary" onclick="window.location.href='/api/maintenance/backup?token=' + localStorage.getItem('arch3r_token')">⬇️ Download Backup Database</button>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <h3 style="color:#f59e0b;">Reboot STB (Restart)</h3>
                        </div>
                        <div class="card-body">
                            <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:1rem;">Mulai ulang paksa perangkat STB atau layanan NVR secara keseluruhan. Semua koneksi kamera akan terputus sesaat.</p>
                            <button class="btn btn-warning" onclick="appMaintenanceReboot()">🔄 Reboot Sistem Sekarang</button>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <h3 style="color:#ef4444;">Reset Data Admin</h3>
                        </div>
                        <div class="card-body">
                            <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:1rem;">Hapus secara permanen semua Kamera dan User yang Anda buat. Tidak mempengaruhi pengaturan Superadmin/Lisensi.</p>
                            <button class="btn btn-danger" onclick="appMaintenanceReset()">⚠️ Reset Semua Data Saya</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- TAB: ABOUT -->`;
code = code.replace(viewTarget, viewInject);

fs.writeFileSync('public/index.html', code);
console.log("Admin HTML patched.");
