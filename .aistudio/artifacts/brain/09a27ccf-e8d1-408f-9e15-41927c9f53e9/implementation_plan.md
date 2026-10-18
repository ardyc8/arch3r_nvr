# Revisi Rencana: Diagnostik Cloudflare Tunnel DOWN & Informasi IP Jaringan Server NVR

Menyelesaikan kendala Cloudflare Tunnel yang berstatus **DOWN** pada STB Armbian / CasaOS (sementara Tailscale berjalan normal), serta menambahkan informasi komprehensif mengenai alamat IP server, Subnet Mask, MAC Address, URL akses port 3000, dan interface Default Gateway internet pada Web Dashboard Arch3r NVR.

---

## 🔍 Analisis Mendalam: Mengapa Cloudflare Tunnel DOWN tapi Tailscale Bisa?

Tailscale dan Cloudflare Tunnel bekerja dengan arsitektur yang sangat berbeda di level kernel Linux dan protokol transport:

| Parameter | Tailscale (Berhasil) | Cloudflare Tunnel / `cloudflared` (Gagal / DOWN) |
| :--- | :--- | :--- |
| **Protokol Transport** | WireGuard (UDP terenkripsi peer-to-peer / DERP relay) | Default menggunakan **QUIC (UDP port 7844)** |
| **Penanganan Firewall ISP** | Lolos karena paket UDP Tailscale dinamis & adaptif | **Sering diblokir / di-drop oleh ISP Indonesia** (Indihome/Telkom/dll) pada port UDP 7844 |
| **Ketergantungan DNS** | Menggunakan MagicDNS internal Tailscale | Sangat bergantung pada DNS publik untuk resolve `*.argotunnel.com` |
| **Target Service** | Mengakses langsung IP virtual STB (`100.x.y.z`) | Menghubungkan hostname publik ke local service (`localhost` vs IP host LAN) |

### 4 Penyebab Utama Cloudflare Tunnel "DOWN" di STB Armbian:
1. **Blokir Protokol QUIC (UDP 7844) oleh ISP**:
   - `cloudflared` modern secara default mencoba koneksi via **QUIC** (UDP 7844). Sebagian besar router ONT ISP dan upstream provider di Indonesia memblokir atau men-drop outbound UDP port 7844.
   - **Solusi Tuntas**: Ubah protokol `cloudflared` menjadi `--protocol http2` (menggunakan TCP port 443 yang dijamin selalu terbuka).
2. **DNS Hijacking / Timeout Resolver ISP**:
   - Jika STB menggunakan DNS bawaan router ISP (`192.168.1.1`), lookup SRV/A record Cloudflare edge sering gagal atau terkena filter Internet Baik.
   - **Solusi**: Atur DNS STB ke `1.1.1.1` dan `8.8.8.8`.
3. **Konflik Dual-Interface & Default Gateway**:
   - STB memiliki dua interface di subnet yang sama (`eth0` kabel dan `wlan0` Wi-Fi). Jika kernel Linux memiliki dua gateway `default via 192.168.1.1` dengan metric yang bertabrakan, paket outbound `cloudflared` bisa diarahkan ke interface yang tidak memiliki internet.
4. **Target URL pada Docker CasaOS (`localhost` vs IP LAN)**:
   - Jika `cloudflared` dijalankan via container Docker (CasaOS App Store), target service **TIDAK BISA** diisi `http://localhost:3000` atau `http://localhost:80`, karena `localhost` di dalam container adalah container itu sendiri. Target harus diisi IP LAN STB (misal: `http://192.168.1.253:3000`).

---

## User Review & Critical Decisions

> [!IMPORTANT]
> 1. **Langkah Perbaikan Cloudflare Tunnel**: Disediakan panduan perintah terminal Linux siap pakai untuk beralih ke protokol HTTP/2 dan verifikasi konektivitas outbound tunnel.
> 2. **Lokasi Tampilan Info IP di Dashboard**: Ditampilkan di Web Dashboard pada widget Header/Sidebar Jaringan dan panel Informasi Sistem (`view-about` / `view-setting-system`).
> 3. **Kelengkapan Data**: Menampilkan setiap interface jaringan fisik aktif lengkap dengan IP Address, Subnet Mask (dan CIDR), MAC Address fisik, URL akses ke port 3000, serta penanda interface mana yang memegang **Default Gateway Internet**.

---

## 1. Panduan Perbaikan Cloudflare Tunnel di STB (Siap Dijalankan)

### Langkah A: Ubah Protokol Tunnel ke HTTP/2 (Wajib untuk ISP Indonesia)
Jika `cloudflared` diinstall sebagai **systemd service** di STB:
```bash
# Cek service cloudflared
sudo systemctl status cloudflared

# Edit konfigurasi service cloudflared untuk menambahkan flag --protocol http2
sudo sed -i 's/tunnel run/tunnel --protocol http2 run/g' /etc/systemd/system/cloudflared.service 2>/dev/null || true

# Atau jika menggunakan file config.yml (/etc/cloudflared/config.yml):
# Tambahkan baris: protocol: http2
echo "protocol: http2" | sudo tee -a /etc/cloudflared/config.yml

# Restart service
sudo systemctl daemon-reload
sudo systemctl restart cloudflared
```

Jika `cloudflared` diinstall via **Docker / CasaOS**:
- Buka pengaturan container `cloudflared` di CasaOS.
- Pada bagian **Command / Arguments**, tambahkan `--protocol http2`.
- Contoh: `tunnel --protocol http2 run --token <TOKEN_ANDA>`
- Simpan dan restart container.

### Langkah B: Periksa Target Service di Cloudflare Zero Trust Dashboard
Di menu Cloudflare Zero Trust $\rightarrow$ Networks $\rightarrow$ Tunnels $\rightarrow$ Public Hostname:
- **Untuk Arch3r NVR**:
  - Service Type: `HTTP`
  - URL: `192.168.1.253:3000` *(Gunakan IP fisik STB, JANGAN ketik localhost jika cloudflared di dalam Docker)*
  - Additional application settings $\rightarrow$ centang / aktifkan **WebSockets** (karena streaming RTSP/HLS & WebRTC NVR membutuhkan WebSocket).
- **Untuk CasaOS**:
  - Service Type: `HTTP`
  - URL: `192.168.1.253:80` (atau port CasaOS Anda).

---

## 2. Fitur Informasi IP & Jaringan di Dashboard Arch3r NVR

### A. Komponen yang Ditambahkan pada UI Dashboard
1. **Sidebar Network Widget Dropdown (`wNetBreakdown`)**:
   - Menampilkan kartu informasi per interface:
     - Nama & Tipe Interface: `🔌 Ethernet (eth0)` atau `📶 Wi-Fi (wlan0)`
     - Alamat IP & URL Port 3000: `http://192.168.1.253:3000`
     - Subnet Mask & CIDR: `255.255.255.0 (/24)`
     - MAC Address: `26:0E:90:8C:9F:7F`
     - Kecepatan real-time Rx/Tx
     - Penanda status: `🌐 Gateway Internet Aktif` jika interface tersebut memegang default route keluar.
2. **Dedicated Card di Menu "Informasi Sistem NVR" (`view-about`)**:
   - Menambahkan tabel data terstruktur bergaya enterprise:
     - Daftar semua IP interface lokal
     - Status koneksi port 3000 (Arch3r NVR) dan port 8889 (MediaMTX WebRTC)
     - Informasi Gateway & DNS Resolver STB saat ini.

---

## 3. Technical Architecture & Data Strategy

```text
┌────────────────────────────────────────────────────────┐
│                   Arch3r NVR Backend                   │
│                                                        │
│  os.networkInterfaces() ──> Filter IPv4 Non-Internal   │
│  /proc/net/route        ──> Deteksi Default Gateway    │
│                                  │                     │
│                                  ▼                     │
│                    Format Interface Metadata:          │
│                    - name, type (eth/wifi)             │
│                    - ip, netmask, cidr, mac            │
│                    - isDefaultGateway: true/false      │
│                    - port: 3000                        │
│                    - url: http://<ip>:3000             │
│                                  │                     │
│                                  ▼                     │
│                  GET /api/system/stats (JSON)          │
└──────────────────────────────┬─────────────────────────┘
                               │ (Polling 5s)
                               ▼
┌────────────────────────────────────────────────────────┐
│                  Arch3r NVR Frontend                   │
│                                                        │
│ 1. Sidebar Network Widget (wNetBreakdown)              │
│    └─ Rincian IP, MAC, Subnet, Port 3000, & Gateway    │
│                                                        │
│ 2. Panel "Informasi Sistem NVR" (view-about)           │
│    └─ Tabel Lengkap Alamat IP & Status Gateway         │
└────────────────────────────────────────────────────────┘
```

### Rencana File yang Dimodifikasi:
1. `server.js`:
   - Memperkaya fungsi pembacaan network interfaces pada `sampleNetworkStats()` dan `/api/system/stats` dengan `ip`, `netmask`, `cidr`, `mac`, `isDefaultGateway`, dan `accessUrl` port 3000.
2. `public/index.html`:
   - Menambahkan struktur kartu "Alamat IP & Antarmuka Server NVR" pada panel `view-about`.
3. `public/script.js`:
   - Memperbarui fungsi `updateHardwareStats()` untuk menampilkan rincian IP, Subnet, MAC, dan URL port 3000 pada `wNetBreakdown` dan tabel `aboutNetworkInterfacesList`.
4. Sinkronisasi Versi & Changelog:
   - Naikkan versi aplikasi ke **Ver 11.9.2**, disinkronkan ke seluruh file versi (`package.json`, `metadata.json`, `public/version_sync.js`, `public/index.html`), dan dicatat pada `CHANGELOG.md`.
