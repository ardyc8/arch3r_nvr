const fs = require('fs');
let code = fs.readFileSync('public/index.html', 'utf8');

if (!code.includes('.video-grid { display: grid;')) {
    const target = `</style>`;
    const gridStyles = `
        .video-grid { display: grid; gap: 4px; background: #000; width: 100%; height: 100%; }
        .video-grid.grid-1 { grid-template-columns: 1fr; grid-template-rows: 1fr; }
        .video-grid.grid-4 { grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr); }
        .video-grid.grid-9 { grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); }
        .video-grid.grid-16 { grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(4, 1fr); }
        .video-box { background: #111; position: relative; border: 1px solid #333; overflow: hidden; display: flex; flex-direction: column; }
    `;
    code = code.replace(target, gridStyles + '\n    ' + target);
    fs.writeFileSync('public/index.html', code);
    console.log("Grid CSS patched in index.html");
} else {
    console.log("Grid CSS already present in index.html");
}
