const fs = require('fs');
let code = fs.readFileSync('public/script.js', 'utf8');

const oldCellHtmlPattern = /<div style="display:flex; flex-direction:column; width:100%; height:100%;">[\s\S]*?<\/div>\s*<\/div>/g;

const newCellHtml = `<div style="position:relative; width:100%; height:100%; background: #000; overflow: hidden; border:1px solid var(--border);">
                                <video id="\${videoId}" class="cam-player-video" autoplay muted playsinline style="width:100%; height:100%; object-fit:fill; pointer-events:none;"></video>
                                <div class="cam-title-bar" style="position:absolute; bottom:0; left:0; right:0; background:rgba(15, 23, 42, 0.7); text-align:center; padding: 2px 4px; font-size: 10px; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; z-index:5;">
                                    \${cam.name}
                                </div>
                            </div>`;

code = code.replace(/<div style="display:flex; flex-direction:column; width:100%; height:100%;">[\s\S]*?<div class="cam-title-bar"[\s\S]*?<\/div>\s*<\/div>/g, newCellHtml);

fs.writeFileSync('public/script.js', code);
console.log('Monitor grid cell updated');
