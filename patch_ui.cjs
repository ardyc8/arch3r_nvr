const fs = require('fs');
let code = fs.readFileSync('public/superadmin.js', 'utf8');

const target = `                const res = await authFetch('/api/superadmin/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ license, email })
                });
                const data = await res.json();
                if (data.success) {
                    if (data.licenseValid) {
                        alert('✅ AKTIVASI SUKSES!\\n\\nLisensi berhasil diverifikasi. Status NVR sekarang: PREMIUM AKTIF.');
                    } else {
                        alert('⚠️ LISENSI TERSIMPAN TAPI BELUM AKTIF!\\n\\nPenyebab:\\n' + (data.licenseReason || 'Token tidak cocok dengan Machine ID atau Email') + '\\n\\nSilakan periksa detailnya di kotak status merah di bawah ini.');
                    }
                    window.location.reload();
                }`;

const replacement = `                const res = await authFetch('/api/superadmin/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ license, email })
                });
                const data = await res.json();
                if (data.success) {
                    if (data.licenseValid) {
                        alert('✅ AKTIVASI SUKSES!\\n\\nLisensi berhasil diverifikasi. Status NVR sekarang: PREMIUM AKTIF.');
                    } else {
                        alert('⚠️ LISENSI TERSIMPAN TAPI BELUM AKTIF!\\n\\nPenyebab:\\n' + (data.licenseReason || 'Token tidak cocok dengan Machine ID atau Email') + '\\n\\nSilakan periksa detailnya di kotak status merah di bawah ini.');
                    }
                    window.location.reload();
                } else {
                    alert('❌ GAGAL AKTIVASI:\\n\\n' + (data.error || 'Terjadi kesalahan dari server.'));
                }`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('public/superadmin.js', code);
    console.log("Patched UI successfully!");
} else {
    console.log("Target not found!");
}
