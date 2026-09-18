const fs = require('fs');

let serverCode = fs.readFileSync('server.js', 'utf8');

// Fix the /api/addons logic to ALWAYS include YOLO AI if missing
const oldAddonsLogic = `    const dbData = getNvrDb();
    if (!dbData.addons) {
        dbData.addons = [
            {
                id: 'ai_yolo',
                name: 'AI Human Detection (YOLOv8)',
                version: '1.0.0',
                icon: '🧠',
                description: 'Deteksi pergerakan manusia secara real-time dan atur area intrusi (Grid).',
                active: true,
                system_protected: true
            }
        ];
        saveNvrDb(dbData);
    }`;

const newAddonsLogic = `    const dbData = getNvrDb();
    if (!dbData.addons) {
        dbData.addons = [];
    }
    
    // Ensure built-in YOLO AI addon is always present
    const hasYolo = dbData.addons.find(a => a.id === 'ai_yolo');
    if (!hasYolo) {
        dbData.addons.push({
            id: 'ai_yolo',
            name: 'AI Human Detection (YOLOv8)',
            version: '1.0.0',
            icon: '🧠',
            description: 'Deteksi pergerakan manusia secara real-time dan atur area intrusi (Grid).',
            active: true,
            system_protected: true
        });
        saveNvrDb(dbData);
    }`;

serverCode = serverCode.replace(oldAddonsLogic, newAddonsLogic);
fs.writeFileSync('server.js', serverCode);

console.log('Fixed server.js');
