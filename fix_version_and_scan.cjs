const fs = require('fs');

// 1. Update Version in index.html
let html = fs.readFileSync('public/index.html', 'utf8');
html = html.replace(/Ver\. 9\.0\.0/g, 'Ver. 9.0.1');
fs.writeFileSync('public/index.html', html);
console.log('index.html version updated to 9.0.1');

// 2. Add ONVIF scan endpoint in server.js
let serverCode = fs.readFileSync('server.js', 'utf8');
if (!serverCode.includes('/api/system/scan-onvif')) {
    const scanEndpoint = `
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
`;
    // Insert before PTZ endpoint
    serverCode = serverCode.replace(/app\.post\('\/api\/cameras\/:id\/ptz'/m, scanEndpoint + "\napp.post('/api/cameras/:id/ptz'");
    fs.writeFileSync('server.js', serverCode);
    console.log('Added /api/system/scan-onvif to server.js');
}
