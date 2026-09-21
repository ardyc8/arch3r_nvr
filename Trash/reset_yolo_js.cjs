const fs = require('fs');

console.log("Updating public/script.js with clean default YOLO functions...");

let js = fs.readFileSync('public/script.js', 'utf8');

const defaultYoloFunctions = `
// Clean Default YOLO AI Functions
function saveDefaultYoloConfig() {
    const camSelect = document.getElementById('ai-cam-select');
    const enabled = document.getElementById('ai-cam-enabled') ? document.getElementById('ai-cam-enabled').checked : true;
    const imgsz = document.getElementById('ai-imgsz-select') ? document.getElementById('ai-imgsz-select').value : '320';
    const conf = document.getElementById('ai-conf-slider') ? document.getElementById('ai-conf-slider').value : '50';
    
    const targets = {
        person: document.getElementById('yolo-target-person') ? document.getElementById('yolo-target-person').checked : true,
        car: document.getElementById('yolo-target-car') ? document.getElementById('yolo-target-car').checked : true,
        motorcycle: document.getElementById('yolo-target-motorcycle') ? document.getElementById('yolo-target-motorcycle').checked : true,
        bicycle: document.getElementById('yolo-target-bicycle') ? document.getElementById('yolo-target-bicycle').checked : true
    };

    const config = {
        camId: camSelect ? camSelect.value : '',
        enabled,
        imgsz,
        conf,
        targets,
        updatedAt: new Date().toISOString()
    };

    localStorage.setItem('default_yolo_ai_config', JSON.stringify(config));
    
    if (typeof showToast === 'function') {
        showToast('✓ Konfigurasi Default YOLO AI Berhasil Disimpan!', 'success');
    } else {
        alert('✓ Konfigurasi Default YOLO AI Berhasil Disimpan!');
    }
}
window.saveDefaultYoloConfig = saveDefaultYoloConfig;

function clearAITelemetryLog() {
    const logEl = document.getElementById('ai-telemetry-log');
    if (logEl) {
        logEl.innerHTML = '<div style="color:#64748b;">[Log dibersihkan - Menunggu data deteksi YOLO...]</div>';
    }
}
window.clearAITelemetryLog = clearAITelemetryLog;

function openAISettingsModal() {
    // Default mode: notify user settings are available directly on page
    if (typeof showToast === 'function') {
        showToast('Pengaturan YOLO AI langsung tersedia di toolbar atas.', 'info');
    }
}
window.openAISettingsModal = openAISettingsModal;

function closeAISettingsModal() {
    const modal = document.getElementById('modal-ai-settings');
    if (modal) modal.style.display = 'none';
}
window.closeAISettingsModal = closeAISettingsModal;
`;

if (!js.includes('function saveDefaultYoloConfig')) {
    js += '\n' + defaultYoloFunctions;
    fs.writeFileSync('public/script.js', js, 'utf8');
    console.log("public/script.js updated with default YOLO functions!");
} else {
    console.log("public/script.js already has default YOLO functions.");
}
