const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const target = `    let data = tryParseFile(nvrDbFile);

    // Jika file utama korup / kosong, ambil dari backup otomatis
    if (!data) {
        data = tryParseFile(safeBackupFile) || tryParseFile(legacyBackupFile);
        if (data) {
            console.log('[DB] Berhasil memulihkan database dari safe backup!');
        }
    }`;

const replacement = `    let data = tryParseFile(nvrDbFile);

    // Cek apakah data kosong akibat file tertimpa (misalnya saat git pull)
    const isMainEmpty = data && (!data.administrators || data.administrators.length === 0) && (!data.cameras || data.cameras.length === 0);

    // Jika file utama korup / kosong, ambil dari backup otomatis
    if (!data || isMainEmpty) {
        let backupData = tryParseFile(safeBackupFile) || tryParseFile(legacyBackupFile);
        const isBackupHasData = backupData && ((backupData.administrators && backupData.administrators.length > 0) || (backupData.cameras && backupData.cameras.length > 0));
        
        if (isBackupHasData) {
            data = backupData;
            console.log('[DB] Berhasil memulihkan database dari safe backup! (Menimpa file kosong)');
            
            // Simpan ulang ke nvrDbFile agar sinkron
            fs.writeFileSync(nvrDbFile, JSON.stringify(data, null, 2));
        }
    }`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('server.js', code);
    console.log("Patched successfully!");
} else {
    console.log("Target not found!");
}
