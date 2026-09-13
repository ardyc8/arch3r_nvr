const fs = require('fs');
let code = fs.readFileSync('public/index.html', 'utf8');

const newMonitor = `<div id="view-monitor" class="view-pane active">
                <div id="monitorWrapper" class="grid-wrapper" style="position:relative; width: 100%; height: 100%; display: flex; flex-direction: column; background: #000; padding: 0;">
                    
                    <!-- Top Bar: Layout & Channels -->
                    <div id="topControlContainer" style="display:flex; flex-direction:column; background: var(--surface); z-index: 10; border-bottom:1px solid var(--border); transition: max-height 0.3s ease-out; overflow:hidden;">
                        
                        <!-- Toggle Button (Always visible on top right) -->
                        <div style="position:absolute; top: 10px; right: 10px; z-index: 20;">
                            <button id="btnToggleControls" class="btn-sm btn-secondary" onclick="window.toggleTopControls()" style="border-radius:50%; width: 35px; height: 35px; padding:0; display:flex; justify-content:center; align-items:center; opacity: 0.7; border: 1px solid var(--border); background: var(--surface); box-shadow: 0 2px 5px rgba(0,0,0,0.5);">⚙️</button>
                        </div>

                        <div id="topControlPanel" style="display:none; flex-direction:column; padding-top: 5px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; padding: 0.5rem 1rem; flex-wrap: wrap; gap: 0.5rem;">
                                <div style="display:flex; align-items:center; gap:0.5rem;">
                                    <span style="font-size:0.85rem; color:var(--text-muted); font-weight:bold;">Layout:</span>
                                    <button class="btn-sm btn-secondary grid-btn active" data-grid="1" style="background:#2563eb; color:white;">1x1</button>
                                    <button class="btn-sm btn-secondary grid-btn" data-grid="4">2x2</button>
                                    <button class="btn-sm btn-secondary grid-btn" data-grid="9">3x3</button>
                                    <button class="btn-sm btn-secondary grid-btn" data-grid="16">4x4</button>
                                </div>
                                <div style="display:flex; gap:0.5rem; margin-right: 40px;">
                                    <button class="btn-sm btn-primary" onclick="window.toggleGridFullscreen('monitorWrapper')">⛶ Fullscreen</button>
                                    <button id="btnReloadStreams" class="btn-sm btn-secondary" title="Muat ulang stream">🔄 Refresh</button>
                                </div>
                            </div>
                            <div id="channelBar" style="display:flex; gap:0.5rem; flex-wrap:wrap; padding: 0 1rem 0.5rem 1rem;">
                                <!-- JS akan merender tombol All, CH1, CH2, dst. -->
                            </div>
                        </div>
                    </div>
                    
                    <!-- Video Grid Area -->
                    <div style="position:relative; flex:1; min-height:0; display:flex; padding: 4px;">
                        <div id="videoGrid" class="video-grid grid-1" style="flex:1; width:100%;"></div>
                    </div>

                    <!-- PTZ Controller (Di Bawah Halaman) -->
                    <div id="ptzPanel" style="background: var(--surface); border-top: 1px solid var(--border); padding: 0.5rem; display: flex; justify-content: center; align-items: center; gap: 1rem;">
                        <span style="font-weight:bold; color:var(--text-muted); font-size:12px;">PTZ:</span>
                        <div id="ptzController" class="ptz-controller" style="display:none; grid-template-columns: repeat(3, 30px); grid-template-rows: repeat(3, 30px); gap:4px; align-items:center; justify-items:center;">
                            <div></div>
                            <button class="ptz-btn" style="width:100%; height:100%; font-size:12px; padding:0;" onclick="window.ptzMoveSelected('up')">▲</button>
                            <div></div>
                            <button class="ptz-btn" style="width:100%; height:100%; font-size:12px; padding:0;" onclick="window.ptzMoveSelected('left')">◀</button>
                            <div style="display:flex; align-items:center; justify-content:center; font-size:8px; font-weight:bold; color:#64748b;">PTZ</div>
                            <button class="ptz-btn" style="width:100%; height:100%; font-size:12px; padding:0;" onclick="window.ptzMoveSelected('right')">▶</button>
                            <div></div>
                            <button class="ptz-btn" style="width:100%; height:100%; font-size:12px; padding:0;" onclick="window.ptzMoveSelected('down')">▼</button>
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
