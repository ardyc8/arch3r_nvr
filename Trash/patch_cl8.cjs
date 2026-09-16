const fs = require('fs');
let code = fs.readFileSync('CHANGELOG.md', 'utf8');

const target = `## [Ver 9.3.1]`;

const replacement = `## [Ver 9.3.2] - 2026-09-16
### Fixed
- **Revert Over-Engineered License Logic:** Menghapus logika *Hardware-OS Binding* (\`/etc/.arch3r_hw_bind.dat\`) yang ditambahkan secara prematur. Mengembalikan sistem sepenuhnya ke skema validasi lisensi offline/online \`keygen.js\` yang sudah disepakati dan terbukti aman, sesuai arsitektur awal klien.

## [Ver 9.3.1]`;

code = code.replace(target, replacement);
fs.writeFileSync('CHANGELOG.md', code);
