const fs = require('fs');
let code = fs.readFileSync('CHANGELOG.md', 'utf8');

const target = `## [Ver 9.3.10]`;

const replacement = `## [Ver 9.3.11] - 2026-09-16
### Fixed
- **Critical Crash on Camera Save:** Memperbaiki celah *Fatal Error* di _backend_ (Node.js) yang menyebabkan server NVR mati (*crash*) secara seketika dengan pesan error \`Failed to fetch\` saat menyimpan kamera. Ini terjadi karena:
  1. Adanya proses gagal panggil (\`ENOENT\`) pada FFmpeg jika paket \`ffmpeg\` belum terinstal/rusak pada sistem STB Armbian, yang sebelumnya tidak di-_handle_ dan langsung mematikan aplikasi.
  2. Kamera dengan format URL kosong yang memicu proses validasi RTSP gagal.
  3. Pembuatan folder rekaman lokal (\`fs.mkdirSync\`) pada _storage_ atau Flashdisk yang bermasalah (Read-Only) yang sebelumnya dapat membunuh _service_ utama.
Semuanya telah dibungkus dengan *Try-Catch & Error Handler* yang ketat (Anti-Crash).

## [Ver 9.3.10]`;

code = code.replace(target, replacement);
fs.writeFileSync('CHANGELOG.md', code);
