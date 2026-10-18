import express from 'express';
import piholeDriver from './lib/pihole_driver.js';

const router = express.Router();

// 1. Get Pi-hole Status, Telemetry & Diagnostics
router.get('/status', async (req, res) => {
    try {
        const result = await piholeDriver.getStatus();
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 2. Update Configuration (Custom Port 8585, Host, API Token)
router.post('/config', async (req, res) => {
    try {
        const { port, host, apiToken, webPath, autoListenAll } = req.body;
        const toUpdate = {};
        if (port) toUpdate.port = parseInt(port, 10);
        if (host) toUpdate.host = host.trim();
        if (apiToken !== undefined) toUpdate.apiToken = apiToken.trim();
        if (webPath) toUpdate.webPath = webPath.trim();
        if (autoListenAll !== undefined) toUpdate.autoListenAll = !!autoListenAll;

        const result = piholeDriver.saveConfig(toUpdate);
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json({ success: true, message: 'Konfigurasi Pi-hole berhasil disimpan', config: result.config });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 3. Control Blocking (Enable / Disable / Pause Duration)
router.post('/action', async (req, res) => {
    try {
        const { action, duration } = req.body;
        if (!action || !['enable', 'disable'].includes(action)) {
            return res.status(400).json({ success: false, error: 'Parameter action harus "enable" atau "disable"' });
        }
        const result = await piholeDriver.controlBlocking(action, duration);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 4. Bypass Router Isolation (Listen All Interfaces / Permit All Origins)
router.post('/bypass-isolation', async (req, res) => {
    try {
        const result = await piholeDriver.configureListenAllInterfaces();
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 5. Automated Native Installer for Fresh STB (Non-Docker)
router.post('/install', async (req, res) => {
    try {
        const { port, password } = req.body;
        const result = await piholeDriver.installNativePihole({ port, password });
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 6. Restart Pi-hole Service Native (pihole-FTL & lighttpd)
router.post('/restart', async (req, res) => {
    try {
        const resFtl = await piholeDriver.runCommand('sudo systemctl restart pihole-FTL 2>/dev/null || sudo pihole restartdns 2>/dev/null || true');
        const resWeb = await piholeDriver.runCommand('sudo systemctl restart lighttpd 2>/dev/null || true');
        res.json({
            success: true,
            message: 'Layanan Pi-hole Native (pihole-FTL & lighttpd) telah direstart.',
            ftlResult: resFtl.stdout || resFtl.stderr,
            webResult: resWeb.stdout || resWeb.stderr
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;
export { piholeDriver };

