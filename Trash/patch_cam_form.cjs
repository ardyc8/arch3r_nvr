const fs = require('fs');
let code = fs.readFileSync('public/index.html', 'utf8');

// Inject custom camera ID field in the General tab
const generalTarget = `<div class="form-group">
                                    <label>Nama Kamera</label>
                                    <input type="text" id="camName" placeholder="Contoh: Kamera Garasi / Kasir" required>
                                </div>`;

const generalInjection = `<div class="form-group">
                                    <label>Custom ID (Opsional, alfanumerik tanpa spasi)</label>
                                    <input type="text" id="camCustomId" placeholder="Contoh: cam_garasi_1">
                                </div>
                                <div class="form-group">
                                    <label>Nama Kamera</label>
                                    <input type="text" id="camName" placeholder="Contoh: Kamera Garasi / Kasir" required>
                                </div>`;

code = code.replace(generalTarget, generalInjection);

// Replace "Aktifkan Kontrol PTZ (ONVIF)" with "Dukungan ONVIF (PTZ)"
const onvifTarget = `<div class="form-group row-check" style="margin-bottom:1rem;">
                                    <input type="checkbox" id="camPtzEnabled">
                                    <label for="camPtzEnabled" style="font-weight:600;">Aktifkan Kontrol PTZ (ONVIF)</label>
                                </div>`;

const onvifInjection = `<div class="form-group row-check" style="margin-bottom:1rem;">
                                    <input type="checkbox" id="camPtzEnabled">
                                    <label for="camPtzEnabled" style="font-weight:600;">Aktifkan ONVIF (PTZ, Preset, dll)</label>
                                </div>`;

code = code.replace(onvifTarget, onvifInjection);

fs.writeFileSync('public/index.html', code);
console.log("Camera form patched.");
