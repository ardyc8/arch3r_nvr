const fs = require('fs');
let code = fs.readFileSync('CHANGELOG.md', 'utf8');

const target = `## [Ver 9.2.15]`;

const replacement = `## [Ver 9.2.16] - 2026-09-16
### Fixed
- **Process Identification:** Menambahkan deteksi konflik dan identifikasi proses NVR vs layanan CCTV pihak ketiga (seperti Shinobi) pada PM2 untuk mencegah kesalahan manipulasi direktori data.

## [Ver 9.2.15]`;

code = code.replace(target, replacement);
fs.writeFileSync('CHANGELOG.md', code);
