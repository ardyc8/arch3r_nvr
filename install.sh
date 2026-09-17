#!/bin/bash
# Arch3r NVR - Automated Installation Script (Ver. 9.0.7)
# Dirancang khusus untuk lingkungan Armbian STB

echo "====================================================="
echo "   Memulai Instalasi Otomatis Arch3r NVR Ver. 9.0.7  "
echo "====================================================="

# 1. Pastikan script dijalankan sebagai root (karena butuh akses sistem)
if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: Tolong jalankan script ini sebagai root (Gunakan 'sudo ./install.sh')"
  exit 1
fi

# 2. Instalasi Paket Dasar OS (FFmpeg sangat wajib untuk fitur rekaman NVR)
echo ""
echo "[1/5] Memperbarui sistem & menginstal dependensi dasar (FFmpeg, wget, tar)..."
apt-get update
apt-get install -y ffmpeg wget curl tar

# 3. Instalasi MediaMTX (Otomatis mendeteksi arsitektur STB: arm64/aarch64 atau armhf)
echo ""
echo "[2/5] Mengunduh dan memasang MediaMTX Server..."
ARCH=$(uname -m)
MEDIAMTX_VERSION="v1.8.0" # Versi stabil

if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
    MTX_FILE="mediamtx_${MEDIAMTX_VERSION}_linux_arm64.tar.gz"
elif [ "$ARCH" = "armv7l" ]; then
    MTX_FILE="mediamtx_${MEDIAMTX_VERSION}_linux_armv7.tar.gz"
else
    MTX_FILE="mediamtx_${MEDIAMTX_VERSION}_linux_amd64.tar.gz" # Fallback jika di PC biasa
fi

# Unduh dan Ekstrak
wget -q "https://github.com/bluenviron/mediamtx/releases/download/${MEDIAMTX_VERSION}/${MTX_FILE}" -O mediamtx.tar.gz
if [ -f "mediamtx.tar.gz" ]; then
    tar -zxvf mediamtx.tar.gz mediamtx
    mv mediamtx /usr/local/bin/
    chmod +x /usr/local/bin/mediamtx
    rm mediamtx.tar.gz
    echo "✅ MediaMTX berhasil dipasang di sistem."
else
    echo "⚠️ Gagal mengunduh MediaMTX. Silakan periksa koneksi internet."
fi

# 4. Instalasi Dependensi Node.js (termasuk node-onvif)
echo ""
echo "[3/5] Menginstal dependensi NPM (Node.js) aplikasi NVR..."
# Pastikan kita mengeksekusi npm di folder tempat script ini berada
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$DIR"
npm install

# 5. Instalasi PM2 & Setup Auto-Start (Berjalan otomatis saat STB dihidupkan)
echo ""
echo "[4/5] Menyiapkan PM2 dan Sistem Auto-Start..."
npm install -g pm2

# Bersihkan proses PM2 lama jika sudah pernah diinstal sebelumnya
pm2 stop arch3r_nvr 2>/dev/null
pm2 delete arch3r_nvr 2>/dev/null

# Jalankan Arch3r NVR
pm2 start server.js --name "arch3r_nvr"

# Simpan status aplikasi PM2 agar diingat oleh sistem
pm2 save

# Mendaftarkan PM2 ke systemd startup OS Linux Armbian
env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root

echo ""
echo "[5/5] Instalasi Selesai!"
echo "====================================================="
echo "✅ Arch3r NVR berhasil diinstal secara utuh."
echo "✅ NVR akan otomatis menyala setiap STB direstart / mati lampu."
echo ""
echo "Perintah berguna:"
echo " - Lihat Log Sistem  : pm2 logs arch3r_nvr"
echo " - Restart NVR       : pm2 restart arch3r_nvr"
echo "====================================================="

# ==========================================
# (OPSIONAL) Arch3r NVR - AI YOLO Service
# ==========================================
echo "=========================================="
echo "Instalasi AI YOLOv8 Service (Opsional)"
echo "=========================================="
read -p "Apakah Anda ingin menginstal dan mengaktifkan AI Object Detection (YOLOv8)? [y/N] " install_ai
if [[ "$install_ai" =~ ^[Yy]$ ]]; then
    echo "[!] Menyiapkan dependensi AI..."
    sudo apt install -y python3-pip python3-venv python3-full libgl1 libglib2.0-0
    
    echo "[!] Membuat Python Virtual Environment (venv)..."
    python3 -m venv venv
    
    echo "[!] Menginstal OpenCV, FastAPI, dan Ultralytics..."
    source venv/bin/activate
    pip install fastapi uvicorn opencv-python ultralytics httpx --break-system-packages
    
    echo "[!] Mendaftarkan AI Service ke PM2..."
    # Menjalankan AI Service via bash script karena pm2 kesulitan memanggil venv langsung
    cat << 'RUNAI' > run_ai.sh
#!/bin/bash
cd "$(dirname "$0")"
source venv/bin/activate
python3 addons/ai_yolo_service.py
RUNAI
    chmod +x run_ai.sh
    pm2 start ./run_ai.sh --name "arch3r-ai-yolo"
    pm2 save
    
    echo "=========================================="
    echo "AI YOLO Service BERHASIL diinstal dan dijalankan!"
    echo "Status bisa dicek dengan: pm2 logs arch3r-ai-yolo"
    echo "=========================================="
else
    echo "Instalasi AI Service dilewati."
fi
