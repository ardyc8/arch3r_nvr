const fs = require('fs');
let js = fs.readFileSync('public/script.js', 'utf8');

// I need to clean up the area from `globalStorageForm.addEventListener` up to `// Refresh Storage button`.
// Let's replace the whole chunk.
const startSearch = "if (globalStorageForm) globalStorageForm.addEventListener('submit', async (e) => {";
const endSearch = "// Refresh Storage button";

const startIndex = js.indexOf(startSearch);
const endIndex = js.indexOf(endSearch);

if (startIndex > -1 && endIndex > -1) {
    const replacement = `if (globalStorageForm) globalStorageForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const storageDevice = document.getElementById('sysStorageDevice') ? document.getElementById('sysStorageDevice').value : '';
            const customPath = document.getElementById('sysCustomStoragePath') ? document.getElementById('sysCustomStoragePath').value : '';
            const finalPath = storageDevice === 'custom' ? customPath : storageDevice;
            
            const payload = {
                globalStorageMode: document.getElementById('sysGlobalStorageMode') ? document.getElementById('sysGlobalStorageMode').value : 'enabled',
                recordingQuality: document.getElementById('sysRecordingQuality') ? document.getElementById('sysRecordingQuality').value : 'main',
                globalStoragePath: finalPath
            };
            try {
                const res = await authFetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Gagal menyimpan pengaturan storage');
                
                if (finalPath && finalPath !== 'custom') {
                    await authFetch('/api/system/storage-devices/select', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ storagePath: finalPath })
                    });
                }
                
                alert('Pengaturan storage berhasil disimpan');
            } catch (err) {
                alert(err.message);
            }
        });
    }

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
    }

    `;
    
    js = js.slice(0, startIndex) + replacement + js.slice(endIndex);
    fs.writeFileSync('public/script.js', js);
    console.log('Fixed chunk!');
} else {
    console.log('Not found');
}
