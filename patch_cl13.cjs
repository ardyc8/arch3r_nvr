const fs = require('fs');
let code = fs.readFileSync('CHANGELOG.md', 'utf8');

const target = `## [Ver 9.3.6]`;

const replacement = `## [Ver 9.3.7] - 2026-09-16
### Fixed
- **Timezone Artifact Cleanup:** Memperbaiki dan menambal sisa data akun yang tercatat menggunakan \`Z\` (UTC) akibat regresi pada versi 9.3.4. Saat server dinyalakan ulang, sistem akan secara otomatis memindai seluruh file JSON dan mengonversi waktu lama (Z) tersebut ke dalam format waktu lokal secara mandiri.

## [Ver 9.3.6]`;

code = code.replace(target, replacement);
fs.writeFileSync('CHANGELOG.md', code);
