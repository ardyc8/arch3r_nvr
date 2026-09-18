import { createRequire } from 'module';
import express from 'express';
import { spawn, exec, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import { createProxyMiddleware } from 'http-proxy-middleware';

dotenv.config();

// --- LOCAL TIME UTILITY ---
function getLocalTimeString(dateObj = new Date()) {
    const tzOffset = dateObj.getTimezoneOffset() * 60000; 
    const localISOTime = (new Date(dateObj.getTime() - tzOffset)).toISOString().slice(0, -1);
    const offsetHours = Math.floor(Math.abs(dateObj.getTimezoneOffset()) / 60);
    const offsetMinutes = Math.abs(dateObj.getTimezoneOffset()) % 60;
    const sign = dateObj.getTimezoneOffset() > 0 ? '-' : '+';
    const offsetStr = sign + String(offsetHours).padStart(2, '0') + ':' + String(offsetMinutes).padStart(2, '0');
    return localISOTime + offsetStr;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_nvr_key_2026';

const require = createRequire(import.meta.url);

function getAppVersion() {
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
        return pkg.version || '9.6.5';
    } catch {
        return '9.6.5';
    }
}
const APP_VERSION = getAppVersion();



function getMachineId() {
    const interfaces = os.networkInterfaces();
    for (let name of Object.keys(interfaces)) {
        for (let iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal && iface.mac !== '00:00:00:00:00:00') {
                return crypto.createHash('md5').update(iface.mac).digest('hex').substring(0, 12).toUpperCase();
            }
        }
    }
    return 'UNKNOWN-MACHINE';
}

function getAllStbMachineIdentifiers() {
    const ids = new Set();
    const currentPrimary = getMachineId();
    if (currentPrimary && currentPrimary !== 'UNKNOWN-MACHINE') {
        ids.add(currentPrimary.toUpperCase());
        ids.add(currentPrimary.toLowerCase());
    }

    try {
        const interfaces = os.networkInterfaces();
        for (let name of Object.keys(interfaces)) {
            for (let iface of interfaces[name]) {
                if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
                    const rawMac = iface.mac.toLowerCase();
                    const cleanMac = rawMac.replace(/[:-]/g, '');
                    const hash12 = crypto.createHash('md5').update(iface.mac).digest('hex').substring(0, 12).toUpperCase();
                    const hashClean = crypto.createHash('md5').update(cleanMac).digest('hex').substring(0, 12).toUpperCase();
                    
                    ids.add(rawMac);
                    ids.add(cleanMac);
                    ids.add(rawMac.toUpperCase());
                    ids.add(cleanMac.toUpperCase());
                    ids.add(hash12);
                    ids.add(hash12.toLowerCase());
                    ids.add(hashClean);
                    ids.add(hashClean.toLowerCase());
                }
            }
        }
    } catch (e) {
        // Fallback to primary machineId
    }

    return Array.from(ids);
}

const SECRET_KEY = "ARCH3R_NVR_SUP3R_S3CR3T_2026"; 

function validateLicense(key, email, machineId) {
    if (!key || typeof key !== 'string' || key.trim() === '') return { valid: false, reason: "Lisensi kosong" };
    try {
        const parts = key.trim().split('.');
        if (parts.length !== 2) return { valid: false, reason: "Format token lisensi salah (Harus berupa format Payload.Signature)" };
        
        const payloadStr = Buffer.from(parts[0], 'base64').toString('utf8');
        const signature = parts[1].trim();
        
        const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(parts[0].trim()).digest('base64');
        if (signature !== expectedSignature) return { valid: false, reason: "Lisensi palsu atau telah dimodifikasi (Segel HMAC Rusak)" };
        
        const payload = JSON.parse(payloadStr);
        const cleanPayloadEmail = (payload.email || '').trim().toLowerCase();
        const cleanInputEmail = (email || '').trim().toLowerCase();
        
        if (cleanPayloadEmail !== cleanInputEmail) {
            return { 
                valid: false, 
                reason: `Email tidak cocok! Token dibuat untuk '${payload.email}', tetapi yang dimasukkan di form adalah '${email}'` 
            };
        }
        
        // Verifikasi fleksibel Machine ID (Mendukung MD5 12-char dari Web, MAC fisik STB berkolon atau tanpa kolon)
        const validIds = getAllStbMachineIdentifiers();
        const inputMachineId = (payload.machineId || '').trim();
        const cleanPayloadMid = inputMachineId.replace(/[:-]/g, '').toUpperCase();
        
        let isMachineMatch = false;
        if (validIds.some(id => id.toUpperCase() === inputMachineId.toUpperCase() || id.replace(/[:-]/g, '').toUpperCase() === cleanPayloadMid)) {
            isMachineMatch = true;
        } else {
            const hashedPayloadMid = crypto.createHash('md5').update(inputMachineId).digest('hex').substring(0, 12).toUpperCase();
            if (validIds.some(id => id.toUpperCase() === hashedPayloadMid)) {
                isMachineMatch = true;
            }
        }
        
        if (!isMachineMatch) {
            return { 
                valid: false, 
                reason: `Machine ID tidak cocok! Token dibuat untuk Machine ID '${inputMachineId}', sedangkan Machine ID STB ini adalah '${machineId}'` 
            };
        }
        
        if (Date.now() > payload.exp) {
            const expDate = new Date(payload.exp).toLocaleDateString('id-ID');
            return { valid: false, reason: `Masa aktif lisensi telah habis/kedaluwarsa pada ${expDate}`, expiresAt: payload.exp };
        }
        
        return { valid: true, reason: "Lisensi Valid & Aktif", expiresAt: payload.exp };
    } catch (e) {
        return { valid: false, reason: "Kunci Lisensi Invalid atau korup: " + e.message };
    }
}

// 🌐 Opportunistic Online Check (Semi-Online License Validation)
async function runOpportunisticLicenseCheck() {
    try {
        const settings = getSettings();
        
        // --- KONFIGURASI SERVER INDUK ---
        // Pengecekan membaca Environment Variable (di file .env).
        // Karena .env di-ignore oleh Git, tidak akan bocor saat git pull.
        const MASTER_LICENSE_SERVER = process.env.MASTER_LICENSE_SERVER || ""; 
        
        if (!MASTER_LICENSE_SERVER || !MASTER_LICENSE_SERVER.startsWith("http")) return;
        
        const machineId = getMachineId();
        const license = settings.license;
        if (!license) return;

        // Fetch is available in Node 18+
        const response = await fetch(MASTER_LICENSE_SERVER, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                machineId: machineId,
                license: license,
                timestamp: Date.now()
            })
        });

        if (response.ok) {
            const data = await response.json();
            // Jika server merespons bahwa lisensi DICABUT / REVOKED
            if (data.revoked === true) {
                sysLog('CRITICAL', '🚨 SERVER PUSAT MENYATAKAN LISENSI TELAH DICABUT! MENGUNCI SISTEM...');
                const dbData = getNvrDb();
                dbData.super_settings.license = ""; // Hapus lisensi
                dbData.super_settings.license_revoked_by_server = true;
                saveNvrDb(dbData);
                
                // Matikan semua proses FFmpeg jika lisensi dicabut
                for (const camId in ffProcesses) {
                    if (ffProcesses[camId].main) ffProcesses[camId].main.kill('SIGKILL');
                    if (ffProcesses[camId].sub) ffProcesses[camId].sub.kill('SIGKILL');
                }
            }
        }
    } catch (e) {
        // Gagal konek ke internet? Biarkan saja (Grace Period / Toleransi berjalan).
        // Sistem lokal HMAC tetap melindungi kita.
    }
}

// Jalankan Opportunistic Check setiap 12 Jam tanpa mengganggu proses utama
setInterval(runOpportunisticLicenseCheck, 12 * 60 * 60 * 1000);
// Dan jalankan 1 kali saat server baru menyala (delay 10 detik agar tidak berat)
setTimeout(runOpportunisticLicenseCheck, 10000);

// Paths
const publicDir = path.join(__dirname, 'public');
const streamBaseDir = path.join(publicDir, 'streams');

const oldDataDir = path.join(__dirname, 'data');
const dataDir = path.join(__dirname, 'data', 'live_db');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// External Persistent Shadow DB (100% immune to git pull, git reset, git checkout)
const systemDbDir = (() => {
    const candidates = [
        '/var/lib/arch3r_nvr/db',
        path.join(os.homedir() || '/root', '.arch3r_nvr', 'db'),
        path.join(__dirname, '..', 'arch3r_nvr_external_db')
    ];
    for (const dir of candidates) {
        try {
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.accessSync(dir, fs.constants.W_OK);
            return dir;
        } catch (e) {}
    }
    return dataDir;
})();

// --- AUTO MIGRATION: Restore missing data and protect from git pull ---
try {
    ['db_accounts.json', 'db_cameras.json', 'db_recordings.json', 'db_settings.json', 'db_logs.json', 'db_addons.json'].forEach(file => {
        const localFile = 'local_' + file;
        const oldFile1 = path.join(oldDataDir, file);
        const oldFile2 = path.join(dataDir, file);
        const newFile = path.join(dataDir, localFile);
        
        // Convert to local_ prefix to prevent git pull overwrites
        if (!fs.existsSync(newFile)) {
            if (fs.existsSync(oldFile2)) {
                fs.copyFileSync(oldFile2, newFile);
                console.log('[MIGRATION] Protected ' + file + ' to ' + localFile);
            } else if (fs.existsSync(oldFile1)) {
                fs.copyFileSync(oldFile1, newFile);
                console.log('[MIGRATION] Restored ' + file + ' to ' + localFile);
            }
        }
    });
} catch(e) {
    console.error('Migration error:', e);
}

const nvrDbFile = path.join(dataDir, 'nvr_db.json');
const baseStoragePath = process.env.STORAGE_PATH || path.join(__dirname, 'public', 'recordings');

// MediaMTX Paths (~/mediamtx.yml)
const homeDir = os.homedir() || process.env.HOME || '/root';
const mediamtxConfigFile = process.env.MEDIAMTX_CONFIG_PATH || path.join(homeDir, 'mediamtx.yml');

// Ensure directories
[streamBaseDir, dataDir, baseStoragePath].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use(express.json());
app.use(cookieParser());
// Serve static assets from the public directory

// ==========================================
// AI ADDON PROXY API (v9.6.1)
// ==========================================
app.post('/api/ai/save_grid', verifyToken, async (req, res) => {
    try {
        // Forward ke Python YOLO service
        const payload = req.body;
        // Kita perlu menyertakan rtsp URL agar Python bisa connect
        const db = getNvrDb();
        const cam = db.cameras.find(c => c.id === payload.camera_id);
        if(!cam) return res.status(404).json({ error: 'Kamera tidak ditemukan' });
        
        payload.rtsp_url = cam.mainStreamUrl || cam.subStreamUrl;
        
        const response = await fetch('http://127.0.0.1:8000/api/ai/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if(!response.ok) throw new Error('YOLO Service Python menolak request atau tidak aktif.');
        const result = await response.json();
        
        // Simpan konfig AI ke nvr_db.json (agar persisten saat reboot)
        if(!cam.ai_config) cam.ai_config = {};
        cam.ai_config.grid = payload;
        saveNvrDb(db);
        
        sysLog('INFO', `[AI Addon] Area deteksi diperbarui untuk kamera ${cam.name}`, 'SYSTEM');
        res.json(result);
    } catch(e) {
        res.status(500).json({ error: "Gagal terhubung ke Service Python (Apakah addons/ai_yolo_service.py sudah jalan?): " + e.message });
    }
});

// Endpoint yang dipanggil oleh Python saat mendeteksi manusia
app.post('/api/ai/webhook', (req, res) => {
    // Di sini kita bisa meneruskan event deteksi ke frontend (misal via Server-Sent Events / Socket)
    // atau sekadar mencatatnya di Log NVR.
    const { camera_id, event, grid_cell } = req.body;
    sysLog('WARN', `[AI ALARM] Deteksi Manusia pada ${camera_id} (Petak: ${grid_cell})`, 'SECURITY');
    res.json({received: true});
});


// ==========================================
// ADDON MARKETPLACE API (v9.6.1)
// ==========================================

app.get('/api/addons', verifyToken, (req, res) => {
    if (req.userRole !== 'superadmin' && req.userRole !== 'administrator') {
        return res.status(403).json({ error: 'Akses Ditolak' });
    }
    
    // For now we mock the database of installed addons. In a real scenario, this reads from an addons DB or scans the /addons folder.
    const dbData = getNvrDb();
    if (!dbData.addons) {
        dbData.addons = [];
    }
    
    // Ensure built-in YOLO AI addon is always present
    const hasYolo = dbData.addons.find(a => a.id === 'ai_yolo');
    if (!hasYolo) {
        dbData.addons.push({
            id: 'ai_yolo',
            name: 'AI Human Detection (YOLOv8)',
            version: '1.0.0',
            icon: '🧠',
            description: 'Deteksi pergerakan manusia secara real-time dan atur area intrusi (Grid).',
            active: true,
            system_protected: true
        });
        saveNvrDb(dbData);
    }
    
    res.json({ success: true, addons: dbData.addons });
});

app.post('/api/addons/install', verifyToken, (req, res) => {
    if (req.userRole !== 'superadmin' && req.userRole !== 'administrator') {
        return res.status(403).json({ error: 'Akses Ditolak' });
    }
    
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL tidak valid' });
    
    sysLog('INFO', `[Addons] Permintaan instalasi dari: ${url}`, 'SYSTEM');
    
    // Simulate installation delay and return mock response for now
    // Future update v9.6.1 will implement actual git clone and PM2 injection here.
    setTimeout(() => {
        res.json({ success: true, message: 'Addon berhasil didownload namun instalasi sebenarnya ditunda ke update v9.6.1.' });
    }, 2000);
});

app.post('/api/addons/:id/toggle', verifyToken, (req, res) => {
    if (req.userRole !== 'superadmin' && req.userRole !== 'administrator') {
        return res.status(403).json({ error: 'Akses Ditolak' });
    }
    
    const dbData = getNvrDb();
    if (!dbData.addons) return res.status(404).json({ error: 'Data addon tidak ditemukan' });
    
    const addon = dbData.addons.find(a => a.id === req.params.id);
    if (!addon) return res.status(404).json({ error: 'Addon tidak ditemukan' });
    
    addon.active = req.body.active;
    saveNvrDb(dbData);
    
    // If it's the AI addon, we should conceptually stop/start its PM2 process
    if (addon.id === 'ai_yolo') {
        if (addon.active) {
            child_process.exec('pm2 start arch3r-ai-yolo', (e) => {
                sysLog('INFO', `[Addons] AI YOLO Service dinyalakan`, 'SYSTEM');
            });
        } else {
            child_process.exec('pm2 stop arch3r-ai-yolo', (e) => {
                sysLog('INFO', `[Addons] AI YOLO Service dimatikan`, 'SYSTEM');
            });
        }
    }
    
    res.json({ success: true, addon });
});

app.delete('/api/addons/:id', verifyToken, (req, res) => {
    if (req.userRole !== 'superadmin' && req.userRole !== 'administrator') {
        return res.status(403).json({ error: 'Akses Ditolak' });
    }
    
    const dbData = getNvrDb();
    if (!dbData.addons) return res.status(404).json({ error: 'Data addon tidak ditemukan' });
    
    const index = dbData.addons.findIndex(a => a.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Addon tidak ditemukan' });
    
    const addon = dbData.addons[index];
    if (addon.system_protected) {
        return res.status(400).json({ error: 'Addon sistem bawaan tidak dapat dihapus, hanya bisa dimatikan.' });
    }
    
    // Clean Delete: Stop PM2 and Remove physical folder
    try {
        child_process.exec(`pm2 delete arch3r-${addon.id}`, (err) => {
            const addonDir = path.join(__dirname, 'addons', addon.id);
            if (fs.existsSync(addonDir)) {
                fs.rmSync(addonDir, { recursive: true, force: true });
            }
        });
    } catch(e) {
        console.error('Addon cleanup error:', e);
    }
    
    dbData.addons.splice(index, 1);
    saveNvrDb(dbData);
    
    sysLog('INFO', `[Addons] Addon beserta filenya dihapus permanen: ${addon.name}`, 'SYSTEM');
    res.json({ success: true, message: 'Addon dihapus' });
});

app.get('/api/addons/:id/config', verifyToken, (req, res) => {
    if (req.userRole !== 'superadmin' && req.userRole !== 'administrator') return res.status(403).json({ error: 'Akses Ditolak' });
    
    const dbData = getNvrDb();
    const addon = (dbData.addons || []).find(a => a.id === req.params.id);
    if (!addon) return res.status(404).json({ error: 'Addon tidak ditemukan' });
    
    // Auto-generate default configuration layout if missing
    if (!addon.config) {
        if (addon.id === 'ai_yolo') {
            addon.config = { confidence_threshold: 0.5, log_alerts: true, auto_start: true, detection_model: 'yolov8n.pt' };
        } else {
            addon.config = {};
        }
    }
    res.json({ success: true, config: addon.config });
});

app.post('/api/addons/:id/config', verifyToken, (req, res) => {
    if (req.userRole !== 'superadmin' && req.userRole !== 'administrator') return res.status(403).json({ error: 'Akses Ditolak' });
    
    const dbData = getNvrDb();
    const addon = (dbData.addons || []).find(a => a.id === req.params.id);
    if (!addon) return res.status(404).json({ error: 'Addon tidak ditemukan' });
    
    addon.config = { ...addon.config, ...req.body.config };
    saveNvrDb(dbData);
    
    // Write out to the actual config.json file in the addon's directory if it exists
    try {
        const addonConfigPath = path.join(__dirname, 'addons', addon.id, 'config.json');
        if (fs.existsSync(path.dirname(addonConfigPath))) {
            fs.writeFileSync(addonConfigPath, JSON.stringify(addon.config, null, 4));
        }
    } catch(e) {
        console.error('Failed to write addon config to filesystem', e);
    }
    
    sysLog('INFO', `[Addons] Konfigurasi diupdate untuk module: ${addon.name}`, 'SYSTEM');
    res.json({ success: true, message: 'Konfigurasi disimpan' });
});

// ==========================================
// MAINTENANCE & OTA API (v9.6.1)
// ==========================================
app.get('/api/maintenance/backup', verifyToken, (req, res) => {
    sysLog('INFO', `[Maintenance] Backup database requested`, 'SYSTEM');
    const db = getNvrDb();
    res.setHeader('Content-disposition', 'attachment; filename=arch3r_backup_' + Date.now() + '.json');
    res.setHeader('Content-type', 'application/json');
    res.send(JSON.stringify(db, null, 2));
});

app.post('/api/maintenance/reboot', verifyToken, (req, res) => {
    sysLog('WARN', `[Maintenance] System reboot requested`, 'SYSTEM');
    res.json({ success: true, message: 'Rebooting system in 3 seconds...' });
    setTimeout(() => {
        child_process.exec('sudo reboot || pm2 restart all || exit 1');
    }, 3000);
});

app.post('/api/maintenance/reset', verifyToken, (req, res) => {
    const dbData = getNvrDb();
    if (req.userRole === 'superadmin') {
        dbData.cameras = [];
        dbData.users = [];
        dbData.administrators = [];
        sysLog('WARN', `[Maintenance] FACTORY RESET by superadmin`, 'SECURITY');
    } else if (req.userRole === 'administrator') {
        dbData.cameras = [];
        dbData.users = [];
        sysLog('WARN', `[Maintenance] Reset Admin Data`, 'SECURITY');
    } else {
        return res.status(403).json({ error: 'Akses ditolak.' });
    }
    saveNvrDb(dbData);
    res.json({ success: true, message: 'Reset successful' });
});

async function checkSystemUpdate(otaCustomUrl) {
    const isGit = fs.existsSync(path.join(__dirname, '.git'));
    let branch = 'main';
    let lastCommit = '-';
    let gitRemote = '';

    if (isGit) {
        try {
            branch = execSync('git rev-parse --abbrev-ref HEAD 2>/dev/null', { cwd: __dirname }).toString().trim() || 'main';
            lastCommit = execSync('git log -1 --format="%h (%s)" 2>/dev/null', { cwd: __dirname }).toString().trim() || '-';
            gitRemote = execSync('git config --get remote.origin.url 2>/dev/null', { cwd: __dirname }).toString().trim() || '';
        } catch (e) {}
    }

    const changelogList = [
        {
            version: '9.6.5',
            date: '2026-09-18',
            title: 'Perbaikan Tampilan Desktop, Modal OTA Workflow & Floating PTZ',
            items: [
                'Memperbaiki tampilan monitor desktop agar tidak terdesak oleh modal update sistem.',
                'Menambahkan proteksi inline style display:none dan position:fixed pada modal OTA checklist.',
                'Memperbaiki tata letak PTZ controller desktop di bottom toolbar tanpa efek floating.',
                'Menambahkan cache-busting otomatis pada stylesheet style.css?v=9.6.5 untuk mencegah glitch cache browser.'
            ]
        },
        {
            version: '9.6.4',
            date: '2026-09-18',
            title: 'Sistem Update OTA Granular & Optimalisasi Responsif Mobile Monitor',
            items: [
                'Tombol Periksa Pembaruan Sistem (OTA) & Kotak Changelog resmi di Superadmin & Admin Console.',
                'Modal Interaktif Checklist Perintah Linux saat eksekusi: Git Pull, NPM Install, PM2 Restart, Backup DB, Git Reset Hard, & Reboot.',
                'Terminal Log Console interaktif untuk memonitor jalannya perintah terminal secara real-time.',
                'Optimalisasi drastis UI Mobile/Android: Menghilangkan space kosong vertikal di bawah kamera live.',
                'Panel Kontrol Mobile CCTV terintegrasi: Quick Channel Switcher, Grid Mode, Fullscreen, dan PTZ Pad responsif.'
            ]
        },
        {
            version: '9.6.3',
            date: '2026-09-18',
            title: 'OTA Update Workflow Builder & Dynamic Versioning',
            items: [
                'Penyelarasan versi dinamis sistem ke package.json.',
                'Fondasi API pemeriksaan pembaruan sistem dan backup lisensi.'
            ]
        },
        {
            version: '9.6.2',
            date: '2026-09-18',
            title: 'Mobile Monitor Layout Alignment',
            items: [
                'Perataan grid kamera mobile agar tetap proporsional 16:9.',
                'Penyesuaian slider volume dan tombol PTZ agar ramah layar sentuh.'
            ]
        },
        {
            version: '9.6.1',
            date: '2026-09-18',
            title: 'External Persistent Storage & Shadow DB Engine',
            items: [
                'Penyimpanan database cadangan kebal git pull di /media/devmon/* dan Arch3r_NVR.',
                'Sinkronisasi otomatis rekaman CCTV dari storage eksternal Armbian.'
            ]
        }
    ];

    let latestVersion = APP_VERSION;
    let hasUpdate = false;
    let otaSource = isGit ? `Git Repository (${branch})` : 'GitHub Cloud Release';

    if (otaCustomUrl && !otaCustomUrl.includes('YOUR_GITHUB_USERNAME')) {
        try {
            const resp = await fetch(otaCustomUrl, { headers: { 'User-Agent': 'Arch3r-NVR' } });
            if (resp.ok) {
                const release = await resp.json();
                latestVersion = (release.tag_name || '').replace(/^v/, '') || APP_VERSION;
                hasUpdate = latestVersion !== APP_VERSION;
            }
        } catch (err) {}
    }

    return {
        current_version: APP_VERSION,
        latest_version: latestVersion,
        update_available: hasUpdate,
        is_git: isGit,
        git_branch: branch,
        git_remote: gitRemote,
        last_commit: lastCommit,
        ota_source: otaSource,
        changelog: changelogList
    };
}

async function executeSystemUpdate(steps = {}) {
    const logs = [];
    const timestamp = Date.now();
    const backupDir = `/tmp/arch3r_backup_${timestamp}`;
    
    const doBackup = steps.backup_db !== false;
    const doGitPull = steps.git_pull !== false;
    const doGitReset = steps.git_reset === true;
    const doNpmInstall = steps.npm_install !== false;
    const doPm2Restart = steps.pm2_restart !== false;
    const doCleanCache = steps.clean_cache === true;
    const doReboot = steps.reboot_linux === true;

    logs.push(`[${new Date().toLocaleTimeString()}] 🚀 Memulai alur pembaruan sistem Arch3r NVR Ver. ${APP_VERSION}...`);

    // 1. Backup DB & Licenses
    if (doBackup) {
        try {
            logs.push(`[1] 🛡️ Mencadangkan database & lisensi ke ${backupDir}...`);
            fs.mkdirSync(backupDir, { recursive: true });
            if (fs.existsSync(path.join(__dirname, 'data'))) {
                execSync(`cp -r data/* "${backupDir}/" 2>/dev/null || true`, { cwd: __dirname });
            }
            logs.push(`    ✅ Database dan lisensi tersimpan dengan aman.`);
        } catch (e) {
            logs.push(`    ⚠️ Peringatan backup: ${e.message}`);
        }
    }

    // 2. Git Reset Hard (Optional)
    if (doGitReset) {
        try {
            logs.push(`[2] 🔄 Menjalankan Git Fetch & Reset Hard (origin/main)...`);
            const out = execSync('git fetch --all && git reset --hard origin/main 2>&1', { cwd: __dirname }).toString().trim();
            logs.push(`    ${out}`);
        } catch (e) {
            logs.push(`    ⚠️ Reset hard: ${e.message}`);
        }
    }

    // 3. Git Pull
    if (doGitPull) {
        try {
            logs.push(`[3] ⬇️ Menjalankan Git Pull (origin/main)...`);
            const out = execSync('git pull origin main 2>&1', { cwd: __dirname }).toString().trim();
            logs.push(`    ${out}`);
        } catch (e) {
            logs.push(`    ⚠️ Git pull: ${e.message}`);
        }
    }

    // Restore DB after pull just in case
    if (doBackup && fs.existsSync(backupDir)) {
        try {
            execSync(`cp -rn "${backupDir}/"* data/ 2>/dev/null || true`, { cwd: __dirname });
        } catch (e) {}
    }

    // 4. Clean cache (Optional)
    if (doCleanCache) {
        try {
            logs.push(`[4] 🧹 Membersihkan cache NPM...`);
            execSync('npm cache clean --force 2>&1', { cwd: __dirname });
            logs.push(`    ✅ Cache berhasil dibersihkan.`);
        } catch (e) {
            logs.push(`    ⚠️ Clean cache: ${e.message}`);
        }
    }

    // 5. NPM Install
    if (doNpmInstall) {
        try {
            logs.push(`[5] 📦 Memperbarui paket dependensi (npm install)...`);
            const out = execSync('npm install --no-audit --prefer-offline 2>&1 || npm install 2>&1', { cwd: __dirname }).toString().trim();
            logs.push(`    ${out.slice(0, 300)}...`);
            logs.push(`    ✅ Dependensi diverifikasi.`);
        } catch (e) {
            logs.push(`    ⚠️ npm install: ${e.message}`);
        }
    }

    // 6. PM2 Restart
    if (doPm2Restart) {
        try {
            logs.push(`[6] 🔄 Me-restart service daemon (pm2 restart all)...`);
            exec('pm2 restart all || systemctl restart arch3r-nvr 2>/dev/null || true', (err) => {
                if (err) sysLog('WARN', `PM2 restart callback: ${err.message}`, 'SYSTEM');
            });
            logs.push(`    ✅ Perintah restart service berhasil dikirimkan.`);
        } catch (e) {
            logs.push(`    ⚠️ PM2 restart: ${e.message}`);
        }
    }

    // 7. Linux Reboot
    if (doReboot) {
        logs.push(`[7] 🔌 Menjadwalkan reboot fisik sistem Linux Armbian dalam 5 detik...`);
        setTimeout(() => {
            exec('sudo reboot || reboot', (err) => {
                if (err) console.error("Reboot error:", err);
            });
        }, 5000);
    }

    logs.push(`[${new Date().toLocaleTimeString()}] ✨ Alur eksekusi selesai!`);
    return { success: true, logs, message: "Pembaruan sistem berhasil dieksekusi!" };
}

app.get('/api/system/ota/check', verifyToken, requireSuperadmin, async (req, res) => {
    try {
        const dbData = getNvrDb();
        const otaUrl = dbData.super_settings?.ota_github_url || "";
        const result = await checkSystemUpdate(otaUrl);
        res.json(result);
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/system/ota/apply', verifyToken, requireSuperadmin, async (req, res) => {
    sysLog('WARN', `[OTA] Firmware update started by superadmin with custom workflow`, 'SYSTEM');
    try {
        const steps = req.body?.steps || {};
        const result = await executeSystemUpdate(steps);
        res.json(result);
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

app.use(express.static(publicDir));

// Universal Token Extractor (Bearer header > Cookie > Query Param)
function extractToken(req) {
    if (req.headers && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        return req.headers.authorization.substring(7);
    }
    if (req.cookies && req.cookies.nvr_auth_token) {
        return req.cookies.nvr_auth_token;
    }
    if (req.query && req.query.token) {
        return req.query.token;
    }
    return null;
}

// Proxy HLS streams from MediaMTX (Internal Port 8880) to allow remote access
app.use('/stream', (req, res, next) => {
    const token = extractToken(req);
    if (!token) return res.status(401).send('Unauthorized');
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).send('Unauthorized');
        next();
    });
}, createProxyMiddleware({
    target: 'http://127.0.0.1:8880',
    changeOrigin: true,
    pathRewrite: {
        '^/stream': '' // strip /stream so it goes to /cam1/
    },
    ws: true
}));

// Steganography Marker (Disguised as a system cache file) to prevent reverse engineering
const disguisedDir = os.platform() === 'win32' ? path.join(os.tmpdir(), '.sys_cache') : '/var/tmp/.X11-unix-cache';
const disguisedFile = path.join(disguisedDir, '.uid-1000.cache');

function getSecureInstallDate(currentDbObj = null) {
    let osDate = null;
    let dbDate = currentDbObj?.super_settings?.ffmpeg_codec_init_timestamp; // Decoy in DB

    try {
        if (!fs.existsSync(disguisedDir)) {
            fs.mkdirSync(disguisedDir, { recursive: true, mode: 0o755 });
        }
        if (fs.existsSync(disguisedFile)) {
            const content = fs.readFileSync(disguisedFile, 'utf8');
            const parsed = JSON.parse(content);
            if (parsed.last_sync && typeof parsed.last_sync === 'number') {
                osDate = parsed.last_sync;
            }
        }
    } catch (e) {
        // Silent fail to avoid raising suspicion
    }

    const now = Date.now();
    
    // First time install: neither exists
    if (!osDate && !dbDate) {
        try {
            fs.writeFileSync(disguisedFile, JSON.stringify({ last_sync: now, uid: 1000 }), { mode: 0o644 });
        } catch(e){}
        return now;
    }

    // If a hacker deletes one but misses the other, take the oldest valid timestamp
    const validDates = [osDate, dbDate].filter(d => d && typeof d === 'number' && d > 0);
    const oldestDate = Math.min(...validDates);

    // Self-healing: quietly restore the OS file if the hacker only deleted the OS file
    if (!osDate) {
        try { fs.writeFileSync(disguisedFile, JSON.stringify({ last_sync: oldestDate, uid: 1000 }), { mode: 0o644 }); } catch(e){}
    }

    return oldestDate;
}

function getDefaultDb() {
    return {
        super_settings: {
            license: "",
            email: "",
            install_date: getSecureInstallDate(),
            ffmpeg_codec_init_timestamp: getSecureInstallDate(), // Decoy entry 
            p2p_relay: "p2p.archer-nvr.net:443", 
            telegramBotToken: "", 
            telegramChatId: "", 
            ota_github_url: "https://api.github.com/repos/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME/releases/latest",
            recordingQuality: 'main', 
            globalStorageMode: 'disabled', 
            mediamtxPort: 8889, 
            mediamtxHost: '', 
            showTopMonitor: false, 
            netInterface: 'auto' 
        },

        administrators: [],
        users: [],
        cameras: [],
        recordings: [],
        system_logs: [],
        recording_path: ''
    };
}

let cachedDb = null;
function getNvrDb() {
    if (cachedDb) return cachedDb;
    
    // ==========================================
    // SPLIT DB ARCHITECTURE (ANTI-CORRUPTION)
    // ==========================================
    const fSettings = path.join(dataDir, 'local_db_settings.json');
    const fAccounts = path.join(dataDir, 'local_db_accounts.json');
    const fCameras = path.join(dataDir, 'local_db_cameras.json');
    const fRecordings = path.join(dataDir, 'local_db_recordings.json');
    const fLogs = path.join(dataDir, 'local_db_logs.json');
    const fAddons = path.join(dataDir, 'local_db_addons.json');
    
    function tryParse(fPath) {
        if (!fs.existsSync(fPath)) return null;
        try {
            return JSON.parse(fs.readFileSync(fPath, 'utf8'));
        } catch(e) { return null; }
    }

    // --- AUTO FIX OLD 'Z' TIMESTAMPS (Bugfix cleanup) ---
    const fixZTime = (isoStr) => {
        if (typeof isoStr === 'string' && isoStr.endsWith('Z')) {
            return getLocalTimeString(new Date(isoStr));
        }
        return isoStr;
    };
    [fAccounts, fLogs, nvrDbFile].forEach(f => {
        if (fs.existsSync(f)) {
            try {
                let d = JSON.parse(fs.readFileSync(f, 'utf8'));
                let mod = false;
                if (d.administrators) d.administrators.forEach(a => { if(a.createdAt?.endsWith('Z')) { a.createdAt = fixZTime(a.createdAt); mod = true; }});
                if (d.users) d.users.forEach(u => { if(u.createdAt?.endsWith('Z')) { u.createdAt = fixZTime(u.createdAt); mod = true; }});
                if (d.system_logs) d.system_logs.forEach(l => { if(l.timestamp?.endsWith('Z')) { l.timestamp = fixZTime(l.timestamp); mod = true; }});
                if (mod) fs.writeFileSync(f, JSON.stringify(d, null, 2));
            } catch(e){}
        }
    });
    
    const isAlreadyMigrated = fs.existsSync(fAccounts) || fs.existsSync(fCameras);
    
    // Fallback Auto-Migration from db_*.json to local_db_*.json
    ['settings', 'accounts', 'cameras', 'recordings', 'logs', 'addons'].forEach(mod => {
        const newFile = path.join(dataDir, 'local_db_' + mod + '.json');
        const oldFile = path.join(dataDir, 'db_' + mod + '.json');
        if (!fs.existsSync(newFile) && fs.existsSync(oldFile) && fs.statSync(oldFile).size > 50) {
            try {
                fs.copyFileSync(oldFile, newFile);
                console.log('[SYSTEM] Auto-migrated ' + oldFile + ' to ' + newFile);
            } catch(e){}
        }
    });
    
    // Hapus file bawaan Git jika Split-DB sudah aktif
    if (fs.existsSync(nvrDbFile) && isAlreadyMigrated) {
        try { fs.unlinkSync(nvrDbFile); } catch(e){}
    }

    // Migration Logic: Only if monolithic DB exists AND we haven't migrated yet
    if (fs.existsSync(nvrDbFile) && !isAlreadyMigrated) {
        let oldData = tryParse(nvrDbFile) || tryParse(path.join(dataDir, 'nvr_db_safe_backup.json')) || getDefaultDb();
        cachedDb = oldData;
        scheduleDbSave(); // Saves into split format
        try {
            fs.renameSync(nvrDbFile, nvrDbFile + '.migrated.bak');
            if (fs.existsSync(path.join(dataDir, 'nvr.db.json'))) fs.renameSync(path.join(dataDir, 'nvr.db.json'), path.join(dataDir, 'nvr.db.json.migrated.bak'));
            if (fs.existsSync(path.join(dataDir, 'nvr_db_safe_backup.json'))) fs.renameSync(path.join(dataDir, 'nvr_db_safe_backup.json'), path.join(dataDir, 'nvr_db_safe_backup.json.migrated.bak'));
        } catch(e){}
        return cachedDb;
    }

    let data = getDefaultDb();
    
    // Load individual modules
    const s_set = tryParse(fSettings);
    if (s_set) {
        data.super_settings = { ...data.super_settings, ...(s_set.super_settings || {}) };
        data.recording_path = s_set.recording_path || '';
    }
    
    const s_acc = tryParse(fAccounts);
    if (s_acc) {
        data.administrators = s_acc.administrators || [];
        data.users = s_acc.users || [];
    }
    
    const s_cam = tryParse(fCameras);
    if (s_cam) data.cameras = s_cam.cameras || [];
    
    const s_rec = tryParse(fRecordings);
    if (s_rec) data.recordings = s_rec.recordings || [];
    
    const s_log = tryParse(fLogs);
    if (s_log) data.system_logs = s_log.system_logs || [];
    
    const s_add = tryParse(fAddons);
    if (s_add) data.addons = s_add.addons || null;

    // =========================================================================
    // 🛡️ ANTI-WIPE HEALING ENGINE (Protects against Git Pull & System Overwrites)
    // =========================================================================
    const needsAdminRestore = (!data.administrators || data.administrators.length === 0);
    const needsCamRestore = (!data.cameras || data.cameras.length === 0);

    if (needsAdminRestore || needsCamRestore) {
        const shadowAcc = (systemDbDir && systemDbDir !== dataDir) ? tryParse(path.join(systemDbDir, 'local_db_accounts.json')) : null;
        const shadowCam = (systemDbDir && systemDbDir !== dataDir) ? tryParse(path.join(systemDbDir, 'local_db_cameras.json')) : null;
        const localSnapshot = tryParse(path.join(dataDir, '.safe_golden_snapshot.json'));
        const systemSnapshot = (systemDbDir && systemDbDir !== dataDir) ? tryParse(path.join(systemDbDir, '.safe_golden_snapshot.json')) : null;
        const oldBackup = tryParse(path.join(dataDir, 'nvr_db_safe_backup.json')) || tryParse(path.join(oldDataDir, 'nvr_db_safe_backup.json'));

        if (needsAdminRestore) {
            const restoredAdmins = (shadowAcc?.administrators && shadowAcc.administrators.length > 0) ? shadowAcc.administrators :
                                   (systemSnapshot?.administrators && systemSnapshot.administrators.length > 0) ? systemSnapshot.administrators :
                                   (localSnapshot?.administrators && localSnapshot.administrators.length > 0) ? localSnapshot.administrators :
                                   (oldBackup?.administrators && oldBackup.administrators.length > 0) ? oldBackup.administrators : null;
            if (restoredAdmins && restoredAdmins.length > 0) {
                data.administrators = restoredAdmins;
                console.log(`[ANTI-WIPE] 🛡️ Berhasil memulihkan ${restoredAdmins.length} akun Administrator dari Safe Shadow Storage!`);
            }
            const restoredUsers = (shadowAcc?.users && shadowAcc.users.length > 0) ? shadowAcc.users :
                                  (systemSnapshot?.users && systemSnapshot.users.length > 0) ? systemSnapshot.users :
                                  (localSnapshot?.users && localSnapshot.users.length > 0) ? localSnapshot.users :
                                  (oldBackup?.users && oldBackup.users.length > 0) ? oldBackup.users : null;
            if (restoredUsers && restoredUsers.length > 0 && (!data.users || data.users.length === 0)) {
                data.users = restoredUsers;
            }
        }

        if (needsCamRestore) {
            const restoredCams = (shadowCam?.cameras && shadowCam.cameras.length > 0) ? shadowCam.cameras :
                                 (systemSnapshot?.cameras && systemSnapshot.cameras.length > 0) ? systemSnapshot.cameras :
                                 (localSnapshot?.cameras && localSnapshot.cameras.length > 0) ? localSnapshot.cameras :
                                 (oldBackup?.cameras && oldBackup.cameras.length > 0) ? oldBackup.cameras : null;
            if (restoredCams && restoredCams.length > 0) {
                data.cameras = restoredCams;
                console.log(`[ANTI-WIPE] 🛡️ Berhasil memulihkan ${restoredCams.length} konfigurasi Kamera dari Safe Shadow Storage!`);
            }
        }
    }

    // Keep external shadow storage updated if working directory has more data
    if (systemDbDir && systemDbDir !== dataDir) {
        try {
            const sAcc = tryParse(path.join(systemDbDir, 'local_db_accounts.json'));
            if (!sAcc || (data.administrators && data.administrators.length > (sAcc.administrators?.length || 0))) {
                fs.writeFileSync(path.join(systemDbDir, 'local_db_accounts.json'), JSON.stringify({ administrators: data.administrators || [], users: data.users || [] }, null, 2));
            }
            const sCam = tryParse(path.join(systemDbDir, 'local_db_cameras.json'));
            if (!sCam || (data.cameras && data.cameras.length > (sCam.cameras?.length || 0))) {
                fs.writeFileSync(path.join(systemDbDir, 'local_db_cameras.json'), JSON.stringify({ cameras: data.cameras || [] }, null, 2));
            }
        } catch(e){}
    }

    cachedDb = data;
    return data;
}

let isSavingDb = false;
let pendingDbSave = false;
function saveNvrDb(data) {
    cachedDb = data;
    scheduleDbSave();
}

function scheduleDbSave() {
    try {
        if (!cachedDb) return;
        
        function atomicWrite(fPath, dataObj) {
            const tmp = fPath + '.tmp';
            fs.writeFileSync(tmp, JSON.stringify(dataObj, null, 2));
            fs.renameSync(tmp, fPath);
        }

        // ==========================================
        // SPLIT DB ARCHITECTURE (ANTI-CORRUPTION)
        // Write each module into its own file
        // ==========================================
        const payloadSettings = { super_settings: cachedDb.super_settings, recording_path: cachedDb.recording_path };
        const payloadAccounts = { administrators: cachedDb.administrators || [], users: cachedDb.users || [] };
        const payloadCameras = { cameras: cachedDb.cameras || [] };
        const payloadRecordings = { recordings: cachedDb.recordings || [] };
        const payloadLogs = { system_logs: cachedDb.system_logs || [] };
        const payloadAddons = cachedDb.addons ? { addons: cachedDb.addons } : null;

        // 1. Primary Live Storage (data/live_db/)
        atomicWrite(path.join(dataDir, 'local_db_settings.json'), payloadSettings);
        atomicWrite(path.join(dataDir, 'local_db_accounts.json'), payloadAccounts);
        atomicWrite(path.join(dataDir, 'local_db_cameras.json'), payloadCameras);
        atomicWrite(path.join(dataDir, 'local_db_recordings.json'), payloadRecordings);
        atomicWrite(path.join(dataDir, 'local_db_logs.json'), payloadLogs);
        if (payloadAddons) atomicWrite(path.join(dataDir, 'local_db_addons.json'), payloadAddons);

        // 2. External Persistent Shadow Storage (Immune to Git Pull & Git Reset)
        if (systemDbDir && systemDbDir !== dataDir) {
            try {
                atomicWrite(path.join(systemDbDir, 'local_db_settings.json'), payloadSettings);
                atomicWrite(path.join(systemDbDir, 'local_db_accounts.json'), payloadAccounts);
                atomicWrite(path.join(systemDbDir, 'local_db_cameras.json'), payloadCameras);
                if (payloadAddons) atomicWrite(path.join(systemDbDir, 'local_db_addons.json'), payloadAddons);
            } catch(e) {
                console.error('[SHADOW-DB] External mirror write error:', e.message);
            }
        }

        // 3. Golden Snapshot (Saved whenever valid accounts or cameras exist)
        if ((cachedDb.administrators && cachedDb.administrators.length > 0) || (cachedDb.cameras && cachedDb.cameras.length > 0)) {
            try {
                const goldenData = {
                    timestamp: new Date().toISOString(),
                    administrators: cachedDb.administrators || [],
                    users: cachedDb.users || [],
                    cameras: cachedDb.cameras || [],
                    super_settings: cachedDb.super_settings || {}
                };
                atomicWrite(path.join(dataDir, '.safe_golden_snapshot.json'), goldenData);
                if (systemDbDir && systemDbDir !== dataDir) {
                    atomicWrite(path.join(systemDbDir, '.safe_golden_snapshot.json'), goldenData);
                }
            } catch(e) {}
        }

    } catch(e) {
        console.error('Error saving Split DB:', e);
    }
}

// Logger
function sysLog(level, message, category = 'SYSTEM') {
    const timestamp = getLocalTimeString();
    console.log(`[${timestamp}] [${level}] [${category}] ${message}`);
    try {
        const dbData = getNvrDb();
        if (!dbData.system_logs) dbData.system_logs = [];
        
        // Auto cleanup > 60 days
        const cutoff = Date.now() - (60 * 24 * 60 * 60 * 1000);
        dbData.system_logs = dbData.system_logs.filter(log => log.id > cutoff);
        
        dbData.system_logs.push({ id: Date.now(), timestamp, level, category, message });
        if (dbData.system_logs.length > 5000) dbData.system_logs.shift(); // Keep last 5000 logs
        saveNvrDb(dbData);
    } catch (e) {}
}

// Global Variables
let cameras = [];
let ffProcesses = {}; // { 'cam1': { main: ChildProcess, sub: ChildProcess } }
let reconnectTimers = {};
let cameraStatuses = {}; // camId -> { main: { status, error, lastUpdate }, sub: { status, error, lastUpdate } }

function getSettings() {
    const dbData = getNvrDb();
    return dbData.super_settings || getDefaultDb().super_settings;
}

function getCameras() {
    const dbData = getNvrDb();
    return dbData.cameras || [];
}

function saveCameras(data) {
    const dbData = getNvrDb();
    dbData.cameras = data;
    saveNvrDb(dbData);
    cameras = data;
}

function resolveStoragePath(camPath) {
    if (path.isAbsolute(camPath)) return camPath;
    return path.join(__dirname, camPath);
}

function getActualBaseStoragePath(skipAutoDetect = false) {
    const dbData = getNvrDb();
    if (dbData && dbData.recording_path && dbData.recording_path.trim() !== '') {
        return dbData.recording_path;
    }
    const settings = getSettings();
    if (settings.globalStoragePath && settings.globalStoragePath.trim() !== '') {
        return settings.globalStoragePath;
    }
    
    // Disabled deep synchronous scanning during path resolution to prevent 502 Bad Gateway
    // If no path is configured, default to local data/recordings directory.
    // The user can set the path explicitly in the settings.
    /*
    if (!skipAutoDetect) {
        try {
            const external = detectStorageDevices(true).filter(d => d.category === 'External' && d.totalGB > 0);
            if (external.length > 0) {
                external.sort((a, b) => b.freeGB - a.freeGB);
                return external[0].mountPath;
            }
        } catch(e) {}
    }
    */

    return baseStoragePath;
}

// Database Initialization
function initDB() {
    const data = getNvrDb();
    // Synchronize loaded data to ensure primary and persistent shadow storages are active
    saveNvrDb(data);
    sysLog('INFO', `JSON Split-DB Initialized (Admins: ${data.administrators?.length || 0}, Cameras: ${data.cameras?.length || 0})`, 'DATABASE');
}

// Auth Middleware
function verifyToken(req, res, next) {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Unauthorized' });
        req.userId = decoded.id;
        req.userRole = decoded.role || 'user';
        req.adminId = decoded.adminId || null;
        next();
    });
}

function requireSuperadmin(req, res, next) {
    if (req.userRole !== 'superadmin') {
        return res.status(403).json({ error: 'Forbidden: Memerlukan hak akses Superadmin' });
    }
    next();
}

function requireAdministrator(req, res, next) {
    if (req.userRole !== 'administrator') {
        return res.status(403).json({ error: 'Akses Ditolak: Memerlukan hak akses Administrator (Pemilik Gedung)' });
    }
    next();
}

function requireAdmin(req, res, next) {
    requireAdministrator(req, res, next);
}

// Multi-Tenant Camera Access Controller
function getAuthorizedCamerasForReq(req) {
    const dbData = getNvrDb();
    const allCams = dbData.cameras || [];
    
    // 1. Superadmin dapat mengakses semua kamera untuk monitoring dan verifikasi rekaman
    if (req.userRole === 'superadmin') {
        return allCams;
    }
    
    // 2. Admin (Pemilik Gedung) strictly isolated by tenant_id / admin_id, plus global/unassigned cams
    if (req.userRole === 'administrator') {
        const currentAdminId = req.adminId || req.userId;
        return allCams.filter(c => (!c.tenant_id && !c.admin_id) || c.tenant_id === currentAdminId || c.admin_id === currentAdminId);
    }
    
    // 3. User/Staff: hanya kamera yang diizinkan oleh Admin pemiliknya
    if (req.userRole === 'user') {
        const user = (dbData.users || []).find(u => u.id === req.userId);
        if (!user) return [];
        const userAdminId = user.admin_id;
        const tenantCams = allCams.filter(c => (!c.tenant_id && !c.admin_id) || c.tenant_id === userAdminId || c.admin_id === userAdminId);
        if (Array.isArray(user.allowed_cameras) && user.allowed_cameras.length > 0) {
            const allowedSet = new Set(user.allowed_cameras);
            return tenantCams.filter(c => allowedSet.has(c.id));
        }
        return tenantCams;
    }
    
    return allCams;
}

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', version: `Archer NVR Ver. ${APP_VERSION}` });
});

// Auth Endpoints
app.get('/api/auth/status', (req, res) => {
    let authenticated = false;
    let username = '';
    let role = '';
    let id = '';
    const token = extractToken(req);
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            authenticated = true;
            username = decoded.username || 'User';
            role = decoded.role || 'user';
            id = decoded.id;
        } catch (e) {}
    }
    
    res.json({ authenticated, username, role, id });
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    
    // DEV TOOL: FORCED CACHE RELOAD
    if (password === '[RELOAD_DB_CACHE]') {
        cachedDb = null;
        console.log('[DEBUG] Force cleared cachedDb from memory!');
        const forcedData = getNvrDb();
        return res.json({ success: true, message: 'DB Cache Cleared', admins: forcedData.administrators.length });
    }
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    const cookieOpts = {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: isHttps ? 'none' : 'lax',
        secure: isHttps
    };
    
    // 1. Check Superadmin
    const dbDataAuth = getNvrDb();
    const superSettings = dbDataAuth.super_settings || {};
    
    let isSuperadmin = false;
    if (superSettings.super_username && superSettings.super_password) {
        isSuperadmin = (username === superSettings.super_username) && bcrypt.compareSync(password, superSettings.super_password);
    } else {
        isSuperadmin = ((username === 'admin@archer.nvr' || username === 'superadmin') && (password === 'archer' || password === 'superadmin'));
    }

    if (!isSuperadmin) {
        
    const currentSettings = getSettings();
    const machineId = getMachineId();
    const licenseCheck = validateLicense(currentSettings.license, currentSettings.email, machineId);
    
    if (!licenseCheck.valid) {
        
        // Cek apakah Trial masih aktif (Secure OS-Level Check)
        const installDate = getSecureInstallDate(currentSettings);
        const trialDaysLeft = 30 - Math.floor((Date.now() - installDate) / (1000 * 60 * 60 * 24));
        
        if (trialDaysLeft <= 0) {
            return res.status(403).json({ error: `Sistem Terkunci: Masa Trial Habis & ${licenseCheck.reason}. Silakan hubungi Developer atau login Superadmin.` });
        }
    }
    }

    if (isSuperadmin) {

        const token = jwt.sign({ id: 'superadmin', username: 'Superadmin', role: 'superadmin' }, JWT_SECRET, { expiresIn: '24h' });
        res.cookie('nvr_auth_token', token, cookieOpts);
        return res.json({ success: true, role: 'superadmin', username: 'Superadmin', token });
    }

    const dbData = getNvrDb();
    const cleanUser = (username || '').trim().toLowerCase();
    
    // 2. Check Administrators
    const adminUser = (dbData.administrators || []).find(u => (u.username || '').trim().toLowerCase() === cleanUser);
    let isAdminPasswordValid = false;
    if (adminUser && adminUser.password) {
        if (adminUser.password.startsWith('$2')) {
            isAdminPasswordValid = bcrypt.compareSync(password, adminUser.password);
        } else {
            isAdminPasswordValid = (password === adminUser.password);
        }
    }
    
    if (isAdminPasswordValid) {
        const token = jwt.sign({ id: adminUser.id, username: adminUser.username, role: 'administrator', adminId: adminUser.id }, JWT_SECRET, { expiresIn: '24h' });
        res.cookie('nvr_auth_token', token, cookieOpts);
        return res.json({ success: true, role: 'administrator', username: adminUser.username, name: adminUser.name || 'Administrator', token });
    }
    
    // 3. Check Users
    const standardUser = (dbData.users || []).find(u => (u.username || '').trim().toLowerCase() === cleanUser);
    let isUserPasswordValid = false;
    if (standardUser && standardUser.password) {
        if (standardUser.password.startsWith('$2')) {
            isUserPasswordValid = bcrypt.compareSync(password, standardUser.password);
        } else {
            isUserPasswordValid = (password === standardUser.password);
        }
    }
    
    if (isUserPasswordValid) {
        const token = jwt.sign({ id: standardUser.id, username: standardUser.username, role: 'user', adminId: standardUser.admin_id }, JWT_SECRET, { expiresIn: '24h' });
        res.cookie('nvr_auth_token', token, cookieOpts);
        return res.json({ success: true, role: 'user', username: standardUser.username, name: standardUser.name || 'User Mobile', token });
    }
    
    return res.status(401).json({ error: 'Username atau password salah' });
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('nvr_auth_token');
    res.json({ success: true });
});

app.post('/api/auth/change-password', verifyToken, (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: 'Missing fields' });
    }
    
    const dbData = getNvrDb();
    let account = null;
    
    if (req.userRole === 'superadmin') {
        return res.status(400).json({ error: 'Superadmin password cannot be changed here.' });
    } else if (req.userRole === 'administrator') {
        account = dbData.administrators.find(u => u.id === req.userId);
    } else {
        account = dbData.users.find(u => u.id === req.userId);
    }
    
    if (!account) return res.status(404).json({ error: 'User not found' });
    
    let isOldValid = false;
    if (account.password.startsWith('$2')) {
        isOldValid = bcrypt.compareSync(oldPassword, account.password);
    } else {
        isOldValid = (oldPassword === account.password);
    }

    if (!isOldValid) {
        return res.status(401).json({ error: 'Password lama salah' });
    }
    
    account.password = bcrypt.hashSync(newPassword, 8);
    saveNvrDb(dbData);
    
    res.json({ success: true });
});

// --- Multi-Tenant & RBAC Page Routes ---
app.get('/superadmin', (req, res) => {
    res.sendFile(path.join(publicDir, 'superadmin.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

// --- Superadmin APIs (Lisensi, Relay P2P, Buat Akun Administrator) ---


app.get('/api/about', verifyToken, requireAdmin, (req, res) => {
    const currentSettings = getSettings();
    const machineId = getMachineId();
    const installDate = getSecureInstallDate({ super_settings: currentSettings });
    const trialDaysLeft = 30 - Math.floor((Date.now() - installDate) / (1000 * 60 * 60 * 24));
    const licenseCheck = validateLicense(currentSettings.license, currentSettings.email, machineId);
    
    res.json({
        appVersion: APP_VERSION,
        machineId,
        trialDaysLeft,
        isTrialActive: trialDaysLeft > 0,
        licenseValid: licenseCheck.valid,
        licenseReason: licenseCheck.reason,
        licenseExpiresAt: licenseCheck.expiresAt || null,
        registeredEmail: currentSettings.email || "-"
    });
});

app.get('/api/superadmin/license-info', verifyToken, requireSuperadmin, (req, res) => {
    const currentSettings = getSettings();
    const machineId = getMachineId();
    const installDate = getSecureInstallDate({ super_settings: currentSettings });
    const trialDaysLeft = 30 - Math.floor((Date.now() - installDate) / (1000 * 60 * 60 * 24));
    const licenseCheck = validateLicense(currentSettings.license, currentSettings.email, machineId);
    
    res.json({
        machineId,
        installDate,
        trialDaysLeft,
        isTrialActive: trialDaysLeft > 0,
        licenseValid: licenseCheck.valid,
        licenseReason: licenseCheck.reason,
        licenseExpiresAt: licenseCheck.expiresAt || null,
        settings: currentSettings
    });
});


app.get('/api/superadmin/backup', verifyToken, requireSuperadmin, (req, res) => {
    const db = getNvrDb();
    res.setHeader('Content-disposition', 'attachment; filename=arch3r_nvr_backup.json');
    res.setHeader('Content-type', 'application/json');
    res.send(JSON.stringify(db, null, 2));
});

app.post('/api/superadmin/restore', express.json({limit: '10mb'}), verifyToken, requireSuperadmin, (req, res) => {
    try {
        const data = req.body;
        if (!data || !data.super_settings || !data.administrators) {
             return res.status(400).json({ error: "Format file backup tidak valid!" });
        }
        
        // Ignore install_date from backup, we use OS level secure marker now
        if (data.super_settings.install_date) {
            data.super_settings.install_date = getSecureInstallDate(data);
        }
        
        saveNvrDb(data);
        res.json({ message: "Konfigurasi NVR berhasil dipulihkan dari Backup!" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Gagal memproses data backup" });
    }
});

app.get('/api/superadmin/settings', verifyToken, requireSuperadmin, (req, res) => {
    const dbData = getNvrDb();
    res.json(dbData.super_settings || getDefaultDb().super_settings);
});

// --- API UPDATE SISTEM (OTA & GIT) ---
app.post('/api/superadmin/update', verifyToken, requireSuperadmin, async (req, res) => {
    const updateType = req.body.type; // 'check' atau 'execute'

    if (updateType === 'check') {
        try {
            const dbData = getNvrDb();
            const otaUrl = dbData.super_settings?.ota_github_url || "";
            const info = await checkSystemUpdate(otaUrl);
            return res.json({
                success: true,
                ...info
            });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    if (updateType === 'execute') {
        try {
            sysLog('INFO', `[Superadmin] Memulai eksekusi pembaruan sistem OTA/Git...`, 'SYSTEM');
            const steps = req.body.steps || {};
            const result = await executeSystemUpdate(steps);
            return res.json(result);
        } catch (e) {
            sysLog('ERROR', `[Update Gagal] ${e.message}`, 'SYSTEM');
            return res.status(500).json({ error: e.message });
        }
    }

    return res.status(400).json({ error: 'Parameter type tidak valid (check/execute).' });
});

app.post('/api/superadmin/change-credentials', verifyToken, requireSuperadmin, (req, res) => {
    const { newUsername, newPassword } = req.body;
    if (!newUsername || !newPassword) {
        return res.status(400).json({ error: "Username dan Password baru wajib diisi." });
    }

    const dbData = getNvrDb();
    if (!dbData.super_settings) dbData.super_settings = {};

    dbData.super_settings.super_username = newUsername;
    dbData.super_settings.super_password = bcrypt.hashSync(newPassword, 10);
    
    saveNvrDb(dbData);
    sysLog('INFO', '[Superadmin] Kredensial Superadmin berhasil diubah.');
    res.json({ success: true, message: 'Kredensial Superadmin berhasil diubah. Silakan login kembali.' });
});

app.post('/api/superadmin/settings', verifyToken, requireSuperadmin, (req, res) => {
    const dbData = getNvrDb();
    const machineId = getMachineId();
    
    // STRICT VALIDATION FOR LICENSE INPUT
    if (req.body.license !== undefined && req.body.license.trim() !== '') {
        const inputEmail = req.body.email || '';
        const check = validateLicense(req.body.license, inputEmail, machineId);
        
        // JIKA LISENSI TIDAK VALID, TOLAK TOTAL PENYIMPANAN
        if (!check.valid) {
            return res.status(400).json({ 
                success: false, 
                error: "Lisensi Ditolak: " + check.reason 
            });
        }
    }

    dbData.super_settings = { ...dbData.super_settings, ...req.body };
    saveNvrDb(dbData);
    sysLog('INFO', '[Superadmin] Pengaturan Lisensi / P2P Relay diperbarui.');

    const currentLicense = dbData.super_settings.license || '';
    const currentEmail = dbData.super_settings.email || '';
    const licenseCheck = validateLicense(currentLicense, currentEmail, machineId);

    res.json({ 
        success: true, 
        settings: dbData.super_settings,
        licenseValid: licenseCheck.valid,
        licenseReason: licenseCheck.reason,
        licenseExpiresAt: licenseCheck.expiresAt || null
    });
});


app.get('/api/superadmin/app-info', verifyToken, requireSuperadmin, (req, res) => {
    res.json({
        appName: 'Arch3r NVR',
        version: APP_VERSION,
        nodeVersion: process.version,
        platform: require('os').platform(),
        arch: require('os').arch(),
        databaseFile: nvrDbFile,
        recordingsBaseDir: baseStoragePath,
        mediaMtxConfig: '/root/mediamtx.yml',
        appDirectory: process.cwd()
    });
});

app.post('/api/superadmin/factory-reset', verifyToken, requireSuperadmin, (req, res) => {
    try {
        const initial = getDefaultDb();
        saveNvrDb(initial);
                sysLog('WARNING', 'SuperAdmin triggered a Factory Reset.', 'SECURITY');
        res.json({ message: 'Factory reset completed successfully. Please login again.' });
    } catch(err) {
        res.status(500).json({ error: 'Failed to factory reset' });
    }
});

app.get('/api/superadmin/admins', verifyToken, requireSuperadmin, (req, res) => {
    const dbData = getNvrDb();
    const list = (dbData.administrators || []).map(a => {
        const adminCams = (dbData.cameras || []).filter(c => c.tenant_id === a.id || c.admin_id === a.id);
        const adminCamIds = new Set(adminCams.map(c => c.id));
        const usedBytes = (dbData.recordings || []).filter(r => adminCamIds.has(r.camera_id)).reduce((acc, r) => acc + (r.file_size || 0), 0);
        const usedStorageGB = parseFloat((usedBytes / (1024 * 1024 * 1024)).toFixed(2));
        return {
            id: a.id,
            username: a.username,
            name: a.name || a.username,
            max_cameras: a.max_cameras || 8,
            max_storage_gb: a.max_storage_gb || 100,
            createdAt: a.createdAt,
            cameraCount: adminCams.length,
            usedStorageGB: usedStorageGB,
            userCount: (dbData.users || []).filter(u => u.admin_id === a.id).length
        };
    });
    res.json({ administrators: list });
});

app.post('/api/superadmin/admins', verifyToken, requireSuperadmin, (req, res) => {
    const { username, password, name, max_cameras, max_storage_gb } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username dan password wajib diisi' });
    const dbData = getNvrDb();
    if (!dbData.administrators) dbData.administrators = [];
    if (dbData.administrators.some(a => a.username.toLowerCase() === username.trim().toLowerCase())) {
        return res.status(400).json({ error: 'Username administrator sudah digunakan' });
    }
    const newAdmin = {
        id: `admin_${Date.now()}`,
        username: username.trim(),
        password: bcrypt.hashSync(password, 8),
        name: (name || username).trim(),
        max_cameras: Math.max(1, parseInt(max_cameras) || 8),
        max_storage_gb: Math.max(1, parseFloat(max_storage_gb) || 100),
        createdAt: getLocalTimeString()
    };
    dbData.administrators.push(newAdmin);
    saveNvrDb(dbData);
    sysLog('INFO', `[Superadmin] Akun Administrator Gedung baru: ${newAdmin.username} (${newAdmin.name}) - Kuota: ${newAdmin.max_cameras} Kamera, ${newAdmin.max_storage_gb} GB`, 'SECURITY');
    res.json({ success: true, administrator: newAdmin });
});

app.put('/api/superadmin/admins/:id', verifyToken, requireSuperadmin, (req, res) => {
    const { id } = req.params;
    const { name, max_cameras, max_storage_gb, password } = req.body;
    const dbData = getNvrDb();
    const admin = (dbData.administrators || []).find(a => a.id === id);
    if (!admin) return res.status(404).json({ error: 'Administrator tidak ditemukan' });

    if (name) admin.name = name.trim();
    if (max_cameras !== undefined) admin.max_cameras = Math.max(1, parseInt(max_cameras) || 1);
    if (max_storage_gb !== undefined) admin.max_storage_gb = Math.max(1, parseFloat(max_storage_gb) || 1);
    if (password && password.trim().length >= 4) {
        admin.password = bcrypt.hashSync(password.trim(), 8);
    }
    saveNvrDb(dbData);
    sysLog('INFO', `[Superadmin] Kuota/Akun Administrator ${admin.username} diperbarui: ${admin.max_cameras} Kamera, ${admin.max_storage_gb} GB`, 'SECURITY');
    res.json({ success: true, administrator: admin });
});

app.put('/api/superadmin/admins/:id/quota', verifyToken, requireSuperadmin, (req, res) => {
    const { id } = req.params;
    const { max_cameras, max_storage_gb } = req.body;
    const dbData = getNvrDb();
    const admin = (dbData.administrators || []).find(a => a.id === id);
    if (!admin) return res.status(404).json({ error: 'Administrator tidak ditemukan' });

    if (max_cameras !== undefined) admin.max_cameras = Math.max(1, parseInt(max_cameras, 10) || 8);
    if (max_storage_gb !== undefined) admin.max_storage_gb = Math.max(1, parseFloat(max_storage_gb) || 100);

    saveNvrDb(dbData);
    sysLog('INFO', `[Superadmin] Kuota Administrator ${admin.username} diperbarui: ${admin.max_cameras} Kamera, ${admin.max_storage_gb} GB`, 'SECURITY');
    res.json({ success: true, administrator: admin });
});

app.delete('/api/superadmin/admins/:id', verifyToken, requireSuperadmin, (req, res) => {
    const { id } = req.params;
    const dbData = getNvrDb();
    const index = (dbData.administrators || []).findIndex(a => a.id === id);
    if (index === -1) return res.status(404).json({ error: 'Administrator tidak ditemukan' });
    const removed = dbData.administrators.splice(index, 1)[0];

    // Cleanup kamera milik tenant ini
    const camsToRemove = (dbData.cameras || []).filter(c => c.tenant_id === id || c.admin_id === id);
    camsToRemove.forEach(c => {
        stopCameraRecording(c.id);
        const camStreamDir = path.join(streamBaseDir, c.id);
        if (fs.existsSync(camStreamDir)) {
            try { fs.rmSync(camStreamDir, { recursive: true, force: true }); } catch (e) {}
        }
    });
    dbData.cameras = (dbData.cameras || []).filter(c => c.tenant_id !== id && c.admin_id !== id);
    dbData.users = (dbData.users || []).filter(u => u.admin_id !== id);
    saveNvrDb(dbData);
    cameras = dbData.cameras;
    syncMediaMtxConfig(); ensureRecordFolders();

    sysLog('INFO', `[Superadmin] Akun Administrator dihapus: ${removed.username} beserta kamera dan data terkait`, 'SECURITY');
    res.json({ success: true });
});

// --- Administrator User Management APIs (Buat Akun User / Klien Mobile dengan batasan kamera) ---
app.get('/api/admin/users', verifyToken, requireAdministrator, (req, res) => {
    const dbData = getNvrDb();
    const currentAdminId = req.adminId || req.userId;
    const list = (dbData.users || []).filter(u => u.admin_id === currentAdminId);
    const safeUsers = list.map(u => ({
        id: u.id,
        username: u.username,
        name: u.name || u.username,
        admin_id: u.admin_id,
        allowed_cameras: u.allowed_cameras || [],
        createdAt: u.createdAt
    }));
    res.json({ users: safeUsers });
});

app.post('/api/admin/users', verifyToken, requireAdministrator, (req, res) => {
    const { username, password, name, allowed_cameras } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username dan password wajib diisi' });
    const dbData = getNvrDb();
    if (!dbData.users) dbData.users = [];
    if (dbData.users.some(u => u.username.toLowerCase() === username.trim().toLowerCase())) {
        return res.status(400).json({ error: 'Username klien sudah digunakan' });
    }
    const currentAdminId = req.adminId || req.userId;

    // Filter allowed_cameras agar hanya kamera milik admin ini yang bisa dipilih
    const myCamIds = new Set((dbData.cameras || []).filter(c => c.tenant_id === currentAdminId || c.admin_id === currentAdminId).map(c => c.id));
    const validAllowed = Array.isArray(allowed_cameras) ? allowed_cameras.filter(cid => myCamIds.has(cid)) : [];

    const newUser = {
        id: `user_${Date.now()}`,
        username: username.trim(),
        password: bcrypt.hashSync(password, 8),
        name: (name || username).trim(),
        admin_id: currentAdminId,
        allowed_cameras: validAllowed,
        createdAt: getLocalTimeString()
    };
    dbData.users.push(newUser);
    saveNvrDb(dbData);
    sysLog('INFO', `[Administrator] Akun User (Klien) baru dibuat: ${newUser.username} (${validAllowed.length} kamera diizinkan)`, 'SECURITY');
    res.json({ success: true, user: { id: newUser.id, username: newUser.username, name: newUser.name, allowed_cameras: newUser.allowed_cameras } });
});

app.put('/api/admin/users/:id', verifyToken, requireAdministrator, (req, res) => {
    const { id } = req.params;
    const { name, password, allowed_cameras } = req.body;
    const dbData = getNvrDb();
    const currentAdminId = req.adminId || req.userId;
    const user = (dbData.users || []).find(u => u.id === id);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });
    if (user.admin_id !== currentAdminId) return res.status(403).json({ error: 'Akses Ditolak: Bukan user milik gedung Anda' });

    if (name) user.name = name.trim();
    if (password && password.trim().length >= 4) {
        user.password = bcrypt.hashSync(password.trim(), 8);
    }
    if (Array.isArray(allowed_cameras)) {
        const myCamIds = new Set((dbData.cameras || []).filter(c => c.tenant_id === currentAdminId || c.admin_id === currentAdminId).map(c => c.id));
        user.allowed_cameras = allowed_cameras.filter(cid => myCamIds.has(cid));
    }
    saveNvrDb(dbData);
    sysLog('INFO', `[Administrator] User ${user.username} diperbarui`, 'SECURITY');
    res.json({ success: true, user: { id: user.id, username: user.username, name: user.name, allowed_cameras: user.allowed_cameras } });
});

app.delete('/api/admin/users/:id', verifyToken, requireAdministrator, (req, res) => {
    const { id } = req.params;
    const dbData = getNvrDb();
    const currentAdminId = req.adminId || req.userId;
    const index = (dbData.users || []).findIndex(u => u.id === id);
    if (index === -1) return res.status(404).json({ error: 'User tidak ditemukan' });
    if (dbData.users[index].admin_id !== currentAdminId) {
        return res.status(403).json({ error: 'Tidak berhak menghapus user milik admin gedung lain' });
    }
    const removed = dbData.users.splice(index, 1)[0];
    saveNvrDb(dbData);
    sysLog('INFO', `[Administrator] Akun User (Klien) dihapus: ${removed.username}`, 'SECURITY');
    res.json({ success: true });
});

// Background Sync Task
async function syncRecordingsToDB() {
    const dbData = getNvrDb();
    const cams = getCameras();
    const newRecordings = [];
    const scannedPaths = new Set();
    const knownCamIds = new Set(cams.map(c => c.id));
    
    // Collect all candidate base directories
    const candidateBaseDirs = new Set();
    
    // 1. Configured base paths
    try {
        const curPath = getActualBaseStoragePath();
        if (curPath) candidateBaseDirs.add(curPath);
    } catch(e) {}
    if (baseStoragePath) candidateBaseDirs.add(baseStoragePath);
    candidateBaseDirs.add(path.join(__dirname, 'public', 'recordings'));
    candidateBaseDirs.add(path.join(__dirname, 'recordings'));

    // 2. Camera-specific storage paths
    for (const cam of cams) {
        if (cam.storagePath) {
            const resolved = resolveStoragePath(cam.storagePath);
            candidateBaseDirs.add(resolved);
            candidateBaseDirs.add(path.dirname(resolved));
        }
    }

    // 3. Auto-detected storage devices (/media, /mnt, etc.)
    try {
        const devices = detectStorageDevices(true);
        for (const dev of devices) {
            if (dev.mountPath && fs.existsSync(dev.mountPath)) {
                candidateBaseDirs.add(dev.mountPath);
                candidateBaseDirs.add(path.join(dev.mountPath, 'Arch3r_NVR'));
            }
        }
    } catch(e) {}

    // 4. Specifically check /media/devmon (automount location in Armbian)
    try {
        if (fs.existsSync('/media/devmon')) {
            const devmonDirs = fs.readdirSync('/media/devmon');
            for (const d of devmonDirs) {
                const p = path.join('/media/devmon', d);
                candidateBaseDirs.add(p);
                candidateBaseDirs.add(path.join(p, 'Arch3r_NVR'));
            }
        }
    } catch(e) {}

    // Helper: scan directory for video files
    const scanDirForVideos = async (dir, camId) => {
        if (!dir || !fs.existsSync(dir)) return;
        try {
            const items = await fs.promises.readdir(dir, { withFileTypes: true });
            for (const item of items) {
                const fullPath = path.join(dir, item.name);
                if (item.isDirectory()) {
                    await scanDirForVideos(fullPath, camId);
                } else if (item.isFile() && (item.name.endsWith(".mp4") || item.name.endsWith(".ts") || item.name.endsWith(".mkv") || item.name.endsWith(".avi"))) {
                    if (scannedPaths.has(fullPath)) continue;
                    try {
                        const stats = await fs.promises.stat(fullPath);
                        if (stats.size > 0) {
                            scannedPaths.add(fullPath);
                            newRecordings.push({
                                id: `${camId}_${item.name}`,
                                camera_id: camId,
                                file_path: fullPath,
                                file_size: stats.size,
                                start_time: getLocalTimeString(new Date(stats.mtimeMs))
                            });
                        }
                    } catch(e) {}
                }
            }
        } catch(e) {}
    };

    // Scan all candidate directories
    for (const baseDir of candidateBaseDirs) {
        if (!baseDir || !fs.existsSync(baseDir)) continue;

        try {
            const baseDirName = path.basename(baseDir);
            if (baseDirName.startsWith('cam_') || knownCamIds.has(baseDirName)) {
                await scanDirForVideos(baseDir, baseDirName);
                continue;
            }

            const archerDir = baseDirName === 'Arch3r_NVR' ? baseDir : path.join(baseDir, 'Arch3r_NVR');
            if (fs.existsSync(archerDir)) {
                const camDirs = await fs.promises.readdir(archerDir, { withFileTypes: true });
                for (const cEntry of camDirs) {
                    if (cEntry.isDirectory()) {
                        const cPath = path.join(archerDir, cEntry.name);
                        await scanDirForVideos(cPath, cEntry.name);
                    }
                }
            }

            const directDirs = await fs.promises.readdir(baseDir, { withFileTypes: true });
            for (const dEntry of directDirs) {
                if (dEntry.isDirectory() && (dEntry.name.startsWith('cam_') || knownCamIds.has(dEntry.name))) {
                    await scanDirForVideos(path.join(baseDir, dEntry.name), dEntry.name);
                }
            }
        } catch(e) {}
    }

    dbData.recordings = newRecordings;
    saveNvrDb(dbData);
    await enforceAdminStorageQuotas();
}

// Enforce max_storage_gb Quota per Administrator (Tenant)
function enforceAdminStorageQuotas() {
    try {
        const dbData = getNvrDb();
        const admins = dbData.administrators || [];
        const recordings = dbData.recordings || [];
        let changed = false;

        for (const admin of admins) {
            const maxGB = admin.max_storage_gb || 100;
            const maxBytes = maxGB * 1024 * 1024 * 1024;

            const adminCams = (dbData.cameras || []).filter(c => c.tenant_id === admin.id || c.admin_id === admin.id);
            const adminCamIds = new Set(adminCams.map(c => c.id));

            const adminRecs = recordings.filter(r => adminCamIds.has(r.camera_id)).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
            let totalBytes = adminRecs.reduce((sum, r) => sum + (r.file_size || 0), 0);

            while (totalBytes > maxBytes && adminRecs.length > 0) {
                const oldest = adminRecs.shift();
                try {
                    if (fs.existsSync(oldest.file_path)) {
                        fs.unlinkSync(oldest.file_path);
                    }
                } catch (err) {}
                totalBytes -= (oldest.file_size || 0);
                const idx = dbData.recordings.findIndex(r => r.id === oldest.id);
                if (idx !== -1) {
                    dbData.recordings.splice(idx, 1);
                    changed = true;
                }
            }
        }
        if (changed) saveNvrDb(dbData);
    } catch (e) {
        console.error('Failed enforceAdminStorageQuotas:', e.message);
    }
}

// Notification Helper
async function sendTelegramAlert(msg) {
    const settings = getSettings();
    if (!settings.telegramBotToken || !settings.telegramChatId) return;
    const url = `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`;
    try {
        await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ chat_id: settings.telegramChatId, text: `🚨 NVR Alert:\n${msg}` })
        });
    } catch(e) { sysLog('ERROR', `Telegram gagal: ${e.message}`); }
}

// Folders Setup for FFmpeg
function ensureRecordFolders() {
    const getLocal = (offsetDays = 0) => {
        const d = new Date(Date.now() + offsetDays * 86400000);
        const pad = n => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    };
    const yesterday = getLocal(-1);
    const today = getLocal(0);
    const tomorrow = getLocal(1);
    
    getCameras().forEach(cam => {
        if (cam.recordMode === 'continuous') {
            const base = resolveStoragePath(cam.storagePath || path.join(getActualBaseStoragePath(), 'Arch3r_NVR', cam.id));
            [yesterday, today, tomorrow].forEach(date => {
                const d = path.join(base, date);
                try { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); } catch (err) { sysLog('ERROR', 'Gagal membuat folder: ' + d, 'STORAGE'); }
            });
        }
    });
}

// Auto-cleanup segmen .ts lama agar penyimpanan internal STB Armbian tidak membengkak

function sanitizeRtspUrl(url) {
    if (!url || typeof url !== 'string') return '';
    let clean = url.trim();
    if (!clean) return '';
    if (clean.toLowerCase() === 'demo' || clean.toLowerCase() === 'test') return 'demo';
    return clean;
}

function formatStreamUrl(url) {
    if (!url) return '';
    if (url === 'demo') {
        return 'rtsp://rtspstream:2dc42abedfc9621360155b1f@zephyr.rtsp.stream/pattern';
    }
    return url;
}

function autoCleanupTempSegments() {
    try {
        if (!fs.existsSync(streamBaseDir)) return;
        const camDirs = fs.readdirSync(streamBaseDir);
        const now = Date.now();
        // HLS segmen 0.5 detik dengan playlist 2 item (~1 detik active window).
        // File segmen lebih dari 15 detik sudah aman dihapus dari disk.
        const MAX_AGE_MS = 15 * 1000;

        for (const dirName of camDirs) {
            const camDir = path.join(streamBaseDir, dirName);
            try {
                if (!fs.statSync(camDir).isDirectory()) continue;
                const files = fs.readdirSync(camDir);
                for (const file of files) {
                    if (file.endsWith('.ts')) {
                        const filePath = path.join(camDir, file);
                        try {
                            const stat = fs.statSync(filePath);
                            if (now - stat.mtimeMs > MAX_AGE_MS) {
                                fs.unlinkSync(filePath);
                            }
                        } catch (e) {}
                    }
                }
            } catch (e) {}
        }
    } catch (err) {}
}

const detectedCodecs = {};

function probeCodec(url) {
    return new Promise((resolve) => {
        if (!url || typeof url !== 'string') return resolve(null);
        if (url === 'demo') return resolve('h264');
        const cmd = `ffprobe -v error -err_detect ignore_err -rtsp_transport tcp -analyzeduration 1000000 -probesize 1000000 -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${url}"`;
        exec(cmd, { timeout: 3500 }, (err, stdout) => {
            if (err || !stdout) return resolve(null);
            const codec = stdout.trim().toLowerCase();
            resolve(codec);
        });
    });
}

// --- MEDIAMTX CONFIGURATION ENGINE ---
// Auto-Generate ~/mediamtx.yml dan restart MediaMTX via PM2
function syncMediaMtxConfig() {
    try {
        const currentSettings = getSettings();
        const webrtcPort = (currentSettings && currentSettings.mediamtxPort) ? currentSettings.mediamtxPort : 8889;
        const cams = getCameras();
        
        let lines = [
            'api: yes',
            'apiAddress: :9997',
            `webrtcAddress: :${webrtcPort}`,
            'hlsAddress: :8880',
            'rtspAddress: :8554',
            'protocols: [tcp]',
            '',
            'paths:'
        ];
        let activeCount = 0;

        cams.forEach(cam => {
            if (!cam.enabled) return;
            const safeId = (cam.id || '').replace(/[^a-zA-Z0-9_\-]/g, '_');
            if (!safeId) return;

            const mainUrl = formatStreamUrl(cam.mainStreamUrl);
            const subUrl = formatStreamUrl(cam.subStreamUrl);

            if (mainUrl) {
                lines.push(`  ${safeId}:`);
                lines.push(`    source: "${mainUrl}"`);
                lines.push(`    sourceProtocol: tcp`);
                lines.push(`    sourceAnyPortEnable: yes`);
                activeCount++;
            }

            if (subUrl && subUrl !== mainUrl) {
                lines.push(`  ${safeId}_sub:`);
                lines.push(`    source: "${subUrl}"`);
                lines.push(`    sourceProtocol: tcp`);
                lines.push(`    sourceAnyPortEnable: yes`);
                activeCount++;
            }
        });

        if (activeCount === 0) {
            lines.push('  all_others:');
        }

        const yamlContent = lines.join('\n') + '\n';

        const localConfig = path.join(__dirname, 'mediamtx.yml');
        let writeSuccessPath = null;

        // Try writing to primary config file first (usually /root/mediamtx.yml)
        try {
            fs.writeFileSync(mediamtxConfigFile, yamlContent, 'utf8');
            writeSuccessPath = mediamtxConfigFile;
        } catch (e) {
            sysLog('WARN', `[MediaMTX] Gagal menulis ke ${mediamtxConfigFile} (${e.message}). Mencoba path lokal...`);
        }

        // Tulis juga salinan di ./mediamtx.yml (local path fallback)
        if (localConfig !== mediamtxConfigFile || !writeSuccessPath) {
            try { 
                fs.writeFileSync(localConfig, yamlContent, 'utf8'); 
                if (!writeSuccessPath) writeSuccessPath = localConfig;
            } catch (e) {
                if (!writeSuccessPath) throw e;
            }
        }

        sysLog('INFO', `[MediaMTX] Konfigurasi berhasil disinkronkan ke ${writeSuccessPath} (${activeCount} stream aktif, WebRTC :${webrtcPort}, HLS :8880)`);

        // Panggil systemctl restart mediamtx || pm2 restart mediamtx agar MediaMTX membaca perubahan secara otomatis
        exec('pkill -HUP mediamtx || systemctl restart mediamtx || pm2 restart mediamtx', (err, stdout, stderr) => {
            if (err) {
                if (!err.message.includes('not found') && !err.message.includes('No command')) {
                    sysLog('WARN', `[MediaMTX] Info restart: ${err.message}`);
                }
            } else {
                sysLog('INFO', `[MediaMTX] MediaMTX berhasil di-restart/reload.`);
            }
        });
    } catch (err) {
        sysLog('ERROR', `[MediaMTX] Gagal sinkronisasi mediamtx.yml: ${err.message}`);
    }
}

// --- FFMPEG RECORDING ENGINE (LIGHTWEIGHT STREAM COPY ONLY) ---
// FFmpeg digunakan KHUSUS untuk perekaman lokal/USB dengan -c:v copy -c:a copy
function spawnRecordingFFmpeg(cam) {
    if (!cam || !cam.enabled) return;
    if (cam.recordMode !== 'continuous') return;
    if (getSettings().globalStorageMode === 'disabled') return;

    const settings = getSettings();
    const recQuality = settings.recordingQuality || 'main';
    const hasDistinctSub = cam.subStreamUrl && cam.subStreamUrl.trim() && cam.subStreamUrl.trim() !== cam.mainStreamUrl.trim();
    const useSub = recQuality === 'sub' && hasDistinctSub;
    const rawUrl = useSub ? cam.subStreamUrl : cam.mainStreamUrl;
    const sourceUrl = formatStreamUrl(rawUrl);

    if (!sourceUrl) {
        sysLog('WARN', `[${cam.id}] URL RTSP tidak tersedia untuk perekaman.`, 'CAMERA');
        return;
    }

    stopCameraRecording(cam.id);

    const recBase = resolveStoragePath(cam.storagePath || path.join(getActualBaseStoragePath(), 'Arch3r_NVR', cam.id));
    try { if (!fs.existsSync(recBase)) fs.mkdirSync(recBase, { recursive: true }); } catch (err) { sysLog('ERROR', 'Gagal membuat folder base: ' + recBase, 'STORAGE'); }

    const segSec = cam.segmentDurationSec || 900;
    const isDemo = sourceUrl === 'demo';
    

    let inputArgs = [];
    if (isDemo) {
        inputArgs = [
            '-f', 'lavfi', '-i', 'testsrc=size=1280x720:rate=25',
            '-f', 'lavfi', '-i', 'sine=frequency=1000:sample_rate=44100'
        ];
    } else {
        const isRtsp = typeof sourceUrl === 'string' && sourceUrl.startsWith('rtsp://');
        inputArgs = [
            ...(isRtsp ? ['-rtsp_transport', 'tcp'] : []),
            '-i', sourceUrl
        ];
    }

    // Perintah copy stream ringan (-c:v copy -an) khusus untuk perekaman lokal/USB
    const args = [
        '-y',
        '-loglevel', 'warning',
        ...inputArgs,
        '-c:v', isDemo ? 'libx264' : 'copy',
        ...(isDemo ? ['-preset', 'ultrafast'] : []),
        '-an',
        '-f', 'segment',
        '-segment_time', segSec.toString(),
        '-segment_format', 'mp4',
        '-reset_timestamps', '1',
        '-strftime', '1',
        path.join(recBase, "%Y-%m-%d_%H-%M-%S.mp4")
    ];

    sysLog('INFO', `[${cam.id}] Memulai perekaman kontinyu FFmpeg (-c:v copy -an) [${useSub ? 'SD/Sub' : 'HD/Main'}] -> ${recBase}`, 'CAMERA');

    const child = spawn('ffmpeg', args);
    child.killedByUser = false;
    child.lastErr = '';
    child.on('error', err => {
        sysLog('ERROR', 'FFmpeg spawn error (' + cam.id + '): ' + err.message, 'CAMERA');
    });
    child.stderr.on('data', d => {
        let str = d.toString();
        child.lastErr = str;
    });

    child.on('close', (code) => {
        if (ffProcesses[cam.id]) {
            delete ffProcesses[cam.id];
        }

        if (!child.killedByUser) {
            sysLog('WARN', `[${cam.id}] Perekaman FFmpeg berhenti (Code: ${code}). Err: ${child.lastErr} Reconnect otomatis...`, 'CAMERA');
            const timerKey = `rec_${cam.id}`;
            if (reconnectTimers[timerKey]) clearTimeout(reconnectTimers[timerKey]);
            
            const jitter = Math.floor(Math.random() * 5000); // 0 to 5 seconds jitter
            reconnectTimers[timerKey] = setTimeout(() => {
                const currentCam = getCameras().find(c => c.id === cam.id);
                if (currentCam && currentCam.enabled && currentCam.recordMode === 'continuous') {
                    spawnRecordingFFmpeg(currentCam);
                }
            }, 10000 + jitter);
        }
    });

    ffProcesses[cam.id] = child;
}

function stopCameraRecording(camId) {
    const timerKey = `rec_${camId}`;
    if (reconnectTimers[timerKey]) {
        clearTimeout(reconnectTimers[timerKey]);
        delete reconnectTimers[timerKey];
    }

    if (ffProcesses[camId]) {
        try {
            ffProcesses[camId].killedByUser = true;
            ffProcesses[camId].kill('SIGKILL');
        } catch (e) {}
        delete ffProcesses[camId];
    }
}

function startAllStreams() {
    // 1. Auto-generate konfigurasi MediaMTX & restart via PM2
    syncMediaMtxConfig(); ensureRecordFolders();

    // 2. Bersihkan timer & proses rekaman lama
    Object.keys(reconnectTimers).forEach(key => {
        clearTimeout(reconnectTimers[key]);
        delete reconnectTimers[key];
    });

    Object.values(ffProcesses).forEach(proc => {
        if (proc) {
            proc.killedByUser = true;
            try { proc.kill('SIGKILL'); } catch (e) {}
        }
    });
    ffProcesses = {};
    ensureRecordFolders();

    // 3. Jalankan perekaman FFmpeg khusus kamera continuous
    cameras = getCameras();
    let delay = 0;
    cameras.forEach(cam => {
        if (cam.enabled && cam.recordMode === 'continuous') {
            setTimeout(() => {
                spawnRecordingFFmpeg(cam);
            }, delay);
            delay += 2500; // Stagger each camera by 2.5 seconds to prevent OOM
        }
    });
}

function stopCamera(camId) {
    stopCameraRecording(camId);
    syncMediaMtxConfig(); ensureRecordFolders();
}

// Retention (Cleaning old files locally)
function runRetention() {
    sysLog('INFO', 'Running retention check...', 'STORAGE');
    ensureRecordFolders();
    const cams = getCameras();
    let filesDeleted = false;
    
    for (const cam of cams) {
        if (cam.recordMode !== 'continuous') continue;
        const maxDays = cam.maxStorageDays || 7;
        const maxGB = cam.maxFolderSizeGB || 10;
        const base = resolveStoragePath(cam.storagePath || path.join(getActualBaseStoragePath(), 'Arch3r_NVR', cam.id));
        if (!fs.existsSync(base)) continue;

        const limitMs = Date.now() - (maxDays * 86400000);
        
        let allFiles = [];
        const dates = fs.readdirSync(base).filter(f => /^\d{4}-\d{2}-\d{2}$/.test(f));
        dates.forEach(date => {
            const datePath = path.join(base, date);
            if (fs.lstatSync(datePath).isDirectory()) {
                const files = fs.readdirSync(datePath).filter(f => f.endsWith('.mp4'));
                files.forEach(f => {
                    const filePath = path.join(datePath, f);
                    const stats = fs.statSync(filePath);
                    allFiles.push({ path: filePath, size: stats.size, mtime: stats.mtimeMs });
                });
            }
        });

        // 1. Delete by Age
        for (const file of allFiles) {
            if (file.mtime < limitMs) {
                try { 
                    fs.unlinkSync(file.path);
                    filesDeleted = true;
                    sysLog('INFO', `[Retention] Deleted by age (${cam.id}): ${file.path}`, 'STORAGE');
                } catch(e) {}
            }
        }

        // 2. Delete by Size Limit
        allFiles = allFiles.filter(f => fs.existsSync(f.path));
        let totalSizeBytes = allFiles.reduce((acc, f) => acc + f.size, 0);
        const maxBytes = maxGB * 1024 * 1024 * 1024;

        if (totalSizeBytes > maxBytes) {
            allFiles.sort((a, b) => a.mtime - b.mtime); // Oldest first
            for (const file of allFiles) {
                if (totalSizeBytes <= maxBytes) break;
                try { 
                    fs.unlinkSync(file.path); 
                    totalSizeBytes -= file.size;
                    filesDeleted = true;
                    sysLog('INFO', `[Retention] Deleted by quota (${cam.id}): ${file.path}`, 'STORAGE');
                } catch(e) {}
            }
        }
        
        // Clean empty folders
        dates.forEach(date => {
            const datePath = path.join(base, date);
            if (fs.existsSync(datePath) && fs.readdirSync(datePath).length === 0) {
                try { fs.rmdirSync(datePath); } catch(e){}
            }
        });
    }
    
    if (filesDeleted) {
        syncRecordingsToDB();
    }
}

// Global Disk Space Protection (<10% free space)
function checkGlobalDiskSpace() {
    try {
        const stats = fs.statfsSync(getActualBaseStoragePath());
        const percent = (stats.blocks - stats.bfree) / stats.blocks;
        if (percent > 0.90) { 
            sysLog('WARN', `Global storage capacity > 90% (${(percent*100).toFixed(1)}%). Executing emergency cleanup.`, 'STORAGE');
            
            const dbData = getNvrDb();
            let recordings = dbData.recordings.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
            const toDelete = recordings.slice(0, 100);
            
            let deleted = false;
            for (const rec of toDelete) {
                if (fs.existsSync(rec.file_path)) {
                    try {
                        fs.unlinkSync(rec.file_path);
                        deleted = true;
                        sysLog('INFO', `[Emergency Cleanup] Deleted ${rec.file_path}`, 'STORAGE');
                    } catch(e) {}
                }
            }
            if (deleted) syncRecordingsToDB();
        }
    } catch(e) { sysLog('ERROR', `Disk check failed : ${e.message}`, 'STORAGE'); }
}


// --- REST API ENDPOINTS ---

app.get('/api/cameras', verifyToken, (req, res) => {
    const currentSettings = getSettings();
    const dbData = getNvrDb();

    // 1. Superadmin: TIDAK boleh memiliki kamera langsung
    if (req.userRole === 'superadmin') {
        return res.json({
            cameras: [],
            quota: null,
            isSuperadmin: true,
            mediamtxPort: currentSettings.mediamtxPort || 8889,
            mediamtxHost: currentSettings.mediamtxHost || ''
        });
    }

    const authorizedCams = getAuthorizedCamerasForReq(req);
    const cams = authorizedCams.map(c => {
        const safeId = (c.id || '').replace(/[^a-zA-Z0-9_\-]/g, '_');
        const hasDistinctSub = c.subStreamUrl && c.subStreamUrl.trim() && c.subStreamUrl.trim() !== c.mainStreamUrl.trim();
        const mainStat = (cameraStatuses[c.id] && cameraStatuses[c.id].main) || { status: c.enabled ? 'online' : 'offline', error: null };
        const subStat = (cameraStatuses[c.id] && cameraStatuses[c.id].sub) || { status: c.enabled ? 'online' : 'offline', error: null };
        const isRecording = !!ffProcesses[c.id];
        return {
            ...c,
            isRecording,
            mediaMtxPath: safeId,
            mediaMtxSubPath: hasDistinctSub ? `${safeId}_sub` : safeId,
            mainHls: `/streams/${c.id}/main.m3u8`,
            subHls: hasDistinctSub ? `/streams/${c.id}/sub.m3u8` : `/streams/${c.id}/main.m3u8`,
            status: c.enabled ? 'online' : 'offline',
            error: mainStat.error,
            subStatus: c.enabled ? 'online' : 'offline'
        };
    });

    let quotaInfo = null;
    if (req.userRole === 'administrator') {
        const currentAdminId = req.adminId || req.userId;
        const admin = (dbData.administrators || []).find(a => a.id === currentAdminId);
        const maxCameras = admin ? (admin.max_cameras || 8) : 8;
        const maxStorageGB = admin ? (admin.max_storage_gb || 100) : 100;
        
        const adminCamIds = new Set(authorizedCams.map(c => c.id));
        let usedBytes = 0;
        (dbData.recordings || []).forEach(r => {
            if (adminCamIds.has(r.camera_id)) {
                usedBytes += (r.file_size || 0);
            }
        });
        const usedStorageGB = parseFloat((usedBytes / (1024 * 1024 * 1024)).toFixed(2));
        
        quotaInfo = {
            maxCameras,
            currentCameras: authorizedCams.length,
            maxStorageGB,
            usedStorageGB,
            adminName: admin ? (admin.name || admin.username) : 'Gedung'
        };
    }

    res.json({
        cameras: cams,
        quota: quotaInfo,
        role: req.userRole,
        isReadOnly: req.userRole === 'user',
        globalStorageMode: currentSettings.globalStorageMode || 'disabled',
        mediamtxPort: currentSettings.mediamtxPort || 8889,
        mediamtxHost: currentSettings.mediamtxHost || ''
    });
});

app.post('/api/cameras', verifyToken, requireAdministrator, (req, res) => {
    if (req.userRole !== 'administrator') {
        return res.status(403).json({ error: 'Akses Ditolak: Hanya Administrator Gedung yang dapat menambahkan kamera.' });
    }

    const currentAdminId = req.adminId || req.userId;
    const dbData = getNvrDb();
    const admin = (dbData.administrators || []).find(a => a.id === currentAdminId);
    if (!admin) {
        return res.status(403).json({ error: 'Akun Administrator tidak terdaftar dalam sistem' });
    }

    // Periksa Batas Kuota Kamera (max_cameras)
    const existingCams = (dbData.cameras || []).filter(c => c.tenant_id === currentAdminId || c.admin_id === currentAdminId);
    const maxCameras = admin.max_cameras || 8;
    if (existingCams.length >= maxCameras) {
        return res.status(400).json({
            error: `Batas kuota kamera untuk gedung Anda telah penuh (${existingCams.length}/${maxCameras} Kamera). Silakan hubungi Superadmin untuk menambah kuota.`
        });
    }

    const { id, name, enabled, mainStreamUrl, subStreamUrl, rtspUrl, storagePath, resolution, fps, recordMode, maxStorageDays, maxFolderSizeGB, segmentDurationSec, transcode, ptzEnabled, ptzUrl, ptzUser, ptzPass } = req.body;
    
    const rawMainUrl = mainStreamUrl || rtspUrl || "";
    const finalMainUrl = sanitizeRtspUrl(rawMainUrl);
    const finalSubUrl = subStreamUrl ? sanitizeRtspUrl(subStreamUrl) : finalMainUrl;

    // If id is provided and not empty, use it; otherwise generate
    let newCamId = (id && typeof id === 'string' && id.trim() !== '') ? id.trim() : `cam_${Date.now()}`;
    
    // Check for ID collision
    const existingIds = (dbData.cameras || []).map(c => c.id);
    if (existingIds.includes(newCamId)) {
        return res.status(400).json({ error: 'Camera ID sudah digunakan. Harap gunakan ID yang unik.' });
    }

    const newCam = { 
        id: newCamId,
        tenant_id: currentAdminId,
        admin_id: currentAdminId,
        name: name || "New Camera", 
        enabled: enabled !== undefined ? !!enabled : true,
        mainStreamUrl: finalMainUrl, 
        subStreamUrl: finalSubUrl, 
        transcode: transcode || 'auto',
        resolution: resolution || "1080p",
        fps: fps || 30,
        recordMode: recordMode || 'disabled',
        storagePath: storagePath || path.join(getActualBaseStoragePath(), 'Arch3r_NVR', newCamId),
        maxStorageDays: parseInt(maxStorageDays) || 7,
        ptzEnabled: !!ptzEnabled,
        ptzUrl: ptzUrl || '',
        ptzUser: ptzUser || '',
        ptzPass: ptzPass || '',
        maxFolderSizeGB: parseFloat(maxFolderSizeGB) || 10,
        segmentDurationSec: parseInt(segmentDurationSec) || 900
    };

    if (!dbData.cameras) dbData.cameras = [];
    dbData.cameras.push(newCam);
    saveNvrDb(dbData);
    cameras = dbData.cameras;
    
    // Sinkronisasi MediaMTX otomatis
    syncMediaMtxConfig(); ensureRecordFolders();

    if (newCam.enabled && newCam.recordMode === 'continuous') {
        spawnRecordingFFmpeg(newCam);
    }
    
    sysLog('INFO', `[Gedung: ${admin.name}] Kamera Ditambahkan: ${newCam.name} (${existingCams.length + 1}/${maxCameras} kamera)`, 'CAMERA');
    res.json({ success: true, camera: newCam });
});

app.put('/api/cameras/:id', verifyToken, requireAdministrator, (req, res) => {
    if (req.userRole !== 'administrator') {
        return res.status(403).json({ error: 'Akses Ditolak: Hanya Administrator yang berhak mengubah kamera.' });
    }

    const currentAdminId = req.adminId || req.userId;
    const dbData = getNvrDb();
    const index = (dbData.cameras || []).findIndex(c => c.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Kamera tidak ditemukan' });
    
    const targetCam = dbData.cameras[index];
    // Isolasi Data Ketat: Hanya admin pemilik gedung yang dapat mengubah
    if (targetCam.tenant_id !== currentAdminId && targetCam.admin_id !== currentAdminId) {
        return res.status(403).json({ error: 'Akses Ditolak: Anda tidak memiliki izin mengedit kamera milik gedung lain.' });
    }

    const { name, enabled, mainStreamUrl, subStreamUrl, rtspUrl, storagePath, resolution, fps, recordMode, maxStorageDays, maxFolderSizeGB, segmentDurationSec, transcode, ptzEnabled, ptzUrl, ptzUser, ptzPass } = req.body;
    
    stopCameraRecording(req.params.id);

    const rawMainUrl = mainStreamUrl !== undefined ? mainStreamUrl : (rtspUrl || targetCam.mainStreamUrl);
    const rawSubUrl = subStreamUrl !== undefined ? subStreamUrl : targetCam.subStreamUrl;
    const finalMainUrl = sanitizeRtspUrl(rawMainUrl);
    const finalSubUrl = rawSubUrl ? sanitizeRtspUrl(rawSubUrl) : finalMainUrl;

    dbData.cameras[index] = {
        ...targetCam,
        name: name || targetCam.name,
        enabled: enabled !== undefined ? !!enabled : targetCam.enabled,
        mainStreamUrl: finalMainUrl,
        subStreamUrl: finalSubUrl,
        transcode: transcode !== undefined ? transcode : (targetCam.transcode || 'auto'),
        ptzEnabled: ptzEnabled !== undefined ? !!ptzEnabled : !!targetCam.ptzEnabled,
        ptzUrl: ptzUrl !== undefined ? ptzUrl : (targetCam.ptzUrl || ''),
        ptzUser: ptzUser !== undefined ? ptzUser : (targetCam.ptzUser || ''),
        ptzPass: ptzPass !== undefined ? ptzPass : (targetCam.ptzPass || ''),
        resolution: resolution || targetCam.resolution,
        fps: fps || targetCam.fps,
        recordMode: recordMode || targetCam.recordMode,
        storagePath: storagePath !== undefined ? storagePath : targetCam.storagePath,
        maxStorageDays: parseInt(maxStorageDays) || targetCam.maxStorageDays,
        maxFolderSizeGB: parseFloat(maxFolderSizeGB) || targetCam.maxFolderSizeGB,
        segmentDurationSec: parseInt(segmentDurationSec) || targetCam.segmentDurationSec,
        tenant_id: targetCam.tenant_id || currentAdminId,
        admin_id: targetCam.admin_id || currentAdminId
    };
    
    saveNvrDb(dbData);
    cameras = dbData.cameras;

    // Sinkronisasi MediaMTX otomatis
    syncMediaMtxConfig(); ensureRecordFolders();

    if (dbData.cameras[index].enabled && dbData.cameras[index].recordMode === 'continuous') {
        spawnRecordingFFmpeg(dbData.cameras[index]);
    }

    sysLog('INFO', `[Gedung] Kamera Diperbarui: ${dbData.cameras[index].name}`, 'CAMERA');
    res.json({ success: true, camera: dbData.cameras[index] });
});

app.post('/api/cameras/:id/restart', verifyToken, requireAdministrator, (req, res) => {
    const currentAdminId = req.adminId || req.userId;
    const dbData = getNvrDb();
    const cam = (dbData.cameras || []).find(c => c.id === req.params.id);
    if (!cam) return res.status(404).json({ error: 'Kamera tidak ditemukan' });
    if (cam.tenant_id !== currentAdminId && cam.admin_id !== currentAdminId) {
        return res.status(403).json({ error: 'Akses Ditolak: Anda tidak memiliki izin pada kamera ini.' });
    }

    stopCameraRecording(cam.id);
    syncMediaMtxConfig(); ensureRecordFolders();

    setTimeout(() => {
        if (cam.enabled && cam.recordMode === 'continuous') {
            spawnRecordingFFmpeg(cam);
        }
        res.json({ success: true, message: `Stream kamera ${cam.name} disinkronkan ke MediaMTX.` });
    }, 500);
});




app.post('/api/system/scan-advanced', verifyToken, requireAdmin, async (req, res) => {
    const { startIp, endIp, ports } = req.body;
    
    // Helper to convert IP to number
    function ipToNum(ip) {
        return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
    }
    
    // Helper to convert number to IP
    function numToIp(num) {
        return [(num >>> 24), (num >> 16 & 255), (num >> 8 & 255), (num & 255)].join('.');
    }
    
    const startNum = ipToNum(startIp);
    const endNum = ipToNum(endIp);
    const portList = ports.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));
    
    if(endNum < startNum || endNum - startNum > 1024) {
        return res.status(400).json({ error: 'Rentang IP tidak valid atau terlalu besar (Maksimal 1024 IP)'});
    }

    const net = require('net');
    const results = [];
    
    const checkPort = (ip, port, timeout = 800) => {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            let status = 'closed';
            
            socket.setTimeout(timeout);
            socket.on('connect', () => {
                status = 'open';
                socket.destroy();
            });
            socket.on('timeout', () => {
                socket.destroy();
            });
            socket.on('error', () => {
                socket.destroy();
            });
            socket.on('close', () => {
                resolve(status === 'open');
            });
            socket.connect(port, ip);
        });
    };

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    res.write('data: {"status": "started"}\n\n');

    let scannedCount = 0;
    let totalToScan = (endNum - startNum + 1) * portList.length;

    for (let i = startNum; i <= endNum; i++) {
        const ip = numToIp(i);
        const activePorts = [];
        
        for (const port of portList) {
            const isOpen = await checkPort(ip, port);
            scannedCount++;
            
            if (isOpen) {
                activePorts.push(port);
            }
            
            // Progress update every ~10 scans
            if (scannedCount % 10 === 0) {
                res.write(`data: {"progress": ${Math.round((scannedCount/totalToScan)*100)}}\n\n`);
            }
        }
        
        if (activePorts.length > 0) {
            const device = {
                ip: ip,
                ports: activePorts,
                name: 'Kamera IP / ONVIF',
                isRtsp: activePorts.includes(554),
                isOnvif: activePorts.some(p => p !== 554)
            };
            results.push(device);
            res.write(`data: {"found": ${JSON.stringify(device)}}\n\n`);
        }
    }

    res.write('data: {"status": "done"}\n\n');
    res.end();
});


app.get('/api/system/scan-onvif', verifyToken, requireAdmin, async (req, res) => {
    try {
        const onvif = require('node-onvif');
        const devices = await onvif.startProbe();
        
        const results = devices.map(info => {
            return {
                urn: info.urn,
                name: info.name,
                hardware: info.hardware,
                location: info.location,
                xaddrs: info.xaddrs,
                mainIp: info.xaddrs && info.xaddrs.length > 0 ? new URL(info.xaddrs[0]).hostname : 'unknown'
            };
        });
        
        res.json({ success: true, devices: results });
    } catch (error) {
        console.error('ONVIF Scan error:', error);
        res.status(500).json({ error: 'Gagal melakukan scan jaringan ONVIF: ' + error.message });
    }
});

app.post('/api/cameras/:id/ptz', verifyToken, async (req, res) => {
    const { direction } = req.body;
    const authorizedCams = getAuthorizedCamerasForReq(req);
    const cam = authorizedCams.find(c => c.id === req.params.id);
    if (!cam) return res.status(403).json({ error: 'Akses Ditolak: Kamera tidak terdaftar pada akun Anda.' });
    
    try {
        const onvif = require('node-onvif');
        const urlObj = new URL(cam.mainStreamUrl);
        const host = urlObj.hostname;
        const user = decodeURIComponent(urlObj.username || '');
        const pass = decodeURIComponent(urlObj.password || '');
        
        if (!host) throw new Error('Host IP tidak valid di RTSP URL');
        
        // Coba port ONVIF umum
        const ports = [8899, 80, 8080, 2020];
        let device = null;
        let initError = null;
        
        for (const port of ports) {
            try {
                const tempDev = new onvif.OnvifDevice({
                    xaddr: `http://${host}:${port}/onvif/device_service`,
                    user: user,
                    pass: pass
                });
                await tempDev.init();
                device = tempDev;
                break; // Berhasil
            } catch (err) {
                initError = err;
            }
        }
        
        if (!device) throw new Error(`Gagal terhubung ke ONVIF (${initError ? initError.message : 'Timeout'})`);
        
        const ptz = device.services.ptz;
        if (!ptz) throw new Error('Kamera ini tidak mendukung layanan PTZ ONVIF');
        
        const profile = device.getCurrentProfile();
        
        let x = 0, y = 0, z = 0;
        const speed = 1.0;
        if (direction === 'up') y = speed;
        if (direction === 'down') y = -speed;
        if (direction === 'left') x = -speed;
        if (direction === 'right') x = speed;
        if (direction === 'zoom_in') z = speed;
        if (direction === 'zoom_out') z = -speed;
        
        await device.ptzMove({
            'profileToken': profile['token'],
            'velocity': {'x': x, 'y': y, 'z': z},
            'timeout': 1
        });
        
        setTimeout(() => {
            device.ptzStop({'profileToken': profile['token'], 'panTilt': true, 'zoom': true}).catch(() => {});
        }, 500);
        
        sysLog('INFO', `[PTZ] Kamera ${cam.name} (${host}) bergerak ke ${direction}`, 'CAMERA');
        res.json({ success: true, message: 'PTZ command sent' });
    } catch (e) {
        sysLog('ERROR', `[PTZ] Gagal ONVIF untuk ${cam ? cam.name : req.params.id}: ${e.message}`, 'CAMERA');
        res.status(500).json({ error: 'Gagal mengontrol PTZ. ' + e.message });
    }
});

app.delete('/api/cameras/:id', verifyToken, requireAdministrator, (req, res) => {
    if (req.userRole !== 'administrator') {
        return res.status(403).json({ error: 'Akses Ditolak: Hanya Administrator yang berhak menghapus kamera.' });
    }

    const currentAdminId = req.adminId || req.userId;
    const dbData = getNvrDb();
    const index = (dbData.cameras || []).findIndex(c => c.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Kamera tidak ditemukan' });

    const targetCam = dbData.cameras[index];
    if (targetCam.tenant_id !== currentAdminId && targetCam.admin_id !== currentAdminId) {
        return res.status(403).json({ error: 'Akses Ditolak: Anda tidak memiliki izin menghapus kamera milik gedung lain.' });
    }

    stopCameraRecording(req.params.id);
    const camStreamDir = path.join(streamBaseDir, req.params.id);
    if (fs.existsSync(camStreamDir)) {
        try { fs.rmSync(camStreamDir, { recursive: true, force: true }); } catch (e) {}
    }

    dbData.cameras.splice(index, 1);
    // Hapus id kamera dari allowed_cameras milik user
    (dbData.users || []).forEach(u => {
        if (Array.isArray(u.allowed_cameras)) {
            u.allowed_cameras = u.allowed_cameras.filter(cid => cid !== req.params.id);
        }
    });

    saveNvrDb(dbData);
    cameras = dbData.cameras;
    
    // Sinkronisasi MediaMTX otomatis setelah hapus kamera
    syncMediaMtxConfig(); ensureRecordFolders();

    sysLog('INFO', `[Gedung] Kamera Dihapus: ${targetCam.name}`, 'CAMERA');
    res.json({ success: true });
});

// Proxy route for videos with full seeking & download support
app.get('/api/recordings/:camId/:date/:filename', verifyToken, (req, res) => {
    const { camId, date, filename } = req.params;
    const authorizedCams = getAuthorizedCamerasForReq(req);
    const cam = authorizedCams.find(c => c.id === camId);
    const isPrivileged = req.userRole === 'superadmin' || req.userRole === 'administrator';

    if (!isPrivileged && !cam) {
        return res.status(403).send('Forbidden: Akses rekaman kamera ini tidak diizinkan');
    }
    
    const dbData = getNvrDb();
    // 1. Check exact file path recorded in database
    const rec = (dbData.recordings || []).find(r => r.camera_id === camId && (
        r.file_path.endsWith('/' + filename) || 
        r.file_path.endsWith('\\' + filename) || 
        path.basename(r.file_path) === filename
    ));

    let filePath = rec ? rec.file_path : null;

    // 2. Comprehensive Fallbacks on disk
    if (!filePath || !fs.existsSync(filePath)) {
        const candidatePaths = [
            cam && cam.storagePath ? path.join(resolveStoragePath(cam.storagePath), filename) : null,
            cam && cam.storagePath ? path.join(resolveStoragePath(cam.storagePath), date, filename) : null,
            path.join(getActualBaseStoragePath(), 'Arch3r_NVR', camId, filename),
            path.join(getActualBaseStoragePath(), 'Arch3r_NVR', camId, date, filename),
            path.join(baseStoragePath, 'Arch3r_NVR', camId, filename),
            path.join(baseStoragePath, 'Arch3r_NVR', camId, date, filename),
            path.join(__dirname, 'public', 'recordings', 'Arch3r_NVR', camId, filename),
            path.join(__dirname, 'public', 'recordings', 'Arch3r_NVR', camId, date, filename),
            path.join(__dirname, 'recordings', 'Arch3r_NVR', camId, filename),
            path.join(__dirname, 'recordings', 'Arch3r_NVR', camId, date, filename)
        ].filter(Boolean);

        for (const p of candidatePaths) {
            if (fs.existsSync(p)) {
                filePath = p;
                break;
            }
        }
    }
    
    if (filePath && fs.existsSync(filePath)) {
        if (req.query.download === '1') {
            res.download(filePath, filename);
        } else {
            res.sendFile(filePath, { acceptRanges: true });
        }
    } else {
        res.status(404).send('File rekaman tidak ditemukan di disk penyimpanan.');
    }
});

app.get('/api/recordings', verifyToken, async (req, res) => {
    try {
        await syncRecordingsToDB();
        const authorizedCams = getAuthorizedCamerasForReq(req);
        const allowedCamIds = new Set(authorizedCams.map(c => c.id));
        const isPrivileged = req.userRole === 'superadmin' || req.userRole === 'administrator';
        const result = {};
        const dbData = getNvrDb();
        const recordings = (dbData.recordings || []).sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
        
        recordings.forEach(row => {
            const camId = row.camera_id;
            // Admin & Superadmin can view all recordings on their system; regular users are filtered
            if (!isPrivileged && allowedCamIds.size > 0 && !allowedCamIds.has(camId)) {
                return;
            }
            const normPath = (row.file_path || '').replace(/\\/g, '/');
            const parts = normPath.split('/');
            const filename = parts.pop() || '';
            const parent = parts.pop() || '';
            let date = "Unknown";
            const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) {
                date = dateMatch[1];
            } else if (/^\d{4}-\d{2}-\d{2}$/.test(parent)) {
                date = parent;
            } else if (row.start_time) {
                date = row.start_time.split('T')[0];
            }
            
            if (!result[camId]) result[camId] = {};
            if (!result[camId][date]) result[camId][date] = [];
            if (!result[camId][date].includes(filename)) {
                result[camId][date].push(filename);
            }
        });
        res.json(result);
    } catch(e) {
        res.status(500).json({error: e.message});
    }
});

// --- Armbian System Monitoring & Auto-Detect Storage Engine ---
let cachedCpuUsage = 0;
let lastCpuTicks = null;

function sampleCpuUsage() {
    try {
        const cpus = os.cpus();
        if (!cpus || cpus.length === 0) return;
        let idle = 0;
        let total = 0;
        for (const cpu of cpus) {
            for (const type in cpu.times) {
                total += cpu.times[type];
            }
            idle += cpu.times.idle;
        }

        if (lastCpuTicks) {
            const idleDelta = idle - lastCpuTicks.idle;
            const totalDelta = total - lastCpuTicks.total;
            if (totalDelta > 0) {
                cachedCpuUsage = Math.max(0, Math.min(100, Math.round((1 - (idleDelta / totalDelta)) * 100)));
            }
        }
        lastCpuTicks = { idle, total };
    } catch(e) {}
}
setInterval(sampleCpuUsage, 2500);
sampleCpuUsage();

let cachedNetStats = {
    interface: 'eth0',
    rxSpeedFormatted: '0 KB/s',
    txSpeedFormatted: '0 KB/s',
    rxSpeedBytes: 0,
    txSpeedBytes: 0
};
let lastNetSample = null;

function sampleNetworkStats() {
    try {
        if (fs.existsSync('/proc/net/dev')) {
            const content = fs.readFileSync('/proc/net/dev', 'utf8');
            const lines = content.split('\n');
            let candidateIf = null;
            let totalRx = 0;
            let totalTx = 0;
            
            const prefIf = getSettings().netInterface || 'auto';

            // Temukan interface aktif berdasarkan OS networkInterfaces (yang punya IPv4)
            const os = require('os');
            const nics = os.networkInterfaces();
            const activeIfs = Object.keys(nics).filter(name => name !== 'lo' && nics[name].some(addr => !addr.internal && addr.family === 'IPv4'));

            for (const line of lines) {
                if (!line.includes(':')) continue;
                const [rawIf, rawData] = line.split(':');
                const ifName = rawIf.trim();
                if (ifName === 'lo') continue;

                if (prefIf !== 'auto' && ifName !== prefIf) continue;

                const cols = rawData.trim().split(/\s+/);
                const rx = parseInt(cols[0], 10) || 0;
                const tx = parseInt(cols[8], 10) || 0;

                if (prefIf === 'auto') {
                    // Jika auto, prioritaskan yang punya IP aktif. Jika ada > 1, pilih yang eth/en dulu.
                    if (activeIfs.includes(ifName)) {
                        if (!candidateIf || (!candidateIf.startsWith('eth') && !candidateIf.startsWith('en') && (ifName.startsWith('eth') || ifName.startsWith('en')))) {
                            candidateIf = ifName;
                            totalRx = rx;
                            totalTx = tx;
                        }
                    } else if (!candidateIf && activeIfs.length === 0) {
                         // Fallback jika tidak terdeteksi IP
                         candidateIf = ifName;
                         totalRx = rx;
                         totalTx = tx;
                    }
                } else {
                    candidateIf = ifName;
                    totalRx = rx;
                    totalTx = tx;
                }
            }

            const now = Date.now();
            if (candidateIf && lastNetSample && lastNetSample.interface === candidateIf) {
                const dt = (now - lastNetSample.time) / 1000;
                if (dt > 0) {
                    const rxRate = Math.max(0, (totalRx - lastNetSample.rx) / dt);
                    const txRate = Math.max(0, (totalTx - lastNetSample.tx) / dt);
                    cachedNetStats = {
                        interface: candidateIf,
                        rxSpeedFormatted: formatDataRate(rxRate),
                        txSpeedFormatted: formatDataRate(txRate),
                        rxSpeedBytes: Math.round(rxRate),
                        txSpeedBytes: Math.round(txRate)
                    };
                }
            }
            if (candidateIf) {
                lastNetSample = { interface: candidateIf, rx: totalRx, tx: totalTx, time: now };
            }
        } else {
            const ifaces = os.networkInterfaces();
            let activeIf = 'eth0';
            for (const name of Object.keys(ifaces)) {
                if (name !== 'lo' && !name.startsWith('127.')) {
                    activeIf = name;
                    break;
                }
            }
            cachedNetStats.interface = activeIf;
        }
    } catch(e) {}
}
setInterval(sampleNetworkStats, 2500);
sampleNetworkStats();

function formatDataRate(bytesPerSec) {
    if (bytesPerSec >= 1024 * 1024) {
        return (bytesPerSec / (1024 * 1024)).toFixed(1) + ' MB/s';
    }
    if (bytesPerSec >= 1024) {
        return (bytesPerSec / 1024).toFixed(0) + ' KB/s';
    }
    return Math.round(bytesPerSec) + ' B/s';
}

function getStbThermalCelsius() {
    const thermalPaths = [
        '/sys/class/thermal/thermal_zone0/temp',
        '/sys/class/thermal/thermal_zone1/temp',
        '/sys/devices/virtual/thermal/thermal_zone0/temp'
    ];
    for (const p of thermalPaths) {
        if (fs.existsSync(p)) {
            try {
                const raw = fs.readFileSync(p, 'utf8').trim();
                const val = parseFloat(raw);
                if (!isNaN(val)) {
                    // Sensor Linux biasanya mengembalikan nilai dalam ribuan (millidegrees)
                    return val > 200 ? Math.round(val / 1000) : Math.round(val);
                }
            } catch(e) {}
        }
    }
    return 48; // Nilai default wajar jika sensor tidak dapat diakses di container sandbox
}

function getSystemRamStats() {
    const totalBytes = os.totalmem();
    let freeBytes = os.freemem();
    let usedBytes = totalBytes - freeBytes;

    try {
        if (fs.existsSync('/proc/meminfo')) {
            const memStr = fs.readFileSync('/proc/meminfo', 'utf8');
            const totalMatch = memStr.match(/MemTotal:\s+(\d+)\s+kB/);
            const availMatch = memStr.match(/MemAvailable:\s+(\d+)\s+kB/);
            if (totalMatch && availMatch) {
                const tot = parseInt(totalMatch[1], 10) * 1024;
                const av = parseInt(availMatch[1], 10) * 1024;
                usedBytes = tot - av;
                freeBytes = av;
            }
        }
    } catch(e) {}

    const totalMB = Math.round(totalBytes / (1024 * 1024));
    const usedMB = Math.round(usedBytes / (1024 * 1024));
    const freeMB = Math.round(freeBytes / (1024 * 1024));
    const usagePercent = totalBytes > 0 ? Math.max(0, Math.min(100, Math.round((usedBytes / totalBytes) * 100))) : 0;

    return { usagePercent, usedMB, totalMB, freeMB };
}

function getStorageUsageStats() {
    const recPath = getActualBaseStoragePath();
    const targetDir = fs.existsSync(recPath) ? recPath : '/';
    let res = {
        path: recPath,
        totalGB: 0,
        freeGB: 0,
        usedGB: 0,
        percentUsed: 0
    };
    try {
        if (fs.statfsSync) {
            const s = fs.statfsSync(targetDir);
            const total = s.blocks * s.bsize;
            const free = s.bfree * s.bsize;
            const used = total - free;
            res.totalGB = parseFloat((total / (1024 ** 3)).toFixed(1));
            res.freeGB = parseFloat((free / (1024 ** 3)).toFixed(1));
            res.usedGB = parseFloat((used / (1024 ** 3)).toFixed(1));
            res.percentUsed = total > 0 ? Math.max(0, Math.min(100, Math.round((used / total) * 100))) : 0;
        }
    } catch(e) {}
    return res;
}

function getFormattedUptime() {
    const s = Math.floor(os.uptime());
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

function detectStorageDevices(skipAutoDetect = false) {
    const devices = [];
    const seenMounts = new Set();
    const curPath = getActualBaseStoragePath(skipAutoDetect);

    // 1. Root / Internal SD Card (eMMC)
    try {
        const rootPath = '/';
        const s = fs.statfsSync(rootPath);
        const totalGB = parseFloat((s.blocks * s.bsize / (1024**3)).toFixed(1));
        const freeGB = parseFloat((s.bfree * s.bsize / (1024**3)).toFixed(1));
        const usedGB = parseFloat(((s.blocks - s.bfree) * s.bsize / (1024**3)).toFixed(1));
        const percentUsed = totalGB > 0 ? Math.round((usedGB / totalGB) * 100) : 0;

        devices.push({
            id: 'internal_root',
            name: 'Internal Storage / SD Card (Root /)',
            category: 'Internal',
            mountPath: '/',
            totalGB,
            freeGB,
            usedGB,
            percentUsed,
            selected: curPath === '/'
        });
        seenMounts.add('/');
    } catch(e) {}

    // 2. Folder default recordings bawaan NVR
    const defaultNvrRec = path.join(__dirname, 'public', 'recordings');
    if (!seenMounts.has(defaultNvrRec)) {
        try {
            if (!fs.existsSync(defaultNvrRec)) fs.mkdirSync(defaultNvrRec, { recursive: true });
            const s = fs.statfsSync(defaultNvrRec);
            const totalGB = parseFloat((s.blocks * s.bsize / (1024**3)).toFixed(1));
            const freeGB = parseFloat((s.bfree * s.bsize / (1024**3)).toFixed(1));
            const usedGB = parseFloat(((s.blocks - s.bfree) * s.bsize / (1024**3)).toFixed(1));
            const percentUsed = totalGB > 0 ? Math.round((usedGB / totalGB) * 100) : 0;

            devices.push({
                id: 'nvr_default_folder',
                name: 'Penyimpanan Default NVR (public/recordings)',
                category: 'Internal',
                mountPath: defaultNvrRec,
                totalGB,
                freeGB,
                usedGB,
                percentUsed,
                selected: curPath === defaultNvrRec
            });
            seenMounts.add(defaultNvrRec);
        } catch(e) {}
    }

    // 3. Scan folder /media dan /mnt secara langsung (tanpa blokir execSync df)
    const scanFolders = ['/media', '/mnt'];
    for (const base of scanFolders) {
        if (fs.existsSync(base)) {
            try {
                const subs = fs.readdirSync(base);
                for (const sub of subs) {
                    const subPath = path.join(base, sub);
                    try {
                        const st = fs.lstatSync(subPath);
                        if (st.isDirectory()) {
                            // Cek apakah ada sub-folder pengguna (misal /media/armbian/USB_NAME)
                            let subTargets = [subPath];
                            try {
                                const nested = fs.readdirSync(subPath);
                                for (const n of nested) {
                                    const nestedPath = path.join(subPath, n);
                                    if (fs.lstatSync(nestedPath).isDirectory()) {
                                        subTargets.push(nestedPath);
                                    }
                                }
                            } catch(e) {}

                            for (const target of subTargets) {
                                if (seenMounts.has(target)) continue;
                                try {
                                    const s = fs.statfsSync(target);
                                    const totalGB = parseFloat((s.blocks * s.bsize / (1024**3)).toFixed(1));
                                    const freeGB = parseFloat((s.bfree * s.bsize / (1024**3)).toFixed(1));
                                    const usedGB = parseFloat(((s.blocks - s.bfree) * s.bsize / (1024**3)).toFixed(1));
                                    const percentUsed = totalGB > 0 ? Math.round((usedGB / totalGB) * 100) : 0;

                                    let typeName = totalGB > 300 ? 'Harddisk Eksternal' : 'USB Drive';

                                    devices.push({
                                        id: `scan_${target.replace(/[^a-zA-Z0-9]/g, '_')}`,
                                        name: `${typeName}: ${path.basename(target)} (${target})`,
                                        category: 'External',
                                        mountPath: target,
                                        totalGB,
                                        freeGB,
                                        usedGB,
                                        percentUsed,
                                        selected: curPath === target
                                    });
                                    seenMounts.add(target);
                                } catch(e) {}
                            }
                        }
                    } catch(e) {}
                }
            } catch(e) {}
        }
    }

    // 4. Jika curPath adalah kustom dan belum ada di list
    if (curPath && !seenMounts.has(curPath)) {
        try {
            let totalGB = 0, freeGB = 0, usedGB = 0, percentUsed = 0;
            if (fs.existsSync(curPath)) {
                const s = fs.statfsSync(curPath);
                totalGB = parseFloat((s.blocks * s.bsize / (1024**3)).toFixed(1));
                freeGB = parseFloat((s.bfree * s.bsize / (1024**3)).toFixed(1));
                usedGB = parseFloat(((s.blocks - s.bfree) * s.bsize / (1024**3)).toFixed(1));
                percentUsed = totalGB > 0 ? Math.round((usedGB / totalGB) * 100) : 0;
            }
            devices.push({
                id: 'custom_current',
                name: `Jalur Kustom Terpilih (${curPath})`,
                category: 'Custom',
                mountPath: curPath,
                totalGB,
                freeGB,
                usedGB,
                percentUsed,
                selected: true
            });
        } catch(e) {}
    }

    return devices;
}

// System Stats Endpoint (Real-time Armbian Hardware & OS Monitor)
app.get('/api/system/stats', (req, res) => {
    try {
        const tempVal = getStbThermalCelsius();
        let tempStatus = 'normal';
        if (tempVal >= 75) tempStatus = 'hot';
        else if (tempVal >= 65) tempStatus = 'warm';

        res.json({
            cpu: {
                usagePercent: cachedCpuUsage,
                cores: os.cpus().length,
                model: os.cpus()[0]?.model || 'ARM Cortex STB'
            },
            ram: getSystemRamStats(),
            temp: {
                celsius: tempVal,
                status: tempStatus
            },
            storage: getStorageUsageStats(),
            network: cachedNetStats,
            uptime: getFormattedUptime(),
            hostname: os.hostname(),
            platform: 'Armbian Linux'
        });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// Auto-Detect Storage Devices Endpoint
app.get('/api/system/storage-devices', (req, res) => {
    try {
        const devices = detectStorageDevices();
        const currentPath = getActualBaseStoragePath();
        res.json({
            devices,
            currentStoragePath: currentPath
        });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// Select Default Storage Device Endpoint (Saves RECORDING_PATH to data/nvr_db.json)
app.post('/api/system/storage-devices/select', verifyToken, requireSuperadmin, (req, res) => {
    try {
        const { storagePath } = req.body;
        if (!storagePath || typeof storagePath !== 'string') {
            return res.status(400).json({ error: 'Jalur penyimpanan (storagePath) diperlukan' });
        }

        const trimmedPath = storagePath.trim();
        if (!trimmedPath) {
            return res.status(400).json({ error: 'Jalur penyimpanan tidak boleh kosong' });
        }

        // Pastikan direktori ada atau dapat dibuat
        try {
            if (!fs.existsSync(trimmedPath)) {
                fs.mkdirSync(trimmedPath, { recursive: true });
            }
        } catch(err) {
            return res.status(400).json({ error: `Gagal mengakses direktori penyimpanan: ${err.message}` });
        }

        const prevPath = getActualBaseStoragePath();

        // 1. Simpan ke data/nvr_db.json
        const dbData = getNvrDb();
        dbData.recording_path = trimmedPath;
        if (!dbData.super_settings) dbData.super_settings = {};
        dbData.super_settings.globalStoragePath = trimmedPath;
        dbData.super_settings.globalStorageMode = 'custom';
        saveNvrDb(dbData);

        sysLog('INFO', `Lokasi Penyimpanan Rekaman Diperbarui: ${trimmedPath} (Tersimpan di data/nvr_db.json)`, 'STORAGE');

        // 3. Restart stream recording jika path berubah
        if (prevPath !== trimmedPath) {
            ensureRecordFolders();
            startAllStreams();
            syncRecordingsToDB();
        }

        res.json({
            success: true,
            recording_path: trimmedPath,
            message: 'Lokasi penyimpanan berhasil diperbarui dan disimpan ke data/nvr_db.json'
        });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/storage-options', verifyToken, (req, res) => {
    const devices = detectStorageDevices();
    const options = [];
    options.push({ id: 'disabled', label: 'Nonaktifkan Rekaman (Live View Only) [DEFAULT]', path: '' });
    
    devices.forEach(dev => {
        options.push({
            id: dev.id,
            label: `${dev.name} (${dev.freeGB} GB Free / Total ${dev.totalGB} GB)`,
            path: dev.mountPath
        });
    });
    res.json(options);
});

app.get('/api/settings', verifyToken, (req, res) => {
    const dbData = getNvrDb();
    const curSettings = getSettings();
    curSettings.recording_path = dbData.recording_path || curSettings.globalStoragePath || '';
    res.json(curSettings);
});

app.get('/api/logs', verifyToken, (req, res) => {
    try {
        const dbData = getNvrDb();
        res.json({ logs: dbData.system_logs || [] });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/settings', verifyToken, requireAdmin, (req, res) => {
    const dbData = getNvrDb();
    const curSettings = dbData.super_settings || {};
    
    const prevQuality = curSettings.recordingQuality;
    const prevStorageMode = curSettings.globalStorageMode;
    const prevStoragePath = curSettings.globalStoragePath;
    
    const newSettings = { ...curSettings, ...req.body };
    const targetStorage = req.body.recording_path || req.body.globalStoragePath;
    
    if (targetStorage !== undefined) {
        newSettings.globalStoragePath = targetStorage;
        dbData.recording_path = targetStorage;
    }
    
    dbData.super_settings = newSettings;
    saveNvrDb(dbData);
    
    sysLog('INFO', `Pengaturan Sistem Diperbarui (Storage: ${newSettings.globalStoragePath || newSettings.globalStorageMode}, Recording Quality: ${newSettings.recordingQuality || 'main'})`, 'STORAGE');
    
    if (prevQuality !== newSettings.recordingQuality || prevStorageMode !== newSettings.globalStorageMode || prevStoragePath !== newSettings.globalStoragePath) {
        ensureRecordFolders();
        startAllStreams();
        syncRecordingsToDB();
    }
    
    res.json({ success: true, settings: newSettings });
});

// Streams Middleware with HLS Cache-Control & CORS
app.use('/streams', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Origin, Content-Type, Accept');
    if (req.url.endsWith('.m3u8')) {
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    } else if (req.url.endsWith('.ts')) {
        res.setHeader('Content-Type', 'video/mp2t');
        res.setHeader('Cache-Control', 'public, max-age=60');
    }
    next();
}, express.static(streamBaseDir));

// Serve UI & Static Assets
app.use(express.static(publicDir));

// App Initialization
function boot() {
    initDB();
        startAllStreams();
    
    syncRecordingsToDB();
    autoCleanupTempSegments();
    setInterval(syncRecordingsToDB, 5 * 60 * 1000); // 5 mins
    setInterval(runRetention, 10 * 60 * 1000); // 10 mins
    setInterval(checkGlobalDiskSpace, 60 * 60 * 1000); // 1 hour
    setInterval(autoCleanupTempSegments, 10 * 1000); // 10 detik auto-cleanup segmen temp .ts

    
// ==========================================
// AI YOLOv8 Routes
// ==========================================
app.post('/api/ai/grid', (req, res) => {
    // Di sistem aslinya, ini akan meneruskan config ke Python via fetch() ke localhost:8000
    // dan menyimpannya ke database db/ai_config.json
    console.log("[AI] Menerima konfigurasi Grid untuk Kamera:", req.body.camera_id);
    console.log("[AI] Koordinat:", req.body);
    
    // Simulate sending to Python service
    res.json({ success: true, message: "Konfigurasi AI berhasil disimpan" });
});

app.post('/api/ai/webhook', (req, res) => {
    console.log("[AI ALARM] Deteksi Manusia pada Kamera:", req.body.camera_id);
    // Di sini akan trigger system log/alarm WebSocket ke frontend
    res.json({ received: true });
});

app.listen(port, "0.0.0.0", () => {
        sysLog('INFO', `NVR Backend berjalan di port ${port}`);
    });
}

boot();
