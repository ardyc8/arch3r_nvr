const fs = require('fs');
let code = fs.readFileSync('CHANGELOG.md', 'utf8');

const target = `## [Ver 9.2.14]`;

const replacement = `## [Ver 9.2.15] - 2026-09-16
### Fixed
- **PM2 Environment Guide:** Memperbaiki instruksi troubleshooting PM2 untuk memastikan command dijalankan pada ID/Nama proses yang tepat, bukan menggunakan alias 'all' yang invalid pada perintah \`describe\`.

## [Ver 9.2.14]`;

code = code.replace(target, replacement);
fs.writeFileSync('CHANGELOG.md', code);
