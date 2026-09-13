const fs = require('fs');
let serverCode = fs.readFileSync('server.js', 'utf8');

const advancedScanEndpoint = `
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

    res.write('data: {"status": "started"}\\n\\n');

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
                res.write(\`data: {"progress": \${Math.round((scannedCount/totalToScan)*100)}}\\n\\n\`);
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
            res.write(\`data: {"found": \${JSON.stringify(device)}}\\n\\n\`);
        }
    }

    res.write('data: {"status": "done"}\\n\\n');
    res.end();
});
`;

// Insert the new endpoint before PTZ
serverCode = serverCode.replace(/app\.get\('\/api\/system\/scan-onvif'/m, advancedScanEndpoint + "\n\napp.get('/api/system/scan-onvif'");
fs.writeFileSync('server.js', serverCode);
console.log('Advanced IP Scanner added to server.js');
