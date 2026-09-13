const fs = require('fs');
let code = fs.readFileSync('public/script.js', 'utf8');

const oldAdminCellHtml = `<video id="\${videoId}" class="cam-player-video" autoplay muted playsinline controls></video>
                        <div style="position:absolute; top:5px; left:5px; background:rgba(0,0,0,0.6); color:white; padding:2px 6px; font-size:0.75rem; border-radius:4px; pointer-events:none; z-index:10;">
                            \${cam.name}
                        </div>`;

const oldMobileCellHtml = oldAdminCellHtml;

const newCellHtml = `<div style="display:flex; flex-direction:column; width:100%; height:100%;">
                            <div style="flex:1; min-height:0; position:relative; background: #000; overflow: hidden;">
                                <video id="\${videoId}" class="cam-player-video" autoplay muted playsinline style="width:100%; height:100%; object-fit:contain; pointer-events:none;"></video>
                            </div>
                            <div class="cam-title-bar" style="background:var(--surface); text-align:center; padding: 4px; font-size: 11px; font-weight: bold; color:var(--text-muted); border-top:1px solid var(--border); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; z-index:5;">
                                \${cam.name}
                            </div>
                        </div>`;

// Replace all occurrences
code = code.split(oldAdminCellHtml).join(newCellHtml);

fs.writeFileSync('public/script.js', code);
console.log('Video grid render updated');
