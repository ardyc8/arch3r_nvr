const fs = require('fs');
let scriptCode = fs.readFileSync('public/script.js', 'utf8');

const badCode = "            if (nav.dataset.target === 'view-addons') {\n                setTimeout(resizeCanvas, 100);\n                // Render option list\n                aiCamSelect.innerHTML = '<option value=\"\">-- Pilih Kamera --</option>';\n                if(window.cameras) {\n                    window.cameras.forEach(c => {\n                        aiCamSelect.innerHTML += `<option value=\"${c.id}\">${c.name}</option>`;\n                    });\n                }\n                \n                // Fetch addon list\n                if (typeof fetchInstalledAddons === 'function') {\n                    fetchInstalledAddons();\n                }\n            }";

const fixedCode = "            if (nav.dataset.target === 'view-addons') {\n                setTimeout(resizeCanvas, 100);\n                \n                // Fetch addon list\n                if (typeof fetchInstalledAddons === 'function') {\n                    fetchInstalledAddons();\n                }\n            }";

scriptCode = scriptCode.replace(badCode, fixedCode);

const badDecl = "    const aiCamSelect = document.getElementById('aiCameraSelect');\n";
scriptCode = scriptCode.replace(badDecl, '');

const oldModalLogic = "    if (defaultCamId) {\n        select.value = defaultCamId;\n        select.parentElement.style.display = 'none'; // Sembunyikan dropdown jika dipanggil dari tombol kamera spesifik\n        loadCamStreamForAI();\n    } else {\n        select.parentElement.style.display = 'block';\n    }";

const newModalLogic = "    if (defaultCamId) {\n        select.value = defaultCamId;\n        if(select.parentElement && select.parentElement.classList.contains('form-group')) {\n            select.parentElement.style.display = 'none';\n        } else {\n            select.style.display = 'none';\n        }\n        loadCamStreamForAI();\n    } else {\n        if(select.parentElement && select.parentElement.classList.contains('form-group')) {\n            select.parentElement.style.display = 'block';\n        } else {\n            select.style.display = 'block';\n        }\n    }";

scriptCode = scriptCode.replace(oldModalLogic, newModalLogic);

fs.writeFileSync('public/script.js', scriptCode);
console.log("Fixed script.js");
