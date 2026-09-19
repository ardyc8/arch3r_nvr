# Changelog

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
