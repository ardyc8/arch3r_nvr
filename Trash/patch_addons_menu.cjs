const fs = require('fs');

function patchHTML(filePath) {
    if (!fs.existsSync(filePath)) return;
    let html = fs.readFileSync(filePath, 'utf8');
    
    // 1. Add Navigation Link (Addons)
    if (!html.includes('view-addons')) {
        const navTarget = `<a href="#about"`;
        const navInject = `<a href="#addons" class="nav-item" data-target="view-addons">
                    <span class="icon">🧩</span>
                    <span class="text">Addons (AI Smart)</span>
                </a>
                <a href="#about"`;
        html = html.replace(navTarget, navInject);
    }

    // 2. Add View Section for Addons
    if (!html.includes('id="view-addons"')) {
        const viewTarget = `<!-- TAB: ABOUT -->`;
        const viewInject = `<!-- TAB: ADDONS -->
            <div id="view-addons" class="view-section" style="display:none;">
                <div class="section-header">
                    <h2>🧩 Addons (AI Smart Detection)</h2>
                    <p>Konfigurasi fitur kecerdasan buatan, YOLOv8 Object Detection, dan deteksi gerakan berbasis grid.</p>
                </div>
                
                <div class="card" style="margin-bottom:1.5rem;">
                    <div class="card-header">
                        <h3>Konfigurasi Grid Deteksi AI</h3>
                    </div>
                    <div class="card-body">
                        <div class="form-group" style="margin-bottom:1rem;">
                            <label>Pilih Kamera untuk AI Analysis</label>
                            <select id="aiCameraSelect" class="form-control"></select>
                        </div>
                        
                        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">
                            Klik atau seret (drag) kursor pada video di bawah ini untuk mengaktifkan petak grid yang akan dimonitor oleh AI (Area berwarna merah).
                        </p>
                        
                        <!-- AI Grid Player -->
                        <div id="aiPlayerContainer" style="position:relative; width:100%; max-width:640px; aspect-ratio:16/9; background:#000; border:1px solid #444; border-radius:8px; overflow:hidden;">
                            <video id="aiVideoPlayer" style="width:100%; height:100%; object-fit:contain;" autoplay muted></video>
                            <canvas id="aiGridCanvas" style="position:absolute; top:0; left:0; width:100%; height:100%; cursor:crosshair;"></canvas>
                        </div>
                        
                        <div style="margin-top:1rem; display:flex; gap:0.5rem;">
                            <button id="btnAiGridClear" class="btn btn-secondary">Bersihkan Grid</button>
                            <button id="btnAiGridSave" class="btn btn-primary">Simpan Area Deteksi</button>
                        </div>
                        <div id="aiStatusMsg" style="margin-top:0.5rem; font-size:0.85rem; color:#10b981;"></div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h3>Status Service AI (Python)</h3>
                    </div>
                    <div class="card-body">
                        <p style="font-size:0.85rem; color:var(--text-muted);">
                            Modul YOLOv8 berjalan sebagai service terpisah (Python) untuk menjaga performa Node.js. Pastikan script <code>addons/ai_yolo_service.py</code> telah dijalankan di server STB Anda.
                        </p>
                        <div style="background:var(--bg-dark); padding:1rem; border-radius:6px; font-family:monospace; font-size:0.85rem;">
                            $ pip install fastapi uvicorn opencv-python ultralytics<br>
                            $ python3 addons/ai_yolo_service.py
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- TAB: ABOUT -->`;
        html = html.replace(viewTarget, viewInject);
    }
    
    fs.writeFileSync(filePath, html);
    console.log(`Patched ${filePath}`);
}

patchHTML('public/index.html');
patchHTML('public/superadmin.html');
