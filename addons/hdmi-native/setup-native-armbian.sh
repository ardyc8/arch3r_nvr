#!/bin/bash
# ==============================================================================
# Arch3r NVR - Setup Standalone HDMI Native Hardware Player (MPV Engine)
# ==============================================================================
# Target: Linux Armbian STB (Amlogic S905X / S905X2 / Allwinner / Rockchip)
# Karakteristik Utama:
# - MURNI TANPA CHROMIUM / XORG DESKTOP (Hemat Flash/eMMC ~350 MB!).
# - Ukuran total instalasi hanya ~25 MB (hanya mpv + socat).
# - Konsumsi RAM super irit (< 60 MB) dan suhu STB dingin (Hardware VPU direct).
# - Dikontrol instan lewat IPC Socket (/tmp/mpv-socket) dari HP (Next Page / Paging).
# ==============================================================================

set -e

if [ "$EUID" -ne 0 ]; then
  echo "⚠️ Harap jalankan script ini dengan hak akses sudo / root:"
  echo "   sudo bash ./addons/hdmi-native/setup-native-armbian.sh"
  exit 1
fi

echo "=========================================================="
echo "⚡ Arch3r NVR - Setup HDMI Native Player (Hardware MPV)"
echo "=========================================================="

echo "[1/4] Menginstal MPV Player & Socat (Hanya ~25MB, TANPA Chromium)..."
apt-get update -y
apt-get install -y --no-install-recommends mpv socat jq

echo "[2/4] Menyiapkan direktori /opt/arch3r-native..."
mkdir -p /opt/arch3r-native

# Hentikan service kiosk Chromium agar tidak berebut CPU dan output HDMI
echo "[2.5/4] Menonaktifkan service Chromium Kiosk (Mencegah bentrok CPU & HDMI)..."
systemctl stop arch3r-kiosk 2>/dev/null || true
systemctl disable arch3r-kiosk 2>/dev/null || true

echo "[3/4] Membuat script peluncur MPV Hardware Native Player (Hemat CPU)..."
cat << 'EOF' > /opt/arch3r-native/start-native.sh
#!/bin/bash
# ==============================================================================
# Peluncur MPV Direct Hardware Video Engine (Low-CPU & Low-Latency Optimized)
# ==============================================================================
SOCKET="/tmp/mpv-socket"
PLAYLIST="/opt/arch3r-native/current_playlist.m3u"

# Bersihkan sisa socket lama
rm -f "$SOCKET" 2>/dev/null || true

# Jika file playlist belum ada, buat default dummy playlist ringan (1 FPS)
# Jika file playlist belum ada, buat default standby screen ringan (5 FPS)
if [ ! -f "$PLAYLIST" ]; then
    echo "#EXTM3U" > "$PLAYLIST"
    echo "#EXTINF:-1, Arch3r Standby" >> "$PLAYLIST"
    echo "avdevice://lavfi:color=c=0x0b132b:s=1280x720:r=5" >> "$PLAYLIST"
fi

echo "[Arch3r-Native] Menjalankan MPV Hardware Engine..."

# Jalankan MPV dengan akselerasi hardware DRM langsung ke HDMI tanpa X11
exec mpv \
    --idle=yes \
    --keep-open=always \
    --force-window=immediate \
    --input-ipc-server="$SOCKET" \
    --profile=low-latency \
    --demuxer-lavf-o=rtsp_transport=tcp \
    --demuxer-readahead-secs=1 \
    --network-timeout=5 \
    --stream-lavf-o=reconnect=1,reconnect_streamed=1,reconnect_delay_max=3 \
    --hwdec=auto-safe \
    --vo=drm,fbdev,gpu \
    --no-audio \
    --fs \
    --cursor-autohide=always \
    --osd-level=1 \
    --osd-font-size=24 \
    --osd-color='#38bdf8' \
    --osd-border-color='#0f172a' \
    --osd-border-size=2 \
    --osd-duration=3000 \
    "$PLAYLIST"
EOF
chmod +x /opt/arch3r-native/start-native.sh

echo "[4/4] Mendaftarkan systemd service arch3r-native.service..."
cat << 'EOF' > /etc/systemd/system/arch3r-native.service
[Unit]
Description=Arch3r NVR HDMI Native Hardware Player (MPV Engine)
After=network.target sound.target

[Service]
Type=simple
User=root
Restart=always
RestartSec=3
StandardInput=tty
StandardOutput=journal
StandardError=journal
TTYPath=/dev/tty1
TTYReset=yes
TTYVHangup=yes
Environment=XDG_RUNTIME_DIR=/run/user/0
ExecStart=/opt/arch3r-native/start-native.sh

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable arch3r-native.service 2>/dev/null || true

echo "=========================================================="
echo "✅ Instalasi HDMI Native Hardware Player Berhasil Selesai!"
echo "   - Ukuran instalasi super kecil: ~25 MB"
echo "   - Tanpa Chromium & Tanpa Beban RAM Desktop"
echo "   - Kontrol Paging (Next Page / Prev Page) siap dari HP"
echo "   - Perintah start manual: sudo systemctl start arch3r-native"
echo "=========================================================="
