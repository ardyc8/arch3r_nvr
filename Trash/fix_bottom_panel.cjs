const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

const newBottomPanel = `
                    <!-- Bottom Control Panel (Player & PTZ) -->
                    <div id="bottomControlPanel" style="background: var(--surface); border-top: 1px solid var(--border); padding: 0.5rem; display: flex; justify-content: center; align-items: center; gap: 1.5rem; flex-wrap: wrap;">
                        
                        <!-- Player Controls -->
                        <div id="playerControls" style="display:flex; align-items:center; gap: 0.5rem; opacity: 0.5; pointer-events: none;">
                            <button id="btnPlayerPlay" class="btn-sm btn-secondary" style="border-radius:50%; width: 35px; height: 35px; padding:0; font-size:12px;">⏯️</button>
                            <button id="btnPlayerMute" class="btn-sm btn-secondary" style="border-radius:50%; width: 35px; height: 35px; padding:0; font-size:12px;">🔊</button>
                            <input type="range" id="playerVolume" min="0" max="1" step="0.05" value="1" style="width: 80px; accent-color: var(--primary);">
                            <button id="btnPlayerFullscreen" class="btn-sm btn-secondary" style="border-radius:50%; width: 35px; height: 35px; padding:0; font-size:12px;">⛶</button>
                        </div>

                        <div style="width:1px; height:30px; background:var(--border);"></div>

                        <!-- PTZ Controls -->
                        <div style="display:flex; align-items:center; gap:0.5rem;">
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
                            <div id="ptzPlaceholder" style="font-size:12px; color:var(--text-muted); font-style:italic;">Pilih kamera di layar</div>
                        </div>
                    </div>
`;

html = html.replace(/<!-- PTZ Controller \(Di Bawah Halaman\) -->[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<!-- 2\. VIEW PLAYBACK -->/m, newBottomPanel.trim() + "\n                </div>\n            </div>\n\n            <!-- 2. VIEW PLAYBACK -->");
fs.writeFileSync('public/index.html', html);
console.log('index.html updated with Player controls in bottom panel');
