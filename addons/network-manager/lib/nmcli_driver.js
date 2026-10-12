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

        // 1. Get physical and virtual device status from OS: DEVICE:TYPE:STATE:CONNECTION
        const devRes = await this.runCommand('nmcli -t -f DEVICE,TYPE,STATE,CONNECTION device status');
        // 2. Get connection profiles: NAME:TYPE:DEVICE:STATE:UUID
        const cmdRes = await this.runCommand('nmcli -t -f NAME,TYPE,DEVICE,STATE,UUID connection show');

        if (!devRes.success && !cmdRes.success) {
            return {
                success: false,
                available: true,
                error: `Failed to execute nmcli: ${devRes.stderr || cmdRes.stderr}`,
                connections: [],
                lan: null,
                wifi: null
            };
        }

        const profileLines = cmdRes.success ? cmdRes.stdout.split('\n').filter(l => l.trim().length > 0) : [];
        const rawProfiles = [];
        for (const line of profileLines) {
            const parts = line.split(/(?<!\\):/);
            if (parts.length >= 4) {
                rawProfiles.push({
                    name: parts[0].replace(/\\:/g, ':').trim(),
                    type: parts[1].trim().toLowerCase(),
                    rawType: parts[1],
                    device: parts[2].trim() === '--' ? '' : parts[2].trim(),
                    state: parts[3].trim(),
                    uuid: parts[4] ? parts[4].trim() : ''
                });
            }
        }

        const devLines = devRes.success ? devRes.stdout.split('\n').filter(l => l.trim().length > 0) : [];
        const unifiedConnections = [];
        const processedDevices = new Set();
        let lanConn = null;
        let wifiConn = null;

        // Collect all system routes to read active metric
        const sysRouteRes = await this.runCommand('ip route show');
        const sysRouteLines = sysRouteRes.success && sysRouteRes.stdout ? sysRouteRes.stdout.split('\n') : [];

        for (const dLine of devLines) {
            const dParts = dLine.split(/(?<!\\):/);
            if (dParts.length >= 3) {
                const devName = dParts[0].trim();
                const devType = dParts[1].trim().toLowerCase();
                let devState = dParts[2].trim();
                const devConnName = dParts[3] ? dParts[3].trim() : '--';

                // Ignore Wi-Fi Direct (P2P) internal virtual devices
                if (devName.startsWith('p2p-dev') || devType === 'wifi-p2p') {
                    continue;
                }

                // Ignore inactive secondary wlan1 if wlan0 or another wifi device is present
                if (devName === 'wlan1' && devState === 'disconnected' && devLines.some(l => l.startsWith('wlan0'))) {
                    continue;
                }

                processedDevices.add(devName);

                const isEthernet = devType.includes('ethernet') || devName.startsWith('eth') || devName.startsWith('en') || devName.startsWith('end');
                const isWifi = devType.includes('wifi') || devName.startsWith('wlan');
                const isLoopback = devType.includes('loopback') || devName === 'lo';

                // If Ethernet is unmanaged, trigger managed state in background for seamless UX
                if (isEthernet && devState.toLowerCase() === 'unmanaged') {
                    this.runCommand(`nmcli device set "${devName}" managed yes`).catch(() => {});
                }

                // Match with active connection profile if any
                const matchedProfile = rawProfiles.find(p => p.device === devName) ||
                                       (devConnName !== '--' ? rawProfiles.find(p => p.name === devConnName) : null);

                const isConnected = devState === 'connected' || (matchedProfile && matchedProfile.state === 'activated');
                const displayName = matchedProfile ? matchedProfile.name : (devConnName !== '--' && devConnName ? devConnName : devName);

                // Find route metric for this device
                let metric = null;
                for (const rLine of sysRouteLines) {
                    if (rLine.includes(`dev ${devName}`) && rLine.includes('metric')) {
                        const mMatch = rLine.match(/metric\s+(\d+)/);
                        if (mMatch) {
                            metric = parseInt(mMatch[1], 10);
                            break;
                        }
                    }
                }

                const connObj = {
                    name: displayName,
                    type: isEthernet ? 'ethernet' : (isWifi ? 'wifi' : (isLoopback ? 'loopback' : devType)),
                    rawType: devType,
                    device: devName,
                    state: isConnected ? 'activated' : devState,
                    uuid: matchedProfile ? matchedProfile.uuid : '',
                    metric,
                    active: isConnected,
                    unmanaged: devState.toLowerCase() === 'unmanaged'
                };

                unifiedConnections.push(connObj);

                if (isEthernet && (!lanConn || isConnected)) lanConn = connObj;
                if (isWifi && (!wifiConn || isConnected)) wifiConn = connObj;
            }
        }

        // Add any remaining virtual/software connections (like bridges or vpn) that don't have physical devices
        for (const prof of rawProfiles) {
            if (prof.device && !processedDevices.has(prof.device)) {
                processedDevices.add(prof.device);
                const isEth = prof.type.includes('ethernet');
                const isWf = prof.type.includes('wifi');
                const isAct = prof.state === 'activated';
                const connObj = {
                    name: prof.name,
                    type: isEth ? 'ethernet' : (isWf ? 'wifi' : prof.type),
                    rawType: prof.rawType,
                    device: prof.device,
                    state: prof.state,
                    uuid: prof.uuid,
                    active: isAct
                };
                unifiedConnections.push(connObj);
                if (isEth && (!lanConn || isAct)) lanConn = connObj;
                if (isWf && (!wifiConn || isAct)) wifiConn = connObj;
            }
        }

        // Get IP details per interface if devices are active
        for (const conn of unifiedConnections) {
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
            connections: unifiedConnections,
            lan: lanConn,
            wifi: wifiConn,
            count: unifiedConnections.length
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

        // Auto-Harden the newly connected Wi-Fi profile:
        // 1. Bind to physical wlan0 interface
        // 2. Disable power saving (powersave 2) to eliminate idle/sleep disconnections
        // 3. Set persistent autoconnect with priority 100
        // 4. Set fallback metric (500)
        try {
            await this.runCommand(`nmcli connection modify "${safeSsid}" connection.interface-name wlan0 2>/dev/null || true`);
            await this.runCommand(`nmcli connection modify "${safeSsid}" 802-11-wireless.powersave 2 2>/dev/null || true`);
            await this.runCommand(`nmcli connection modify "${safeSsid}" connection.autoconnect yes 2>/dev/null || true`);
            await this.runCommand(`nmcli connection modify "${safeSsid}" connection.autoconnect-priority 100 2>/dev/null || true`);
            await this.runCommand(`nmcli connection modify "${safeSsid}" connection.autoconnect-retries 0 2>/dev/null || true`);
            await this.runCommand(`nmcli connection modify "${safeSsid}" ipv4.route-metric 500 2>/dev/null || true`);
            await this.runCommand(`nmcli connection modify "${safeSsid}" ipv4.may-fail yes 2>/dev/null || true`);
            await this.runCommand('nmcli connection reload 2>/dev/null || true');
        } catch (_) {}

        return {
            success: true,
            ssid: safeSsid,
            message: `STB berhasil tersambung ke Wi-Fi "${safeSsid}"! (Profil otomatis dikunci ke wlan0, powersave dimatikan, dan autoconnect aktif)`,
            stdout: res.stdout
        };
    }

    /**
     * Resolves an interface name or connection name to the exact active/valid NetworkManager connection profile name.
     */
    async resolveConnectionProfileName(nameOrDevice, preferredType = '') {
        if (!nameOrDevice) return '';
        const clean = this.sanitizeParam(nameOrDevice);

        // 1. If clean is already a valid connection name or UUID, verify directly
        const verifyCmd = await this.runCommand(`nmcli -g connection.id connection show "${clean}"`);
        if (verifyCmd.success && verifyCmd.stdout) {
            return verifyCmd.stdout.trim();
        }

        // 2. Query device show to get active connection profile attached to that device (e.g. wlan0, wlan1, eth0)
        const devCmd = await this.runCommand(`nmcli -g GENERAL.CONNECTION device show "${clean}"`);
        if (devCmd.success && devCmd.stdout && devCmd.stdout.trim() !== '--' && devCmd.stdout.trim() !== '') {
            return devCmd.stdout.trim();
        }

        // 3. Scan all connections matching the device or preferred type
        const connRes = await this.runCommand('nmcli -t -f NAME,TYPE,DEVICE connection show');
        if (connRes.success && connRes.stdout) {
            const lines = connRes.stdout.split('\n').filter(l => l.trim().length > 0);
            for (const line of lines) {
                const parts = line.split(/(?<!\\):/);
                if (parts.length >= 3) {
                    const cName = parts[0].replace(/\\:/g, ':').trim();
                    const cType = parts[1].trim().toLowerCase();
                    const cDev = parts[2].trim();

                    // If device matches exactly
                    if (cDev && (cDev === clean || cDev.startsWith(clean))) return cName;

                    // If preferred type matches (e.g. wifi)
                    if (preferredType === 'wifi' && (cType.includes('wifi') || cType.includes('wireless'))) {
                        return cName;
                    }
                    if (preferredType === 'lan' && (cType.includes('ethernet') || cType.includes('802-3-ethernet'))) {
                        return cName;
                    }
                }
            }
        }

        return clean;
    }

    /**
     * 4. setupMetrics(lanName, wifiName)
     * Automatically detects active Wi-Fi and LAN interface names if not provided,
     * then configures interface priority routing:
     * - LAN Ethernet metric set to 50 (High priority gateway for maximum speed)
     * - Wi-Fi metric set to 500 (Fallback gateway when LAN is disconnected)
     */
    async setupMetrics(lanName = null, wifiName = null) {
        let rawLan = lanName;
        let rawWifi = wifiName;

        // Auto-detect active Wi-Fi and LAN connection names dynamically if missing
        if (!rawLan || !rawWifi) {
            const detected = await this.detectActiveConnections();
            if (!rawLan) rawLan = detected.lanName;
            if (!rawWifi) rawWifi = detected.wifiName;
        }

        if (!rawLan && !rawWifi) {
            return {
                success: false,
                error: 'Could not automatically detect active LAN or Wi-Fi connections from nmcli connection show.'
            };
        }

        // Resolve device names (e.g. wlan0, eth0) to actual connection profile names (e.g. netplan-wlan0-W_CTV, eth0)
        const targetLan = await this.resolveConnectionProfileName(rawLan, 'lan');
        const targetWifi = await this.resolveConnectionProfileName(rawWifi, 'wifi');

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

        const resolvedConnName = await this.resolveConnectionProfileName(targetConnName, wirelessFlag ? 'wifi' : 'lan');
        const safeConn = this.sanitizeParam(resolvedConnName || targetConnName);
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

        const resolvedConnName = await this.resolveConnectionProfileName(targetConnName, wirelessFlag ? 'wifi' : 'lan');
        const safeConn = this.sanitizeParam(resolvedConnName || targetConnName);
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
        let rawLan = lanName;
        let rawWifi = wifiName;

        // If names not provided, auto-detect active connections
        if (!rawLan || !rawWifi) {
            const detected = await this.detectActiveConnections();
            if (!rawLan && detected.lanName) rawLan = detected.lanName;
            if (!rawWifi && detected.wifiName) rawWifi = detected.wifiName;
        }

        const safeLanName = this.sanitizeParam(await this.resolveConnectionProfileName(rawLan, 'lan'));
        const safeWifiName = this.sanitizeParam(await this.resolveConnectionProfileName(rawWifi, 'wifi'));

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

        // Auto re-apply arch3rBridge PBR routing rules if bridge was active, so restarting nmcli does not wipe PBR
        let bridgeSyncInfo = null;
        try {
            const bridgeStatus = await this.getArch3rBridgeStatus();
            if (bridgeStatus && bridgeStatus.active) {
                const reBridge = await this.enableArch3rBridge();
                bridgeSyncInfo = {
                    reapplied: true,
                    message: reBridge.message || 'PBR tables & Proxy-ARP successfully synced after nmcli restart.'
                };
            }
        } catch (_) {}

        return {
            success: true,
            message: 'Network changes successfully applied! Connections restarted, routes loaded, and kernel tables synced.',
            details: results,
            bridgeSync: bridgeSyncInfo
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
     * Comprehensive Network Self-Healing Engine (One-Click Auto-Fix & Duplicate Purge)
     * Specifically designed for Armbian STB:
     * 1. Detects duplicate profiles for same device (e.g. multiple eth0 or multiple wlan0 profiles).
     * 2. Purges stale/duplicate Netplan YAML files and inactive nmcli profiles.
     * 3. Locks physical interfaces (ifname binding) so profiles never bind to ghost names.
     * 4. Enforces Wi-Fi Anti-Drop & Reboot Persistence (powersave 2, autoconnect yes, priority 100, retries 0).
     * 5. Enforces Metric Gateway Separation (LAN=50, Wi-Fi=500) to prevent routing clashes on reboot.
     */
    async autoHealNetworkStack(options = {}) {
        const isAvailable = await this.isNmcliAvailable();
        if (!isAvailable) {
            return { success: false, error: 'nmcli is not installed on this system.' };
        }

        const auditLog = [];
        const actionsTaken = [];
        const warnings = [];

        // 1. Audit current connection profiles & devices from nmcli
        auditLog.push(`[${new Date().toLocaleTimeString('id-ID')}] 🔍 Memulai audit diagnosa interface & profil koneksi...`);
        const connRaw = await this.runCommand('nmcli -t -f NAME,UUID,TYPE,DEVICE connection show');
        const devRaw = await this.runCommand('nmcli -t -f DEVICE,TYPE,STATE,CONNECTION device status');

        const allProfiles = [];
        if (connRaw.success && connRaw.stdout) {
            const lines = connRaw.stdout.split('\n').filter(l => l.trim().length > 0);
            for (const line of lines) {
                const parts = line.split(/(?<!\\):/);
                if (parts.length >= 4) {
                    allProfiles.push({
                        name: parts[0].replace(/\\:/g, ':').trim(),
                        uuid: parts[1].trim(),
                        type: parts[2].trim().toLowerCase(),
                        device: parts[3].trim() === '--' ? '' : parts[3].trim()
                    });
                }
            }
        }

        const activeDevices = {};
        if (devRaw.success && devRaw.stdout) {
            const lines = devRaw.stdout.split('\n').filter(l => l.trim().length > 0);
            for (const line of lines) {
                const parts = line.split(/(?<!\\):/);
                if (parts.length >= 4) {
                    activeDevices[parts[0].trim()] = {
                        type: parts[1].trim().toLowerCase(),
                        state: parts[2].trim(),
                        connection: parts[3].trim() === '--' ? '' : parts[3].trim()
                    };
                }
            }
        }

        // 2. Identify duplicate profiles
        // E.g. multiple profiles named 'eth0', or multiple ethernet profiles, or multiple wifi profiles
        const ethProfiles = allProfiles.filter(p => p.type.includes('ethernet') || p.name.toLowerCase().includes('eth0') || p.name.toLowerCase().includes('wired'));
        const wifiProfiles = allProfiles.filter(p => p.type.includes('wifi') || p.type.includes('wireless') || p.name.toLowerCase().includes('wlan'));

        auditLog.push(`Audit menemukan: ${ethProfiles.length} profil Ethernet LAN, ${wifiProfiles.length} profil Wi-Fi.`);

        // 2a. Clean duplicate/ghost Ethernet profiles: keep active one, or keep the most specific one
        if (ethProfiles.length > 1) {
            // Find which one is active
            let activeEth = ethProfiles.find(p => p.device && p.device !== '--');
            if (!activeEth) activeEth = ethProfiles[0];

            for (const p of ethProfiles) {
                if (p.uuid !== activeEth.uuid) {
                    const del = await this.runCommand(`nmcli connection delete uuid "${p.uuid}"`);
                    if (del.success) {
                        actionsTaken.push(`Hapus profil duplikat LAN: "${p.name}" (UUID: ${p.uuid})`);
                        // Also remove corresponding netplan yaml if exists
                        await this.runCommand(`rm -f /etc/netplan/*${p.uuid}*.yaml 2>/dev/null || true`);
                    }
                }
            }
        }

        // 2b. Clean duplicate/ghost Wi-Fi profiles
        if (wifiProfiles.length > 1) {
            let activeWf = wifiProfiles.find(p => p.device && p.device !== '--');
            if (!activeWf) activeWf = wifiProfiles[0];

            for (const p of wifiProfiles) {
                if (p.uuid !== activeWf.uuid) {
                    const del = await this.runCommand(`nmcli connection delete uuid "${p.uuid}"`);
                    if (del.success) {
                        actionsTaken.push(`Hapus profil duplikat Wi-Fi: "${p.name}" (UUID: ${p.uuid})`);
                        await this.runCommand(`rm -f /etc/netplan/*${p.uuid}*.yaml 2>/dev/null || true`);
                    }
                }
            }
        }

        // 2c. Clean dangling netplan YAML ghost files in /etc/netplan/
        try {
            const lsNetplan = await this.runCommand('ls /etc/netplan/90-NM-*.yaml 2>/dev/null || true');
            if (lsNetplan.success && lsNetplan.stdout) {
                const files = lsNetplan.stdout.split('\n').filter(f => f.trim().length > 0);
                for (const f of files) {
                    // Extract UUID from filename: 90-NM-<uuid>.yaml
                    const m = f.match(/90-NM-([a-f0-9-]+)\.yaml/i);
                    if (m) {
                        const fileUuid = m[1];
                        // If this UUID is not in current active profiles, remove it!
                        const stillExists = allProfiles.some(p => p.uuid === fileUuid && p.device);
                        if (!stillExists) {
                            await this.runCommand(`rm -f "${f.trim()}"`);
                            actionsTaken.push(`Hapus file ghost Netplan: ${f.trim()}`);
                        }
                    }
                }
            }
        } catch (_) {}

        // 3. Wi-Fi Anti-Drop & Reboot Hardening
        // Find current primary Wi-Fi connection
        const updatedWifiRes = await this.runCommand('nmcli -t -f NAME,UUID,DEVICE,TYPE connection show');
        let currentWifiProfile = null;
        if (updatedWifiRes.success && updatedWifiRes.stdout) {
            const lines = updatedWifiRes.stdout.split('\n').filter(l => l.trim().length > 0);
            for (const line of lines) {
                const parts = line.split(/(?<!\\):/);
                if (parts.length >= 4) {
                    const cType = parts[3].trim().toLowerCase();
                    if (cType.includes('wifi') || cType.includes('wireless')) {
                        currentWifiProfile = {
                            name: parts[0].replace(/\\:/g, ':').trim(),
                            uuid: parts[1].trim(),
                            device: parts[2].trim() === '--' ? '' : parts[2].trim()
                        };
                        break;
                    }
                }
            }
        }

        if (currentWifiProfile) {
            auditLog.push(`🛡️ Menerapkan Wi-Fi Anti-Drop & Hardware Lock pada profil "${currentWifiProfile.name}"...`);
            
            // A. Bind to wlan0 physical interface explicitly
            await this.runCommand(`nmcli connection modify "${currentWifiProfile.name}" connection.interface-name wlan0 2>/dev/null || true`);
            // B. Disable Wi-Fi power saving (powersave 2 = disable power save in NM, avoids sleep disconnect)
            await this.runCommand(`nmcli connection modify "${currentWifiProfile.name}" 802-11-wireless.powersave 2 2>/dev/null || true`);
            // C. Enable persistent autoconnect with high priority
            await this.runCommand(`nmcli connection modify "${currentWifiProfile.name}" connection.autoconnect yes 2>/dev/null || true`);
            await this.runCommand(`nmcli connection modify "${currentWifiProfile.name}" connection.autoconnect-priority 100 2>/dev/null || true`);
            await this.runCommand(`nmcli connection modify "${currentWifiProfile.name}" connection.autoconnect-retries 0 2>/dev/null || true`);
            // D. Set secondary route metric (500) so Wi-Fi does not conflict with LAN
            await this.runCommand(`nmcli connection modify "${currentWifiProfile.name}" ipv4.route-metric 500 2>/dev/null || true`);
            // E. Set ipv4.may-fail yes so boot does not block if Wi-Fi AP is temporarily offline
            await this.runCommand(`nmcli connection modify "${currentWifiProfile.name}" ipv4.may-fail yes 2>/dev/null || true`);

            actionsTaken.push(`Kunci Wi-Fi Anti-Drop ("${currentWifiProfile.name}"): interface-name=wlan0, powersave=disabled, autoconnect-priority=100, retries=infinite(0), metric=500`);
        } else {
            warnings.push('Tidak ditemukan profil Wi-Fi aktif untuk dikunci.');
        }

        // 4. Ethernet LAN Hardening
        let currentLanProfile = null;
        if (updatedWifiRes.success && updatedWifiRes.stdout) {
            const lines = updatedWifiRes.stdout.split('\n').filter(l => l.trim().length > 0);
            for (const line of lines) {
                const parts = line.split(/(?<!\\):/);
                if (parts.length >= 4) {
                    const cType = parts[3].trim().toLowerCase();
                    if (cType.includes('ethernet') || parts[0].toLowerCase().includes('eth0')) {
                        currentLanProfile = {
                            name: parts[0].replace(/\\:/g, ':').trim(),
                            uuid: parts[1].trim(),
                            device: parts[2].trim() === '--' ? '' : parts[2].trim()
                        };
                        break;
                    }
                }
            }
        }

        if (currentLanProfile) {
            auditLog.push(`⚡ Menerapkan konfigurasi LAN Ethernet stabil pada profil "${currentLanProfile.name}"...`);
            await this.runCommand(`nmcli connection modify "${currentLanProfile.name}" connection.interface-name eth0 2>/dev/null || true`);
            await this.runCommand(`nmcli connection modify "${currentLanProfile.name}" connection.autoconnect yes 2>/dev/null || true`);
            await this.runCommand(`nmcli connection modify "${currentLanProfile.name}" connection.autoconnect-priority 50 2>/dev/null || true`);
            await this.runCommand(`nmcli connection modify "${currentLanProfile.name}" ipv4.route-metric 50 2>/dev/null || true`);
            await this.runCommand(`nmcli connection modify "${currentLanProfile.name}" ipv4.may-fail yes 2>/dev/null || true`);

            actionsTaken.push(`Kunci LAN Ethernet ("${currentLanProfile.name}"): interface-name=eth0, autoconnect=yes, priority=50, metric=50</td>`);
        }

        // 5. Ensure unmanaged-devices=none in NetworkManager configuration so devices never become unmanaged
        try {
            await this.runCommand('echo -e "[keyfile]\\nunmanaged-devices=none" | tee /etc/NetworkManager/conf.d/10-manage-all.conf 2>/dev/null || true');
            await this.runCommand('nmcli device set eth0 managed yes 2>/dev/null || true');
            await this.runCommand('nmcli device set wlan0 managed yes 2>/dev/null || true');
        } catch (_) {}

        // 6. Reload and save state
        await this.runCommand('nmcli connection reload 2>/dev/null || true');

        // Bring up connections cleanly
        if (currentLanProfile) {
            await this.runCommand(`nmcli connection up "${currentLanProfile.name}" 2>/dev/null || true`);
        }
        if (currentWifiProfile) {
            await this.runCommand(`nmcli connection up "${currentWifiProfile.name}" 2>/dev/null || true`);
        }

        return {
            success: true,
            message: 'Perbaikan mandiri tuntas! Interface fisik telah dikunci, profil duplikat & ghost Netplan dibersihkan, dan Wi-Fi Anti-Drop diaktifkan.',
            actionsCount: actionsTaken.length,
            actionsTaken,
            warnings,
            auditLog
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

        // 3. Clean up any unlinked ghost profiles and bring physical link up in kernel
        await this.runCommand(`ip link set ${safeDev} up 2>/dev/null || true`);
        await this.runCommand('ip link set end0 up 2>/dev/null || true');
        await this.runCommand('nmcli connection delete "Wired LAN" 2>/dev/null || true');
        await this.runCommand(`nmcli connection delete "Wired connection 1" 2>/dev/null || true`);

        // 4. Ensure NetworkManager manages all Ethernet devices on Armbian/Debian
        await this.runCommand('echo -e "[keyfile]\\nunmanaged-devices=none" | tee /etc/NetworkManager/conf.d/10-manage-all.conf 2>/dev/null || true');
        await this.runCommand(`nmcli device set ${safeDev} managed yes`);
        await this.runCommand(`nmcli device set ${safeDev} autoconnect yes`);

        // 5. Connect or create clean 1-to-1 profile for this physical interface
        let connectRes = await this.runCommand(`nmcli device connect ${safeDev}`);
        steps.push({ step: 'device_connect', cmd: `nmcli device connect ${safeDev}`, ...connectRes });

        if (!connectRes.success) {
            await this.runCommand(`nmcli connection add type ethernet con-name "${safeDev}" ifname ${safeDev} autoconnect yes ipv4.may-fail yes 2>/dev/null || true`);
            const upRes = await this.runCommand(`nmcli connection up "${safeDev}" 2>/dev/null || true`);
            steps.push({ step: 'connection_up', cmd: `nmcli connection up "${safeDev}"`, ...upRes });
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
     * Helper to retrieve IPv4 address, CIDR prefix, Subnet block, and Gateway for a specific interface.
     */
    async getInterfaceNetworkInfo(device) {
        if (!device) return null;
        const cleanDev = this.sanitizeParam(device);
        try {
            // 1. Get IPv4 address and CIDR prefix
            const addrRes = await this.runCommand(`ip -4 -o addr show dev "${cleanDev}"`);
            let ip = null;
            let cidr = null;
            let subnet = null;
            if (addrRes.success && addrRes.stdout) {
                const match = addrRes.stdout.match(/inet\s+([0-9.]+)\/(\d+)/);
                if (match) {
                    ip = match[1];
                    cidr = parseInt(match[2], 10);
                }
            }

            // 2. Get route information (gateway and direct subnet)
            const routeRes = await this.runCommand(`ip route show dev "${cleanDev}"`);
            let gateway = null;
            if (routeRes.success && routeRes.stdout) {
                const lines = routeRes.stdout.split('\n');
                for (const line of lines) {
                    const gwMatch = line.match(/default via ([0-9.]+)/);
                    if (gwMatch) gateway = gwMatch[1];
                    const subMatch = line.match(/^([0-9.]+\/\d+)\s+/);
                    if (subMatch && !subnet) subnet = subMatch[1];
                }
            }

            // Fallback subnet calculation if not explicitly in routing table
            if (!subnet && ip && cidr) {
                const ipParts = ip.split('.').map(Number);
                if (cidr === 24) {
                    subnet = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.0/24`;
                } else if (cidr === 16) {
                    subnet = `${ipParts[0]}.${ipParts[1]}.0.0/16`;
                } else {
                    subnet = `${ip}/32`;
                }
            }

            return { device: cleanDev, ip, cidr, subnet, gateway };
        } catch (_) {
            return null;
        }
    }

    /**
     * 8. enableArch3rBridge()
     * 100% Zero-Lockout Transparent Proxy-ARP, Kernel IP Forwarding Relay &
     * Policy-Based Routing (PBR / Solusi B).
     * Solves ISP router AP Isolation / Port Isolation by ensuring all packets received
     * on Wi-Fi (e.g. 192.168.1.252) are strictly replied via wlan0, and LAN packets via eth0,
     * seamlessly covering all clients on the 192.168.1.0/24 network without manual per-IP routes.
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

        // 3. Bi-directional IPTables Forwarding & Full MASQUERADE NAT between LAN and Wi-Fi
        // (Guarantees IP cameras without default gateway or with static IPs reply directly)
        const iptablesCmds = [
            `iptables -C FORWARD -i ${lanDevice} -o ${wifiDevice} -j ACCEPT 2>/dev/null || iptables -A FORWARD -i ${lanDevice} -o ${wifiDevice} -j ACCEPT`,
            `iptables -C FORWARD -i ${wifiDevice} -o ${lanDevice} -j ACCEPT 2>/dev/null || iptables -A FORWARD -i ${wifiDevice} -o ${lanDevice} -j ACCEPT`,
            `iptables -C FORWARD -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT 2>/dev/null || iptables -A FORWARD -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT`,
            `iptables -t nat -C POSTROUTING -o ${lanDevice} -j MASQUERADE 2>/dev/null || iptables -t nat -A POSTROUTING -o ${lanDevice} -j MASQUERADE`,
            `iptables -t nat -C POSTROUTING -o ${wifiDevice} -j MASQUERADE 2>/dev/null || iptables -t nat -A POSTROUTING -o ${wifiDevice} -j MASQUERADE`
        ];

        for (const iCmd of iptablesCmds) {
            const resIp = await this.runCommand(iCmd);
            steps.push({ step: 'iptables_forward', cmd: iCmd, ...resIp });
        }

        // 4. Automatically align Route Metric Priorities (LAN=50, Wi-Fi=500)
        try {
            await this.setupMetrics(detected.lanName || lanDevice, detected.wifiName || wifiDevice);
        } catch (_) {}

        // 5. Policy-Based Routing (PBR / Solusi B) - Source-Based Routing Rules
        // Guarantees all traffic replying to Wi-Fi clients exits strictly via wlan0, and LAN via eth0
        const wifiInfo = await this.getInterfaceNetworkInfo(wifiDevice);
        const lanInfo = await this.getInterfaceNetworkInfo(lanDevice);

        if (wifiInfo && wifiInfo.ip) {
            const pbrWifiCmds = [
                'while ip rule del lookup 100 2>/dev/null; do :; done',
                'ip route flush table 100 2>/dev/null || true',
                `ip rule add from ${wifiInfo.ip} lookup 100 priority 1000`,
                wifiInfo.subnet ? `ip route replace ${wifiInfo.subnet} dev ${wifiDevice} proto static scope link table 100` : '',
                wifiInfo.gateway ? `ip route replace default via ${wifiInfo.gateway} dev ${wifiDevice} proto static table 100` : ''
            ].filter(Boolean);

            for (const pCmd of pbrWifiCmds) {
                const resPbr = await this.runCommand(pCmd);
                steps.push({ step: 'pbr_wifi_table100', cmd: pCmd, ...resPbr });
            }
        }

        if (lanInfo && lanInfo.ip) {
            const pbrLanCmds = [
                'while ip rule del lookup 101 2>/dev/null; do :; done',
                'ip route flush table 101 2>/dev/null || true',
                `ip rule add from ${lanInfo.ip} lookup 101 priority 1001`,
                lanInfo.subnet ? `ip route replace ${lanInfo.subnet} dev ${lanDevice} proto static scope link table 101` : '',
                lanInfo.gateway ? `ip route replace default via ${lanInfo.gateway} dev ${lanDevice} proto static table 101` : ''
            ].filter(Boolean);

            for (const pCmd of pbrLanCmds) {
                const resPbr = await this.runCommand(pCmd);
                steps.push({ step: 'pbr_lan_table101', cmd: pCmd, ...resPbr });
            }
        }

        return {
            success: true,
            activeBridge: 'Proxy-ARP Relay & Policy-Based Routing (PBR)',
            lanInterface: lanDevice,
            wifiInterface: wifiDevice,
            wifiIp: wifiInfo?.ip || null,
            lanIp: lanInfo?.ip || null,
            relayMode: 'Transparent Proxy-ARP + Source-Based PBR Routing (Solusi B Universal)',
            message: `arch3rBridge (Proxy-ARP Relay & PBR Solusi B) aktif! Paket Wi-Fi (${wifiInfo?.ip || wifiDevice}) otomatis dibalas lewat Wi-Fi, dan LAN (${lanInfo?.ip || lanDevice}) lewat LAN untuk seluruh klien 192.168.1.0/24 menembus isolasi router ISP.`,
            steps
        };
    }

    /**
     * 9. disableArch3rBridge()
     * Safely disables Transparent Proxy-ARP, removes iptables forward rules, and flushes PBR tables.
     */
    async disableArch3rBridge() {
        const detected = await this.detectActiveConnections();
        const lanDevice = this.sanitizeParam(detected.lan?.device || 'eth0');
        const wifiDevice = this.sanitizeParam(detected.wifi?.device || 'wlan0');

        const steps = [];

        // 1. Clear IPTables FORWARD & NAT MASQUERADE rules
        if (lanDevice && wifiDevice) {
            await this.runCommand(`iptables -D FORWARD -i ${lanDevice} -o ${wifiDevice} -j ACCEPT 2>/dev/null`);
            await this.runCommand(`iptables -D FORWARD -i ${wifiDevice} -o ${lanDevice} -j ACCEPT 2>/dev/null`);
            await this.runCommand(`iptables -t nat -D POSTROUTING -o ${lanDevice} -j MASQUERADE 2>/dev/null`);
            await this.runCommand(`iptables -t nat -D POSTROUTING -o ${wifiDevice} -j MASQUERADE 2>/dev/null`);
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

        // 3. Flush Policy-Based Routing (PBR) tables 100 and 101
        const pbrCleanup = [
            'while ip rule del lookup 100 2>/dev/null; do :; done',
            'ip route flush table 100 2>/dev/null || true',
            'while ip rule del lookup 101 2>/dev/null; do :; done',
            'ip route flush table 101 2>/dev/null || true'
        ];
        for (const pCmd of pbrCleanup) {
            const resPbr = await this.runCommand(pCmd);
            steps.push({ step: 'cleanup_pbr', cmd: pCmd, ...resPbr });
        }

        // 4. Purge any lingering bridge profiles
        await this.ensureSafeStateAndPurgeDanglingBridges();

        return {
            success: true,
            message: 'arch3rBridge (Proxy-ARP Relay & PBR) berhasil dinonaktifkan. Jaringan STB kembali ke mode routing standar.',
            steps
        };
    }

    /**
     * 10. getArch3rBridgeStatus()
     * Checks if Transparent Proxy-ARP & IP Forwarding and PBR is active in kernel
     */
    async getArch3rBridgeStatus() {
        const resProxy = await this.runCommand('cat /proc/sys/net/ipv4/conf/all/proxy_arp');
        const resForward = await this.runCommand('cat /proc/sys/net/ipv4/ip_forward');
        const resRule = await this.runCommand('ip rule show | grep -E "lookup (100|101)"');

        const isProxyActive = resProxy.success && resProxy.stdout.trim() === '1';
        const isForwardActive = resForward.success && resForward.stdout.trim() === '1';
        const isPbrActive = resRule.success && resRule.stdout.trim().length > 0;
        const isActive = (isProxyActive && isForwardActive) || isPbrActive;

        return {
            success: true,
            active: isActive,
            relayMode: 'Transparent Proxy-ARP & PBR (Zero-Lockout)',
            proxyArp: isProxyActive ? '1 (Active)' : '0 (Inactive)',
            ipForward: isForwardActive ? '1 (Active)' : '0 (Inactive)',
            pbr: isPbrActive ? '1 (Active: Solusi B Universal)' : '0 (Inactive)',
            pbrRules: isPbrActive ? resRule.stdout.trim().split('\n') : [],
            state: isActive ? 'active (proxy-arp relay & pbr)' : 'inactive'
        };
    }
}
