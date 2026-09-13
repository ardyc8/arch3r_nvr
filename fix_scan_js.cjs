const fs = require('fs');
let code = fs.readFileSync('public/script.js', 'utf8');

const scanLogic = `
    const btnScanNetwork = document.getElementById('btnScanNetwork');
    const scanResults = document.getElementById('scanResults');
    const scanStatus = document.getElementById('scanStatus');

    if (btnScanNetwork) {
        btnScanNetwork.addEventListener('click', async () => {
            if (!scanResults || !scanStatus) return;
            scanResults.style.display = 'block';
            scanStatus.innerHTML = '<span style="color:#eab308;">Mencari perangkat ONVIF di jaringan lokal... (Mohon tunggu sekitar 5 detik)</span>';
            
            // Hapus list lama jika ada
            const oldList = document.getElementById('scanDeviceList');
            if (oldList) oldList.remove();

            try {
                const res = await authFetch('/api/system/scan-onvif');
                const data = await res.json();
                
                if (data.success && data.devices && data.devices.length > 0) {
                    scanStatus.innerHTML = \`<span style="color:#22c55e;">Ditemukan \${data.devices.length} perangkat ONVIF.</span>\`;
                    
                    const listCont = document.createElement('div');
                    listCont.id = 'scanDeviceList';
                    listCont.style.display = 'flex';
                    listCont.style.flexDirection = 'column';
                    listCont.style.gap = '0.5rem';
                    listCont.style.marginTop = '0.75rem';

                    data.devices.forEach(dev => {
                        const devItem = document.createElement('div');
                        devItem.style.background = '#1e293b';
                        devItem.style.padding = '0.75rem';
                        devItem.style.borderRadius = '6px';
                        devItem.style.display = 'flex';
                        devItem.style.justifyContent = 'space-between';
                        devItem.style.alignItems = 'center';
                        devItem.style.border = '1px solid #334155';

                        const mainIp = dev.mainIp !== 'unknown' ? dev.mainIp : (dev.xaddrs[0] || 'Unknown IP');
                        
                        devItem.innerHTML = \`
                            <div>
                                <div style="font-weight:bold; font-size:0.9rem; color:#e2e8f0;">\${dev.name || 'Kamera ONVIF'}</div>
                                <div style="font-size:0.75rem; color:#94a3b8;">IP: \${mainIp}</div>
                            </div>
                            <button class="btn-sm btn-primary" style="font-size:0.75rem;">Gunakan</button>
                        \`;
                        
                        const useBtn = devItem.querySelector('button');
                        useBtn.onclick = () => {
                            // Buka form
                            const formBox = document.getElementById('cameraFormBox');
                            if(formBox) formBox.style.display = 'block';
                            
                            // Auto-fill
                            document.getElementById('camName').value = dev.name || 'Kamera Baru';
                            document.getElementById('camMainUrl').value = \`rtsp://admin:password@\${mainIp}:554/stream1\`;
                            document.getElementById('camSubUrl').value = \`rtsp://admin:password@\${mainIp}:554/stream2\`;
                            
                            // Enable PTZ tab and auto fill ONVIF url
                            document.getElementById('camPtzEnabled').checked = true;
                            document.getElementById('camPtzUrl').value = dev.xaddrs && dev.xaddrs.length > 0 ? dev.xaddrs[0] : \`http://\${mainIp}/onvif/device_service\`;
                            
                            scanResults.style.display = 'none';
                            alert('Data kamera berhasil disalin ke formulir. Silakan sesuaikan Username dan Password RTSP & PTZ.');
                        };
                        listCont.appendChild(devItem);
                    });
                    scanResults.appendChild(listCont);
                } else {
                    scanStatus.innerHTML = '<span style="color:#ef4444;">Tidak ada perangkat ONVIF yang ditemukan di jaringan. Pastikan kamera terhubung ke jaringan yang sama dan mendukung ONVIF.</span>';
                }
            } catch (err) {
                scanStatus.innerHTML = \`<span style="color:#ef4444;">Error: \${err.message}</span>\`;
            }
        });
    }
`;

// Insert the scan logic inside DOMContentLoaded
code = code.replace(/initBottomPlayerControls\(\);/, "initBottomPlayerControls();\n" + scanLogic);

fs.writeFileSync('public/script.js', code);
console.log('script.js updated with ONVIF scanner logic');
