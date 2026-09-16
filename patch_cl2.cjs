const fs = require('fs');
let code = fs.readFileSync('CHANGELOG.md', 'utf8');

const target = `## [Ver 9.2.13]`;

const replacement = `## [Ver 9.2.14] - 2026-09-16
### Changed
- **Git Protection:** Menambahkan instruksi dan perintah proteksi repositori lokal untuk memastikan \`data/nvr_db.json\` diabaikan dari pembaruan \`git pull\` di masa mendatang.
- **Login Fallback:** Memastikan kredensial default superadmin dapat selalu digunakan jika database tiba-tiba kosong akibat kesalahan sinkronisasi sistem.

## [Ver 9.2.13]`;

code = code.replace(target, replacement);
fs.writeFileSync('CHANGELOG.md', code);
