/**
 * ============================================================================
 * ARCH3R NVR ADDON: HDMI HOT-PLUG & CHROMIUM KIOSK LAUNCHER (VER 1.0.1)
 * ============================================================================
 * Target Environment: Linux Armbian on Amlogic STB (e.g., Fiberhome HG860P)
 * Description: Automatically detects physical HDMI cable hot-plug state and
 * manages an ultra-lightweight standalone X11 / Chromium Kiosk session.
 * 
 * SAFETY MEASURES:
 * - Disabled by default (autoStart: false) to prevent crash loops / STB reboot.
 * - Validates binary prerequisites (startx, xorg, chromium) before execution.
 * - Circuit breaker: Cooldown & auto-pause on repeated launch failures.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { exec, spawn, execSync } = require('child_process');

class HdmiKioskAddon {
    constructor() {
        this.enabled = false; // DISABLED BY DEFAULT FOR STABILITY
        this.pollIntervalMs = 15000; // 15 seconds polling interval
        this.timer = null;
        this.isHdmiConnected = false;
        this.isKioskRunning = false;
        this.activeProcess = null;
        this.lastCheckTime = null;
        this.detectedSysPath = null;
        this.appUrl = 'http://localhost:3000';
        this.consecutiveFailures = 0;
        this.maxFailures = 3;
        this.lastFailureTime = 0;
        this.failureCooldownMs = 60000; // 1 minute cooldown after failure
        this.lastError = null;
        this.logger = (lvl, msg) => console.log(`[HDMI-KIOSK][${lvl}] ${msg}`);
        
        // Candidate sysfs status paths for HDMI in Linux kernel / DRM subsystem & Amlogic SoC
        this.hdmiStatusPaths = [
            '/sys/class/drm/card0-HDMI-A-1/status',
            '/sys/class/drm/card0-HDMI-A-2/status',
            '/sys/class/drm/card1-HDMI-A-1/status',
            '/sys/class/amhdmitx/amhdmitx0/hpd_state',           // Amlogic STB (HG860P / B860H)
            '/sys/devices/virtual/amhdmitx/amhdmitx0/hpd_state' // Amlogic alternative sysfs
        ];

        this.configPath = path.join(__dirname, 'kiosk_config.json');
        this.loadConfig();
    }

    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
                if (typeof data.enabled === 'boolean') this.enabled = data.enabled;
                if (data.appUrl) this.appUrl = data.appUrl;
            }
        } catch (e) {
            // Ignore config read error
        }
    }

    saveConfig() {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify({
                enabled: this.enabled,
                appUrl: this.appUrl,
                updatedAt: new Date().toISOString()
            }, null, 2));
        } catch (e) {
            // Ignore config write error
        }
    }

    /**
     * Check if necessary binaries (startx, Xorg, Chromium) exist on the system
     */
    checkPrerequisites() {
        const results = {
            startXExists: false,
            xorgExists: false,
            chromiumPath: null,
            ready: false,
            missing: []
        };

        // Check startx
        const startxPaths = ['/usr/bin/startx', '/bin/startx', '/usr/local/bin/startx'];
        for (const p of startxPaths) {
            if (fs.existsSync(p)) {
                results.startXExists = true;
                break;
            }
        }
        if (!results.startXExists) {
            results.missing.push('xinit (startx)');
        }

        // Check Xorg
        const xorgPaths = ['/usr/bin/Xorg', '/usr/lib/xorg/Xorg', '/usr/bin/X'];
        for (const p of xorgPaths) {
            if (fs.existsSync(p)) {
                results.xorgExists = true;
                break;
            }
        }
        if (!results.xorgExists) {
            results.missing.push('xserver-xorg');
        }

        // Check Chromium
        results.chromiumPath = this.getChromiumBinary();
        if (!results.chromiumPath) {
            results.missing.push('chromium-browser / chromium');
        }

        results.ready = results.startXExists && results.xorgExists && !!results.chromiumPath;
        return results;
    }

    /**
     * Initialize the Add-on with custom configuration
     * @param {Object} options 
     */
    init(options = {}) {
        if (options.appUrl) this.appUrl = options.appUrl;
        if (typeof options.pollIntervalMs === 'number') this.pollIntervalMs = options.pollIntervalMs;
        if (typeof options.logger === 'function') this.logger = options.logger;

        // Only start if explicitly enabled in config or options
        if (options.enabled !== undefined) {
            this.enabled = !!options.enabled;
        }

        const prereqs = this.checkPrerequisites();
        if (!prereqs.ready) {
            this.logger('WARN', `HDMI Kiosk Add-on in Standby. Paket yang belum terpasang: ${prereqs.missing.join(', ')}. Mode Kiosk tidak akan dijalankan otomatis.`);
        } else {
            this.logger('INFO', `HDMI Kiosk Add-on siap. Status Enabled: ${this.enabled}`);
        }

        if (this.enabled && prereqs.ready) {
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
        this.consecutiveFailures = 0;
        this.lastError = null;
        this.saveConfig();
        
        // Immediate check on start
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
        this.saveConfig();
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

        return { connected: false, path: null, rawValue: 'no_sysfs_found' };
    }

    /**
     * Periodic state evaluator
     */
    evaluateState() {
        if (!this.enabled) return;

        // Circuit breaker check
        if (this.consecutiveFailures >= this.maxFailures) {
            const now = Date.now();
            if (now - this.lastFailureTime < this.failureCooldownMs) {
                return; // Silently wait for cooldown to expire
            }
            // Cooldown expired, allow one retry
            this.consecutiveFailures = 0;
            this.logger('INFO', 'Circuit breaker cooldown selesai. Mencoba ulang evaluasi HDMI...');
        }

        const { connected, path: activePath, rawValue } = this.checkHdmiPhysicalStatus();
        const prevStatus = this.isHdmiConnected;
        this.isHdmiConnected = connected;

        if (connected !== prevStatus) {
            this.logger('INFO', `HDMI Status Transition: ${prevStatus ? 'CONNECTED' : 'DISCONNECTED'} -> ${connected ? 'CONNECTED' : 'DISCONNECTED'} (sysfs: ${activePath || 'none'}, raw: ${rawValue})`);
        }

        // 1. HDMI is plugged in and Kiosk is not running -> Launch GUI safely
        if (this.isHdmiConnected && !this.isKioskRunning) {
            this.launchKioskSession();
        }
        // 2. HDMI is unplugged while Kiosk is running -> Kill GUI to save RAM/CPU
        else if (!this.isHdmiConnected && this.isKioskRunning) {
            this.logger('INFO', 'HDMI cable unplugged. Terminating X11/Chromium session.');
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
        return null;
    }

    /**
     * Launch standalone minimal X11 + Chromium in Kiosk mode safely
     */
    launchKioskSession() {
        if (this.isKioskRunning) return;

        // Check prerequisites before spawning
        const prereqs = this.checkPrerequisites();
        if (!prereqs.ready) {
            this.lastError = `Paket belum lengkap: ${prereqs.missing.join(', ')}`;
            this.logger('WARN', `Tidak dapat meluncurkan Kiosk: ${this.lastError}. Jalankan 'sudo apt install xserver-xorg xinit chromium-browser'`);
            this.consecutiveFailures = this.maxFailures; // Pause until installed
            this.lastFailureTime = Date.now();
            return;
        }

        const chromBin = prereqs.chromiumPath;
        const kioskCmd = `startx ${chromBin} --kiosk --no-first-run --disable-infobars --disable-session-crashed-bubble --no-sandbox --disable-features=TranslateUI --disable-extensions --overscroll-history-navigation=0 --check-for-update-interval=31536000 --app=${this.appUrl} -- -nocursor`;

        this.logger('INFO', `Launching Kiosk Session safely...`);
        const startTime = Date.now();

        try {
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
                const duration = Date.now() - startTime;
                this.isKioskRunning = false;
                this.activeProcess = null;

                // If process exited very quickly (< 5 seconds), it's a failure (e.g. Xorg driver crash or permission issue)
                if (duration < 5000 || (code !== null && code !== 0)) {
                    this.consecutiveFailures++;
                    this.lastFailureTime = Date.now();
                    this.lastError = `Process exited unexpectedly in ${Math.round(duration/1000)}s (exit code: ${code})`;
                    this.logger('WARN', `Kiosk gagal berjalan (${this.lastError}). Percobaan gagal: ${this.consecutiveFailures}/${this.maxFailures}`);
                    
                    if (this.consecutiveFailures >= this.maxFailures) {
                        this.logger('ERROR', `Kiosk gagal berturut-turut. Menghentikan peluncuran otomatis selama ${this.failureCooldownMs/1000} detik untuk mencegah restart/beban CPU.`);
                    }
                } else {
                    this.consecutiveFailures = 0;
                    this.lastError = null;
                }
            });

            proc.on('error', (err) => {
                this.logger('ERROR', `Failed to spawn Kiosk session: ${err.message}`);
                this.isKioskRunning = false;
                this.activeProcess = null;
                this.consecutiveFailures++;
                this.lastFailureTime = Date.now();
                this.lastError = err.message;
            });

        } catch (e) {
            this.logger('ERROR', `Execution exception launching Kiosk: ${e.message}`);
            this.isKioskRunning = false;
            this.consecutiveFailures++;
            this.lastFailureTime = Date.now();
            this.lastError = e.message;
        }
    }

    /**
     * Terminate running X11 and Chromium sessions cleanly
     */
    killKioskSession() {
        if (!this.isKioskRunning && !this.activeProcess) {
            return;
        }
        this.logger('INFO', 'Stopping Kiosk and cleaning up X11/Chromium processes...');

        const killCmd = 'pkill -f chromium-browser 2>/dev/null; pkill -f chromium 2>/dev/null; pkill -f xinit 2>/dev/null; pkill -f Xorg 2>/dev/null; pkill -f startx 2>/dev/null';
        
        exec(killCmd, () => {
            this.isKioskRunning = false;
            this.activeProcess = null;
        });
    }

    /**
     * Get real-time status representation
     */
    getStatus() {
        const prereqs = this.checkPrerequisites();
        return {
            addonName: 'arch3r-addon-hdmi-kiosk',
            version: '1.0.1',
            enabled: this.enabled,
            isHdmiConnected: this.isHdmiConnected,
            isKioskRunning: this.isKioskRunning,
            detectedSysPath: this.detectedSysPath,
            targetUrl: this.appUrl,
            pollIntervalMs: this.pollIntervalMs,
            lastCheckTime: this.lastCheckTime,
            prerequisites: prereqs,
            consecutiveFailures: this.consecutiveFailures,
            lastError: this.lastError
        };
    }
}

// Singleton export
const instance = new HdmiKioskAddon();
module.exports = instance;
