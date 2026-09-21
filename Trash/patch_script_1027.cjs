const fs = require('fs');

console.log("Patching public/script.js for 3-step workflow...");

let js = fs.readFileSync('public/script.js', 'utf8');

// Replace switchAISubTab and add new step1 and digital zoom functions
const targetSwitchSubTabRegex = /\/\/ Sub-tab switcher for Live Studio settings[\s\S]*?window\.switchAISubTab = switchAISubTab;/;

const newCode = `// Global Digital Zoom & Pan State
window.aiDigitalZoomState = window.aiDigitalZoomState || { zoom: 1.0, panX: 0, panY: 0 };

function adjustDigitalZoom(delta) {
    window.aiDigitalZoomState.zoom = Math.min(3.0, Math.max(1.0, (window.aiDigitalZoomState.zoom || 1.0) + delta));
    const badge = document.getElementById('ai-zoom-level-badge');
    if (badge) badge.textContent = \`\${Math.round(window.aiDigitalZoomState.zoom * 100)}%\`;
    applyDigitalZoomToCanvas();
}
window.adjustDigitalZoom = adjustDigitalZoom;

function panDigitalZoom(direction) {
    const step = 20;
    if (direction === 'left') window.aiDigitalZoomState.panX = (window.aiDigitalZoomState.panX || 0) + step;
    if (direction === 'right') window.aiDigitalZoomState.panX = (window.aiDigitalZoomState.panX || 0) - step;
    if (direction === 'up') window.aiDigitalZoomState.panY = (window.aiDigitalZoomState.panY || 0) + step;
    if (direction === 'down') window.aiDigitalZoomState.panY = (window.aiDigitalZoomState.panY || 0) - step;
    applyDigitalZoomToCanvas();
}
window.panDigitalZoom = panDigitalZoom;

function resetDigitalZoom() {
    window.aiDigitalZoomState = { zoom: 1.0, panX: 0, panY: 0 };
    const badge = document.getElementById('ai-zoom-level-badge');
    if (badge) badge.textContent = '100%';
    applyDigitalZoomToCanvas();
}
window.resetDigitalZoom = resetDigitalZoom;

function applyDigitalZoomToCanvas() {
    const streamImg = document.getElementById('ai-stream-img');
    const drawCanvas = document.getElementById('ai-draw-canvas');
    const { zoom, panX, panY } = window.aiDigitalZoomState || { zoom: 1.0, panX: 0, panY: 0 };
    
    [streamImg, drawCanvas].forEach(el => {
        if (el) {
            el.style.transform = \`scale(\${zoom}) translate(\${panX}px, \${panY}px)\`;
            el.style.transformOrigin = 'center center';
            el.style.transition = 'transform 0.15s ease-out';
        }
    });
}
window.applyDigitalZoomToCanvas = applyDigitalZoomToCanvas;

function syncCamSelectStep1(camId) {
    const mainSelect = document.getElementById('ai-cam-select');
    if (mainSelect) {
        mainSelect.value = camId;
        if (typeof loadCamStreamForAI === 'function') loadCamStreamForAI();
    }
}
window.syncCamSelectStep1 = syncCamSelectStep1;

function syncImgSzStep1(szVal) {
    const mainImgSz = document.getElementById('ai-imgsz-select');
    if (mainImgSz) mainImgSz.value = szVal;
}
window.syncImgSzStep1 = syncImgSzStep1;

function populateStep1CamDropdown() {
    const step1Select = document.getElementById('ai-step1-cam-select');
    const mainSelect = document.getElementById('ai-cam-select');
    if (!step1Select) return;
    
    const camList = (window.cameras || (typeof cameras !== 'undefined' ? cameras : [])).filter(c => c && c.id && c.id !== 'virtual_test');
    
    if (camList.length === 0) {
        step1Select.innerHTML = '<option value="">-- Belum Ada Kamera --</option>';
        return;
    }
    
    step1Select.innerHTML = camList.map(c => \`<option value="\${c.id}">\${c.name || 'Kamera ' + c.id} (\${c.ip || 'RTSP'})\</option>\`).join('');
    if (mainSelect && mainSelect.value) {
        step1Select.value = mainSelect.value;
    }
}
window.populateStep1CamDropdown = populateStep1CamDropdown;

// Sub-tab switcher for Live Studio settings (3-step workflow + tools)
function switchAISubTab(subTabName) {
    const subTabs = ['step1_cam', 'zones', 'prompt', 'esp', 'telemetry', 'telegram', 'sim', 'market'];
    subTabs.forEach(tab => {
        const pane = document.getElementById(\`ai-subpane-\${tab}\`) || document.getElementById(\`ai-subtab-pane-\${tab}\`) || document.getElementById(\`ai-tab-pane-\${tab}\`);
        const btn = document.getElementById(\`ai-subtab-btn-\${tab}\`) || document.getElementById(\`ai-tab-btn-\${tab}\`);
        if (pane) {
            pane.style.display = (tab === subTabName) ? 'block' : 'none';
        }
        if (btn) {
            if (tab === subTabName) {
                btn.style.color = (tab === 'market') ? '#f59e0b' : ((tab === 'sim') ? '#60a5fa' : '#38bdf8');
                btn.style.borderBottomColor = (tab === 'market') ? '#f59e0b' : ((tab === 'sim') ? '#60a5fa' : '#38bdf8');
                btn.style.background = 'rgba(56,189,248,0.12)';
            } else {
                btn.style.color = 'var(--text-muted, #94a3b8)';
                btn.style.borderBottomColor = 'transparent';
                btn.style.background = 'transparent';
            }
        }
    });

    if (subTabName === 'step1_cam') {
        populateStep1CamDropdown();
    } else if (subTabName === 'zones') {
        setTimeout(() => {
            if (typeof initAIDrawCanvas === 'function') initAIDrawCanvas();
            if (typeof loadCamStreamForAI === 'function') loadCamStreamForAI();
        }, 30);
    } else if (subTabName === 'sim') {
        if (typeof initSimSandbox === 'function') initSimSandbox();
    } else if (subTabName === 'market') {
        if (typeof fetchMarketplacePresets === 'function') fetchMarketplacePresets();
    }
}
window.switchAISubTab = switchAISubTab;`;

js = js.replace(targetSwitchSubTabRegex, newCode);

fs.writeFileSync('public/script.js', js, 'utf8');
console.log("public/script.js updated successfully!");
