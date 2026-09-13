const fs = require('fs');

let css = fs.readFileSync('public/style.css', 'utf8');
if (!css.includes('@keyframes blinkRec')) {
    css += `
@keyframes blinkRec {
    0% { opacity: 1; }
    50% { opacity: 0.3; }
    100% { opacity: 1; }
}
.badge-rec {
    background: rgba(220, 38, 38, 0.85);
    color: #fff;
    font-size: 10px;
    padding: 2px 5px;
    border-radius: 4px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    animation: blinkRec 1.5s infinite;
}
.badge-rec::before {
    content: "●";
    color: #fca5a5;
    font-size: 8px;
}
`;
    fs.writeFileSync('public/style.css', css);
}

let script = fs.readFileSync('public/script.js', 'utf8');

const oldCellHtml = `                                <div class="cam-title-bar" style="position:absolute; bottom:0; left:0; right:0; background:rgba(15, 23, 42, 0.7); text-align:center; padding: 2px 4px; font-size: 10px; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; z-index:5;">
                                    \${cam.name}
                                </div>`;

const newCellHtml = `                                <div style="position:absolute; top:5px; right:5px; z-index:10; display:flex; gap:5px;">
                                    \${cam.isRecording ? '<span class="badge-rec">REC</span>' : ''}
                                </div>
                                <div class="cam-title-bar" style="position:absolute; bottom:0; left:0; right:0; background:rgba(15, 23, 42, 0.7); text-align:center; padding: 2px 4px; font-size: 10px; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; z-index:5;">
                                    \${cam.name}
                                </div>`;

script = script.replace(new RegExp(oldCellHtml.replace(/([.*+?^=!:\${}()|\[\]\/\\])/g, "\\$1"), "g"), newCellHtml);

// Wait, I also need to update mCell.innerHTML.
// Let's do it by regexing '<div class="cam-title-bar"' and injecting before it.

let script2 = fs.readFileSync('public/script.js', 'utf8');
script2 = script2.replace(/<div class="cam-title-bar"/g, `
                                <div style="position:absolute; top:5px; right:5px; z-index:10; display:flex; gap:5px;">
                                    \${cam.isRecording ? '<span class="badge-rec">REC</span>' : ''}
                                </div>
                                <div class="cam-title-bar"`);
fs.writeFileSync('public/script.js', script2);

console.log('UI patched with REC indicators!');
