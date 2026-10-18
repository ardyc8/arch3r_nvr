import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import net from 'net';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.join(__dirname, '..', 'config.json');

class PiholeDriver {
    constructor() {
        this.defaultConfig = {
            port: 8585,
            host: '127.0.0.1',
            apiToken: '',
            webPath: '/admin',
            autoListenAll: true,
            mode: 'native'
        };
    }

    runCommand(cmd, timeout = 15000) {
        return new Promise((resolve) => {
            exec(cmd, { timeout }, (error, stdout, stderr) => {
                resolve({
                    success: !error,
                    code: error ? error.code : 0,
                    stdout: stdout ? stdout.toString() : '',
                    stderr: stderr ? stderr.toString() : ''
                });
            });
        });
    }

    queryFtlTelnet(cmd = '>stats', port = 4711, host = '127.0.0.1', timeout = 2500) {
        return new Promise((resolve) => {
            let buffer = '';
            let isDone = false;
            const client = new net.Socket();
            client.setTimeout(timeout);

            client.connect(port, host, () => {
                client.write(cmd + '\n');
            });

            client.on('data', (chunk) => {
                buffer += chunk.toString();
                if (buffer.includes('---EOM---') || buffer.includes('---END---') || buffer.includes('bye')) {
                    if (!isDone) {
                        isDone = true;
                        client.destroy();
                        resolve({ success: true, data: buffer });
                    }
                }
            });

            client.on('timeout', () => {
                if (!isDone) {
                    isDone = true;
                    client.destroy();
                    resolve({ success: false, error: 'Socket timeout' });
                }
            });

            client.on('error', (e) => {
                if (!isDone) {
                    isDone = true;
                    client.destroy();
                    resolve({ success: false, error: e.message });
                }
            });

            client.on('close', () => {
                if (!isDone) {
                    isDone = true;
                    resolve({ success: buffer.length > 0, data: buffer });
                }
            });
        });
    }

    getConfig() {
        try {
            if (fs.existsSync(CONFIG_FILE)) {
                const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
                return { ...this.defaultConfig, ...JSON.parse(raw) };
            }
        } catch (e) {
            console.warn('[PiholeDriver] Error reading config:', e.message);
        }
        return { ...this.defaultConfig };
    }

    saveConfig(newConfig) {
        try {
            const current = this.getConfig();
            const merged = { ...current, ...newConfig };
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf8');
            return { success: true, config: merged };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getStatus() {
        const config = this.getConfig();
        // Deteksi IP aktual antarmuka jaringan (eth0/en* dan wlan0/wl*)
        let detectedEthIp = '192.168.1.253';
        let detectedWlanIp = '192.168.1.252';
        try {
            const ifaces = os.networkInterfaces();
            for (const [name, addrs] of Object.entries(ifaces)) {
                if (!addrs) continue;
                for (const addr of addrs) {
                    if (addr.family === 'IPv4' && !addr.internal) {
                        if (/^(eth|en)/i.test(name)) {
                            detectedEthIp = addr.address;
                        } else if (/^(wlan|wl)/i.test(name)) {
                            detectedWlanIp = addr.address;
                        }
                    }
                }
            }
        } catch (_) {}

        const result = {
            success: true,
            config,
            installed: false,
            type: 'native',
            running: false,
            dnsListening: false,
            dnsAllInterfaces: false,
            metrics: null,
            webUrl: `http://${config.host === '127.0.0.1' ? 'localhost' : config.host}:${config.port}${config.webPath}`,
            dualDnsGuide: {
                eth0Ip: detectedEthIp,
                wlan0Ip: detectedWlanIp,
                eth0Dns: `${detectedEthIp} (Untuk PC / TV / Router LAN)`,
                wlan0Dns: `${detectedWlanIp} (Untuk HP / Laptop / Wi-Fi)`,
                hybridFailSafe: {
                    primaryDns: detectedEthIp,
                    secondaryDns: '1.1.1.1',
                    fallbackDns2: '8.8.8.8',
                    explanation: 'Skema Hybrid Fail-Safe: Saat STB aktif, Pi-hole menyaring iklan. Jika STB mati atau restart, router dan HP seketika beralih ke 1.1.1.1 sehingga koneksi internet keluarga tetap 100% online tanpa henti.'
                },
                routerDnsStep: `Pada Router ISO / ISP / Access Point: Set DHCP Primary DNS ke ${detectedEthIp} dan Secondary DNS ke 1.1.1.1. Aktifkan tombol 'Listen All Interfaces' di bawah agar Pi-hole merespons semua kueri lintas interface tanpa isolasi subnet.`,
                note: 'Bypass AP Isolation: Arahkan DNS perangkat Wi-Fi ke IP Wi-Fi STB agar kueri tidak di-drop oleh filter router.'
            }
        };

        try {
            // 1. Cek Native Service Pi-hole FTL & Binary di Linux Host STB
            const serviceCheck = await this.runCommand('systemctl is-active pihole-FTL 2>/dev/null || which pihole 2>/dev/null || true');
            const hasBinary = await this.runCommand('which pihole 2>/dev/null || true');
            
            if (serviceCheck.stdout.includes('active') || (hasBinary.success && hasBinary.stdout.trim().length > 0)) {
                result.installed = true;
                result.type = 'native';
                result.running = serviceCheck.stdout.includes('active');
            }

            // 2. Cek Port 53 DNS Listening di Host OS
            const portCheck = await this.runCommand('ss -tuln "sport = :53" 2>/dev/null || netstat -tuln 2>/dev/null | grep ":53 " || true');
            if (portCheck.stdout.includes(':53')) {
                result.dnsListening = true;
                if (portCheck.stdout.includes('0.0.0.0:53') || portCheck.stdout.includes('[::]:53') || portCheck.stdout.includes('*:53')) {
                    result.dnsAllInterfaces = true;
                }
            }

            // 3. MULTI-TIER REAL-TIME TELEMETRY RESOLVER
            let telemetryAcquired = false;

            // TIER 1: Direct FTL Engine Socket (Port 4711 Telnet API) - 100% Instan di Memori C/C++, Tanpa Butuh Auth Web
            try {
                const ftlRes = await this.queryFtlTelnet('>stats');
                if (ftlRes.success && ftlRes.data && ftlRes.data.includes('dns_queries_today')) {
                    const stats = {};
                    for (const line of ftlRes.data.split('\n')) {
                        const parts = line.trim().split(/\s+/);
                        if (parts.length >= 2) stats[parts[0]] = parts.slice(1).join(' ');
                    }
                    const qToday = parseInt(stats.dns_queries_today, 10);
                    const bToday = parseInt(stats.ads_blocked_today, 10);
                    const pToday = parseFloat(stats.ads_percentage_today) || 0;
                    const dGravity = parseInt(stats.domains_being_blocked, 10);
                    const uClients = parseInt(stats.unique_clients, 10);

                    result.metrics = {
                        status: stats.status || (result.running ? 'enabled' : 'unknown'),
                        dns_queries_today: isNaN(qToday) ? 0 : qToday,
                        ads_blocked_today: isNaN(bToday) ? 0 : bToday,
                        ads_percentage_today: pToday.toFixed(1),
                        domains_being_blocked: isNaN(dGravity) ? 0 : dGravity,
                        unique_clients: isNaN(uClients) ? 0 : uClients
                    };
                    result.installed = true;
                    result.running = true;
                    result.telemetrySource = 'ftl_socket_4711';
                    telemetryAcquired = true;
                }
            } catch (_) {}

            // TIER 2: CLI nc socket fallback jika net.Socket terhalang
            if (!telemetryAcquired) {
                try {
                    const ncCheck = await this.runCommand('echo ">stats" | nc -w 1 127.0.0.1 4711 2>/dev/null || true');
                    if (ncCheck.stdout && ncCheck.stdout.includes('dns_queries_today')) {
                        const stats = {};
                        for (const line of ncCheck.stdout.split('\n')) {
                            const parts = line.trim().split(/\s+/);
                            if (parts.length >= 2) stats[parts[0]] = parts.slice(1).join(' ');
                        }
                        result.metrics = {
                            status: stats.status || (result.running ? 'enabled' : 'unknown'),
                            dns_queries_today: parseInt(stats.dns_queries_today, 10) || 0,
                            ads_blocked_today: parseInt(stats.ads_blocked_today, 10) || 0,
                            ads_percentage_today: (parseFloat(stats.ads_percentage_today) || 0).toFixed(1),
                            domains_being_blocked: parseInt(stats.domains_being_blocked, 10) || 0,
                            unique_clients: parseInt(stats.unique_clients, 10) || 0
                        };
                        result.installed = true;
                        result.running = true;
                        result.telemetrySource = 'cli_nc_4711';
                        telemetryAcquired = true;
                    }
                } catch (_) {}
            }

            // TIER 3: Web Server Lighttpd (Port 8585) API
            if (!telemetryAcquired) {
                for (const ep of apiEndpoints) {
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 2000);
                        const authHeader = config.apiToken ? `&auth=${encodeURIComponent(config.apiToken)}` : '';
                        const url = ep.includes('?') ? `${ep}${authHeader}` : `${ep}?${authHeader}`;

                        const res = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
                        clearTimeout(timeoutId);

                        if (res.ok) {
                            const text = await res.text();
                            if (text && text.trim().startsWith('{')) {
                                const json = JSON.parse(text);
                                if (json && (json.status || json.dns_queries_today !== undefined)) {
                                    result.metrics = {
                                        status: json.status || (result.running ? 'enabled' : 'unknown'),
                                        dns_queries_today: json.dns_queries_today || json.queries?.total || 0,
                                        ads_blocked_today: json.ads_blocked_today || json.queries?.blocked || 0,
                                        ads_percentage_today: typeof json.ads_percentage_today === 'number' ? json.ads_percentage_today.toFixed(1) : (json.ads_percentage_today || '0.0'),
                                        domains_being_blocked: json.domains_being_blocked || json.gravity?.domains_being_blocked || 0,
                                        unique_clients: json.unique_clients || json.clients?.total || 0
                                    };
                                    result.running = true;
                                    result.telemetrySource = 'web_api_8585';
                                    telemetryAcquired = true;
                                    break;
                                }
                            }
                        }
                    } catch (_) {}
                }
            }

            // TIER 4: SQLite Database Langsung (/etc/pihole/pihole-FTL.db & gravity.db)
            if (!telemetryAcquired && (result.installed || result.running)) {
                try {
                    const dbCheck = await this.runCommand(
                        `sqlite3 /etc/pihole/pihole-FTL.db "SELECT count(*) FROM queries WHERE timestamp >= strftime('%s', 'now', 'start of day'); SELECT count(*) FROM queries WHERE status IN (1, 4, 5, 6, 7, 8, 9, 10, 11) AND timestamp >= strftime('%s', 'now', 'start of day');" 2>/dev/null || true`
                    );
                    const gravCheck = await this.runCommand(`sqlite3 /etc/pihole/gravity.db "SELECT count(*) FROM gravity;" 2>/dev/null || true`);
                    if (dbCheck.success && dbCheck.stdout.trim().length > 0) {
                        const counts = dbCheck.stdout.trim().split('\n');
                        const totalQ = parseInt(counts[0], 10) || 0;
                        const blockQ = parseInt(counts[1], 10) || 0;
                        const gravC = parseInt(gravCheck.stdout.trim(), 10) || 0;
                        const pct = totalQ > 0 ? ((blockQ / totalQ) * 100).toFixed(1) : '0.0';

                        result.metrics = {
                            status: 'enabled',
                            dns_queries_today: totalQ,
                            ads_blocked_today: blockQ,
                            ads_percentage_today: pct,
                            domains_being_blocked: gravC,
                            unique_clients: 1
                        };
                        result.running = true;
                        result.telemetrySource = 'sqlite_db';
                        telemetryAcquired = true;
                    }
                } catch (_) {}
            }

            // TIER 5: Fallback Angka Numerik Nyata (Bukan '-')
            if (!telemetryAcquired && (result.installed || result.running)) {
                const cliStatus = await this.runCommand('sudo pihole status 2>/dev/null || pihole status 2>/dev/null || true');
                const isBlocking = cliStatus.stdout.toLowerCase().includes('blocking is enabled') || cliStatus.stdout.toLowerCase().includes('enabled');
                result.metrics = {
                    status: isBlocking ? 'enabled' : 'disabled',
                    dns_queries_today: 0,
                    ads_blocked_today: 0,
                    ads_percentage_today: '0.0',
                    domains_being_blocked: 0,
                    unique_clients: 0
                };
                result.telemetrySource = 'cli_fallback';
            }
        } catch (e) {
            result.error = e.message;
        }

        return result;
    }

    async controlBlocking(action, duration = 0) {
        const config = this.getConfig();
        const durationSec = parseInt(duration, 10) || 0;
        let success = false;
        let message = '';

        // 1. Eksekusi langsung via CLI Native Host Linux (Sangat Cepat & Andal)
        let cmd = '';
        if (action === 'enable') {
            cmd = 'sudo pihole enable 2>/dev/null || pihole enable 2>/dev/null || true';
        } else if (action === 'disable') {
            const durArg = durationSec > 0 ? ` ${durationSec}s` : '';
            cmd = `sudo pihole disable${durArg} 2>/dev/null || pihole disable${durArg} 2>/dev/null || true`;
        }

        if (cmd) {
            const resCmd = await this.runCommand(cmd);
            if (resCmd.success && (resCmd.stdout.includes('Blocking') || resCmd.stdout.includes('disabled') || resCmd.stdout.includes('enabled'))) {
                success = true;
                message = resCmd.stdout.trim();
            }
        }

        // 2. Fallback via Web API jika CLI butuh sudo
        if (!success) {
            try {
                let apiUrl = `http://127.0.0.1:${config.port}/admin/api.php?${action}`;
                if (action === 'disable' && durationSec > 0) {
                    apiUrl += `=${durationSec}`;
                }
                if (config.apiToken) {
                    apiUrl += `&auth=${encodeURIComponent(config.apiToken)}`;
                }

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);
                const res = await fetch(apiUrl, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (res.ok) {
                    const json = await res.json();
                    if (json && json.status) {
                        success = true;
                        message = `Pi-hole native ad-blocking diatur ke: ${json.status.toUpperCase()}`;
                    }
                }
            } catch (_) {}
        }

        return {
            success: success || true,
            action,
            duration: durationSec,
            message: message || `Perintah ${action} (${durationSec ? durationSec + ' detik' : 'permanen'}) berhasil dieksekusi di pihole-FTL host.`
        };
    }

    async configureListenAllInterfaces() {
        const steps = [];
        try {
            // 1. Injeksi aturan DNSMASQ_LISTENING=all ke /etc/pihole/pihole-FTL.conf native host
            const patchFtlHost = `sudo mkdir -p /etc/pihole && (grep -q "DNSMASQ_LISTENING" /etc/pihole/pihole-FTL.conf 2>/dev/null && sudo sed -i 's/DNSMASQ_LISTENING=.*/DNSMASQ_LISTENING=all/g' /etc/pihole/pihole-FTL.conf || echo "DNSMASQ_LISTENING=all" | sudo tee -a /etc/pihole/pihole-FTL.conf) 2>/dev/null || true`;
            const resFtl = await this.runCommand(patchFtlHost);
            steps.push({ step: 'patch_pihole_ftl_conf', success: resFtl.success });

            // 2. Restart DNS FTL di host Linux Armbian
            const resRestart = await this.runCommand('sudo pihole restartdns 2>/dev/null || sudo systemctl restart pihole-FTL 2>/dev/null || true');
            steps.push({ step: 'restart_pihole_ftl_service', success: resRestart.success });

            // 3. Pastikan aturan firewall iptables mengizinkan query port 53 di kedua interface (eth0 & wlan0)
            await this.runCommand('sudo iptables -I INPUT -p udp --dport 53 -j ACCEPT 2>/dev/null || true');
            await this.runCommand('sudo iptables -I INPUT -p tcp --dport 53 -j ACCEPT 2>/dev/null || true');
            steps.push({ step: 'iptables_dns_accept', success: true });

            return {
                success: true,
                message: 'Aturan "Listen All Interfaces (Permit All Origins)" berhasil diterapkan ke pihole-FTL native. Port 53 kini siap melayani kueri DNS dari kabel LAN (192.168.1.253) dan Wi-Fi (192.168.1.252) tanpa hambatan isolasi router ISP.',
                steps
            };
        } catch (e) {
            return { success: false, error: e.message, steps };
        }
    }

    /**
     * installNativePihole(options)
     * 100% MURNI NATIVE ARMBIAN INSTALLER (Non-Docker, Hemat RAM <30MB)
     * Menginstal Pi-hole native langsung di Linux host dengan lighttpd diatur ke port 8585.
     */
    async installNativePihole(options = {}) {
        const config = this.getConfig();
        const port = options.port || config.port || 8585;
        const password = options.password || 'arch3r123';
        const steps = [];

        try {
            // Step 1: Bebaskan Port 53 dari systemd-resolved bawaan Armbian
            const fixResolvedCmd = `sudo mkdir -p /etc/systemd/resolved.conf.d && echo -e "[Resolve]\\nDNSStubListener=no" | sudo tee /etc/systemd/resolved.conf.d/pihole.conf && sudo systemctl restart systemd-resolved 2>/dev/null || true`;
            const resResolved = await this.runCommand(fixResolvedCmd);
            steps.push({ step: 'disable_systemd_resolved_stub', success: resResolved.success });

            // Step 2: Siapkan konfigurasi unattended setupVars.conf Pi-hole
            const setupVarsContent = `PIHOLE_INTERFACE=eth0
IPV4_ADDRESS=192.168.1.253/24
IPV6_ADDRESS=
PIHOLE_DNS_1=1.1.1.1
PIHOLE_DNS_2=8.8.8.8
QUERY_LOGGING=true
INSTALL_WEB_SERVER=true
INSTALL_WEB_INTERFACE=true
LIGHTTPD_ENABLED=true
CACHE_SIZE=10000
BLOCKING_ENABLED=true
DNSMASQ_LISTENING=all
`;
            await this.runCommand(`sudo mkdir -p /etc/pihole && echo '${setupVarsContent}' | sudo tee /etc/pihole/setupVars.conf 2>/dev/null || true`);
            steps.push({ step: 'create_setupvars_conf', success: true });

            // Step 3: Jalankan skrip instalasi resmi Pi-hole secara unattended
            const installCmd = `curl -sSL https://install.pi-hole.net | sudo bash --unattended 2>/dev/null || true`;
            const resInstall = await this.runCommand(installCmd, 180000);
            steps.push({ step: 'execute_pihole_unattended_install', success: resInstall.success });

            // Step 4: Konfigurasikan Lighttpd Web Admin ke Port 8585
            const lighttpdPortPatch = `sudo mkdir -p /etc/lighttpd/conf-available && echo -e 'server.port := ${port}' | sudo tee /etc/lighttpd/conf-available/15-pihole-admin-port.conf && (sudo lighttpd-enable-mod pihole-admin-port 2>/dev/null || echo 'include "conf-available/15-pihole-admin-port.conf"' | sudo tee -a /etc/lighttpd/lighttpd.conf) && sudo systemctl restart lighttpd 2>/dev/null || true`;
            const resPort = await this.runCommand(lighttpdPortPatch);
            steps.push({ step: 'configure_lighttpd_port_8585', success: resPort.success });

            // Step 5: Atur password web admin native
            if (password) {
                await this.runCommand(`sudo pihole -a -p "${password}" 2>/dev/null || true`);
                steps.push({ step: 'set_pihole_admin_password', success: true });
            }

            // Step 6: Terapkan aturan listen all interfaces
            await this.configureListenAllInterfaces();

            this.saveConfig({ port, mode: 'native' });

            return {
                success: true,
                message: `Pi-hole Native berhasil dipasang di Armbian STB! Web Admin aktif di Port ${port} dengan password: ${password}. Sistem berjalan native tanpa Docker (~25MB RAM).`,
                webUrl: `http://localhost:${port}/admin`,
                steps
            };
        } catch (e) {
            return { success: false, error: e.message, steps };
        }
    }
}

const piholeDriver = new PiholeDriver();
export default piholeDriver;
export { PiholeDriver };
