/**
 * ============================================================================
 * ARCH3R NVR ADDON: HDMI STATUS MONITOR & ARMBIN KIOSK SERVICE (VER 1.0.2)
 * ============================================================================
 * Target Environment: Linux Armbian on Amlogic STB (e.g., Fiberhome HG860P, ZTE B860H)
 * Description: Reads HDMI physical connection status from Linux kernel sysfs safely.
 * 
 * CRITICAL SAFETY & STABILITY NOTICE:
 * - Node.js backend daemon NEVER spawns 'startx' directly.
 *   (Executing startx from a background daemon without an allocated TTY causes
 *    Amlogic Meson DRM kernel panics / watchdog reboots).
 * - Kiosk GUI is managed cleanly via standalone OS-level systemd service
 *   (see setup-kiosk-armbian.sh) running on a dedicated TTY with proper Xwrapper config.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

class HdmiKioskAddon {
    constructor() {
        this.enabled = false;
        this.pollIntervalMs = 30000; // 30 seconds safe polling interval
        this.timer = null;
        this.isHdmiConnected = false;
        this.isKioskServiceActive = false;
        this.lastCheckTime = null;
        this.detectedSysPath = null;
        this.appUrl = 'http://localhost:3000';
        this.logger = (lvl, msg) => console.log(`[HDMI-MONITOR][${lvl}] ${msg}`);
        
        // Candidate sysfs status paths for HDMI in Linux kernel / DRM subsystem & Amlogic SoC
        this.hdmiStatusPaths = [
            '/sys/class/drm/card0-HDMI-A-1/status',
            '/sys/class/drm/card0-HDMI-A-2/status',
            '/sys/class/drm/card1-HDMI-A-1/status',
            '/sys/class/amhdmitx/amhdmitx0/hpd_state',           // Amlogic STB (HG860P / B860H)
            '/sys/devices/virtual/amhdmitx/amhdmitx0/hpd_state' // Amlogic alternative sysfs
        ];
    }

    /**
     * Initialize the Add-on with custom configuration
     * @param {Object} options 
     */
    init(options = {}) {
        if (options.appUrl) this.appUrl = options.appUrl;
        if (typeof options.pollIntervalMs === 'number') this.pollIntervalMs = options.pollIntervalMs;
        if (typeof options.logger === 'function') this.logger = options.logger;

        this.logger('INFO', 'Arch3r HDMI Monitor Add-on initialized in safe telemetry mode.');
        
        // Check initial state once safely
        this.checkHdmiPhysicalStatus();
        return this;
    }

    /**
     * Read Linux sysfs kernel status for physical HDMI connection (Read-only, zero side-effects)
     * @returns {Object} { connected: boolean, path: string|null, rawValue: string }
     */
    checkHdmiPhysicalStatus() {
        this.lastCheckTime = new Date().toISOString();

        for (const p of this.hdmiStatusPaths) {
            try {
                if (fs.existsSync(p)) {
                    const raw = fs.readFileSync(p, 'utf8').trim().toLowerCase();
                    this.detectedSysPath = p;

                    // Standard DRM status is "connected" / "disconnected"
                    // Amlogic hpd_state is "1" (connected) / "0" (disconnected)
                    const isConn = (raw === 'connected' || raw === '1' || raw === 'on');
                    this.isHdmiConnected = isConn;
                    return { connected: isConn, path: p, rawValue: raw };
                }
            } catch (err) {
                // Ignore single path read error and try next candidate
            }
        }

        this.isHdmiConnected = false;
        return { connected: false, path: null, rawValue: 'no_sysfs_found' };
    }

    /**
     * Ensure /opt/arch3r-kiosk/start-kiosk.sh exists and is up to date before launching
     */
    ensureKioskScript() {
        const kioskDir = '/opt/arch3r-kiosk';
        const scriptPath = path.join(kioskDir, 'start-kiosk.sh');
        try {
            if (!fs.existsSync(kioskDir)) {
                fs.mkdirSync(kioskDir, { recursive: true });
            }
            const cfg = this.loadConfig();
            const targetUrl = cfg.display_url || this.appUrl || 'http://localhost:3000/#monitor';

            const scriptContent = `#!/bin/bash
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

while true; do
    rm -rf /tmp/arch3r_kiosk_chrome/Singleton* 2>/dev/null || true
    $CHROMIUM_BIN \\
        --kiosk \\
        --no-first-run \\
        --no-default-browser-check \\
        --disable-infobars \\
        --disable-session-crashed-bubble \\
        --disable-translate \\
        --noerrdialogs \\
        --no-sandbox \\
        --test-type \\
        --user-data-dir=/tmp/arch3r_kiosk_chrome \\
        --disable-dev-shm-usage \\
        --in-process-gpu \\
        --ignore-gpu-blocklist \\
        --enable-zero-copy \\
        --autoplay-policy=no-user-gesture-required \\
        --check-for-update-interval=31536000 \\
        --app="${targetUrl}"
    sleep 3
done
`;
            fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });
            return true;
        } catch (err) {
            this.logger('WARN', 'Failed to ensure kiosk script: ' + err.message);
            return false;
        }
    }

    /**
     * Check if systemd Kiosk service is active (if installed)
     */
    checkSystemdServiceStatus(callback) {
        exec('systemctl is-active arch3r-kiosk 2>/dev/null', (err, stdout) => {
            const status = (stdout || '').trim();
            this.isKioskServiceActive = (status === 'active');
            if (typeof callback === 'function') callback(this.isKioskServiceActive);
        });
    }

    /**
     * Control OS-level systemd Kiosk service safely via systemctl
     */
    controlService(action, callback) {
        if (!['start', 'stop', 'restart', 'status'].includes(action)) {
            if (callback) callback(new Error('Invalid action'));
            return;
        }

        if (action === 'start' || action === 'restart') {
            this.ensureKioskScript();
        }

        exec(`systemctl ${action} arch3r-kiosk 2>/dev/null`, (err, stdout, stderr) => {
            this.checkSystemdServiceStatus(() => {
                if (callback) callback(err, { success: !err, stdout, stderr, isActive: this.isKioskServiceActive });
            });
        });
    }

    /**
     * Diagnostic report of Armbian STB graphic environment for Kiosk
     */
    getDiagnostics(callback) {
        const results = {
            hasXorg: false,
            hasChromium: false,
            hasWindowManager: false,
            hasKioskScript: false,
            hasSystemdService: false,
            isServiceActive: false,
            journalLogs: '',
            detectedPath: this.detectedSysPath,
            isHdmiConnected: this.isHdmiConnected,
            recommendation: ''
        };

        exec('which Xorg || which X', (err, stdout) => {
            results.hasXorg = !!(!err && stdout && stdout.trim());
            exec('which chromium-browser || which chromium || which google-chrome', (err2, stdout2) => {
                results.hasChromium = !!(!err2 && stdout2 && stdout2.trim());
                exec('which matchbox-window-manager || which openbox', (err3, stdout3) => {
                    results.hasWindowManager = !!(!err3 && stdout3 && stdout3.trim());
                    results.hasKioskScript = fs.existsSync('/opt/arch3r-kiosk/start-kiosk.sh');
                    results.hasSystemdService = fs.existsSync('/etc/systemd/system/arch3r-kiosk.service');

                    exec('systemctl is-active arch3r-kiosk 2>/dev/null', (err4, stdout4) => {
                        results.isServiceActive = (stdout4 || '').trim() === 'active';
                        exec('journalctl -u arch3r-kiosk -n 25 --no-pager 2>/dev/null', (err5, stdout5) => {
                            results.journalLogs = stdout5 ? stdout5.trim() : 'Tidak ada log systemd terbaru.';

                            if (!results.hasXorg) {
                                results.recommendation = '⚠️ Paket Xorg belum terinstal. Jalankan: sudo apt-get install -y xserver-xorg xinit di terminal STB.';
                            } else if (!results.hasChromium) {
                                results.recommendation = '⚠️ Chromium belum terinstal di STB. Jalankan: sudo apt-get install -y chromium-browser || sudo apt-get install -y chromium di terminal STB.';
                            } else if (!results.hasSystemdService) {
                                results.recommendation = '⚠️ Service Kiosk belum terkonfigurasi. Jalankan: sudo bash ./addons/hdmi-kiosk/setup-kiosk-armbian.sh di terminal STB.';
                            } else if (!results.isHdmiConnected) {
                                results.recommendation = 'ℹ️ Kabel HDMI ke TV/Monitor tidak terdeteksi atau TV mati.';
                            } else {
                                results.recommendation = '✅ Semua dependensi grafis STB lengkap & siap digunakan.';
                            }

                            if (callback) callback(null, results);
                        });
                    });
                });
            });
        });
    }

    /**
     * Load persisted config from config.json
     */
    loadConfig() {
        const configPath = path.join(__dirname, 'config.json');
        if (fs.existsSync(configPath)) {
            try {
                this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                if (this.config.display_url) this.appUrl = this.config.display_url;
            } catch (e) {
                this.logger('WARN', 'Failed to read config.json: ' + e.message);
            }
        }
        return this.config || {};
    }

    /**
     * Get real-time status representation
     */
    getStatus() {
        this.checkHdmiPhysicalStatus();
        this.loadConfig();
        return {
            addonName: 'arch3r-addon-hdmi-kiosk',
            version: '1.0.2',
            isHdmiConnected: this.isHdmiConnected,
            isKioskServiceActive: this.isKioskServiceActive,
            detectedSysPath: this.detectedSysPath,
            targetUrl: this.appUrl,
            lastCheckTime: this.lastCheckTime,
            config: this.config || {},
            mode: 'safe-telemetry'
        };
    }
}

// Singleton export
const instance = new HdmiKioskAddon();
module.exports = instance;
