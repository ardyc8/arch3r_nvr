const fs = require('fs');
let code = fs.readFileSync('public/script.js', 'utf8');

// Inject parsing for camCustomId and camPtzEnabled
const targetPayload = `const payload = {
                name: document.getElementById('camName').value,`;

const injectedPayload = `const payload = {
                id: document.getElementById('camCustomId') ? document.getElementById('camCustomId').value.trim() : undefined,
                name: document.getElementById('camName').value,
                ptzEnabled: document.getElementById('camPtzEnabled') ? document.getElementById('camPtzEnabled').checked : false,`;

code = code.replace(targetPayload, injectedPayload);

// Populate existing values when editing a camera
const editTarget = `document.getElementById('camName').value = cam.name;`;
const editInjected = `document.getElementById('camName').value = cam.name;
        const camCustomIdEl = document.getElementById('camCustomId');
        if (camCustomIdEl) camCustomIdEl.value = cam.id;
        const camPtzEnabledEl = document.getElementById('camPtzEnabled');
        if (camPtzEnabledEl) camPtzEnabledEl.checked = !!cam.ptzEnabled;`;

code = code.replace(editTarget, editInjected);

// Reset form
const resetTarget = `const idInput = document.getElementById('camId');
        if (idInput) idInput.value = '';`;
const resetInjected = `const idInput = document.getElementById('camId');
        if (idInput) idInput.value = '';
        const customIdInput = document.getElementById('camCustomId');
        if (customIdInput) customIdInput.value = '';
        const ptzInput = document.getElementById('camPtzEnabled');
        if (ptzInput) ptzInput.checked = false;`;

code = code.replace(resetTarget, resetInjected);

fs.writeFileSync('public/script.js', code);
console.log("script.js camera submission patched.");
