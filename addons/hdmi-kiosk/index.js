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

        exec(`systemctl ${action} arch3r-kiosk 2>/dev/null`, (err, stdout, stderr) => {
            this.checkSystemdServiceStatus(() => {
                if (callback) callback(err, { success: !err, stdout, stderr, isActive: this.isKioskServiceActive });
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
