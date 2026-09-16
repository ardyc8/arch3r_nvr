const fs = require('fs');
let code = fs.readFileSync('CHANGELOG.md', 'utf8');

const target = `## [Ver 9.3.3]`;

const replacement = `## [Ver 9.3.4] - 2026-09-16
### Fixed
- **Git Pull Migration Loop Bug:** Memperbaiki bug kritis di mana mengeksekusi \`git pull\` menyebabkan sistem membaca *dummy file* \`nvr_db.json\` bawaan Github, yang memicu *false migration* (migrasi ulang) dan menimpa \`db_accounts.json\` (database asli) dengan tabel kosong. Kini sistem mengabaikan \`nvr_db.json\` sepenuhnya jika file Split-DB sudah tercipta.

## [Ver 9.3.3]`;

code = code.replace(target, replacement);
fs.writeFileSync('CHANGELOG.md', code);
