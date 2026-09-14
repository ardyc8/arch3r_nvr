const fs = require('fs');
let js = fs.readFileSync('public/script.js', 'utf8');

const badBlock = `            try {
                const res = await authFetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

        if (systemForm) systemForm.addEventListener('submit', async (e) => {`;

const goodBlock = `            try {
                const res = await authFetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Gagal menyimpan pengaturan storage');
                alert('Preferensi Storage berhasil disimpan!');
                fetchSystemSettings();
            } catch (err) {
                alert(err.message);
            }
        });
    }

    if (systemForm) systemForm.addEventListener('submit', async (e) => {`;

if(js.includes(badBlock)) {
    js = js.replace(badBlock, goodBlock);
    fs.writeFileSync('public/script.js', js);
    console.log('Fixed syntax error inside globalStorageForm!');
} else {
    console.log('Could not find badBlock!');
}
