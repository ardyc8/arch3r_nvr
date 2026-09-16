# Changelog

Semua perubahan yang signifikan pada proyek ini akan didokumentasikan di file ini.

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
