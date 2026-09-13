const fs = require('fs');
let code = fs.readFileSync('public/script.js', 'utf8');

const ptzFieldsClear = `
        document.getElementById('camPtzEnabled').checked = false;
        document.getElementById('camPtzUrl').value = '';
        document.getElementById('camPtzUser').value = '';
        document.getElementById('camPtzPass').value = '';
`;

code = code.replace(/document\.getElementById\('camStoragePath'\)\.value = '';/, "document.getElementById('camStoragePath').value = '';\n" + ptzFieldsClear);

const ptzEditFill = `
        document.getElementById('camPtzEnabled').checked = !!cam.ptzEnabled;
        document.getElementById('camPtzUrl').value = cam.ptzUrl || '';
        document.getElementById('camPtzUser').value = cam.ptzUser || '';
        document.getElementById('camPtzPass').value = cam.ptzPass || '';
`;
code = code.replace(/document\.getElementById\('camStoragePath'\)\.value = cam\.storagePath \|\| '';/, "document.getElementById('camStoragePath').value = cam.storagePath || '';\n" + ptzEditFill);

const ptzPayload = `
            const ptzEnabled = document.getElementById('camPtzEnabled').checked;
            const ptzUrl = document.getElementById('camPtzUrl').value;
            const ptzUser = document.getElementById('camPtzUser').value;
            const ptzPass = document.getElementById('camPtzPass').value;
`;
code = code.replace(/const storagePath = document\.getElementById\('camStoragePath'\)\.value;/, "const storagePath = document.getElementById('camStoragePath').value;\n" + ptzPayload);

code = code.replace(/storagePath: storagePath/, "storagePath: storagePath,\n                ptzEnabled,\n                ptzUrl,\n                ptzUser,\n                ptzPass");

fs.writeFileSync('public/script.js', code);
console.log('script.js updated for PTZ fields');
