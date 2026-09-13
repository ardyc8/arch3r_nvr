const fs = require('fs');

let html = fs.readFileSync('public/admin.html', 'utf8');

const oldLogsBlock = `<div id="view-logs" class="view-pane">
                <div class="content-wrapper" style="padding: 2rem; height:100%; display:flex; flex-direction:column;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                        <h2 style="margin:0;">System Logs</h2>
                        <button id="btnRefreshLogs" class="btn btn-secondary">Refresh</button>
                    </div>
                    <div id="logsContainer" style="flex:1; background:#000; border:1px solid var(--border); border-radius:8px; padding:1rem; overflow-y:auto; font-family:monospace; font-size:0.85rem; color:#a3be8c;">
                        Memuat logs...
                    </div>
                </div>
            </div>`;

const newLogsBlock = `<div id="view-logs" class="view-pane">
                <div class="content-wrapper" style="padding: 2rem; height:100%; display:flex; flex-direction:column; max-height:100vh;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:10px;">
                        <h2 style="margin:0;">Riwayat Log Sistem</h2>
                        <div style="display:flex; gap:10px; align-items:center;">
                            <select id="logCategoryFilter" class="form-control" style="width:auto; padding:4px 8px; font-size:0.85rem;">
                                <option value="ALL">Semua Kategori</option>
                                <option value="SYSTEM">Sistem</option>
                                <option value="CAMERA">Kamera</option>
                                <option value="STORAGE">Penyimpanan</option>
                                <option value="SECURITY">Keamanan & Akun</option>
                            </select>
                            <select id="logTimeFilter" class="form-control" style="width:auto; padding:4px 8px; font-size:0.85rem;">
                                <option value="0">Semua Waktu (Maks 60 Hari)</option>
                                <option value="1">1 Hari Terakhir</option>
                                <option value="7">7 Hari Terakhir</option>
                                <option value="30">30 Hari Terakhir</option>
                            </select>
                            <button id="btnRefreshLogs" class="btn btn-secondary" style="padding:4px 12px; font-size:0.85rem;">🔄 Segarkan</button>
                        </div>
                    </div>
                    <div id="logsContainer" style="flex:1; background:#0f172a; border:1px solid var(--border); border-radius:8px; padding:1rem; overflow-y:auto; font-family:monospace; font-size:0.85rem; color:#cbd5e1; display:flex; flex-direction:column; gap:8px;">
                        Memuat logs...
                    </div>
                </div>
            </div>`;

html = html.replace(oldLogsBlock, newLogsBlock);
fs.writeFileSync('public/admin.html', html);

// Now patch script.js to handle the logs rendering and filtering
