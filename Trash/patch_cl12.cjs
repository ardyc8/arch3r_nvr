const fs = require('fs');
let code = fs.readFileSync('CHANGELOG.md', 'utf8');

const target = `## [Ver 9.3.5]`;

const replacement = `## [Ver 9.3.6] - 2026-09-16
### Fixed
- **Maximum Call Stack Size Exceeded (Crash Loop):** Memperbaiki bug kritis *infinite recursion* pada fungsi \`getLocalTimeString()\` yang menyebabkan server \`node server.js\` mogok saat *startup*. Server sekarang berjalan stabil.

## [Ver 9.3.5]`;

code = code.replace(target, replacement);
fs.writeFileSync('CHANGELOG.md', code);
