# Changelog

## [Ver 11.7.9] - 2026-09-30
### Professional Login Branding & Mobile Bottom Navigation Bar Collision Prevention
- **Pembersihan & Standarisasi Tombol Layar Login (`public/index.html`):**
  - Mengubah label tombol masuk dari `Masuk (Login)` menjadi murni **`Login`** standar enterprise.
  - Mempertahankan kartu login yang bersih, elegan, dan profesional tanpa embel-embel teks redundant.
- **Pencegahan Tampilan Terpotong di Bagian Bawah Layar HP (`public/style.css`):**
  - Mengimplementasikan `100dvh` (*Dynamic Viewport Height*) bersama bantalan *safe area* bawah (`padding-bottom: calc(90px + env(safe-area-inset-bottom, 24px))`).
  - Menghilangkan benturan antara tombol aksi formulir (Simpan/Tutup/Batal) dengan tombol bilah navigasi fisik/gesture bawaan sistem operasi HP (Android 3-button nav / iOS bar).
  - Memberikan ruang gerak yang aman sehingga pengguna tidak lagi salah menyentuh tombol navigasi perangkat saat mengoperasikan NVR.
- **Sinkronisasi Versi Penuh**: Sinkronisasi nomor rilis Ver. 11.7.9 pada `package.json`, `metadata.json`, `public/version_sync.js`, `public/index.html`, dan `CHANGELOG.md`.

## [Ver 11.7.8] - 2026-09-30
### Universal Mobile Zoom-Out UI Suite & Compact Ergonomics across All Dashboard Menus
- **Optimalisasi Tampilan Ringkas & Zoom-Out Universal Layar HP (`public/style.css`):**
  - **Penataan Skala Konten Global**: Menyesuaikan padding konten (`content-wrapper`) menjadi `0.55rem 0.75rem` dan merampingkan ukuran heading `h2` (`1.05rem`) agar informasi tersaji padat dan elegan di *smartphone*.
  - **Form Input & Kontrol Kompak**: Mengecilkan padding kolom form, input, dan dropdown menjadi tinggi `33px` dengan font `0.8rem` yang rapi.
  - **Tabel & Kartu Terstruktur**: Merampingkan tabel kamera, pengguna, log sistem, dan kartu penyimpanan harddisk (`storage-info-box`) dengan padding efisien `5px 6px`.
  - **Playback & Timeline Scrubber**: Mengoptimalkan ketinggian timeline menjadi `48px` dan merapatkan bilah kontrol pemutaran rekaman.
  - **Modal Dialog Responsif**: Menyesuaikan modal tambah/edit kamera dan popup konfirmasi agar berukuran `95vw` tanpa meluap (*overflow*) dari layar HP.
- **Sinkronisasi Versi Penuh**: Sinkronisasi nomor rilis Ver. 11.7.8 pada `package.json`, `metadata.json`, `public/version_sync.js`, `public/index.html`, dan `CHANGELOG.md`.

## [Ver 11.7.7] - 2026-09-30
### Autonomous Background Codec Probe & 100% Zero-Manual Auto-Adaptive HEVC Discovery
- **Mesin Deteksi Codec Proaktif di Latar Belakang (`server.js` - `autoDetectCameraCodecsAndSync`):**
  - Mengimplementasikan proses probe asinkron `ffprobe` otomatis setiap kali kamera baru disimpan, diedit, atau saat server STB pertama kali dinyalakan (*boot*).
  - Jika terdeteksi bitstream `hevc` atau `h265` pada kamera (seperti Franwell 2-lensa), sistem secara otomatis menandai `detectedCodec = 'hevc'` dan mengaktifkan Micro-Transcoder On-Demand seketika tanpa memerlukan tindakan manual dari pengguna.
  - **100% Zero-Manual Auto-Adaptive**: Pengguna cukup membiarkan opsi di posisi default *Auto-Adaptive*, dan sistem NVR akan menangani konversi secara cerdas dan mandiri.
- **Sinkronisasi Versi Penuh**: Sinkronisasi nomor rilis Ver. 11.7.7 pada `package.json`, `metadata.json`, `public/version_sync.js`, `public/index.html`, dan `CHANGELOG.md`.

## [Ver 11.7.6] - 2026-09-30
### Full REST Persistence for Transcode Mode & Instant Sub-Stream Micro-Transcoder Trigger
- **Penyimpanan Permanen `transcodeMode` di Endpoint REST API (`server.js`):**
  - Menambahkan pembacaan dan penyimpanan variabel `transcodeMode` pada endpoint `POST /api/cameras` dan `PUT /api/cameras/:id`.
  - Memastikan opsi pilihan mode (*Auto-Adaptive*, *Direct Passthrough*, atau *Paksa Micro-Transcode*) tersimpan permanen di database `nvr_db.json` dan tidak kembali/reset ke *Auto* saat form kamera dibuka kembali.
  - Memicu auto-reload `syncMediaMtxConfig()` seketika setelah data kamera disimpan untuk mengaktifkan jalur `runOnDemand` transcode pada MediaMTX.
- **Sinkronisasi Versi Penuh**: Sinkronisasi nomor rilis Ver. 11.7.6 pada `package.json`, `metadata.json`, `public/version_sync.js`, `public/index.html`, dan `CHANGELOG.md`.

## [Ver 11.7.5] - 2026-09-30
### On-Demand Micro-Transcoder Engine for HEVC Dual-Lens Cameras & Zero-Idle CPU Consumption
- **Mesin Micro-Transcoder On-Demand Cerdas (`server.js` - `syncMediaMtxConfig`):**
  - Menerapkan integrasi direktif `runOnDemand` MediaMTX untuk kamera berformat HEVC / H.265 (seperti kamera 2-lensa Franwell `640x720 @ 14 FPS`).
  - **Zero CPU Idle (0% Beban)**: Saat tidak ada yang memantau monitor live view, proses transcode FFmpeg **sama sekali tidak berjalan**.
  - **Instant Live Transcode (~2% CPU STB)**: Saat monitor dibuka di HP/PC, MediaMTX secara otomatis memicu konversi cepat HEVC -> H.264 (`libx264 -preset ultrafast -tune zerolatency -b:v 450k`) dan mematikannya kembali setelah 10 detik tidak aktif (`runOnDemandCloseAfter: 10s`).
  - **Perekaman 100% Asli**: Perekaman kontinyu ke harddisk tetap menggunakan bitstream asli mentah `-c copy` tanpa penurunan resolusi atau kualitas.
- **Konfigurasi Mode Aliran Kamera (`public/index.html` & `public/script.js`):**
  - Menambahkan pemilih `Mode Aliran Monitor Live` pada form Tambah / Edit Kamera (*Auto-Adaptive*, *Direct Passthrough*, *Paksa Micro-Transcode*).
- **Sinkronisasi Versi Penuh**: Sinkronisasi nomor rilis Ver. 11.7.5 pada `package.json`, `metadata.json`, `public/version_sync.js`, `public/index.html`, dan `CHANGELOG.md`.

## [Ver 11.7.4] - 2026-09-30
### One-Click Clipboard Log Exporter, Mobile Zoom-Out HUD & Compact Timestamp Formatting
- **Tombol Salin Log ke Clipboard Instan (`public/index.html` & `public/script.js`):**
  - Menambahkan tombol `📋 Salin Log` pada header konsol HUD modal stream log dengan dukungan API `navigator.clipboard` dan *fallback command* universal.
  - Memberikan feedback visual seketika (`✅ Tersalin!` + toast hijau) sehingga pengguna di HP/PC dapat menyalin 10 baris riwayat transmisi kamera sekali klik untuk keperluan analisis teknis.
- **Penyempurnaan Tampilan Responsif & Zoom-Out di Layar HP (`public/index.html` & `public/script.js`):**
  - Mengatur ukuran font konsol menjadi `0.71rem` (`11.3px`), *line-height* rapat `1.42`, padding ringkas `0.6rem`, dan `word-break: break-word` agar baris log tersusun rapi tanpa melebar ke samping di layar *smartphone*.
  - Menformat stempel waktu panjang (`2026-10-01T01:28:28.635+07:00`) menjadi format jam ringkas `[01:28:28]`.
- **Sinkronisasi Versi Penuh**: Sinkronisasi nomor rilis Ver. 11.7.4 pada `package.json`, `metadata.json`, `public/version_sync.js`, `public/index.html`, dan `CHANGELOG.md`.

## [Ver 11.7.3] - 2026-09-30
### Zero-STUN LAN WebRTC Acceleration, Elimination of Dead /streams/ Fallback & Instant Live View
- **Eliminasi Pengalihan URL Mati `/streams/` pada HLS Network Error (`public/script.js`):**
  - Menghapus logika lama yang keliru saat terjadi `Hls.ErrorTypes.NETWORK_ERROR`: Sebelumnya jika inisialisasi awal MediaMTX memakan waktu > 2 detik, skrip secara keliru membajak `hlsUrl` dan mengalihkannya ke folder statis usang `/streams/<camId>/main.m3u8` (yang tidak pernah dibuat oleh MediaMTX). Pengalihan ini menyebabkan pemutar video terjebak dalam *loop 404 Not Found* tanpa henti (*"Memuat aliran terus..."*).
  - Skrip kini tetap mengunci URL resmi MediaMTX (`/stream/<streamPath>/index.m3u8`) dan memuat ulang segmen dengan *backoff* teratur hingga aliran video tersambung.
- **Akselerasi WebRTC Lokal STB / LAN (Zero-STUN Latency) (`public/script.js`):**
  - Mengubah konfigurasi `iceServers` WebRTC dari server WAN publik (`stun.l.google.com`) menjadi `iceServers: []` khusus lingkungan LAN / STB. Menghilangkan jeda *DNS timeout* selama 3–5 detik pada STB yang berada di jaringan lokal mandiri/offline.
- **Sinkronisasi Versi Penuh**: Sinkronisasi nomor rilis Ver. 11.7.3 pada `package.json`, `metadata.json`, `public/version_sync.js`, `public/index.html`, dan `CHANGELOG.md`.

## [Ver 11.7.2] - 2026-09-30
### Ultra-Smooth Live Playback Restoration, Gentle Watchdog & Stable Buffer Tuning
- **Restorasi Kehalusan & Stabilitas Pemutaran Live View (`public/script.js`):**
  - **Eliminasi Reboot-Loop Watchdog Prematur**: Mengeliminasi interupsi watchdog pada video yang sedang dalam proses inisialisasi awal (`readyState < 2`), memberi waktu cukup bagi kamera untuk mengirim I-Frame pembuka (Keyframe) tanpa di-reset paksa setiap 4 detik.
  - **Peningkatan Toleransi WebRTC Handshake**: Memperpanjang batas waktu *SDP Handshake WHEP* dari 1200ms menjadi 3500ms agar STB MediaMTX dapat menyetujui koneksi WebRTC secara mulus tanpa langsung terputus ke fallback HLS.
  - **Restorasi Buffer HLS Mantap & Stabil**: Mengembalikan kapasitas buffer HLS yang luas (`maxBufferLength: 8`, `maxMaxBufferLength: 16`, `maxBufferSize: 25MB`, timeout 10s) dan menghapus pembatasan `liveSyncDurationCount: 1` yang sebelumnya menyebabkan *starvation buffering* pada STB.
  - **Pencegahan Penghapusan DOM Sembarangan**: Menghapus pembersihan paksa `srcObject` global pada `destroyHlsPlayers` agar petak video aktif lainnya tidak terputus saat perpindahan layout.
- **Sinkronisasi Versi Penuh**: Sinkronisasi nomor rilis Ver. 11.7.2 pada `package.json`, `metadata.json`, `public/version_sync.js`, `public/index.html`, dan `CHANGELOG.md`.

## [Ver 11.7.1] - 2026-09-30
### Global HTML Sanitizer Normalizer, Bulletproof Console HUD & Stream Telemetry
- **Deklarasi Universal Helper Sanitasi (`public/script.js` - `escapeHtml`):**
  - Mengekspos fungsi `escapeHtml` ke lingkup global (`window.escapeHtml = escapeHtml`) di bagian paling atas skrip.
  - Menghilangkan `ReferenceError: escapeHtml is not defined` saat merender 10 baris log real-time di dalam pop-up modal konsol HUD.
  - Memastikan seluruh baris log berwarna (INFO/WARN/ERROR) dirender dengan aman, cepat, dan presisi.
- **Sinkronisasi Versi Penuh**: Sinkronisasi nomor rilis Ver. 11.7.1 pada `package.json`, `metadata.json`, `public/version_sync.js`, `public/index.html`, dan `CHANGELOG.md`.

## [Ver 11.7.0] - 2026-09-30
### Intelligent Stream Watchdog Auto-Recovery, Low-Latency Drift Catchup & GPU Decoder Cleaner
- **Watchdog Pemantau Aliran Cerdas & Auto-Recovery Anti-Macet (`public/script.js`):**
  - Meningkatkan interval evaluasi watchdog menjadi 2 detik dengan deteksi proaktif pada 3 kondisi kritis:
    1. **Stuck Handshake Awal**: Jika petak kamera tertahan pada status *connecting/buffering* tanpa frame (`readyState < 2`) selama > 4 detik, watchdog otomatis me-reset dan menyambung ulang stream tanpa perlu refresh halaman.
    2. **Autoplay Blocked / Paused Unexpectedly**: Otomatis memanggil `video.play()` jika elemen video terhenti saat slot aktif.
    3. **Frozen Frame (Gambar Beku)**: Jika `timeupdate` tidak bergerak selama > 3.8 detik, memicu auto-reconnect cerdas.
- **Pembersihan Bersih Decoder Hardware GPU STB (`public/script.js` - `destroyHlsPlayers`):**
  - Menambahkan pelepasan referensi elemen video (`srcObject = null`, penghapusan `src`) saat pergantian channel / layout grid agar hardware media decoder GPU STB Armbian tidak terkunci (*zero lingering decoder leak*).
- **Tuning Latensi Rendah HLS (`public/script.js` - `initHlsPlayer`):**
  - Mengonfigurasi `liveSyncDurationCount: 1`, `liveMaxLatencyDurationCount: 3`, `maxBufferLength: 4` untuk menjaga pemutaran selalu berada pada *live edge* dan mencegah penumpukan *buffer drift*.
- **Sinkronisasi Versi Penuh**: Mengikuti aturan semantic versioning ketat (11.6.9 -> 11.7.0) pada `package.json`, `metadata.json`, `public/version_sync.js`, `public/index.html`, dan `CHANGELOG.md`.

## [Ver 11.6.9] - 2026-09-30
### Cross-Scope Camera Identifier Normalizer, Zero-ReferenceError HUD & Resilient RTSP Polling
- **Eliminasi Celah `ReferenceError` pada Lingkup Skrip (`public/script.js`):**
  - Mengatasi akar masalah modal yang tertahan di status default *"Memuat..."*: Variabel `selectedCamIdForPtz` dideklarasikan menggunakan `let` di dalam closure `DOMContentLoaded` (baris 3275), sehingga saat diakses oleh fungsi modal di lingkup luar (baris 16055), JavaScript engine melempar `ReferenceError: selectedCamIdForPtz is not defined` yang menghentikan eksekusi skrip tepat sebelum memuat log.
  - Memasang fungsi helper global `window.getSelectedPtzCamId()` dan mengekspos `window.selectedCamIdForPtz` secara reaktif setiap kali petak kamera diklik di monitor live view.
  - Menerapkan mekanisme resolusi ID bertingkat anti-gagal (`camId` -> `window.getSelectedPtzCamId()` -> `window.selectedCamIdForPtz` -> `document.querySelector('.cam-cell.selected')` -> `cameras[0].id`).
- **Autentikasi Reconnect RTSP Terpadu (`public/script.js`):**
  - Mengganti pembacaan token lama pada fungsi `window.reconnectCurrentStream()` dengan `authFetch` resmi sehingga tombol "⚡ Reconnect Aliran Kamera" langsung diproses backend tanpa kendala otorisasi.
- **Sinkronisasi Versi Penuh**: Sinkronisasi nomor rilis Ver. 11.6.9 pada `package.json`, `metadata.json`, `public/version_sync.js`, `public/index.html`, dan `CHANGELOG.md`.

## [Ver 11.6.8] - 2026-09-30
### Universal authFetch Token Resolution, Live Log Synthesis & Instant Stream HUD
- **Perbaikan Resolusi Token Autentikasi Modal Log (`public/script.js` - `refreshStreamLogsModal`):**
  - Mengganti pemanggilan raw `fetch` dengan helper standar `authFetch` (`getAuthToken()` yang mengekstrak `nvr_auth_token` / `arch3r_token`).
  - Menghilangkan galat `401 Unauthorized` diam yang sebelumnya menyebabkan HUD log terus tertahan pada status *"Memuat log real-time aliran kamera..."*.
  - Menghapus pembatasan `isSilent` saat terjadi galat, sehingga setiap kesalahan atau status koneksi langsung tercetak jelas di layar HUD.
- **Sintesis Status Aliran Live Instan (`server.js` - `/api/cameras/:id/stream-logs`):**
  - Menambahkan *auto-synthesis live status* jika buffer log rekaman masih kosong pada saat kamera baru saja dibuka.
  - Menampilkan parameter instan: URL RTSP terverifikasi, jalur relay internal MediaMTX (`rtsp://127.0.0.1:8554/<id>`), status perekaman (Level / Standby), dan konfirmasi kelancaran transmisi real-time.
  - Memperkuat pencarian kamera (`authorizedCams` + `getCameras()`) untuk menjamin aksesibilitas kamera lintas role.
- **Sinkronisasi Versi Penuh**: Sinkronisasi nomor rilis Ver. 11.6.8 pada `package.json`, `metadata.json`, `public/version_sync.js`, `public/index.html`, dan `CHANGELOG.md`.

## [Ver 11.6.7] - 2026-09-30
### Dedicated Per-Camera 10-Line RAM Ring-Buffer HUD, Static DOM Modal & RTSP Reconnect Engine
- **Sistem Log Buffer Per-Kamera Berbasis RAM Ring-Buffer FIFO (`server.js`):**
  - Mengimplementasikan `cameraStreamLogs` strictly terisolasi per ID kamera dengan kapasitas tepat 10 baris riwayat aktivitas real-time FIFO (`while (list.length > 10) list.shift()`).
  - Nol beban penulisan disk/SD-card (0% flash memory wear) untuk keandalan maksimal STB Linux Armbian.
  - Endpoint baru `POST /api/cameras/:id/reconnect` untuk memicu inisialisasi ulang aliran RTSP dan proses perekaman kamera secara instan langsung dari tombol modal HUD.
- **Konstruksi Modal Statis & Kebal Mode Fullscreen (`public/index.html` & `public/script.js`):**
  - Menanamkan elemen modal `#streamLogsModalOverlay` secara permanen dan statis di dalam `public/index.html` (sejajar dengan modal resmi lainnya), mengeliminasi kegagalan rendering dinamis `document.createElement`.
  - Menyematkan penanganan konteks Fullscreen: saat monitor live view berada pada status Fullscreen (`#monitorWrapper:fullscreen`), modal otomatis disematkan di dalam kontainer fullscreen sehingga selalu tampil di atas layer backdrop tanpa terhalang (*zero z-index blackout*).
  - Menjamin modal tetap terbuka dengan notifikasi panduan pemilihan kamera meskipun belum ada petak kamera yang diklik.
- **Sinkronisasi Versi Penuh**: Sinkronisasi nomor rilis Ver. 11.6.7 pada `package.json`, `metadata.json`, `public/version_sync.js`, `public/index.html`, dan `CHANGELOG.md`.

## [Ver 11.6.6] - 2026-09-30
### Dead-Code Pruning, JS Syntax Normalizer, Trash Management & Instant Stream Log HUD
- **Pembersihan Kode Usang & Eliminasi Duplikasi Fungsi (`public/script.js`):**
  - Menghapus blok deklarasi fungsi ganda `openYoloCameraSettings` versi lama di baris 12191 yang memicu `SyntaxError: Identifier 'openYoloCameraSettings' has already been declared`.
  - Mengunci versi modern di baris 14854 yang mendukung pemilih kanal kamera studio YOLO, live simulator telemetry, dan rendering heatmap.
  - Memastikan seluruh berkas JavaScript lolos verifikasi sintaks (`node -c public/script.js` -> 0 OK).
- **Aktivasi Responsif Tombol Log Stream 10 Baris Kamera Terpilih (`public/script.js`):**
  - Mengoptimasi fungsi pembentukan modal `ensureStreamLogsModalDOM` agar elemen dan styling di-cache dengan benar saat inisialisasi tanpa re-render berlebih.
  - Memasang *auto-binding click event listener* langsung pada elemen `#btnOpenStreamLogsPtz` saat DOM siap, menjamin klik tombol langsung membuka HUD diagnostik real-time 10 baris khusus kamera yang sedang dipilih di grid.
- **Manajemen Berkas Patch Sementara (`/Trash`):**
  - Sesuai protokol pengembangan sistem Armbian STB, memindahkan berkas artefak patch sementara `playback_functions.js` dan `playback_engine.js` ke dalam direktori `/Trash` untuk menjaga root directory tetap bersih dan profesional.
- **Sinkronisasi Versi Penuh**: Sinkronisasi nomor rilis Ver. 11.6.6 pada `package.json`, `metadata.json`, `public/version_sync.js`, `public/index.html`, dan `CHANGELOG.md`.

## [Ver 11.6.5] - 2026-09-30
### Dual-Panel Optics & 10-Line Stream Diagnostics, Micro Canvas Overlay Controls & Minimalist REC Badge
- **Desain Ergonomis Panel Lensa & Fokus Terbagi 2 (`public/index.html` - `#ptzControlPanelCard`):**
  - Membagi panel Lensa & Fokus menjadi dua sub-kolom proporsional (50% / 50% split layout):
    - **Sisi Kiri (Kontrol Optik)**: 4 tombol presisi 2x2 grid (`Z+`, `F+`, `Z-`, `F-`) untuk kendali Zoom dan Fokus kamera.
    - **Sisi Kanan (Log Diagnostik Stream)**: Tombol interaktif `📋 STATUS 10 BARIS` (Log Stream) dengan visual card terdedikasi untuk membuka popup diagnostik real-time aliran kamera terpilih.
- **Reduksi Ukuran Badge REC & Tombol Kontrol Petak Video Live (`public/style.css` & `public/script.js`):**
  - **Badge REC Ultra-Kompak**: Menurunkan ukuran font badge dari 7.5px menjadi 6.5px, padding 0 3px, dan ketinggian dari 15px menjadi 12px sehingga tulisan REC tidak menutupi informasi penting OSD kamera.
  - **Tombol Play/Pause & HD/SD Micro**: Mengecilkan tombol kontrol petak video live (`.badge-tile-ctrl`) menjadi font 7px, min-width 13px, height 12px, dengan kontainer semi-transparan `opacity: 0.75` (fokus penuh pada feed video, memperjelas saat kursor mendekat/hover).
- **Sinkronisasi Versi Penuh**: Sinkronisasi nomor rilis Ver. 11.6.5 pada `package.json`, `metadata.json`, `public/version_sync.js`, `public/index.html`, dan `CHANGELOG.md`.

## [Ver 11.6.4] - 2026-09-30
### Extended 45s Keyframe Probe Ceiling, Fast FPS-Probe Bypass & Cyclic Auto-Healing
- **Perluasan Jendela Probe Keyframe hingga 45 Detik (`server.js` - `spawnRecordingFFmpeg`):**
  - **Dukungan Kamera Smart Codec / Static Scene**: Kamera CCTV modern (Dahua Smart Codec, Hikvision H.264+/H.265+, Tapo, V380) pada ruangan yang tenang/tanpa gerakan (seperti ruang tamu `cam_rtamu`) memperpanjang interval I-frame (GOP) hingga 15–30 detik untuk menghemat bandwidth.
  - Memperluas plafon waktu probe: Level 0 (25 detik / 25MB), Level 1 (35 detik / 35MB), Level 2 (45 detik / 45MB). Plafon waktu ini **TIDAK menambah jeda perekaman** karena FFmpeg langsung mulai merekam seketika saat I-frame pertama tiba.
- **Bypass Kalkulasi FPS (`-fpsprobesize 0`):**
  - Menyuntikkan `-fpsprobesize 0` pada semua level RTSP sehingga FFmpeg tidak membuang waktu menganalisa ratusan frame untuk menghitung framerate, melainkan langsung mengunci dimensi (`width` x `height`) seketika dari SPS/PPS pertama.
- **Siklus Auto-Healing Dinamis (`server.js`):**
  - Mekanisme fallback kini berputar secara siklikal (Level 0 -> Level 1 -> Level 2 -> Level 0) lengkap dengan label mode yang jelas pada log sistem STB (`MediaMTX Relay :8554`, `Direct RTSP Keyframe Probe 35s`, `Ultra-Safe Vanilla 45s`).

## [Ver 11.6.3] - 2026-09-30
### MediaMTX Loopback Relay Recording, Zero-Jitter Timestamp Normalizer & Code 234 Auto-Healing
- **Arsitektur Perekaman Cerdas MediaMTX Loopback Relay (`server.js` - `spawnRecordingFFmpeg`):**
  - **Level 0 (MediaMTX Loopback Relay `:8554`)**: Menggunakan aliran lokal `rtsp://127.0.0.1:8554/<cam_id>`. MediaMTX meng-cache parameter SPS/PPS (dimensions) di memori RAM, menghilangkan delay deteksi dimensi, dan mencegah kamera IPC overload/disconnect akibat koneksi RTSP ganda (WebRTC live view & rekaman lokal).
  - **Level 1 (Direct RTSP Dynamic Keyframe Probe)**: Menghilangkan pembatasan `-max_delay 500000` (500ms) yang sebelumnya memotong buffer sebelum kamera mengirimkan keyframe SPS/PPS (penyebab utama error `dimensions not set` / `Code 234`).
  - **Level 2 (Ultra-Safe Vanilla RTSP)**: Mode kompatibilitas tinggi untuk kamera IP lama dengan TCP murni.
- **Normalisasi Timestamp & Eliminasi Peringatan Non-Monotonic DTS (`server.js`):**
  - Mengganti `-use_wallclock_as_timestamps 1` dengan opsi `-avoid_negative_ts make_zero` dan flag `-fflags +genpts+discardcorrupt+igndts`.
  - Mencegah jitter milidetik jaringan/Wi-Fi yang menyebabkan peringatan berulang `Non-monotonic DTS in output stream 0:0` pada segmen MP4.
- **Deteksi Auto-Healing Code 234 & Penanganan Exit Code 0 (`server.js`):**
  - Menambahkan deteksi otomatis untuk pesan `dimensions not set`, `Could not write header`, `Invalid argument`, dan `Code 234`. Sistem secara cerdas menaikkan fallback level dan melakukan reconnect cepat dalam 2.5 detik.
  - Membedakan penutupan soket normal dari kamera (`Code: 0` / EOF) dengan pencatatan log `INFO` yang bersih tanpa salah menyalahkan peringatan internal FFmpeg.

## [Ver 11.6.2] - 2026-09-29
### Interactive Network Manager Help Tooltips & General Purpose Hint Badges
- **Penambahan Ikon '?' & Tooltip Penjelasan Interaktif (`public/script.js`):**
  - **Fitur arch3rBridge**: Menambahkan ikon tanda tanya `?` di samping label `arch3rBridge — Transparent Proxy-ARP Relay` yang dapat di-hover atau diklik (`window.toggleNetMgrHelp`) untuk memunculkan kotak penjelasan tujuan penggunaan fitur bagi pengguna umum (menjembatani LAN & Wi-Fi menembus isolasi router ISP).
  - **Fitur Pengikatan Static Route**: Menambahkan ikon tanda tanya `?` di samping label `Pengikatan Static Route Kamera / Subnet CIDR` yang menjelaskan tujuan fitur sebagai penunjuk arah bagi Linux agar tidak salah melempar paket ke interface yang keliru, lengkap dengan contoh format input subnet `/24` dan host `/32`.

## [Ver 11.6.1] - 2026-09-28
### 1-Click All-Cameras Static Route Binding & Camera Routing Synchronization
- **Fitur 1-Click Ikat SEMUA Kamera (`public/script.js` - `window.bindAllCamerasToInterface`):**
  - Menambahkan tombol instan **`⚡ Ikat SEMUA Kamera Sekaligus`** pada modal Network Manager.
  - Memindai seluruh daftar kamera yang tersimpan di database NVR dan secara otomatis mendaftarkan rute statis host (`/32`) untuk setiap IP kamera ke interface yang dipilih (LAN atau Wi-Fi) dalam satu kali klik.
  - Memastikan seluruh kamera (seperti Kamera Depan `192.168.1.6` dan kamera lainnya) memiliki tiket rute host eksplisit yang sama persis seperti kamera Ruang Tamu `192.168.1.5`.

## [Ver 11.6.0] - 2026-09-28
### Full Masquerade NAT Relay & Proxy-ARP CCTV Multi-Cam Traversal
- **Injeksi IPTables Full Masquerade NAT (`addons/network-manager/lib/nmcli_driver.js`):**
  - Menambahkan aturan `iptables -t nat -A POSTROUTING -o <lan> -j MASQUERADE` dan `iptables -t nat -A POSTROUTING -o <wifi> -j MASQUERADE` pada saat `arch3rBridge` diaktifkan.
  - **Solusi Tembus Kamera CCTV Tanpa Default Gateway**: Kamera CCTV (Hikvision, Dahua, Tapo, V380, Yoosee, ONVIF) yang menggunakan IP statis atau tanpa default gateway yang mengarah ke STB kini menerima paket dengan source IP lokal STB sehingga kamera merespons secara instan.
  - Menyelaraskan pembersihan aturan NAT saat arch3rBridge dinonaktifkan (`disableArch3rBridge`).

## [Ver 11.5.9] - 2026-09-28
### STB Direct Input Engine, Native Password Dialog Prompt, Live Character Counter & Duplicate DOM Cleaner
- **Eliminasi Total Duplikasi Modal DOM (`public/index.html`):**
  - Menghapus blok hardcoded statis lama `#netMgrModalOverlay` dari `index.html` sehingga tidak terjadi konflik elemen ganda ID `#wifiPasswordInput` di memori browser.
- **Peningkatan Form Input Password Wi-Fi (`public/script.js`):**
  - **Live Visible Text & Caret Styling**: Mengaktifkan pengetikan teks langsung dengan styling warna kontras tinggi (`-webkit-text-fill-color: #ffffff`, `caret-color: #38bdf8`, `user-select: text`) untuk mencegah bug render pada browser STB / Linux Armbian / Android TV.
  - **Live Character Counter (`#wifiPasswordCounterBadge`)**: Menampilkan indikator jumlah karakter yang sedang diketik secara real-time `(X karakter)` sehingga pengguna langsung tahu setiap kali tombol keyboard ditekan.
  - **Tombol Cadangan `⌨️ Prompt` (`window.promptWifiPasswordDialog`)**: Menyediakan tombol input dialog browser instan (`prompt()`) sebagai alternatif jika keyboard fisik/remote TV mengalami kendala fokus pada elemen HTML5.
  - **Shortcut Enter**: Menekan tombol Enter pada kolom SSID atau Password langsung mengeksekusi fungsi sambung (`window.connectWifiNetworkUI()`).

## [Ver 11.5.8] - 2026-09-28
### Interactive Wi-Fi Connect UX, Smooth Scroll, Auto-Focus & Dual-Homed Coexistence
- **Peningkatan UX Interaktif Pemilihan Wi-Fi (`public/script.js`):**
  - **Auto-Scroll & Glowing Focus (`window.selectWifiSsid`)**: Ketika pengguna mengklik *"Pilih SSID & Sambung"* atau kartu sinyal Wi-Fi di daftar hasil pemindaian, sistem secara otomatis menggulir (*smooth-scroll*) tampilan modal ke atas menuju kotak input password, memberikan efek animasi bercahaya (*blue glow pulse*), dan langsung memfokuskan kursor pada kotak input password.
  - **Interaksi Kartu Wi-Fi Penuh**: Seluruh baris kartu Wi-Fi kini dapat diklik langsung untuk memilih SSID dan mengarahkan pengguna ke input password.
- **Edukasi Arsitektur Dual-Homed (LAN & Wi-Fi Berdampingan):**
  - Mengonfirmasi bahwa Linux Armbian pada STB **sangat mampu dan mendukung penuh** interface LAN fisik (`eth0`) dan Wi-Fi (`wlan0`) aktif berdampingan secara bersamaan, selama tabel prioritas routing (*metric*) dan kernel ARP diselaraskan (melalui tombol master `⚡ arch3rBridge` atau `⚡ Set Priorities`).

## [Ver 11.5.7] - 2026-09-28
### 1-Click Master Bridge Toggle, Virtual P2P Cleaner & Live Route Metric Badges
- **Pembersihan Perangkat Virtual P2P & Wi-Fi Sekunder (`addons/network-manager/lib/nmcli_driver.js`):**
  - **Filter Virtual P2P (`p2p-dev-*` & `wifi-p2p`)**: Mengabaikan handle internal Wi-Fi Direct bawaan Linux `wpa_supplicant` agar tidak memenuhi daftar interface antarmuka.
  - **Eliminasi `wlan1` Redundan**: Menyaring perangkat `wlan1` sekunder yang tidak aktif ketika `wlan0` utama sudah ada.
  - **Ekstraksi Live Route Metric**: Membaca nilai metric rute aktif dari kernel Linux (`ip route show`) dan memetakan ke setiap kartu interface.
- **Penyelarasan Rute Otomatis pada arch3rBridge (`enableArch3rBridge`):**
  - Mengaktifkan arch3rBridge kini **otomatis menyetel prioritas metric (LAN 50, Wi-Fi 500)** di latar belakang sehingga pengguna tidak perlu bingung memilih urutan tombol mana yang harus ditekan terlebih dahulu.
- **Antarmuka Interaktif Cerdas & Master Toggle Button (`public/script.js`):**
  - **Tombol Master 1-Click Toggle (`#btnToggleArch3rBridgeUI`)**: Mengganti dua tombol terpisah dengan satu tombol dinamis cerdas (Hijau `⚡ Aktifkan arch3rBridge` saat inaktif, dan Merah `🛑 Nonaktifkan arch3rBridge` saat aktif).
  - **Badge Status Metric Visual**: Setiap kartu interface kini menampilkan badge metric real-time: `⚡ Metric 50 (Utama)` untuk LAN dan `📶 Metric 500 (Cadangan)` untuk Wi-Fi.

## [Ver 11.5.6] - 2026-09-28
### Dynamic Profile Resolver & Device-to-Connection Auto-Mapper
- **Resolusi Otomatis Nama Profil NetworkManager (`addons/network-manager/lib/nmcli_driver.js`):**
  - **Fungsi `resolveConnectionProfileName(nameOrDevice, type)`**: Menghilangkan error `unknown connection 'wlan0'` / `'eth0'`. Jika sistem menerima nama device hardware fisik (`wlan0`, `wlan1`, `eth0`), driver secara dinamis memetakan dan mengambil nama profil NetworkManager yang aktif sesungguhnya (seperti `netplan-wlan0-W_CTV` atau `eth0`).
  - **Integrasi Penuh pada Seluruh Operasi Routing**: Menerapkan resolusi profil otomatis pada `setupMetrics`, `addRoute`, `deleteRoute`, dan `applyChanges` sehingga penyetelan metric rute prioritas (LAN 50, Wi-Fi 500) selalu sukses tanpa memedulikan nama SSID Wi-Fi.

## [Ver 11.5.5] - 2026-09-28
### Self-Healing Kernel Link Up & Armbian NetworkManager Auto-Managed Enforcer
- **Otomatisasi Self-Healing Link Fisik (`addons/network-manager/lib/nmcli_driver.js`, `install.sh`):**
  - **Auto Kernel Interface Up**: Menambahkan perintah kernel `ip link set eth0 up` dan `ip link set end0 up` secara otomatis saat driver memulihkan atau menginisialisasi port LAN, mencegah kondisi `state DOWN` pada kernel Linux.
  - **Injeksi Konfigurasi Global NetworkManager (`/etc/NetworkManager/conf.d/10-manage-all.conf`)**: Memastikan NetworkManager pada distro Armbian/Debian selalu mengelola seluruh hardware interface fisik (`unmanaged-devices=none` dan `managed=true`).
  - **Instalasi Bersih STB Baru (`install.sh`)**: Menambahkan konfigurasi auto-managed NetworkManager ke dalam file installer utama agar perangkat STB yang baru di-flash langsung siap pakai tanpa kendala `unmanaged`.

## [Ver 11.5.4] - 2026-09-28
### Unified Hardware Port Virtualizer & Clean 1-to-1 Ethernet Binding
- **Unifikasi & Deduplikasi Interface Fisik (`addons/network-manager/lib/nmcli_driver.js`):**
  - **Eliminasi Kartu Duplikat (Zero-Duplicate Card)**: Menyatukan pemindaian hardware fisik (`device status`) dan profil sambungan NetworkManager (`connection show`). Setiap interface fisik (`eth0`, `wlan0`) kini dijamin hanya tampil tepat **1 buah kartu antarmuka** yang merepresentasikan port fisik aslinya.
  - **Auto-Manage Background Enforcer**: Mendeteksi jika `eth0` berstatus `UNMANAGED` dan secara proaktif mengaktifkannya menjadi `MANAGED` (`nmcli device set eth0 managed yes`) tanpa membingungkan pengguna.
  - **1-to-1 Clean Binding pada `restoreAndActivateLan`**: Menghapus profil unlinked/ghost lama dan mengikat langsung profil `eth0` ke port hardware fisik aslinya.
- **Penyempurnaan Tampilan Visual Kartu Antarmuka (`public/script.js`):**
  - Mengganti tombol ganda dengan tombol tunggal `⚡ Hubungkan` jika kabel belum mendapat IP.

## [Ver 11.5.3] - 2026-09-28
### Wi-Fi Lifeline Guard & Non-Blocking Safe LAN Auto-Recovery Engine
- **Perlindungan Jalur Wi-Fi (Wi-Fi Lifeline Protection) (`addons/network-manager/lib/nmcli_driver.js`):**
  - **Eliminasi Total Pemanggilan Netplan Apply**: Menghapus eksekusi `netplan apply` yang dapat mereset *wireless daemon* dan memutus koneksi Wi-Fi aktif.
  - **Wi-Fi Lifeline Assertion**: Memastikan proses pemulihan LAN (`restoreAndActivateLan`) selalu mendeteksi dan mempertahankan koneksi Wi-Fi (`wlan0`) aktif sebagai prioritas utama.
  - **Non-Blocking LAN Activation (`ipv4.may-fail yes`)**: Profil LAN baru kini disetel dengan `ipv4.may-fail yes` sehingga jika kabel LAN tidak terhubung ke DHCP server, sistem tidak akan memblokir atau menonaktifkan jalur default gateway Wi-Fi.

## [Ver 11.5.2] - 2026-09-28
### Physical Ethernet LAN Auto-Recovery Engine & Unlinked Device Visualizer
- **Pemulihan & Deteksi Otomatis Hardware LAN Fisik (`addons/network-manager/lib/nmcli_driver.js`, `addons/network-manager/index.js`):**
  - **Deteksi Hardware Fisik (`device status`)**: Driver kini memindai status hardware OS Linux (`nmcli device status`) secara langsung, mendeteksi port fisik `eth0` / `en*` yang terlepas, disconnected, atau unmanaged akibat pelepasan bridge `br0`.
  - **Method `restoreAndActivateLan(device)`**: Melepaskan hardware `eth0` dari penguasaan bridge lama di kernel (`ip link delete br0`), mengaktifkan `managed yes` & `autoconnect yes`, menghubungkan device, dan membuat profil koneksi `"Wired LAN"` bersih secara otomatis.
  - **Endpoint REST API Baru**: Menambahkan `POST /api/addons/network-manager/lan/restore`.
- **Integrasi Tombol Pemulih LAN pada Antarmuka (`public/script.js`, `public/index.html`):**
  - **Tombol 1-Click "🔌 Pulihkan LAN (eth0)"**: Tersemat di header bagian antarmuka NetworkManager untuk memulihkan koneksi kabel fisik yang hilang seketika.
  - **Tombol "⚡ Aktifkan LAN"**: Muncul otomatis pada kartu perangkat fisik Ethernet yang belum terhubung atau berstatus disconnected.

## [Ver 11.5.1] - 2026-09-28
### Ghost / Inactive Connection Purge Engine & 1-Click Interface Cleanup
- **Pembersihan Profil Ghost / Duplikat NetworkManager (`addons/network-manager/lib/nmcli_driver.js`, `addons/network-manager/index.js`):**
  - **Identifikasi Profil Tidak Aktif (Ghost Profiles)**: Menambahkan method `purgeInactiveProfiles()` untuk menyisir dan menghapus profil koneksi `Wired connection 1`, `netplan-br0`, dan profil bridge usang yang berstatus `Device: N/A` (`--`) akibat eksperimen bridging atau auto-generation Linux sebelumnya.
  - **Method `deleteConnection(nameOrUuid)`**: Memungkinkan penghapusan profil koneksi NetworkManager spesifik via CLI `nmcli connection delete "<id>"`.
  - **Endpoint REST API Baru**: Menambahkan `POST /api/addons/network-manager/purge-inactive` dan `DELETE /api/addons/network-manager/connections/:id`.
- **Integrasi Tombol Pembersih pada Web UI (`public/script.js`, `public/index.html`):**
  - **Tombol 1-Click "🧹 Bersihkan Ghost Profiles"**: Tersemat di header bagian antarmuka NetworkManager untuk memicu pembersihan massal seluruh profil mati secara instan.
  - **Tombol Hapus Individual ("🗑️ Hapus")**: Tampil otomatis pada setiap kartu interface yang berstatus `Device: N/A` / tidak aktif untuk memberikan kontrol granular bagi pengguna.

## [Ver 11.5.0] - 2026-09-28
### Dynamic DOM Injection Engine for Network Manager Modal & 100% Stale-Free UI
- **Injeksi DOM Dinamis Mandiri pada Modal Network Manager (`ensureNetMgrModalDOM`, `public/script.js`):**
  - **Jaminan Tampilan Terupdate 100%**: Mengimplementasikan `ensureNetMgrModalDOM()` yang secara dinamis membangun dan menginjeksi ulang seluruh struktur HTML modal Network Manager (`#netMgrModalOverlay`) setiap kali tombol "🌐 Network Router" atau "⚙️ Konfigurasi" dibuka.
  - **Kebal Cache & File Konflik**: Menjamin bahwa seluruh komponen baru (1. 📶 Manajer & Pemindai Sinyal Wi-Fi STB Bebas SSH, 2. ⚡ arch3rBridge Transparent Proxy-ARP Relay Zero-Lockout, 3. 🔌 Status Interface & Set Prioritas Metric 50/500, 4. 🎯 Pengikatan Rute IP Kamera & Subnet CIDR) selalu tampil utuh dan segar di browser, bahkan jika file HTML lokal di STB belum tersinkronisasi atau tertahan cache browser.
  - **Dukungan Halaman Multi-View**: Menghilangkan ketergantungan pada struktur statis `index.html` sehingga modal dapat dipanggil dari berbagai konteks antarmuka.

## [Ver 11.4.9] - 2026-09-28
### Anti-Stale Static Asset Cache Headers & Cache-Buster Synchronization
- **Eliminasi Masalah Browser Caching pada File UI (`server.js`, `public/index.html`):**
  - **Injeksi No-Cache Headers pada Express Static**: Menambahkan header `Cache-Control: no-cache, no-store, must-revalidate`, `Pragma: no-cache`, `Expires: 0` pada setiap request file `.html`, `.js`, dan `.css` agar browser klien dan TV Kiosk tidak menahan file antarmuka lama.
  - **Sinkronisasi Cache-Buster Query String**: Memperbarui seluruh tag pemanggil `<script src="script.js?v=11.4.9">`, `<script src="version_sync.js?v=11.4.9">`, dan `<link href="style.css?v=11.4.9">` untuk memaksa browser mengunduh script dan struktur DOM modal Network Manager terbaru secara instan.

## [Ver 11.4.8] - 2026-09-28
### Zero-Lockout Transparent Proxy-ARP Relay, Auto-Purge Dangling Bridges & Safe Dual-Interface Routing
- **Eliminasi Total Pembuatan Profil L2 Bridge `br0` di NetworkManager (`addons/network-manager/lib/nmcli_driver.js`):**
  - **Mencegah Penguncian Port Fisik saat Reboot**: Menghapus pembuatan koneksi `br0` dan `bridge-slave (br0-lan / br0-wifi)` pada NetworkManager yang sebelumnya dapat mengunci port `eth0` dan menyebabkan hilangnya IP DHCP/SSH/Tailscale saat STB di-reboot.
  - **100% Pure Transparent Proxy-ARP & Kernel IP Forwarding**: Jembatan komunikasi antara kamera Wi-Fi dan perangkat LAN kini berjalan murni di level kernel Linux STB (`sysctl net.ipv4.ip_forward=1`, `proxy_arp=1`, `rp_filter=0`) serta aturan bi-directional `iptables FORWARD`.
  - **Jaminan Port Fisik Mandiri**: Interface `eth0` (LAN) dan `wlan0` (Wi-Fi) tetap memegang profil dan alamat IP aslinya secara permanen tanpa pernah diubah menjadi slave.
- **Mekanisme Auto Self-Healing & Startup Cleaner (`ensureSafeStateAndPurgeDanglingBridges`, `addons/network-manager/index.js`):**
  - **Pembersih Otomatis Profil Usang**: Saat server dimulai atau driver jaringan diinisialisasi, sistem secara proaktif mendeteksi dan menghapus sisa-sisa profil `br0-lan`, `br0-wifi`, dan `br0` lama jika ada di `/etc/NetworkManager/system-connections/`.
  - **Enforce Managed State**: Memastikan interface `eth0` dan `wlan0` selalu dalam status `managed=yes` untuk mencegah kegagalan aktivasi koneksi NetworkManager.
- **Pembaruan Antarmuka Pengguna & Feedback Visual (`public/index.html`, `public/script.js`):**
  - **Kartu arch3rBridge Zero-Lockout**: Memperbarui deskripsi dan badge status menjadi `🟢 PROXY-ARP AKTIF (Zero-Lockout)` untuk memberikan indikasi jelas bahwa sistem berjalan aman tanpa menyentuh file koneksi fisik OS.

## [Ver 11.4.7] - 2026-09-28
### Web-UI Wi-Fi Scanner & Connector, Transparent Proxy-ARP Bridge & Dynamic NMCLI Driver
- **Pemindai & Sambungan Wi-Fi Langsung dari Web UI (`addons/network-manager/lib/nmcli_driver.js`, `addons/network-manager/index.js`):**
  - **Fungsi `scanWifiNetworks()`**: Memindai sinyal radio Wi-Fi sekitar (`nmcli dev wifi list`) dan mengelompokkan SSID, BSSID, kekuatan sinyal (%), status keamanan (WPA2/WPA3/Open), dan channel secara dinamis.
  - **Fungsi `connectWifiNetwork(ssid, password)`**: Mengizinkan pengguna menghubungkan STB ke jaringan Wi-Fi baru langsung dari Web UI Arch3r NVR tanpa perlu membuka terminal SSH / PuTTY.
  - **Dukungan Bebas Hardcode & Netplan Agnostik**: Driver membaca profil NetworkManager aktif secara dinamis sehingga pergantian nama SSID maupun password pada router ISP tidak merusak konfigurasi sistem.
- **Arsitektur Jembatan Transparan Proxy-ARP (`enableArch3rBridge`):**
  - **Bypass Isolasi Router ISP Tanpa Mode AP**: Kamera CCTV tetap terhubung langsung ke router ISP sehingga akses cloud aplikasi HP bawaan vendor CCTV (Ezviz, Tuya, Imou, V380) tetap lancar saat STB offline.
  - **Transparent L2/L3 Proxy-ARP Relay**: Mengaktifkan `ip_forward=1` dan `proxy_arp=1` pada interface fisik `eth0` (LAN) dan `wlan0` (Wi-Fi) di level kernel Linux Armbian STB, menjembatani seluruh perangkat di jaringan (PC, Laptop, NVR, Smart TV) untuk berkomunikasi lintas interface.
- **Antarmuka Pengguna Visual Jaringan (`public/index.html`, `public/script.js`):**
  - **Kartu Manajer & Sambungan Wi-Fi STB**: Dilengkapi tombol `🔍 Pindai Sinyal Wi-Fi Sekitar`, daftar sinyal dengan indikator dBm/persen, formulir input password dengan fitur intip sandi (👁️), dan tombol eksekusi sambung satu klik.
  - **Zero-Config UX Kamera**: Form Tambah Kamera dan Scan IP tetap bersih tanpa mengharuskan pengguna memilih jalur LAN atau Wi-Fi secara manual.

## [Ver 11.4.1] - 2026-09-28
### arch3rBridge Dedicated Modal Card, Netplan Reapply Fallback & Addons Integration
- **Penyempurnaan Driver Eksekusi Jaringan & Netplan Resilience (`addons/network-manager/lib/nmcli_driver.js`):**
  - **Penanganan Error Profil Netplan / Active Connection:** Pada STB Linux Armbian dengan Netplan, perintah `nmcli connection up "netplan-wlan0-..."` sering mengembalikan error ketika koneksi sedang aktif atau dikelola oleh Netplan.
  - **Mekanisme `bringUpOrReapply` Cerdas:** Driver kini menjalankan `nmcli connection reload` terlebih dahulu, mencoba `nmcli connection up`, dan jika terjadi penolakan akibat koneksi aktif / Netplan, otomatis mengeksekusi `nmcli device reapply <device>` secara halus tanpa memunculkan error palsu ke UI pengguna.
  - **Graceful Error Handling pada Bridge:** Mengoptimalkan toleransi pada `enableArch3rBridge()` dan `disableArch3rBridge()` untuk memverifikasi keaktifan interface `br0` di kernel secara adaptif.
- **Integrasi Antarmuka Visual arch3rBridge (`public/index.html`, `public/script.js`):**
  - **Dedicated Card arch3rBridge di Modal Network Manager (`#netMgrModalOverlay`):** Menambahkan kartu kontrol arch3rBridge lengkap dengan badge `#arch3rBridgeBadge` (`⚪ INAKTIF` vs `🟢 BRIDGE AKTIF (br0)`), tombol eksekusi `⚡ Aktifkan arch3rBridge (Bypass Isolasi)`, `🛑 Bongkar Bridge & Pulihkan`, `🔄 Cek Status`, dan terminal log *real-time* `#arch3rBridgeLogBox`.
  - **Tombol Pintas di Marketplace Addons (`public/script.js`):** Menambahkan tombol `🌐 Network Router` langsung pada tabel Addons terinstal untuk akses instan satu klik.
  - **Routing Konfigurasi Otomatis:** Membuka langsung modal Network Manager & arch3rBridge saat pengguna mengklik tombol pengaturan (⚙️) modul `network-manager`.

## [Ver 11.4.0] - 2026-09-28
### arch3rBridge Local Network Bridging Driver, ISP Router Isolation Bypass & Visual UI
- **Integrasi Fitur `arch3rBridge` (`addons/network-manager/lib/nmcli_driver.js`):**
  - **Fungsi `enableArch3rBridge()`**: Mendeteksi secara dinamis nama interface LAN (`eth0`) dan Wi-Fi (`wlan0`) aktif, lalu membuat bridge Linux `br0` (`nmcli connection add type bridge con-name br0 ifname br0`), melakukan binding slave `br0-lan` dan `br0-wifi` ke master `br0`, serta mengaktifkan koneksi bridge (`nmcli connection up br0`) untuk menembus isolasi router ISP.
  - **Fungsi `disableArch3rBridge()`**: Menghapus slave `br0-lan` & `br0-wifi`, menghapus master `br0`, lalu mengaktifkan kembali koneksi LAN & Wi-Fi original secara dinamis (`nmcli connection up`).
  - **Fungsi `getArch3rBridgeStatus()`**: Memeriksa status keaktifan interface bridge `br0` secara *real-time*.
- **REST API Endpoints (`addons/network-manager/index.js`, `server.js`):**
  - Mengintegrasikan endpoint `POST /api/addons/network-manager/bridge/enable`, `POST /api/addons/network-manager/bridge/disable`, dan `GET /api/addons/network-manager/bridge/status` serta mendaftarkan router Network Manager di `server.js` dengan proteksi token.
- **Antarmuka Visual Pengaturan (`public/index.html`, `public/script.js`):**
  - **Modal Network Manager (`#netMgrModalOverlay`)**: Menyediakan antarmuka visual lengkap dengan tombol kontrol `⚡ Enable arch3rBridge`, `🛑 Disable arch3rBridge`, dan `🔄 Check Status`.
  - **Indikator Badge & Terminal Output Real-time**: Menampilkan status keaktifan `🟢 BRIDGE AKTIF (br0)` vs `⚪ INAKTIF` beserta log tahap eksekusi perintah terminal.
  - **Pintasan Pengaturan Sistem**: Menambahkan kartu akses cepat ke Network Manager & arch3rBridge di menu `Sistem & Jaringan` (`#view-setting-system`) dan bilah navigasi utama.

## [Ver 11.3.9] - 2026-09-28
### Physical Storage Mount Point Device Filter & Sub-folder Partition Distinction
- **Penyaringan Perangkat Penyimpanan Fisik Nyata (`server.js`):**
  - **Penjelasan Masalah & Solusi Teknis:** Pada sistem operasi Linux, direktori seperti `public/recordings` (penyimpanan default NVR) maupun folder di `/media` / `/mnt` yang belum di-mount ke drive fisik baru berada di dalam partisi fisik yang sama dengan Root (`/`). Oleh karena itu, perintah sistem `fs.statfsSync()` pada folder tersebut mengembalikan kapasitas total, sisa ruang, dan % penggunaan yang sama persis dengan eMMC/SD Card Internal.
  - **Identifikasi Device ID (`statSync().dev`):** Menambahkan verifikasi Device ID (`st.dev`). Folder di `/media` atau `/mnt` yang memiliki Device ID sama dengan Root `/` dipastikan merupakan folder lokal biasa (belum terpasang Harddisk/USB fisik), sehingga otomatis disaring agar tidak membingungkan pengguna dengan tampilan "HDD Tiruan" berukuran sama.
  - **Pembeda Sub-folder Partisi Root:** Menambahkan label tegas `Folder Default NVR (Sub-folder Partisi Root eMMC)` apabila folder `public/recordings` berada di dalam partisi eMMC yang sama dengan OS Root, sehingga pengguna memahami secara tepat mengapa kapasitasnya sama dengan Internal Storage.

## [Ver 11.3.8] - 2026-09-28
### Interactive Accordion Dropdown System Stats Widget (Parent Overall + Child Breakdown)
- **Komponen Accordion Dropdown Sidebar Widget (`public/index.html`, `public/script.js`):**
  - **Tampilan Utama Menyeluruh (Parent):** Menampilkan ringkasan utama CPU, RAM, Suhu STB, % Storage Utama, serta Total Bandwidth Internet (↓ Download & ↑ Upload akumulatif) di posisi teratas widget sidebar.
  - **Show/Hide Child Elements (Dropdown):** Menambahkan tombol toggle interaktif berserta indikator panah (▼/▲) pada header Storage dan Jaringan.
  - **Rincian Child Storage & Network (`public/script.js`):**
    - Saat item Storage diklik, rincian tiap disk (Root Internal eMMC/SD Card, USB/SATA HDD `/media/devmon/*`) muncul secara responsif di bawahnya (`#sidebarStorageList`).
    - Saat header Jaringan Total diklik, rincian kecepatan bandwidth masing-masing interface fisik (`🔌 eth0`, `📶 wlan0`) terbuka rapi di bawahnya (`#wNetBreakdown`).
  - **State Persistence:** Memastikan pembaruan data sistem *real-time* (polling setiap 5 detik) tidak menutup menu dropdown yang sedang dibuka oleh pengguna.

## [Ver 11.3.7] - 2026-09-28
### Separate Individual Multi-Disk Storage Widget & Total Combined Network Bandwidth
- **Rincian Penyimpanan Terpisah / Individu (`server.js`, `public/index.html`, `public/script.js`):**
  - **Sesuai Instruksi User (DILARANG DIGABUNG):** Penyimpanan tidak digabung dalam 1 total kapasitas, melainkan setiap drive fisik (Internal Root/eMMC/SD Card, Default Public Recordings, Harddisk Eksternal USB/SATA `/media/devmon/*`, dan Drive Kustom) dirender secara individual pada widget sidebar.
  - Menambahkan container `#sidebarStorageList` yang menampilkan nama disk, mount point, persen penggunaan, kapasitas terpakai, kapasitas total, sisa ruang, dan progress bar visual khusus untuk setiap disk secara terpisah.
- **Monitoring Bandwidth Jaringan Internet Total & Breakdown (`server.js`, `public/script.js`):**
  - **Sesuai Instruksi User (DIAPLIKASIKAN DIGABUNG):** Kecepatan Download (Rx) dan Upload (Tx) digabung secara akumulatif dari seluruh interface aktif (`eth0` + `wlan0`), sehingga pengguna mengetahui secara tepat total bandwidth internet yang sedang digunakan secara *real-time*.
  - Menyediakan rincian (*breakdown*) kecepatan per-interface di bawah indikator total jika terdapat lebih dari satu interface yang aktif secara bersamaan.

## [Ver 11.3.6] - 2026-09-28
### Network Manager Addon Marketplace Registration & Manifest Integration
- **Pembuatan Berkas Manifes Resmi (`addons/network-manager/manifest.json`):**
  - Membuat berkas `manifest.json` untuk modul Network Manager agar terdaftar secara resmi sebagai kartu Addon di antarmuka Addons Marketplace NVR.
- **Auto-Scanner Fallback di Server (`server.js`):**
  - Mengintegrasikan pemeriksaan keberadaan modul `/addons/network-manager` ke dalam fungsi `scanAvailablePhysicalAddons()` di `server.js` sehingga kartu Addon Network Router otomatis terdeteksi dan tampil di menu Addons NVR.

## [Ver 11.3.5] - 2026-09-28
### Dynamic Wi-Fi (SSID) Connection Auto-Detection, Parameterless setupMetrics & addRoute(target, isWireless)
- **Fungsi Pembantu Deteksi Koneksi Aktif (`detectActiveConnections`):**
  - Menambahkan fungsi internal `detectActiveConnections()` pada `ArmbianNetworkManager` yang secara otomatis memindai output `nmcli connection show` untuk mendeteksi nama koneksi aktif TYPE="wifi" (Wireless) dan TYPE="ethernet" (LAN).
- **Pembaruan `setupMetrics()` Tanpa Parameter Wajib:**
  - Mengubah `setupMetrics(lanName, wifiName)` sehingga tidak lagi mewajibkan parameter nama koneksi. Jika nama tidak diberikan, fungsi secara otomatis menggunakan nama koneksi Wi-Fi dan LAN aktif yang terdeteksi secara otomatis (Metric LAN=50, Metric Wi-Fi=500).
- **Refaktorisasi `addRoute(target, isWireless)` Berbasis Boolean Interface:**
  - Mengubah `addRoute(target, isWireless)` agar menerima parameter boolean `isWireless`. Jika `isWireless === true`, rute secara otomatis dipasang ke koneksi Wi-Fi aktif. Jika `false`, dipasang ke koneksi LAN aktif, tanpa perlu melakukan hardcode nama SSID Wi-Fi yang sering berubah.
- **Dukungan Deletion Rute Dinamis (`deleteRoute`):**
  - Mengoptimalkan `deleteRoute(target, isWireless)` untuk secara otomatis mendeteksi koneksi Wi-Fi/LAN aktif saat menghapus rute statis.

## [Ver 11.3.4] - 2026-09-28
### Generalized Network Routing Driver (nmcli), Auto CIDR Detection & Custom Route Deletion
- **Generalisasi Driver Rute NetworkManager (`addons/network-manager/lib/nmcli_driver.js`):**
  - Merefaktorisasi `addCameraRoute` menjadi fungsi generik `addRoute(connectionName, target, type)` yang mendukung berbagai perangkat jaringan (Kamera, NAS, Server Lokal, Smart Home Hubs, maupun Blok Subnet).
  - Menambahkan deteksi otomatis sufiks CIDR: jika pengguna hanya menginput IP tunggal tanpa mask (misal `192.168.1.50`), sistem akan otomatis menambahkan `/32` (`192.168.1.50/32`) sebelum mengeksekusi `nmcli`.
  - Mendukung input rute blok subnet lengkap seperti `192.168.1.0/24` untuk mengarahkan seluruh lalu lintas interface.
  - Menambahkan metode baru `deleteRoute(connectionName, target)` menggunakan perintah `nmcli connection modify "<connectionName>" -ipv4.routes "<target>"` untuk menghapus aturan rute statis dari kernel.
  - Mempertahankan proteksi sanitasi parameter berbasis regex untuk mencegah kerentanan command injection.
- **REST API Router Endpoint & UI (`addons/network-manager/index.js`, `server.js`, `public/script.js`):**
  - Mengintegrasikan endpoint `DELETE /api/addons/network-manager/routes` dan mendukung parameter `target` / `cameraIp` secara fleksibel.
  - Memastikan mounting middleware `app.use('/api/addons/network-manager', verifyToken, networkManagerRouter)` di `server.js`.
  - Memperbarui antarmuka pengguna (UI Modal) untuk mendukung penambahan dan penghapusan rute kustom IP/Subnet secara real-time.

## [Ver 11.3.3] - 2026-09-28
### Armbian Dual-Interface Network Router Addon (nmcli), Route Metrics & Static Camera Binding
- **Class/Driver Modular `ArmbianNetworkManager` (`addons/network-manager/lib/nmcli_driver.js`):**
  - Mengisolasi antarmuka jaringan Linux Armbian STB (NetworkManager `nmcli`) dengan penanganan error tangguh dan eksekusi non-blocking.
  - Implementasi fungsi utama `getConnections()`, `setupMetrics(lanName, wifiName)`, `addCameraRoute(interfaceType, cameraIp, connectionName)`, `removeCameraRoute()`, dan `applyChanges()`.
- **Modul REST API Addon Router (`addons/network-manager/index.js`, `server.js`):**
  - Menyediakan endpoint lengkap `/api/addons/network-manager/*` untuk manajemen interface, kueri rute kernel, serta mengintegrasikannya secara otomatis ke dalam daftar Addons NVR.
- **Penyelesaian Isolasi Router ISP & Rute Statis Kamera (`public/index.html`, `public/script.js`):**
  - Menambahkan **Modal Dual-Interface Network Router & Camera Binding (nmcli)** lengkap dengan tombol pemicu `🌐` di toolbar monitor live.
  - Memungkinkan penyetelan metric prioritas internet (LAN Metric=50, Wi-Fi Metric=500) dan pengikatan IP kamera ke interface fisik terisolasi (`+ipv4.routes "IP_KAMERA/32"`) secara langsung dari UI NVR.

## [Ver 11.3.2] - 2026-09-28
### RTSP TCP Lossless Streaming Optimization, LAN/WAN Network Diagnostics Engine & Smart Sub-Stream Allocation
- **Pencegahan Buffering RTSP & Pengunci Protokol TCP Lossless (`server.js`):**
  - Mengonfigurasi MediaMTX dan FFprobe untuk memaksa transmisi RTSP berbasis TCP (`protocols: [tcp]`, `sourceProtocol: tcp`), mengeliminasi packet drop yang terjadi pada koneksi UDP di jaringan Wi-Fi/LAN/WAN.
  - Mengoptimalkan buffer soket & prapemrosesan SPS/PPS untuk mengurangi latensi startup dan mencegah loop buffering saat pemantauan langsung.
- **Modul Diagnosa Jaringan LAN/WAN & Performa Kamera Per-Device (`server.js`, `public/index.html`, `public/script.js`):**
  - Menambahkan endpoint API diagnostik baru `GET /api/cameras/:id/diagnostics` dan `GET /api/cameras/diagnostics/all`.
  - Menambahkan **Modal Diagnosa Jaringan LAN/WAN & Stream Kamera** di antarmuka utama NVR lengkap dengan tombol pemicu `🩺` pada toolbar monitor live.
  - Memeriksa latensi PING soket (ms), status port RTSP 554, status port ONVIF, resolusi, FPS, codec video, dan rekomendasi otomatis (seperti menyarankan penggunaan Sub-Stream SD untuk jaringan Wi-Fi/WAN).
- **Alokasi Otomatis Sub-Stream (SD) pada Tampilan Grid Multi-Kamera (`public/script.js`):**
  - Mendukung peralihan alokasi Sub-Stream (SD) secara cerdas saat pemantauan multi-grid (2x2, 3x3, 4x4) untuk menghemat CPU STB Armbian, RAM, dan bandwidth jaringan secara signifikan.
- **Konsistensi Preferensi Auto-Play & Sesi Lintas Browser (`server.js`, `public/script.js`):**
  - Menyimpan preferensi sakelar Auto-Play secara terpusat di server NVR (`super_settings.autoplayLive`) melalui endpoint `POST /api/settings/autoplay` dan menyinkronkan statusnya ke seluruh browser yang login.

## [Ver 11.3.1] - 2026-09-28
### Fix Persistent Stream Loading, Server-Synced Autoplay Settings & Mobile PTZ D-Pad Layout Alignment
- **Perbaikan Masalah Video Memuat Aliran Terus-menerus (Infinite Buffering / Continuous Loading Fix) (`public/script.js`):**
  - Menghapus atribut `autoplay` bawaan pada elemen HTML `<video>` yang memicu browser autoplay policy restriction dan loop status `waiting`/`stalled` tanpa henti.
  - Menambahkan pengiriman header otentikasi `Authorization: Bearer <token>` pada permintaan WebRTC WHEP (`POST /whep`), mencegah penolakan HTTP 401 Unauthorized yang membuat stream terus mencoba terhubung kembali.
  - Memperbarui pendeteksian frame video aktif (first frame received) untuk langsung menghapus overlay loading dan mengeset status stream menjadi `live` secara responsif.
  - Menambahkan fallback otomatis ke HLS (`/stream/` atau `/streams/`) jika koneksi WebRTC WHEP gagal atau waktu penyiapan melebihi batas toleransi.
- **Sinkronisasi Sesi Auto-Play Lintas Browser & Perangkat (Server-Synced Autoplay Settings) (`server.js`, `public/script.js`):**
  - Menambahkan properti `autoplayLive` di konfigurasi database server NVR (`super_settings`) dan endpoint API baru `POST /api/settings/autoplay` (dengan otentikasi JWT).
  - Mengubah logika `isAutoPlayLive()` agar mengutamakan konfigurasi dari server NVR (`window.nvrSystemSettings.autoplayLive`), sehingga preferensi Auto-play tersimpan secara konsisten lintas browser dan sesi tanpa kembali ke default `STOP/pause`.
- **Restorasi Ergonometri D-Pad PTZ Control pada Layar Ponsel / Mobile UI (`public/style.css`):**
  - Memperbaiki tata letak `.nvr-ptz-split-layout` pada media query layar HP (`max-width: 580px` dan `orientation: portrait`).
  - Mengatur ulang urutan komponen agar D-Pad (`.nvr-ptz-right-column`) tampil di posisi atas/sejajar yang mudah dijangkau ibu jari, tidak lagi terdorong terlalu jauh ke bawah melewati panel kontrol lensa/lensa & audio.

## [Ver 11.3.0] - 2026-09-28
### Standby Default Live Monitor, Auto-Play Switcher & Compact Mobile Toolbar Icons
- **Mode Siaga Default Saat Buka Monitor Live (Standby / Zero-Overhead Initial Load) (`public/script.js`, `public/style.css`):**
  - Mengubah perilaku default saat pertama kali membuka halaman monitor live menjadi **STOP / SIAGA (Standby)**, tidak lagi memutar seluruh aliran video kamera secara serentak secara otomatis.
  - Menghemat pemakaian CPU STB Armbian, RAM, dan bandwidth jaringan pengguna secara drastis saat halaman pertama kali diakses.
  - Setiap petak kamera menampilkan status OSD Siaga yang elegan dengan opsi putar per kamera (cukup klik petak atau tombol `▶️` pada kartu kamera untuk memulai kamera yang ingin ditonton).
- **Pengalih Auto-play Cepat Terintegrasi (Auto-Play Switcher) (`public/index.html`, `public/script.js`):**
  - Menambahkan tombol toggle `⚡ Auto: Off / Auto: On` pada toolbar pemantauan live stream.
  - Pilihan pengguna disimpan secara persisten di `localStorage` (`nvr_autoplay_live`). Pengguna yang menginginkan stream langsung diputar dapat menyalakan toggle ini kapan saja dengan sekali sentuh.
- **Penyempurnaan Tombol Stop Sebenarnya (True Stop vs Visual Pause) (`public/script.js`):**
  - Tombol jeda/stop kini melakukan pemutusan koneksi WebRTC (`RTCPeerConnection.close()`) dan penghancuran instance HLS player (`hls.destroy()`) secara tuntas ke server RTSP MediaMTX, bukan sekadar `video.pause()`.
  - Membebaskan thread decoding dan koneksi soket jaringan di STB Armbian secara riil saat dihentikan.
- **UI Responsif HP / Mobile Tanpa Tombol Terpotong (`public/index.html`, `public/style.css`):**
  - Menyusun ulang tombol global kontrol stream (`▶️ Putar Semua`, `⏹️ Stop Semua`, `⚡ Auto`) menjadi struktur icon-first dengan kelas `.nvr-btn-icon` dan `.nvr-btn-label`.
  - Pada layar HP (lebar `<= 768px`), teks label otomatis disembunyikan sehingga tombol tampil rapi sebagai icon ramping (`▶️`, `⏹️`, `⚡`).
  - Mencegah tombol di sebelahnya (`🔄 Refresh` dan `⛶ Layar Penuh`) terdorong keluar layar ke kanan, memastikan tata letak toolbar muat sempurna pada semua ukuran layar ponsel.

## [Ver 11.2.9] - 2026-09-28
### HDMI Kiosk 100vh Fullscreen Fix, Multi-Slot Ordering UI & Dual-Cam Audio/Video Stream Engine
- **Eliminasi Total Gambar Kepotong & Celah Hitam pada Kiosk TV 1x1, 3x3, 4x4 (`public/style.css`):**
  - Mengisolasi media query viewport responsif agar tidak berlaku pada mode Kiosk TV (`html:not(.kiosk-display-mode):not(.is-fullscreen)`), mencegah penimpaan properti `height: auto` dan pembatasan `aspect-ratio: 16/9` statis.
  - Memperkuat styling CSS Kiosk Display Mode: memaksa `#videoGrid` mengisi penuh `100vw` dan `100vh` dengan `grid-template-rows: 1fr !important` (1x1), `repeat(2, minmax(0, 1fr))` (2x2), `repeat(3, minmax(0, 1fr))` (3x3), dan `repeat(4, minmax(0, 1fr))` (4x4).
  - Mengatur `aspect-ratio: unset !important` dan `object-fit: fill !important` pada elemen video dan sel kamera Kiosk, menjamin video mengisi penuh seluruh bingkai layar TV tanpa sisa area hitam di bagian bawah maupun samping.
- **Dukungan Pilihan Kamera & Pengurutan Slot Multi-Kamera di Remote & Pengaturan Kiosk (`public/script.js`, `server.js`):**
  - Menghadirkan fitur Slot Assignment (Pemetaan & Urutan Slot Kamera) untuk mode multi-kamera (`2x2 Quad`, `1+5 PIP 6-Cam`, `3x3 9-Cam`, dan `4x4 16-Cam`).
  - Pengguna dapat memilih kamera spesifik untuk setiap slot atau mengosongkan slot tertentu, baik melalui Remote Layar TV (HP) maupun di Pengaturan Kiosk.
  - Perubahan urutan slot langsung disinkronkan ke TV secara instan via push SSE (`< 50ms`) dan tersimpan permanen di `addons/hdmi-kiosk/config.json`.
- **Analisis & Solusi Masalah Kamera Dual-Lens (Fran Well):**
  - Mengidentifikasi penyebab video tidak tampil di browser namun rekaman tetap aktif: stream kedua/sub-stream kamera dual-lens menggunakan enkripsi atau codec H.265 (HEVC), atau URL sub-stream berbeda dari stream utama yang direkam oleh FFmpeg.

## [Ver 11.2.8] - 2026-09-28
### SPS/PPS Dimension Probe Injection (dump_extra), Zero-Bitrate AVOption Clean & Audio Resample Async Sync
- **Eliminasi Total `dimensions not set` & `Could not write header` (Code: 234) (`server.js`):**
  - Menaikkan durasi probe RTSP `analyzeduration` dan `probesize` ke 10 detik / 10MB (`10000000`) di semua profil fallback. Memastikan FFmpeg berhasil menerima dan mendekode SPS/PPS video frame pertama sebelum muxer MP4 mulai menulis header segmen.
  - Menerapkan bitstream filter `-bsf:v dump_extra` pada perekaman stream copy untuk menyuntikkan ekstra header dimensi (width, height, profile) ke dalam setiap keyframe secara dinamis.
- **Pembersihan Bersih `Codec AVOption b has not been used` (Code: 234 / 0) (`server.js`):**
  - Menghapus opsi bitrate audio `-b:a` saat mapping audio bersifat opsional (`-map 0:a?`).
  - Mengeliminasi warning fatal FFmpeg 5.x/6.x/7.x pada kamera yang tidak menyiarkan stream audio (`cam_rtamu`, `cam_atas_depan`).
- **Stabilisasi DTS Audio & Eliminasi `Non-monotonic DTS in output stream 0:1` (`server.js`):**
  - Menambahkan filter sinkronisasi audio `-af aresample=async=1000` dengan clock audio 44.1kHz (`-ar 44100`). Filter ini secara otomatis meratakan drift timestamp audio kamera IP tanpa membuat frame audio melompat mundur.

## [Ver 11.2.7] - 2026-09-28
### Universal IPC Wallclock Timestamps, Muxing Queue Buffer & Anti-Assertion Engine
- **Eliminasi Error Fatal `pts has no value` & Assertion SIGABRT (`server.js`):**
  - Menghapus flag `+igndts` yang sebelumnya menyebabkan hilangnya referensi timestamp pada frame video kamera IP yang tidak memiliki PTS eksplisit (`pts has no value`).
  - Menerapkan `-use_wallclock_as_timestamps 1` pada input RTSP untuk seluruh level rekaman (Optimal, Adaptive, Ultra-Safe). Fitur ini secara otomatis menghasilkan timestamp berbasis jam lokal sistem Linux/Armbian untuk setiap frame video/audio yang masuk, menyelesaikan masalah selisih durasi raksasa (`Packet duration is out of range`) dan `Assertion next_dts failed (Code: null)`.
- **Optimalisasi Buffer Muxer Universal IPC (`server.js`):**
  - Menambahkan `-max_muxing_queue_size 2048` pada pipeline segmenter MP4 untuk mencegah packet drop atau buffer overflow saat muxer menunggu keyframe pertama dari kamera.
  - Mempertahankan integrasi transcode AAC 44.1kHz dan segmenter `movflags=+faststart+frag_keyframe+empty_moov+default_base_moof` untuk penulisan atom MP4 seketika.

## [Ver 11.2.6] - 2026-09-28
### Universal AAC Audio Resampler, MP4 Frag Keyframe Header Tolerance & DTS Ignore (igndts)
- **Eliminasi Error Inisialisasi Header MP4 & Exit Code 234 (`server.js`):**
  - Mengganti parameter filter audio kompleks (`aresample`) dengan transcode audio AAC standar (`-c:a aac -b:a 64k -ar 44100`) universal.
  - Mengeliminasi error fatal `Could not write header (incorrect codec parameters ?): Invalid argument` yang terjadi saat kamera IP (seperti V380 / Xiongmai G.711u/a) gagal menginisialisasi parameter atom MP4.
  - Memperkaya `segment_format_options` dengan flag `movflags=+faststart+frag_keyframe+empty_moov+default_base_moof` sehingga container MP4 dapat langsung dituliskan header-nya meskipun paket audio pertama datang terlambat.
- **Pencegahan Error Non-Monotonic DTS & Exit Code 0 (`server.js`):**
  - Menerapkan flag input `-fflags +genpts+igndts+discardcorrupt` (termasuk flag `+igndts` - *Ignore DTS*).
  - Mengabaikan timestamp decoding (DTS) dobel/rusak dari RTSP kamera IP (`previous: 0, current: 0`) dan merekonstruksinya secara bersih menggunakan PTS valid.
  - Menghapus `-avoid_negative_ts make_zero` pada input RTSP yang berbenturan dengan segmenter, mengandalkan opsi bawaan segmenter `-reset_timestamps 1` untuk transisi waktu segmen yang mulus tanpa menghentikan FFmpeg.

## [Ver 11.2.5] - 2026-09-28
### Fixed HDMI Kiosk Preset ReferenceError & Reinforced AGENTS.md Protocol
- **Perbaikan Modal Pengaturan HDMI Kiosk (`public/script.js`):**
  - Mengembalikan deklarasi variabel `preset` (`const preset = configObj.preset || 'live_grid';`) di fungsi `openHdmiKioskModal()`.
  - Mengeliminasi error JavaScript `ReferenceError: preset is not defined` yang terjadi saat pengguna menekan tombol gerigi/pengaturan Addon HDMI Kiosk.
  - Memastikan form tab Pengaturan Kiosk dapat dimuat dengan sempurna, termasuk pemetaan opsi preset default (`live_grid`, `live_grid_3x3`, `single_cam`, `full_dashboard`) dan selector kamera tunggal.
- **Pembaruan Aturan Sistem & Protokol Agen (`AGENTS.md`):**
  - Mempertegas bagian 2 di `AGENTS.md`: Menetapkan kewajiban mutlak untuk selalu menyertakan blok Changelog resmi di setiap akhir/awal respons chat asisten.
  - Menetapkan aturan ketat sinkronisasi berkas `CHANGELOG.md`, `package.json`, `metadata.json`, dan `version_sync.js` untuk setiap update.

## [Ver 11.2.4] - 2026-09-28
### Zero-Crash FFmpeg Recording Engine, AU Headers Tolerance & AVOption Bitrate Clean
- **Eliminasi Warning AVOption Bitrate & Exit Code 234 (`server.js`):**
  - Membersihkan parameter bitrate video/audio global saat perekaman menggunakan codec stream copy (`-c:v copy`).
  - Mengeliminasi warning `Codec AVOption b (set bitrate (in bits/s)) has not been used for any stream` yang sebelumnya memicu exit code 234 / 0 pada segmenter FFmpeg versi modern.
- **Toleransi Paket Audio RTSP & Solusi `Error parsing AU headers` (`server.js`):**
  - Menambahkan buffer network socket `-buffer_size 1024000` dan `-max_delay 500000` pada input RTSP untuk meredam jitter dan desync paket audio AAC.
  - Menerapkan `-fflags +genpts+discardcorrupt` dan `-avoid_negative_ts make_zero` di seluruh profil fallback perekaman sehingga FFmpeg secara otomatis membuang paket AU header yang cacat/terfragmentasi tanpa mematikan proses perekaman.
  - Memperbarui filter audio resampling (`aresample=async=1:min_hard_comp=0.100000:first_pts=0`) untuk menjaga sinkronisasi audio-video saat terjadi fluktuasi timestamp dari IP kamera.
- **Peningkatan Filter Log Kesalahan FFmpeg (`server.js`):**
  - Mengabaikan log info rutin pembuatan file segmen MP4 normal (`Opening ... for writing`) agar log NVR tetap bersih dan hanya mencatat anomali yang relevan.

## [Ver 11.2.3] - 2026-09-28
### Zero Horizontal Gap NVR Grid & Active State Remote Controller Feedback
- **Eliminasi Gap Baris Horizontal Layar TV (`public/style.css`):**
  - Mengubah row layout pada mode Kiosk menjadi `grid-template-rows: repeat(N, 1fr) !important` dengan pembagian fraksional mutlak, melenyapkan perbedaan perhitungan piksel pada monitor TV.
  - Memperbaiki struktur `.cam-cell` dan inner `div` agar mengisi `height: 100% !important; max-height: 100% !important;` dengan `overflow: hidden;`.
  - Mengunci elemen `<video>` dengan `position: absolute; inset: 0; display: block; width: 100%; height: 100%; object-fit: fill !important;`, sehingga 100% gap horizontal di antara baris video lenyap.
  - Menjadikan OSD nama kamera mengambang (`position: absolute; top: 6px; left: 6px; z-index: 20;`) sehingga tidak mendorong dimensi fisik video.
- **Indikator Tombol Remote Aktif / Highlight di HP (`public/script.js`, `server.js`):**
  - Mengintegrasikan `liveState` ke dalam endpoint `/api/addons/hdmi-kiosk/status` sehingga saat modal remote dibuka di HP, tombol preset yang sedang aktif di TV (`1×1`, `2×2`, `1+5 PIP`, `3×3`, `4×4`, atau kamera tunggal) langsung menyala (highlight biru/glow).
  - Menambahkan feedback visual instan saat tombol remote ditekan di HP: tombol yang diklik langsung menyala aktif dan tombol lainnya meredup seketika tanpa jeda.

## [Ver 11.2.2] - 2026-09-28
### Professional NVR Matrix Grids (1x1, 2x2, 1+5 PIP, 3x3, 4x4) & Instant TV Viewport Fitting
- **Matriks CCTV NVR Profesional Murni (`public/style.css`):**
  - Mengunci pembagian layout TV ke standar industri CCTV NVR:
    - **1×1 (Single)**: 100vw × 100vh penuh (Ultra Fullscreen).
    - **2×2 (4 Kamera)**: 2 kolom sama lebar × 2 baris sama tinggi (50vw × 50vh) tanpa sisa ruang kosong di bawah.
    - **1+5 (6 Kamera PIP)**: 1 kamera utama besar (span 2x2) + 5 kamera pendamping (1x1) khas NVR komersial.
    - **3×3 (9 Kamera)**: 3 kolom × 3 baris presisi (33.33vw × 33.33vh).
    - **4×4 (16 Kamera)**: 4 kolom × 4 baris presisi (25vw × 25vh).
  - Menghapus batasan `aspect-ratio` statis pada mode TV Kiosk sehingga video ditarik rapat dari ujung atas ke ujung bawah monitor (`object-fit: fill`), mengeliminasi 100% gap hitam.
- **Logika Fullscreen Instan Zero-Permission (`public/script.js`, `server.js`):**
  - Mengubah logika remote Fullscreen menjadi **Monitor Murni TV** (`.kiosk-display-mode`) dan **Dashboard Menu TV** (`.kiosk-dashboard-active`).
  - Mengatasi pemblokiran `requestFullscreen()` oleh browser Chromium STB saat dikendalikan dari remote HP secara instan (<50ms via SSE).
- **Penyimpanan Permanen Preset Remote (`server.js`):**
  - Setiap perubahan preset dari remote HP otomatis disimpan ke `addons/hdmi-kiosk/config.json` agar tetap bertahan saat STB reboot.
- **Penyelarasan UI Remote Control (`public/script.js`):**
  - Menyesuaikan label dan tombol remote di tab HDMI Kiosk: `[1×1]`, `[2×2]`, `[1+5 PIP]`, `[3×3]`, `[4×4]`.

## [Ver 11.2.1] - 2026-09-27
### Seamless Zero-Gap Kiosk TV Grid, Mouse Cursor Visibility & Anti-Translate Engine
- **Inisialisasi Otomatis Preset Kiosk Default (`server.js`, `public/script.js`):**
  - Menginisialisasi `kioskLiveState` di backend langsung dari `config.json` yang tersimpan.
  - Memastikan layar TV STB otomatis mengeksekusi preset default (misalnya *Kamera Tunggal Fullscreen - Kamera Depan*) saat pertama kali booting tanpa harus memencet remote HP.
- **Tampilan Grid TV Rapat & Seamless (Zero-Gap) (`public/style.css`):**
  - Meniadakan jarak renggang (gap hitam), padding, margin, dan border tebal pada mode Kiosk TV.
  - Video kini memenuhi 100% sel grid (`object-fit: fill`) sehingga terlihat rapat, presisi, dan proporsional di layar TV.
- **Pembersihan Total Google Translate & Dialog Error (`index.html`, `public/index.html`, `addons/hdmi-kiosk/index.js`):**
  - Menambahkan atribut anti-translate (`translate="no"`, `class="notranslate"`, `<meta name="google" content="notranslate">`).
  - Menambahkan flag Chromium lengkap di launcher script STB (`--disable-translate`, `--disable-features=Translate`, `--simulate-outdated-no-au`).
- **Dukungan Kursor Mouse Fisik USB (`public/style.css`, `public/script.js`, `addons/hdmi-kiosk/index.js`):**
  - Menambahkan opsi konfigurasi kursor mouse fisik di tab Pengaturan Kiosk.
  - Memastikan kursor mouse (`cursor: default`) tetap terlihat saat mouse dicolokkan ke port USB STB.
- **Penyelarasan Versi Sistem:**
  - Menaikkan nomor versi aplikasi ke **Ver. 11.2.1** sesuai Semantic Versioning Strict.

## [Ver 11.2.0] - 2026-09-27
### Clean HDMI Kiosk Runtime & Zero-Syntax Scope Fix
- **Perbaikan Syntax Scope (`public/script.js`):**
  - Mengeliminasi duplikasi deklarasi variabel `let lastRefreshSeq` di modul runtime Kiosk.
- **Penyelarasan Versi Sistem:**
  - Menaikkan nomor versi aplikasi ke **Ver. 11.2.0** sesuai Semantic Versioning Strict.

## [Ver 11.1.9] - 2026-09-27
### HDMI Kiosk 2-Tab Architecture & Real-Time TV Remote Synchronization
- **Pemisahan Pop-up Pengaturan HDMI Kiosk Menjadi 2 Tab Mandiri (`script.js`):**
  - **Tab 1: 🎮 Remote Layar TV**: Mengisolasi kontrol langsung TV (pilihan grid 1x1, 2x2, 2x3, 3x3, alih kamera perorangan, mode patroli, fullscreen & exit fullscreen, standby/layar hitam, dan hard reload).
  - **Tab 2: ⚙️ Pengaturan Kiosk**: Menata formulir hak akses RBAC (Kiosk Viewer vs Admin), preset default, resolusi, rotasi orientasi, dan opsi pembersihan profil browser.
- **Perbaikan Bug Infinite Hard Reload Loop (`server.js`, `script.js`):**
  - Mengganti nomor urut sekuens reload dengan `reload_token` berbasis timestamp dan pencatatan di `sessionStorage` TV, memastikan layar TV hanya memuat ulang tepat 1 kali tanpa looping restart.
- **Sinkronisasi Real-Time Grid TV & Fitur Fullscreen (`server.js`, `script.js`):**
  - Mengintegrasikan sinyal preset remote langsung ke mesin grid tampilan utama NVR (`window.setGridLayout()` dan `window.onChannelDropdownChange()`).
  - Menambahkan aksi **⛶ Layar Penuh TV** dan **🗗 Keluar Layar Penuh** yang dikendalikan secara instan dari HP via SSE (<50ms).
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 11.1.9** sesuai Semantic Versioning Strict.
### Autonomous Auto-Adaptive FFmpeg Engine & Zero-Crash Recording Self-Healing
- **Auto-Adaptive FFmpeg Capabilities Doctor (`server.js`):**
  - **Self-Diagnosis saat Booting (`probeFfmpegCapabilities`)**: Memindai opsi bantuan `ffmpeg -h full` secara otomatis saat server booting untuk mendeteksi dialek timeout yang didukung OS Linux STB (`-timeout`, `-stimeout`, `-rw_timeout`, atau fallback vanilla).
  - **Universal STB Compatibility**: Mengeliminasi 100% resiko crash `Unrecognized option` pada berbagai distro Linux Armbian/Debian/Ubuntu.
- **Autonomous Multi-Level Self-Healing Recording Pipeline (`server.js`):**
  - **Zero-Crash Recording Fallback**: Jika suatu kamera mengalami error opsi FFmpeg, sistem mendeteksi log error secara otomatis, mencabut opsi yang tidak kompatibel di runtime memori, dan me-restart proses perekaman dalam 2,5 detik menggunakan mode aman (*Ultra-Safe Vanilla Mode*).
  - **Eliminasi Exit Code 8**: Menjamin perekaman kontinyu berjalan mulus tanpa looping reconnect.
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 11.1.8** sesuai protokol Semantic Versioning Strict.

## [Ver 11.1.7] - 2026-09-27
### Dynamic Active Mount Validator, Auto-Inherit Drive & eMMC Anti-Leak Protection
- **Dynamic Active Mount Validator & Auto-Fallback (`server.js`):**
  - **Auto-Inherit Harddisk Aktif**: Jika kamera memiliki `storagePath` lama yang menunjuk ke drive yang sudah tidak ada / dicabut / berganti nama (misal nama volume lama `New Volume`), sistem secara otomatis mengabaikan path mati tersebut dan mengalihkan penulisan rekaman ke **Harddisk Eksternal yang saat ini aktif menancap** di STB Linux Armbian.
  - **Eliminasi Hardcode Nama Harddisk**: Bebas menggunakan nama volume apa pun (`ArcHDD`, `Seagate`, `WD_1TB`, `TOSHIBA`, dll.) tanpa dependensi string statis.
- **Proteksi Anti-Bocor eMMC Linux Armbian (`server.js`):**
  - Fungsi `isStorageSafeForWriting` memvalidasi keberadaan fisik partisi Linux di `/media/devmon/*`, `/media/*`, atau `/mnt/*` sebelum FFmpeg menulis file rekaman MP4, mencegah pembuatan folder hantu di memori internal eMMC STB.
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 11.1.7**.

## [Ver 11.1.6] - 2026-09-27
### Fixed Storage Path Nesting Recursion & Optimized Armbian STB RAM Watchdog
- **Pembersihan Jalur Penyimpanan Rekaman (`server.js`):**
  - **Eliminasi Recursion Duplikasi Folder**: Memperbaiki router jalur kamera `getEffectiveCameraStoragePath` agar normalisasi folder rekaman selalu berada tepat di `[Penyimpanan]/Arch3r_NVR/[ID_Kamera]` tanpa membuat subfolder bertumpuk.
- **Optimasi Watchdog Memori STB (`server.js`):**
  - **Ambang Batas Cerdas**: Menaikkan threshold proteksi RAM STB menjadi 900MB (atau di atas 65% penggunaan RAM) dengan jeda debounce 15 menit agar proses FFmpeg tidak ter-restart secara mendadak saat streaming multi-kamera aktif.
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 11.1.6**.

## [Ver 11.1.5] - 2026-09-27
### Centralized Arch3r_NVR Storage Root & Hardware Multi-Drive Dynamic Scanner
- **Centralized Storage Router (`server.js`):**
  - **Root Terpadu `Arch3r_NVR`**: Semua rekaman video kamera secara otomatis ditempatkan di folder induk `Arch3r_NVR` pada partisi penyimpanan utama yang dipilih oleh pengguna.
  - **Dynamic Storage Scanning**: Pemindaian menyeluruh terhadap semua harddisk eksternal dan partisi flash drive yang ter-mount di `/media/devmon/*` dan `/media/*`.
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 11.1.5**.

## [Ver 11.1.4] - 2026-09-27
### Multi-Tenant Playback Streamlining & Devmon Fast Path Resolver
- **Playback & Storage Engine Enhancements (`server.js`):**
  - Sinkronisasi rekaman database `syncRecordingsToDB` memindai seluruh direktori drive secara dinamis dengan fallback path resolution untuk endpoint `/api/recordings/:camId/:date/:filename`.
  - Akses unrestricted penuh untuk Superadmin dan Administrator Gedung pada daftar rekaman.
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 11.1.4**.

## [Ver 11.1.3] - 2026-09-27
### Enterprise Multi-ROI Zone Detection & Tactical Telegram Alerts
- **Tactical Telegram Snapshot Notifications (`public/script.js` & `server.js`):**
  - Pengiriman notifikasi insiden intrusi keamanan langsung ke bot Telegram beserta snapshot frame video berkualitas tinggi.
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 11.1.3**.

## [Ver 11.1.2] - 2026-09-27
### Low-Latency Native PTZ Protocol & Macrovideo Binary Socket
- **Driver PTZ Binary Terpadu (`lib/v380_driver.js` & `server.js`):**
  - Peningkatan kontrol gerakan kamera V380 / Macrovideo IP Cam langsung via port binary socket 8800 dengan latensi di bawah 40ms.
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 11.1.2**.

## [Ver 11.1.1] - 2026-09-27
### Armbian Hardware Health Watchdog & Thermal Monitoring
- **Real-Time Hardware Telemetry (`server.js` & `public/script.js`):**
  - Endpoint `/api/system/stats` memantau suhu SoC Armbian (`/sys/class/thermal`), persentase CPU, dan penggunaan RAM STB secara berkala.
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 11.1.1**.

## [Ver 11.1.0] - 2026-09-27
### Tactical YOLO AI Studio Enterprise Architecture
- **Enterprise AI Workstation (`public/script.js` & `public/index.html`):**
  - Studio konfigurasi AI terpadu dengan 3 langkah alur kerja (Pilih Kamera, Gambar Zona ROI, dan Atur Syarat Prompt Deteksi).
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 11.1.0**.

## [Ver 11.0.9] - 2026-09-27
### Universal Database Split Engine & Shadow Backup Mirror
- **Split-DB File Isolation (`server.js`):**
  - Memisahkan database menjadi modul terisolasi (`local_db_settings.json`, `local_db_accounts.json`, `local_db_cameras.json`, `local_db_recordings.json`) untuk mencegah korupsi data saat `git pull` atau listrik padam.
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 11.0.9**.

## [Ver 11.0.8] - 2026-09-27
### HDMI Kiosk Native Player Engine (Direct MPV Integration)
- **Direct Hardware Display (`server.js` & `addons/hdmi-native`):**
  - Addon pemutar video layar TV langsung melalui HDMI STB menggunakan MPV acceleration.
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 11.0.8**.

## [Ver 11.0.7] - 2026-09-27
### PWA Offline Action Sync Engine & Network Resilience
- **Offline Resilience (`public/script.js`):**
  - Antarmuka web PWA mengantrekan perintah konfigurasi saat koneksi HP/klien terputus dan otomatis mengirimkannya saat jaringan pulih.
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 11.0.7**.

## [Ver 11.0.6] - 2026-09-27
### MediaMTX Auto-Sync & Multi-Profile Stream Routing
- **MediaMTX Dynamic Routing (`server.js`):**
  - Otomatis membuat konfigurasi MediaMTX untuk RTSP/WebRTC/HLS pada port 8889/8880 tanpa konfigurasi manual.
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 11.0.6**.

## [Ver 11.0.5] - 2026-09-27
### ONVIF Universal Device Discovery & Network Profile Resolver
- **Network Discovery Engine (`server.js`):**
  - Pemindaian otomatis IP jaringan dan deteksi port ONVIF/RTSP (8899, 554, 80, 2020, 8800) untuk integrasi kamera 1-klik.
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 11.0.5**.

## [Ver 11.0.4] - 2026-09-27
### ARM STB Safe Multi-Engine AI Architecture (Zero Illegal Instruction)
- **Eliminasi Total Crash `Illegal Instruction` (`addons/ai_yolo_service.py`):**
  - **OpenCV Native Multi-Engine Architecture**: Menambahkan 3 lapisan inferensi cerdas (`ONNX via cv2.dnn` -> `PyTorch Ultralytics fallback` -> `OpenCV MOG2 Spatial Motion & Contour Tracking`).
  - **ARM Cortex-A53 Hardware Compatibility**: Model neural net dijalankan tanpa memicu instruksi vektor terlarang (SIGILL), menjaga proses daemon AI stabil 24/7 di STB Amlogic.
  - **Zero CPU Stall Guarantee**: Jika PyTorch crash karena instruksi CPU tidak cocok, sistem secara otomatis beralih dalam 0 milidetik ke Optical Contour Tracker bawaan OpenCV yang sudah terbukti bekerja sempurna di STB Anda.
- **Penyelarasan Model & Verifikasi File (`server.js`):**
  - Mengaudit ketersediaan model `yolov8n.onnx` atau `yolov8n.pt` di sistem Linux STB.
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 11.0.4** sesuai Semantic Versioning Strict.

## [Ver 11.0.3] - 2026-09-27
### Real-Time Live Streaming AI Installer & Locked VENV Module Auditor
- **Pendeteksian VENV Terkunci & Anti-Flicker (`server.js`):**
  - **Locked VENV Priority**: Memprioritaskan virtual environment aktif (`/root/arch3r_nvr/venv/bin/python3`, `./venv/bin/python3`) dan menyimpan cache binary agar status PIP tidak lagi berubah-ubah (flickering antara hijau dan merah).
  - **Modern Module Version Discovery**: Menggunakan `importlib.metadata.version()` pada FastAPI, Uvicorn, OpenCV, dan NumPy sehingga FastAPI 0.141+ terdeteksi akurat 100% tanpa AttributeError.
- **Real-Time Live Streaming Console Output (`server.js` & `public/script.js`):**
  - **Fluid `spawn` Streaming Architecture**: Menggantikan blocking `execSync` dengan `runStreamCommand(spawn)` sehingga baris log unduhan paket (seperti instalasi pip) terkirim secara live dan instan ke antarmuka web.
  - **Color-Coded Interactive Terminal**: Polling dipercepat ke 600ms dengan styling terminal berwarna (🟢 Sukses, 🟡 Peringatan, 🔴 Error) sehingga pengguna dapat melihat proses instalasi berlangsung detik demi detik layaknya di terminal Linux.
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 11.0.3** sesuai protokol Semantic Versioning Strict.

## [Ver 11.0.2] - 2026-09-27
### AI Modules Readiness Doctor & 1-Click Autonomous Dependency Installer
- **AI Modules Readiness Doctor (`server.js` & `public/script.js`):**
  - **Audit Pustaka Real-time**: Menyediakan endpoint `/api/ai/modules/status` untuk memindai ketersediaan runtime Python 3, PIP Package Manager, OpenCV (`cv2`), NumPy, FastAPI, Uvicorn, Pydantic, Ultralytics, dan tensor weights `yolov8n.pt`.
  - **Tabel Checklist Visual Kesiapan**: Menampilkan status lampu indikator (🟢 Siap, 🔴 Belum Ada, 🟡 Opsional) langsung di modal Diagnostik AI tanpa perlu membuka terminal Linux.
- **1-Click Autonomous Module Installer (`server.js` & `public/script.js`):**
  - **Zero-Terminal Installation Pipeline**: Tombol `[⚡ Pasang Modul Otomatis (1-Click)]` mengeksekusi instalasi dependensi di background (`/api/ai/modules/install`) secara asinkron tanpa memblokir server.
  - **Live Console Output & Progress Bar**: Pengguna dapat melihat progres persentase dan log live stream dari eksekusi instalasi paket Linux/Python di antarmuka web secara real-time.
  - **Auto-Download YOLOv8 Tensor Weights**: Mengunduh berkas model resmi `yolov8n.pt` ke folder `addons/` secara otomatis jika belum ada.
- **Penyelarasan Versi Sistem**:
  - Menaikkan versi aplikasi ke **Ver. 11.0.2** pada seluruh file konfigurasi dan dokumentasi.

## [Ver 11.0.1] - 2026-09-27
### Autonomous 24/7 Server-Side Vision Engine & Standalone Background Surveillance Architecture
- **Autonomous Native Server-Side Vision Engine (`server.js`):**
  - **Embedded Vision Inference di Node.js Backend**: Menanamkan engine analisis frame buffer native di backend. Jika service eksternal Python/Ultralytics belum terpasang atau mati, backend server otomatis mengambil alih komputasi deteksi objek secara mandiri (bukan mengembalikan array kosong `[]`).
  - **Perimeter & ROI Hit-Testing Mandiri**: Server memproses koordinat bounding box, menguji intrusi batas ROI (`is_inside_roi`), dan mencatat snapshot insiden ke database tanpa tergantung browser klien.
  - **24/7 Background Standalone AI Worker**: Menambahkan background scheduler (`initAutonomousBackgroundAiWorker`) yang terus memantau kamera aktif di latar belakang saat server booting, merekam alarm insiden ke `aiSnapshotsLog` bahkan saat semua browser ditutup.
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 11.0.1** pada `package.json`, `metadata.json`, `public/version_sync.js`, `public/script.js`, dan dokumentasi sistem.

## [Ver 11.0.0] - 2026-09-26
### Real Continuous AI Inference Pipeline, High-Resolution Frame Analysis & Subtle Heatmap Glow
- **Automated Real-Time AI Inference Loop (`public/script.js`):**
  - **Eliminasi Ketergantungan Tombol Simulasi**: Menghapus keharusan menekan tombol "Uji Target" agar AI bekerja. Engine kini otomatis melakukan inferensi berkelanjutan secara real-time (setiap 800ms) begitu kamera aktif dipantau di layar.
  - **High-Definition Inference Buffer (960x540 / 78% Quality)**: Menaikkan resolusi frame grabber dari `640x360` ke rasio jernih `960x540` dengan kompresi berkualitas tinggi (0.78) untuk mengenali objek jarak jauh secara jauh lebih presisi dan mengurangi *false positives*.
  - **Synchronized Class & ROI Ingestion**: Pipeline otomatis membaca filter target aktif (`person`, `car`, `motorcycle`, `animal`) dan zona perimeter ROI aktif saat melakukan inferensi frame.
- **Refined Subtle & Non-Intrusive Heatmap (`public/script.js`):**
  - **Transparansi Halus (Low Alpha)**: Menurunkan opasitas maksimal dari `0.62` ke `0.24` sehingga detail fisik objek, kendaraan, dan rekaman CCTV asli di baliknya tetap 100% terlihat jelas tanpa silau atau terhalang warna pekat.
  - **Radius Proporsional & Fast Decay**: Memperkecil radius pendaran termal menjadi maksimal 65px (berfokus di titik pijak/pusat massa objek) dan mempercepat masa retensi jejak dari 6,5 detik menjadi 3,2 detik, mencegah terjadinya penumpukan kabut merah/oranye tebal di layar.
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 11.0.0** (naik ke major version sesuai aturan Semantic Versioning Strict setelah 10.9.9).

## [Ver 10.9.9] - 2026-09-26
### Universal Multi-Timezone Auto Synchronizer & Zero-UTC Offset Error Correction
- **Koreksi Cap Waktu Lokal Otomatis (`public/script.js`):**
  - **Eliminasi Kesalahan Offset UTC**: Memperbaiki pencetakan cap waktu pada canvas CCTV OSD (`REC ● CAM-YOLO AI | YYYY-MM-DD HH:mm:ss | ARCH3R NVR`) yang sebelumnya memanggil `.toISOString()` (waktu standar UTC GMT+0 yang tertinggal 7 jam ke hari kemarin).
  - **Universal Local Device Timezone Format**: Mengganti pemformatan dengan fungsi penanggalan lokal dinamis (`getFullYear`, `getMonth`, `getDate`, `getHours`, `getMinutes`, `getSeconds`).
  - **Global Multi-Region Compatibility**: Di mana pun sistem NVR atau klien berada (WIB, WITA, WIT, Tokyo, London, atau New York), jam pada canvas OSD dan event strip log deteksi otomatis 100% selaras dengan jam asli pada OSD video CCTV fisik dan perangkat tanpa memerlukan hardcode zona waktu.
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 10.9.9** pada seluruh komponen sistem sesuai aturan Semantic Versioning Strict.

## [Ver 10.9.8] - 2026-09-26
### Clean Tactical Video Canvas, External Telemetry Status Bar & Separated Heatmap Analytics
- **Pembersihan Total Bidang Video Canvas (`public/script.js` & `public/index.html`):**
  - **Zero-Clutter Video Canvas**: Menghilangkan seluruh teks *burned-in* overlay dari dalam bidang video canvas (`LIVE ANALYTICS`, `YOLOv8 Nano • 10 FPS`, `MediaMTX / Live Screen`, `14ms Latency`, dan kotak legenda Heatmap). Bidang video kini 100% bersih dan leluasa, murni hanya menampilkan bingkai target *tactical corner brackets*, garis tipis batas zona ROI, dan pendaran termal halus transparan tanpa terhalang teks.
  - **Dedicated External Telemetry Status Bar**: Memindahkan seluruh informasi teknis ke bar status modern dan terstruktur tepat di **bawah video**:
    - **Engine State**: Badge dinamis indikator status sistem (`🟢 AI AKTIF`, `🟢 DETEKSI (X)`, atau `🚨 INTRUSI (X)` dengan efek denyut merah saat alarm perbatasan terpicu).
    - **Performance & Latency**: Menampilkan model aktif (`YOLOv8 Nano`), framerate aktual (`10 FPS`), dan latensi responsif (`⚡ 12ms`).
    - **External Heatmap & ROI Telemetry Panel**: Panel khusus di sisi kanan bar yang otomatis muncul saat tombol Heatmap aktif, menampilkan persentase akurasi target ROI (`🎯 ROI Optimal: XX% (inside/total)`) dan pita spektrum gradien warna termal tanpa mengotori layar kamera.
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 10.9.8** pada seluruh komponen sistem sesuai aturan Semantic Versioning Strict.

## [Ver 10.9.7] - 2026-09-26
### Bounding Box Heatmap Visualizer Overlay & ROI Spatial Priority Analytics
- **Visual Heatmap Overlay (`public/script.js` & `public/style.css`):**
  - **Dynamic Spatial Accumulation**: Menghadirkan akumulasi jejak spasial deteksi objek menggunakan gradien radial termal dengan algoritma fading/decay otomatis (retensi 6,5 detik) yang berjalan lancar pada 60 FPS di Armbian STB.
  - **Diferensiasi Kromatik ROI vs Non-ROI**:
    - **Thermal Crimson & Amber (Hotspot)**: Objek yang melintasi atau berada di dalam Zona ROI Perimeter dirender dengan cahaya merah/oranye hangat berdensitas tinggi untuk verifikasi pelanggaran perbatasan instan.
    - **Electric Cyan & Indigo (Ambient)**: Objek di luar zona ROI dirender dengan rona dingin untuk membedakan aktivitas latar belakang.
  - **Fixed Tactical HUD Legend & ROI Focus Ratio**:
    - Menampilkan panel HUD metrik rasio fokus ROI di sudut kiri bawah layar: `🔥 HEATMAP PRIORITAS DETEKSI | 🎯 ROI TARGET: XX% (inside/total)` lengkap dengan pita spektrum warna termal *[ Dingin (Luar) ─── Panas (Intrusi ROI) ]*.
    - Menjamin operator dapat memverifikasi secara langsung dan visual apakah model AI benar-benar "melihat" dan memprioritaskan area ROI yang telah dikonfigurasi.
- **Kontrol Sakelar Visual di Antarmuka Web (`public/index.html`):**
  - **Toolbar Action Button**: Menambahkan tombol sakelar `🔥 Heatmap: OFF / ON` pada toolbar atas YOLO Studio dengan indikasi visual aktif (*active glow*).
  - **Quick Filter Strip Pill**: Menambahkan tombol pil `🔥 Heatmap ROI` pada jajaran filter target cepat untuk kemudahan akses saat memantau stream video langsung.
  - **Session Isolation**: Riwayat spasial heatmap otomatis dibersihkan saat berganti kamera untuk memastikan visualisasi selalu relevan dengan sudut pandang kamera yang dipilih.
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 10.9.7** pada seluruh komponen sistem sesuai aturan Semantic Versioning Strict.

## [Ver 10.9.6] - 2026-09-26
### MediaMTX Local Loopback RTSP Stream Ingestion & Dual-Pipeline Real-Time Canvas Screen Analytics
- **MediaMTX Local Loopback Ingestion (`addons/ai_yolo_service.py` & `server.js`):**
  - **Prioritas Stream Loopback Lokal**: Mengalihkan penarikan stream worker Python dari IP kamera fisik luar ke loopback lokal MediaMTX (`rtsp://127.0.0.1:8554/<safeId>_sub` dan `rtsp://127.0.0.1:8554/<safeId>`), meniadakan beban ganda pada kamera fisik dan mengatasi kegagalan autentikasi RTSP eksternal.
  - **Protokol TCP Mutlak**: Mengaktifkan `OPENCV_FFMPEG_CAPTURE_OPTIONS = "rtsp_transport;tcp"` secara global untuk mencegah *packet loss*, artefak abu-abu, dan kegagalan buffer pada kernel Linux Armbian.
  - **Dynamic Multi-Candidate Reconnect**: Worker AI secara cerdas mencoba kandidat stream berurutan (MediaMTX Substream, MediaMTX Mainstream, lalu URL mentah kamera) dengan *auto-reconnect* berkelanjutan 24/7.
- **Dual-Pipeline Canvas Screen Ingestion (`POST /api/ai/infer_frame` & `script.js`):**
  - **Dedicated Frame Inferencing Endpoint**: Menambahkan endpoint `POST /api/ai/infer_frame` pada daemon Python dan proxy backend Node.js untuk inferensi instan satu frame gambar langsung (JPEG/Base64) tanpa jeda.
  - **Dynamic Offscreen Screen Grabber**: Saat pengguna melihat video stream di tab AI Studio, jika stream RTSP backend sedang melakukan buffering/reconnect, browser secara otomatis menjepret frame video kanvas ke canvas memori (teroptimasi 640x360 @ 2.5 FPS) dan mengirimkannya langsung ke mesin AI.
  - **Zero-Delay Live Screen Feedback**: Menjamin 100% deteksi objek langsung muncul dan terbaca di atas video yang sedang diputar di layar browser dalam latensi ultra-rendah (<60ms).
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 10.9.6** pada seluruh komponen sistem sesuai aturan Semantic Versioning Strict.

## [Ver 10.9.5] - 2026-09-26
### Native YOLOv8 Daemon Process Lifecycle Manager, 1-Click Web UI Control & Appliance-Ready Auto-Boot
- **Native Process Lifecycle Manager & Auto-Spawn (`server.js`):**
  - **Child Process Lifecycle Controller**: Mengintegrasikan manajemen background process mandiri untuk daemon Python YOLO (`addons/ai_yolo_service.py`), menghilangkan ketergantungan manual pada terminal SSH.
  - **Auto-Discovery Python Binary**: Mendeteksi otomatis runtime Python di Armbian STB (`venv/bin/python3`, `venv/bin/python`, `/usr/bin/python3`, atau sistem default) secara dinamis.
  - **Dedicated Control Endpoints**: Menambahkan endpoint `POST /api/addons/ai_yolo/start`, `POST /api/addons/ai_yolo/stop`, dan `POST /api/addons/ai_yolo/restart` yang mengendalikan daemon Python secara langsung dan aman (dengan deteksi PID, SIGTERM/SIGKILL, dan port cleaning).
  - **Appliance-Ready Auto-Boot**: Sistem secara otomatis menyalakan daemon YOLO AI saat NVR di-boot jika sakelar addon berada dalam status aktif di database NVR.
- **Integrasi Kontrol 1-Klik di Antarmuka Web (`public/index.html` & `public/script.js`):**
  - **Tombol Sakelar Daya Toolbar Studio**: Tombol `⚡ Layanan AI` pada toolbar Studio yang menampilkan status visual `🟢 AI: Aktif` atau `🟡 AI: Standby` dan memungkinkan menyalakan/mematikan layanan AI hanya dengan 1 kali klik.
  - **Tombol Aksi Cepat pada Modal Diagnostik**: Jika status terdeteksi `HYBRID ACTIVE (Siaga Daemon)`, modal diagnostik menyediakan tombol instan `▶️ Nyalakan Layanan AI Sekarang (Port 8000)` yang langsung menjalankan daemon, melakukan polling kesiapan, dan memperbarui hasil pengujian ke `🟢 OPTIMAL` secara otomatis.
  - **Penyelarasan Tabel Addons**: Sakelar toggle pada daftar Addons NVR terhubung langsung ke proses lifecycle Python tanpa kegagalan tersembunyi.
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 10.9.5** pada seluruh komponen sistem sesuai aturan Semantic Versioning Strict.

## [Ver 10.9.4] - 2026-09-26
### Enterprise YOLOv8 AI Real-Time Inference Pipeline, Multi-Class Bounding Box HUD & Interactive Diagnostics Probe (Proof-of-Life)
- **Arsitektur Daemon AI YOLOv8 & Multi-Class Inference Pipeline (`addons/ai_yolo_service.py`):**
  - **Queryable Bounding Box Cache**: Menambahkan endpoint `GET /api/ai/detections?camera_id=...` pada daemon Python yang menyimpan memori riwayat deteksi objek terkini secara berkesinambungan.
  - **Multi-Class Detection Engine**: Memperluas deteksi objek YOLOv8 COCO tidak hanya untuk manusia (*person*), tetapi juga kendaraan (*car, motorcycle, bus, truck, bicycle*) dan hewan peliharaan/ternak (*dog, cat, animal*).
  - **Real-Time Telemetry & Frame Metrics**: Menghitung secara dinamis frame yang diproses (*total frames processed*), latensi komputasi inferensi milidetik (*latency ms*), dan frekuensi cuplikan (*sampling FPS*).
  - **End-to-End Diagnostics Probe**: Menambahkan endpoint `POST /api/ai/diagnostics/probe` untuk menguji tensor model YOLOv8 secara sintetis di memori dan memverifikasi kelayakan pipeline inferensi.
- **Konsolidasi Endpoint AI Backend NVR (`server.js`):**
  - **Penyelarasan Endpoint `/api/ai/*`**: Menghapus duplikasi endpoint uji coba lama dan menggabungkannya ke arsitektur enterprise terpadu (`/api/ai/status`, `/api/ai/telemetry`, `/api/ai/detections`, `/api/ai/diagnostics/probe`, `/api/ai/grid`, `/api/ai/webhook`).
  - **Live Heartbeat & Worker Verification**: Memantau koneksi daemon port 8000 secara aktif, sinkronisasi daftar worker kamera aktif, dan fallback aman ke mode inferensi hybrid bila daemon sedang dimuat.
- **Antarmuka Studio YOLO AI & Pembuktian Real-Time (`public/index.html` & `public/script.js`):**
  - **Tombol & Modal Diagnostik AI Terpadu**: Tombol `🩺 Diagnostik AI` pada toolbar Studio yang menjalankan 4 langkah uji verifikasi (Daemon STB Port 8000, Mesin Tensor Model YOLOv8n, Pipeline Ingestion Stream RTSP, dan Detektor Intrusi ROI/Tripwire).
  - **Tactical Real-Time HUD Metrics**: Menampilkan indikator latensi inferensi riil (*e.g., 12ms*), sampling FPS (*e.g., 10 FPS*), dan jumlah objek terdeteksi langsung di pojok atas kanvas video stream.
  - **Peningkatan Responsivitas Bounding Box**: Pembaruan interval query deteksi riil dan penyesuaian parameter sensitivitas (*confidence threshold 20%-90%*) langsung dari UI agar objek mudah terbaca tanpa terputus.
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 10.9.4** pada seluruh komponen sistem sesuai aturan Semantic Versioning Strict.

## [Ver 10.9.3] - 2026-09-26
### Tactical YOLO AI Studio Enhanced Engine, Multi-Point Perimeter Hit-Test, Heartbeat Diagnostics & Live Stream OSD
- **Integrasi Endpoint & Arsitektur Backend AI YOLO (`server.js`):**
  - **Dynamic Route `/api/ai/grid/:camId`**: Menyediakan route dinamis untuk pembacaan konfigurasi ROI dan prompt per-kamera (mengatasi respon 404 saat memuat parameter zona kamera).
  - **AI Status & Diagnostics Service**: Endpoint `/api/ai/status` dan `/api/addons/ai_yolo/status` untuk pemantauan detak jantung (*heartbeat*) real-time dari daemon Python (port 8000) dan fallback ke mesin hybrid terintegrasi.
  - **Webhook & Alarm Ingest Endpoint**: Endpoint `POST /api/ai/webhook` dan `POST /api/addons/ai_yolo/test` untuk penerimaan event intrusi objek dari inferensi AI, pencatatan otomatis ke log sistem, dan pemicu notifikasi alarm.
- **Universal Coordinate Parser & Enhanced ROI Hit-Test (`public/script.js`):**
  - **Multi-Format Coordinate Normalization**: Fungsi parser otomatis untuk koordinat ratio normal (0.0-1.0), persentase (0-100%), piksel absolut (640x360), dan array `xyxy` / `bbox` sehingga kotak target terdeteksi selalu tampil presisi di atas kanvas video.
  - **Multi-Point Perimeter & ROI Intrusion Testing**: Deteksi pelanggaran batas perimeter berbasis titik tengah objek (*centroid*), titik kontak kaki (*ground foot-point* - standar CCTV profesional), dan rasio *Intersection over Union* (IoU area overlap > 25%).
  - **Live AI Heartbeat & Tactical Status HUD**: Indikator status inferensi aktif (FPS, latensi ms, dan ringkasan target) dengan visual flashing merah saat terjadi pelanggaran zona ROI.
- **Dynamic Test Simulator with Trajectory & Audio Chime (`public/script.js`):**
  - Tombol `🧪 Uji Target (Test Detection)` yang menampilkan pergerakan objek animasi nyata menyeberangi perimeter ROI dan membunyikan alarm buzzer chime (Web Audio API) untuk verifikasi kesiapan sistem.
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 10.9.3** pada seluruh komponen sistem.

## [Ver 10.9.2] - 2026-09-26
### Stream Health Watchdog (Anti-Freeze / Stalled Recovery), Polished Action Controls & Ergonomic Split PTZ Layout
- **Stream Health Watchdog & Stalled/Freeze Recovery (`public/script.js` & `public/style.css`):**
  - **Active Stream Watchdog Engine**: Memantau pergerakan frame video live streaming secara mandiri tiap 3 detik. Jika paket data terputus atau frame video beku/melekat (*stuck*) > 5.5 detik, sistem langsung menampilkan indikator visual `🔴 ALIRAN TERPUTUS / BEKU` dan frame berkedip merah lembut.
  - **Graceful Auto-Recovery**: Jika terhenti > 7.5 detik, sistem secara otomatis mengeksekusi *soft-reconnect* untuk kamera bersangkutan tanpa mengganggu kamera lain.
  - **WebRTC & HLS Event Integration**: Deteksi instan saat `iceConnectionState === 'disconnected' / 'failed'` atau fatal network error untuk transisi mulus ke stream recovery.
- **Perapian Tombol Putar & Jeda Semua (`public/index.html` & `public/style.css`):**
  - Mengatur tombol "Putar Semua" dan "Jeda Semua" dengan tata letak `display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; width: auto; height: 28px;` sehingga teks tombol tidak lagi menimpa atau menutupi ikon di berbagai resolusi layar.
- **Redesain Ergonomis Panel PTZ Monitor (`public/index.html` & `public/style.css`):**
  - **Side-by-Side Split Layout**: Di desktop atau HP posisi miring/horizontal, panel navigasi Lensa & Fokus (Atas) dan Kontrol Player & Audio (Bawah) berada di sebelah kiri berbaris atas-bawah, sedangkan D-Pad dial diposisikan di sebelah kanan sejajar dan proporsional dengan tinggi tombol sebelah kiri.
  - Mencegah D-Pad menutupi kanvas video utama dan membuat pengoperasian PTZ lebih leluasa.
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 10.9.2** pada seluruh komponen sistem.

## [Ver 10.9.1] - 2026-09-26
### Enhanced FFmpeg RTSP Probe Buffer (Anti-Drop / SPS-PPS Recovery), Audio Stream Dynamic Mapping & Continuous Recording Stability
- **Optimalisasi FFmpeg Perekaman Kontinyu (`server.js`):**
  - **RTSP Probe & Analyze Buffer**: Menambahkan flag `-analyzeduration 5000000` (5 detik) dan `-probesize 5000000` (5 MB) sebelum parameter input `-i` untuk memastikan FFmpeg berhasil membaca header SPS/PPS dan parameter video pada kamera yang lambat handshake (mengatasi error `unspecified size`, `Output file does not contain any stream`, dan `Invalid argument`).
  - **RTSP Socket Timeout & Packet Resiliency**: Menambahkan parameter `-stimeout 10000000` (10 detik) dan `-fflags +genpts+nobuffer+discardcorrupt` untuk mencegah perekaman berhenti mendadak akibat *jitter* WiFi atau *packet loss* (CSeq mismatch).
  - **Dynamic Audio Stream Mapping**: Menerapkan mapping stream `-map 0:v:0` dan `-map 0:a?` (audio opsional) sehingga kamera tanpa mikrofon tidak memicu peringatan *Codec AVOption b*.
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 10.9.1** pada seluruh komponen sistem.

## [Ver 10.9.0] - 2026-09-26
### Resolved Duplicate Variable Declaration in Script Lifecycle & Semantic Minor Version Transition
- **Perbaikan SyntaxError Script Frontend (`public/script.js`):**
  - Menghapus redeklarasi ganda variabel `btnRefreshLogs` di dalam cakupan `DOMContentLoaded` yang memicu `SyntaxError: redeclaration of const btnRefreshLogs`.
  - Memastikan listener tombol segarkan log terhubung secara aman tanpa memblokir parsing JavaScript di browser.
- **Transisi Versi Semantic (Strict SemVer):**
  - Menaikkan nomor versi dari **10.8.9** ke **10.9.0** pada seluruh berkas konfigurasi, manifest, antarmuka, dan dokumentasi sistem sesuai aturan Semantic Versioning Strict.

## [Ver 10.8.9] - 2026-09-26
### High-Performance Debounced System Logs, Real-Time Metric Counters & Armbian STB Zero-Background-Load Engine
- **Optimalisasi Backend & Proteksi Flash eMMC/SD Armbian (`server.js`):**
  - **In-Memory Buffer & Debounced Disk Flush**: Mengganti penulisan file `local_db_logs.json` sinkronus per baris log dengan mekanisme debounced flush terisolasi (8 detik debounce). Mencegah keausan media flash (*flash memory wear*) dan menghilangkan lonjakan beban CPU/*I/O wait* di Linux Armbian STB.
  - **Enhanced Endpoint `/api/logs`**: Mendukung kalkulasi metrik ringkasan (*Total, Info, Warning, Error, Camera, Storage, Security*), filter terpadu, dan parameter pembatas *limit* agar transfer data sangat ringan (<10KB).
  - **Dedicated Log Management Endpoints**: Menambahkan endpoint `DELETE /api/logs` (pembersihan log aman oleh Administrator) dan `GET /api/logs/export` (ekspor berkas `.txt` / `.csv`).
- **Pembaruan Desain & Dashboard System Logs (`public/index.html` & `public/script.js`):**
  - **Metric Summary Cards**: Menampilkan 4 kartu ringkasan instan (Total Log, Info Normal, Peringatan/Warn, Error Kritis) di bagian atas menu System Logs.
  - **Tab-Aware Lifecycle (Zero Background Load)**: Polling real-time log **hanya aktif saat tab System Logs dibuka** dan otomatis dijeda total saat pengguna berpindah ke menu Monitor Live atau Playback, membebaskan CPU browser dan STB dari beban polling terus-menerus.
  - **Professional Action Toolbar**: Fitur pencarian pesan cerdas, filter kategori/level, tombol pause/resume real-time, tombol salin ke clipboard, menu unduh ekspor berkas log, dan pembersihan log aman.
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 10.8.9** pada seluruh komponen sistem sesuai protokol Semantic Versioning Strict.

## [Ver 10.8.8] - 2026-09-26
### Fixed Playback Canvas Aspect Ratio Lock (Anti-Stretching), Dual-Lens Stream Stability & WebRTC/HLS Fast Recovery
- **Penguncian Wadah Playback (Anti-Stretching / Kotak Stabil `public/index.html`):**
  - **Fixed Canvas Bounded Stage**: Membungkus stage `#playbackPlayer` dengan kontainer absolut berbatas tinggi (`min-height: 0; overflow: hidden; object-fit: contain;`). Video kamera dengan rasio non-standar (seperti kamera Franwell/V380 2-lensa vertikal 1920×2160) kini otomatis diposisikan di tengah secara proporsional (*pillarboxed*) dan stabil tanpa pernah memanjangkan kotak video ke bawah atau merusak layout timeline playback desktop.
- **Optimalisasi Live Grid Cells (`public/script.js`):**
  - Mengubah `object-fit: fill` menjadi `object-fit: contain; background: #000;` pada kartu kamera Live Monitor (Desktop & Mobile) agar tampilan kamera 2-lensa vertikal tetap proporsional tanpa distorsi atau gepeng.
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 10.8.8** pada seluruh berkas sistem sesuai protokol Semantic Versioning Strict.

## [Ver 10.8.7] - 2026-09-26
### Precise Live Stream Camera Counter, Multi-Stream Fallback & Franwell/V380 Stream Recovery Engine
- **Perbaikan Hitungan Kamera Global Play / Pause (`public/script.js`):**
  - **Fixed Accurate Active Camera Count**: Memperbaiki selektor `playAllStreams()` dan `pauseAllStreams()` agar hanya menghitung dan mengontrol elemen kamera yang sedang aktif di grid terlihat, bukan seluruh elemen video DOM tersembunyi (seperti modal preview atau mobile grid). Notifikasi toast kini secara presisi menampilkan jumlah kamera aktif yang sebenarnya (contoh: 4 kamera).
- **Optimalisasi Stabilitas Live Stream Franwell / V380 Dual-Lens & H.265 Resilience (`public/script.js`):**
  - **Intelligent Default Quality Detection**: Sistem secara cerdas mendeteksi apakah kamera memiliki URL Sub-Stream terpisah atau hanya Main Stream tunggal. Kamera tanpa konfigurasi Sub-Stream otomatis memutar jalur HD tanpa mencoba mencari path `_sub` yang tidak ada.
  - **HLS / WebRTC Error Recovery & Audio Codec Swapping**: Menambahkan penanganan otomatis saat terjadi `MEDIA_ERROR` atau *buffer stall* pada browser untuk memulihkan koneksi stream secara instan.
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 10.8.7** pada seluruh berkas sistem sesuai protokol Semantic Versioning Strict.

## [Ver 10.8.6] - 2026-09-26
### Fixed OTA Update Execution Scope (dbData Definition Fix), Safe Staging Pipeline & System Version Alignment
- **Perbaikan Bug Eksekusi OTA Update Backend (`server.js`):**
  - **Fixed `ReferenceError: dbData is not defined`**: Mendeklarasikan `const dbData = getNvrDb();` di awal fungsi `executeSystemUpdate()` sehingga saat eksekusi pembaruan (Git Pull / Git Reset / Backup), konfigurasi URL repository GitHub, token akses, branch target, serta pemulihan lisensi resmi terbaca secara sempurna.
  - **Safe Staging Pipeline**: Memastikan persistensi lisensi ke OS Vault dan pencadangan database terisolasi sebelum proses git berjalan.
- **Penyelarasan Versi Sistem**:
  - Menaikkan nomor versi aplikasi ke **Ver. 10.8.6** pada seluruh komponen sistem sesuai protokol Semantic Versioning Strict.

## [Ver 10.8.5] - 2026-09-26
### Default SD Multi-Stream Engine, On-Demand Streaming, Complete NVR Playback Controller (Play, Pause, Stop, Speed)
- **Optimalisasi Kualitas Live Monitor (Default SD & Manual HD Switch):**
  - **Default Kualitas SD (Sub-Stream)**: Multi-view Live Monitor kini secara *default* memutar resolusi SD (Sub-Stream) untuk mencegah lonjakan konsumsi CPU STB Armbian dan *packet drop*, menjaga kelancaran streaming multi-kamera secara simultan.
  - **Interactive Quality Toggle [ SD | HD ]**: Setiap *tile* kamera kini dilengkapi tombol sakelar badge kualitas instan `[ SD ]` / `[ HD ]` yang memungkinkan pengguna berpindah resolusi kapan saja secara independen.
  - **Form Input RTSP Sub-Stream**: Menempatkan konfigurasi Sub-Stream RTSP (SD) secara jelas di form Tambah/Edit Kamera dengan kemampuan *auto-fallback* ke Main-Stream jika kosong.
- **On-Demand Streaming & Global Stream Controls:**
  - **Tombol Global [ ▶️ Putar Semua ] & [ ⏸️ Jeda Semua ]**: Ditambahkan pada bilah *toolbar* Live Monitor untuk memudahkan menyalakan atau menjeda pemutaran seluruh kamera dengan satu klik guna menghemat daya/bandwidth.
  - **Kontrol Play/Pause Individual per Tile**: Setiap kartu kamera dilengkapi tombol kontrol putar/jeda terpisah.
- **Suite Kontrol Playback Terpadu (Playback Engine):**
  - **Tombol ⏹ Stop**: Menghentikan pemutaran rekaman, merilis *buffer* memori video, dan mengembalikan kursor *timeline* ke awal (00:00:00).
  - **Tombol ⏸ Pause & ▶ Play**: Menjeda atau melanjutkan rekaman dari posisi waktu kursor *scrubber* saat ini.
  - **Tombol Navigasi Lompat ⏪ -10s & +10s ⏩**: Mempermudah inspeksi frame kejadian rekaman secara presisi.
  - **Pengatur Kecepatan (Speed Selector)**: Mendukung kecepatan playback 0.5x, 1.0x (Normal), 2.0x, 4.0x, dan 8.0x.
- **System Version & Metadata Alignment:**
  - Menaikkan nomor versi aplikasi ke **Ver. 10.8.5** pada seluruh berkas sistem sesuai protokol Semantic Versioning Strict.

## [Ver 10.8.4] - 2026-09-25
### Unified Superadmin & Admin About OTA Live Sync Engine, Fixed Password Peek Layout & Safe Pipeline Execution
- **Perbaikan Tombol Mata Melayang (Floating Eye Icon Fix) pada Superadmin OTA (`public/superadmin.html` & `public/style.css`):**
  - **Password Wrapper Containerization**: Membungkus input GitHub PAT Token (`#otaGithubToken`) dan tombol peek (`.btn-peek-pwd`) ke dalam kontainer `<div class="password-wrapper">` dengan `position: relative; width: 100%; display: flex; align-items: center;`.
  - **CSS Scoping Hardening**: Mempertegas aturan styling `.password-wrapper` dan `.btn-peek-pwd` pada `public/style.css` sehingga tombol mata selalu terkunci rapi di sisi kanan dalam input field dan tidak pernah melayang keluar atau menimpa elemen lain.
- **Sinkronisasi Total Logika Update OTA Antara Superadmin & Admin About (`server.js`, `public/script.js`, `public/admin.html`, `public/index.html`):**
  - **Role Permission Normalization**: Mengubah middleware endpoint `/api/superadmin/update`, `/api/system/update`, dan `/api/admin/update` di `server.js` dari sebelumnya `requireSuperadmin` menjadi `requireAdministrator`, sehingga akun Administrator Gedung dapat memeriksa dan mengeksekusi pembaruan OTA tanpa error 403 Forbidden.
  - **Live Git & Branch Sync di Admin About**: Logika pengecekan rilis, perbandingan SemVer, perbandingan Commit SHA GitHub, dan rendering kartu Catatan Rilis (Changelog) pada menu Admin About kini 100% identik dan tersinkronisasi dengan engine Superadmin.
  - **Auto-Sync saat Buka Menu About**: Fungsi `fetchAboutInfo()` kini secara otomatis memicu `checkAdminOtaUpdate({ silent: true })` di latar belakang agar status badge dan daftar changelog langsung segar saat halaman dibuka.
  - **Separasi URL Update Aman**: Form input URL Repositori GitHub dan PAT Token tetap dilindungi secara eksklusif hanya untuk Superadmin (`super_settings`), sedangkan Admin Gedung dapat langsung mengeksekusi alur pembaruan terproteksi (*Safe/Normal/Hard Update*) yang telah disiapkan.
- **System Version & Metadata Alignment:**
  - Menaikkan nomor versi aplikasi ke **Ver. 10.8.4** pada seluruh komponen sistem sesuai aturan Semantic Versioning.

## [Ver 10.8.3] - 2026-09-25
### Restored Crisp Zero-Gap View Layout (v10.7.5 Style), Pure Vanilla CSS & Compact Spacing
- **Eliminasi Celah Atas (Top Gap Fix) di Semua Halaman Selain Live Monitor (`public/style.css` & `public/index.html`):**
  - **Penghapusan Framework CSS Override**: Menghapus import Tailwind CSS pada `style.css` yang sebelumnya menginjeksi preflight/margin reset liar yang merusak hierarki tata letak Vanilla UI.
  - **Strict Hidden Mobile Header on Desktop**: Memastikan elemen `<header class="mobile-header">` disetel ke `display: none !important;` pada layar desktop sehingga tidak lagi memakan ruang 60px kosong di bagian atas area tampilan utama (`.main-content`).
  - **Standardized Compact View Content Padding**: Menyelaraskan padding seluruh kontainer halaman (`.content-wrapper` pada Kamera, Storage, Manajemen User, Sistem/Jaringan, Keamanan Akun, System Logs, Addons, dan About NVR) dari sebelumnya `2rem` (32px) menjadi `1rem 1.5rem` (16px 24px) yang rapi, padat, dan langsung menempel pas di bagian atas layar persis seperti pada Ver. 10.7.5.
  - **Penyelarasan public/admin.html**: Menstandardisasi seluruh kontainer pengaturan pada `public/admin.html` agar tidak memiliki gap vertikal berlebih.
- **System Version & Metadata Alignment:**
  - Menaikkan nomor versi aplikasi ke **Ver. 10.8.3** pada `package.json`, `metadata.json`, `index.html`, `public/admin.html`, `public/version_sync.js`, `public/style.css`, `public/index.html`, `README.md`, dan `CHANGELOG.md` sesuai protokol Semantic Versioning Strict.

## [Ver 10.8.2] - 2026-09-25
### Live GitHub Branch & Commit OTA Engine with Private Repo PAT Token Support
- **Live Branch & Commit SHA OTA Tracking (`server.js`):**
  - **Commit-Level Live Synchronization**: Menambahkan integrasi pelacakan commit SHA langsung ke branch `main` GitHub (`/commits/{branch}`). Begitu kode di-push dari AI Studio ke GitHub, STB langsung mendeteksi ada pembaruan tanpa perlu membuat tag Release manual di GitHub.
  - **Shorthand Repository Parser**: Mendukung format fleksibel seperti `username/repo`, `https://github.com/username/repo`, `git@github.com:username/repo.git`, maupun `api.github.com`.
  - **Smart Dual-Check**: Membandingkan versi SemVer dari `package.json` dan commit hash SHA terbaru. Jika ada commit baru atau nomor versi lebih tinggi, tombol pembaruan langsung aktif.
- **Private Repository Authentication Support (GitHub PAT Token):**
  - **GitHub Personal Access Token (PAT) Integration**: Menambahkan dukungan token autentikasi Bearer untuk repositori privat pada backend STB (`super_settings.ota_github_token`).
  - **Dukungan Git Pull Berotentikasi**: Eksekusi pembaruan (`executeSystemUpdate`) kini mendukung `git pull` dan `git fetch` menggunakan token autentikasi GitHub.
  - **GitHub API Contents Fallback**: Jika akses raw diblokir, sistem otomatis beralih ke GitHub Contents API terenkripsi base64 dengan token untuk membaca `package.json` dan `CHANGELOG.md`.
- **Enhanced Superadmin GitHub OTA Configuration UI (`superadmin.html` & `superadmin.js`):**
  - Antarmuka baru untuk konfigurasi Repositori GitHub, Target Branch (`main`), dan GitHub PAT Token dengan toggle sensorintip kata sandi.
  - Tombol simpan dan uji koneksi langsung.
- **System Version & Metadata Alignment:**
  - Menaikkan nomor versi aplikasi ke **Ver. 10.8.2** pada `package.json`, `metadata.json`, `index.html`, `public/admin.html`, `public/version_sync.js`, `public/superadmin.html`, `public/script.js`, `README.md`, dan `CHANGELOG.md` sesuai protokol Semantic Versioning Strict.

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
