const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, 'licenses.json');

// Helper untuk membaca DB
function getDb() {
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify({ clients: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

// Helper untuk menyimpan DB
function saveDb(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// -------------------------------------------------------------
// ENDPOINT 1: Ditembak oleh STB Klien (Opportunistic Check)
// -------------------------------------------------------------
app.post('/api/license/verify', (req, res) => {
    const { machineId, license, timestamp } = req.body;
    
    if (!machineId || !license) {
        return res.status(400).json({ error: "Data tidak lengkap" });
    }

    const db = getDb();
    const client = db.clients.find(c => c.machineId === machineId);

    if (!client) {
        // Klien belum terdaftar di master server (Anda bisa mendaftarkannya otomatis, atau menolaknya)
        // Disini kita daftarkan otomatis dengan status 'active' sebagai log awal
        db.clients.push({
            machineId: machineId,
            license: license,
            status: 'active',
            last_ping: timestamp || Date.now(),
            ip_address: req.ip
        });
        saveDb(db);
        return res.json({ valid: true, revoked: false });
    }

    // Update waktu ping terakhir
    client.last_ping = Date.now();
    client.ip_address = req.ip;
    saveDb(db);

    // CEK STATUS KILL SWITCH
    if (client.status === 'revoked') {
        console.log(`[REVOKED] STB ${machineId} mencoba online, mengirimkan sinyal Kill-Switch!`);
        return res.json({ valid: false, revoked: true });
    }

    // Normal
    return res.json({ valid: true, revoked: false });
});

// -------------------------------------------------------------
// ENDPOINT 2: Panel Admin Anda (Untuk mencabut/melihat lisensi)
// -------------------------------------------------------------
// GET /api/admin/clients -> Lihat daftar klien
app.get('/api/admin/clients', (req, res) => {
    // TIPS: Tambahkan autentikasi (API Key / Password) di sini untuk produksi!
    res.json(getDb());
});

// POST /api/admin/revoke -> Cabut lisensi klien nakal
app.post('/api/admin/revoke', (req, res) => {
    const { machineId } = req.body;
    const db = getDb();
    const client = db.clients.find(c => c.machineId === machineId);
    
    if (client) {
        client.status = 'revoked';
        saveDb(db);
        return res.json({ success: true, message: `Lisensi STB ${machineId} telah dicabut.` });
    }
    return res.status(404).json({ error: "Machine ID tidak ditemukan" });
});

// POST /api/admin/restore -> Pulihkan lisensi klien
app.post('/api/admin/restore', (req, res) => {
    const { machineId } = req.body;
    const db = getDb();
    const client = db.clients.find(c => c.machineId === machineId);
    
    if (client) {
        client.status = 'active';
        saveDb(db);
        return res.json({ success: true, message: `Lisensi STB ${machineId} dipulihkan.` });
    }
    return res.status(404).json({ error: "Machine ID tidak ditemukan" });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Master License Server berjalan di port ${PORT}`);
});
