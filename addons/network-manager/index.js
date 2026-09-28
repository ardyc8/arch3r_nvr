import express from 'express';
import { ArmbianNetworkManager } from './lib/nmcli_driver.js';

const router = express.Router();
const nmDriver = new ArmbianNetworkManager({ timeoutMs: 8000, useSudo: false });

// Auto-purge any dangling br0 bridge profiles and ensure interfaces are managed on startup
nmDriver.ensureSafeStateAndPurgeDanglingBridges().catch(() => {});

/**
 * REST API Routes for Network Manager Addon
 */

// 1. Get active network interfaces & connections
router.get('/connections', async (req, res) => {
    try {
        const data = await nmDriver.getConnections();
        res.json(data);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 1b. Delete a specific connection profile (e.g. ghost / duplicate connection)
router.delete('/connections/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await nmDriver.deleteConnection(id);
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 1c. Purge all inactive, duplicate, or dangling ghost connection profiles
router.post('/purge-inactive', async (req, res) => {
    try {
        const result = await nmDriver.purgeInactiveProfiles();
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 1d. Restore and activate physical Ethernet LAN interface (e.g. eth0)
router.post('/lan/restore', async (req, res) => {
    try {
        const { device } = req.body;
        const result = await nmDriver.restoreAndActivateLan(device || 'eth0');
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 2. Scan surrounding Wi-Fi networks (SSID, Signal %, Security)
router.get('/wifi/scan', async (req, res) => {
    try {
        const data = await nmDriver.scanWifiNetworks();
        res.json(data);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 3. Connect to a Wi-Fi network from Web UI
router.post('/wifi/connect', async (req, res) => {
    try {
        const { ssid, password, bssid } = req.body;
        if (!ssid) {
            return res.status(400).json({ success: false, error: 'SSID Wi-Fi wajib diisi.' });
        }
        const result = await nmDriver.connectWifiNetwork(ssid, password, bssid);
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 4. Setup interface route metrics (LAN 50 / Wi-Fi 500)
router.post('/metrics', async (req, res) => {
    try {
        const { lanName, wifiName } = req.body;
        const result = await nmDriver.setupMetrics(lanName, wifiName);
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 5. Add static route for generic IP device or CIDR subnet block
router.post('/routes', async (req, res) => {
    try {
        const { connectionName, target, cameraIp, isWireless, type, interfaceType } = req.body;
        const routeTarget = target || cameraIp;
        const routeType = type || interfaceType || 'generic';
        const wirelessFlag = (typeof isWireless === 'boolean') ? isWireless : (interfaceType === 'wifi' || type === 'wifi');

        if (!routeTarget) {
            return res.status(400).json({ success: false, error: 'target (IP/Subnet) wajib diisi' });
        }

        const result = await nmDriver.addRoute(routeTarget, wirelessFlag, connectionName, routeType);
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 6. Delete static route for generic IP device or CIDR subnet block
router.delete('/routes', async (req, res) => {
    try {
        const { connectionName, target, cameraIp, isWireless, interfaceType, type } = req.body;
        const routeTarget = target || cameraIp;
        const wirelessFlag = (typeof isWireless === 'boolean') ? isWireless : (interfaceType === 'wifi' || type === 'wifi');

        if (!routeTarget) {
            return res.status(400).json({ success: false, error: 'target (IP/Subnet) wajib diisi' });
        }

        const result = await nmDriver.deleteRoute(routeTarget, wirelessFlag, connectionName);
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 7. Apply network changes (restart nmcli connections)
router.post('/apply', async (req, res) => {
    try {
        const { lanName, wifiName } = req.body;
        const result = await nmDriver.applyChanges(lanName, wifiName);
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 8. Get active system kernel routes
router.get('/routes/system', async (req, res) => {
    try {
        const result = await nmDriver.getSystemRoutes();
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 9. Enable Arch3r Bridge (Bypass ISP Router Isolation)
router.post('/bridge/enable', async (req, res) => {
    try {
        const result = await nmDriver.enableArch3rBridge();
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 10. Disable Arch3r Bridge (Tear down br0 & restore LAN/Wi-Fi)
router.post('/bridge/disable', async (req, res) => {
    try {
        const result = await nmDriver.disableArch3rBridge();
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 11. Get Arch3r Bridge Status
router.get('/bridge/status', async (req, res) => {
    try {
        const result = await nmDriver.getArch3rBridgeStatus();
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;
export { nmDriver };
