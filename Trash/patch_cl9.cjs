const fs = require('fs');
let code = fs.readFileSync('CHANGELOG.md', 'utf8');

const target = `## [Ver 9.3.2]`;

const replacement = `## [Ver 9.3.3] - 2026-09-16
### Fixed
- **UI State Sync:** Memperbaiki bug di mana \`sysGlobalStorageMode\` dan konfigurasi penyimpanan lainnya pada antarmuka *frontend* selalu mereset tampilan menjadi "Mati/Nonaktif" saat halaman direfresh (meskipun data di \`db_settings.json\` sudah tersimpan aktif).

## [Ver 9.3.2]`;

code = code.replace(target, replacement);
fs.writeFileSync('CHANGELOG.md', code);
