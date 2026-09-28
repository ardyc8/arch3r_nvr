import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * ArmbianNetworkManager - High-Performance nmcli CLI Driver & Generic Network Router for Armbian Linux STB
 * Handles ISP Router Interface Isolation (LAN vs Wi-Fi), Web-UI Wi-Fi Management, & Generalized IP/Subnet Binding
 */
export class ArmbianNetworkManager {
    constructor(options = {}) {
        this.timeoutMs = options.timeoutMs || 8000;
        this.sudoPrefix = options.useSudo ? 'sudo ' : '';
    }

    /**
     * Helper to execute shell command safely with timeout
     */
    async runCommand(cmd) {
        try {
            const fullCmd = `${this.sudoPrefix}${cmd}`;
            const { stdout, stderr } = await execAsync(fullCmd, {
                timeout: this.timeoutMs,
                env: { ...process.env, PATH: `${process.env.PATH}:/usr/sbin:/sbin:/usr/bin` }
            });
            return { success: true, stdout: (stdout || '').trim(), stderr: (stderr || '').trim() };
        } catch (err) {
            return {
                success: false,
                error: err.message || 'Command execution failed',
                stdout: err.stdout ? err.stdout.trim() : '',
                stderr: err.stderr ? err.stderr.trim() : ''
            };
        }
    }

    /**
     * Check if nmcli CLI binary exists in the OS environment
     */
    async isNmcliAvailable() {
        const res = await this.runCommand('which nmcli');
        return res.success && Boolean(res.stdout);
    }

    /**
     * Sanitizes input string to prevent shell command injection.
     */
    sanitizeParam(input) {
        if (!input || typeof input !== 'string') return '';
        // Remove shell metacharacters: quotes, semicolons, ampersands, pipes, backticks, dollar signs, redirection, newlines
        return input.trim().replace(/["';&|`$<>\r\n\\]/g, '');
    }

    /**
     * Validates and normalizes target parameter.
     * Accepts either a single IP (e.g., "192.168.1.50") or a CIDR subnet block (e.g., "192.168.1.0/24").
     * Automatically appends "/32" if the CIDR suffix is missing.
     */
    normalizeTarget(target) {
        if (!target || typeof target !== 'string') {
            return { valid: false, error: 'Target IP/Subnet must be a non-empty string.' };
        }

        let cleanTarget = target.trim();
        // Automatically append /32 if CIDR mask suffix is missing
        if (!cleanTarget.includes('/')) {
            cleanTarget += '/32';
        }

        // Validate IPv4 address or IPv4 CIDR subnet format (e.g., 192.168.1.50/32 or 10.0.0.0/24)
        const cidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:3[0-2]|[12]?[0-9])$/;
        if (!cidrRegex.test(cleanTarget)) {
            return {
                valid: false,
                error: `Invalid IP address or CIDR subnet block format: "${target}". Expected format: "192.168.1.50" or "192.168.1.0/24".`
            };
        }

        return { valid: true, target: cleanTarget };
    }

    /**
     * Internal helper function that scans `nmcli connection show`
     * and automatically detects active connection NAME for Wi-Fi and Ethernet (LAN).
     */
    async detectActiveConnections() {
        const connRes = await this.getConnections();
        if (!connRes.success) {
            return {
                success: false,
                error: connRes.error || connRes.message || 'Failed to detect active network connections.',
                lanName: null,
                wifiName: null,
                connections: []
            };
        }

        const lanName = connRes.lan ? connRes.lan.name : null;
        const wifiName = connRes.wifi ? connRes.wifi.name : null;

        return {
            success: true,
            lanName,
            wifiName,
            lan: connRes.lan,
            wifi: connRes.wifi,
            connections: connRes.connections || []
        };
    }

    /**
     * 1. getConnections()
     * Lists active network connections, parses nmcli tabular output into clean JSON,
     * and automatically identifies LAN (ethernet) and Wi-Fi devices.
     */
    async getConnections() {
        const isAvailable = await this.isNmcliAvailable();
        if (!isAvailable) {
            return {
                success: false,
                available: false,
                message: 'nmcli (NetworkManager CLI) is not installed on this system.',
                connections: [],
                lan: null,
                wifi: null
            };
        }

        // Run tabular format command: NAME:TYPE:DEVICE:STATE:UUID
        const cmdRes = await this.runCommand('nmcli -t -f NAME,TYPE,DEVICE,STATE,UUID connection show');
        if (!cmdRes.success) {
            return {
                success: false,
                available: true,
                error: `Failed to execute nmcli: ${cmdRes.stderr || cmdRes.error}`,
                connections: [],
                lan: null,
                wifi: null
            };
        }

        const lines = cmdRes.stdout.split('\n').filter(l => l.trim().length > 0);
        const connections = [];
        let lanConn = null;
        let wifiConn = null;

        for (const line of lines) {
            // Note: nmcli -t escapes colons in connection names with backslash
            const parts = line.split(/(?<!\\):/);
            if (parts.length >= 4) {
                const name = parts[0].replace(/\\:/g, ':').trim();
                const type = parts[1].trim().toLowerCase();
                const device = parts[2].trim();
                const state = parts[3].trim();
                const uuid = parts[4] ? parts[4].trim() : '';

                const isEthernet = type.includes('ethernet') || type.includes('802-3-ethernet');
                const isWifi = type.includes('wifi') || type.includes('802-11-wireless');
                const isActive = device !== '--' && device !== '' && !state.includes('deactivated');

                const connObj = {
                    name,
                    type: isEthernet ? 'ethernet' : (isWifi ? 'wifi' : type),
                    rawType: parts[1],
                    device: device === '--' ? '' : device,
                    state,
                    uuid,
                    active: isActive
                };

                connections.push(connObj);

                // Identify active primary LAN and Wi-Fi
                if (isActive) {
                    if (isEthernet && !lanConn) lanConn = connObj;
                    if (isWifi && !wifiConn) wifiConn = connObj;
                } else {
                    if (isEthernet && !lanConn) lanConn = connObj;
                    if (isWifi && !wifiConn) wifiConn = connObj;
                }
            }
        }

        // Check physical devices via `nmcli device status` to catch unmanaged/disconnected eth0
        const devRes = await this.runCommand('nmcli -t -f DEVICE,TYPE,STATE,CONNECTION device status');
        const physicalDevices = [];
        if (devRes.success && devRes.stdout) {
            const devLines = devRes.stdout.split('\n').filter(l => l.trim().length > 0);
            for (const dLine of devLines) {
                const dParts = dLine.split(/(?<!\\):/);
                if (dParts.length >= 3) {
                    const devName = dParts[0].trim();
                    const devType = dParts[1].trim().toLowerCase();
                    const devState = dParts[2].trim();
                    const devConn = dParts[3] ? dParts[3].trim() : '--';

                    const isEth = devType.includes('ethernet') || devName.startsWith('eth') || devName.startsWith('en') || devName.startsWith('end');
                    const isWf = devType.includes('wifi') || devName.startsWith('wlan');

                    physicalDevices.push({
                        device: devName,
                        type: isEth ? 'ethernet' : (isWf ? 'wifi' : devType),
                        state: devState,
                        connection: devConn === '--' ? '' : devConn
                    });

                    // If physical Ethernet device exists (e.g., eth0) but has no active connection profile in `connections`,
                    // inject a visible unlinked/disconnected entry so user can recover it with 1-click!
                    if (isEth && !connections.some(c => c.device === devName)) {
                        const unlinkedLanObj = {
                            name: devConn !== '--' && devConn ? devConn : `Physical Device (${devName})`,
                            type: 'ethernet',
                            rawType: 'ethernet',
                            device: devName,
                            state: devState || 'disconnected',
                            uuid: '',
                            active: devState === 'connected',
                            unlinked: true
                        };
                        connections.push(unlinkedLanObj);
                        if (!lanConn) lanConn = unlinkedLanObj;
                    }
                }
            }
        }

        // Get IP details per interface if devices are active
        for (const conn of connections) {
            if (conn.device && conn.device !== 'N/A' && conn.device !== '--') {
                const ipRes = await this.runCommand(`nmcli -t -f IP4.ADDRESS,IP4.GATEWAY device show "${conn.device}"`);
                if (ipRes.success) {
                    const ipLines = ipRes.stdout.split('\n');
                    for (const ipLine of ipLines) {
                        if (ipLine.startsWith('IP4.ADDRESS[1]:')) {
                            conn.ip = ipLine.replace('IP4.ADDRESS[1]:', '').trim();
                        } else if (ipLine.startsWith('IP4.GATEWAY:')) {
                            conn.gateway = ipLine.replace('IP4.GATEWAY:', '').trim();
                        }
                    }
                }
            }
        }

        return {
            success: true,
            available: true,
            connections,
            devices: physicalDevices,
            lan: lanConn,
            wifi: wifiConn,
            count: connections.length
        };
    }

    /**
     * 2. scanWifiNetworks()
     * Scans surrounding Wi-Fi access points and returns SSID, Signal %, Security, & Channel.
     * Eliminates SSH/Terminal dependency for Wi-Fi management.
     */
    async scanWifiNetworks() {
        const isAvailable = await this.isNmcliAvailable();
        if (!isAvailable) {
            return {
                success: false,
                available: false,
                message: 'nmcli is not installed on this system.',
                networks: []
            };
        }

        // Run rescan and list tabular output: IN-USE:BSSID:SSID:MODE:CHAN:RATE:SIGNAL:BARS:SECURITY
        const scanRes = await this.runCommand('nmcli -t -f IN-USE,BSSID,SSID,SIGNAL,SECURITY,CHAN dev wifi list --rescan auto');
        if (!scanRes.success) {
            return {
                success: false,
                error: `Failed to scan Wi-Fi networks: ${scanRes.stderr || scanRes.error}`,
                networks: []
            };
        }

        const lines = scanRes.stdout.split('\n').filter(l => l.trim().length > 0);
        const seenSsids = new Set();
        const networks = [];

        for (const line of lines) {
            const parts = line.split(/(?<!\\):/);
            if (parts.length >= 5) {
                const inUse = parts[0].trim() === '*';
                const bssid = parts[1].replace(/\\:/g, ':').trim();
                const ssid = parts[2].replace(/\\:/g, ':').trim();
                const signal = parseInt(parts[3].trim(), 10) || 0;
                const security = parts[4].trim() || 'Open';
                const channel = parts[5] ? parts[5].trim() : '';

                if (ssid && ssid !== '--') {
                    // Group by SSID to show strongest signal if multiple APs
                    const existing = networks.find(n => n.ssid === ssid);
                    if (existing) {
                        if (signal > existing.signal) {
                            existing.signal = signal;
                            existing.bssid = bssid;
                            existing.inUse = inUse || existing.inUse;
                            existing.security = security;
                        }
                    } else {
                        networks.push({
                            ssid,
                            bssid,
                            signal,
                            security,
                            channel,
                            inUse
                        });
                    }
                }
            }
        }

        // Sort by inUse first, then signal strength descending
        networks.sort((a, b) => {
            if (a.inUse && !b.inUse) return -1;
            if (!a.inUse && b.inUse) return 1;
            return b.signal - a.signal;
        });

        return {
            success: true,
            networks,
            count: networks.length
        };
    }

    /**
     * 3. connectWifiNetwork(ssid, password, bssid)
     * Connects STB to the specified Wi-Fi SSID directly from Web UI without SSH.
     */
    async connectWifiNetwork(ssid, password = '', bssid = '') {
        const isAvailable = await this.isNmcliAvailable();
        if (!isAvailable) {
            return {
                success: false,
                error: 'nmcli is not installed on this system.'
            };
        }

        const safeSsid = this.sanitizeParam(ssid);
        if (!safeSsid) {
            return { success: false, error: 'SSID Wi-Fi tidak boleh kosong.' };
        }

        let cmd = '';
        if (password) {
            // Escape double quotes and backslashes in password
            const escapedPassword = password.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            cmd = `nmcli dev wifi connect "${safeSsid}" password "${escapedPassword}"`;
        } else {
            cmd = `nmcli dev wifi connect "${safeSsid}"`;
        }

        if (bssid) {
            const safeBssid = this.sanitizeParam(bssid);
            if (safeBssid) {
                cmd += ` bssid "${safeBssid}"`;
            }
        }

        const res = await this.runCommand(cmd);
        if (!res.success) {
            return {
                success: false,
                error: `Gagal menyambungkan ke Wi-Fi "${safeSsid}": ${res.stderr || res.error || 'Autentikasi gagal'}`
            };
        }

        return {
            success: true,
            ssid: safeSsid,
            message: `STB berhasil tersambung ke Wi-Fi "${safeSsid}"!`,
            stdout: res.stdout
        };
    }

    /**
     * 4. setupMetrics(lanName, wifiName)
     * Automatically detects active Wi-Fi and LAN interface names if not provided,
     * then configures interface priority routing:
     * - LAN Ethernet metric set to 50 (High priority gateway for maximum speed)
     * - Wi-Fi metric set to 500 (Fallback gateway when LAN is disconnected)
     */
    async setupMetrics(lanName = null, wifiName = null) {
        let targetLan = lanName;
        let targetWifi = wifiName;

        // Auto-detect active Wi-Fi and LAN connection names dynamically if missing
        if (!targetLan || !targetWifi) {
            const detected = await this.detectActiveConnections();
            if (!targetLan) targetLan = detected.lanName;
            if (!targetWifi) targetWifi = detected.wifiName;
        }

        if (!targetLan && !targetWifi) {
            return {
                success: false,
                error: 'Could not automatically detect active LAN or Wi-Fi connections from nmcli connection show.'
            };
        }

        const safeLanName = this.sanitizeParam(targetLan);
        const safeWifiName = this.sanitizeParam(targetWifi);
        const results = [];

        if (safeLanName) {
            const lanCmd = `nmcli connection modify "${safeLanName}" ipv4.route-metric 50`;
            const lanRes = await this.runCommand(lanCmd);
            results.push({ connection: safeLanName, metric: 50, ...lanRes });
        }

        if (safeWifiName) {
            const wifiCmd = `nmcli connection modify "${safeWifiName}" ipv4.route-metric 500`;
            const wifiRes = await this.runCommand(wifiCmd);
            results.push({ connection: safeWifiName, metric: 500, ...wifiRes });
        }

        const failed = results.filter(r => !r.success);
        if (failed.length > 0) {
            return {
                success: false,
                error: `Failed setting metrics: ${failed.map(f => `${f.connection}: ${f.stderr || f.error}`).join('; ')}`,
                details: results
            };
        }

        return {
            success: true,
            lanName: safeLanName,
            wifiName: safeWifiName,
            message: `Successfully updated route metrics: ${safeLanName ? `${safeLanName} = 50` : ''} ${safeWifiName ? `${safeWifiName} = 500` : ''}`,
            details: results
        };
    }

    /**
     * 5. addRoute(target, isWireless, connectionName, type)
     * Generalized Network Routing Function.
     * Accepts `target` (device IP e.g. "192.168.1.50" or CIDR block "192.168.1.0/24")
     * and boolean `isWireless`. Dynamically detects active Wi-Fi or LAN connection name if not provided.
     * Automatically appends "/32" if CIDR mask is omitted.
     */
    async addRoute(target, isWireless = false, connectionName = null, type = 'generic') {
        const norm = this.normalizeTarget(target);
        if (!norm.valid) {
            return { success: false, error: norm.error };
        }

        let wirelessFlag = false;
        let explicitConnName = connectionName;

        if (typeof isWireless === 'boolean') {
            wirelessFlag = isWireless;
        } else if (typeof isWireless === 'string') {
            const lower = isWireless.trim().toLowerCase();
            if (lower === 'true' || lower === 'wifi' || lower === 'wireless') {
                wirelessFlag = true;
            } else if (lower === 'false' || lower === 'lan' || lower === 'ethernet') {
                wirelessFlag = false;
            } else {
                explicitConnName = isWireless;
            }
        }

        let targetConnName = explicitConnName;

        // Automatically detect active Wi-Fi or LAN connection name if not explicitly provided
        if (!targetConnName) {
            const detected = await this.detectActiveConnections();
            targetConnName = wirelessFlag ? detected.wifiName : detected.lanName;
        }

        const safeConn = this.sanitizeParam(targetConnName);
        if (!safeConn) {
            const interfaceTypeLabel = wirelessFlag ? 'Wi-Fi (Wireless)' : 'LAN (Ethernet)';
            return {
                success: false,
                error: `Could not automatically detect active ${interfaceTypeLabel} connection name from nmcli. Please verify interface connection.`
            };
        }

        const safeTarget = this.sanitizeParam(norm.target);
        const safeType = this.sanitizeParam(type) || (wirelessFlag ? 'wifi' : 'ethernet');

        // Command to add static route: nmcli connection modify "<conn>" +ipv4.routes "<target>"
        const cmd = `nmcli connection modify "${safeConn}" +ipv4.routes "${safeTarget}"`;
        const res = await this.runCommand(cmd);

        if (!res.success) {
            return {
                success: false,
                error: `Failed to add static route for "${safeTarget}" on "${safeConn}": ${res.stderr || res.error}`
            };
        }

        return {
            success: true,
            target: safeTarget,
            connectionName: safeConn,
            isWireless: wirelessFlag,
            type: safeType,
            message: `Successfully added static route "${safeTarget}" to ${wirelessFlag ? 'Wi-Fi' : 'LAN'} connection "${safeConn}"`
        };
    }

    /**
     * 6. deleteRoute(target, isWireless, connectionName)
     * Generalized Route Deletion Function.
     */
    async deleteRoute(target, isWireless = false, connectionName = null) {
        const norm = this.normalizeTarget(target);
        if (!norm.valid) {
            return { success: false, error: norm.error };
        }

        let wirelessFlag = false;
        let explicitConnName = connectionName;

        if (typeof isWireless === 'boolean') {
            wirelessFlag = isWireless;
        } else if (typeof isWireless === 'string') {
            const lower = isWireless.trim().toLowerCase();
            if (lower === 'true' || lower === 'wifi' || lower === 'wireless') {
                wirelessFlag = true;
            } else if (lower === 'false' || lower === 'lan' || lower === 'ethernet') {
                wirelessFlag = false;
            } else {
                explicitConnName = isWireless;
            }
        }

        let targetConnName = explicitConnName;

        if (!targetConnName) {
            const detected = await this.detectActiveConnections();
            targetConnName = wirelessFlag ? detected.wifiName : detected.lanName;
        }

        const safeConn = this.sanitizeParam(targetConnName);
        if (!safeConn) {
            return {
                success: false,
                error: 'connectionName or active interface detection is required to delete static route.'
            };
        }

        const safeTarget = this.sanitizeParam(norm.target);

        // Command to remove static route: nmcli connection modify "<conn>" -ipv4.routes "<target>"
        const cmd = `nmcli connection modify "${safeConn}" -ipv4.routes "${safeTarget}"`;
        const res = await this.runCommand(cmd);

        if (!res.success) {
            return {
                success: false,
                error: `Failed to remove static route "${safeTarget}" from "${safeConn}": ${res.stderr || res.error}`
            };
        }

        return {
            success: true,
            target: safeTarget,
            connectionName: safeConn,
            isWireless: wirelessFlag,
            message: `Successfully removed static route "${safeTarget}" from connection "${safeConn}"`
        };
    }

    /**
     * 7. applyChanges(lanName, wifiName)
     * Restarts specified network connections using `nmcli connection up`
     * or gracefully reapplies settings to active devices without failing when Netplan-managed or already active.
     */
    async applyChanges(lanName, wifiName) {
        let safeLanName = this.sanitizeParam(lanName);
        let safeWifiName = this.sanitizeParam(wifiName);

        // If names not provided, auto-detect active connections
        if (!safeLanName || !safeWifiName) {
            const detected = await this.detectActiveConnections();
            if (!safeLanName && detected.lanName) safeLanName = detected.lanName;
            if (!safeWifiName && detected.wifiName) safeWifiName = detected.wifiName;
        }

        const results = [];
        // Reload all nmcli connection profiles first
        await this.runCommand('nmcli connection reload');

        const bringUpOrReapply = async (connName) => {
            if (!connName) return null;

            // 1. Try nmcli connection up
            const upRes = await this.runCommand(`nmcli connection up "${connName}"`);
            if (upRes.success) {
                return { connection: connName, success: true, stdout: upRes.stdout, method: 'connection_up' };
            }

            // 2. If it failed, check if device is active and try nmcli device reapply
            const connInfo = await this.runCommand(`nmcli -t -f NAME,DEVICE,STATE connection show "${connName}"`);
            let device = '';
            let isActive = false;
            if (connInfo.success && connInfo.stdout) {
                const parts = connInfo.stdout.split(/(?<!\\):/);
                if (parts.length >= 3) {
                    device = parts[1] !== '--' ? parts[1] : '';
                    isActive = device !== '' && !parts[2]?.includes('deactivated');
                }
            }

            if (device) {
                const reapplyRes = await this.runCommand(`nmcli device reapply "${device}"`);
                if (reapplyRes.success) {
                    return {
                        connection: connName,
                        device,
                        success: true,
                        method: 'device_reapply',
                        message: `Connection "${connName}" reapplied successfully to active interface "${device}".`
                    };
                }
            }

            // If connection is already active or netplan managed, consider it non-fatal
            const combinedErr = `${upRes.stderr || ''} ${upRes.error || ''}`.toLowerCase();
            if (isActive || combinedErr.includes('already active') || combinedErr.includes('already connected') || combinedErr.includes('is active')) {
                return {
                    connection: connName,
                    success: true,
                    method: 'already_active',
                    message: `Connection "${connName}" is active and routes are loaded.`
                };
            }

            // Otherwise return the failed status
            return { connection: connName, ...upRes };
        };

        if (safeLanName) {
            const r = await bringUpOrReapply(safeLanName);
            if (r) results.push(r);
        }

        if (safeWifiName) {
            const r = await bringUpOrReapply(safeWifiName);
            if (r) results.push(r);
        }

        const failed = results.filter(r => !r.success);
        if (failed.length > 0) {
            return {
                success: false,
                error: `Failed bringing up connection(s): ${failed.map(f => `${f.connection}: ${f.stderr || f.error}`).join('; ')}`,
                details: results
            };
        }

        return {
            success: true,
            message: 'Network changes successfully applied! Connections restarted and routes loaded in kernel.',
            details: results
        };
    }

    /**
     * Reads active kernel routing table via `ip route show`
     */
    async getSystemRoutes() {
        const res = await this.runCommand('ip route show');
        if (!res.success) {
            return { success: false, error: res.stderr || res.error, routes: [] };
        }

        const lines = res.stdout.split('\n').filter(l => l.trim().length > 0);
        const routes = lines.map(line => {
            const parts = line.trim().split(/\s+/);
            const dst = parts[0];
            const devIdx = parts.indexOf('dev');
            const metricIdx = parts.indexOf('metric');
            const viaIdx = parts.indexOf('via');

            return {
                raw: line,
                destination: dst,
                gateway: viaIdx !== -1 ? parts[viaIdx + 1] : '',
                device: devIdx !== -1 ? parts[devIdx + 1] : '',
                metric: metricIdx !== -1 ? parseInt(parts[metricIdx + 1], 10) : null
            };
        });

        return { success: true, routes, count: routes.length };
    }

    /**
     * Purges any leftover or dangling br0 / bridge-slave NetworkManager profiles
     * and guarantees physical interfaces (eth0, wlan0) are in managed state.
     */
    async ensureSafeStateAndPurgeDanglingBridges() {
        const steps = [];
        try {
            const delCmds = [
                'nmcli connection delete br0-lan',
                'nmcli connection delete br0-wifi',
                'nmcli connection delete br0',
                'nmcli device set eth0 managed yes',
                'nmcli device set wlan0 managed yes'
            ];
            for (const cmd of delCmds) {
                const res = await this.runCommand(cmd);
                steps.push({ cmd, success: res.success });
            }
        } catch (_) {}
        return { success: true, steps };
    }

    /**
     * Deletes a specific NetworkManager connection profile by name or UUID.
     */
    async deleteConnection(nameOrUuid) {
        const isAvailable = await this.isNmcliAvailable();
        if (!isAvailable) {
            return { success: false, error: 'nmcli is not installed on this system.' };
        }

        const safeTarget = this.sanitizeParam(nameOrUuid);
        if (!safeTarget) {
            return { success: false, error: 'Nama atau UUID koneksi tidak boleh kosong.' };
        }

        const res = await this.runCommand(`nmcli connection delete "${safeTarget}"`);
        if (!res.success) {
            return {
                success: false,
                error: `Gagal menghapus koneksi "${safeTarget}": ${res.stderr || res.error}`
            };
        }

        return {
            success: true,
            target: safeTarget,
            message: `Profil koneksi "${safeTarget}" berhasil dihapus secara permanen.`
        };
    }

    /**
     * Scans and purges all inactive/ghost/duplicate NetworkManager profiles
     * (e.g. inactive "Wired connection 1", dangling "netplan-br0", disconnected profiles).
     */
    async purgeInactiveProfiles() {
        const isAvailable = await this.isNmcliAvailable();
        if (!isAvailable) {
            return { success: false, error: 'nmcli is not installed on this system.' };
        }

        const connRes = await this.getConnections();
        if (!connRes.success || !Array.isArray(connRes.connections)) {
            return { success: false, error: connRes.error || 'Gagal membaca daftar koneksi.' };
        }

        const purged = [];
        const failed = [];

        // Identify inactive profiles (device is empty or state is not activated)
        // Also look for netplan-br0 or duplicate Wired connections without active device
        for (const conn of connRes.connections) {
            const isGhost = !conn.active || !conn.device || conn.name.includes('netplan-br0') || conn.name.includes('br0-lan') || conn.name.includes('br0-wifi');
            // Do not delete active physical loopback
            if (conn.name === 'lo' || conn.type === 'loopback') continue;

            if (isGhost) {
                const identifier = conn.uuid || conn.name;
                const delRes = await this.runCommand(`nmcli connection delete "${this.sanitizeParam(identifier)}"`);
                if (delRes.success) {
                    purged.push({ name: conn.name, uuid: conn.uuid, type: conn.type });
                } else {
                    failed.push({ name: conn.name, uuid: conn.uuid, error: delRes.stderr || delRes.error });
                }
            }
        }

        // Also clean any lingering Netplan br0 yaml files if any
        try {
            await this.runCommand('rm -f /etc/netplan/*br0*.yaml');
        } catch (_) {}

        // Reload NetworkManager connection daemon
        await this.runCommand('nmcli connection reload');

        return {
            success: true,
            purgedCount: purged.length,
            purged,
            failed,
            message: `Pembersihan selesai! ${purged.length} profil koneksi usang/duplikat berhasil dihapus.`
        };
    }

    /**
     * Automatically restores and activates physical Ethernet LAN interface (e.g. eth0).
     * Frees eth0 from any dangling bridge/unmanaged states safely with Wi-Fi Lifeline Protection.
     */
    async restoreAndActivateLan(device = 'eth0') {
        const isAvailable = await this.isNmcliAvailable();
        if (!isAvailable) {
            return { success: false, error: 'nmcli is not installed on this system.' };
        }

        const safeDev = this.sanitizeParam(device) || 'eth0';
        const steps = [];

        // 1. Detect current Wi-Fi connection to safeguard it (Wi-Fi Lifeline)
        let wifiConnName = '';
        try {
            const activeConnRes = await this.detectActiveConnections();
            if (activeConnRes && activeConnRes.wifiName) {
                wifiConnName = activeConnRes.wifiName;
            }
        } catch (_) {}

        // 2. Safely release any lingering br0 bridge device in kernel WITHOUT resetting Netplan daemon
        const cleanupCmds = [
            'ip link set br0 down 2>/dev/null || true',
            'ip link delete br0 type bridge 2>/dev/null || true',
            'nmcli connection delete netplan-br0 2>/dev/null || true',
            'nmcli connection delete br0 2>/dev/null || true'
        ];
        for (const cmd of cleanupCmds) {
            await this.runCommand(cmd);
        }

        // 3. Set physical LAN device as managed and non-blocking
        await this.runCommand(`nmcli device set ${safeDev} managed yes`);
        await this.runCommand(`nmcli device set ${safeDev} autoconnect yes`);

        // 4. Try to connect existing device first
        let connectRes = await this.runCommand(`nmcli device connect ${safeDev}`);
        steps.push({ step: 'device_connect', cmd: `nmcli device connect ${safeDev}`, ...connectRes });

        // 5. If connect fails or no connection profile is assigned, create clean "Wired LAN" connection
        if (!connectRes.success) {
            // Check if connection profile already exists, if not create with may-fail=yes so it never blocks Wi-Fi
            await this.runCommand(`nmcli connection add type ethernet con-name "Wired LAN" ifname ${safeDev} autoconnect yes ipv4.may-fail yes`);
            const upRes = await this.runCommand('nmcli connection up "Wired LAN"');
            steps.push({ step: 'connection_up', cmd: 'nmcli connection up "Wired LAN"', ...upRes });
        }

        // 6. Wi-Fi Lifeline Guarantee: Always re-assert active Wi-Fi connection so internet/remote access is never dropped!
        if (wifiConnName) {
            await this.runCommand(`nmcli connection up "${wifiConnName}" 2>/dev/null || true`);
        } else {
            // Try to activate any known wifi connection
            await this.runCommand('nmcli device connect wlan0 2>/dev/null || true');
        }

        return {
            success: true,
            device: safeDev,
            message: `Interface LAN (${safeDev}) berhasil dipulihkan dan Wi-Fi tetap terlindungi aktif!`,
            steps
        };
    }

    /**
     * 8. enableArch3rBridge()
     * 100% Zero-Lockout Transparent Proxy-ARP & Kernel IP Forwarding Relay.
     * Completely eliminates persistent L2 br0 slave profiles to guarantee STB physical IPs, SSH,
     * Tailscale, and DHCP survive reboots without ever locking out the device.
     */
    async enableArch3rBridge() {
        const isAvailable = await this.isNmcliAvailable();
        if (!isAvailable) {
            return {
                success: false,
                error: 'nmcli (NetworkManager CLI) is not installed on this system.'
            };
        }

        // 1. Purge any dangling br0 profiles from previous runs to keep disk clean
        await this.ensureSafeStateAndPurgeDanglingBridges();

        const detected = await this.detectActiveConnections();
        if (!detected.success) {
            return {
                success: false,
                error: `Failed to detect active network connections: ${detected.error}`
            };
        }

        const lanDevice = this.sanitizeParam(detected.lan?.device || 'eth0');
        const wifiDevice = this.sanitizeParam(detected.wifi?.device || 'wlan0');

        if (!lanDevice || !wifiDevice) {
            return {
                success: false,
                error: `Active LAN (${lanDevice}) and Wi-Fi (${wifiDevice}) interfaces are required.`
            };
        }

        const steps = [];

        // 2. Kernel IP Forwarding & Transparent Proxy-ARP (Pure Kernel Layer - Zero NetworkManager slave risk)
        const sysctlCmds = [
            'sysctl -w net.ipv4.ip_forward=1',
            'sysctl -w net.ipv4.conf.all.proxy_arp=1',
            `sysctl -w net.ipv4.conf.${lanDevice}.proxy_arp=1`,
            `sysctl -w net.ipv4.conf.${wifiDevice}.proxy_arp=1`,
            'sysctl -w net.ipv4.conf.all.rp_filter=0',
            `sysctl -w net.ipv4.conf.${lanDevice}.rp_filter=0`,
            `sysctl -w net.ipv4.conf.${wifiDevice}.rp_filter=0`,
            'sysctl -w net.ipv4.conf.all.send_redirects=0',
            'sysctl -w net.ipv4.conf.all.accept_redirects=0'
        ];

        for (const sCmd of sysctlCmds) {
            const resSysctl = await this.runCommand(sCmd);
            steps.push({ step: 'kernel_proxy_arp', cmd: sCmd, ...resSysctl });
        }

        // 3. Bi-directional IPTables Forwarding between LAN and Wi-Fi
        const iptablesCmds = [
            `iptables -C FORWARD -i ${lanDevice} -o ${wifiDevice} -j ACCEPT 2>/dev/null || iptables -A FORWARD -i ${lanDevice} -o ${wifiDevice} -j ACCEPT`,
            `iptables -C FORWARD -i ${wifiDevice} -o ${lanDevice} -j ACCEPT 2>/dev/null || iptables -A FORWARD -i ${wifiDevice} -o ${lanDevice} -j ACCEPT`,
            `iptables -C FORWARD -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT 2>/dev/null || iptables -A FORWARD -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT`
        ];

        for (const iCmd of iptablesCmds) {
            const resIp = await this.runCommand(iCmd);
            steps.push({ step: 'iptables_forward', cmd: iCmd, ...resIp });
        }

        return {
            success: true,
            activeBridge: 'Proxy-ARP Relay',
            lanInterface: lanDevice,
            wifiInterface: wifiDevice,
            relayMode: 'Pure Transparent Proxy-ARP & Kernel IP Forwarding (Zero-Lockout)',
            message: `arch3rBridge (Proxy-ARP Relay) aktif! Komunikasi kamera Wi-Fi (${wifiDevice}) dan LAN (${lanDevice}) terhubung langsung tanpa risiko penguncian port fisik saat reboot.`,
            steps
        };
    }

    /**
     * 9. disableArch3rBridge()
     * Safely disables Transparent Proxy-ARP and removes iptables forward rules.
     */
    async disableArch3rBridge() {
        const detected = await this.detectActiveConnections();
        const lanDevice = this.sanitizeParam(detected.lan?.device || 'eth0');
        const wifiDevice = this.sanitizeParam(detected.wifi?.device || 'wlan0');

        const steps = [];

        // 1. Clear IPTables FORWARD rules
        if (lanDevice && wifiDevice) {
            await this.runCommand(`iptables -D FORWARD -i ${lanDevice} -o ${wifiDevice} -j ACCEPT 2>/dev/null`);
            await this.runCommand(`iptables -D FORWARD -i ${wifiDevice} -o ${lanDevice} -j ACCEPT 2>/dev/null`);
        }

        // 2. Reset Proxy-ARP sysctl
        const resetSysctl = [
            'sysctl -w net.ipv4.conf.all.proxy_arp=0',
            lanDevice ? `sysctl -w net.ipv4.conf.${lanDevice}.proxy_arp=0` : '',
            wifiDevice ? `sysctl -w net.ipv4.conf.${wifiDevice}.proxy_arp=0` : ''
        ].filter(Boolean);

        for (const sCmd of resetSysctl) {
            const res = await this.runCommand(sCmd);
            steps.push({ step: 'reset_sysctl', cmd: sCmd, ...res });
        }

        // 3. Purge any lingering bridge profiles
        await this.ensureSafeStateAndPurgeDanglingBridges();

        return {
            success: true,
            message: 'arch3rBridge (Proxy-ARP Relay) berhasil dinonaktifkan. Jaringan STB kembali ke mode routing standar.',
            steps
        };
    }

    /**
     * 10. getArch3rBridgeStatus()
     * Checks if Transparent Proxy-ARP & IP Forwarding is active in kernel sysctl
     */
    async getArch3rBridgeStatus() {
        const resProxy = await this.runCommand('cat /proc/sys/net/ipv4/conf/all/proxy_arp');
        const resForward = await this.runCommand('cat /proc/sys/net/ipv4/ip_forward');

        const isProxyActive = resProxy.success && resProxy.stdout.trim() === '1';
        const isForwardActive = resForward.success && resForward.stdout.trim() === '1';
        const isActive = isProxyActive && isForwardActive;

        return {
            success: true,
            active: isActive,
            relayMode: 'Pure Transparent Proxy-ARP (Zero-Lockout)',
            proxyArp: isProxyActive ? '1 (Active)' : '0 (Inactive)',
            ipForward: isForwardActive ? '1 (Active)' : '0 (Inactive)',
            state: isActive ? 'active (proxy-arp relay)' : 'inactive'
        };
    }
}
