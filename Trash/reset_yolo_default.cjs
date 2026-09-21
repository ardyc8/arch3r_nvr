const fs = require('fs');

console.log("Resetting Addon YOLO AI to clean default interface...");

let html = fs.readFileSync('public/index.html', 'utf8');

// Update version to 10.2.8
html = html.replace(/Arch3r NVR Ver\. 10\.\d+\.\d+/g, 'Arch3r NVR Ver. 10.2.8');

// Target the AI Workstation Card area in index.html
const startTag = '<!-- Workstation Card -->';
const endTag = '<!-- ======================================================== -->\n                            <div id="modal-ai-settings"';

const startIndex = html.indexOf(startTag);
const endIndex = html.indexOf(endTag);

if (startIndex !== -1 && endIndex !== -1) {
    const cleanYoloHTML = `<!-- Workstation Card -->
                    <div class="ai-workstation-card" style="background:var(--surface); border-radius:10px; border:1px solid var(--border); overflow:hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                        <div style="padding:1rem 1.25rem; overflow-y:auto; flex:1;">
                            <!-- DEFAULT CLEAN YOLO AI WORKSTATION -->
                            <div id="ai-tab-pane-live" style="display:block;">
                                <!-- Standard YOLO Toolbar -->
                                <div style="background:rgba(15,23,42,0.8); border:1px solid var(--border); border-radius:8px; padding:0.85rem 1rem; margin-bottom:0.85rem;">
                                    <div style="display:flex; gap:0.85rem; align-items:center; flex-wrap:wrap; justify-content:space-between;">
                                        <div style="display:flex; gap:0.85rem; align-items:center; flex:1; min-width:300px; flex-wrap:wrap;">
                                            <!-- Pilih Kamera -->
                                            <div style="flex:1; min-width:180px;">
                                                <label style="display:block; margin-bottom:0.25rem; font-size:0.78rem; font-weight:600; color:var(--text-muted);">Pilih Kamera NVR:</label>
                                                <select id="ai-cam-select" onchange="loadCamStreamForAI()" class="form-control" style="width:100%; padding:0.4rem 0.6rem; background:rgba(0,0,0,0.5); color:white; border:1px solid var(--border); border-radius:5px; font-size:0.85rem;">
                                                    <option value="">-- Memuat Kamera --</option>
                                                </select>
                                            </div>
                                            <!-- Toggle Aktifkan YOLO -->
                                            <div style="display:flex; align-items:center; gap:0.5rem; margin-top:1.2rem;">
                                                <label style="display:flex; align-items:center; gap:0.4rem; font-size:0.85rem; font-weight:700; color:#38bdf8; cursor:pointer;">
                                                    <input type="checkbox" id="ai-cam-enabled" checked style="accent-color:#2563eb; width:18px; height:18px;" onchange="updateCamAIActiveState()"> 
                                                    <span>Aktifkan YOLO AI</span>
                                                </label>
                                            </div>
                                            <!-- Resolusi Inferensi (imgsz) -->
                                            <div style="flex:1; min-width:160px;">
                                                <label style="display:block; margin-bottom:0.25rem; font-size:0.78rem; font-weight:600; color:var(--text-muted);">Resolusi AI (imgsz):</label>
                                                <select id="ai-imgsz-select" class="form-control" style="width:100%; padding:0.4rem 0.6rem; background:rgba(0,0,0,0.5); color:#38bdf8; border:1px solid #38bdf8; border-radius:5px; font-size:0.82rem; font-weight:600;">
                                                    <option value="256">256x256 px (Ultra-Low CPU)</option>
                                                    <option value="320" selected>320x320 px (Default Standar STB)</option>
                                                    <option value="416">416x416 px (Tinggi)</option>
                                                </select>
                                            </div>
                                            <!-- Threshold Akurasi -->
                                            <div style="flex:1; min-width:170px;">
                                                <label style="display:block; margin-bottom:0.25rem; font-size:0.78rem; font-weight:600; color:var(--text-muted);">Akurasi Min (Confidence): <span id="ai-conf-val" style="color:#38bdf8; font-weight:700;">50%</span></label>
                                                <input type="range" id="ai-conf-slider" min="20" max="90" value="50" step="5" style="width:100%; accent-color:#38bdf8; cursor:pointer;" oninput="document.getElementById('ai-conf-val').textContent = this.value + '%'">
                                            </div>
                                        </div>
                                        
                                        <!-- Actions -->
                                        <div style="display:flex; gap:0.5rem; align-items:center; margin-top:0.5rem;">
                                            <button type="button" class="btn btn-sm btn-secondary" onclick="loadCamStreamForAI()" style="font-size:0.8rem;" title="Segarkan Siaran Live">🔄 Segarkan</button>
                                            <button type="button" class="btn btn-sm btn-primary" onclick="saveDefaultYoloConfig()" style="background:#2563eb; border-color:#3b82f6; font-size:0.8rem; font-weight:700;" title="Simpan Konfigurasi YOLO">💾 Simpan Konfigurasi</button>
                                        </div>
                                    </div>

                                    <!-- Target Objek Filter -->
                                    <div style="margin-top:0.75rem; padding-top:0.6rem; border-top:1px solid rgba(255,255,255,0.08); display:flex; gap:1rem; align-items:center; flex-wrap:wrap;">
                                        <span style="font-size:0.78rem; font-weight:700; color:#cbd5e1;">Target Deteksi Objek YOLO:</span>
                                        <label style="font-size:0.8rem; color:#f8fafc; cursor:pointer; display:flex; align-items:center; gap:0.3rem;">
                                            <input type="checkbox" id="yolo-target-person" checked style="accent-color:#2563eb;"> 👤 Manusia (Person)
                                        </label>
                                        <label style="font-size:0.8rem; color:#f8fafc; cursor:pointer; display:flex; align-items:center; gap:0.3rem;">
                                            <input type="checkbox" id="yolo-target-car" checked style="accent-color:#2563eb;"> 🚗 Mobil (Car)
                                        </label>
                                        <label style="font-size:0.8rem; color:#f8fafc; cursor:pointer; display:flex; align-items:center; gap:0.3rem;">
                                            <input type="checkbox" id="yolo-target-motorcycle" checked style="accent-color:#2563eb;"> 🛵 Motor (Motorcycle)
                                        </label>
                                        <label style="font-size:0.8rem; color:#f8fafc; cursor:pointer; display:flex; align-items:center; gap:0.3rem;">
                                            <input type="checkbox" id="yolo-target-bicycle" checked style="accent-color:#2563eb;"> 🚲 Sepeda (Bicycle)
                                        </label>
                                    </div>
                                </div>

                                <!-- Default Video Feed & Live Bounding Box Canvas -->
                                <div style="position:relative; width:100%; aspect-ratio:16/9; max-height:480px; min-height:280px; background:#070b14; border:1px solid #1e293b; border-radius:8px; overflow:hidden; display:flex; align-items:center; justify-content:center; box-shadow:inset 0 0 20px rgba(0,0,0,0.8); margin-bottom:0.85rem;">
                                    
                                    <!-- Badge Status -->
                                    <div style="position:absolute; top:12px; left:12px; z-index:10; background:rgba(15,23,42,0.85); border:1px solid rgba(56,189,248,0.4); padding:4px 10px; border-radius:6px; font-size:0.75rem; color:#38bdf8; font-family:monospace; font-weight:700; display:flex; align-items:center; gap:6px;">
                                        <span style="width:8px; height:8px; border-radius:50%; background:#22c55e; display:inline-block; box-shadow:0 0 8px #22c55e;"></span>
                                        LIVE YOLO FEED
                                    </div>

                                    <!-- Video Element -->
                                    <video id="ai-stream-preview" autoplay muted playsinline style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:contain; z-index:1; background:#070b14;"></video>
                                    
                                    <!-- Bounding Box Overlay Canvas -->
                                    <canvas id="ai-draw-canvas" style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:2; pointer-events:none;"></canvas>
                                </div>

                                <!-- Default Telemetry Terminal Log -->
                                <div style="background:#090d16; border:1px solid #1e293b; border-radius:8px; padding:0.75rem 1rem;">
                                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
                                        <span style="font-size:0.78rem; font-weight:700; color:#94a3b8; display:flex; align-items:center; gap:0.4rem;">
                                            <span>📟</span> Telemetry Output Log Deteksi YOLO
                                        </span>
                                        <button type="button" onclick="clearAITelemetryLog()" style="background:none; border:none; color:#f87171; font-size:0.72rem; cursor:pointer;">Bersihkan Log</button>
                                    </div>
                                    <div id="ai-telemetry-log" style="height:90px; overflow-y:auto; font-family:monospace; font-size:0.75rem; color:#38bdf8; background:rgba(0,0,0,0.5); padding:0.5rem; border-radius:5px; border:1px solid rgba(255,255,255,0.05); line-height:1.4;">
                                        <div style="color:#64748b;">[Sistem YOLO AI Aktif - Menunggu deteksi objek pada siaran video live...]</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Hidden Modal AI Settings (Restored to Clean Default State) -->
                    <div id="modal-ai-settings" style="display:none;"></div>
                    `;

    html = html.substring(0, startIndex) + cleanYoloHTML + html.substring(endIndex + endTag.length);
    fs.writeFileSync('public/index.html', html, 'utf8');
    console.log("public/index.html cleaned successfully!");
} else {
    console.error("Could not find start or end tags in public/index.html");
}
