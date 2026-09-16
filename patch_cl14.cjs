const fs = require('fs');
let code = fs.readFileSync('CHANGELOG.md', 'utf8');

const target = `## [Ver 9.3.7]`;

const replacement = `## [Ver 9.3.8] - 2026-09-16
### Changed
- **UI/UX Cleanup (Superadmin):** Memperbaiki masalah tata letak antarmuka (UI) Superadmin yang berantakan (*squished*/terpotong) saat dibuka dalam mode *landscape* (mendatar) di ponsel/tablet. Menghapus dekorasi yang "berlebih-lebihan" (warna *background* pelangi, *border* tebal, dan *padding* yang terlalu memakan ruang) sehingga tampilan menjadi bersih, profesional, dan seragam dengan halaman utama.

## [Ver 9.3.7]`;

code = code.replace(target, replacement);
fs.writeFileSync('CHANGELOG.md', code);
