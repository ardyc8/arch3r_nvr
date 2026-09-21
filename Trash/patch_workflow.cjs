const fs = require('fs');

console.log("Applying Ver 10.2.7 Studio Editor 3-Step Workflow Patch...");

// 1. Read index.html
let html = fs.readFileSync('public/index.html', 'utf8');

// Update version in title
html = html.replace(/Arch3r NVR Ver\. 10\.\d+\.\d+/g, 'Arch3r NVR Ver. 10.2.7');

// Update subtabs navigation in modal
const oldSubtabsRegex = /<div class="ai-config-tab-container"[^>]*>[\s\S]*?<div style="display:flex; border-bottom:1px solid var\(--border\); background:rgba\(10,15,28,0\.85\)[^>]*>[\s\S]*?<\/div>/;

const newSubtabsHTML = `<div class="ai-config-tab-container" style="background:rgba(15,23,42,0.6); border:1px solid var(--border); border-radius:8px; overflow:hidden;">
                                <!-- Sub-tabs bar (3-Step Workflow + Tools) -->
                                <div style="display:flex; border-bottom:1px solid var(--border); background:rgba(10,15,28,0.85); overflow-x:auto; padding:0 0.5rem; align-items:center;">
                                    <button type="button" id="ai-subtab-btn-step1_cam" onclick="switchAISubTab('step1_cam')" style="padding:0.6rem 0.95rem; font-size:0.82rem; font-weight:700; border:none; background:none; color:#38bdf8; border-bottom:2px solid #38bdf8; cursor:pointer; display:flex; align-items:center; gap:0.35rem; white-space:nowrap;">
                                        📹 Tahap 1: Kamera & Digital Zoom
                                    </button>
                                    <button type="button" id="ai-subtab-btn-zones" onclick="switchAISubTab('zones')" style="padding:0.6rem 0.95rem; font-size:0.82rem; font-weight:700; border:none; background:none; color:var(--text-muted); border-bottom:2px solid transparent; cursor:pointer; display:flex; align-items:center; gap:0.35rem; white-space:nowrap;">
                                        🎯 Tahap 2: Gambar ROI & Layer
                                    </button>
                                    <button type="button" id="ai-subtab-btn-prompt" onclick="switchAISubTab('prompt')" style="padding:0.6rem 0.95rem; font-size:0.82rem; font-weight:700; border:none; background:none; color:var(--text-muted); border-bottom:2px solid transparent; cursor:pointer; display:flex; align-items:center; gap:0.35rem; white-space:nowrap;">
                                        🧠 Tahap 3: Output Prompt & Alarm
                                    </button>
                                    <button type="button" id="ai-subtab-btn-esp" onclick="switchAISubTab('esp')" style="padding:0.6rem 0.95rem; font-size:0.82rem; font-weight:700; border:none; background:none; color:var(--text-muted); border-bottom:2px solid transparent; cursor:pointer; display:flex; align-items:center; gap:0.35rem; white-space:nowrap;">
                                        📡 Alarm ESP8266 IoT
                                    </button>
                                    <button type="button" id="ai-subtab-btn-telegram" onclick="switchAISubTab('telegram')" style="padding:0.6rem 0.95rem; font-size:0.82rem; font-weight:700; border:none; background:none; color:var(--text-muted); border-bottom:2px solid transparent; cursor:pointer; display:flex; align-items:center; gap:0.35rem; white-space:nowrap;">
                                        ✈️ Telegram Bot
                                    </button>
                                    <button type="button" id="ai-subtab-btn-sim" onclick="switchAISubTab('sim')" style="padding:0.6rem 0.95rem; font-size:0.82rem; font-weight:700; border:none; background:none; color:var(--text-muted); border-bottom:2px solid transparent; cursor:pointer; display:flex; align-items:center; gap:0.35rem; white-space:nowrap;">
                                        🧪 Lab Simulasi
                                    </button>
                                    <button type="button" id="ai-subtab-btn-market" onclick="switchAISubTab('market')" style="padding:0.6rem 0.95rem; font-size:0.82rem; font-weight:700; border:none; background:none; color:var(--text-muted); border-bottom:2px solid transparent; cursor:pointer; display:flex; align-items:center; gap:0.35rem; white-space:nowrap;">
                                        🏪 Preset Market .yai
                                    </button>
                                </div>`;

html = html.replace(oldSubtabsRegex, newSubtabsHTML);

// Add Step 1 Pane before zones pane if not present
if (!html.includes('id="ai-subpane-step1_cam"')) {
    const step1PaneHTML = `
                                    <!-- SUB-PANE STEP 1: CAMERA SELECT, RESOLUTION & DIGITAL ZOOM FOKUS -->
                                    <div id="ai-subpane-step1_cam" style="display:block;">
                                        <div style="background:rgba(0,0,0,0.3); border:1px solid var(--border); border-radius:8px; padding:0.85rem 1rem; margin-bottom:0.85rem;">
                                            <strong style="font-size:0.9rem; color:#38bdf8; display:flex; align-items:center; gap:0.4rem; margin-bottom:0.6rem;">
                                                <span>📹</span> Tahap 1: Pilih Kamera, Ukuran Resolusi Inferensi & Digital Zoom Fokus
                                            </strong>
                                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:0.85rem; align-items:center;">
                                                <div>
                                                    <label style="display:block; margin-bottom:0.25rem; font-size:0.78rem; font-weight:600; color:#cbd5e1;">Pilih Kamera NVR:</label>
                                                    <select id="ai-step1-cam-select" onchange="syncCamSelectStep1(this.value)" class="form-control" style="width:100%; padding:0.4rem 0.6rem; background:rgba(0,0,0,0.5); color:white; border:1px solid var(--border); border-radius:5px; font-size:0.85rem;">
                                                        <option value="">-- Memuat Kamera NVR --</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label style="display:block; margin-bottom:0.25rem; font-size:0.78rem; font-weight:600; color:#cbd5e1;">Ukuran Resolusi Inferensi (imgsz):</label>
                                                    <select id="ai-step1-imgsz-select" onchange="syncImgSzStep1(this.value)" class="form-control" style="width:100%; padding:0.4rem 0.6rem; background:rgba(0,0,0,0.5); color:#38bdf8; border:1px solid #38bdf8; border-radius:5px; font-size:0.85rem; font-weight:700;">
                                                        <option value="256">256x256 px (Ultra-Low / Super Hemat ARM CPU)</option>
                                                        <option value="320" selected>320x320 px (Standar STB Armbian Anti-Lag)</option>
                                                        <option value="416">416x416 px (Maksimal Armbian STB)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label style="display:block; margin-bottom:0.25rem; font-size:0.78rem; font-weight:600; color:#cbd5e1;">Digital Zoom & Pan Fokus:</label>
                                                    <div style="display:flex; gap:0.4rem; align-items:center;">
                                                        <button type="button" class="btn btn-sm btn-secondary" onclick="adjustDigitalZoom(-0.25)" style="font-size:0.78rem; font-weight:700;">🔍- Zoom Out</button>
                                                        <span id="ai-zoom-level-badge" style="font-size:0.82rem; font-weight:700; color:#60a5fa; min-width:48px; text-align:center;">100%</span>
                                                        <button type="button" class="btn btn-sm btn-secondary" onclick="adjustDigitalZoom(0.25)" style="font-size:0.78rem; font-weight:700;">🔍+ Zoom In</button>
                                                        <button type="button" class="btn btn-sm btn-secondary" onclick="resetDigitalZoom()" style="font-size:0.75rem; color:#f87171;">🔄 Reset</button>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <!-- Pan Controls Bar -->
                                            <div style="display:flex; gap:0.5rem; align-items:center; margin-top:0.65rem; padding-top:0.6rem; border-top:1px solid rgba(255,255,255,0.06); flex-wrap:wrap;">
                                                <span style="font-size:0.76rem; color:var(--text-muted); font-weight:600;">Posisi Geser Fokus (Pan):</span>
                                                <button type="button" class="btn btn-sm btn-secondary" onclick="panDigitalZoom('left')" style="padding:0.2rem 0.55rem; font-size:0.75rem;">⬅️ Kiri</button>
                                                <button type="button" class="btn btn-sm btn-secondary" onclick="panDigitalZoom('right')" style="padding:0.2rem 0.55rem; font-size:0.75rem;">➡️ Kanan</button>
                                                <button type="button" class="btn btn-sm btn-secondary" onclick="panDigitalZoom('up')" style="padding:0.2rem 0.55rem; font-size:0.75rem;">⬆️ Atas</button>
                                                <button type="button" class="btn btn-sm btn-secondary" onclick="panDigitalZoom('down')" style="padding:0.2rem 0.55rem; font-size:0.75rem;">⬇️ Bawah</button>
                                                <span style="font-size:0.72rem; color:#34d399; margin-left:auto;">✓ Zoom & Pan akan diterapkan ke Editor ROI Tahap 2</span>
                                            </div>
                                        </div>
                                        
                                        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.2); padding:0.6rem 0.8rem; border-radius:6px; border:1px solid var(--border);">
                                            <span style="font-size:0.78rem; color:#94a3b8;">Langkah 1 Selesai. Klik tombol untuk mulai menggambar kotak ROI di area fokus.</span>
                                            <button type="button" class="btn btn-sm btn-primary" onclick="switchAISubTab('zones')" style="background:#2563eb; font-weight:700; padding:0.4rem 1rem;">
                                                Lanjut Ke Tahap 2: Gambar ROI ➡️
                                            </button>
                                        </div>
                                    </div>
`;
    html = html.replace('<div id="ai-subpane-zones" style="display:block;">', step1PaneHTML + '\n<div id="ai-subpane-zones" style="display:none;">');
}

fs.writeFileSync('public/index.html', html, 'utf8');
console.log("public/index.html updated successfully!");
