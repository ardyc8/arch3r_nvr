const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const newPtzLogic = `app.post('/api/cameras/:id/ptz', verifyToken, async (req, res) => {
    const { direction } = req.body;
    const cams = getCameras();
    const cam = cams.find(c => c.id === req.params.id);
    if (!cam) return res.status(404).json({ error: 'Camera not found' });
    
    if (!cam.ptzEnabled) return res.status(400).json({ error: 'PTZ is not enabled for this camera' });

    try {
        const onvif = require('node-onvif');
        let ptzUrl = cam.ptzUrl || '';
        let ptzUser = cam.ptzUser || '';
        let ptzPass = cam.ptzPass || '';

        // If no explicit ptzUrl was provided, fallback to parsing RTSP
        if (!ptzUrl) {
            const urlObj = new URL(cam.mainStreamUrl);
            ptzUrl = urlObj.hostname;
            if (!ptzUser) ptzUser = decodeURIComponent(urlObj.username || '');
            if (!ptzPass) ptzPass = decodeURIComponent(urlObj.password || '');
        }

        // Clean up ptzUrl if it's just an IP address
        if (!ptzUrl.startsWith('http')) {
            ptzUrl = 'http://' + ptzUrl;
        }
        if (ptzUrl.split('/').length < 4) {
            ptzUrl = ptzUrl.replace(/\\/$/, '') + '/onvif/device_service';
        }

        let device = new onvif.OnvifDevice({
            xaddr: ptzUrl,
            user: ptzUser,
            pass: ptzPass
        });
        
        try {
            await device.init();
        } catch(e) {
            // Fallback for common ports if explicit port was not provided and it failed
            const urlObj = new URL(ptzUrl);
            const host = urlObj.hostname;
            const ports = [8899, 80, 8080, 2020];
            let success = false;
            let lastErr = e;
            for (const port of ports) {
                try {
                    device = new onvif.OnvifDevice({
                        xaddr: \`http://\${host}:\${port}/onvif/device_service\`,
                        user: ptzUser,
                        pass: ptzPass
                    });
                    await device.init();
                    success = true;
                    break;
                } catch(err) { lastErr = err; }
            }
            if (!success) throw new Error(\`Gagal terhubung ke ONVIF: \${lastErr.message}\`);
        }
`;

code = code.replace(/app\.post\('\/api\/cameras\/:id\/ptz', verifyToken, async \(req, res\) => \{[\s\S]*?if \(\!device\) throw new Error\([^)]+\);/m, newPtzLogic);

fs.writeFileSync('server.js', code);
console.log('PTZ logic patched properly');
