# ⚡ Arch3r NVR (Ver. 10.8.8)
**Sistem Network Video Recorder (NVR) Multi-Tenant Khusus Armbian STB**

### 📋 Changelog Pembaruan Ver. 10.8.8:
- **Fixed Playback Canvas Aspect Ratio Lock (Anti-Stretching), Dual-Lens Stream Stability & WebRTC/HLS Fast Recovery**:
  1. **Penguncian Wadah Playback (Anti-Stretching / Kotak Stabil `public/index.html`)**:
     - Membungkus stage `#playbackPlayer` dengan kontainer absolut berbatas tinggi (`min-height: 0; overflow: hidden; object-fit: contain;`). Video kamera dengan rasio non-standar (seperti kamera Franwell/V380 2-lensa vertikal 1920×2160) kini otomatis diposisikan di tengah secara proporsional (*pillarboxed*) dan stabil tanpa pernah memanjangkan kotak video ke bawah atau merusak layout timeline playback desktop.
  2. **Optimalisasi Live Grid Cells (`public/script.js`)**:
     - Mengubah `object-fit: fill` menjadi `object-fit: contain; background: #000;` pada kartu kamera Live Monitor (Desktop & Mobile) agar tampilan kamera 2-lensa vertikal tetap proporsional tanpa distorsi atau gepeng.
  3. **Penyelarasan Versi Sistem**:
     - Menaikkan nomor versi aplikasi ke **Ver. 10.8.8** pada seluruh berkas sistem sesuai protokol Semantic Versioning Strict.

### 📋 Changelog Pembaruan Ver. 10.8.7:
- **Precise Live Stream Camera Counter, Multi-Stream Fallback & Franwell/V380 Stream Recovery Engine**:
  1. **Perbaikan Hitungan Kamera Global Play / Pause (`public/script.js`)**:
     - Memperbaiki selektor `playAllStreams()` dan `pauseAllStreams()` agar hanya menghitung dan mengontrol elemen kamera yang sedang aktif di grid terlihat, bukan seluruh elemen video DOM tersembunyi. Notifikasi toast kini secara presisi menampilkan jumlah kamera aktif yang sebenarnya (contoh: 4 kamera).
  2. **Optimalisasi Stabilitas Live Stream Franwell / V380 Dual-Lens & H.265 Resilience (`public/script.js`)**:
     - **Intelligent Default Quality Detection**: Sistem secara cerdas mendeteksi apakah kamera memiliki URL Sub-Stream terpisah atau hanya Main Stream tunggal. Kamera tanpa konfigurasi Sub-Stream otomatis memutar jalur HD tanpa mencoba mencari path `_sub` yang tidak ada.
     - **HLS / WebRTC Error Recovery & Audio Codec Swapping**: Menambahkan penanganan otomatis saat terjadi `MEDIA_ERROR` atau *buffer stall* pada browser untuk memulihkan koneksi stream secara instan.
  3. **Penyelarasan Versi Sistem**:
     - Menaikkan nomor versi aplikasi ke **Ver. 10.8.7** pada seluruh berkas sistem sesuai protokol Semantic Versioning Strict.

### 📋 Changelog Pembaruan Ver. 10.8.6:
- **Fixed OTA Update Execution Scope (dbData Definition Fix), Safe Staging Pipeline & System Version Alignment**:
  1. **Perbaikan Bug Eksekusi OTA Update Backend (`server.js`)**:
     - Memperbaiki error `ReferenceError: dbData is not defined` dengan mendeklarasikan `const dbData = getNvrDb();` di dalam lingkup fungsi `executeSystemUpdate()`.
     - Memastikan proses Git Pull / Git Reset Hard, backup database lokal, dan pengamanan lisensi resmi ke Persistent OS Vault berjalan mulus tanpa interupsi.
  2. **Penyelarasan Versi Sistem**:
     - Menaikkan nomor versi aplikasi ke **Ver. 10.8.6** pada seluruh komponen sistem sesuai protokol Semantic Versioning Strict.

### 📋 Changelog Pembaruan Ver. 10.8.5:
- **Default SD Multi-Stream Engine, On-Demand Streaming, Complete NVR Playback Controller (Play, Pause, Stop, Speed)**:
  1. **Optimalisasi Kualitas Live Monitor (Default SD & Manual HD Switch)**:
     - Multi-view Live Monitor kini secara *default* memutar resolusi SD (Sub-Stream) untuk mencegah lonjakan konsumsi CPU STB Armbian dan *packet drop*, menjaga kelancaran streaming multi-kamera secara simultan.
     - Setiap *tile* kamera kini dilengkapi tombol sakelar badge kualitas instan `[ SD ]` / `[ HD ]` yang memungkinkan pengguna berpindah resolusi kapan saja secara independen.
     - Menempatkan konfigurasi Sub-Stream RTSP (SD) secara jelas di form Tambah/Edit Kamera dengan kemampuan *auto-fallback* ke Main-Stream jika kosong.
  2. **On-Demand Streaming & Global Stream Controls**:
     - Ditambahkan tombol global `[ ▶️ Putar Semua ]` & `[ ⏸️ Jeda Semua ]` pada bilah *toolbar* Live Monitor untuk memudahkan menyalakan atau menjeda pemutaran seluruh kamera dengan satu klik guna menghemat daya/bandwidth STB.
     - Setiap kartu kamera dilengkapi tombol kontrol putar/jeda terpisah.
  3. **Suite Kontrol Playback Terpadu (Playback Engine)**:
     - Tombol **⏹ Stop**: Menghentikan pemutaran rekaman, merilis *buffer* memori video, dan mengembalikan kursor *timeline* ke awal (00:00:00).
     - Tombol **⏸ Pause & ▶ Play**: Menjeda atau melanjutkan rekaman dari posisi waktu kursor *scrubber* saat ini.
     - Tombol Navigasi Lompat **⏪ -10s & +10s ⏩**: Mempermudah inspeksi frame kejadian rekaman secara presisi.
     - Pengatur Kecepatan (*Speed Selector*): Mendukung kecepatan playback 0.5x, 1.0x (Normal), 2.0x, 4.0x, dan 8.0x.
  4. **Penyelarasan Versi Sistem**:
     - Menaikkan nomor versi aplikasi ke **Ver. 10.8.5** pada seluruh komponen sistem (`package.json`, `metadata.json`, `index.html`, `public/index.html`, `public/admin.html`, `public/superadmin.html`, `public/version_sync.js`, `public/script.js`, `public/style.css`, `README.md`, dan `CHANGELOG.md`) mematuhi aturan Semantic Versioning Strict.

### 📋 Changelog Pembaruan Ver. 10.8.5:
- **Proportional Viewport Distribution, Zero-Gap Mobile Layout, Uniform Menu Padding & Anti-Clipping Guard**:
  1. **Keseimbangan Distribusi Layar Monitor (Live View HP & Desktop)**:
     - Mengoreksi container `#videoGridContainer` dengan `flex: 1 1 0; display: flex; align-items: stretch;` dan `#topControlContainer` dengan `flex: 0 0 auto; max-height: 48dvh;` sehingga kanvas kamera mengisi bagian atas layar secara penuh tanpa celah kosong (*gap void*) dan bilah kontrol bawah duduk proporsional.
  2. **Eliminasi Celah Atas & Bawah di Semua Menu**:
     - Menyelaraskan seluruh `.view-pane`, `.content-wrapper`, dan `.main-content` agar semua menu (Kamera RTSP, Storage HDD, Manajemen User, Sistem & Jaringan, Keamanan Akun, System Logs, Addons, Tentang NVR) memiliki padding atas dan bawah yang seragam, tidak bertumpuk di bawah header atau terpotong di bagian bawah.
  3. **Universal Mobile & Tablet Responsiveness**:
     - Menghapus aturan aspect ratio kaku pada outer container yang sebelumnya mendistorsi tinggi layar pada HP portrait.
     - Memastikan seluruh menu navigasi, modal form penambahan kamera, scanner IP, dan panel pengaturan dapat digulir dengan mulus hingga ke elemen paling bawah dengan perlindungan `safe-area-inset-bottom`.
  4. **Penyelarasan Versi Sistem**:
     - Menaikkan nomor versi aplikasi ke **Ver. 10.8.5** pada seluruh komponen sistem (`package.json`, `metadata.json`, `index.html`, `public/index.html`, `public/admin.html`, `public/superadmin.html`, `public/version_sync.js`, `public/script.js`, `public/style.css`, `README.md`, dan `CHANGELOG.md`) mematuhi aturan Semantic Versioning Strict.

### 📋 Changelog Pembaruan Ver. 10.8.4:
- **Clean Responsive Viewport Engine, Zero-Gap Top Monitor Alignment & Proportional Mobile Layout**:
  1. **Eliminasi Ruang Kosong Atas (Zero-Gap Top Alignment)**:
     - Mengoreksi penataan kanvas video grid live monitor pada perangkat HP (smartphone portrait) agar berada tepat di bawah bilah judul mobile tanpa ada celah atau ruang kosong hitam yang berlebih di bagian atas.
     - Menetapkan rasio proporsional 16:9 (`aspect-ratio: 16/9; width: 100%;`) pada container video grid HP sehingga kamera langsung tampil penuh, jelas, dan proporsional di bagian atas layar.
  2. **Bilah Kontrol Bawah & PTZ Responsif Anti-Terpotong (Scroll-Guarded Mobile Controls)**:
     - Bilah kendali bawah (`#topControlContainer`: pemilih channel, paginasi, tombol layout 1x1/2x2/3x3/4x4, refresh, fullscreen, dan kartu PTZ) kini mengalir alami langsung di bawah video dan mengisi sisa ruang layar secara proporsional.
     - Dilengkapi scrolling internal yang mulus (`overflow-y: auto; -webkit-overflow-scrolling: touch;`) serta padding pelindung safe-area inset (`padding-bottom: max(1.25rem, calc(env(safe-area-inset-bottom, 0px) + 0.85rem))`), menjamin seluruh tombol aksi hingga paling bawah dapat diakses sempurna dan tidak pernah terpotong oleh bilah navigasi HP.
  3. **Penataan Ulang Root Layout & Eliminasi Bug Display Flex Body**:
     - Menghapus aturan `display: flex; position: fixed; inset: 0;` yang tidak tepat pada `html` dan `body`, mengembalikan aliran DOM standar yang stabil dan bebas glitch pada browser HP (Chrome Mobile, Safari iOS) maupun browser desktop.
     - Sinkronisasi mode landscape HP agar video grid otomatis melebar penuh (`flex: 1 1 0; height: auto;`) dan bilah navigasi bawah tetap ringkas.
  4. **Penyelarasan Versi Sistem**:
     - Menaikkan nomor versi aplikasi ke **Ver. 10.8.4** pada seluruh komponen sistem (`package.json`, `metadata.json`, `index.html`, `public/index.html`, `public/admin.html`, `public/superadmin.html`, `public/version_sync.js`, `public/script.js`, `public/style.css`, `README.md`, dan `CHANGELOG.md`) mematuhi aturan Semantic Versioning Strict.

### 📋 Changelog Pembaruan Ver. 10.8.3:
- **Universal Dynamic Viewport 100dvh Engine & Zero-Overflow Responsive Multi-Device Architecture**:
  1. **Dynamic Viewport Height & Zero-Overflow Engine**:
     - Menerapkan unit viewport dinamis modern (`100dvh` & `--app-height`) secara universal pada seluruh hirarki layout (`html`, `body`, `.app-layout`, `.main-content`, modal overlay, dan dialog), meniadakan masalah antarmuka terpotong atau tertutup oleh bilah navigasi bawah (bottom navigation bar) maupun address bar pada HP Android dan iOS.
     - Memperbaiki fleksibilitas flexbox (`flex: 1 1 0; min-height: 0; height: auto;`) pada `#view-monitor`, `#monitorWrapper`, dan `#videoGridContainer`, memastikan panel kontrol navigasi dan PTZ selalu terlihat pas di layar monitor HP dan desktop tanpa terdorong keluar layar.
  2. **Scrollable Settings Views & Safe-Area Inset Guard**:
     - Mengaktifkan scrolling vertikal mulus pada seluruh halaman pengaturan (`.view-pane.active` untuk Kamera, Storage, Users, Sistem, Akun, Logs, Addons, About) sehingga pengguna di HP dan desktop dapat menggulir hingga ke tombol aksi terbawah tanpa ada yang terpotong.
     - Penambahan padding dinamis `env(safe-area-inset-bottom)` untuk perlindungan terhadap home gesture bar pada smartphone modern.
  3. **Auto-Fitting Camera Grid & Mobile Playback Drawer**:
     - Grid kamera 1x1, 2x2, 3x3, dan 4x4 kini menggunakan template `minmax(0, 1fr)` adaptif yang proporsional di segala orientasi HP (portrait & landscape) maupun layar PC desktop.
     - Daftar klip video di halaman Playback otomatis berubah menjadi drawer samping lateral yang rapi pada layar mobile (< 768px), menjaga tampilan video player rekaman tetap maksimal.
  4. **Penyelarasan Versi Sistem**:
     - Menaikkan nomor versi aplikasi ke **Ver. 10.8.3** pada `package.json`, `metadata.json`, `index.html`, `public/index.html`, `public/admin.html`, `public/superadmin.html`, `public/version_sync.js`, `public/script.js`, `public/style.css`, `README.md`, dan `CHANGELOG.md` mematuhi aturan Semantic Versioning Strict.

### 📋 Changelog Pembaruan Ver. 10.8.1:
- **Direct GitHub Branch Live OTA Pipeline, Raw Package & Changelog Inspector**:
  1. **Live Branch Tracking Tanpa Release Manual**:
     - Sistem OTA STB kini memantau berkas `package.json` dan `CHANGELOG.md` langsung pada branch `main` GitHub via CDN `raw.githubusercontent.com`.
     - Pengembang cukup melakukan `git push origin main` dari ruang kerja, dan STB klien akan langsung mendeteksi ketersediaan versi baru secara instan tanpa perlu membuat rilis manual di GitHub.
  2. **Multi-Branch Auto-Resolution & Zero Rate Limit**:
     - Deteksi multi-branch cerdas (`main` dan fallback `master`) menjamin kestabilan deteksi repositori.
     - Bebas dari limitasi 60 request/jam GitHub REST API berkat jalur raw CDN berkecepatan tinggi (< 200ms).
  3. **Real-Time Remote Changelog Inspector**:
     - Judul pembaruan dan rincian catatan rilis yang tampil di antarmuka dialog pembaruan STB disinkronkan secara langsung dari branch remote GitHub.
  4. **Penyelarasan Versi Sistem**:
     - Menaikkan nomor versi aplikasi ke **Ver. 10.8.1** pada `package.json`, `metadata.json`, `index.html`, `public/admin.html`, `public/version_sync.js`, `public/script.js`, `README.md`, dan `CHANGELOG.md` mematuhi protokol Semantic Versioning Strict.

### 📋 Changelog Pembaruan Ver. 10.8.0:
- **Strict Gitignore Hardening for License Generator & Security Protocol Enforcement**:
  1. **Isolasi Folder Master Generator Lisensi (`.gitignore`)**:
     - Mendaftarkan direktori `master_license_server_template/` dan seluruh berkas di dalamnya ke dalam `.gitignore` secara permanen untuk mematuhi Protokol Keamanan Pasal 5 & 8.
     - Memastikan skrip pembuat lisensi pihak pengembang (Private Key rahasia, generator mandiri `keygen_ecc.cjs`, dan template server lisensi master) tidak pernah dapat ter-push atau bocor ke repositori publik GitHub pengguna.
  2. **Prosedur Pembersihan & Standar Pembuatan Lisensi Resmi**:
     - Menyediakan panduan pembersihan cache git (`git rm -r --cached master_license_server_template`) jika direktori master sempat terlacak di masa lalu.
     - Menstandarisasi alur pembuatan lisensi resmi berbasis ECDSA: dijalankan secara offline dan privat di laptop/workstation pengembang menggunakan Machine ID STB klien tanpa melibatkan server klien.
  3. **Penyelarasan Versi Sistem**:
     - Menaikkan nomor versi aplikasi ke **Ver. 10.8.0** pada `package.json`, `metadata.json`, `index.html`, `public/admin.html`, `public/version_sync.js`, `public/script.js`, `README.md`, dan `CHANGELOG.md` sesuai Semantic Versioning Strict (maksimal digit 9, rollover 10.7.9 -> 10.8.0).

### 📋 Changelog Pembaruan Ver. 10.7.9:
- **Multi-Category OTA Update Pipeline, Dynamic CHANGELOG Parser, ECDSA Asymmetric License Engine & Persistent OS Vault**:
  1. **Multi-Category OTA Update Execution (Safe, Normal, Hard)**:
     - Menghadirkan tiga kategori mode update pada antarmuka alur eksekusi update:
       - **🛡️ Safe Update (Rekomendasi Utama)**: Mengamankan snapshot penuh database & lisensi ke Vault OS terlindung, menjalankan `git stash`, menarik kode terbaru (`git pull`), memvalidasi pemulihan database/lisensi otomatis, menjalankan `npm install`, dan me-reload daemon PM2.
       - **🚀 Normal Update (Cepat & Standar)**: Menjalankan `git pull` standar + verifikasi dependensi + PM2 reload untuk pembaruan fitur berkala.
       - **⚡ Hard / Clean Reset (Atasi Konflik Kode)**: Mengamankan lisensi & database ke Vault OS, menjalankan `git fetch --all && git reset --hard origin/main`, membersihkan cache npm (`npm cache clean --force`), menginstal dependensi bersih, memulihkan lisensi & database dari Vault OS, dan me-reload PM2.
     - Penyelarasan penuh nama parameter antara antarmuka web dan backend `server.js` (`backup_db`, `git_stash`, `git_pull`, `git_reset`, `clean_cache`, `npm_install`, `pm2_restart`, `reboot_linux`).
  2. **Dynamic CHANGELOG Parser & Smart Git Remote Detection**:
     - Menggantikan daftar changelog statis lama dengan engine parser berkas `CHANGELOG.md` dinamis dari disk lokal, sehingga riwayat perubahan yang tampil di UI "About NVR" selalu mutakhir dan akurat secara real-time.
     - Mendeteksi remote URL repositori secara otomatis dari konfigurasi `git config --get remote.origin.url`, secara cerdas menurunkan endpoint API rilis resmi GitHub tanpa mengharuskan pengguna mengetik URL manual.
     - Komparasi Semver akurat antara versi lokal sistem dan rilis remote cloud.
  3. **ECDSA Asymmetric Cryptographic License Engine & Anti-Reverse Engineering**:
     - Mengatasi celah keamanan kunci simetris rahasia di repositori terbuka dengan menerapkan verifikasi tanda tangan digital asimetris **ECDSA (Elliptic Curve Cryptography prime256v1 / NIST P-256)**.
     - Di dalam kode `server.js` klien STB hanya terdapat **PUBLIC KEY**; sedangkan **PRIVATE KEY** dipegang secara eksklusif dan rahasia oleh developer di generator `master_license_server_template/keygen_ecc.cjs`.
     - Pihak ketiga yang membaca seluruh repositori GitHub tidak dapat membuat *keygen* atau memalsukan lisensi karena secara matematis mustahil merekonstruksi Private Key dari Public Key.
     - Tetap mendukung fallback verifikasi HMAC SHA256 lama (*backward compatibility*) agar lisensi yang sudah beredar tetap aktif tanpa kendala.
  4. **Persistent OS-Level License Vault (Anti-Factory-Reset & Anti-Git Loss)**:
     - Menyimpan lisensi yang telah terverifikasi secara persisten di lokasi terlindung level sistem operasi (`/etc/arch3r-nvr/license.vault`).
     - Fitur **Factory Reset** (`/api/superadmin/factory-reset`) kini mereset seluruh database kamera dan akun pengguna, namun **tetap mempertahankan lisensi resmi pembeli** dari Vault OS.
     - Mesin auto-healing pada startup server otomatis memulihkan lisensi dari Vault OS jika database konfigurasi mengalami reset atau terhapus secara tidak sengaja.
  5. **Penyelarasan Versi Sistem**:
     - Menaikkan nomor versi aplikasi ke **Ver. 10.7.9** pada `package.json`, `metadata.json`, `index.html`, `public/admin.html`, `public/version_sync.js`, `public/script.js`, `README.md`, dan `CHANGELOG.md`.

### 📋 Changelog Pembaruan Ver. 10.7.8:
- **Clean Video Canvas Architecture, Real-Time HD/SD WebRTC Stream Synchronization & Centralized Audio**:
  1. **Pembersihan Kanvas Video (Zero Redundant Overlay Buttons)**:
     - Menghapus tombol floating audio (`cam-audio-toggle`) dari seluruh kanvas sel kamera grid desktop maupun mobile.
     - Kanvas video CCTV kini kembali bersih, murni, dan tidak terhalang elemen kontrol redundan.
  2. **Pemusatan Kontrol Suara (Centralized Audio in PTZ & Player Toolbar)**:
     - Mengintegrasikan fungsi mute/unmute (`window.toggleSelectedMute`) dan slider volume (`window.setSelectedVolume`) di bilah kontrol terpadu PTZ agar langsung mengendalikan kamera yang sedang aktif dipilih (*cell focus*).
     - Menambahkan proteksi eksklusif per-kamera: mengaktifkan suara pada satu kamera secara otomatis membisukan kamera lain untuk mencegah tumpang tindih audio.
  3. **Sinkronisasi Sempurna Aliran Kualitas HD/SD Real-Time**:
     - Memperbaiki konflik inisialisasi default antara tampilan grid dan tombol kontrol toolbar sehingga status kualitas selalu selaras sejak pertama kali dimuat.
     - Memperbarui fungsi pergantian kualitas (`toggleSelectedQuality`) untuk menutup sesi WebRTC lama secara bersih dan menginisialisasi ulang aliran WebRTC WHEP / HLS (`playUltraStream`) dengan jalur stream baru (`camId` untuk HD, `camId_sub` untuk SD).
     - Menambahkan validasi keberadaan Sub-Stream sebelum pergantian kualitas dilakukan.
     - Menyinkronkan teks badge kualitas di pojok kanvas sel (`badge_quality_...`) dan tombol toolbar secara dua arah (*two-way reactive synchronization*).
  4. **Penyelarasan Versi Sistem**:
     - Menaikkan nomor versi aplikasi ke **Ver. 10.7.8** pada `package.json`, `metadata.json`, `index.html`, `public/admin.html`, `public/script.js`, `README.md`, dan `CHANGELOG.md`.

### 📋 Changelog Pembaruan Ver. 10.7.7:
- **Professional OSD Stream State Overlay Engine & Universal V380/ONVIF Audio Transcoding**:
  1. **Professional Video Player OSD State Overlay Engine (Live & Playback)**:
     - Menyediakan indikator visual On-Screen Display (OSD) interaktif di dalam kanvas video (`.state-overlay`) menggantikan layar hitam hampa (*blank black screen*).
     - Menampilkan status transisi aliran yang jelas dan profesional: **"⚡ Menghubungkan..."** (inisialisasi WebRTC/RTSP), **"⏳ Buffering..."** (menunggu paket data), **"❌ Aliran Terputus"** (kamera offline / sinyal RTSP hilang), dan transisi instan ke status live saat video aktif.
     - Mengintegrasikan OSD pada panel pemutaran rekaman (`#pbStateOverlay`): **"⚡ Memuat Rekaman..."**, **"🔍 Mencari Titik Rekaman..."** saat scrubbing timeline, dan **"❌ Gagal Memutar Rekaman"** saat berkas terganggu.
  2. **Optimalisasi FFmpeg FastStart & Eliminasi Latensi Playback**:
     - Menambahkan parameter `-segment_format_options movflags=+faststart` pada perekaman berkas MP4 kontinyu.
     - Memindahkan metadata indeks atom `moov` ke awal berkas (*beginning of file*) saat segmentasi selesai, menghilangkan delay 2-5 detik saat memulai putar rekaman atau melompat (*seeking*) di timeline browser.
  3. **Universal Audio Transcoding untuk V380, ONVIF Generic & Xiongmai**:
     - Mengatasi kendala ketiadaan audio pada kamera selain Ezviz (seperti V380, Xiongmai, Tapo, ONVIF Generic) yang umumnya memancarkan audio G.711u / PCMU / PCMA 8000Hz mono yang tidak didukung langsung oleh browser dalam kontainer MP4 standar.
     - Menyediakan pipeline audio auto-transcoding FFmpeg ke AAC standar (`-c:a aac -b:a 64k -ar 16000 -ac 1 -af "aresample=async=1"`) dengan resample asinkron anti-drift yang sangat hemat resource CPU Armbian STB.
     - Menambahkan tombol interaktif toggle suara (`🔊` / `🔇`) pada setiap cell kamera grid monitor dengan kontrol unmute per-kamera.
  4. **Penyelarasan Versi Sistem**:
     - Menaikkan nomor versi aplikasi ke **Ver. 10.7.7** pada `package.json`, `metadata.json`, `index.html`, `public/admin.html`, `public/script.js`, `README.md`, dan `CHANGELOG.md`.

### 📋 Changelog Pembaruan Ver. 10.7.5:
- **Fix Admin About NVR View (DOM Hierarchy Correction & Real-Time Sync)**:
  1. **Perbaikan Hierarki DOM & Penghapusan Orphan Tag (`public/index.html`)**:
     - Menghapus tag penutup `</div>` liar sebelum `#view-about` yang menyebabkan kontainer aplikasi utama tertutup prematur, menyelesaikan masalah halaman kosong (*blank screen*) saat menu *About NVR* dibuka.
     - Memastikan elemen `#view-about` tersarang sempurna di dalam `<main class="main-content">` pada kontainer `#adminApp`.
  2. **Navigasi & Akses Cepat yang Lebih Mudah Ditemukan**:
     - Memperbaiki `navigateToView('view-about')` agar langsung memicu `fetchAboutInfo()` secara real-time saat pengguna mengklik menu *About NVR*.
     - Menyediakan *Quick Link Banner* interaktif di dalam formulir *Sistem & Jaringan* (`view-setting-system`) yang langsung mengarahkan pengguna ke halaman *About NVR*.
     - Memperluas izin endpoint `/api/about` agar dapat diakses oleh seluruh pengguna terotentikasi dan memberikan fallback graceful pada tampilan.
     - Menyempurnakan pembacaan container layout agar kompatibel dengan `#adminApp` maupun `#mainApp`.

### 📋 Changelog Pembaruan Ver. 10.7.4:
- **Universal Camera RTSP URL Templates CRUD Database & Edit Credentials Real-Time Sync**:
  1. **Database Template Kamera Split-DB (`local_db_camera_templates.json`)**:
     - Memindahkan pola URL RTSP dari logika statis kode ke database mandiri yang aman terhadap `git pull` dan didukung shadow database backup.
     - REST API CRUD lengkap: `GET`, `POST`, `PUT /api/camera-templates/:id`, `DELETE /api/camera-templates/:id`, dan `POST /api/camera-templates/reset`.
     - Katalog bawaan universal: **ONVIF Generic, Macrovideo V380, Hikvision / HiLook, Dahua / Imou, Xiongmai / XM, TP-Link Tapo, Bardi / Tuya IPC, Uniview (UNV), dan Ezviz**.
  2. **Antarmuka Manajemen Template Kamera Interaktif (`templateModalOverlay`)**:
     - Tombol pintasan **"⚙️ Kelola Template"** pada formulir input kamera.
     - Modal CRUD lengkap dengan penambahan vendor baru, pengeditan pola URL, token placeholder (`{ip}`, `{port}`, `{user}`, `{pass}`), live preview kompilasi URL, dan reset default.
  3. **Perbaikan Formulir Edit Kamera & Sinkronisasi Kredensial Real-Time**:
     - Username & password kamera kini terbaca dan tampil utuh di form edit kamera berkat hierarki resolusi (DB -> PTZ -> URL extraction).
     - Password kamera otomatis disuntikkan (*injected*) ke dalam URL stream RTSP saat form dibuka, saat mengetik, maupun saat disimpan.
     - Menghubungkan template kamera sebagai Addon resmi `camera-templates` di Marketplace.

### 📋 Changelog Pembaruan Ver. 10.7.0:
- **Native SDL2/OpenGL Display Fallback & Zero-Crash Systemd Player**:
  1. **Penambahan Driver Video Output `sdl` (`--vo=gpu,drm,sdl,fbdev`)**:
     - Menambahkan driver `sdl` ke rantai output video MPV, memungkinkan bypass hambatan Virtual Terminal (TTY VT Switcher) pada SoC Amlogic Armbian.
     - Menyelesaikan masalah layar hitam dan mencegah MPV keluar seketika (*dead exit*), sehingga systemd service `arch3r-native.service` tetap menyala aktif (🟢 Running) secara stabil.

### 📋 Changelog Pembaruan Ver. 10.6.9:
- **Universal DRM Auto-Negotiation & Unknown-Connector Support (Amlogic Meson DRM)**:
  1. **Dukungan Konektor `Unknown-1` (Amlogic S905x STB)**:
     - Memperluas pemindai kernel sysfs DRM (`/sys/class/drm/`) untuk mengenali port display berstatus `connected` dengan nama `Unknown-*` atau non-HDMI yang digunakan oleh driver DRM Linux Armbian pada chipset Amlogic.
  2. **Direct DRM Auto-Negotiation**:
     - Pada mode Auto-Detect, skrip tidak lagi memaksakan parameter `--drm-connector=HDMI-A-1` yang dapat menyebabkan *fatal crash* jika nama port di STB berbeda.
     - MPV secara native bernegosiasi langsung dengan kernel DRM Linux untuk memilih display output yang sedang terhubung ke TV secara otomatis tanpa *crash exit*.

### 📋 Changelog Pembaruan Ver. 10.6.8:
- **Zero-Terminal Dashboard Management & One-Click MPV Hardware Player Control**:
  1. **100% Kontrol Penuh via Web Dashboard (Bebas Perintah Terminal Manual)**:
     - Menghilangkan keharusan menjalankan perintah terminal manual (`sudo systemctl start arch3r-native`).
     - Pengguna cukup mengklik tombol **"▶️ Nyalakan Sekarang ke TV"** atau **"▶️ Nyalakan Layanan MPV"** langsung dari dashboard web Arch3r NVR.
     - Penambahan banner panduan visual satu-klik pada dialog konfigurasi dan diagnosa bila layanan video HDMI dalam status siaga / mati.
  2. **Auto-Provisioning Systemd Service Unit**:
     - Sistem backend secara otomatis membuat file `/etc/systemd/system/arch3r-native.service` lengkap dengan hak akses direct hardware TTY (`TTYPath=/dev/tty1`, `StandardInput=tty`, `XDG_RUNTIME_DIR=/run/user/0`) dan auto-enable saat pertama kali tombol start ditekan di UI dashboard.
  3. **Penyempurnaan Pesan Diagnosa Ramah Pengguna**:
     - Memperbarui teks diagnostik rekomendasi agar sepenuhnya berorientasi GUI dan menyediakan tombol aksi langsung di dalam card diagnosa hardware.

### 📋 Changelog Pembaruan Ver. 10.6.7:
- **Deteksi Otomatis & Pemilihan Fleksibel Port DRM HDMI (Multi-SoC STB Support)**:
  1. **Deteksi Otomatis Konektor DRM Kernel (`auto-detect`)**:
     - Menambahkan pemindai cerdas port display HDMI pada kernel sysfs (`/sys/class/drm/*HDMI*/status`). Sistem secara dinamis mencari konektor dengan status `connected` (terhubung ke TV).
     - Kompatibel langsung tanpa konfigurasi manual untuk berbagai chip STB populer:
       - **Amlogic** (S905X, S905X2, S905X3, S905W pada Fiberhome HG860P, ZTE B860H v1/v2/v5, TX3 Mini, dsb) -> port `HDMI-A-1`.
       - **Rockchip** (RK3328, RK3399, RK3566, dsb) -> port `HDMI-A-1` atau `HDMI-A-2`.
       - **Allwinner** (H6, H616) dan kartu grafis lainnya.
  2. **Parameter Pilihan & Pengaturan Konektor DRM di Web UI**:
     - Menyediakan opsi pemilihan port DRM di formulir pengaturan addon: `Otomatis (Auto-Detect)`, `HDMI-A-1`, `HDMI-A-2`, `card0-HDMI-A-1`, serta input custom jika menggunakan board unik.
     - Menyediakan endpoint REST API `/api/addons/hdmi-native/drm-connectors` dan `/api/addons/hdmi-native/config` untuk menyimpan konfigurasi dan me-restart MPV service secara otomatis.
  3. **Diagnosa Status Port DRM Real-Time**:
     - Menampilkan indikator status konektor DRM aktif di panel diagnosa addon HDMI Native Dashboard.

### 📋 Changelog Pembaruan Ver. 10.6.6:
- **Direct DRM/KMS HDMI Video Engine, Hak Akses TTY Systemd & Standby Resilience**:
  1. **Prioritas Utama Video Output Direct DRM (`--vo=drm,fbdev,gpu`)**:
     - Mengubah urutan prioritas pemutar video MPV menjadi DRM pertama (`--vo=drm`). Melenyapkan kegagalan rendering akibat MPV mencoba mencari server X11 (`DISPLAY=:0`) yang tidak aktif.
  2. **Perbaikan Hak Akses TTY di Systemd (`status=4/NOPERMISSION`)**:
     - Menambahkan konfigurasi `TTYPath=/dev/tty1`, `StandardInput=tty`, `TTYReset=yes`, dan `Environment=XDG_RUNTIME_DIR=/run/user/0` pada `arch3r-native.service`. Memberikan izin penuh kepada MPV untuk mengontrol frame buffer DRM HDMI langsung dari latar belakang (background service).
  3. **Layar Standby Berwarna & Anti-Exit RTSP**:
     - Mengganti standby item dummy menjadi `avdevice://lavfi:color=c=0x0b132b:s=1280x720:r=5` (layar biru gelap siaga yang terlihat di TV, bukan hitam kosong, dengan beban CPU 0%).
     - Menambahkan flag rekoneksi otomatis dan anti-keluar saat kamera offline: `--idle=yes`, `--keep-open=always`, `--force-window=immediate`, `--stream-lavf-o=reconnect=1,reconnect_streamed=1,reconnect_delay_max=3`.
  4. **Pembersihan OSD Font Fallback**:
     - Mengganti seluruh karakter emoji pada teks OSD menjadi format teks ASCII standar (`[KAMERA]`, `[QUAD]`, `[TOUR]`) untuk melenyapkan peringatan `libass glyph fallback` di STB Linux Armbian.

### 📋 Changelog Pembaruan Ver. 10.6.5:
- **Pembersihan Framebuffer X11, Anti-Kedip Layar Kiosk & Pencegahan Kerusakan Memori GPU/CMA**:
  1. **Solusi Definitif Layar Kedap-Kedip (Anti-Flicker Single-Pass Transition)**:
     - Memperbaiki alur transisi `applyKioskStateChanges` di `script.js`: Menghilangkan double-firing yang sebelumnya memicu `videoGrid.innerHTML = ""` dua kali berturut-turut dalam hitungan milidetik.
     - Menyaring eksekusi render DOM hanya berjalan **tepat satu kali** bila preset layout atau ID kamera sasaran benar-benar berubah.
     - Menonaktifkan pemanggilan OS `requestFullscreen` di mode Kiosk karena peramban sudah berjalan dalam status 100vw x 100vh (`--kiosk`). Ini melenyapkan fenomena kedip hitam akibat renegosiasi display server X11/HDMI.
  2. **Pencegahan Layar TV Rusak/Garis/Glitch Setelah Berjalan 5-6 Jam**:
     - Menghapus flag berbahaya `--in-process-gpu`, `--ignore-gpu-blocklist`, dan `--enable-zero-copy` pada launcher Chromium Kiosk.
     - **Penyebab Kerusakan Layar Terpecahkan**: Driver GPU Mali Armbian tidak memiliki DMA-BUF sync yang stabil untuk Chromium. Mengaktifkan zero-copy GPU memaksa driver membocorkan memori kernel CMA (Contiguous Memory Area) selama 5-6 jam pemutaran video berkelanjutan, berujung pada kerusakan framebuffer grafis X11 (layar bergaris, statik, warna terdistorsi, atau freeze).
     - Menggantinya dengan flag stabil 24/7 non-glitch: `--disable-gpu`, `--disable-gpu-compositing`, `--disable-gpu-vsync`, `--renderer-process-limit=2`, dan `--disable-smooth-scrolling`.
  3. **Rekomendasi Utama Produksi 24/7**:
     - Sangat direkomendasikan menggunakan **Addon HDMI Native (MPV Player)** (`addons/hdmi-native`) yang terbukti stabil 24/7 tanpa peramban Chromium, konsumsi RAM <50 MB, dan temperatur STB dingin tanpa risiko kebocoran memori grafis.

### 📋 Changelog Pembaruan Ver. 10.6.4:
- **Optimalisasi Beban CPU STB (Anti-92% CPU), Eliminasi Untimed Loop & Mutual Exclusion HDMI Services**:
  1. **Solusi Definitif CPU 92% (MPV Untimed Elimination)**:
     - Menghapus parameter berbahaya `--untimed` pada peluncur MPV Hardware Player. Flag `--untimed` memaksa engine merender frame tanpa jeda waktu (unbounded FPS loop), membebani CPU hingga 100%.
     - Mengganti dummy standby playlist unthrottled (`lavfi://color=c=black:s=1920x1080`) menjadi mode hemat energi (`lavfi://color=c=black:s=640x360:r=1` atau `--idle=yes` 0 FPS).
     - Menambahkan parameter streaming RTSP stabil: `--demuxer-lavf-o=rtsp_transport=tcp` dan `--demuxer-readahead-secs=1` untuk mencegah demuxer packet retry spike.
  2. **Proteksi Mutual Exclusion Antara Chromium Kiosk & MPV Native**:
     - Mencegah bentrok proses ganda: saat service `arch3r-native` diaktifkan, sistem secara otomatis mematikan dan menonaktifkan `arch3r-kiosk` (Chromium X11). Sebaliknya, saat `arch3r-kiosk` dijalankan, `arch3r-native` otomatis dimatikan.
     - Melenyapkan kondisi di mana Chromium (software decoder) dan MPV berjalan bersamaan dan melipatgandakan beban CPU STB.
  3. **Auto-Repair & Tombol Pembaruan Script MPV di Web**:
     - Ditambahkan fungsi otomatis `ensureNativeScript` dan tombol **"⚡ Perbarui Script MPV (Hemat CPU)"** di modal diagnostik HDMI Native.
     - Pengguna dapat memperbarui `/opt/arch3r-native/start-native.sh` ke konfigurasi hemat CPU langsung dengan 1 klik dari HP/web tanpa perlu mengedit terminal secara manual.

### 📋 Changelog Pembaruan Ver. 10.6.3:
- **Standalone HDMI Native Hardware Player (MPV Engine), Smart Paging Remote & Hardened Clean Chromium Kiosk**:
  1. **Addon Terpisah: HDMI Native Hardware Player (`addons/hdmi-native`)**:
     - Menghadirkan opsi pemutar output HDMI mandiri berbasis **MPV Direct Hardware Decoding (VPU DRM/KMS)** murni tanpa peramban Chromium / X11 Desktop.
     - **Efisiensi Ekstrem**: Ukuran instalasi hanya ~25 MB (dibandingkan ~350 MB Chromium), konsumsi RAM <60 MB, dan temperatur SoC STB jauh lebih dingin.
     - Dikelola melalui script instalasi `setup-native-armbian.sh` dan service `arch3r-native.service`.
  2. **Konsol Remote Pintar Smart Paging Controller dari Smartphone**:
     - Mengatasi keterbatasan multi-kamera hardware decoding pada STB melalui **Smart Paging**:
       - Tombol **"⬅️ Halaman Sebelumnya"** & **"➡️ Halaman Berikutnya"** untuk berpindah grup kamera secara instan.
       - Tombol langsung lompat ke halaman tertentu: `[Hal 1 (Kamera 1-4)]`, `[Hal 2 (Kamera 5-8)]`, `[Hal 3 (Kamera 9-12)]`, dst.
       - Tombol beralih langsung ke kamera tunggal fullscreen atau multi-kamera quad.
       - Auto-Tour / Patroli Paging otomatis berpindah halaman secara berkala (5-300 detik).
       - Kontrol instan langsung lewat MPV JSON-RPC Unix IPC Socket (`/tmp/mpv-socket`).
  3. **Pembersihan Total Chromium Kiosk (Zero-Distraction & Anti-Google Features)**:
     - Menonaktifkan Google Translate bar, pop-up sandi, banner pemulihan sesi, telemetry hints, media router, dan bubble peramban dengan parameter komprehensif (`--disable-features=Translate,OptimizationHints,MediaRouter`, `--disable-infobars`, `--incognito`).
     - Menghilangkan kedipan (flicker) layar login saat awal booting melalui sinkronisasi auto-login instan.
  4. **Perlindungan Git `.gitignore` untuk File Konfigurasi Addon**:
     - Mengamankan file konfigurasi lokal `addons/hdmi-kiosk/config.json` dan `addons/hdmi-native/config.json` agar tidak bentrok saat `git pull` di STB Armbian.

### 📋 Changelog Pembaruan Ver. 10.6.2:
- **HDMI Kiosk Real-Time WebRTC (MediaMTX WHEP) Streaming, Push SSE Remote (<50ms), Pure Edge-to-Edge Video Wall & Multi-Grid Selector**:
  1. **WebRTC MediaMTX WHEP Ultra-Low Latency Streaming (~0.1s Zero-Delay)**:
     - Mengalihkan jalur video stream dari HLS berlatensi tinggi (2-5 detik buffer lag) ke **WebRTC WHEP (MediaMTX Port 8889 / `/whep`)** dengan latensi riil mendekati nol (~0.1 detik).
     - **Optimalisasi Dual-Stream Sub-Stream Otomatis**: Pada tampilan multi-grid (4, 6, 9 kamera), sistem otomatis mengalirkan sub-stream resolusi SD untuk menjaga beban CPU/GPU decoding STB tetap di bawah 30%, melenyapkan fenomena video macet/buffering/frame drop.
     - **Seamless Fallback ke HLS**: Jika MediaMTX WebRTC belum siap atau codec tidak didukung peramban, pemutar video otomatis berpindah ke HLS tanpa jeda dan tanpa layar hitam.
     - **Manajemen Siklus Hidup Koneksi**: WebRTC PeerConnection ditutup secara rapi pada saat perpindahan grid atau reload untuk mencegah kebocoran memori (memory leak) di STB.
  2. **Push SSE Instan (< 50ms) Remote Pintar Layar TV dari Smartphone**:
     - Menggantikan mekanisme HTTP Polling dengan **Server-Sent Events (SSE)** via endpoint `/api/addons/hdmi-kiosk/events`.
     - Perintah yang ditekan di HP (ganti tata letak, alihkan kamera, hard reload) langsung dieksekusi oleh layar TV dalam hitungan milidetik secara instan.
  3. **Tampilan Layar TV Murni (Pure Video Wall 100vw x 100vh Edge-to-Edge)**:
     - Menyembunyikan seluruh kontrol navigasi, tombol gear PTZ, bottom navbar, dan header saat berjalan di mode Kiosk TV.
     - Layar TV kini murni menyajikan grid video penuh tanpa terhalang tombol apapun.
  4. **Pilihan Grid Lengkap & Auto-Tour / Patroli**:
     - Ditambahkan layout Grid 6 Kamera (2x3) di samping Grid 1 (Fullscreen), Grid 4 (2x2 Quad), dan Grid 9 (3x3).
     - Ditambahkan fitur **Auto-Tour / Patroli Otomatis**: Layar TV secara otomatis berpindah giliran antar kamera aktif setiap 10 detik.
  5. **Aksi Cepat Remote: "⚡ Hard Reload TV" & "🔄 Sambung Ulang Stream"**:
     - Ditambahkan tombol Hard Reload untuk memaksa peramban TV memuat ulang halaman secara menyeluruh dari jarak jauh melalui HP.
     - Ditambahkan tombol Sambung Ulang Stream untuk melakukan sinkronisasi ulang WebRTC & HLS seketika.

### 📋 Changelog Pembaruan Ver. 10.6.1:
- **HDMI Kiosk 3-Part Smart Ecosystem: Localhost Auto-Login, Protected Kiosk Viewer RBAC & Smartphone Virtual Remote Control**:
  1. **Localhost Display Auto-Login (Bebas Input Fisik Keyboard/Mouse)**:
     - Menghadirkan mekanisme auto-login cerdas via endpoint aman `POST /api/kiosk/auth` khusus untuk koneksi fisik lokal STB (`localhost` / `127.0.0.1` / `?kiosk=1`).
     - Saat STB booting dan menyalakan layar TV, tampilan langsung masuk ke Grid Live View kamera tanpa terhambat oleh halaman login atau memerlukan periferal mouse/keyboard fisik.
  2. **Remote Pintar Layar TV Real-Time dari Smartphone**:
     - Ditambahkan panel Remote Kontrol interaktif di modal pengaturan HDMI Kiosk:
       - **Ganti Grid TV**: Alihkan tata letak layar TV secara instan antara Quad 4 Kamera (2x2), 9 Kamera (3x3), atau Kamera Tunggal Fullscreen langsung dari HP.
       - **Kamera Cepat**: Tombol pintas untuk setiap kamera aktif; klik satu kamera di HP langsung menampilkan kamera tersebut di layar TV.
       - **Refresh & Layar Standby/Hitam (Power Saving)**: Matikan tampilan ke layar hitam hemat daya atau segarkan stream TV dari jarak jauh.
  3. **Role RBAC Kiosk Viewer (Proteksi Keamanan Anti-Tamper & Lisensi Aman)**:
     - Mode TV Kiosk secara default menggunakan hak akses terbatas `kiosk_viewer` yang hanya memiliki akses read-only ke stream kamera langsung.
     - Melindungi integritas sistem dari pihak ketiga: siapapun yang menghubungkan mouse/keyboard ke STB fisik di ruang publik tidak dapat membuka menu pengaturan, mengubah lisensi mesin, maupun menghapus rekaman video.

### 📋 Changelog Pembaruan Ver. 10.6.0:
- **HDMI Kiosk Auto-Sudo Launcher Repair & Dynamic Multi-Browser Fallback**:
  1. **Solusi Definitif Error `exec: midori: not found`**:
     - Log STB mengungkap bahwa script lama `/opt/arch3r-kiosk/start-kiosk.sh` di STB masih memanggil binary `midori` yang tidak ada di sistem.
     - Ditambahkan mekanisme injeksi script self-healing dengan hak akses `sudo` otomatis melalui `/tmp/arch3r_start_kiosk.sh` -> `/opt/arch3r-kiosk/start-kiosk.sh` sehingga file script di direktori root dapat diperbarui dari web tanpa hambatan izin (permission denied).
  2. **Tombol "⚡ Perbarui Script Launcher Kiosk STB" di Antarmuka Web**:
     - Ditambahkan tombol aksi perbaikan langsung di samping box log journalctl serta endpoint backend `POST /api/addons/hdmi-kiosk/repair`.
     - Pengguna dapat memperbarui script launcher di STB dan me-restart service hanya dengan satu klik dari HP atau komputer.
  3. **Mesin Deteksi Peramban Dinamis**:
     - Launcher kini mendeteksi binary peramban secara otomatis dan bertingkat (`chromium-browser`, `chromium`, `google-chrome`, `midori`, `firefox-esr`) dengan parameter anti-crash yang disesuaikan secara dinamis.

### 📋 Changelog Pembaruan Ver. 10.5.9:
- **HDMI Kiosk Auto-Sanitization & One-Click TV Display Activation**:
  1. **Otomatisasi Pembersihan Parameter `vt7` pada Systemd Service**:
     - Sistem kini secara otomatis mendeteksi dan menghapus argumen `vt7` yang tersisa di `/etc/systemd/system/arch3r-kiosk.service` saat tombol Start/Toggle ditekan.
     - Mengeksekusi `systemctl daemon-reload` di latar belakang secara mulus tanpa memerlukan intervensi terminal manual oleh pengguna.
  2. **Verifikasi Sukses Dependensi Grafis STB**:
     - Diagnostik telemetri HDMI Kiosk terbukti sukses 100% memvalidasi kelengkapan dependensi Xorg, Chromium, Window Manager, dan Launcher script di Linux Armbian STB.

### 📋 Changelog Pembaruan Ver. 10.5.8:
- **HDMI Monitor & Armbian Kiosk Resilience: Pemulihan Modal Pengaturan & Launcher Anti-Crash**:
  1. **Pemulihan Modal Dialog Pengaturan Addon (`#addonConfigModalOverlay`)**:
     - Memulihkan elemen modal markup `#addonConfigModalOverlay` dan `#installAddonModalOverlay` di `public/index.html` dengan desain Vanilla DOM & CSS murni (tanpa dependensi framework pihak ketiga).
     - Tombol ⚙️ (Pengaturan) pada semua kartu addon (khususnya HDMI Monitor & Armbian Kiosk serta AI YOLOv8) kini kembali aktif, responsif, dan membuka form konfigurasi secara instan di desktop maupun layar smartphone.
  2. **Perbaikan Mesin Launcher HDMI Kiosk Anti-Crash di Armbian STB (`start-kiosk.sh`)**:
     - Mengeliminasi penyebab layar TV hitam berkedip `_` yang langsung keluar ke terminal prompt login Armbian.
     - Menghapus kombinasi flag fatal `--disable-gpu` dan `--disable-software-rasterizer` yang sebelumnya mematikan seluruh pipeline grafis Chromium.
     - Menggantinya dengan flag akselerasi grafis Armbian SoC yang stabil: `--in-process-gpu`, `--ignore-gpu-blocklist`, `--enable-zero-copy`, `--disable-dev-shm-usage`, dan `--no-sandbox`.
     - Menghapus argumen kaku `vt7` pada systemd service `arch3r-kiosk` yang memicu kegagalan alokasi TTY pada kernel Amlogic STB, sehingga Xorg berjalan mulus di virtual terminal yang aktif.
  3. **Diagnostik & Live Log STB Terintegrasi (`/api/addons/hdmi-kiosk/diagnostics`)**:
     - Menambahkan tombol interaktif **"📋 Diagnostik & Log STB"** di dalam jendela pengaturan HDMI Kiosk.
     - Memeriksa secara real-time status kelengkapan paket grafis STB (Xorg, Chromium Browser, Matchbox/Openbox Window Manager, Launcher Script di `/opt/arch3r-kiosk`, serta status service systemd).
     - Menampilkan kutipan 25 baris terakhir dari `journalctl -u arch3r-kiosk` langsung di antarmuka web beserta rekomendasi perbaikan jika ada dependensi Linux yang belum terpasang.
  4. **Self-Healing Script Generator**:
     - Backend secara otomatis memverifikasi dan memperbarui script `/opt/arch3r-kiosk/start-kiosk.sh` dengan URL preset tampilan NVR terbaru setiap kali tombol *Start* ditekan.

### 📋 Changelog Pembaruan Ver. 10.5.7:
- **Ketahanan Jaringan Mobile HP (Offline Resilience) & Persistent AI Sensor Viewport**:
  1. **Enterprise Offline Resilience & Auto-Sync Engine (Anti Gagal Simpan saat Internet HP Terputus)**:
     - Mengatasi kegagalan penyimpanan konfigurasi ketika koneksi internet smartphone/tethering HP terputus atau tidak stabil.
     - Setiap perubahan konfigurasi (Frame Pantauan Sensor AI, Kalibrasi Zona ROI, Parameter Model AI, Pendaftaran Kamera, Pengaturan Storage, & Addon) langsung diamankan ke memori browser HP (`localStorage`).
     - Menyediakan antrean sinkronisasi offline (`arch3r_offline_sync_queue`) yang secara otomatis mendeteksi pemulihan sinyal internet HP dan menyinkronkan data tertunda ke server NVR seketika tanpa kehilangan data sedikit pun.
     - Dilengkapi banner status koneksi interaktif di sudut kanan bawah (`⚡ Offline (HP Terputus)` / `🟢 Terhubung Kembali`) serta notifikasi toast mengambang non-blocking (Pure Vanilla DOM).
  2. **Penyimpanan Persisten Frame Pantauan Sensor AI (Pan X, Pan Y, Zoom & ROI)**:
     - Zoom, Pan X, dan Pan Y kini sepenuhnya persisten dan berfungsi sebagai area pantauan sensor default untuk pipeline inferensi YOLO AI (bukan sekadar tampilan view).
     - Mengatasi `activeYoloSettingsCamId` null dengan fungsi fallback dinamis `getActiveYoloCameraId()`, sehingga penyimpanan frame sensor selalu berhasil mengikat data ke kamera yang aktif.
     - Endpoint backend `/api/ai/grid` dan `/api/ai/save_grid` diperkuat dengan penyimpanan terpusat `db.ai_grids` yang otomatis disimpan ke `local_db_cameras.json` pada STB, aman dari reboot atau crash.
  3. **Presisi Inverse Transformation Matrix untuk Gambaran ROI di Semua Mode**:
     - Menjamin koordinat ROI yang digambar pada mode Fullscreen 16:9 maupun windowed tetap akurat 1:1 terhadap native frame sensor video tanpa pergeseran atau offset.
  4. **Target Terdeteksi & Terminal Log Telemetri Stream**:
     - Target terdeteksi diperbarui secara real-time dengan corner-bracket L taktis, event strip, filter target, dan terminal stream log beraneka warna dengan tombol diagnostik `🧪 Uji Target`.
  5. **Keamanan Multi-Tenant & Database Protection**:
     - Mengizinkan Superadmin untuk menambah, mengedit, dan menghapus kamera serta konfigurasi AI di semua gedung tenant.
     - Menjaga integritas direktori database (`live_db/`, `data/live_db/`) dengan proteksi ketat di `.gitignore`.

### 📋 Changelog Pembaruan Ver. 10.5.6:
- **Kalibrasi Presisi Inverse Matrix Frame Sensor AI & Persistent Viewport**:
  1. **Perbaikan Logika Kalkulasi Koordinat ROI (Inverse Transformation Matrix)**: Memperbaiki ketidaksesuaian posisi kotak ROI saat digambar pada canvas ketika Zoom, Pan X, Pan Y, atau mode Layar Penuh (Fullscreen 16:9) sedang aktif. Input pointer mouse/sentuh kini dibalikkan (*inverted*) secara matematis terhadap matriks transformasi canvas (`unscaled = 50 + (screen - 50 - cropOffset) / zoom`), sehingga titik yang digambar selalu presisi 1:1 terhadap koordinat native sensor frame tanpa pergeseran.
  2. **Penyimpanan Persisten Frame Sensor AI (Area Pantauan Sensor Default)**: Pengaturan Pan X, Pan Y, dan Zoom kini dapat diedit dan disimpan sebagai area pantauan sensor bawaan (*default sensor viewport*) baik di local storage per-kamera maupun ke database NVR secara persisten melalui endpoint backend `POST /api/ai/grid`.
  3. **Penataan Layout 16:9 Aspect Ratio Lock pada Fullscreen**: Video player dan canvas overlay dikunci pada kontainer panggung sensor 16:9 (`#yolo-video-stage`) sehingga pada monitor resolusi apa pun atau mode fullscreen STB HDMI, aspek rasio tidak melar atau terpotong (*letterbox/pillarbox* terlindungi).
  4. **Target Terdeteksi & Live Telemetry Terminal Stream**:
     - Memperbaiki sistem pencatatan event *Target Terdeteksi* (Event Strip) dengan sinkronisasi akurat terhadap zona perimeter ROI.
     - Terminal log kini berfungsi sebagai *continuous real-time telemetry stream* dengan filter warna (Merah untuk Pelanggaran Alarm, Biru untuk Target Terdeteksi, Kuning untuk Konfigurasi, Ungu untuk Frame Sensor), auto-scroll, dan batas memori snappy untuk Armbian STB.
     - Penambahan tombol diagnostik simulasi `🧪 Uji Target` untuk menguji reaksi visual corner-bracket, alarm pelanggaran zona ROI, penambahan kartu event, dan alur telemetri terminal log secara instan.

### 📋 Changelog Pembaruan Ver. 10.5.5:
- **Commercial Enterprise YOLO AI Suite & Unified Workspace**:
  1. **Unified Stream & In-Player ROI Studio**: Menghapus sistem multi-tab yang memecah video menjadi dua. Seluruh stream RTSP/HLS live dan pengaturan deteksi zona ROI disatukan dalam satu canvas player berkinerja tinggi, menghemat RAM dan resource hardware decoding pada Linux Armbian STB.
  2. **Tactical Corner-Bracket Detection Render (Hikvision/Dahua Style)**: Menggantikan bounding box standar dengan visual corner-bracket (L-bracket) taktis profesional, crosshair di titik pusat objek, badge persentase akurasi, serta banner *Perimeter Intrusion Alert* berkedip jika objek melanggar zona ROI.
  3. **Live Target Event Strip (Sidebar Analytics)**: Feed kartu event deteksi objek real-time di kolom kanan dengan animasi *radar scanner*, klasifikasi warna tingkat ancaman, timestamp presisi, akurasi, dan tombol aksi simpan event. Dilengkapi mekanisme pembatasan (throttling 3.5 detik per kelas objek) untuk mencegah lonjakan CPU STB.
  4. **Modular Parameters Dialog (`modal-yolo-ai-parameters`)**: Memisahkan konfigurasi sensitivitas, model AI (YOLOv8 Nano/Small/Medium), akselerasi NPU/RKNN, filter kategori target, dan alarm NVR ke dalam modal overlay modular yang dapat diakses cepat melalui tombol toolbar atas.
  5. **Quick Target Filter Pills & Master Toggle**: Tombol pill interaktif di bawah player untuk memfilter visualisasi target (Manusia, Mobil, Sepeda Motor, Hewan, Semua) dengan status sinkronisasi otomatis.
  6. **Syntax & Lifecycle Cleanup**: Mengeliminasi duplikasi deklarasi fungsi di `script.js` (`clearAITelemetryLog`, `openAISettingsModal`, `initYoloAiPage`) dan memastikan pembebasan memori video saat menutup kamera setting.

### 📋 Changelog Pembaruan Ver. 10.1.9:
- **Refactoring & Penataan Ulang UI Addon YOLO AI Vision (`/addons/yolo-ai`)**:
  1. **Rute URL Mandiri Khusus (`nvr.arch3r.my.id/addons/yolo-ai`)**: Menu YOLO AI Vision di sidebar dan marketplace kini otomatis mengarahkan ke path URL dedicated `/addons/yolo-ai`. Pengguna dapat membagikan link, me-refresh, atau menavigasi langsung ke URL `/addons/yolo-ai` tanpa kehilangan tampilan.
  2. **Pembersihan & Penataan UI Overlapping**: Memperbaiki struktur penutup tag HTML DOM `#view-yolo-ai` yang sebelumnya menimpa dan menggeser elemen UI lain di sekitarnya.
  3. **Responsif & Studio Layout Presisi**: Menata header card, tombol preset `.yai`, studio tab navigation, floating HUD canvas overlay, responsive object cards grid (`repeat(auto-fill, minmax(220px, 1fr))`), dan footer bar agar tampil rapi, bersih, dan nyaman dipandang di seluruh perangkat (STB HDMI, Mobile, Tablet, Desktop).

### 📋 Changelog Pembaruan Ver. 10.1.8:
- **Fitur Uji RTSP Video Stream Real-time (`🎬 Test RTSP Video`)**: Menambahkan tombol pengujian koneksi RTSP dan pemutar preview video live stream langsung pada modal konfigurasi kamera sebelum menyimpan data kamera.
  1. **Quick Test di Tab General**: Tombol `🎬 Test RTSP Video` bersebelahan dengan `🔍 Auto-Discover / ONVIF` untuk langsung menguji RTSP berdasarkan IP Address, Username, Password, dan Port RTSP (554).
  2. **Detailed Test di Tab Streams**: Tombol `🎬 Test Connection & Preview Video RTSP` di tab Streams untuk menguji URL RTSP Main Stream.
  3. **Backend Handshake & Codec Diagnostics (`POST /api/system/test-rtsp`)**: Menggunakan `ffprobe` dengan proteksi `execFile` untuk mendiagnosa resolusi, codec video (H.264/H.265), FPS, serta codec audio secara akurat tanpa membuka celah keamanan.
  4. **Live RTSP Video Test Player**: Pemutar video HLS interaktif berbasis `hls.js` dengan overlay status real-time (`🟢 STREAM ONLINE`, `🔴 GAGAL KONEKSI`) dan log diagnosa lengkap. Memory player dibersihkan secara otomatis saat modal ditutup.
- **Pembersihan & Penataan Tombol Pengaturan Kamera**: Merapikan tata letak tombol peeking password `👁️` pada form password kamera agar tidak menutupi atau bergeser saat mengetik.

### 📋 Changelog Pembaruan Ver. 10.1.7:
- **Perbaikan Posisi & Styling Tombol Peeking Password (`👁️`)**: Merapikan kontainer wrapper password (`.password-wrapper`) agar tombol peeking pas di sisi kanan kolom input tanpa bergeser atau menutupi teks.
- **Optimasi Live Grid View**: Memastikan kamera terhubung stabil pada tampilan grid live NVR.

### 📋 Changelog Pembaruan Ver. 10.1.6:
- **Alur Standar NVR Profesional (2-Way Discovery & On-Demand Probe)**: Menyatukan sinkronisasi Scanner Jaringan dan Auto-Probe Form sesuai workflow industri NVR Hikvision/Dahua/UniFi Protect.
  1. **Mode Tambah Baru / Scan Jaringan**: Pemindaian subnet LAN (`/api/system/scan`) menampilkan daftar kamera terbuka, lalu tombol "➕ Terapkan ke Form" langsung mengisi IP, port, dan menjalankan auto-probe untuk mendeteksi sub-stream serta kemampuan PTZ.
  2. **Mode Input Manual / Edit Kamera (On-Demand)**: Pengguna mengisi IP Address dan Password kamera di tab General, lalu mengklik **"🔍 Auto-Discover / Test ONVIF"** untuk mengambil ulang parameter (Main Stream, Sub Stream, Token PTZ) dari kamera tanpa menimpa data yang tidak diinginkan.
- **Penyelarasan UI Scanner & Form Auto-Probe**: Sinkronisasi ID elemen scanner (`ipScanStart`, `ipScanEnd`, `ipScanPorts`, `ipScanResultsTable`) dan penambahan panduan instruksi interaktif yang jelas pada tab General.
- **Pemisahan Logis Tab Konfigurasi Kamera (General, Streams, Storage, PTZ)**: Parameter kamera terorganisir rapi per tab: General (Nama, IP, Port, Kredensial, Transcode), Streams (Dual-Stream Main HD & Sub SD, Audio Switch & Codec), Storage (Lokasi partisi, durasi segmen, kuota GB, retensi hari), PTZ (ONVIF SOAP & Macrovideo V380, Port, Token).
- **Auto-Fill Otomatis Cerdas per Tab via node-onvif & Probe (`POST /api/system/onvif-probe`)**: Hasil auto-discovery otomatis mengisi semua tab yang sesuai tanpa tumpang tindih.


Arch3r NVR adalah sistem manajemen kamera pengawas (CCTV/IP Camera) kelas profesional yang dirancang khusus agar dapat berjalan mulus di atas perangkat Set Top Box (STB) Android yang telah di-flash menjadi Linux Armbian. Sistem ini menggunakan arsitektur *WebRTC* dan *HLS* berlatensi sangat rendah, dilengkapi dengan manajemen partisi USB/HDD, kontrol ONVIF & Macrovideo V380 Binary TCP PTZ fleksibel (toggle Ya/Tidak/V380 Native, auto-ekstrak RTSP, custom URL/port, dan tes probe real-time), arsitektur Add-on Modular Marketplace (YOLOv8 & HDMI Kiosk Dynamic Scanner), dan *Developer Console* (Superadmin).

---

## 🌟 Fitur Unggulan

- **🚀 Ringan & Mandiri**: Berjalan mulus di RAM 1GB - 2GB khas STB (Amlogic HG860P/B860H, Rockchip, Allwinner) tanpa membebani CPU karena menggunakan metode perekaman *-c:v copy* (tanpa re-encode).
- **📺 HDMI Kiosk Mode Add-on (`./addons/hdmi-kiosk`)**: Otomatis mendeteksi colokan kabel HDMI fisik melalui kernel Linux sysfs (`/sys/class/drm/card0-HDMI-A-1/status` atau `amhdmitx0/hpd_state`). Saat HDMI dicolok, meluncurkan X11/Chromium Kiosk ke TV/Monitor lokal (`http://localhost:3000`). Saat dicabut, otomatis mematikan sesi grafis untuk menghemat RAM dan CPU STB pada mode headless.
- **🌐 Dual-Mode Streaming**: 
  - **WebRTC** untuk pantauan (Live View) *Real-time* nyaris tanpa delay (0.5 detik).
  - **HLS** untuk fallback pada peramban/jaringan yang lambat.
- **💾 Storage Management Pintar**: Otomatis mendeteksi Flashdisk / Hardisk Eksternal yang dicolok ke STB. Mendukung sistem *Retention* (penghapusan rekaman usang otomatis ketika ruang penyimpanan nyaris penuh).
- **👥 Sistem Hierarki Keamanan Multi-Tenant**:
  1. **Superadmin (Developer/Root)**: Penguasa sistem (Pemegang Lisensi).
  2. **Administrator (Pemilik Tempat)**: Bisa mengatur kamera & storage.
  3. **User (Klien/Karyawan)**: Hanya bisa memantau (View-only).
- **🔍 Auto-Discovery & Profile S ONVIF**: Pencarian IP Kamera otomatis di LAN dan auto-resolve RTSP Stream URI melalui port Device Service standar (8899) & Continuous Move PTZ tanpa tebak path manual.
- **🛡️ Tanpa Backdoor**: Sistem dipaksa murni, tidak ada akun default publik yang berbahaya.

---

## 🛠️ Persyaratan Sistem & Dependensi Tambahan (Kiosk Mode)

1. Perangkat STB dengan OS Linux **Armbian / Ubuntu Server** (misal: Amlogic HG860P, B860H).
2. **Node.js** terinstal (minimal versi 18+).
3. **Dependensi Shell untuk HDMI Kiosk GUI (Opsional jika menggunakan TV/Monitor HDMI langsung)**:
   ```bash
   sudo apt update
   sudo apt install -y xserver-xorg xinit chromium-browser
   # Jika paket chromium-browser tidak ditemukan di distro Anda, gunakan:
   # sudo apt install -y xserver-xorg xinit chromium
   ```

---

## ⚙️ Cara Instalasi (1-Click Install)

Kami telah menyiapkan script otomatis yang akan mengerjakan semua proses (termasuk instalasi FFmpeg, MediaMTX, modul Node, hingga setting Auto-Start jika STB mati lampu).

1. Pindahkan folder `arch3r_nvr` ini ke dalam STB Anda (biasanya di `/root/arch3r_nvr`).
2. Buka terminal (SSH) STB Anda dan masuk ke direktori tersebut:
   ```bash
   cd /root/arch3r_nvr
   ```
3. Berikan izin eksekusi (*Executable permissions*) pada script installer:
   ```bash
   chmod +x install.sh
   ```
4. Jalankan instalasinya dengan kredensial `root`:
   ```bash
   sudo ./install.sh
   ```
5. Tunggu proses selesai (sekitar 1-2 menit). Jika sudah muncul tulisan `✅ Instalasi Selesai!`, maka NVR sudah menyala!

---

## 🔑 Panduan Login Pertama (Superadmin)

Karena faktor keamanan ketat, **tidak ada akun Administrator / User bawaan (default)**. Anda harus membuat akun tersebut sendiri dari ruang Superadmin.

1. Buka peramban (Chrome/Safari) di PC atau HP Anda yang tersambung di jaringan/WiFi yang sama dengan STB.
2. Akses alamat IP STB Anda, dilanjutkan Port `3000`. Contoh: `http://192.168.1.15:3000/superadmin.html`
3. Gunakan kredensial *Developer* bawaan ini:
   - **Username**: `admin@archer.nvr`
   - **Password**: `archer`
4. Setelah berhasil masuk ke Dashboard Superadmin, masuk ke menu **👥 Manajemen Admin** di Sidebar.
5. Klik **+ Tambah Admin Baru**, lalu buatkan akun Administrator untuk pemilik bangunan / rumah tersebut.
6. Silakan Logout, dan Login kembali di halaman utama NVR (`http://IP_STB:3000`) menggunakan akun Administrator yang baru saja Anda buat.

---

## 📝 Perintah Operasional Server (PM2)

Sistem NVR ini dijaga agar tetap hidup (24/7) di belakang layar (background) oleh pengelola aplikasi bernama **PM2**. Berikut perintah yang sering digunakan di terminal STB:

- Melihat status server NVR:
  `pm2 status`
- Melihat riwayat aktivitas NVR (Log Error / Sukses):
  `pm2 logs arch3r_nvr`
- Merestart paksa server NVR:
  `pm2 restart arch3r_nvr`
- Mematikan NVR:
  `pm2 stop arch3r_nvr`

---

## 📂 Struktur Direktori Penting

- `/server.js` : Jantung sistem / Backend NVR (Express.js).
- `/lib/v380_driver.js` : Driver Binary TCP Socket (Port 8800) untuk PTZ Macrovideo V380.
- `/public/` : Antarmuka Web (UI/UX) untuk diakses via browser.
- `/data/nvr_db.json` : Database lokal yang menampung data kamera & pengguna. *(Otomatis terbuat saat aplikasi jalan)*.
- `/data/storage.json` : Konfigurasi jalur penyimpanan (Mount Point) Hardisk/USB.
- `/install.sh` : Script instalasi ajaib satu-pintu.

---

## 📜 Log Pembaruan (Changelog)
- **[Ver 9.9.4]**
  - **Modular Addons Architecture (YOLOv8 & HDMI Kiosk Dynamic Scanner)**: Mengubah status AI YOLOv8 dan HDMI Kiosk dari bawaan sistem terproteksi (`system_protected = false`) menjadi modul Addons mandiri yang dinamis.
  - **Dynamic Directory Scanner (`scanAvailablePhysicalAddons`)**: Menambahkan pendeteksian otomatis subfolder `/addons` membaca `manifest.json` dan `package.json` tanpa hardcode.
  - **Split-DB Lifecycle & Uninstall Tracking**: Menambahkan penanganan state uninstalasi pada `local_db_addons.json` serta manajemen kontrol daemon PM2 / service systemctl.
  - **Unified Version Alignment**: Memperbarui nomor versi aplikasi ke **Ver. 9.9.4** di seluruh antarmuka, backend, package manifest, dan metadata sistem.

- **[Ver 9.9.3]**
  - **Multi-Variant Macrovideo V380 Pro PTZ Driver (`/lib/v380_driver.js`)**: Menambahkan generator paket biner varian kedua (`buildV380PtzVariant2Packet`) dengan Magic Header `0x7F 0x00 0x00 0x01` dan Opcode `0x2710` (24-byte packet) khusus untuk kamera generasi baru V380 Pro / V380 Q7/Q8.
  - **Dual-Burst Transmission (`sendV380PtzCommand`)**: Mengirimkan burst biner gabungan (*Standard 0x284A + V380 Pro 0x2710*) pada soket TCP port 8800 secara berurutan untuk menjamin kompatibilitas menyeluruh pada semua varian kamera Macrovideo.
  - **Frontend Intelligent Protocol Detection (`public/script.js`)**: Mengotomatisasi pemilihan dropdown protokol kamera (`camPtzSelect` otomatis beralih ke `v380_native`) saat pengujian probe koneksi mendeteksi respon aktif pada socket Macrovideo port 8800.
  - **Unified Version Alignment**: Memperbarui nomor versi aplikasi ke **Ver. 9.9.3** di seluruh antarmuka, backend, package manifest, dan metadata sistem.

- **[Ver 9.9.2]**
  - **Macrovideo V380 Direct Binary TCP Socket PTZ Driver (`/lib/v380_driver.js`)**: Mengintegrasikan modul driver binary socket TCP (Port 8800) untuk mengontrol pergerakan motor PTZ kamera V380 / V380 Pro secara mandiri tanpa terhambat bug/ketiadaan profil ONVIF SOAP XML.
  - **Smart Hybrid PTZ Routing & Auto-Fallback**: Mendukung mode `v380_native` serta fallback otomatis ke port 8800 jika transmisi ONVIF gagal.
  - **UI Protocol Selector**: Menambahkan pilihan protokol PTZ (Universal ONVIF / Macrovideo V380 Native) di modal formulir kamera.
  - **Unified Version Alignment**: Memperbarui nomor versi aplikasi ke **Ver. 9.9.2** di seluruh antarmuka, backend, package manifest, dan metadata sistem.

- **[Ver 9.9.1]**
  - **Asset Cache-Busting Synchronization**: Memperbarui parameter *query string* cache-busting untuk file aset statis (`style.css?v=9.8.0` dan `script.js?v=9.8.0`) pada `index.html`. Ini memastikan browser client dan mobile webview tidak memuat stylesheet atau script lama dari memori cache browser setelah OTA update / git pull.
  - **Penjelasan Alur Pembaruan OTA vs Git Pull**: Memberikan panduan verifikasi pembaruan pada lingkungan STB nyata (GitHub repo push -> OTA Update / git pull -> hard refresh browser).
  - **Unified Version & Metadata Alignment**: Memperbarui nomor versi aplikasi ke **Ver. 9.8.0** di seluruh komponen antarmuka, file konfigurasi sistem, dan metadata.
- **[Ver 9.7.9]**
  - **Fixed 4x4 Grid Fullscreen Landscape Distortion**: Memperbaiki pembagian template baris dan kolom pada layout grid (`.video-grid.grid-16`, `grid-9`, `grid-4`, `grid-1`) dengan `grid-template-rows: repeat(N, minmax(0, 1fr))` dan `min-height: 0` / `min-width: 0` pada `.cam-cell`. Kotak video pada mode layar penuh 4x4 landscape kini terbagi rata dan proporsional sempurna tanpa ada baris yang gepeng atau terjepit.
  - **Translucent Subtle Watermark for Camera Names**: Mengubah tampilan nama kamera di dalam kotak video menjadi watermark semi-transparan (`rgba(0, 0, 0, 0.42)`) dengan *subtle backdrop blur* dan border halus di pojok kiri atas. Nama kamera kini tidak menutupi rekaman video dan tampak seperti *On-Screen Display (OSD)* standar kamera pengawas profesional.
  - **Unified Version & Metadata Alignment**: Memperbarui nomor versi aplikasi ke **Ver. 9.7.9** di seluruh tampilan UI, login card, sidebar profil, mobile header, komentar skrip, dan metadata sistem.

- **[Ver 9.9.1]**
  - **Diagnostic ONVIF Profile Probing**: Mengimplementasikan fungsi diagnostik backend `diagnoseOnvifProfiles` yang melakukan probing terhadap kamera berkemampuan ONVIF pada port 8899 (serta custom port) untuk mengekstrak seluruh daftar profil media (`device.profile_list` / `GetProfiles`), resolusi video, encoding, token profil aktif, status layanan PTZ, dan response time.
  - **ProfileToken Pre-flight Verification**: Menyediakan verifikasi pra-gerak motor PTZ untuk mendeteksi apakah kamera memiliki profil kosong (*empty profile list*) atau token yang hilang (*missing tokens*) sebelum instruksi Continuous Move/PTZ dikirimkan.
  - **Dedicated Diagnostic Endpoints**: Menyediakan endpoint `/api/onvif/diagnose-profiles` serta menyempurnakan respons `/api/cameras/:id/ptz-probe` dan `/api/onvif/probe-custom` dengan detail token profil dan log diagnostik terstruktur.
  - **Visual Token Diagnostic Tags in UI**: Memperbarui modal uji coba ONVIF pada antarmuka pengguna agar menampilkan badge token profil (misal: `ProfileToken000 (1920x1080)`) dan model kamera secara langsung saat tombol uji coba diklik.
  - **Unified Version Alignment**: Memperbarui nomor versi aplikasi ke **Ver. 9.9.1** di seluruh antarmuka, backend, package manifest, dan metadata sistem.

- **[Ver 9.9.7]**
  - **Fixed Superadmin Logout Loop**: Mengatasi masalah sesi superadmin yang kembali terus ke halaman dashboard saat logout. Menghapus cookie `nvr_auth_token` di backend (`/api/auth/logout`) dengan konfigurasi `path: '/'`, `httpOnly`, `sameSite: 'lax'`, serta membersihkan seluruh storage kredensial client-side (`localStorage`, `sessionStorage`) dan mengarahkan kembali ke form login secara bersih.
  - **Superadmin Responsive UI Redesign**: Merombak seluruh antarmuka Superadmin Console agar responsif di semua resolusi layar (Mobile, Tablet, Desktop). Menambahkan mobile top navigation bar dengan hamburger menu, sidebar drawer geser dengan overlay, kartu statistik fleksibel (`grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))`), horizontal scroll wrapper (`.table-responsive`) untuk tabel akun admin dan audit log, serta penataan form kontrol yang rapi.
  - **Professional OTA Update Architecture (Studio AI Style)**:
    1. *Visual Version Comparison*: Panel perbandingan versi berdampingan (Versi Terpasang vs Versi Rilis Terbaru di Server) dengan indikator badge perbedaan versi yang jelas.
    2. *Release Action Banner & Install Button*: Banner dinamis yang mendeteksi ketersediaan rilis baru beserta tombol aksi `Install Update Sekarang` yang otomatis muncul hanya jika terdapat rilis baru.
    3. *Dual-Mode Verification*: Mendukung pembaruan versi dinamis via repositori Git resmi dengan fallback semver comparison, auto-sync target version ke `package.json`, dan simulasi deteksi versi baru untuk pengujian.
  - **Unified Version Alignment**: Menaikkan versi sistem ke **Ver. 9.9.7** pada `package.json`, `public/version_sync.js`, `public/superadmin.html`, `public/superadmin.js`, dan `server.js`.

- **[Ver 9.9.0]**
  - **V380 & ONVIF Profile Token Extraction**: Menyesuaikan alur kontrol PTZ kamera V380 dengan mengambil `profileToken` aktif (`const profile = device.getCurrentProfile(); const token = profile ? profile['token'] : 'ProfileToken000';`) sebelum eksekusi perintah motor PTZ.
  - **Continuous Move & Explicit Stop Routing**: Menerapkan routing `/api/cameras/:id/ptz` dan endpoint dedicated `/api/cameras/:id/ptz-stop` dengan passing `profileToken`, koordinat kecepatan x/y/z, serta eksekusi stop (`device.ptzStop({ profileToken: token })` dan SOAP fallback).
  - **Auto-assigned Device Profile**: Memastikan properti internal `device.current_profile` selalu terinisialisasi pada instance `OnvifDevice` untuk mencegah penolakan perintah dari driver internal.
  - **Unified Version Alignment**: Memperbarui nomor versi aplikasi ke **Ver. 9.9.0** di seluruh antarmuka, backend, package manifest, dan metadata sistem.

- **[Ver 10.0.2]**
  - **Tab Terpisah Modal AI Visi**: Memisahkan modal AI menjadi 3 tab mandiri (`Tab 1: Kamera Live RTSP Asli`, `Tab 2: Laboratorium Simulasi Logika SPBU`, dan `Tab 3: Marketplace & File Preset .yai`).
  - **Source Video Asli & State 'No Video'**: Video pada tab Live hanya bersumber dari kamera nyata yang terdaftar pada database NVR / live stream MediaMTX. Jika kamera offline atau belum ada kamera, tampil overlay fallback "No Video Signal" yang ramah.
  - **Format File Konfigurasi .yai**: Menambahkan fitur ekspor dan impor konfigurasi ROI Grid, Syarat Prompt AI, dan pemicu IoT ESP8266 dengan format ekstensi `namapreset.yai` (misal `kios_bensin.yai`).
  - **Marketplace Preset Database Hosting**: Mengintegrasikan API backend `/api/ai/presets` dan `/api/ai/presets/download/:id` untuk mendistribusikan preset siap pakai (Pengisian BBM SPBU, Antrean Kendaraan, Intrusi Gerbang, Pemantauan Tangki) langsung ke editor atau unduhan lokal.
  - **Laboratorium Simulasi Terisolasi**: Skenario SPBU, kendaraan datang, pengisian bensin, dwell timer, log telemetri, dan JSON payload preview terisolasi rapi di Tab Simulasi sehingga tidak menimpa feed video asli.

- **[Ver 9.8.9]**
  - **Fixed ONVIF PTZ Internal Port Mismatch (V380 / Xiongmai Firmware Fix)**: Mengatasi masalah error koneksi port internal (misal `192.168.1.5:8080`) saat menggerakkan PTZ dpad. Sebagian firmware kamera (seperti V380 / XM) mengembalikan port web internal `8080` di dalam XML response `GetCapabilities` alih-alih port ONVIF aktif `8899`. Backend kini otomatis menormalisasi dan menulis ulang endpoint layanan PTZ (`service-ptz`) ke host dan port koneksi ONVIF yang aktif secara dinamis.
  - **Resilient PTZ Move & Stop Execution**: Menyempurnakan parameter Continuous Move dan ptzStop pada driver `node-onvif` dengan fallback SOAP langsung untuk menjamin kehandalan respon motor PTZ kamera.
  - **Unified Version Alignment**: Memperbarui nomor versi aplikasi ke **Ver. 9.8.9** pada seluruh antarmuka, login card, sidebar profil, mobile header, dan metadata sistem.

- **[Ver 9.8.8]**
  - **Unified Dashboard Version Synchronization**: Memperbarui semua label teks versi yang tertinggal di area dashboard utama (sidebar desktop `Ver. 9.8.0` -> `Ver. 9.8.8`, mobile topbar header `Ver. 9.8.0` -> `Ver. 9.8.8`, dan mobile layout `Ver. 9.7.5` -> `Ver. 9.8.8`). Sekarang seluruh tampilan baik sebelum login maupun sesudah login menampilkan versi yang seragam.
  - **ONVIF Driver Verification**: Mengonfirmasi dan memelihara integrasi driver `node-onvif` di backend Node.js untuk modul Auto-Discovery LAN, Profiling kamera, Test Probe, serta eksekusi gerak PTZ Continuous Move / Stop.

- **[Ver 9.8.7]**
  - **Fixed PTZ/ONVIF Camera Setting Persistence & Form Sync**: Memperbaiki alur sinkronisasi form edit kamera. Saat tombol edit kamera ditekan, form otomatis memuat seluruh konfigurasi ONVIF (`camPtzSelect`, `camPtzUrl`, `camPtzUser`, `camPtzPass`) dari database dan mengembalikan tab aktif ke tab utama (`Stream`) tanpa kehilangan data.
  - **Prevent Auto-Fill Overwrite on Edit Mode**: Menonaktifkan fungsi auto-extract blur pada input RTSP ketika sedang mengedit kamera lama, sehingga URL dan kredensial kustom ONVIF yang tersimpan tidak tertimpa otomatis.
  - **Auto-Sync Network Scan to ONVIF Select**: Menyesuaikan integrasi Auto-Discovery LAN agar mengisi opsi `camPtzSelect` dan port host ONVIF secara serasi dengan arsitektur form baru.

- **[Ver 9.8.6]**
  - **Flexible ONVIF & PTZ Configuration**: Menambahkan opsi dropdown Ya/Tidak untuk mengaktifkan fitur ONVIF/PTZ pada pengaturan kamera.
  - **Auto-Extract RTSP Credentials for ONVIF**: Tombol instan untuk mengekstrak host IP, username, dan password secara otomatis dari string URL RTSP.
  - **Custom ONVIF URL/Port & Live Probe Test**: Mendukung port kustom (misal port 2020 Tapo atau 8899 XM/Bardi) serta tombol uji probe ONVIF langsung ke kamera sebelum disimpan.

- **[Ver 9.7.8]**
  - **Fullscreen Gear Setting Button Relocation**: Tombol gerigi/pengaturan (`⚙️`) pada mode layar penuh (*Fullscreen*) kini diposisikan secara presisi tepat di bawah kotak semua video monitor (`#videoGridContainer`) dalam baris bilah kontrol khusus yang bersih, menggantikan posisi melayang lama di sudut kanan bawah.
  - **PTZ Control Panel Responsive Architecture**: Menata ulang struktur kartu Kontrol PTZ & Player dalam mode biasa/landscape:
    1. *Baris Atas (Horizontal Parallel)*: Panel **🔍 LENSA & FOKUS** (Zoom +, Focus +, Zoom -, Focus -) dan panel **🎬 KONTROL PLAYER & AUDIO** (Play/Pause, Kualitas HD/SD, Snapshot 📸, Slider Volume 🔊, Audio Mute 🔇) diletakkan sejajar secara horizontal dan adaptif/responsif.
    2. *Baris Bawah (Center)*: Dial joystick **D-Pad Sirkular** (▲, ◀, Stop ■, ▶, ▼) diletakkan di bagian tengah bawah (*bottom center*) secara simetris dan rapi.
  - **Unified Version & Metadata Alignment**: Memperbarui nomor versi aplikasi ke **Ver. 9.7.8** di seluruh tampilan UI, login card, sidebar profil, mobile header, dan metadata sistem.

- **[Ver 10.0.6]**
  - **Live Video Pure Transparency Canvas (Zero-Animation Interference)**: Memisahkan secara total kanvas video live dengan kanvas simulasi. Kanvas overlay pada kamera nyata dibuat 100% transparan (`clearRect`) tanpa latar simulasi kanopi/dispenser SPBU, sehingga siaran video kamera asli dari NVR tampil jernih, tajam, dan tidak lagi tertutup animasi kartun.
  - **Universal Custom ROI Editor (Bebas Kustomisasi & Fleksibel)**: 
    - Pengguna bebas memberi nama label zona pantauan (misal: *Pintu Gerbang, Meja Kasir, Pompa Bensin, Area Parkir, Kasir SPBU, Ruang Brankas*).
    - Memilih palet warna zona kustom (Biru, Kuning, Merah, Hijau, Ungu) yang otomatis diterapkan pada garis putus-putus (*dashed border*), isi semi-transparan, corner anchor, dan tag floating header di atas kotak area.
    - Tombol Preset Universal sekali klik: *🚪 Pintu Masuk / Gerbang*, *🅿️ Area Parkir Kendaraan*, *💳 Meja Kasir / Transaksi*, *⛽ Pompa Bensin*, *🎯 Fokus Tengah*, dan *🔲 Full Frame*.
  - **Unified Per-Camera AI Control**: Setiap kamera NVR memiliki konfigurasi mandiri: toggle aktif/nonaktif AI per kamera, tingkat sensitivitas (*confidence*), filter target objek, zona deteksi, dan webhook IoT ESP8266 tersimpan langsung ke database kamera masing-masing.
  - **Unified Marketplace Addons Action Button**: Menyatukan tombol pengaturan gerigi (⚙️) dan tombol buka panel AI (🎯) di tabel Addon Marketplace menjadi satu tombol terpadu *"🎯 Kelola AI Kamera"*, menyederhanakan alur kerja pengguna.
  - **Isolated AI Simulation Sandbox**: Seluruh animasi dan pengujian teks pembacaan objek diisolasi secara eksklusif di tab Lab Simulasi (`ai-tab-pane-sim`) tanpa mencemari pemantauan kamera riil.

- **[Ver 10.0.9]**
  - **Floating Collapsible HUD & Mini-Toolbar**: Panel kontrol dan navigasi objek pada mode layar penuh kini dapat diminimalkan menjadi tombol mengambang ringkas (`▲ Sembunyikan Panel` / `▼ Buka Panel`) sehingga 100% tampilan video bebas dari halangan tombol atau panel. Mini-toolbar mengambang tetap menyajikan nama objek aktif, tombol mode Gambar/Geser, persentase zoom, dan tombol cepat simpan.
  - **Synchronized Video & Canvas Zoom, Pan, and Scroll**: Mengintegrasikan wrapper `#ai-viewport-stage` dengan penanganan CSS transform terpadu untuk video dan kanvas secara bersamaan. Dilengkapi tombol `Zoom In (+)`, `Zoom Out (-)`, `Reset (100%)`, serta dukungan scroll mouse wheel dan gesture multi-touch pinch-to-zoom pada layar sentuh STB Armbian.
  - **Dynamic Pan & View Navigation**: Pengguna dapat menggeser sudut pandang video yang sedang di-zoom secara leluasa (drag mouse / drag sentuh) melalui mode `✋ Geser Video (Pan)` atau dengan menahan tombol Spasi / tombol tengah mouse tanpa merusak kotak ROI.
  - **Unscaled True-Video Coordinate Mapping**: Koordinat bounding box pada kanvas secara cerdas dipetakan kembali ke resolusi asli video terlepas dari tingkat perbesaran (zoom) dan pergeseran (pan), sehingga gambar area deteksi tetap 100% presisi dan terkunci pada objek fisik (mesin pompa, antrean, dll).

- **[Ver 10.0.8]**
  - **Dedicated Preview-Only Normal View**: Mode tampilan normal kini murni berfungsi sebagai pratinjau lokasi video (read-only/preview-only) dengan watermark informasi, mencegah modifikasi tidak sengaja.
  - **Full-Screen Multi-Zone Object Editor**: Menambahkan mode layar penuh interaktif untuk menggambar, menambah, memilih, dan menyimpan objek deteksi satu per satu tanpa harus keluar masuk mode layar penuh.

- **[Ver 10.0.5]**
  - **Live Canvas Render Loop Bugfix**: Memperbaiki syarat henti pada `aiStartRenderLoop` agar render loop kanvas terus berjalan tanpa henti saat berada di halaman mandiri (`view-yolo-ai`), sehingga kotak grid objek tampil seketika di atas video live.
  - **Dynamic Video & Container Auto-Resize**: Menambahkan `ResizeObserver` pada kanvas agar bounding box dan koordinat ROI tetap presisi, proporsional, dan tidak bergeser saat ukuran video berubah atau di-resize.
  - **Multi-Area Object Selector (SPBU Pump, Parking Bay, Operator Post)**:
    - `⛽ Pompa Bensin`: Menandai area dispenser mesin BBM dengan aksen oranye.
    - `🅿️ Area Parkir/Antrean`: Menandai zona parkir & antrean kendaraan dengan aksen biru langit.
    - `🚶 Pos Operator`: Menandai zona kerja petugas operator SPBU dengan aksen hijau emerald.
  - **HUD Surveillance Overlay**: Mengintegrasikan indikator aktif `📡 YOLO VISION: MONITORING` langsung di sudut video stream dengan tag label area dinamis dan deteksi interaktif.

- **[Ver 10.0.4]**
  - **Dedicated YOLO AI Vision Page Navigation**: Integrasi navigasi mandiri ke halaman terpisah `view-yolo-ai` melalui sidebar menu dan tombol pintasan di kartu Addon/Marketplace tanpa batasan modal popup.
  - **Auto Camera Stream Initialization**: Memastikan stream video kamera aktif diinisialisasi secara otomatis saat halaman YOLO AI dibuka, dilengkapi dengan pemilihan kamera dinamis dan deteksi stream otomatis.
  - **Real-Time Video Feed & Fallback Stream Handling**: Menghubungkan player HLS ke stream real-time kamera NVR (MediaMTX `/stream/:path/index.m3u8` dan fallback `/streams/:camId/main.m3u8`).
  - **NO VIDEO SIGNAL Overlay & Reconnect Engine**: Menyajikan overlay sinyal status jika kamera offline atau belum menerima sinyal RTSP lokal, dilengkapi tombol *"🔄 Hubungkan Ulang Kamera"* dan *"🧪 Uji di Lab Simulasi"*.
  - **Integrated .yai Preset Import/Export & Marketplace**: Mendukung penuh download dan upload konfigurasi preset dengan ekstensi kustom `.yai` (seperti `kios_bensin.yai`) serta marketplace preset.

- **[Ver 9.7.7]**
  - **Navigation & Control Panel Layout Alignment**: Menyesuaikan tata letak panel kontrol monitor secara presisi dengan arsitektur 3 baris terstruktur:
    1. *Baris 1*: Dropdown filter saluran (`View: ALL` / `View: CH x`) dan navigasi halaman kamera (`◀ Prev`, `Hal x/y`, `Next ▶`).
    2. *Baris 2*: Pemilih tata letak grid (`▢ 1x1`, `⊞ 2x2`, `▦ 3x3`, `㗊 4x4`) dengan tombol Aksi Kanan (Refresh `🔄` dan Layar Penuh `⛶`).
    3. *Baris 3*: Kartu Kontrol PTZ & Player terpadu yang membagi D-Pad sirkular di sebelah kiri, dan kolom bertumpuk di sebelah kanan yang terdiri dari kotak atas (*🔍 LENSA & FOKUS*: Zoom +, Focus +, Zoom -, Focus -) dan kotak bawah (*🎬 KONTROL PLAYER & AUDIO*: Tombol Play/Pause, Toggle Kualitas Video HD/SD, Tombol Snapshot 📸, Baris Slider Volume 🔊, serta Tombol Audio 🔇).
  - **HD/SD Video Quality Dynamic Toggle**: Mengintegrasikan tombol `HD` / `SD` interaktif pada kontrol player yang dapat beralih kualitas video secara langsung untuk kamera terpilih, otomatis beralih antara stream utama (*Main Stream*) dan sub-stream (*Sub Stream*), serta memperbarui indikator visual tombol.
  - **Visual & Component Refinement**: Tombol Stop tengah pada D-Pad kini menampilkan ikon henti oranye yang presisi (`■`), serta sinkronisasi dinamis status kontrol player saat pergantian kamera di grid.

- **[Ver 9.7.6]**
  - **Dropdown Standardized to (View: ALL)**: Memastikan label default pada dropdown filter kamera di monitor live view selalu tampil rapi dengan teks `View: ALL` (dan `View: CH x - Nama Kamera`), serta menjaga sinkronisasi pilihan kamera saat refresh.
  - **Player & Media Controls Integrated in PTZ Card**: Memindahkan kontrol player utama (*Play/Pause*, *Audio/Mute*, *Slider Volume*, dan *Snapshot Kamera 📸*) langsung ke dalam kotak panel kontrol PTZ, tepat di samping kontrol Lensa (Zoom & Fokus) dalam tata letak yang bersih, terorganisir, dan mudah diakses.
  - **Enlarged PTZ D-Pad Controller**: Memperbesar diameter dial D-Pad PTZ dari 96px menjadi 130px dengan tombol navigasi arah (36px) dan tombol stop tengah yang nyaman disentuh di desktop, tablet, maupun layar sentuh STB.
  - **Aligned Top Controls Bar**: Menata tombol pilihan layout grid (`1x1`, `2x2`, `3x3`, `4x4`), tombol Refresh (`🔄`), dan tombol Layar Penuh (*Fullscreen* `⛶`) sejajar horizontal pada baris atas tepat di atas kotak panel PTZ.

- **[Ver 9.7.5]**
  - **Live View Dropdown Optimization**: Mengubah teks dropdown pilihan kamera menjadi format ringkas `View : ALL` dan `View : CH x - Nama Kamera` serta menata lebar dan padding kontrol agar tidak menggeser layout tombol navigasi halaman.
  - **Responsive UI Manajemen User & Marketplace**: Menambahkan wrapper `.table-responsive` dengan horizontal scroll yang mulus, padding responsif, serta styling tombol aksi adaptif sehingga seluruh menu dan tabel di Manajemen User & Marketplace (Addons) terlihat lengkap di layar kecil/mobile.
  - **Auto-Load Addons on Tab Select**: Menghubungkan trigger `fetchInstalledAddons()` langsung saat tab Marketplace diklik dari navigasi sidebar.
  - **Optimized Sidebar & About NVR Visibility**: Mengoptimalkan padding profil, widget info, dan item navigasi sidebar serta menambahkan custom slim scrollbar sehingga seluruh 10 menu (termasuk *Marketplace* dan *About NVR*) pas dan langsung terlihat di layar tanpa terpotong di bawah lipatan.

- **[Ver 9.7.4]**
  - **Fixed Camera Title Centering**: Label nama kamera pada grid live view kini diposisikan secara presisi di tengah (*horizontal center*) dengan efek *pill badge* yang elegan.
  - **Fixed Camera Channel Dropdown**: Memperbaiki fungsi `populateChannelDropdown` dan mendefinisikan `populateCameraSelects` secara komprehensif sehingga seluruh dropdown kamera (CH1, CH2, dst.) selalu terisi daftar kamera aktif tanpa terjadi *ReferenceError*.
  - **Fixed Fullscreen Button Layout**: Menyesuaikan layout toolbar monitor (`.nvr-toolbar-strip`, `topControlPanel`) agar responsif dengan `flex-wrap: wrap` dan `box-sizing: border-box`, mencegah tombol layar penuh melebihi lebar tampilan UI.

---

**© 2026 Arch3r Development.** *Professional Armbian STB NVR System.*
