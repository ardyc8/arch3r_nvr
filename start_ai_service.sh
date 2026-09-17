#!/bin/bash
# ==========================================
# Arch3r NVR - AI YOLO Service Launcher
# ==========================================

echo "[1/4] Pengecekan Sistem Armbian..."
# Pindah ke direktori script ini berada
cd "$(dirname "$0")"

# Cek apakah pip dan venv sudah terinstal
if ! dpkg -s python3-pip python3-venv >/dev/null 2>&1; then
    echo "[!] python3-pip atau python3-venv belum terinstal."
    echo "[!] Menginstal dependensi sistem (Membutuhkan akses sudo/root)..."
    sudo apt update
    sudo apt install -y python3-pip python3-venv libgl1-mesa-glx libglib2.0-0
fi

echo "[2/4] Pengecekan Virtual Environment (venv)..."
if [ ! -d "venv" ]; then
    echo "[!] Membuat Python Virtual Environment..."
    python3 -m venv venv
fi

echo "[3/4] Aktivasi venv & Instalasi Modul AI..."
source venv/bin/activate
# Cek apakah ultralytics sudah terinstal untuk menghemat waktu booting
if ! python -c "import ultralytics" >/dev/null 2>&1; then
    echo "[!] Menginstal dependensi Python (FastAPI, OpenCV, YOLOv8)..."
    pip install fastapi uvicorn opencv-python ultralytics httpx
fi

echo "[4/4] Menjalankan Arch3r AI YOLO Service..."
python addons/ai_yolo_service.py
