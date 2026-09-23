/**
 * ============================================================================
 * ARCH3R NVR ADDON: HDMI NATIVE HARDWARE PLAYER (MPV DIRECT ENGINE)
 * ============================================================================
 * Target Environment: Linux Armbian on Amlogic STB (S905X / B860H / HG860P)
 * Karakteristik:
 * - Direct Hardware Decoding via Linux VPU / DRM / KMS (Tanpa Chromium / X11).
 * - Konsumsi RAM minimal (<60 MB) & ukuran instalasi super hemat (~25 MB).
 * - Mendukung Kontrol Smart Paging (Halaman Berikutnya / Sebelumnya / Grid).
 * - Komunikasi Instan melalui MPV IPC Unix Socket (/tmp/mpv-socket).
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const net = require('net');
const { exec } = require('child_process');

class HdmiNativeAddon {
    constructor() {
        this.enabled = false;
        this.isMpvInstalled = false;
        this.isServiceActive = false;
        this.isHdmiConnected = false;
        this.lastCheckTime = null;
        this.detectedSysPath = null;
        this.tourTimer = null;
        this.ipcSocketPath = '/tmp/mpv-socket';
        this.playlistPath = '/opt/arch3r-native/current_playlist.m3u';
        this.logger = (lvl, msg) => console.log(`[HDMI-NATIVE][${lvl}] ${msg}`);
        
        // State aktif saat ini
        this.liveState = {
            layout: 'quad',           // 'single' | 'quad'
            currentPage: 1,
            totalPages: 1,
            camsPerPage: 4,
            currentCamId: 'all',
            currentCamName: 'Semua Kamera',
            osdVisible: true,
            tour: false,
            tourInterval: 10,
            updatedAt: Date.now()
        };

        this.hdmiStatusPaths = [
            '/sys/class/drm/card0-HDMI-A-1/status',
            '/sys/class/drm/card0-HDMI-A-2/status',
            '/sys/class/drm/card1-HDMI-A-1/status',
            '/sys/class/amhdmitx/amhdmitx0/hpd_state',
            '/sys/devices/virtual/amhdmitx/amhdmitx0/hpd_state'
        ];
    }

    /**
     * Inisialisasi Add-on
     */
    init(options = {}) {
        if (typeof options.logger === 'function') this.logger = options.logger;
        this.loadConfig();
        this.checkHardwareStatus();
        this.logger('INFO', 'HDMI Native Hardware Add-on initialized (MPV Direct Engine).');
        return this;
    }

    /**
     * Memeriksa keberadaan MPV & koneksi fisik HDMI
     */
    checkHardwareStatus() {
        this.lastCheckTime = new Date().toISOString();

        // 1. Cek binary mpv di Linux
        exec('which mpv', (err, stdout) => {
            this.isMpvInstalled = !err && !!(stdout && stdout.trim());
        });

        // 2. Cek status systemd service
        exec('systemctl is-active arch3r-native 2>/dev/null', (err, stdout) => {
            this.isServiceActive = (stdout || '').trim() === 'active';
        });

        // 3. Cek HDMI sysfs
        for (const p of this.hdmiStatusPaths) {
            try {
                if (fs.existsSync(p)) {
                    const raw = fs.readFileSync(p, 'utf8').trim().toLowerCase();
                    this.detectedSysPath = p;
                    this.isHdmiConnected = (raw === 'connected' || raw === '1' || raw === 'on');
                    break;
                }
            } catch (_) {}
        }
    }

    /**
     * Memuat konfigurasi dari config.json
     */
    loadConfig() {
        const configPath = path.join(__dirname, 'config.json');
        try {
            if (fs.existsSync(configPath)) {
                this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                if (this.config.cams_per_page) this.liveState.camsPerPage = this.config.cams_per_page;
                if (this.config.layout) this.liveState.layout = this.config.layout;
                if (this.config.tour_interval) this.liveState.tourInterval = this.config.tour_interval;
            }
        } catch (e) {
            this.config = {};
        }
        return this.config || {};
    }

    /**
     * Menyimpan konfigurasi ke config.json
     */
    saveConfig(newCfg) {
        const configPath = path.join(__dirname, 'config.json');
        try {
            this.config = { ...this.loadConfig(), ...newCfg };
            fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2), 'utf8');
            return true;
        } catch (e) {
            this.logger('WARN', 'Failed to save config: ' + e.message);
            return false;
        }
    }

    /**
     * Mengirim perintah IPC JSON-RPC langsung ke soket Unix MPV (/tmp/mpv-socket)
     */
    sendMpvIpcCommand(commandArray) {
        return new Promise((resolve) => {
            if (!fs.existsSync(this.ipcSocketPath)) {
                return resolve({ success: false, error: 'MPV IPC Socket tidak aktif' });
            }

            const client = net.createConnection(this.ipcSocketPath, () => {
                const payload = JSON.stringify({ command: commandArray }) + '\n';
                client.write(payload);
            });

            client.setTimeout(1200);

            client.on('data', (data) => {
                client.destroy();
                try {
                    const res = JSON.parse(data.toString());
                    resolve({ success: true, response: res });
                } catch (_) {
                    resolve({ success: true, raw: data.toString() });
                }
            });

            client.on('error', (err) => {
                client.destroy();
                resolve({ success: false, error: err.message });
            });

            client.on('timeout', () => {
                client.destroy();
                resolve({ success: false, error: 'IPC Timeout' });
            });
        });
    }

    /**
     * Pindai dan deteksi port output DRM HDMI pada berbagai tipe SoC STB (Amlogic, Rockchip, Allwinner)
     */
    getDrmConnectors() {
        const drmPath = '/sys/class/drm';
        const connectors = [];
        let autoDetected = null;

        try {
            if (fs.existsSync(drmPath)) {
                const entries = fs.readdirSync(drmPath);
                for (const entry of entries) {
                    if (/HDMI/i.test(entry)) {
                        const statusFile = path.join(drmPath, entry, 'status');
                        let status = 'unknown';
                        try {
                            if (fs.existsSync(statusFile)) {
                                status = fs.readFileSync(statusFile, 'utf8').trim();
                            }
                        } catch (_) {}

                        const cleanName = entry.replace(/^card[0-9]+-/, '');
                        connectors.push({
                            id: cleanName,
                            fullName: entry,
                            status: status
                        });

                        if (status.toLowerCase() === 'connected' && !autoDetected) {
                            autoDetected = cleanName;
                        }
                    }
                }
            }
        } catch (e) {
            this.logger('WARN', 'Error scanning DRM connectors: ' + e.message);
        }

        const currentConfig = (this.config && this.config.drm_connector) || 'auto';
        return {
            connectors,
            currentConfig,
            autoDetected: autoDetected || 'HDMI-A-1',
            effectiveConnector: currentConfig === 'auto' ? (autoDetected || 'HDMI-A-1') : currentConfig
        };
    }

    /**
     * Simpan konfigurasi baru dan perbarui script launcher
     */
    saveConfig(newConfig, callback) {
        this.loadConfig();
        this.config = Object.assign(this.config || {}, newConfig);
        try {
            fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2), 'utf8');
            this.ensureNativeScript(() => {
                if (typeof callback === 'function') callback(null, this.config);
            });
        } catch (e) {
            if (typeof callback === 'function') callback(e, null);
        }
    }

    /**
     * Pastikan script launcher /opt/arch3r-native/start-native.sh selalu menggunakan konfigurasi hemat CPU
     */
    ensureNativeScript(callback) {
        const nativeDir = '/opt/arch3r-native';
        const scriptPath = path.join(nativeDir, 'start-native.sh');
        this.loadConfig();
        const configuredConnector = (this.config && this.config.drm_connector) ? this.config.drm_connector : 'auto';

        try {
            const scriptContent = `#!/bin/bash
# ==============================================================================
# Peluncur MPV Direct Hardware Video Engine (Low-CPU & Low-Latency Optimized)
# ==============================================================================
SOCKET="/tmp/mpv-socket"
PLAYLIST="/opt/arch3r-native/current_playlist.m3u"

# Bersihkan sisa socket lama
rm -f "$SOCKET" 2>/dev/null || true

# Jika file playlist belum ada, buat default standby screen ringan (5 FPS)
if [ ! -f "$PLAYLIST" ]; then
    echo "#EXTM3U" > "$PLAYLIST"
    echo "#EXTINF:-1, Arch3r Standby" >> "$PLAYLIST"
    echo "avdevice://lavfi:color=c=0x0b132b:s=1280x720:r=5" >> "$PLAYLIST"
fi

# Auto-Deteksi Port Konektor DRM HDMI aktif di Linux Armbian (Amlogic, Rockchip, Allwinner, dll)
CONFIG_CONNECTOR="${configuredConnector}"
TARGET_CONNECTOR=""

if [ -n "$CONFIG_CONNECTOR" ] && [ "$CONFIG_CONNECTOR" != "auto" ]; then
    TARGET_CONNECTOR="$CONFIG_CONNECTOR"
else
    # 1. Pindai port HDMI yang statusnya 'connected' di /sys/class/drm/
    for status_file in /sys/class/drm/*HDMI*/status /sys/class/drm/*hdmi*/status; do
        if [ -f "$status_file" ] && grep -qi "connected" "$status_file" 2>/dev/null; then
            TARGET_CONNECTOR=$(basename "$(dirname "$status_file")" | sed -E 's/^card[0-9]+-//')
            break
        fi
    done

    # 2. Fallback jika status file belum terbaca
    if [ -z "$TARGET_CONNECTOR" ]; then
        for conn_dir in /sys/class/drm/*HDMI* /sys/class/drm/*hdmi*; do
            if [ -d "$conn_dir" ]; then
                TARGET_CONNECTOR=$(basename "$conn_dir" | sed -E 's/^card[0-9]+-//')
                break
            fi
        done
    fi

    # 3. Default fallback standar STB Amlogic & Rockchip
    if [ -z "$TARGET_CONNECTOR" ]; then
        TARGET_CONNECTOR="HDMI-A-1"
    fi
fi

echo "[Arch3r-Native] Menjalankan MPV Hardware Engine (Direct DRM: $TARGET_CONNECTOR)..."

# Jalankan MPV dengan akselerasi hardware DRM langsung ke HDMI tanpa X11
exec mpv \\
    --drm-connector="$TARGET_CONNECTOR" \\
    --idle=yes \\
    --keep-open=always \\
    --force-window=immediate \\
    --input-ipc-server="$SOCKET" \\
    --profile=low-latency \\
    --demuxer-lavf-o=rtsp_transport=tcp \\
    --demuxer-readahead-secs=1 \\
    --network-timeout=5 \\
    --stream-lavf-o=reconnect=1,reconnect_streamed=1,reconnect_delay_max=3 \\
    --hwdec=auto-safe \\
    --vo=drm,fbdev,gpu \\
    --no-audio \\
    --fs \\
    --cursor-autohide=always \\
    --osd-level=1 \\
    --osd-font-size=24 \\
    --osd-color='#38bdf8' \\
    --osd-border-color='#0f172a' \\
    --osd-border-size=2 \\
    --osd-duration=3000 \\
    "$PLAYLIST"
`;
            let writeSuccess = false;
            try {
                if (!fs.existsSync(nativeDir)) {
                    fs.mkdirSync(nativeDir, { recursive: true });
                }
                fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });
                writeSuccess = true;
            } catch (_) {}

            const tempPath = '/tmp/arch3r_start_native.sh';
            try {
                fs.writeFileSync(tempPath, scriptContent, { mode: 0o755 });
            } catch (_) {}

            const applySudoCmd = `sudo mkdir -p /opt/arch3r-native && sudo cp ${tempPath} /opt/arch3r-native/start-native.sh && sudo chmod 755 /opt/arch3r-native/start-native.sh 2>/dev/null || true; sudo sed -i "s/Environment=DISPLAY=:0/StandardInput=tty\\nStandardOutput=journal\\nStandardError=journal\\nTTYPath=\\/dev\\/tty1\\nTTYReset=yes\\nTTYVHangup=yes\\nEnvironment=XDG_RUNTIME_DIR=\\/run\\/user\\/0/g" /etc/systemd/system/arch3r-native.service 2>/dev/null || true; sudo systemctl daemon-reload 2>/dev/null || true`;
            exec(applySudoCmd, (cmdErr) => {
                if (typeof callback === 'function') callback(true, 'Script and service updated');
            });

            return true;
        } catch (err) {
            this.logger('WARN', 'Failed to ensure native script: ' + err.message);
            if (typeof callback === 'function') callback(false, err.message);
            return false;
        }
    }

    /**
     * Kontrol Systemd Service arch3r-native (Dengan proteksi mutual-exclusion terhadap arch3r-kiosk)
     */
    controlService(action, callback) {
        if (!['start', 'stop', 'restart', 'status'].includes(action)) {
            if (callback) callback(new Error('Invalid action'));
            return;
        }

        if (action === 'start' || action === 'restart') {
            // Perbarui script launcher ke versi hemat CPU sebelum start/restart
            this.ensureNativeScript(() => {
                // Hentikan service kiosk Chromium agar tidak berebut CPU dan output HDMI
                const cmd = `sudo systemctl stop arch3r-kiosk 2>/dev/null; sudo systemctl disable arch3r-kiosk 2>/dev/null; sudo systemctl ${action} arch3r-native 2>/dev/null || systemctl ${action} arch3r-native 2>/dev/null`;
                exec(cmd, (err, stdout, stderr) => {
                    this.checkHardwareStatus();
                    if (callback) callback(err, { success: !err, stdout, stderr });
                });
            });
        } else {
            exec(`sudo systemctl ${action} arch3r-native 2>/dev/null || systemctl ${action} arch3r-native 2>/dev/null`, (err, stdout, stderr) => {
                this.checkHardwareStatus();
                if (callback) callback(err, { success: !err, stdout, stderr });
            });
        }
    }

    /**
     * Eksekusi Remote Kontrol Pintar dari Smartphone (Paging, Layout, OSD, Tour)
     */
    async handleRemoteCommand(payload, availableCams = []) {
        this.liveState.updatedAt = Date.now();
        const totalCams = availableCams.length;
        const camsPerPage = this.liveState.camsPerPage || 4;
        this.liveState.totalPages = Math.max(1, Math.ceil(totalCams / camsPerPage));

        // 1. Paging: Halaman Berikutnya (Next Page)
        if (payload.action === 'next_page') {
            this.liveState.currentPage = (this.liveState.currentPage % this.liveState.totalPages) + 1;
            this.liveState.layout = 'quad';
            this.applyCurrentPagePlaylist(availableCams);
            await this.sendMpvIpcCommand(['show-text', `Halaman ${this.liveState.currentPage} / ${this.liveState.totalPages}`, 2500]);
            return { success: true, liveState: this.liveState };
        }

        // 2. Paging: Halaman Sebelumnya (Prev Page)
        if (payload.action === 'prev_page') {
            this.liveState.currentPage = this.liveState.currentPage > 1 ? this.liveState.currentPage - 1 : this.liveState.totalPages;
            this.liveState.layout = 'quad';
            this.applyCurrentPagePlaylist(availableCams);
            await this.sendMpvIpcCommand(['show-text', `Halaman ${this.liveState.currentPage} / ${this.liveState.totalPages}`, 2500]);
            return { success: true, liveState: this.liveState };
        }

        // 3. Pindah langsung ke Nomor Halaman Tertentu
        if (payload.action === 'set_page' && typeof payload.page === 'number') {
            this.liveState.currentPage = Math.min(Math.max(1, payload.page), this.liveState.totalPages);
            this.liveState.layout = 'quad';
            this.applyCurrentPagePlaylist(availableCams);
            await this.sendMpvIpcCommand(['show-text', `Halaman ${this.liveState.currentPage} / ${this.liveState.totalPages}`, 2500]);
            return { success: true, liveState: this.liveState };
        }

        // 4. Fokus Kamera Tunggal (Single Camera Fullscreen)
        if (payload.action === 'single_cam' || payload.camId) {
            const cam = availableCams.find(c => String(c.id) === String(payload.camId));
            if (cam) {
                this.liveState.layout = 'single';
                this.liveState.currentCamId = cam.id;
                this.liveState.currentCamName = cam.name || `Kamera ${cam.id}`;
                const rtspPath = cam.mediaMtxPath || cam.id;
                const streamUrl = `rtsp://127.0.0.1:8554/${rtspPath}`;
                
                await this.sendMpvIpcCommand(['loadfile', streamUrl, 'replace']);
                await this.sendMpvIpcCommand(['show-text', `[KAMERA] ${this.liveState.currentCamName}`, 3000]);
                return { success: true, liveState: this.liveState };
            }
        }

        // 5. Kembali ke Layout Multi-Kamera (Quad 4 Kamera)
        if (payload.action === 'quad') {
            this.liveState.layout = 'quad';
            this.applyCurrentPagePlaylist(availableCams);
            await this.sendMpvIpcCommand(['show-text', `[QUAD] Tampilan 4 Kamera`, 2500]);
            return { success: true, liveState: this.liveState };
        }

        // 6. Toggle OSD (Teks Nama Kamera di Layar TV)
        if (payload.action === 'toggle_osd') {
            this.liveState.osdVisible = !this.liveState.osdVisible;
            await this.sendMpvIpcCommand(['cycle', 'osd-level']);
            await this.sendMpvIpcCommand(['show-text', this.liveState.osdVisible ? 'OSD Aktif' : 'OSD Nonaktif', 2000]);
            return { success: true, liveState: this.liveState };
        }

        // 7. Toggle Auto-Tour / Paging Otomatis
        if (payload.action === 'toggle_tour') {
            this.liveState.tour = !this.liveState.tour;
            if (this.liveState.tour) {
                this.startTourTimer(availableCams);
            } else {
                this.stopTourTimer();
            }
            await this.sendMpvIpcCommand(['show-text', this.liveState.tour ? '[TOUR] Auto-Tour Aktif' : '[TOUR] Auto-Tour Berhenti', 2500]);
            return { success: true, liveState: this.liveState };
        }

        // 8. Sambung Ulang (Refresh / Reconnect)
        if (payload.action === 'refresh') {
            if (this.liveState.layout === 'single') {
                const cam = availableCams.find(c => String(c.id) === String(this.liveState.currentCamId));
                if (cam) {
                    const streamUrl = `rtsp://127.0.0.1:8554/${cam.mediaMtxPath || cam.id}`;
                    await this.sendMpvIpcCommand(['loadfile', streamUrl, 'replace']);
                }
            } else {
                this.applyCurrentPagePlaylist(availableCams);
            }
            await this.sendMpvIpcCommand(['show-text', '[CONNECT] Menghubungkan Ulang RTSP...', 2000]);
            return { success: true, liveState: this.liveState };
        }

        return { success: false, error: 'Aksi remote tidak dikenali' };
    }

    /**
     * Memperbarui file playlist dan memicu pergantian stream di MPV
     */
    applyCurrentPagePlaylist(availableCams) {
        if (!availableCams || availableCams.length === 0) return;

        const camsPerPage = this.liveState.camsPerPage || 4;
        const startIndex = (this.liveState.currentPage - 1) * camsPerPage;
        const pageCams = availableCams.slice(startIndex, startIndex + camsPerPage);

        // Buat file playlist M3U lokal
        let m3u = '#EXTM3U\n';
        pageCams.forEach(cam => {
            const subPath = cam.mediaMtxSubPath || ((cam.mediaMtxPath || cam.id) + '_sub');
            const mainPath = cam.mediaMtxPath || cam.id;
            // Gunakan sub-stream jika multi-kamera untuk menjaga beban STB tetap dingin
            const streamPath = cam.subStreamUrl ? subPath : mainPath;
            m3u += `#EXTINF:-1,${cam.name || cam.id}\n`;
            m3u += `rtsp://127.0.0.1:8554/${streamPath}\n`;
        });

        try {
            const dir = path.dirname(this.playlistPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(this.playlistPath, m3u, 'utf8');

            // Perintahkan MPV untuk me-load playlist baru
            if (pageCams.length > 0) {
                const firstCam = pageCams[0];
                const firstStream = `rtsp://127.0.0.1:8554/${firstCam.subStreamUrl ? (firstCam.mediaMtxSubPath || (firstCam.id + '_sub')) : (firstCam.mediaMtxPath || firstCam.id)}`;
                this.sendMpvIpcCommand(['loadfile', firstStream, 'replace']);
            }
        } catch (e) {
            this.logger('WARN', 'Failed to write playlist: ' + e.message);
        }
    }

    /**
     * Timer Auto-Tour / Paging Otomatis
     */
    startTourTimer(availableCams) {
        this.stopTourTimer();
        const intervalSec = (this.liveState.tourInterval || 10) * 1000;
        this.tourTimer = setInterval(() => {
            this.handleRemoteCommand({ action: 'next_page' }, availableCams);
        }, intervalSec);
    }

    stopTourTimer() {
        if (this.tourTimer) {
            clearInterval(this.tourTimer);
            this.tourTimer = null;
        }
    }

    /**
     * Diagnosa status sistem Armbian untuk Addon Native
     */
    getDiagnostics(callback) {
        const drmInfo = this.getDrmConnectors();
        const diag = {
            hasMpv: false,
            hasSocat: false,
            hasIpcSocket: fs.existsSync(this.ipcSocketPath),
            isServiceActive: false,
            isHdmiConnected: this.isHdmiConnected,
            detectedSysPath: this.detectedSysPath,
            drmConnectors: drmInfo.connectors,
            activeDrmConnector: drmInfo.effectiveConnector,
            drmConfig: drmInfo.currentConfig,
            serviceLogs: '',
            recommendation: ''
        };

        exec('which mpv', (err, stdout) => {
            diag.hasMpv = !err && !!(stdout && stdout.trim());
            exec('which socat', (err2, stdout2) => {
                diag.hasSocat = !err2 && !!(stdout2 && stdout2.trim());
                exec('systemctl is-active arch3r-native 2>/dev/null', (err3, stdout3) => {
                    diag.isServiceActive = (stdout3 || '').trim() === 'active';
                    exec('journalctl -u arch3r-native -n 25 --no-pager 2>/dev/null', (err4, stdout4) => {
                        diag.serviceLogs = stdout4 ? stdout4.trim() : 'Tidak ada log service terbaru.';

                        if (!diag.hasMpv) {
                            diag.recommendation = '⚠️ MPV Player belum terpasang. Jalankan: sudo apt-get install -y mpv socat di terminal STB (Ukuran hanya ~25MB).';
                        } else if (!diag.isServiceActive) {
                            diag.recommendation = 'ℹ️ Service arch3r-native belum berjalan. Nyalakan lewat dashboard atau jalankan: sudo systemctl start arch3r-native.';
                        } else if (!diag.isHdmiConnected) {
                            diag.recommendation = 'ℹ️ Kabel HDMI ke TV/Monitor tidak terdeteksi atau TV dalam keadaan mati.';
                        } else {
                            diag.recommendation = '✅ MPV Hardware Engine siap beroperasi dengan akselerasi VPU langsung ke port HDMI.';
                        }

                        if (callback) callback(null, diag);
                    });
                });
            });
        });
    }

    /**
     * Representasi status terkini
     */
    getStatus() {
        this.checkHardwareStatus();
        this.loadConfig();
        const drmInfo = this.getDrmConnectors();
        return {
            addonName: 'arch3r-addon-hdmi-native',
            version: '1.0.0',
            engine: 'MPV Direct Hardware (VPU)',
            isMpvInstalled: this.isMpvInstalled,
            isServiceActive: this.isServiceActive,
            isHdmiConnected: this.isHdmiConnected,
            detectedSysPath: this.detectedSysPath,
            lastCheckTime: this.lastCheckTime,
            liveState: this.liveState,
            config: this.config || {},
            drmConnectors: drmInfo.connectors,
            activeDrmConnector: drmInfo.effectiveConnector,
            drmConfig: drmInfo.currentConfig,
            footprint: {
                diskUsageMb: '~25 MB (Super Ringan)',
                ramUsageMb: '< 60 MB (Hemat RAM)',
                noChromium: true
            }
        };
    }
}

const instance = new HdmiNativeAddon();
module.exports = instance;
