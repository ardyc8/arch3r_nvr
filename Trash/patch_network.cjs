const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const oldNetLogic = `            for (const line of lines) {
                if (!line.includes(':')) continue;
                const [rawIf, rawData] = line.split(':');
                const ifName = rawIf.trim();
                if (ifName === 'lo') continue;

                if (prefIf !== 'auto' && ifName !== prefIf) continue;

                const cols = rawData.trim().split(/\\s+/);
                const rx = parseInt(cols[0], 10) || 0;
                const tx = parseInt(cols[8], 10) || 0;

                if (!candidateIf || (prefIf === 'auto' && (ifName.startsWith('eth') || ifName.startsWith('en') || ifName.startsWith('wlan')))) {
                    candidateIf = ifName;
                    totalRx = rx;
                    totalTx = tx;
                    if (prefIf === 'auto' && (ifName.startsWith('eth') || ifName.startsWith('end'))) break;
                }
            }`;

const newNetLogic = `            // Temukan interface aktif berdasarkan OS networkInterfaces (yang punya IPv4)
            const os = require('os');
            const nics = os.networkInterfaces();
            const activeIfs = Object.keys(nics).filter(name => name !== 'lo' && nics[name].some(addr => !addr.internal && addr.family === 'IPv4'));

            for (const line of lines) {
                if (!line.includes(':')) continue;
                const [rawIf, rawData] = line.split(':');
                const ifName = rawIf.trim();
                if (ifName === 'lo') continue;

                if (prefIf !== 'auto' && ifName !== prefIf) continue;

                const cols = rawData.trim().split(/\\s+/);
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
            }`;

code = code.replace(oldNetLogic, newNetLogic);
fs.writeFileSync('server.js', code);
console.log("Network logic patched!");
