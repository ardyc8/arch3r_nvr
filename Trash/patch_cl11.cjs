const fs = require('fs');
let code = fs.readFileSync('CHANGELOG.md', 'utf8');

const target = `## [Ver 9.3.4]`;

const replacement = `## [Ver 9.3.5] - 2026-09-16
### Fixed
- **Timezone Regression:** Memperbaiki masalah regresi di mana waktu pembuatan akun (\`createdAt\`), log sistem, dan *timestamp* rekaman kembali menggunakan format zona waktu dasar (UTC/Z) alih-alih waktu lokal (misal: WIB) di dalam STB. Sistem kini secara otomatis menghitung *offset* lokal dari OS Armbian (menghasilkan format seperti \`+07:00\`) untuk seluruh pencatatan waktu.

## [Ver 9.3.4]`;

code = code.replace(target, replacement);
fs.writeFileSync('CHANGELOG.md', code);
