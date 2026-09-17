#!/bin/bash
# ==========================================
# Arch3r NVR - AI YOLO Service Launcher
# ==========================================

echo "[1/4] Pengecekan Sistem Armbian..."
cd "$(dirname "$0")"

# 1. Pastikan python3-full terinstal
sudo apt update
sudo apt install -y python3-pip python3-venv python3-full libgl1 libglib2.0-0

echo "[2/4] Pengecekan Virtual Environment (venv)..."
if [ -d "venv" ] && [ ! -f "venv/bin/activate" ]; then
    echo "[!] Menghapus venv yang rusak..."
    rm -rf venv
fi

if [ ! -d "venv" ]; then
    echo "[!] Membuat Python Virtual Environment..."
    python3 -m venv venv
fi

# FIX UNTUK NO SPACE LEFT ON DEVICE (TMPFS RAM LIMIT)
# Armbian menggunakan RAM untuk folder /tmp. Kita pindahkan folder temp pip ke penyimpanan internal (disk)
mkdir -p pip_tmp
export TMPDIR="$(pwd)/pip_tmp"

echo "[3/4] Aktivasi venv & Instalasi Modul AI..."
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
    echo "[!] Menginstal Dependensi AI (Menggunakan Disk TMP, menghindari limit RAM)..."
    pip install --no-cache-dir fastapi uvicorn opencv-python ultralytics httpx
    
    echo "[4/4] Menjalankan Arch3r AI YOLO Service..."
    rm -rf pip_tmp
    python addons/ai_yolo_service.py
else
    echo "[!] Peringatan: Venv gagal dibuat. Menggunakan instalasi sistem (--break-system-packages)..."
    pip3 install --no-cache-dir fastapi uvicorn opencv-python ultralytics httpx --break-system-packages
    
    echo "[4/4] Menjalankan Arch3r AI YOLO Service..."
    rm -rf pip_tmp
    python3 addons/ai_yolo_service.py
fi
