const fs = require('fs');
let code = fs.readFileSync('public/script.js', 'utf8');

const playerLogic = `
    let selectedVideoElement = null;

    function initBottomPlayerControls() {
        const btnPlay = document.getElementById('btnPlayerPlay');
        const btnMute = document.getElementById('btnPlayerMute');
        const sliderVol = document.getElementById('playerVolume');
        const btnFull = document.getElementById('btnPlayerFullscreen');

        if(btnPlay) btnPlay.addEventListener('click', () => {
            if(!selectedVideoElement) return;
            if(selectedVideoElement.paused) {
                selectedVideoElement.play();
                btnPlay.textContent = '⏸️';
            } else {
                selectedVideoElement.pause();
                btnPlay.textContent = '▶️';
            }
        });

        if(btnMute) btnMute.addEventListener('click', () => {
            if(!selectedVideoElement) return;
            selectedVideoElement.muted = !selectedVideoElement.muted;
            btnMute.textContent = selectedVideoElement.muted ? '🔇' : '🔊';
        });

        if(sliderVol) sliderVol.addEventListener('input', (e) => {
            if(!selectedVideoElement) return;
            selectedVideoElement.volume = e.target.value;
            if(e.target.value > 0) {
                selectedVideoElement.muted = false;
                if(btnMute) btnMute.textContent = '🔊';
            }
        });

        if(btnFull) btnFull.addEventListener('click', () => {
            if(!selectedVideoElement) return;
            if(selectedVideoElement.requestFullscreen) {
                selectedVideoElement.requestFullscreen();
            } else if (selectedVideoElement.webkitRequestFullscreen) {
                selectedVideoElement.webkitRequestFullscreen();
            }
        });
    }

    function updateBottomPlayerUI() {
        const pCtrl = document.getElementById('playerControls');
        if(!pCtrl) return;

        if(!selectedVideoElement) {
            pCtrl.style.opacity = '0.5';
            pCtrl.style.pointerEvents = 'none';
        } else {
            pCtrl.style.opacity = '1';
            pCtrl.style.pointerEvents = 'auto';
            
            const btnPlay = document.getElementById('btnPlayerPlay');
            const btnMute = document.getElementById('btnPlayerMute');
            const sliderVol = document.getElementById('playerVolume');
            
            if(btnPlay) btnPlay.textContent = selectedVideoElement.paused ? '▶️' : '⏸️';
            if(btnMute) btnMute.textContent = selectedVideoElement.muted ? '🔇' : '🔊';
            if(sliderVol) sliderVol.value = selectedVideoElement.volume;
        }
    }
`;

// Insert the logic functions at the top level
code = code.replace(/window\.selectCellForPtz = function\(camId\) \{/, playerLogic + "\n    window.selectCellForPtz = function(camId) {");

// Find where selectCellForPtz is implemented and add logic to grab the video element
const selectCellLogic = `
    window.selectCellForPtz = function(camId) {
        selectedCamIdForPtz = camId;
        document.querySelectorAll('.cam-cell').forEach(cell => cell.classList.remove('selected'));
        const activeCell = document.getElementById('cell_' + camId);
        if (activeCell) {
            activeCell.classList.add('selected');
            selectedVideoElement = activeCell.querySelector('video');
        } else {
            selectedVideoElement = null;
        }
        updateBottomPlayerUI();
        updatePtzVisibility();
    };
`;
code = code.replace(/window\.selectCellForPtz = function\(camId\) \{[\s\S]*?updatePtzVisibility\(\);\s*\};/m, selectCellLogic.trim());

// Hook initBottomPlayerControls into DOMContentLoaded
code = code.replace(/initNavigation\(\);/, "initNavigation();\n        initBottomPlayerControls();");

fs.writeFileSync('public/script.js', code);
console.log('script.js updated with Player controls logic');
