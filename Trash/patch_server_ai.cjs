const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const targetHook = `// ==========================================
// MAINTENANCE & OTA API (v9.3.15)`;

const aiEndpoints = `// ==========================================
// AI ADDON PROXY API (v9.4.0)
// ==========================================
app.post('/api/ai/save_grid', verifyToken, async (req, res) => {
    try {
        // Forward ke Python YOLO service
        const payload = req.body;
        // Kita perlu menyertakan rtsp URL agar Python bisa connect
        const db = getNvrDb();
        const cam = db.cameras.find(c => c.id === payload.camera_id);
        if(!cam) return res.status(404).json({ error: 'Kamera tidak ditemukan' });
        
        payload.rtsp_url = cam.mainStreamUrl || cam.subStreamUrl;
        
        const response = await fetch('http://127.0.0.1:8000/api/ai/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if(!response.ok) throw new Error('YOLO Service Python menolak request atau tidak aktif.');
        const result = await response.json();
        
        // Simpan konfig AI ke nvr_db.json (agar persisten saat reboot)
        if(!cam.ai_config) cam.ai_config = {};
        cam.ai_config.grid = payload;
        saveNvrDb(db);
        
        sysLog('INFO', \`[AI Addon] Area deteksi diperbarui untuk kamera \${cam.name}\`, 'SYSTEM');
        res.json(result);
    } catch(e) {
        res.status(500).json({ error: "Gagal terhubung ke Service Python (Apakah addons/ai_yolo_service.py sudah jalan?): " + e.message });
    }
});

// Endpoint yang dipanggil oleh Python saat mendeteksi manusia
app.post('/api/ai/webhook', (req, res) => {
    // Di sini kita bisa meneruskan event deteksi ke frontend (misal via Server-Sent Events / Socket)
    // atau sekadar mencatatnya di Log NVR.
    const { camera_id, event, grid_cell } = req.body;
    sysLog('WARN', \`[AI ALARM] Deteksi Manusia pada \${camera_id} (Petak: \${grid_cell})\`, 'SECURITY');
    res.json({received: True});
});

`;

if (code.includes(targetHook)) {
    code = code.replace(targetHook, aiEndpoints + '\n' + targetHook);
    fs.writeFileSync('server.js', code);
    console.log("Server AI API patched.");
} else {
    console.log("Target hook not found in server.js, maybe OTA was not injected earlier.");
}
