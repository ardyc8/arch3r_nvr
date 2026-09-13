const fs = require('fs');

let html = fs.readFileSync('public/superadmin.html', 'utf8');

const oldText = `Tindakan ini akan mengembalikan seluruh pengaturan database (User, Kamera, Storage) ke kondisi default pabrik. Rekaman MP4 di penyimpanan tidak dihapus.`;

const newText = `Tindakan ini akan menghapus dan membuat ulang file database inti NVR. Berikut rincian data yang akan <strong>dihapus permanen</strong>:<br>
                                    <ul style="margin-top:0.5rem; margin-bottom:0.5rem; padding-left:1.2rem; color:#ef4444;">
                                        <li><strong>File:</strong> <code>/data/nvr_db.json</code> (Berisi User, Kamera, Log, Storage)</li>
                                        <li>Lisensi NVR akan dinonaktifkan.</li>
                                    </ul>
                                    <em>*File rekaman video (MP4) di Hardisk/Flashdisk TIDAK akan terhapus.</em>`;

html = html.replace(oldText, newText);
html = html.replace(/Arch3r NVR \(Ver\. 9\.0\.4\)/g, "Arch3r NVR (Ver. 9.0.5)");

fs.writeFileSync('public/superadmin.html', html);

let readme = fs.readFileSync('README.md', 'utf8');
readme = readme.replace(/Ver\. 9\.0\.4/g, 'Ver. 9.0.5');
fs.writeFileSync('README.md', readme);

console.log('UI patched!');
