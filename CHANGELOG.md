# Changelog

## [Ver 10.8.6] - 2026-09-25
### Restoring Clean Classic 10.7.5 Responsive UI Layout, Natural Monitor Grid & Anti-Cutoff Guard
- **Pemulihan Tata Letak Klasik Ver. 10.7.5 (Classic Clean Layout Restoration):**
  - **Eliminasi Seluruh Override CSS Kaku**: Menghapus deklarasi aspect-ratio yang memaksa serta batasan flexbox berlebih yang memicu kekacauan posisi kanvas kamera dan menu.
  - **Live Monitor Alami & Proporsional**: Mengembalikan `#videoGridContainer` dan `.video-grid` ke arsitektur standar Ver 10.7.5 (`flex: 1; min-height: 0; align-items: stretch;`) sehingga kanvas CCTV tampil utuh di bagian atas layar HP tanpa celah kosong dan tanpa mendesak panel kontrol ke bawah.
  - **Bilah Kontrol Bawah Bebas Terpotong**: Menyesuaikan `#topControlContainer` dengan scrolling sentuh dan padding pelindung `safe-area-inset-bottom`, menjamin seluruh tombol kontrol dapat diakses dengan mudah tanpa pernah terpotong oleh bilah browser HP.
- **System Version & Metadata Alignment:**
  - Menaikkan nomor versi aplikasi ke **Ver. 10.8.6** pada seluruh komponen sistem (`package.json`, `metadata.json`, `index.html`, `public/index.html`, `public/admin.html`, `public/superadmin.html`, `public/version_sync.js`, `public/script.js`, `public/style.css`, `README.md`, dan `CHANGELOG.md`) mematuhi aturan Semantic Versioning Strict.

## [Ver 10.8.5] - 2026-09-25
### Proportional Viewport Distribution, Zero-Gap Mobile Layout, Uniform Menu Padding & Anti-Clipping Guard
- **Proportional Viewport & Grid Distribution (HP & Desktop):**
  - **Keseimbangan Distribusi Layar Monitor**: Mengoreksi container `#videoGridContainer` dengan `flex: 1 1 0; display: flex; align-items: stretch;` dan `#topControlContainer` dengan `flex: 0 0 auto; max-height: 48dvh;` sehingga kanvas kamera mengisi bagian atas layar secara penuh tanpa celah kosong (*gap void*) dan bilah kontrol bawah duduk proporsional.
  - **Eliminasi Celah Atas & Bawah di Semua Menu**: Menyelaraskan seluruh `.view-pane`, `.content-wrapper`, dan `.main-content` agar semua menu (Kamera, Storage, Users, Sistem, Akun, Logs, Addons, About) memiliki padding atas dan bawah yang seragam, tidak bertumpuk di bawah header atau terpotong di bagian bawah.
- **Universal Mobile & Tablet Responsiveness:**
  - Menghapus aturan aspect ratio kaku pada outer container yang sebelumnya mendistorsi tinggi layar pada HP portrait.
  - Memastikan seluruh menu navigasi, modal form penambahan kamera, scanner IP, dan panel pengaturan dapat digulir dengan mulus hingga ke elemen paling bawah dengan perlindungan `safe-area-inset-bottom`.
- **System Version & Metadata Alignment:**
  - Menaikkan nomor versi aplikasi ke **Ver. 10.8.5** pada seluruh komponen sistem (`package.json`, `metadata.json`, `index.html`, `public/index.html`, `public/admin.html`, `public/superadmin.html`, `public/version_sync.js`, `public/script.js`, `public/style.css`, `README.md`, dan `CHANGELOG.md`) mematuhi aturan Semantic Versioning Strict.

## [Ver 10.8.4] - 2026-09-25
### Clean Responsive Viewport Engine, Zero-Gap Top Monitor Alignment & Proportional Mobile Layout
- **Zero-Gap Top Monitor Alignment & Proportional Video Canvas:**
  - **Eliminasi Ruang Kosong Hitam di Bagian Atas**: Memperbaiki kanvas video monitor pada HP (orientasi portrait) agar menempel rapi tepat di bawah bilah mobile header tanpa menyisakan ruang kosong hitam yang luas di bagian atas.
  - **Aspek Rasio Proporsional 16:9 (`aspect-ratio: 16/9`)**: Mengatur container grid video HP menjadi `flex: 0 0 auto; width: 100%; aspect-ratio: 16/9; max-height: 42vh;` sehingga kamera ditampilkan utuh, tajam, dan proporsional tanpa distorsi atau letterbox berlebih.
- **Scroll-Guarded Mobile Controls & Anti-Clipping Bottom Bar:**
  - **Penempatan Bilah Kontrol Terpadu Alami**: Bilah kontrol bawah (`#topControlContainer` berisi pemilih channel, tombol layout 1x1 s/d 4x4, refresh, fullscreen, dan kartu PTZ) kini mengalir alami langsung di bawah video dan mengisi ruang sisa layar.
  - **Scrolling Internal & Safe-Area Padding**: Mengaktifkan `flex: 1 1 0; overflow-y: auto; -webkit-overflow-scrolling: touch;` dengan proteksi safe-area inset (`padding-bottom: max(1.25rem, calc(env(safe-area-inset-bottom, 0px) + 0.85rem))`), memastikan seluruh tombol kontrol dan dial PTZ dapat digulir dan disentuh dengan mudah tanpa pernah terpotong oleh bilah bawah browser HP.
- **Root Layout Normalization & Body Flex Bug Elimination:**
  - Menghapus aturan `display: flex; position: fixed; inset: 0;` pada tag `html` dan `body`, mengembalikan aliran layout standar browser yang stabil pada seluruh perangkat HP dan layar desktop/laptop.
  - Sinkronisasi mode landscape HP agar video grid otomatis melebar penuh (`flex: 1 1 0; height: auto;`) dan bilah navigasi bawah tetap ringkas.
- **System Version & Metadata Alignment:**
  - Menaikkan nomor versi aplikasi ke **Ver. 10.8.4** pada seluruh komponen sistem (`package.json`, `metadata.json`, `index.html`, `public/index.html`, `public/admin.html`, `public/superadmin.html`, `public/version_sync.js`, `public/script.js`, `public/style.css`, `README.md`, dan `CHANGELOG.md`) mematuhi aturan Semantic Versioning Strict.

## [Ver 10.8.3] - 2026-09-25
### Universal Dynamic Viewport 100dvh Engine & Zero-Overflow Responsive Multi-Device Architecture
- **Dynamic Viewport Height (100dvh & CSS Variable Engine):**
  - **Eliminasi Pemotongan Layar ke Bawah**: Menerapkan dynamic viewport height (`100dvh` & `--app-height`) pada `html`, `body`, `.app-layout`, `.main-content`, dan seluruh dialog modal, menjamin antarmuka tidak pernah terpotong atau tertutup oleh bilah navigasi bawah (bottom navigation bar) maupun address bar browser HP Android dan iOS.
  - **Pencegahan Overflow Flexbox**: Mengoreksi perhitungan tinggi container anak flexbox (`flex: 1 1 0; min-height: 0; height: auto;`) pada `.view-pane`, `#view-monitor`, `#monitorWrapper`, dan `#videoGridContainer` sehingga bilah kontrol bawah dan navigasi PTZ selalu tampil utuh dan pas di layar.
- **Scrollable Settings Views & Zero-Clipping Content Architecture:**
  - **Dukungan Scroll Penuh Halaman Pengaturan**: Membuka scrolling vertikal halus (`overflow-y: auto !important; -webkit-overflow-scrolling: touch;`) pada seluruh halaman konfigurasi (Manajemen Kamera RTSP, Pengaturan Storage/HDD, Manajemen User Klien, Sistem & Jaringan, Keamanan Akun, Log Sistem, Addons, dan Tentang NVR) sehingga pengguna dapat menggulir hingga ke tombol paling bawah tanpa ada yang terpotong.
  - **Safe-Area Inset Bottom Guard**: Menambahkan padding dinamis berbasis `env(safe-area-inset-bottom)` pada seluruh kartu dan footer form agar elemen aksi bawah tidak tertutupi oleh gesture bar atau home bar perangkat modern.
- **Responsive Live View & Mobile Playback Optimizations:**
  - **Auto-Fitting Video Grid**: Grid kamera (1x1, 2x2, 3x3, 4x4) kini menggunakan `minmax(0, 1fr)` dinamis untuk baris dan kolom yang selalu menyesuaikan proporsi ruang video di HP portrait, HP landscape, tablet, maupun layar monitor desktop tanpa memotong sel kamera.
  - **Slide-Over Drawer Klip Rekaman Mobile**: Pada layar HP (< 768px), daftar klip video di halaman Playback otomatis bertransformasi menjadi panel geser drawer lateral dengan backdrop blur halus, menjaga rasio player rekaman tetap maksimal dan nyaman ditonton.
  - **Proporsi Kontrol PTZ & Tombol Optik**: Menyelaraskan ukuran dial D-Pad PTZ dan tombol zoom/fokus pada layar sempit (< 480px) agar tetap ergonomis dan hemat ruang vertikal.
- **System Version & Metadata Alignment:**
  - Menaikkan nomor versi aplikasi ke **Ver. 10.8.3** pada `package.json`, `metadata.json`, `index.html`, `public/index.html`, `public/admin.html`, `public/superadmin.html`, `public/version_sync.js`, `public/script.js`, `public/style.css`, `README.md`, dan `CHANGELOG.md` mematuhi aturan Semantic Versioning Strict.

## [Ver 10.8.1] - 2026-09-25
### Direct GitHub Branch Live OTA Pipeline, Raw Package & Changelog Inspector
- **Direct GitHub Branch Live OTA Pipeline (`server.js`):**
  - **Live Branch Tracking Tanpa Release Manual**: Sistem OTA di STB kini langsung memantau berkas `package.json` dan `CHANGELOG.md` pada branch `main` repositori GitHub via CDN `raw.githubusercontent.com`. Pengembang tidak lagi diwajibkan membuat tag rilis manual di GitHub untuk memicu deteksi update.
  - **Auto Candidate Branch Fallback**: Mendukung deteksi multi-branch cerdas (`main` dan fallback `master`), memastikan STB langsung menemukan pembaruan seketika setelah `git push origin main`.
  - **Real-Time Remote CHANGELOG Inspector**: Catatan rilis dan judul pembaruan pada antarmuka "Periksa Pembaruan" langsung disinkronkan dari berkas `CHANGELOG.md` remote GitHub secara real-time.
  - **Zero Rate Limit Protection**: Mengalihkan ketergantungan dari GitHub REST API (yang dibatasi 60 req/jam) ke jalur CDN raw yang cepat (< 200ms) dan andal untuk lingkungan STB.
- **System Version & Metadata Alignment:**
  - Menaikkan nomor versi aplikasi ke **Ver. 10.8.1** pada `package.json`, `metadata.json`, `index.html`, `public/admin.html`, `public/version_sync.js`, `public/script.js`, `README.md`, dan `CHANGELOG.md` sesuai protokol Semantic Versioning Strict.

## [Ver 10.8.0] - 2026-09-25
### Strict Gitignore Hardening for License Server Generator & Security Protocol Enforcement
- **Repository Security Hardening & Gitignore Protection (`.gitignore`):**
  - **Isolasi Folder Master Generator Lisensi**: Mendaftarkan `master_license_server_template/` dan seluruh isinya ke dalam `.gitignore` secara permanen sesuai Protokol Pengembangan Arch3r NVR (Pasal 5 & 8).
  - **Pencegahan Kebocoran Kunci Rahasia**: Memastikan skrip pembuat lisensi pihak pengembang (Private Key, skrip keygen mandiri, dan template server verifikasi) tidak pernah dapat ter-push atau terekspos ke repositori publik GitHub.
- **Asymmetric License Generation Architecture Guide & Documentation:**
  - Dokumentasi prosedur pembersihan riwayat cache git jika berkas master sempat terlacak (`git rm -r --cached master_license_server_template`).
  - Standarisasi tata cara pembuatan lisensi resmi ECDSA secara offline di laptop/workstation pribadi pengembang berbasis Machine ID klien.
- **System Version & Metadata Alignment:**
  - Menaikkan nomor versi aplikasi ke **Ver. 10.8.0** pada `package.json`, `metadata.json`, `index.html`, `public/admin.html`, `public/version_sync.js`, `public/script.js`, `README.md`, dan `CHANGELOG.md` sesuai Semantic Versioning Strict (digit patch maksimal 9, rollover 10.7.9 -> 10.8.0).

## [Ver 10.7.9] - 2026-09-25
### Multi-Category OTA Update Pipeline, Dynamic CHANGELOG Parser, ECDSA Asymmetric License Engine & Persistent OS Vault
- **Multi-Category OTA Update Execution (Safe, Normal, Hard):**
  - **Tiga Pilihan Mode Pembaruan**: Menambahkan pemilih mode di antarmuka alur update OTA sistem (Safe Update, Normal Update, Hard / Clean Reset).
  - **Mode Safe Update (Rekomendasi Utama)**: Mengamankan database & lisensi ke snapshot Vault OS, menjalankan `git stash`, menarik kode (`git pull`), memulihkan database/lisensi otomatis, menjalankan `npm install`, dan me-reload PM2 tanpa risiko kehilangan data.
  - **Mode Normal Update**: Alur cepat git pull + npm install + PM2 reload untuk pembaruan fitur berkala.
  - **Mode Hard / Clean Reset**: Mengamankan lisensi resmi ke Vault OS, force `git reset --hard origin/main`, membersihkan cache npm, npm install bersih, memulihkan lisensi/database, dan me-reload PM2.
  - **Normalisasi Parameter**: Menyelaraskan seluruh nama kunci parameter (`backup_db`, `git_stash`, `git_pull`, `git_reset`, `clean_cache`, `npm_install`, `pm2_restart`, `reboot_linux`) antara frontend dan backend.
- **Dynamic CHANGELOG Parser & Smart Git Remote Detection:**
  - **Dynamic CHANGELOG Reader**: Mengganti daftar statis hardcoded dengan parser otomatis berkas `CHANGELOG.md` dari disk lokal, menjamin catatan rilis di UI "About NVR" selalu akurat dan terbaru.
  - **Auto Git Remote Resolution**: Mendeteksi repositori GitHub dari `git config --get remote.origin.url` secara otomatis sehingga tidak mewajibkan pengguna mengetik URL GitHub manual.
  - **Presisi Komparasi Semver**: Evaluasi akurat antara versi lokal sistem dan rilis remote cloud.
- **ECDSA Asymmetric Cryptographic License Engine & Anti-Reverse Engineering:**
  - **Perlindungan Kunci Asimetris**: Mengganti ketergantungan pada kunci simetris HMAC rahasia dengan kriptografi kurva eliptik **ECDSA prime256v1 (NIST P-256)** berkeamanan tinggi.
  - **Hanya Public Key di Repo**: Berkas `server.js` pada klien STB dan repositori terbuka hanya memuat **PUBLIC KEY**, sementara **PRIVATE KEY** dipegang eksklusif oleh developer pada tool generator `master_license_server_template/keygen_ecc.cjs`. Pihak luar tidak dapat membuat *keygen* lisensi palsu dari repositori GitHub.
  - **Backward Compatibility**: Mendukung verifikasi bertingkat: ECDSA asimetris sebagai standar utama dengan fallback HMAC SHA256 lama agar seluruh lisensi yang telah aktif tetap berjalan normal.
- **Persistent OS-Level License Vault (Anti-Factory-Reset & Anti-Git Loss):**
  - **Vault Lisensi Tingkat OS**: Lisensi yang telah divalidasi otomatis disinkronkan ke vault terlindung di luar folder git (`/etc/arch3r-nvr/license.vault`).
  - **Proteksi Factory Reset**: Tombol *Factory Reset* (`/api/superadmin/factory-reset`) mereset data kamera dan pengguna, namun **tetap mempertahankan lisensi resmi pembeli** dari Vault OS.
  - **Startup Auto-Healing**: Startup server otomatis memulihkan lisensi dari Vault OS jika file database terhapus secara tidak sengaja.
- **System Version & Metadata Alignment:**
  - Menaikkan nomor versi aplikasi ke **Ver. 10.7.9** pada `package.json`, `metadata.json`, `index.html`, `public/admin.html`, `public/version_sync.js`, `public/script.js`, `README.md`, dan `CHANGELOG.md`.

## [Ver 10.7.8] - 2026-09-25
### Clean Video Canvas Architecture, Real-Time HD/SD WebRTC Stream Synchronization & Centralized Audio
- **Clean Video Canvas Architecture (`public/script.js`):**
  - **Eliminasi Tombol Floating Audio Redundan**: Menghapus tombol floating audio (`cam-audio-toggle`) dari seluruh kanvas sel kamera grid desktop maupun mobile. Sel video CCTV kini bersih murni menampilkan stream video tanpa distorsi elemen tombol yang tumpang tindih.
- **Centralized Audio Controls (`public/script.js` & `public/index.html`):**
  - **Pemusatan Kontrol Suara**: Seluruh interaksi audio kini terpusat pada bilah kendali terpadu (**Unified PTZ / Player Control Bar**), yaitu tombol mute/unmute (`🔊 Audio` / `btnPlayerAudioMute`) dan slider volume (`playerVolumeSlider`).
  - **Dukungan Dual-Layout Desktop & Mobile**: `toggleSelectedMute()` dan `setSelectedVolume()` kini mengenali elemen video baik pada `#cell_{id}` (desktop) maupun `#m_cell_{id}` (mobile).
  - **Proteksi Audio Eksklusif**: Mengaktifkan suara pada kamera terpilih secara otomatis membisukan kamera lainnya untuk mencegah interferensi suara.
- **Real-Time HD/SD WebRTC & HLS Stream Synchronization (`public/script.js`):**
  - **Penyelarasan Nilai Awal**: Memastikan `camStreamQualities[cam.id]` terinisialisasi secara sinkron dengan mode grid (SD saat multi-grid dengan sub-stream aktif, HD saat single view) sehingga teks tombol kontrol toolbar dan badge sel video tidak pernah bertentangan.
  - **Pergantian Kualitas WebRTC Dinamis**: `toggleSelectedQuality()` kini memanggil `playUltraStream()` dengan pembersihan sesi WebRTC lama secara menyeluruh (`destroyHlsPlayers`, `close` peer connection lama), sehingga browser segera menyambung ke jalur WebRTC WHEP yang baru (`camId` untuk HD, `camId_sub` untuk SD) tanpa tertahan di stream lama.
  - **Validasi Sub-Stream**: Menyediakan notifikasi informatif jika kamera yang dipilih tidak memiliki konfigurasi URL Sub-Stream terpisah.
  - **Two-Way Reactive Badge Sync**: Badge kualitas di pojok kanvas sel (`#badge_quality_{id}` & `#m_badge_quality_{id}`) dan tombol toolbar (`#playerQualityLabel`) diperbarui secara instan dua arah.
- **System Version & Metadata Alignment:**
  - Menaikkan nomor versi aplikasi ke **Ver. 10.7.8** pada `package.json`, `metadata.json`, `index.html`, `public/admin.html`, `public/script.js`, `README.md`, dan `CHANGELOG.md`.

## [Ver 10.7.7] - 2026-09-24
### Professional OSD Stream State Overlay Engine & Universal V380/ONVIF Audio Transcoding
- **Professional Video Player OSD State Overlay Engine (`public/script.js` & `public/style.css`):**
  - **Eliminasi Layar Hitam Polos (*No More Blank Screens*)**: Menghadirkan sistem indikator visual On-Screen Display (OSD) interaktif di atas kanvas video stream baik pada tampilan live grid desktop, mobile grid, maupun player playback.
  - **Status Aliran Real-Time yang Informatif**:
    - **`⚡ Menghubungkan...`**: Ditampilkan saat browser menginisialisasi sesi WebRTC WHEP atau memuat playlist HLS kamera.
    - **`⏳ Buffering...`**: Ditampilkan otomatis saat aliran terhambat, menunggu paket video, atau saat seeking.
    - **`❌ Aliran Terputus`**: Ditampilkan dengan jelas saat kamera offline, koneksi jaringan putus, atau RTSP gagal, menggantikan layar hitam mati tanpa penjelasan.
    - **Transisi Mulus**: Overlay otomatis tersembunyi secara halus begitu video frame pertama mulai terputar (`playing` event).
- **Optimalisasi Perekaman FFmpeg FastStart & Akselerasi Playback (`server.js`):**
  - **Penempatan Metadata `moov` di Awal Berkas**: Menambahkan argumen `-segment_format_options movflags=+faststart` pada segmentasi perekaman MP4 kontinyu FFmpeg.
  - **Instant Seeking & Zero-Delay Playback**: Mengeliminasi jeda "lelet" 2-5 detik saat memulai pemutaran klip atau menggeser scrubber timeline karena browser kini dapat langsung membaca metadata durasi dan keyframe tanpa perlu mengunduh bagian akhir berkas terlebih dahulu.
  - **Status OSD Playback (`#pbStateOverlay`)**: Mengaktifkan overlay pada panel playback untuk memberikan konfirmasi visual saat memuat klip (`⚡ Memuat Rekaman...`) dan saat melompat detik (`🔍 Mencari Titik Rekaman...`).
- **Universal Audio Transcoding untuk Kamera Non-Ezviz (V380, XM, ONVIF Generic):**
  - **Identifikasi Penyebab Ketiadaan Suara**: Kamera Ezviz secara bawaan memancarkan audio dengan format AAC yang didukung langsung oleh browser. Sedangkan kamera V380, Xiongmai, Tapo, dan generic ONVIF umumnya memancarkan audio G.711u (PCMU) atau PCMA 8000Hz mono yang tidak dapat didekode oleh browser HTML5 jika disimpan murni di kontainer MP4 standar.
  - **High-Efficiency Resampling & Transcoding (`server.js`)**: Mengonfigurasi FFmpeg untuk mentranscode audio input (termasuk G.711u/PCMU) ke format AAC standar web (`-c:a aac -b:a 64k -ar 16000 -ac 1 -af "aresample=async=1"`), menghasilkan berkas rekaman dengan suara jernih dan anti-desinkronisasi tanpa membebani prosesor Armbian STB.
  - **Interactive Cell Audio Toggle (`public/script.js` & `public/index.html`)**: Menyediakan tombol pengaktif suara interaktif (`🔊` / `🔇`) pada setiap sel kamera live grid monitor untuk kemudahan mendengarkan audio secara langsung dengan mekanisme auto-mute pada kamera lain.
- **System Version & Metadata Alignment:**
  - Menaikkan nomor versi aplikasi ke **Ver. 10.7.7** pada `package.json`, `metadata.json`, `index.html`, `public/admin.html`, `public/script.js`, `README.md`, dan `CHANGELOG.md`.

## [Ver 10.7.5] - 2026-09-24
### Fix Admin About NVR View (DOM Hierarchy Correction & Real-Time Sync)
- **DOM Hierarchy & Structural Fix (`public/index.html`):**
  - **Penghapusan Orphan Closing `</div>`**: Memperbaiki tag penutup `</div>` liar di atas deklarasi `#view-about` yang sebelumnya menyebabkan kontainer utama `<div class="app-layout" id="adminApp">` tertutup secara prematur, sehingga memicu tampilan halaman kosong (*blank screen*) saat menu "About NVR" diklik.
  - **Sarang Elemen Sempurna**: `#view-about` kini berada kokoh di dalam `<main class="main-content">` pada kontainer `#adminApp` sehingga navigasi tampilan berjalan 100% mulus.
- **Enhanced About Navigation & Discoverability:**
  - **Sinkronisasi Navigasi Otomatis (`public/script.js`)**: `navigateToView('view-about')` kini langsung memicu pemanggilan `fetchAboutInfo()` secara real-time saat menu diklik, memastikan versi aplikasi, Machine ID, dan status lisensi selalu termutakhirkan tanpa status "Memuat...".
  - **Quick Link Banner di "Sistem & Jaringan"**: Menambahkan banner pintasan langsung di dalam menu *Sistem & Jaringan* (`view-setting-system`) dengan tombol satu-klik menuju halaman *About NVR*.
  - **Multi-Role Authentication & Fallback**: Memperluas akses rute `/api/about` di `server.js` untuk semua user terotentikasi dan mendukung role `admin` secara setara dengan `administrator`, serta menyediakan fallback tampilan jika koneksi tertunda.
  - **Backward-Compatible Container References**: Mengizinkan `adminApp` mengenali `#adminApp` maupun `#mainApp` pada `public/admin.html` agar antarmuka tidak tertahan pada status tersembunyi.
- **System Version & Metadata Alignment:**
  - Menaikkan nomor versi aplikasi ke **Ver. 10.7.5** pada `package.json`, `metadata.json`, `index.html`, `public/admin.html`, `README.md`, dan `CHANGELOG.md`.

## [Ver 10.7.4] - 2026-09-24
### Universal Camera RTSP URL Templates CRUD Database & Edit Credentials Real-Time Sync
- **Camera Brand RTSP Template Database (Split-DB Architecture):**
  - **Persistent Split-DB Storage (`local_db_camera_templates.json`)**: Memindahkan pola URL RTSP dari logika statis kode ke database mandiri yang aman terhadap `git pull`, dengan mirroring otomatis ke shadow database.
  - **CRUD API Endpoints (`/api/camera-templates`)**: Menyediakan REST API lengkap untuk mengambil (`GET`), menambah (`POST`), mengubah (`PUT`), menghapus (`DELETE`), dan mengembalikan ke standar (`POST /reset`) template format URL kamera CCTV.
  - **Default Universal Presets**: Dilengkapi katalog bawaan siap pakai untuk berbagai vendor terkemuka: **ONVIF Generic, Macrovideo V380, Hikvision / HiLook, Dahua / Imou, Xiongmai / XM, TP-Link Tapo, Bardi / Tuya IPC, Uniview (UNV), dan Ezviz**, lengkap dengan pemetaan port default dan protokol PTZ.
  - **Modular Addon Marketplace Integration**: Terdaftar sebagai Addon resmi `camera-templates` ("Katalog Template RTSP & IPC Vendor") di Marketplace Addon NVR dengan pintasan langsung ke modal manajemen template.
- **Interactive Template Management UI Modal (`templateModalOverlay`):**
  - Tombol akses cepat **"⚙️ Kelola Template"** disematkan langsung di samping dropdown pilihan preset formulir kamera.
  - Antarmuka manajemen lengkap: melihat daftar template aktif, menambah pola kustom baru, mengedit placeholder token (`{ip}`, `{port}`, `{user}`, `{pass}`), live preview kompilasi URL interaktif, dan tombol reset ke default.
  - Dropdown preset kamera pada formulir Tambah/Edit Kamera kini otomatis sinkron secara dinamis dengan database template.
- **Camera Edit Form Fixes & Real-Time Credential Synchronization:**
  - **Full Credential Resolution**: Mengatasi kendala username & password kamera yang tidak terlihat saat edit kamera dengan hierarki fallback cerdas: DB field `username`/`password` -> `ptzUser`/`ptzPass` -> ekstraksi regex dari string `mainStreamUrl`.
  - **Auto-Injection Password ke URL RTSP**: Ketika pengguna mengisi atau mengubah password di form (baik saat tambah maupun edit kamera), password secara otomatis ditulis dan disinkronkan ke dalam URL stream RTSP tanpa merusak struktur path manual.
  - **Real-Time Input Synchronization**: Menghapus batasan yang sebelumnya memblokir pembaruan URL saat mode edit, sehingga pengetikan username, password, IP, dan port langsung tercermin pada URL RTSP secara real-time.
  - **Dynamic Template Detection**: Saat membuka formulir edit kamera, sistem secara otomatis mencocokkan URL stream terhadap database template untuk memilih preset vendor yang sesuai.
- **System Version & Metadata Alignment:**
  - Menaikkan nomor versi aplikasi ke **Ver. 10.7.4** pada `package.json`, `metadata.json`, `server.js`, `index.html`, `public/index.html`, `public/script.js`, `README.md`, dan `CHANGELOG.md`.

## [Ver 9.9.5] - 2026-09-19
### Centralized Universal Version Synchronizer & Robust Addons Authentication
- **Centralized Version Synchronizer Architecture:**
  - **Single Source of Truth (`version.json` & `package.json`)**: Memusatkan nomor versi aplikasi ke `version.json` dan `package.json` (`APP_VERSION`) sehingga pengembang tidak perlu lagi mengubah penomoran versi satu per satu di setiap file halaman HTML atau script.
  - **Dynamic Express HTML Middleware (`server.js`)**: Menginjeksi middleware cerdas pada server yang secara otomatis menyinkronkan penomoran versi di semua halaman (`/`, `index.html`, `superadmin.html`, `admin.html`) dan aset cache-busting (`?v=...`) langsung dari server sebelum disajikan ke browser klien.
  - **Universal Client Synchronizer (`public/version_sync.js`)**: Menyediakan skrip mandiri yang disuntikkan ke dokumen klien untuk memperbarui `document.title` dan semua elemen penampil versi (`.app-version`, `badge`, teks berlabel `Ver.`) serta memvalidasi sinkronisasi langsung ke endpoint `/api/version`.
  - **Version Endpoint (`/api/version`)**: Menyediakan endpoint REST publik `/api/version` yang mengembalikan nomor versi sistem secara real-time.
- **Addon Marketplace Connection & Authorization Fix:**
  - **Global Scope `authFetch` & Dual-Token Retrieval (`public/script.js`)**: Memindahkan helper `authFetch` dan `getAuthToken` ke *global scope* (`window.authFetch`) dengan dukungan pembacaan multi-kunci token (`nvr_auth_token` dan `arch3r_token`). Menyimpan kedua token secara harmonis saat proses login.
  - **Multi-Role Addon Authorization (`server.js`)**: Memperluas validasi hak akses pada seluruh endpoint addon (`/api/addons`, `/api/addons/install`, `/api/addons/:id/toggle`, `/api/addons/:id`, `/api/addons/:id/config`) untuk mencakup `superadmin`, `administrator`, dan `admin` sehingga mencegah kesalahan *403 Forbidden* atau kegagalan otentikasi saat user administrator membuka antarmuka Addons Marketplace.
  - **Detailed Frontend Error States**: Mengganti penanganan error ambigu ("Error koneksi ke server") dengan notifikasi status yang jelas dan deskriptif (misal: sesi kedaluwarsa atau masalah jaringan).
- **System Version & Metadata Alignment:**
  - Menaikkan nomor versi aplikasi ke **Ver. 9.9.5** pada `package.json`, `version.json`, `metadata.json`, `server.js`, `public/version_sync.js`, `public/script.js`, `public/superadmin.js`, `README.md`, dan `CHANGELOG.md`.

## [Ver 9.9.4] - 2026-09-19
### Modular Dynamic Addons Marketplace Architecture (YOLOv8 & HDMI Kiosk Dynamic Integration)
- **Modular Physical Addons Discovery (`server.js`):**
  - **Dynamic Directory Scanner (`scanAvailablePhysicalAddons`)**: Mengimplementasikan scanner dinamis untuk folder `/addons` yang membaca metadata (`manifest.json` dan `package.json`) dari subdirektori addon secara otomatis tanpa perlu hardcode bawaan sistem.
  - **Non-Hardcoded Addon Status (`system_protected = false`)**: Menghilangkan status bawaan terproteksi (`system_protected: true`) pada modul AI YOLOv8 dan HDMI Kiosk sehingga kini sepenuhnya bertindak sebagai Addons modular di Marketplace yang dapat diaktifkan, dinonaktifkan, diatur konfigurasinya, maupun dihapus/di-uninstall oleh pengguna.
  - **Addon Manifests**: Menyediakan `manifest.json` standar pada `/addons/ai-yolo/manifest.json` dan `/addons/hdmi-kiosk/manifest.json` yang memuat identitas modul, versi, icon representatif, deskripsi, dan entry point.
- **Split-DB Addon Lifecycle & Uninstall Tracking:**
  - **Uninstall State Persistence (`uninstalled_addons`)**: Menambahkan pelacakan array `uninstalled_addons` pada `local_db_addons.json` agar addon yang telah dihapus oleh pengguna tidak otomatis muncul kembali secara paksa saat NVR memindai direktori `/addons`.
  - **Dynamic Process Control**: Menghubungkan tombol toggle (▶️/⏹️) dan tombol hapus (🗑️) di antarmuka pengguna langsung ke daemon PM2 (`arch3r-ai-yolo`) dan service systemd (`arch3r-kiosk`).
- **System Version & Metadata Alignment:**
  - Menaikkan nomor versi aplikasi ke **Ver. 9.9.4** pada `package.json`, `metadata.json`, `server.js`, `public/script.js`, `public/index.html`, `public/superadmin.html`, `README.md`, dan `CHANGELOG.md`.

## [Ver 9.9.3] - 2026-09-19
### Multi-Variant Macrovideo V380 Pro PTZ Driver & Automated Protocol Auto-Select
- **Multi-Variant Binary Packet Generator (`/lib/v380_driver.js`):**
  - **Dual Header Support**: Menambahkan generator paket biner varian kedua (`buildV380PtzVariant2Packet`) dengan Magic Header `0x7F 0x00 0x00 0x01` dan Opcode `0x2710` (24-byte packet) khusus untuk kamera generasi baru V380 Pro / V380 Q7/Q8 yang menggunakan protokol V2.
  - **Dual-Burst Transmission (`sendV380PtzCommand`)**: Mengirimkan burst biner gabungan (*Standard 0x284A + V380 Pro 0x2710*) pada soket TCP port 8800 secara berurutan untuk menjamin kompatibilitas menyeluruh pada semua firmware kamera Macrovideo lama maupun baru.
- **Frontend Intelligent Protocol Detection (`public/script.js`):**
  - Mengotomatisasi pemilihan dropdown protokol kamera (`camPtzSelect` otomatis beralih ke `v380_native`) saat pengujian probe koneksi mendeteksi respon aktif pada socket Macrovideo port 8800.
- **System Version & Metadata Alignment:**
  - Menaikkan nomor versi aplikasi ke **Ver. 9.9.3** pada `package.json`, `metadata.json`, `server.js`, `public/index.html`, `public/superadmin.html`, `README.md`, dan `CHANGELOG.md`.

## [Ver 9.9.2] - 2026-09-19
### Macrovideo V380 Direct Binary TCP Socket PTZ Driver & Hybrid Fallback Engine
- **Macrovideo V380 Native Binary Driver (`/lib/v380_driver.js`):**
  - **Direct TCP Socket (Port 8800)**: Mengintegrasikan pustaka driver biner untuk mengontrol motor PTZ kamera V380/V380 Pro melalui soket TCP port 8800 secara mandiri tanpa tergantung pada protokol ONVIF XML SOAP yang sering diblokir atau tidak lengkap pada firmware Macrovideo terbaru.
  - **Standard 32-Byte Packet Constructor (`buildV380PtzPacket`)**: Menyusun frame biner dengan header magic `0x00 0x00 0x01 0x07 0x20 0x21 0x00 0x00`, Command ID `0x284A`, dan mapping opcode terarah (`UP=0x01`, `DOWN=0x02`, `LEFT=0x03`, `RIGHT=0x04`, `ZOOM_IN=0x05`, `ZOOM_OUT=0x06`, `STOP=0x00`).
  - **TCP Connection Lifecycle & Auto-Stop Management (`sendV380PtzCommand`)**: Mengatur koneksi soket cepat (<2500ms timeout) dengan pengiriman paket continuous move diikuti paket stop biner otomatis sesuai durasi tanpa resiko *socket leak* atau *process blocking*.
  - **Socket Probe Utility (`probeV380Socket`)**: Menyediakan fungsi diagnostik konektivitas soket TCP port 8800 untuk deteksi instan kamera V380 di jaringan lokal.
- **Smart Hybrid PTZ Routing & Auto-Fallback (`server.js`):**
  - **Multi-Protocol PTZ Routing (`/api/cameras/:id/ptz`)**: Mendukung pemilihan protokol PTZ (`ptzProtocol: 'auto' | 'onvif' | 'v380_native'`). Kamera dengan konfigurasi V380 Native atau port 8800 langsung diarahkan ke driver biner.
  - **Zero-Failure Fallback Engine**: Jika pengiriman perintah via ONVIF standar mengalami kegagalan (XML timeout / parsing error), backend otomatis melakukan *fallback* cerdas dengan menembakkan perintah PTZ ke socket V380 port 8800 secara transparan.
  - **Dedicated Stop & Probing Endpoint Updates**: Memperbarui rute `/api/cameras/:id/ptz-stop`, `/api/cameras/:id/ptz-probe`, dan `/api/onvif/probe-custom` dengan penanganan ganda (ONVIF + V380 binary socket).
- **Frontend UI Protocol Selector (`index.html` & `script.js`):**
  - Menambahkan opsi pilihan protokol **Macrovideo V380 Native (Port 8800 Binary Socket)** pada dropdown pengaturan PTZ di modal konfigurasi kamera.
  - Menyelaraskan form autofill, edit kamera, reset form, dan submit payload dengan parameter `ptzProtocol`.
- **System Version & Metadata Alignment:**
  - Menaikkan nomor versi aplikasi ke **Ver. 9.9.2** pada `package.json`, `metadata.json`, `server.js`, `index.html`, `README.md`, dan `CHANGELOG.md`.

## [Ver 9.9.1] - 2026-09-19
### Diagnostic ONVIF Profile Probing & ProfileToken Pre-flight Verification
- **Diagnostic ONVIF Profile Probing**: Mengimplementasikan fungsi diagnostik backend `diagnoseOnvifProfiles` yang melakukan probing terhadap kamera berkemampuan ONVIF pada port 8899 (serta custom port) untuk mengekstrak seluruh daftar profil media (`device.profile_list` / `GetProfiles`), resolusi video, encoding, token profil aktif, status layanan PTZ, dan response time.
- **ProfileToken Pre-flight Verification**: Menyediakan verifikasi pra-gerak motor PTZ untuk mendeteksi apakah kamera memiliki profil kosong (*empty profile list*) atau token yang hilang (*missing tokens*) sebelum instruksi Continuous Move/PTZ dikirimkan.
- **Dedicated Diagnostic Endpoints**: Menyediakan endpoint `/api/onvif/diagnose-profiles` serta menyempurnakan respons `/api/cameras/:id/ptz-probe` dan `/api/onvif/probe-custom` dengan detail token profil dan log diagnostik terstruktur.
- **Visual Token Diagnostic Tags in UI**: Memperbarui modal uji coba ONVIF pada antarmuka pengguna agar menampilkan badge token profil (misal: `ProfileToken000 (1920x1080)`) dan model kamera secara langsung saat tombol uji coba diklik.

## [Ver 9.9.0] - 2026-09-19
### V380 & ONVIF Profile Token Extraction & Continuous Move Refactoring
- **V380 Profile Token Extraction**: Menyesuaikan alur kontrol PTZ kamera V380 dengan mengambil `profileToken` aktif (`const profile = device.getCurrentProfile(); const token = profile ? profile['token'] : 'ProfileToken000';`) sebelum eksekusi perintah motor PTZ.
- **Continuous Move & Explicit Stop Routing**: Menerapkan routing `/api/cameras/:id/ptz` dan endpoint dedicated `/api/cameras/:id/ptz-stop` dengan passing `profileToken`, koordinat kecepatan x/y/z, serta eksekusi stop (`device.ptzStop({ profileToken: token })` dan SOAP fallback).
- **Auto-assigned Device Profile**: Memastikan properti internal `device.current_profile` selalu terinisialisasi pada instance `OnvifDevice` untuk mencegah penolakan perintah dari driver internal.
### Enhanced Armbian Kiosk Keep-Alive & Chromium Root Flags
- **Kiosk Auto-Restart & Sandbox Hardening (`setup-kiosk-armbian.sh`):**
  - **Auto Keep-Alive Loop**: Menambahkan *infinite watch loop* pada `/opt/arch3r-kiosk/start-kiosk.sh` sehingga Chromium tidak akan pernah keluar (*exit*) atau mati sendiri ketika terjadi navigasi atau transisi render.
  - **Robust Chromium Root Flags**: Menambahkan parameter wajib Chromium untuk lingkungan root Armbian/Ubuntu Noble (`--user-data-dir=/tmp/arch3r_kiosk_chrome`, `--test-type`, `--disable-dev-shm-usage`, `--autoplay-policy=no-user-gesture-required`, dan pembersihan otomatis Singleton lock).
  - **Systemd Always Restart**: Mengubah kebijakan *restart* `arch3r-kiosk.service` menjadi `Restart=always` dengan interval 5 detik untuk memastikan ketersediaan tampilan CCTV 24/7.

## [Ver 9.8.3] - 2026-09-18
### Absolute Stability & Anti-Reboot Decoupling
- **Pembersihan Total Pemanggilan `startx` dari Backend Node.js:**
  - **Eliminasi Kernel Panic Meson DRM**: Menghapus seluruh logika eksekusi *spawn* `startx` dari dalam *daemon* Node.js. Menjalankan `startx` langsung dari proses *background* tanpa alokasi TTY pada Linux Armbian (Amlogic HG860P) terbukti memicu *kernel crash* / *VT switch panic* dan *hardware watchdog reboot* saat kabel HDMI dicolok.
  - **Safe Telemetry Mode**: Modul `./addons/hdmi-kiosk/index.js` kini murni beroperasi sebagai pembaca status sysfs HDMI (*read-only telemetry*) tanpa mengeksekusi subproses grafis apa pun.
  - **Standalone Armbian Systemd Service Script (`setup-kiosk-armbian.sh`)**: Menyediakan skrip instalasi *service* OS Linux mandiri (`arch3r-kiosk.service`) yang mengalokasikan TTY7, `matchbox-window-manager`, dan izin `Xwrapper.config` yang benar pada level sistem operasi jika pengguna ingin menjalankan tampilan Kiosk HDMI tanpa membebani *runtime* Node.js.

## [Ver 9.8.2] - 2026-09-18
### Critical Fix & Stability (Anti-Restart STB Protection)
- **Safe Standby Mode untuk HDMI Kiosk Add-on (`./addons/hdmi-kiosk/`):**
  - **Pencegahan Restart Loop STB**: Mengubah konfigurasi `autoStart` menjadi `false` (dinonaktifkan secara *default*). Add-on Kiosk tidak akan pernah otomatis mengeksekusi `startx` saat sistem *boot* kecuali jika diaktifkan secara sengaja oleh pengguna.
  - **Validasi Prasyarat Biner (Binary Pre-flight Check)**: Sistem sekarang memeriksa ketersediaan biner `/usr/bin/startx`, `Xorg`, dan `chromium-browser` terlebih dahulu sebelum mencoba menjalankan display grafis. Jika paket X11 belum terpasang pada Armbian STB, sistem tetap dalam kondisi *idle* tanpa memicu *error* atau *GPU crash*.
  - **Circuit Breaker & Cooldown Fail-Safe**: Menerapkan mekanisme pendinginan otomatis (*cooldown* 60 detik) dan batas toleransi kegagalan (maksimal 3 kali). Jika X11 keluar mendadak (*crash* driver GPU Mali/DRM), sistem langsung menghentikan proses peluncuran secara permanen untuk mencegah kehabisan RAM (*OOM*) dan *reboot loop* pada STB Amlogic HG860P.
  - **Isolasi Perintah Pembersihan (Safe `pkill`)**: Mencegah benturan proses sistem latar belakang dengan memastikan *cleanup* hanya dieksekusi saat sesi Kiosk aktif.

## [Ver 9.8.1] - 2026-09-18
### Added & Enhanced
- **Arsitektur Add-on Lokal: HDMI Hot-Plug Detection & X11/Chromium Kiosk Launcher (`./addons/hdmi-kiosk/`):**
  - Membuat modul add-on lokal `arch3r-addon-hdmi-kiosk` dengan `package.json` mandiri dan `index.js`.
  - Memonitor status fisik colokan kabel HDMI pada kernel Linux sysfs (`/sys/class/drm/card0-HDMI-A-1/status`, `/sys/class/drm/card0-HDMI-A-2/status`, serta driver Amlogic Meson `/sys/class/amhdmitx/amhdmitx0/hpd_state` untuk STB HG860P).
  - Loop polling hot-plug otomatis setiap 10 detik. Jika status HDMI berubah menjadi "connected", sistem meluncurkan sesi grafis minimal X11 & Chromium mode Kiosk (`startx /usr/bin/chromium-browser --kiosk --no-first-run --disable-infobars --disable-session-crashed-bubble --app=http://localhost:3000 -- -nocursor`).
  - Ketika kabel HDMI dicabut ("disconnected"), sistem secara otomatis mematikan sesi grafis (`pkill -f chromium-browser && pkill -f xinit`) untuk menghemat RAM dan resource CPU STB pada mode headless (tanpa monitor).
  - Integrasi modular aman via `try-catch` di dalam `server.js` dengan endpoint kendali status `/api/addons/hdmi-kiosk/status` dan aksi manual `/api/addons/hdmi-kiosk/toggle`.
- **Integrasi ONVIF Profile S & Stream Auto-Resolver:**
  - Menambahkan endpoint backend `/api/system/onvif-resolve` yang membaca endpoint ONVIF Device Service (port standar `8899`), memvalidasi profile kamera, dan secara otomatis mengekstrak RTSP Stream URI (port `554`) tanpa perlu tebak URL manual.
  - Memperbarui kendali Continuous Move PTZ (`/api/cameras/:id/ptz`) dengan dukungan port prioritas 8899 dan pembacaan fleksibel dari parameter kamera (`ptzUrl`, `ptzUser`, `ptzPass` atau RTSP URL).
- **Penyelarasan Versi Sistem:** Menaikkan nomor versi aplikasi ke `9.8.1` pada `package.json`, `metadata.json`, `server.js`, `index.html`, `script.js`, `README.md`, dan `CHANGELOG.md`.

## [Ver 9.8.0] - 2026-09-18
### Fixed & Improved
- **Grid Layout 4x4 Fix:** Memperbaiki layout grid 4x4 pada mode landscape fullscreen dengan `min-height: 0` dan `min-width: 0` agar sel kamera proporsional dan tidak terdistorsi.
- **Watermark OSD Judul Kamera:** Mengubah judul kamera di pojok kiri atas sel video menjadi watermark semi-transparan dengan efek blur latar belakang.
- **Cache-Busting Update:** Memperbarui query string aset statis ke `?v=9.8.0`.
### Fixed & Improved
- **Penyelarasan Panel Navigasi Bawah di Mode Fullscreen & Landscape:** Pada mode Fullscreen, panel navigasi dan tombol gerigi (⚙️) kini ditempatkan di bagian bawah layar (`bottom: 0` / `bottom: 14px`), bukan di atas video. Pada mode landscape layar ponsel/tablet, layout video grid otomatis disesuaikan (`max-height: 65vh; aspect-ratio: 16/9;`) sehingga video tidak terpotong dan navigasi tetap nyaman diakses.
- **Label Kamera Aktif PTZ Vertikal di Atas D-Pad:** Memindahkan label nama kamera aktif PTZ ke bagian atas tombol D-Pad (`flex-direction: column`). Penamaan kamera tidak lagi menggeser posisi atau mendistorsi tata letak tombol D-Pad 3x3.
- **Paginasi Halaman Kamera Menyatu dengan Baris Channel:** Menempatkan tombol navigasi halaman video (`◀ Prev`, indikator `Hal X/Y`, `Next ▶`) sejajar langsung di baris bawah kamera bersama tombol pilihan channel (`ALL`, `CH1`, `CH2`, dst.), memudahkan navigasi banyak kamera sekaligus.
- **Panel Media Player Kiri Seimbang dengan Tombol PTZ Kanan:** Mengelompokkan tombol Fullscreen (`⛶ Fullscreen`) dan Refresh (`🔄 Refresh`) di sisi kiri setara dengan kontrol pemutar media (tombol `▶️ Play / ⏸️ Pause`, `🔊 Bisu / Suara`, pengatur slider volume, dan `📸 Foto` snapshot). Ukuran kotak kontrol kiri kini sejajar dan proporsional dengan kotak D-Pad PTZ di sisi kanan.
- **Penyelarasan Versi Sistem:** Menaikkan nomor versi aplikasi ke `9.7.1` pada `package.json`, `server.js`, `index.html`, `superadmin.html`, dan `CHANGELOG.md` dengan cache-busting `?v=9.7.1`.

## [Ver 9.7.0] - 2026-09-18
### Fixed & Improved
- **Pemulihan Rasio Widescreen Normal 16:9 Kamera (Anti-Stretching):** Memperbaiki proporsi sel grid kamera (`.cam-cell`) dan pemutar video (`object-fit: contain;`) dengan aturan `aspect-ratio: 16/9 !important; height: auto !important;` serta `grid-template-rows: auto !important;`. Tayangan CCTV kini kembali normal berbentuk kotak horizontal standar 16:9 tanpa mengalami distorsi vertikal/memanjang ke bawah.
- **Penyempurnaan Tata Letak Toolbar Navigasi Bawah:** Menata ulang bilah kontrol bawah (`#topControlContainer`) agar tampil rapi dan proporsional di semua resolusi layar (mobile potret/lanskap dan desktop). Menambahkan padding bawah aman (`env(safe-area-inset-bottom)`), memperjelas baris pilihan channel (*Channel Bar*), merapikan tombol navigasi layout/halaman, dan memastikan panel D-Pad PTZ tidak terpotong di bagian bawah layar.
- **Penanganan Scroll Mandiri Kanvas Monitor (`#monitorWrapper`):** Mengaktifkan scroll vertikal yang halus (`overflow-y: auto; -webkit-overflow-scrolling: touch;`) pada kontainer monitor mobile sehingga jika perangkat pengguna memiliki tinggi layar terbatas, seluruh kontrol tetap dapat diakses dengan mudah tanpa memotong video atau tombol.
- **Penyelarasan Versi Sistem:** Menaikkan nomor versi aplikasi ke `9.7.0` pada `package.json`, `server.js`, `index.html`, `superadmin.html`, dan `CHANGELOG.md` dengan penambahan parameter *cache-busting* `?v=9.7.0`.

## [Ver 9.6.9] - 2026-09-18
### Fixed & Improved
- **Pemindahan Navigasi Menu ke Bawah Video Grid:** Memindahkan bilah navigasi kontrol terpadu (Channel Bar, Pengalih Grid 1x1 s/d 4x4, Paginasi Halaman Prev/Next, Tombol Cepat Audio, Snapshot Foto, D-Pad PTZ 3x3, Tombol Fullscreen, dan Refresh) ke bagian bawah layar, tepat di bawah video grid, memberikan tampilan pemantauan yang jauh lebih ergonomis dan bersih.
- **Mode Layar Penuh Tanpa Menutup Video (Non-Obstructing Fullscreen Video):** Pada mode Fullscreen, panel navigasi bawah secara default tertutup sehingga kanvas video kamera memenuhi 100% layar. Ketika tombol gerigi (⚙️) diklik, bilah kontrol terbuka di bagian bawah secara teratur dan kontainer video grid menyusut secara fleksibel di atasnya (`flex: 1 1 auto; min-height: 0;`), memastikan seluruh panel/kanvas kamera tetap terlihat jelas dan tidak pernah tertutup ataupun terpotong oleh overlay kontrol.
- **Perbaikan Tombol Show/Hide Sidebar pada Mode Landscape:** Memperbaiki visibilitas header mobile (`.mobile-header`) dan tombol menu burger (`#btnMobileMenu`) pada mode landscape (khususnya tablet, smartphone landscape, dan layar ringkas) dengan drawer sidebar (`.sidebar.mobile-open`) dan overlay latar (`.sidebar-overlay.active`) yang dapat dibuka/tutup secara mulus tanpa mengganggu rasio video.
- **Penyelarasan Versi Sistem:** Menaikkan nomor versi aplikasi ke `9.6.9` pada `package.json`, `server.js`, `index.html`, `superadmin.html`, dan `CHANGELOG.md` dengan penambahan cache-busting `?v=9.6.9`.

## [Ver 9.6.8] - 2026-09-18
### Fixed & Improved
- **Pembersihan Total Redundansi Panel Kontrol (Single Unified Navigation Bar):** Menghapus panel ganda bawah (`#bottomControlPanel`) yang sebelumnya memicu duplikasi tombol grid, channel bar, dan kontrol PTZ di perangkat mobile maupun desktop. Seluruh fitur penting (Layout Grid 1x1 s/d 4x4, Navigasi Halaman Prev/Next, Tombol Cepat Audio `🔊 Audio`, Tombol Snapshot `📸 Foto`, D-Pad PTZ 3x3 responsif, Tombol Layar Penuh `⛶ Fullscreen`, dan `🔄 Refresh`) kini disatukan secara bersih dan ramping di dalam bilah atas (`#topControlPanel`).
- **Mode Biasa vs Layar Penuh yang Selaras & Identik:** Pada mode biasa, bilah navigasi atas tampil rapi langsung di atas video grid dan tombol gerigi (⚙️) disembunyikan sepenuhnya (`display: none !important`). Pada mode Fullscreen, video grid memanfaatkan 100% layar, tombol gerigi (⚙️) muncul di pojok kanan atas, dan saat diklik membuka panel navigasi atas yang memiliki tombol-tombol dan fungsi navigasi yang persis sama dengan mode biasa.
- **Dukungan Fullscreen Lintas Peramban (Cross-Browser Class Synchronization):** Menambahkan sinkronisasi kelas `.is-fullscreen` pada kontainer monitor melalui event listener `fullscreenchange`, `webkitfullscreenchange`, dan `MSFullscreenChange`, menjamin tombol gerigi dan transisi overlay berjalan mulus di Linux Armbian STB, Android WebView, Chrome, dan Safari.
- **Optimalisasi Ruang Kanvas Video Mobile:** Dengan dihilangkannya panel bawah yang menumpuk, kanvas grid video CCTV kini mendapatkan ruang vertikal maksimal (`flex: 1 1 auto; min-height: 0;`), menghilangkan kekacauan tata letak serta tampilan ruang kosong yang terdistorsi.
- **Penyelarasan Versi Sistem:** Menaikkan nomor versi aplikasi ke `9.6.8` pada `package.json`, `server.js`, `index.html`, `superadmin.html`, dan `CHANGELOG.md` dengan penambahan parameter cache-busting `?v=9.6.8`.

## [Ver 9.6.7] - 2026-09-18
### Fixed & Improved
- **Penyelesaian Redundansi Navigasi (Single-Bar Navigation & Fullscreen Gear Only):** Menghilangkan navigasi ganda pada mode biasa. Toolbar kontrol utama di bagian atas kini menjadi satu-satunya bar navigasi lengkap yang tampil konsisten di atas video grid, mencakup: pilihan layout grid (1x1, 2x2, 3x3, 4x4), navigasi halaman kamera (Prev/Next page), tombol channel langsung, kontrol D-Pad PTZ 3x3 yang tersinkronisasi dengan kamera terpilih, tombol Fullscreen, dan tombol Refresh.
- **Tombol Gerigi (⚙️) Khusus Mode Fullscreen:** Tombol gerigi di sudut kanan atas kini disembunyikan sepenuhnya pada mode biasa (`display: none !important`) dan **hanya akan muncul saat pengguna masuk ke mode Fullscreen**. Pada mode Fullscreen, mengklik tombol gerigi akan membuka menu navigasi mengambang (floating overlay) dengan fungsi dan tombol navigasi yang identik dengan mode biasa.
- **Transisi Fullscreen Otomatis:** Menambahkan event listener `fullscreenchange` untuk mereset panel mengambang saat keluar dari mode layar penuh agar antarmuka kembali rapi dan konsisten.
- **Penyelarasan Versi Sistem:** Menaikkan nomor versi aplikasi ke `9.6.7` pada `package.json`, `server.js`, `index.html`, `superadmin.html`, dan `CHANGELOG.md` dengan penambahan cache-busting `?v=9.6.7`.

## [Ver 9.6.6] - 2026-09-18
### Added
- **Dual-Mode Contextual Sync (Mode Layar Penuh & Biasa):** Mengoptimalkan pengalaman pemantauan video CCTV sesuai standar NVR profesional. Pada mode biasa (non-fullscreen), panel kontrol bawah (`#bottomControlPanel`) tetap tampil lengkap dengan navigasi PTZ statis dan pemutar. Pada mode Fullscreen (`:fullscreen`), bilah kontrol bawah disembunyikan secara otomatis (`display: none !important`) agar kanvas video grid memanfaatkan 100% layar tanpa terpotong. Seluruh kendali monitor (pilihan grid, channel kamera, navigasi halaman, dan PTZ terpadu) dapat diakses mengambang secara intuitif dengan menekan tombol gerigi ⚙️ di pojok kanan atas.
- **Navigasi Halaman Kamera (Next / Prev Page Pagination):** Menambahkan tombol navigasi halaman kamera (`◀ Prev` dan `Next ▶`) beserta indikator halaman real-time (misal: `Hal 1/2`) pada menu pengaturan atas. Pengguna dengan banyak kamera aktif kini dapat berpindah halaman dengan lancar pada tata letak grid 1x1, 2x2 (4 kamera), 3x3 (9 kamera), maupun 4x4 (16 kamera) tanpa harus merubah layout atau kehilangan konteks channel.
- **Kontrol PTZ Mengambang Terpadu di Menu Gerigi:** Mengintegrasikan D-Pad PTZ 3x3 kompak pada floating menu atas (`topControlPanel`) yang tersinkronisasi penuh dengan kamera yang dipilih pada grid (disertai indikator nama channel aktif `topActiveCamLabel`), sehingga pengguna tetap dapat mengarahkan kamera PTZ secara fleksibel saat berada dalam mode layar penuh.
- **Penyelarasan Versi Sistem:** Menaikkan nomor versi aplikasi ke `9.6.6` pada `package.json`, `server.js`, `index.html`, `superadmin.html`, dan `CHANGELOG.md` dengan penambahan cache-busting `?v=9.6.6`.

## [Ver 9.6.5] - 2026-09-18
### Fixed
- **Perbaikan Regresi Tampilan Desktop & Isolasi Modal OTA:** Memperbaiki bug tata letak monitor desktop di mana modal update sistem Linux sempat muncul di dalam alur dokumen dan mendesak video grid. Menambahkan proteksi `style="display:none !important; position:fixed !important;"` langsung secara inline dan memperkuat CSS `.ota-modal-overlay` dengan `width: 100vw !important; height: 100vh !important; z-index: 99999 !important;`.
- **Integrasi Toolbar PTZ Desktop Tanpa Floating:** Mengganti class controller PTZ desktop dari `.ptz-controller` (yang memiliki style default floating `position: absolute; bottom: 20px; right: 20px`) menjadi `.desktop-ptz-grid`, sehingga tombol PTZ 3x3 tertanam rapi di dalam bilah kontrol bawah (`#bottomControlPanel`) tanpa melayang di atas layar video.
- **Cache-Busting Otomatis Aset Statis:** Menambahkan parameter versi otomatis (`style.css?v=9.6.5`, `script.js?v=9.6.5`, `superadmin.js?v=9.6.5`) pada `index.html` dan `superadmin.html` untuk memastikan peramban (browser) klien langsung memuat CSS dan JS versi terbaru tanpa terhambat cache lama.
- **Penyelarasan Versi Sistem:** Menyelaraskan seluruh nomor versi aplikasi pada `package.json`, `server.js`, `index.html`, `superadmin.html`, dan `CHANGELOG.md` ke versi `9.6.5`.

## [Ver 9.6.4] - 2026-09-18
### Added
- **Sistem Update OTA & Pipeline Terminal Linux Granular:** Menyediakan antarmuka pemeriksaan update resmi (tombol Cek Pembaruan, badge status versi, dan penampil catatan rilis/changelog interaktif) baik pada Console Superadmin maupun menu Informasi Sistem Administrator.
- **Konfirmasi Interaktif Alur Eksekusi Update STB:** Menambahkan modal checklist perintah Linux sebelum eksekusi (Backup Database Lokal, Git Pull origin main, NPM Install dependensi, PM2 Reload service, Bersihkan Cache NPM, Git Reset Hard, dan Reboot Hardware STB).
- **Live Terminal Console Viewer:** Menampilkan output log baris-per-baris dari proses eksekusi perintah terminal Linux di STB secara langsung di dalam antarmuka web.
- **Mobile CCTV Desk & Eliminasi Void Hitam Monitor:** Menata ulang tata letak monitor pada perangkat mobile/Android dengan mengoptimalkan tinggi video grid (menghilangkan ruang kosong hitam) dan menyematkan panel kendali terpadu (pemilih channel cepat, D-Pad PTZ 4-arah, tombol snapshot instan, dan kontrol audio).

## [Ver 9.6.1] - 2026-09-18
### Fixed
- **Root-Cause Fix for Database Wipe on Boot/Git Pull:** Mengidentifikasi dan memperbaiki akar masalah fatal di fungsi `initDB()` (`server.js`) di mana sistem lama memeriksa ketiadaan `nvrDbFile` (`data/live_db/nvr_db.json`) dan secara otomatis menimpa seluruh database akun administrator serta kamera menggunakan template kosong `getDefaultDb()`.
- **Anti-Wipe Dual-Layer Shadow Database:** Menambahkan sistem penyimpanan persisten sekunder di luar pohon direktori Git (`/var/lib/arch3r_nvr/db` dan fallback `~/.arch3r_nvr/db`) yang 100% kebal terhadap `git pull`, `git reset`, atau `git checkout`.
- **Self-Healing Anti-Wipe Engine:** Menambahkan mekanisme pemulihan otomatis pada `getNvrDb()` yang mendeteksi jika data administrator atau kamera kosong, dan langsung memulihkan dari safe shadow mirror atau golden snapshot `.safe_golden_snapshot.json`.
- **Airtight .gitignore Protection:** Memperketat `.gitignore` untuk melindungi seluruh file database split (`data/*`, `local_db_*.json`, `*.bak`, `*.tmp`, `.safe_golden_snapshot.json`) agar repositori Git tidak pernah melacak atau menimpa database pengguna.

## [Ver 9.6.0] - 2026-09-18
### Fixed
- **Fix Marketplace Crash:** Memperbaiki bug _ReferenceError_ pada _script_ antarmuka saat membuka tab Marketplace (Addons) yang menyebabkan antarmuka _stuck_ di "Memuat Addons...".
- **Fix YOLO AI Addon Disappear:** Mengunci module bawaan "YOLO AI" ke dalam database lokal agar tidak hilang atau terhapus secara tidak sengaja oleh migrasi sebelumnya.
- **Fix YOLO AI Dropdown Logic:** Menyempurnakan logika penyembunyian _dropdown_ kamera pada konfigurasi area (Grid) agar tidak lagi meminta pemilihan kamera jika dibuka langsung melalui pengaturan kamera spesifik.


## [Ver 9.6.0] - 2026-09-18
### Fixed
- **Fix 502 Bad Gateway (Camera Save):** Menghapus fungsi *synchronous deep-scan* (pemindaian memori secara sinkronus) pada `/media` dan `/mnt` saat menyimpan kamera. Pada STB Linux Armbian, pemindaian *disk* eksternal yang sedang *sleep* (spun-down) atau *network drive* dapat menyebabkan *Node.js event loop* terblokir. Pemblokiran ini menyebabkan Nginx/Cloudflare kehabisan waktu tunggu (*timeout*) dan menghasilkan *Error 502 Bad Gateway*. Sistem kini akan kembali menggunakan fallback folder lokal secara instan jika *path* tidak diatur.


## [Ver 9.5.8] - 2026-09-18
### Fixed
- **Data Loss Root Cause Analysis:** Memperbaiki celah logika migrasi database. Pada versi sebelumnya, sistem mengganti nama file ke `local_db_accounts.json` namun gagal menyalin data dari `db_accounts.json` lama jika file tersebut ada, menyebabkan server secara otomatis membuat data kosong dan menimpa isi sebelumnya. Menambahkan logika *Fallback Auto-Migration* yang secara cerdas akan menyalin data lama jika file *local_db* masih kosong atau baru terbentuk.


## [Ver 9.5.7] - 2026-09-17
### Added
- **Dynamic Addon Configuration:** Menambahkan Modal Konfigurasi interaktif pada Marketplace UI. Modul kini dapat dikonfigurasi parameternya secara langsung lewat antarmuka tanpa perlu mengedit file config.json secara manual.
- **Clean Deletion Logic:** Memperbarui proses penghapusan Addon. Menekan tombol Hapus kini akan secara otomatis menghentikan proses PM2 milik Addon terkait dan menghapus folder atau direktori instalasinya di server secara bersih.


## [Ver 9.5.6] - 2026-09-17
### Fixed
- **Addons Database Persistence:** Memperbaiki masalah hilangnya daftar *Addons* (termasuk *Addon* bawaan AI YOLO) saat halaman dimuat ulang. Modul `addons` kini memiliki file isolasi tersendiri (`local_db_addons.json`) di dalam *Split DB* dan di-*load* dengan benar oleh API NVR.
- **Git-Pull Wipe Bug (Auto-Migration DB):** Mengubah *file naming convention* arsitektur database. Seluruh modul *Split DB* (settings, accounts, cameras, recordings, logs, addons) kini menggunakan prefiks `local_` (misalnya `local_db_accounts.json`). Prefiks ini secara ketat dimasukkan ke dalam daftar blokir `.gitignore`. Hal ini secara permanen melindungi data Administrator dan pengaturan klien dari risiko tertimpa (terhapus) file kosong bawaan repositori saat mengeksekusi `git pull`.

## [Ver 9.5.5] - 2026-09-17
### Added
- **Marketplace Addons UI Dashboard:** Mengganti tampilan statis 'Coming Soon' pada menu *Addons Marketplace* dengan *dashboard* tabel fungsional berbasis *CRUD (Create, Read, Update, Delete)*, menampilkan nama Addons, versi, status aktif/nonaktif, deskripsi fungsional, dan tombol konfigurasi.

<truncated 23 bytes>
: 1`) secara penuh.

## [Ver 9.3.8] - 2026-09-16
### Changed
- **UI/UX Cleanup (Superadmin):** Memperbaiki masalah tata letak antarmuka (UI) Superadmin yang berantakan (*squished*/terpotong) saat dibuka dalam mode *landscape* (mendatar) di ponsel/tablet. Menghapus dekorasi yang "berlebih-lebihan" (warna *background* pelangi, *border* tebal, dan *padding* yang terlalu memakan ruang) sehingga tampilan menjadi bersih, profesional, dan seragam dengan halaman utama.

## [Ver 9.3.7] - 2026-09-16
### Fixed
- **Timezone Artifact Cleanup:** Memperbaiki dan menambal sisa data akun yang tercatat menggunakan `Z` (UTC) akibat regresi pada versi 9.3.4. Saat server dinyalakan ulang, sistem akan secara otomatis memindai seluruh file JSON dan mengonversi waktu lama (Z) tersebut ke dalam format waktu lokal secara mandiri.

## [Ver 9.3.6] - 2026-09-16
### Fixed
- **Maximum Call Stack Size Exceeded (Crash Loop):** Memperbaiki bug kritis *infinite recursion* pada fungsi `getLocalTimeString()` yang menyebabkan server `node server.js` mogok saat *startup*. Server sekarang berjalan stabil.

## [Ver 9.3.5] - 2026-09-16
### Fixed
- **Timezone Regression:** Memperbaiki masalah regresi di mana waktu pembuatan akun (`createdAt`), log sistem, dan *timestamp* rekaman kembali menggunakan format zona waktu dasar (UTC/Z) alih-alih waktu lokal (misal: WIB) di dalam STB. Sistem kini secara otomatis menghitung *offset* lokal dari OS Armbian (menghasilkan format seperti `+07:00`) untuk seluruh pencatatan waktu.

## [Ver 9.3.4] - 2026-09-16
### Fixed
- **Git Pull Migration Loop Bug:** Memperbaiki bug kritis di mana mengeksekusi `git pull` menyebabkan sistem membaca *dummy file* `nvr_db.json` bawaan Github, yang memicu *false migration* (migrasi ulang) dan menimpa `db_accounts.json` (database asli) dengan tabel kosong. Kini sistem mengabaikan `nvr_db.json` sepenuhnya jika file Split-DB sudah tercipta.

## [Ver 9.3.3] - 2026-09-16
### Fixed
- **UI State Sync:** Memperbaiki bug di mana `sysGlobalStorageMode` dan konfigurasi penyimpanan lainnya pada antarmuka *frontend* selalu mereset tampilan menjadi "Mati/Nonaktif" saat halaman direfresh (meskipun data di `db_settings.json` sudah tersimpan aktif).

## [Ver 9.3.2] - 2026-09-16
### Fixed
- **Revert Over-Engineered License Logic:** Menghapus logika *Hardware-OS Binding* (`/etc/.arch3r_hw_bind.dat`) yang ditambahkan secara prematur. Mengembalikan sistem sepenuhnya ke skema validasi lisensi offline/online `keygen.js` yang sudah disepakati dan terbukti aman, sesuai arsitektur awal klien.

## [Ver 9.3.1] - 2026-09-16
### Added
- **Hardware-Level Binding (Anti-Piracy V2):** Menambahkan proteksi kloning OS. Lisensi sekarang diikat (hashed) secara fisik dengan MAC Address STB dan disimpan secara rahasia di luar folder Node.js (`/etc/.arch3r_hw_bind.dat`). Jika SD Card STB dikloning ke STB lain, aplikasi akan langsung mendeteksi `Hardware UUID Mismatch` dan mengunci (lockdown) sistem secara otomatis.

## [Ver 9.3.0] - 2026-09-16
### Added
- **Database Architecture Redesign (Split-DB):** Merombak total struktur penyimpanan database untuk mencegah korupsi massal. File `nvr_db.json` lama kini dipecah menjadi modul-modul independen yang terisolasi secara fisik:
  - `db_accounts.json` (Kredensial, Administrator, User)
  - `db_cameras.json` (Data Kamera & RTSP)
  - `db_recordings.json` (Daftar File Rekaman)
  - `db_logs.json` (Sistem Log - penyebab utama bloating)
  - `db_settings.json` (Konfigurasi Global NVR)
- **Auto-Migration:** Menambahkan mekanisme perpindahan (migrasi) otomatis dari format Monolitik (lama) ke format Split-DB tanpa campur tangan pengguna.

## [Ver 9.2.17] - 2026-09-16
### Fixed
- **Memory State Sync:** Menambahkan *diagnostic trigger* `[RELOAD_DB_CACHE]` pada endpoint login untuk mereset `cachedDb` dari memori. Ini memperbaiki masalah di mana STB menggunakan *in-memory array* yang kosong meskipun file `nvr_db.json` fisik sudah direstore secara manual atau memiliki isi.

## [Ver 9.2.16] - 2026-09-16
### Fixed
- **Process Identification:** Menambahkan deteksi konflik dan identifikasi proses NVR vs layanan CCTV pihak ketiga (seperti Shinobi) pada PM2 untuk mencegah kesalahan manipulasi direktori data.

## [Ver 9.2.15] - 2026-09-16
### Fixed
- **PM2 Environment Guide:** Memperbaiki instruksi troubleshooting PM2 untuk memastikan command dijalankan pada ID/Nama proses yang tepat, bukan menggunakan alias 'all' yang invalid pada perintah `describe`.

## [Ver 9.2.14] - 2026-09-16
### Changed
- **Git Protection:** Menambahkan instruksi dan perintah proteksi repositori lokal untuk memastikan `data/nvr_db.json` diabaikan dari pembaruan `git pull` di masa mendatang.
- **Login Fallback:** Memastikan kredensial default superadmin dapat selalu digunakan jika database tiba-tiba kosong akibat kesalahan sinkronisasi sistem.

## [Ver 9.2.13] - 2026-09-16
### Fixed
- **Database & Data Loss Prevention:** Menutup celah di mana data administrator dan kamera hilang tertimpa file `nvr_db.json` kosong saat melakukan `git pull`. Sistem kini secara cerdas akan langsung memulihkan (restore) data dari `nvr_db_safe_backup.json` jika mendeteksi anomali pada file utama.
- **Strict License Validation:** Memperbaiki logika backend di form aktivasi. Sebelumnya sistem mengizinkan penyimpanan lisensi palsu/acak dan memberikan alert sukses. Sekarang backend menolak secara keras (hard reject) setiap upaya input lisensi yang formatnya tidak valid atau segel HMAC-nya korup.

## [Ver 9.2.12] - 2026-09-16
### Fixed
- **Licensing Core & Validation:** Memperbaiki sistem validasi lisensi STB agar mendukung berbagai format Machine ID (12-karakter MD5 hash dari web UI, maupun MAC Address fisik dengan/tanpa titik dua di Linux Armbian).
- **Multi-Interface Resilience:** Sistem validasi kini memeriksa seluruh interface jaringan fisik (`eth0`, `wlan0`) sehingga STB yang berpindah antara kabel LAN dan WiFi tetap memiliki lisensi yang valid.
- **Normalization:** Validasi email kini dibuat *case-insensitive* dan di-trim otomatis agar terhindar dari kegagalan aktivasi akibat perbedaan huruf kapital atau spasi di akhir teks.
- **UI & UX Feedback:** Menambahkan tombol *Salin ID* (One-Click Copy) di samping Machine ID Unik pada dashboard Superadmin, serta menampilkan pesan alasan penolakan lisensi secara eksplisit di kotak status dan dialog aktivasi (mengakhiri masalah kegagalan lisensi tanpa keterangan / silent failure).
- **Keygen Tooling:** Pembaruan skrip generator lisensi `keygen.js` dengan petunjuk pemakaian parameter yang presisi.

## [Ver 9.2.6] - 2026-09-15
### Added
- **Production Build System:** Penambahan kapabilitas kompilasi executable binary untuk target ARM64 (STB Armbian) dan x64 menggunakan `bun build` demi keamanan *source code* (anti-tampering).
### Fixed
- **Security & Licensing:** Menutup celah kritis *Trial Bypass*. Marker masa percobaan 30 hari kini ditanam secara aman di level OS (Hidden Marker: `/var/tmp/.arch3r_nvr_sys_core/.sys_marker`) sehingga kebal terhadap trik penghapusan atau *reset* file database JSON lokal.
- **UI/UX:** Pembersihan elemen mockup (Demo Akun) pada halaman login untuk standar tampilan kelas produksi komersial.

## [Ver 9.0.2] - 2026-09-15
### Added
- **Build System:** Menambahkan script kompilasi `bun build` di `package.json` untuk membungkus `server.js` menjadi file Binary Executable (`archer-nvr-arm64` dan `archer-nvr-x64`) demi mencegah klien membajak logika lisensi. 
### Fixed
- **Security:** Menutup celah *Trial Bypass*. Tanggal `install_date` kini disimpan sebagai *Hidden OS Marker* (`/var/tmp/.arch3r_nvr_sys_core/.sys_marker` di Linux) bukan lagi di `nvr_db.json`. Ini mencegah user me-reset trial 30 hari dengan cara menghapus folder `data/`.

## [Ver 9.0.1] - 2026-09-15
### Changed
- **UI:** Menghapus info "Uji Coba Cepat Multi-Tenant (Klik Akun)" dan daftar akun demo dari halaman login (`public/index.html`) untuk membuat tampilan login lebih minimalis.
- **Config:** Menyesuaikan file `.gitignore` untuk pengaturan pengecualian file yang bersifat rahasia dan dinamis (seperti `cameras.json`, `settings.json`, dll).
- **Versioning:** Memperbarui versi aplikasi ke `9.0.1` di `package.json` dan API `/api/health` di `server.js`.
- **System:** Pembuatan dan penyesuaian file `AGENTS.md` untuk mengunci protokol anti-regresi.
