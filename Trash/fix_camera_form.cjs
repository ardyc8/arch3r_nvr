const fs = require('fs');
let code = fs.readFileSync('public/index.html', 'utf8');

// Add PTZ tab button
if (!code.includes('data-target="ctab-ptz"')) {
    code = code.replace(/<button type="button" class="ctab-btn" data-target="ctab-storage">Storage<\/button>/, '<button type="button" class="ctab-btn" data-target="ctab-storage">Storage</button>\n                            <button type="button" class="ctab-btn" data-target="ctab-ptz">PTZ</button>');
}

// Add PTZ tab pane
const ptzPane = `
                            <div id="ctab-ptz" class="ctab-pane">
                                <div class="form-group row-check" style="margin-bottom:1rem;">
                                    <input type="checkbox" id="camPtzEnabled">
                                    <label for="camPtzEnabled" style="font-weight:600;">Aktifkan Kontrol PTZ (ONVIF)</label>
                                </div>
                                <div class="form-group">
                                    <label>URL ONVIF / IP PTZ</label>
                                    <input type="text" id="camPtzUrl" placeholder="http://192.168.1.100:80/onvif/device_service (Atau cukup IP saja)">
                                    <small style="color:var(--text-muted);">Isi dengan IP Kamera atau URL lengkap ONVIF.</small>
                                </div>
                                <div class="form-row">
                                    <div class="form-group flex-1">
                                        <label>Username PTZ</label>
                                        <input type="text" id="camPtzUser">
                                    </div>
                                    <div class="form-group flex-1">
                                        <label>Password PTZ</label>
                                        <input type="password" id="camPtzPass">
                                    </div>
                                </div>
                            </div>
`;

if (!code.includes('id="ctab-ptz"')) {
    code = code.replace(/<div class="form-actions mt-3">/, ptzPane + '\n                            <div class="form-actions mt-3">');
}

fs.writeFileSync('public/index.html', code);
console.log('index.html updated for PTZ tab');
