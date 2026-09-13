const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

const newScannerUi = `
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                            <h3 style="font-size:1rem; margin:0;">Daftar Kamera Terpasang</h3>
                            <button onclick="document.getElementById('advancedScanBox').style.display = 'block';" class="btn btn-secondary" style="font-size:0.8rem;">🔍 Advanced IP Scanner</button>
                        </div>
                        
                        <!-- Advanced Scanner Box -->
                        <div id="advancedScanBox" style="display:none; background:var(--surface); padding:1rem; border:1px solid var(--border); border-radius:6px; margin-bottom:1rem;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                                <h4 style="margin:0; font-size:0.95rem; color:#60a5fa;">Advanced ONVIF/RTSP Scanner</h4>
                                <button onclick="document.getElementById('advancedScanBox').style.display='none'" class="btn-sm btn-secondary" style="padding:2px 8px;">✕ Tutup</button>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group flex-1">
                                    <label>Start IP</label>
                                    <input type="text" id="scanStartIp" placeholder="192.168.1.1" value="192.168.1.1">
                                </div>
                                <div class="form-group flex-1">
                                    <label>End IP</label>
                                    <input type="text" id="scanEndIp" placeholder="192.168.1.254" value="192.168.1.254">
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Target Ports (Pisahkan dengan koma)</label>
                                <input type="text" id="scanPorts" placeholder="80, 8080, 8899, 554" value="80, 8080, 8899, 554">
                                <small style="color:var(--text-muted);">Tidak perlu modul khusus Armbian, NVR akan melakukan TCP Ping internal.</small>
                            </div>
                            
                            <button id="btnStartAdvancedScan" class="btn btn-primary w-full" style="margin-top:0.5rem;">Mulai Scanning Jaringan</button>
                            
                            <div id="scanResults" style="display:none; margin-top:1rem; border-top:1px solid var(--border); padding-top:1rem;">
                                <h4 style="margin:0 0 0.5rem 0; font-size:0.9rem;">Hasil Scan Jaringan</h4>
                                <div id="scanStatus" style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.5rem;">Menunggu...</div>
                                <ul id="scanList" style="list-style:none; padding:0; margin:0; font-size:0.85rem;"></ul>
                            </div>
                        </div>
`;

html = html.replace(/<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">[\s\S]*?<div id="scanResults"[\s\S]*?<\/ul>\s*<\/div>/, newScannerUi.trim());
fs.writeFileSync('public/index.html', html);
console.log('Scanner UI updated in index.html');
