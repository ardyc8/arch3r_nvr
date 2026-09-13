const fs = require('fs');
let code = fs.readFileSync('public/script.js', 'utf8');

// Inject fetchSystemSettings
const fetchSysStr = `
    async function fetchSystemSettings() {
        try {
            const res = await authFetch('/api/settings');
            const data = await res.json();
            
            const sysNetInterface = document.getElementById('sysNetInterface');
            const sysMediaMtxPort = document.getElementById('sysMediaMtxPort');
            const sysPlayerMode = document.getElementById('sysPlayerMode');
            const sysTgBot = document.getElementById('sysTgBot');
            const sysTgChat = document.getElementById('sysTgChat');
            
            if (sysNetInterface && data.netInterface) sysNetInterface.value = data.netInterface;
            if (sysMediaMtxPort && data.mediamtxPort) sysMediaMtxPort.value = data.mediamtxPort;
            if (sysPlayerMode && data.playerMode) sysPlayerMode.value = data.playerMode;
            if (sysTgBot && data.telegramBotToken) sysTgBot.value = data.telegramBotToken;
            if (sysTgChat && data.telegramChatId) sysTgChat.value = data.telegramChatId;
        } catch(e) {
            console.error('Failed fetch settings', e);
        }
    }
`;

// Insert after fetchCameras() function definition, or just put it before loadUsersList()
code = code.replace(/function loadUsersList\(\) \{/, fetchSysStr + '\n    function loadUsersList() {');

// Inject systemForm listener
const sysFormStr = `
        if (systemForm) systemForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                netInterface: document.getElementById('sysNetInterface') ? document.getElementById('sysNetInterface').value : 'auto',
                mediamtxPort: document.getElementById('sysMediaMtxPort') ? parseInt(document.getElementById('sysMediaMtxPort').value) : 8889,
                playerMode: document.getElementById('sysPlayerMode') ? document.getElementById('sysPlayerMode').value : 'iframe',
                telegramBotToken: document.getElementById('sysTgBot') ? document.getElementById('sysTgBot').value : '',
                telegramChatId: document.getElementById('sysTgChat') ? document.getElementById('sysTgChat').value : ''
            };
            try {
                const res = await authFetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Gagal menyimpan pengaturan sistem');
                alert('Konfigurasi sistem berhasil disimpan!');
            } catch (err) {
                alert(err.message);
            }
        });
`;

code = code.replace(/if \(globalStorageForm\).*?\}\);/s, match => match + '\n' + sysFormStr);

fs.writeFileSync('public/script.js', code);
console.log("script.js patched!");
