const fs = require('fs');
let code = fs.readFileSync('CHANGELOG.md', 'utf8');

const target = `## [Ver 9.2.17]`;

const replacement = `## [Ver 9.3.0] - 2026-09-16
### Added
- **Database Architecture Redesign (Split-DB):** Merombak total struktur penyimpanan database untuk mencegah korupsi massal. File \`nvr_db.json\` lama kini dipecah menjadi modul-modul independen yang terisolasi secara fisik:
  - \`db_accounts.json\` (Kredensial, Administrator, User)
  - \`db_cameras.json\` (Data Kamera & RTSP)
  - \`db_recordings.json\` (Daftar File Rekaman)
  - \`db_logs.json\` (Sistem Log - penyebab utama bloating)
  - \`db_settings.json\` (Konfigurasi Global NVR)
- **Auto-Migration:** Menambahkan mekanisme perpindahan (migrasi) otomatis dari format Monolitik (lama) ke format Split-DB tanpa campur tangan pengguna.

## [Ver 9.2.17]`;

code = code.replace(target, replacement);
fs.writeFileSync('CHANGELOG.md', code);
