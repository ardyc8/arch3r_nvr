# Arch3r NVR - Master License Server
Ini adalah template aplikasi Node.js sederhana yang bertindak sebagai "Server Induk" untuk memvalidasi dan mematikan STB Arch3r NVR milik Klien Anda dari jarak jauh (Remote Kill-Switch).

## Cara Deploy di Armbian Hosting / VPS Anda

1. **Upload Folder Ini**
   Pindahkan folder `master_license_server_template` ini ke dalam server VPS/Armbian Anda (misalnya di `/opt/arch3r_master_server`).

2. **Install Dependensi**
   Buka terminal SSH server Anda, masuk ke folder tersebut, dan jalankan:
   ```bash
   cd /opt/arch3r_master_server
   npm install
   ```

3. **Jalankan dengan PM2**
   Agar server ini menyala 24 jam dan otomatis jalan saat Armbian direstart:
   ```bash
   pm2 start server.js --name "LicenseMaster"
   pm2 save
   pm2 startup
   ```

4. **Siapkan Domain (Nginx Proxy)**
   Karena Anda sudah punya domain (misal: `license.domainanda.com`), buatlah konfigurasi Nginx yang meneruskan port `4000` ke domain tersebut.

   Contoh `/etc/nginx/sites-available/license`:
   ```nginx
   server {
       server_name license.domainanda.com;
       location / {
           proxy_pass http://127.0.0.1:4000;
           proxy_http_version 1.1;
       }
   }
   ```
   Lalu pasang SSL dengan Certbot:
   ```bash
   sudo ln -s /etc/nginx/sites-available/license /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   sudo certbot --nginx -d license.domainanda.com
   ```

## Cara Menghubungkan NVR Klien ke Server Ini
1. Buka halaman **Superadmin** di NVR Klien Anda.
2. Di bagian "Update Sistem & OTA", isi **URL Server Lisensi Induk** dengan format lengkap menuju endpoint verifikasi Anda:
   `https://license.domainanda.com/api/license/verify`
3. Klik **Simpan**. Selesai!

## Cara Menghukum Klien Nakal
Jika Klien belum membayar tagihan, Anda bisa mencabut lisensinya via Postman / Terminal / cURL:
```bash
curl -X POST https://license.domainanda.com/api/admin/revoke \
-H "Content-Type: application/json" \
-d '{"machineId":"[MASUKKAN_ID_MESIN_KLIEN_DI_SINI]"}'
```
Begitu STB klien tersebut terhubung ke internet dalam kurun waktu 12 jam, NVR mereka akan otomatis terkunci.
