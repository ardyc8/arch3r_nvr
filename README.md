# ⚡ Arch3r NVR (Ver. 9.7.9)
**Sistem Network Video Recorder (NVR) Multi-Tenant Khusus Armbian STB**

Arch3r NVR adalah sistem manajemen kamera pengawas (CCTV/IP Camera) kelas profesional yang dirancang khusus agar dapat berjalan mulus di atas perangkat Set Top Box (STB) Android yang telah di-flash menjadi Linux Armbian. Sistem ini menggunakan arsitektur *WebRTC* dan *HLS* berlatensi sangat rendah, dilengkapi dengan manajemen partisi USB/HDD, dan *Developer Console* (Superadmin).

---

## 🌟 Fitur Unggulan

- **🚀 Ringan & Mandiri**: Berjalan mulus di RAM 1GB - 2GB khas STB (Amlogic, Rockchip, Allwinner) tanpa membebani CPU karena menggunakan metode perekaman *-c:v copy* (tanpa re-encode).
- **🌐 Dual-Mode Streaming**: 
  - **WebRTC** untuk pantauan (Live View) *Real-time* nyaris tanpa delay (0.5 detik).
  - **HLS** untuk fallback pada peramban/jaringan yang lambat.
- **💾 Storage Management Pintar**: Otomatis mendeteksi Flashdisk / Hardisk Eksternal yang dicolok ke STB. Mendukung sistem *Retention* (penghapusan rekaman usang otomatis ketika ruang penyimpanan nyaris penuh).
- **👥 Sistem Hierarki Keamanan Multi-Tenant**:
  1. **Superadmin (Developer/Root)**: Penguasa sistem (Pemegang Lisensi).
  2. **Administrator (Pemilik Tempat)**: Bisa mengatur kamera & storage.
  3. **User (Klien/Karyawan)**: Hanya bisa memantau (View-only).
- **🔍 Auto-Discovery (ONVIF)**: Pencarian IP Kamera otomatis di dalam satu jaringan WiFi/LAN tanpa repot mengetikkan IP satu per satu (didukung modul `node-onvif`).
- **🛡️ Tanpa Backdoor**: Sistem dipaksa murni, tidak ada akun default publik yang berbahaya.

---

## 🛠️ Persyaratan Sistem (Prerequisites)

1. Perangkat STB dengan OS Linux **Armbian / Ubuntu Server**.
2. **Node.js** terinstal (minimal versi 18+).
3. Terhubung ke internet (Untuk proses instalasi awal).

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
- `/public/` : Antarmuka Web (UI/UX) untuk diakses via browser.
- `/data/nvr_db.json` : Database lokal yang menampung data kamera & pengguna. *(Otomatis terbuat saat aplikasi jalan)*.
- `/data/storage.json` : Konfigurasi jalur penyimpanan (Mount Point) Hardisk/USB.
- `/install.sh` : Script instalasi ajaib satu-pintu.

---

## 📜 Log Pembaruan (Changelog)
- **[Ver 9.7.9]**
  - **Fixed 4x4 Grid Fullscreen Landscape Distortion**: Memperbaiki pembagian template baris dan kolom pada layout grid (`.video-grid.grid-16`, `grid-9`, `grid-4`, `grid-1`) dengan `grid-template-rows: repeat(N, minmax(0, 1fr))` dan `min-height: 0` / `min-width: 0` pada `.cam-cell`. Kotak video pada mode layar penuh 4x4 landscape kini terbagi rata dan proporsional sempurna tanpa ada baris yang gepeng atau terjepit.
  - **Translucent Subtle Watermark for Camera Names**: Mengubah tampilan nama kamera di dalam kotak video menjadi watermark semi-transparan (`rgba(0, 0, 0, 0.42)`) dengan *subtle backdrop blur* dan border halus di pojok kiri atas. Nama kamera kini tidak menutupi rekaman video dan tampak seperti *On-Screen Display (OSD)* standar kamera pengawas profesional.
  - **Unified Version & Metadata Alignment**: Memperbarui nomor versi aplikasi ke **Ver. 9.7.9** di seluruh tampilan UI, login card, sidebar profil, mobile header, komentar skrip, dan metadata sistem.

- **[Ver 9.7.8]**
  - **Fullscreen Gear Setting Button Relocation**: Tombol gerigi/pengaturan (`⚙️`) pada mode layar penuh (*Fullscreen*) kini diposisikan secara presisi tepat di bawah kotak semua video monitor (`#videoGridContainer`) dalam baris bilah kontrol khusus yang bersih, menggantikan posisi melayang lama di sudut kanan bawah.
  - **PTZ Control Panel Responsive Architecture**: Menata ulang struktur kartu Kontrol PTZ & Player dalam mode biasa/landscape:
    1. *Baris Atas (Horizontal Parallel)*: Panel **🔍 LENSA & FOKUS** (Zoom +, Focus +, Zoom -, Focus -) dan panel **🎬 KONTROL PLAYER & AUDIO** (Play/Pause, Kualitas HD/SD, Snapshot 📸, Slider Volume 🔊, Audio Mute 🔇) diletakkan sejajar secara horizontal dan adaptif/responsif.
    2. *Baris Bawah (Center)*: Dial joystick **D-Pad Sirkular** (▲, ◀, Stop ■, ▶, ▼) diletakkan di bagian tengah bawah (*bottom center*) secara simetris dan rapi.
  - **Unified Version & Metadata Alignment**: Memperbarui nomor versi aplikasi ke **Ver. 9.7.8** di seluruh tampilan UI, login card, sidebar profil, mobile header, dan metadata sistem.

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
