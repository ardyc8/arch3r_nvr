const fs = require('fs');
let code = fs.readFileSync('CHANGELOG.md', 'utf8');

const target = `## [Ver 9.2.12] - 2026-09-16`;

const replacement = `## [Ver 9.2.13] - 2026-09-16
### Fixed
- **Database & Data Loss Prevention:** Menutup celah di mana data administrator dan kamera hilang tertimpa file \`nvr_db.json\` kosong saat melakukan \`git pull\`. Sistem kini secara cerdas akan langsung memulihkan (restore) data dari \`nvr_db_safe_backup.json\` jika mendeteksi anomali pada file utama.
- **Strict License Validation:** Memperbaiki logika backend di form aktivasi. Sebelumnya sistem mengizinkan penyimpanan lisensi palsu/acak dan memberikan alert sukses. Sekarang backend menolak secara keras (hard reject) setiap upaya input lisensi yang formatnya tidak valid atau segel HMAC-nya korup.

## [Ver 9.2.12] - 2026-09-16`;

code = code.replace(target, replacement);
fs.writeFileSync('CHANGELOG.md', code);
