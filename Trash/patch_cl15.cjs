const fs = require('fs');
let code = fs.readFileSync('CHANGELOG.md', 'utf8');

const target = `## [Ver 9.3.8]`;

const replacement = `## [Ver 9.3.9] - 2026-09-16
### Changed
- **Unified Responsive System:** Merombak seluruh pondasi CSS (CSS *Flexbox* & *Media Queries*) untuk *dashboard* utama maupun *Superadmin*. Sistem kini secara dinamis merespons rotasi layar (*portrait* ke *landscape*) tanpa masalah *overflow* (melebihi batas layar) atau elemen yang tergencet. Kamera, form pengaturan, dan bar navigasi seluler kini menggunakan *viewport-height* fleksibel (\`flex: 1\`) secara penuh.

## [Ver 9.3.8]`;

code = code.replace(target, replacement);
fs.writeFileSync('CHANGELOG.md', code);
