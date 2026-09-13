const fs = require('fs');
let code = fs.readFileSync('public/index.html', 'utf8');

const oldMonitor = `<div id="view-monitor" class="view-pane active">
                <div style="padding:0.75rem 1rem; background:var(--surface); border-bottom:1px solid var(--border);">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                            <span style="font-size:0.85rem; color:var(--text-muted);">Layout Grid:</span>
                            <button class="btn-sm btn-secondary grid-btn active" data-grid="1" style="background:#2563eb; color:white;">1x1</button>
                            <button class="btn-sm btn-secondary grid-btn" data-grid="4">2x2</button>
                            <button class="btn-sm btn-secondary grid-btn" data-grid="9">3x3</button>
                            <button class="btn-sm btn-secondary grid-btn" data-grid="16">4x4</button>
                        </div>
                        <div style="display:flex; gap:0.5rem;">
                            <button class="btn-sm btn-primary" onclick="window.toggleGridFullscreen('videoGrid')">⛶ Fullscreen</button>
                            <button id="btnReloadStreams" class="btn-sm btn-secondary" title="Muat ulang stream">🔄 Refresh</button>
                        </div>
                    </div>
                    <div id="channelBar" style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.75rem;">
                        <!-- JS akan merender tombol All, CH1, CH2, dst. -->
                    </div>
                </div>
                <div class="grid-wrapper" style="position:relative;">
                    <div id="videoGrid" class="video-grid grid-1"></div>
                    <!-- PTZ Controller Floating -->
                    <div id="ptzController" class="ptz-controller" style="display:none;">
                        <div></div>
                        <button class="ptz-btn" onclick="window.ptzMoveSelected('up')">▲</button>
                        <div></div>
                        <button class="ptz-btn" onclick="window.ptzMoveSelected('left')">◀</button>
                        <div style="display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold; color:#64748b;">PTZ</div>
                        <button class="ptz-btn" onclick="window.ptzMoveSelected('right')">▶</button>
                        <div></div>
                        <button class="ptz-btn" onclick="window.ptzMoveSelected('down')">▼</button>
                        <div></div>
                    </div>
                </div>
            </div>`;

const newMonitor = `<div id="view-monitor" class="view-pane active">
                <div id="monitorWrapper" class="grid-wrapper" style="position:relative; width: 100%; height: 100%; display: flex; flex-direction: column; background: #000;">
                    <div id="channelBar" style="display:flex; gap:0.5rem; flex-wrap:wrap; padding: 0.5rem; background: var(--surface); z-index: 10;">
                        <!-- JS akan merender tombol All, CH1, CH2, dst. -->
                    </div>
                    
                    <div style="position:relative; flex:1;">
                        <div id="videoGrid" class="video-grid grid-1" style="height:100%; width:100%;"></div>
                        
                        <!-- Floating Layout Panel -->
                        <div id="floatingLayoutPanel" class="floating-panel" style="position:absolute; top:10px; right:10px; background:rgba(15, 23, 42, 0.85); backdrop-filter:blur(5px); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:0.5rem; z-index:50; display:flex; flex-direction:column; gap:0.5rem; transition: all 0.3s;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
                                <span style="font-size:0.75rem; font-weight:bold; color:#fff;">🛠️ Controls</span>
                                <button onclick="toggleFloatingPanel('floatingLayoutControls')" style="background:none; border:none; color:#fff; cursor:pointer; font-size:1rem;">👁️</button>
                            </div>
                            <div id="floatingLayoutControls" style="display:flex; flex-direction:column; gap:0.5rem;">
                                <div style="display:flex; flex-wrap:wrap; gap:0.25rem; justify-content:center;">
                                    <button class="btn-sm btn-secondary grid-btn active" data-grid="1" style="background:#2563eb; color:white; padding:0.25rem 0.5rem;">1x1</button>
                                    <button class="btn-sm btn-secondary grid-btn" data-grid="4" style="padding:0.25rem 0.5rem;">2x2</button>
                                    <button class="btn-sm btn-secondary grid-btn" data-grid="9" style="padding:0.25rem 0.5rem;">3x3</button>
                                    <button class="btn-sm btn-secondary grid-btn" data-grid="16" style="padding:0.25rem 0.5rem;">4x4</button>
                                </div>
                                <div style="display:flex; gap:0.25rem; justify-content:center;">
                                    <button class="btn-sm btn-primary" onclick="window.toggleGridFullscreen('monitorWrapper')" style="flex:1;">⛶ Full</button>
                                    <button id="btnReloadStreams" class="btn-sm btn-secondary" title="Muat ulang stream" style="flex:1;">🔄 Ref</button>
                                </div>
                                <button class="btn-sm btn-secondary" onclick="toggleFloatingPanel('ptzController')" style="width:100%; border:1px solid #8b5cf6; color:#a78bfa;">🕹️ Toggle PTZ</button>
                            </div>
                        </div>

                        <!-- PTZ Controller Floating -->
                        <div id="ptzController" class="ptz-controller" style="display:none; position:absolute; bottom:20px; right:20px; background:rgba(15, 23, 42, 0.85); backdrop-filter:blur(5px); border:1px solid rgba(255,255,255,0.1); border-radius:50%; padding:1rem; z-index:50; width:120px; height:120px; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); gap:2px;">
                            <div></div>
                            <button class="ptz-btn" onclick="window.ptzMoveSelected('up')">▲</button>
                            <div></div>
                            <button class="ptz-btn" onclick="window.ptzMoveSelected('left')">◀</button>
                            <div style="display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold; color:#64748b;">PTZ</div>
                            <button class="ptz-btn" onclick="window.ptzMoveSelected('right')">▶</button>
                            <div></div>
                            <button class="ptz-btn" onclick="window.ptzMoveSelected('down')">▼</button>
                            <div></div>
                        </div>
                    </div>
                </div>
            </div>`;

if (code.includes('id="view-monitor"')) {
    let startIdx = code.indexOf('<div id="view-monitor"');
    let endIdx = code.indexOf('<!-- 2. VIEW PLAYBACK -->');
    if (startIdx > -1 && endIdx > -1) {
        code = code.substring(0, startIdx) + newMonitor + '\n\n            ' + code.substring(endIdx);
        fs.writeFileSync('public/index.html', code);
        console.log("index.html monitor view patched!");
    } else {
        console.log("Could not find view-monitor boundaries in index.html");
    }
} else {
    console.log("Could not find view-monitor in index.html");
}

