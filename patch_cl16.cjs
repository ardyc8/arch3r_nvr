const fs = require('fs');
let code = fs.readFileSync('CHANGELOG.md', 'utf8');

const target = `## [Ver 9.3.9]`;

const replacement = `## [Ver 9.3.10] - 2026-09-16
### Fixed
- **Superadmin Layout Crash (Desktop):** Memperbaiki bug kritis di mana tata letak *dashboard* Superadmin hancur berantakan (halaman konten merosot ke bawah *sidebar*) saat dibuka di layar komputer/desktop. Ini disebabkan oleh interupsi paksa dari JavaScript (\`display: block\`) yang menabrak aturan struktur *Flexbox* CSS yang baru. Sistem kini menggunakan gaya tampilan \`flex\` secara konsisten, sehingga tampilan Desktop dan Mobile kembali sejajar, rapi, dan kokoh.

## [Ver 9.3.9]`;

code = code.replace(target, replacement);
fs.writeFileSync('CHANGELOG.md', code);
