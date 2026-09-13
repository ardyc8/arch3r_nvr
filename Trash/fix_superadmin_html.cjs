const fs = require('fs');
let html = fs.readFileSync('public/superadmin.html', 'utf8');

const newForm = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                    <h3 style="margin:0; font-size:1.1rem; display:flex; align-items:center; gap:0.5rem;">
                        <span>📜</span> Lisensi & Aktivasi
                    </h3>
                    <span id="saLicenseBadge" class="badge" style="background:#64748b; font-size:0.75rem; padding:2px 6px; border-radius:4px;">MEMUAT...</span>
                </div>
                
                <div style="background:var(--surface-dark); padding:0.75rem; border-radius:6px; border:1px dashed var(--border); margin-bottom:1rem;">
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.25rem;">Machine ID (Berikan ID ini kepada Developer):</div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span id="saMachineId" style="font-family:monospace; font-size:1.1rem; color:#60a5fa; font-weight:bold;">MEMUAT...</span>
                        <button type="button" class="btn-sm btn-secondary" onclick="navigator.clipboard.writeText(document.getElementById('saMachineId').innerText); alert('Machine ID Disalin!');" style="padding:2px 8px; font-size:0.7rem;">Salin</button>
                    </div>
                </div>
                
                <div id="trialInfoBox" style="margin-bottom:1rem; padding:0.75rem; border-radius:6px; font-size:0.8rem; text-align:center; display:none;"></div>

                <form id="saLicenseForm">
                    <div class="form-group">
                        <label>Email Terdaftar</label>
                        <input type="email" id="saEmail" placeholder="email@perusahaan.com" required>
                    </div>
                    <div class="form-group">
                        <label>License Key (Token Kriptografi)</label>
                        <textarea id="saLicenseKey" rows="3" placeholder="eyJlbWFpb... (Tempel Token Disini)" required style="width:100%; padding:0.5rem; background:#0f172a; color:#fff; border:1px solid #334155; border-radius:6px; font-family:monospace; font-size:0.8rem; line-height:1.4; resize:vertical;"></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary" style="background:#8b5cf6; width:100%;">Aktivasi / Simpan Lisensi</button>
                </form>
`;

html = html.replace(/<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">[\s\S]*?<\/form>/, newForm.trim());
fs.writeFileSync('public/superadmin.html', html);
console.log('Superadmin HTML updated');
