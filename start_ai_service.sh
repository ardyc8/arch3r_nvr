#!/bin/bash
# ==========================================
# Arch3r NVR - AI YOLO Service Launcher
# ==========================================

echo "[1/4] Pengecekan Sistem Armbian..."
cd "$(dirname "$0")"

# 1. Pastikan python3-full terinstal (Wajib untuk Ubuntu 24.04 agar venv jalan)
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

echo "[3/4] Aktivasi venv & Instalasi Modul AI..."
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
    # MATIKAN CACHE PIP AGAR TIDAK MENUHIN RAM/STORAGE STB
    echo "[!] Menginstal PyTorch versi CPU & OpenCV (No-Cache)..."
    pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
    pip install --no-cache-dir fastapi uvicorn opencv-python ultralytics httpx
    
    echo "[4/4] Menjalankan Arch3r AI YOLO Service..."
    python addons/ai_yolo_service.py
else
    echo "[!] Peringatan: Venv gagal dibuat. Menggunakan instalasi sistem (--break-system-packages)..."
    pip3 install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu --break-system-packages
    pip3 install --no-cache-dir fastapi uvicorn opencv-python ultralytics httpx --break-system-packages
    
    echo "[4/4] Menjalankan Arch3r AI YOLO Service..."
    python3 addons/ai_yolo_service.py
fi
