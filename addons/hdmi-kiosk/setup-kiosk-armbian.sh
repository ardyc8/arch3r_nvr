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
    openbox \
    chromium-browser || apt-get install -y chromium || true

echo "[2/4] Mengonfigurasi hak akses Xwrapper untuk non-console..."
mkdir -p /etc/X11
systemctl stop arch3r-native 2>/dev/null || true
systemctl disable arch3r-native 2>/dev/null || true
cat << 'EOF' > /etc/X11/Xwrapper.config
allowed_users=anybody
needs_root_rights=yes
EOF

echo "[3/4] Membuat script peluncur Kiosk X11 dengan auto-restart loop..."
mkdir -p /opt/arch3r-kiosk
cat << 'EOF' > /opt/arch3r-kiosk/start-kiosk.sh
#!/bin/bash
export DISPLAY=:0
xset -dpms 2>/dev/null || true
xset s off 2>/dev/null || true
xset s noblank 2>/dev/null || true

# Jalankan window manager ringan
if which matchbox-window-manager >/dev/null 2>&1; then
    matchbox-window-manager -use_titlebar no &
elif which openbox >/dev/null 2>&1; then
    openbox &
fi

# Deteksi binary Chromium di Linux Armbian
CHROMIUM_BIN=$(which chromium-browser 2>/dev/null || which chromium 2>/dev/null || which google-chrome 2>/dev/null || echo "")

if [ -z "$CHROMIUM_BIN" ]; then
    echo "[Arch3r Kiosk] ERROR: Peramban Chromium belum terpasang di STB!" >&2
    sleep 5
    exit 1
fi

# Loop keep-alive agar Chromium selalu aktif dan memuat streaming NVR
while true; do
    rm -rf /tmp/arch3r_kiosk_chrome/Singleton* 2>/dev/null || true
    $CHROMIUM_BIN \
        --kiosk \
        --no-first-run \
        --no-default-browser-check \
        --disable-infobars \
        --disable-session-crashed-bubble \
        --disable-features=Translate,OptimizationHints,MediaRouter,DialMediaRouteProvider \
        --noerrdialogs \
        --password-store=basic \
        --disable-save-password-bubble \
        --disable-notifications \
        --disable-component-update \
        --disable-background-networking \
        --disable-domain-reliability \
        --disable-client-side-phishing-detection \
        --disable-hang-monitor \
        --disable-popup-blocking \
        --disable-prompt-on-repost \
        --disable-sync \
        --metrics-recording-only \
        --no-pings \
        --disable-pinch \
        --overscroll-history-navigation=0 \
        --incognito \
        --no-sandbox \
        --test-type \
        --user-data-dir=/tmp/arch3r_kiosk_chrome \
        --disable-dev-shm-usage \
        --disable-gpu \
        --disable-gpu-compositing \
        --disable-gpu-vsync \
        --disable-smooth-scrolling \
        --renderer-process-limit=2 \
        --autoplay-policy=no-user-gesture-required \
        --check-for-update-interval=31536000 \
        --app=http://localhost:3000/?kiosk=1
    sleep 3
done
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
ExecStart=/usr/bin/xinit /opt/arch3r-kiosk/start-kiosk.sh -- /usr/bin/X :0 -nocursor -nolisten tcp
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload

echo "=========================================================="
echo "✅ Instalasi Kiosk Service Selesai!"
echo "=========================================================="
echo "Untuk mengaktifkan Kiosk saat STB booting:"
echo "   sudo systemctl enable arch3r-kiosk"
echo "   sudo systemctl restart arch3r-kiosk"
echo ""
echo "Untuk menonaktifkan:"
echo "   sudo systemctl stop arch3r-kiosk"
echo "   sudo systemctl disable arch3r-kiosk"
echo "=========================================================="
