import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * ArmbianNetworkManager - High-Performance nmcli CLI Driver & Generic Network Router for Armbian Linux STB
 * Handles ISP Router Interface Isolation (LAN vs Wi-Fi) & Generalized IP/Subnet Binding (CCTV, NAS, Local Servers, Smart Hubs)
 */
export class ArmbianNetworkManager {
    constructor(options = {}) {
        this.timeoutMs = options.timeoutMs || 5000;
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

        // Get IP details per interface if devices are active
        for (const conn of connections) {
            if (conn.device) {
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
            lan: lanConn,
            wifi: wifiConn,
            count: connections.length
        };
    }

    /**
     * 2. setupMetrics(lanName, wifiName)
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
     * 3. addRoute(target, isWireless, connectionName, type)
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

        // Determine if target interface is wireless
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
                // If a connection name string was passed in 2nd position
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
     * Backward compatibility alias for CCTV camera routing
     */
    async addCameraRoute(interfaceType, cameraIp, connectionName) {
        const isWireless = (interfaceType === 'wifi' || interfaceType === 'wireless');
        return this.addRoute(cameraIp, isWireless, connectionName, interfaceType);
    }

    /**
     * 4. deleteRoute(target, isWireless, connectionName)
     * Generalized Route Deletion Function.
     * Removes a static route rule from NetworkManager using nmcli:
     * `nmcli connection modify "<connectionName>" -ipv4.routes "<target>"`
     * Automatically resolves connection name dynamically if isWireless is passed.
     * Automatically appends "/32" if CIDR mask suffix is omitted.
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
     * Backward compatibility alias for CCTV camera route deletion
     */
    async removeCameraRoute(cameraIp, connectionName) {
        return this.deleteRoute(connectionName, cameraIp);
    }

    /**
     * 5. applyChanges(lanName, wifiName)
     * Restarts specified network connections using `nmcli connection up`
     * to apply new metrics and static routes immediately without rebooting the STB.
     */
    async applyChanges(lanName, wifiName) {
        const safeLanName = this.sanitizeParam(lanName);
        const safeWifiName = this.sanitizeParam(wifiName);
        const results = [];

        if (safeLanName) {
            const lanRes = await this.runCommand(`nmcli connection up "${safeLanName}"`);
            results.push({ connection: safeLanName, ...lanRes });
        }

        if (safeWifiName) {
            const wifiRes = await this.runCommand(`nmcli connection up "${safeWifiName}"`);
            results.push({ connection: safeWifiName, ...wifiRes });
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
}
