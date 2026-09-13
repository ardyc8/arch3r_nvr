const fs = require('fs');
let code = fs.readFileSync('public/script.js', 'utf8');

const updatePtzStr = `
    function updatePtzVisibility() {
        const ptzController = document.getElementById('ptzController');
        const ptzPlaceholder = document.getElementById('ptzPlaceholder');
        const mPtzController = document.getElementById('mPtzController');
        
        const cam = cameras.find(c => c.id === selectedCamIdForPtz);
        const hasPtz = (cam && cam.ptzEnabled) ? true : false;
        
        if (ptzController) ptzController.style.display = hasPtz ? 'grid' : 'none';
        if (ptzPlaceholder) {
            ptzPlaceholder.style.display = hasPtz ? 'none' : 'block';
            if (cam && !cam.ptzEnabled) {
                ptzPlaceholder.textContent = "Kamera ini tidak memiliki konfigurasi PTZ.";
            } else if (!cam) {
                ptzPlaceholder.textContent = "Pilih kamera di layar untuk mengaktifkan PTZ";
            }
        }
        if (mPtzController) mPtzController.style.display = hasPtz ? 'grid' : 'none';
    }
`;

code = code.replace(/function updatePtzVisibility\(\) \{[\s\S]*?window\.ptzMoveSelected/m, updatePtzStr.trim() + '\n    window.ptzMoveSelected');
fs.writeFileSync('public/script.js', code);
console.log("updatePtzVisibility fixed");
