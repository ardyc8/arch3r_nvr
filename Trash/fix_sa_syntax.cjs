const fs = require('fs');
let code = fs.readFileSync('public/superadmin.js', 'utf8');

const oldLeftover = `
            if (res.ok) {
                alert('Kunci Lisensi Global berhasil disimpan!');
            } else {
                alert('Gagal menyimpan lisensi.');
            }
        } catch (err) {
            alert('Kesalahan koneksi saat menyimpan lisensi.');
        }
    });`;

code = code.replace(oldLeftover, '');
fs.writeFileSync('public/superadmin.js', code);
console.log('Cleaned up leftover code');
