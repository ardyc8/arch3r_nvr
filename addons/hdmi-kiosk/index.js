/**
 * ============================================================================
 * ARCH3R NVR ADDON: HDMI HOT-PLUG & CHROMIUM KIOSK LAUNCHER (VER 1.0.0)
 * ============================================================================
 * Target Environment: Linux Armbian on Amlogic STB (e.g., Fiberhome HG860P)
 * Description: Automatically detects physical HDMI cable hot-plug state and
 * manages an ultra-lightweight standalone X11 / Chromium Kiosk session.
 * When HDMI is unplugged, kills GUI processes to free memory/CPU in headless mode.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');

class HdmiKioskAddon {
    constructor() {
        this.enabled = true;
        this.pollIntervalMs = 10000; // 10 seconds hot-plug check
        this.timer = null;
        this.isHdmiConnected = false;
        this.isKioskRunning = false;
        this.activeProcess = null;
        this.lastCheckTime = null;
        this.detectedSysPath = null;
        this.appUrl = 'http://localhost:3000';
        this.logger = (lvl, msg) => console.log(`[HDMI-KIOSK][${lvl}] ${msg}`);
        
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
        if (typeof options.enabled === 'boolean') this.enabled = options.enabled;
        if (typeof options.logger === 'function') this.logger = options.logger;

        this.logger('INFO', `Initialized Arch3r HDMI Kiosk Add-on. Target App: ${this.appUrl}, Interval: ${this.pollIntervalMs}ms`);

        if (this.enabled !== false && options.autoStart !== false) {
            this.start();
        }
        return this;
    }

    /**
     * Start the hot-plug monitoring polling loop
     */
    start() {
        if (this.timer) clearInterval(this.timer);
        this.enabled = true;
        
        // Immediate check on startup
        this.evaluateState();

        // Run hot-plug interval polling
        this.timer = setInterval(() => {
            this.evaluateState();
        }, this.pollIntervalMs);

        this.logger('INFO', `HDMI Hot-Plug monitor started (polling every ${this.pollIntervalMs / 1000}s).`);
    }

    /**
     * Stop monitoring and cleanup running kiosk processes
     */
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.enabled = false;
        this.killKioskSession();
        this.logger('INFO', 'HDMI Hot-Plug monitor stopped.');
    }

    /**
     * Read Linux sysfs kernel status for physical HDMI connection
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
                    return { connected: isConn, path: p, rawValue: raw };
                }
            } catch (err) {
                // Ignore single path read error and try next candidate
            }
        }

        // Fallback if running inside sandbox or headless Linux without active DRM sysfs
        return { connected: false, path: null, rawValue: 'no_sysfs_found' };
    }

    /**
     * Periodic state evaluator
     */
    evaluateState() {
        if (!this.enabled) return;

        const { connected, path: activePath, rawValue } = this.checkHdmiPhysicalStatus();
        const prevStatus = this.isHdmiConnected;
        this.isHdmiConnected = connected;

        // Log when cable status changes
        if (connected !== prevStatus) {
            this.logger('INFO', `HDMI Status Transition: ${prevStatus ? 'CONNECTED' : 'DISCONNECTED'} -> ${connected ? 'CONNECTED' : 'DISCONNECTED'} (sysfs: ${activePath || 'none'}, raw: ${rawValue})`);
        }

        // 1. HDMI is plugged in and Kiosk is not running -> Launch GUI
        if (this.isHdmiConnected && !this.isKioskRunning) {
            this.launchKioskSession();
        }
        // 2. HDMI is unplugged while Kiosk is running -> Kill GUI to save RAM/CPU
        else if (!this.isHdmiConnected && this.isKioskRunning) {
            this.logger('INFO', 'HDMI cable unplugged! Reclaiming STB memory by terminating X11/Chromium session.');
            this.killKioskSession();
        }
    }

    /**
     * Find the available Chromium binary path on the Armbian system
     */
    getChromiumBinary() {
        const candidates = [
            '/usr/bin/chromium-browser',
            '/usr/bin/chromium',
            '/bin/chromium-browser',
            '/bin/chromium'
        ];
        for (const c of candidates) {
            if (fs.existsSync(c)) return c;
        }
        return '/usr/bin/chromium-browser'; // default standard debian/armbian path
    }

    /**
     * Launch standalone minimal X11 + Chromium in Kiosk mode
     */
    launchKioskSession() {
        if (this.isKioskRunning) return;

        const chromBin = this.getChromiumBinary();
        const kioskCmd = `startx ${chromBin} --kiosk --no-first-run --disable-infobars --disable-session-crashed-bubble --no-sandbox --disable-features=TranslateUI --disable-extensions --overscroll-history-navigation=0 --check-for-update-interval=31536000 --app=${this.appUrl} -- -nocursor`;

        this.logger('INFO', `Launching Kiosk Session: ${kioskCmd}`);

        try {
            // Spawn in background detached process
            const proc = spawn('bash', ['-c', kioskCmd], {
                detached: true,
                stdio: 'ignore',
                env: {
                    ...process.env,
                    DISPLAY: ':0'
                }
            });

            proc.unref();
            this.activeProcess = proc;
            this.isKioskRunning = true;

            proc.on('exit', (code, signal) => {
                this.logger('WARN', `Kiosk session process exited (code: ${code}, signal: ${signal})`);
                this.isKioskRunning = false;
                this.activeProcess = null;
            });

            proc.on('error', (err) => {
                this.logger('ERROR', `Failed to launch Kiosk session: ${err.message}`);
                this.isKioskRunning = false;
                this.activeProcess = null;
            });

        } catch (e) {
            this.logger('ERROR', `Execution exception launching Kiosk: ${e.message}`);
            this.isKioskRunning = false;
        }
    }

    /**
     * Terminate running X11 and Chromium sessions cleanly
     */
    killKioskSession() {
        this.logger('INFO', 'Stopping Kiosk and cleaning up X11/Chromium processes...');

        const killCmd = 'pkill -f chromium-browser; pkill -f chromium; pkill -f xinit; pkill -f Xorg; pkill -f startx';
        
        exec(killCmd, (err) => {
            // Ignore no process found errors
            this.isKioskRunning = false;
            this.activeProcess = null;
        });
    }

    /**
     * Get real-time status representation
     */
    getStatus() {
        return {
            addonName: 'arch3r-addon-hdmi-kiosk',
            version: '1.0.0',
            enabled: this.enabled,
            isHdmiConnected: this.isHdmiConnected,
            isKioskRunning: this.isKioskRunning,
            detectedSysPath: this.detectedSysPath,
            targetUrl: this.appUrl,
            pollIntervalMs: this.pollIntervalMs,
            lastCheckTime: this.lastCheckTime
        };
    }
}

// Singleton export
const instance = new HdmiKioskAddon();
module.exports = instance;
