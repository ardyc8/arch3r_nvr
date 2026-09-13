const fs = require('fs');
let code = fs.readFileSync('public/index.html', 'utf8');

const newMonitor = `<div id="view-monitor" class="view-pane active">
                <div id="monitorWrapper" class="grid-wrapper" style="position:relative; width: 100%; height: 100%; display: flex; flex-direction: column; background: #000; padding: 0;">
                    
                    <!-- Top Bar: Layout & Channels -->
                    <div style="display:flex; flex-direction:column; background: var(--surface); z-index: 10; border-bottom:1px solid var(--border);">
                        <div style="display:flex; justify-content:space-between; align-items:center; padding: 0.5rem 1rem;">
                            <div style="display:flex; align-items:center; gap:0.5rem;">
                                <span style="font-size:0.85rem; color:var(--text-muted);">Layout:</span>
                                <button class="btn-sm btn-secondary grid-btn active" data-grid="1" style="background:#2563eb; color:white;">1x1</button>
                                <button class="btn-sm btn-secondary grid-btn" data-grid="4">2x2</button>
                                <button class="btn-sm btn-secondary grid-btn" data-grid="9">3x3</button>
                                <button class="btn-sm btn-secondary grid-btn" data-grid="16">4x4</button>
                            </div>
                            <div style="display:flex; gap:0.5rem;">
                                <button class="btn-sm btn-primary" onclick="window.toggleGridFullscreen('monitorWrapper')">⛶ Fullscreen</button>
                                <button id="btnReloadStreams" class="btn-sm btn-secondary" title="Muat ulang stream">🔄 Refresh</button>
                            </div>
                        </div>
                        <div id="channelBar" style="display:flex; gap:0.5rem; flex-wrap:wrap; padding: 0 1rem 0.5rem 1rem;">
                            <!-- JS akan merender tombol All, CH1, CH2, dst. -->
                        </div>
                    </div>
                    
                    <!-- Video Grid Area -->
                    <div style="position:relative; flex:1; min-height:0; display:flex; padding: 8px;">
                        <div id="videoGrid" class="video-grid grid-1" style="flex:1; width:100%;"></div>
                    </div>

                    <!-- PTZ Controller (Di Bawah Halaman) -->
                    <div id="ptzPanel" style="background: var(--surface); border-top: 1px solid var(--border); padding: 0.75rem; display: flex; justify-content: center; align-items: center; gap: 1rem;">
                        <span style="font-weight:bold; color:var(--text-muted); font-size:13px;">PTZ Control:</span>
                        <div id="ptzController" class="ptz-controller" style="display:none; grid-template-columns: repeat(3, 35px); grid-template-rows: repeat(3, 35px); gap:4px; align-items:center; justify-items:center;">
                            <div></div>
                            <button class="ptz-btn" style="width:100%; height:100%;" onclick="window.ptzMoveSelected('up')">▲</button>
                            <div></div>
                            <button class="ptz-btn" style="width:100%; height:100%;" onclick="window.ptzMoveSelected('left')">◀</button>
                            <div style="display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:bold; color:#64748b;">PTZ</div>
                            <button class="ptz-btn" style="width:100%; height:100%;" onclick="window.ptzMoveSelected('right')">▶</button>
                            <div></div>
                            <button class="ptz-btn" style="width:100%; height:100%;" onclick="window.ptzMoveSelected('down')">▼</button>
                            <div></div>
                        </div>
                        <div id="ptzPlaceholder" style="font-size:12px; color:var(--text-muted); font-style:italic;">Pilih kamera di layar untuk mengaktifkan PTZ</div>
                    </div>
                </div>
            </div>`;

let startIdx = code.indexOf('<div id="view-monitor"');
let endIdx = code.indexOf('<!-- 2. VIEW PLAYBACK -->');
if (startIdx > -1 && endIdx > -1) {
    code = code.substring(0, startIdx) + newMonitor + '\n\n            ' + code.substring(endIdx);
    fs.writeFileSync('public/index.html', code);
    console.log("Monitor view updated!");
}
