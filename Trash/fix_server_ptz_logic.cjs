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
        if (ptzUrl.split('/').length < 4) { // Only http://IP:PORT without path
            ptzUrl = ptzUrl.replace(/\/$/, '') + '/onvif/device_service';
        }

        const device = new onvif.OnvifDevice({
            xaddr: ptzUrl,
            user: ptzUser,
            pass: ptzPass
        });
        
        await device.init();
`;

code = code.replace(/app\.post\('\/api\/cameras\/:id\/ptz', verifyToken, async \(req, res\) => \{[\s\S]*?await device\.init\(\);/m, newPtzLogic);

fs.writeFileSync('server.js', code);
console.log('PTZ execution logic updated');
