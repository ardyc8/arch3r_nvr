# ⚡ Arch3r NVR (Ver. 9.7.4)
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
- **[Ver 9.7.4]**
  - **Fixed Camera Title Centering**: Label nama kamera pada grid live view kini diposisikan secara presisi di tengah (*horizontal center*) dengan efek *pill badge* yang elegan.
  - **Fixed Camera Channel Dropdown**: Memperbaiki fungsi `populateChannelDropdown` dan mendefinisikan `populateCameraSelects` secara komprehensif sehingga seluruh dropdown kamera (CH1, CH2, dst.) selalu terisi daftar kamera aktif tanpa terjadi *ReferenceError*.
  - **Fixed Fullscreen Button Layout**: Menyesuaikan layout toolbar monitor (`.nvr-toolbar-strip`, `topControlPanel`) agar responsif dengan `flex-wrap: wrap` dan `box-sizing: border-box`, mencegah tombol layar penuh melebihi lebar tampilan UI.

---

**© 2026 Arch3r Development.** *Professional Armbian STB NVR System.*
