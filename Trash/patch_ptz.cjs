const fs = require('fs');
let code = fs.readFileSync('public/index.html', 'utf8');

// Always display PTZ controls
code = code.replace(
`class="ptz-controller" style="display:none; grid-template-columns: repeat(3, 30px); grid-template-rows: repeat(3, 30px); gap:4px; align-items:center; justify-items:center;"`,
`class="ptz-controller" style="display:grid; grid-template-columns: repeat(3, 30px); grid-template-rows: repeat(3, 30px); gap:4px; align-items:center; justify-items:center;"`
);

code = code.replace(
`<div id="mPtzController" class="ptz-controller" style="display:none;">`,
`<div id="mPtzController" class="ptz-controller" style="display:grid;">`
);

fs.writeFileSync('public/index.html', code);
console.log("PTZ display patched in index.html");
