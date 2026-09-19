#!/bin/bash
# ==============================================================================
# Arch3r NVR - Setup Standalone Kiosk Mode untuk Linux Armbian (Amlogic STB)
# ==============================================================================
# Script ini mengonfigurasi layanan Kiosk X11 + Chromium yang stabil pada TTY7
# dengan izin Xwrapper yang benar tanpa membebani Node.js atau merusak kernel DRM.
# ==============================================================================

set -e

if [ "$EUID" -ne 0 ]; then
  echo "⚠️ Harap jalankan script ini dengan sudo / root:"
  echo "   sudo bash ./addons/hdmi-kiosk/setup-kiosk-armbian.sh"
  exit 1
fi

echo "=========================================================="
echo "⚡ Arch3r NVR - Konfigurasi Kiosk Layar HDMI Standalone"
echo "=========================================================="

echo "[1/4] Menginstal dependensi grafis minimal (Xorg, Matchbox/Openbox, Chromium)..."
apt-get update -y
apt-get install -y --no-install-recommends \
    xserver-xorg \
    xserver-xorg-video-fbdev \
    xinit \
    x11-xserver-utils \
    matchbox-window-manager \
    chromium-browser || apt-get install -y chromium

echo "[2/4] Mengonfigurasi hak akses Xwrapper untuk non-console..."
mkdir -p /etc/X11
cat << 'EOF' > /etc/X11/Xwrapper.config
allowed_users=anybody
needs_root_rights=yes
EOF

echo "[3/4] Membuat script peluncur Kiosk X11..."
mkdir -p /opt/arch3r-kiosk
cat << 'EOF' > /opt/arch3r-kiosk/start-kiosk.sh
#!/bin/bash
export DISPLAY=:0
xset -dpms
xset s off
xset s noblank

# Jalankan window manager ringan agar Chromium stabil dan tidak overflow memori
matchbox-window-manager -use_titlebar no &

# Jalankan Chromium mode Kiosk
CHROMIUM_BIN=$(which chromium-browser || which chromium)
exec $CHROMIUM_BIN \
    --kiosk \
    --no-first-run \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --disable-translate \
    --no-sandbox \
    --disable-gpu \
    --disable-software-rasterizer \
    --check-for-update-interval=31536000 \
    --app=http://localhost:3000
EOF
chmod +x /opt/arch3r-kiosk/start-kiosk.sh

echo "[4/4] Membuat systemd service arch3r-kiosk..."
cat << 'EOF' > /etc/systemd/system/arch3r-kiosk.service
[Unit]
Description=Arch3r NVR HDMI Kiosk Display Service
After=systemd-user-sessions.service network.target

[Service]
Type=simple
User=root
Environment=DISPLAY=:0
ExecStart=/usr/bin/xinit /opt/arch3r-kiosk/start-kiosk.sh -- /usr/bin/X :0 -nocursor -nolisten tcp vt7
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload

echo "=========================================================="
echo "✅ Instalasi Kiosk Service Selesai!"
echo "=========================================================="
echo "Untuk mengaktifkan Kiosk saat STB booting:"
echo "   sudo systemctl enable arch3r-kiosk"
echo "   sudo systemctl start arch3r-kiosk"
echo ""
echo "Untuk menonaktifkan:"
echo "   sudo systemctl stop arch3r-kiosk"
echo "   sudo systemctl disable arch3r-kiosk"
echo "=========================================================="
