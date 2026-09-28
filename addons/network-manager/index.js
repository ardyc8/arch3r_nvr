import express from 'express';
import { ArmbianNetworkManager } from './lib/nmcli_driver.js';

const router = express.Router();
const nmDriver = new ArmbianNetworkManager({ timeoutMs: 6000, useSudo: false });

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

// 2. Setup interface route metrics (LAN 50 / Wi-Fi 500)
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

// 3. Add static route for generic IP device or CIDR subnet block
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

// 4. Delete static route for generic IP device or CIDR subnet block
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

// 5. Apply network changes (restart nmcli connections)
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

// 6. Get active system kernel routes
router.get('/routes/system', async (req, res) => {
    try {
        const result = await nmDriver.getSystemRoutes();
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 7. Enable Arch3r Bridge (Bypass ISP Router Isolation)
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

// 8. Disable Arch3r Bridge (Tear down br0 & restore LAN/Wi-Fi)
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

// 9. Get Arch3r Bridge Status
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
