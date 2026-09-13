const fs = require('fs');
let code = fs.readFileSync('public/script.js', 'utf8');

const advancedScanJs = `
    const btnStartAdvancedScan = document.getElementById('btnStartAdvancedScan');
    if (btnStartAdvancedScan) {
        btnStartAdvancedScan.addEventListener('click', async () => {
            const startIp = document.getElementById('scanStartIp').value;
            const endIp = document.getElementById('scanEndIp').value;
            const ports = document.getElementById('scanPorts').value;
            
            const scanResults = document.getElementById('scanResults');
            const scanStatus = document.getElementById('scanStatus');
            
            if(!scanResults || !scanStatus) return;
            
            scanResults.style.display = 'block';
            scanStatus.innerHTML = '<span style="color:#eab308;">Mencari (0%)...</span>';
            
            const oldList = document.getElementById('scanDeviceList');
            if (oldList) oldList.remove();
            
            const listCont = document.createElement('div');
            listCont.id = 'scanDeviceList';
            listCont.style.display = 'flex';
            listCont.style.flexDirection = 'column';
            listCont.style.gap = '0.5rem';
            listCont.style.marginTop = '0.75rem';
            scanResults.appendChild(listCont);

            try {
                const response = await fetch('/api/system/scan-advanced', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + getAuthToken()
                    },
                    body: JSON.stringify({ startIp, endIp, ports })
                });

                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let done = false;
                let foundDevices = 0;

                while (!done) {
                    const { value, done: readerDone } = await reader.read();
                    done = readerDone;
                    if (value) {
                        const chunk = decoder.decode(value, { stream: true });
                        const lines = chunk.split('\\n\\n');
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const dataStr = line.replace('data: ', '');
                                try {
                                    const data = JSON.parse(dataStr);
                                    if (data.progress) {
                                        scanStatus.innerHTML = \`<span style="color:#eab308;">Mencari (\${data.progress}%)... Ditemukan \${foundDevices} perangkat.</span>\`;
                                    } else if (data.found) {
                                        foundDevices++;
                                        const dev = data.found;
                                        const devItem = document.createElement('div');
                                        devItem.style.background = '#1e293b';
                                        devItem.style.padding = '0.75rem';
                                        devItem.style.borderRadius = '6px';
                                        devItem.style.display = 'flex';
                                        devItem.style.justifyContent = 'space-between';
                                        devItem.style.alignItems = 'center';
                                        devItem.style.border = '1px solid #334155';
                                        
                                        let portStr = dev.ports.join(', ');
                                        
                                        devItem.innerHTML = \`
                                            <div>
                                                <div style="font-weight:bold; font-size:0.9rem; color:#e2e8f0;">\${dev.name} (\${dev.ip})</div>
                                                <div style="font-size:0.75rem; color:#94a3b8;">Port Terbuka: \${portStr}</div>
                                            </div>
                                            <button class="btn-sm btn-primary" style="font-size:0.75rem;">Gunakan</button>
                                        \`;
                                        
                                        devItem.querySelector('button').onclick = () => {
                                            document.getElementById('cameraFormBox').style.display = 'block';
                                            document.getElementById('camName').value = 'Kamera ' + dev.ip;
                                            document.getElementById('camMainUrl').value = \`rtsp://admin:password@\${dev.ip}:554/stream1\`;
                                            document.getElementById('camSubUrl').value = \`rtsp://admin:password@\${dev.ip}:554/stream2\`;
                                            document.getElementById('camPtzEnabled').checked = dev.isOnvif;
                                            
                                            // Asumsi port ONVIF pertama
                                            const onvifPort = dev.ports.find(p => p !== 554) || 80;
                                            document.getElementById('camPtzUrl').value = \`http://\${dev.ip}:\${onvifPort}/onvif/device_service\`;
                                            
                                            document.getElementById('advancedScanBox').style.display = 'none';
                                            alert('Data IP disalin. Sesuaikan Username dan Password!');
                                        };
                                        listCont.appendChild(devItem);
                                    } else if (data.status === 'done') {
                                        scanStatus.innerHTML = \`<span style="color:#22c55e;">Selesai! Ditemukan \${foundDevices} perangkat terbuka.</span>\`;
                                    }
                                } catch (e) {}
                            }
                        }
                    }
                }
            } catch(e) {
                scanStatus.innerHTML = \`<span style="color:#ef4444;">Error: \${e.message}</span>\`;
            }
        });
    }
`;

code = code.replace(/if \(btnScanNetwork\) \{[\s\S]*?\}\);[\n\s]*\}/m, advancedScanJs);

fs.writeFileSync('public/script.js', code);
console.log('Advanced Scan JS updated');
