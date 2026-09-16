const fs = require('fs');
let code = fs.readFileSync('CHANGELOG.md', 'utf8');

const target = `## [Ver 9.2.16]`;

const replacement = `## [Ver 9.2.17] - 2026-09-16
### Fixed
- **Memory State Sync:** Menambahkan *diagnostic trigger* \`[RELOAD_DB_CACHE]\` pada endpoint login untuk mereset \`cachedDb\` dari memori. Ini memperbaiki masalah di mana STB menggunakan *in-memory array* yang kosong meskipun file \`nvr_db.json\` fisik sudah direstore secara manual atau memiliki isi.

## [Ver 9.2.16]`;

code = code.replace(target, replacement);
fs.writeFileSync('CHANGELOG.md', code);
