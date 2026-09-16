const fs = require('fs');
let code = fs.readFileSync('CHANGELOG.md', 'utf8');

const target = `## [Ver 9.3.0]`;

const replacement = `## [Ver 9.3.1] - 2026-09-16
### Added
- **Hardware-Level Binding (Anti-Piracy V2):** Menambahkan proteksi kloning OS. Lisensi sekarang diikat (hashed) secara fisik dengan MAC Address STB dan disimpan secara rahasia di luar folder Node.js (\`/etc/.arch3r_hw_bind.dat\`). Jika SD Card STB dikloning ke STB lain, aplikasi akan langsung mendeteksi \`Hardware UUID Mismatch\` dan mengunci (lockdown) sistem secara otomatis.

## [Ver 9.3.0]`;

code = code.replace(target, replacement);
fs.writeFileSync('CHANGELOG.md', code);
