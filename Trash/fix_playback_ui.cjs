const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

const newPlayback = `
            <!-- 2. VIEW PLAYBACK -->
            <div id="view-playback" class="view-pane">
                <div style="height:100%; display:flex; flex-direction:column; background:var(--background);">
                    <!-- Top Bar -->
                    <div style="padding:0.75rem 1rem; background:var(--surface); border-bottom:1px solid var(--border); display:flex; gap:1rem; align-items:center; flex-wrap:wrap;">
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                            <label style="font-size:0.85rem; color:var(--text-muted);">Kamera:</label>
                            <select id="selRecCam" class="form-control" style="width:auto; padding:0.4rem 0.8rem;"></select>
                        </div>
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                            <label style="font-size:0.85rem; color:var(--text-muted);">Tanggal:</label>
                            <input type="date" id="selRecDate" class="form-control" style="width:auto; padding:0.4rem 0.8rem;">
                        </div>
                        <button id="btnFetchRecordings" class="btn-sm btn-primary" style="padding:0.4rem 1rem; font-size:0.85rem;">🔍 Cari Rekaman</button>
                        <div style="flex:1;"></div>
                        <button id="btnToggleClipList" class="btn-sm btn-secondary" onclick="window.toggleClipList()" style="font-size:0.85rem;">☰ Daftar Klip</button>
                    </div>

                    <!-- Main Area -->
                    <div style="flex:1; display:flex; overflow:hidden; flex-direction:row;">
                        <!-- Video & Timeline Area -->
                        <div style="flex:1; background:#000; display:flex; flex-direction:column; position:relative;">
                            
                            <div style="flex:1; position:relative; display:flex; align-items:center; justify-content:center;">
                                <video id="playbackPlayer" playsinline style="width:100%; height:100%; object-fit:contain; background:#000;"></video>
                                <div id="pbTitle" style="position:absolute; top:10px; left:10px; background:rgba(0,0,0,0.7); padding:4px 10px; border-radius:4px; font-size:0.8rem; color:#fff; pointer-events:none;">Menunggu rekaman...</div>
                            </div>
                            
                            <!-- Professional Timeline & Controls -->
                            <div style="background:var(--surface); border-top:1px solid var(--border); padding:0.75rem 1rem; display:flex; flex-direction:column; gap:0.5rem;">
                                <!-- Time info -->
                                <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-muted); font-family:monospace;">
                                    <span id="pbCurrentTime">00:00:00</span>
                                    <span id="pbTotalTime">00:00:00</span>
                                </div>
                                <!-- Range Slider as Timeline -->
                                <input type="range" id="pbTimeline" min="0" max="100" value="0" style="width:100%; accent-color:var(--primary); cursor:pointer; height:6px;">
                                
                                <!-- Video Controls -->
                                <div style="display:flex; justify-content:center; align-items:center; gap:1rem; margin-top:0.25rem;">
                                    <button id="btnPbPlay" class="btn-sm btn-secondary" style="border-radius:50%; width:40px; height:40px; padding:0; display:flex; justify-content:center; align-items:center; font-size:14px;">▶️</button>
                                    <button id="btnPbMute" class="btn-sm btn-secondary" style="border-radius:50%; width:35px; height:35px; padding:0; display:flex; justify-content:center; align-items:center; font-size:12px;">🔊</button>
                                    <button id="btnPbFullscreen" class="btn-sm btn-secondary" style="border-radius:50%; width:35px; height:35px; padding:0; display:flex; justify-content:center; align-items:center; font-size:12px;">⛶</button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Collapsible Clip List -->
                        <div id="pbClipSidebar" style="width:300px; background:var(--surface-dark); border-left:1px solid var(--border); overflow-y:auto; flex-shrink:0; transition: width 0.3s, opacity 0.3s;">
                            <h3 style="padding:1rem; border-bottom:1px solid var(--border); font-size:0.95rem; margin:0; display:flex; justify-content:space-between; align-items:center; background:var(--surface);">
                                <span>Daftar Klip Video</span>
                                <span id="clipCount" class="badge" style="background:var(--primary); color:#fff;">0 Klip</span>
                            </h3>
                            <ul id="playbackList" class="playback-list" style="margin:0; padding:0; list-style:none;">
                                <li style="padding:1.5rem; text-align:center; color:var(--text-muted); font-size:0.85rem;">Pilih tanggal dan klik "Cari Rekaman".</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
`;

html = html.replace(/<!-- 2\. VIEW PLAYBACK -->[\s\S]*?<!-- 3\. VIEW KAMERA -->/m, newPlayback.trim() + "\n\n            <!-- 3. VIEW KAMERA -->");
fs.writeFileSync('public/index.html', html);
console.log('Playback UI modernized');
