const fs = require('fs');
let code = fs.readFileSync('public/script.js', 'utf8');

const toggleFunc = `
    window.toggleTopControls = function() {
        const panel = document.getElementById('topControlPanel');
        const btn = document.getElementById('btnToggleControls');
        if (panel) {
            if (panel.style.display === 'none') {
                panel.style.display = 'flex';
                btn.style.opacity = '1';
                btn.style.background = '#3b82f6';
                btn.style.color = '#fff';
            } else {
                panel.style.display = 'none';
                btn.style.opacity = '0.7';
                btn.style.background = 'var(--surface)';
                btn.style.color = '';
            }
        }
    };
`;

code = code.replace(/window\.toggleFloatingPanel = function\(id\) \{[\s\S]*?\};/m, toggleFunc);

const channelFuncStr = `
            btnAll.className = 'btn-sm ' + (activeChannel === 'all' ? 'btn-primary' : 'btn-secondary');
            btnAll.textContent = 'ALL';
            btnAll.style.fontWeight = 'bold';
            btnAll.onclick = () => { activeChannel = 'all'; updateGridDisplay(); };
            bar.appendChild(btnAll);

            cameras.forEach((cam, idx) => {
                const btn = document.createElement('button');
                btn.className = 'btn-sm ' + (activeChannel === cam.id ? 'btn-primary' : 'btn-secondary');
                btn.textContent = 'CH' + (idx + 1) + ' : ' + cam.name;
                btn.onclick = () => { activeChannel = cam.id; updateGridDisplay(); };
                bar.appendChild(btn);
            });
`;

code = code.replace(/btnAll\.className = 'btn-sm ' \+ \(activeChannel === 'all' \? 'btn-primary' : 'btn-secondary'\);[\s\S]*?bar\.appendChild\(btn\);\s*\}\);/m, channelFuncStr.trim());

fs.writeFileSync('public/script.js', code);
console.log("script.js patched for top controls");
