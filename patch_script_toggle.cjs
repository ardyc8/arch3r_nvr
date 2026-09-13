const fs = require('fs');
let code = fs.readFileSync('public/script.js', 'utf8');

const toggleFunc = `
    window.toggleFloatingPanel = function(id) {
        const el = document.getElementById(id);
        if (el) {
            if (el.style.display === 'none') {
                if (id === 'ptzController') {
                    el.style.display = 'grid';
                } else {
                    el.style.display = 'flex';
                }
            } else {
                el.style.display = 'none';
            }
        }
    };
`;

code = code.replace(/window\.toggleGridFullscreen = function\(gridId\) \{/, toggleFunc + '\n    window.toggleGridFullscreen = function(gridId) {');

fs.writeFileSync('public/script.js', code);
console.log("script.js toggle patched!");
