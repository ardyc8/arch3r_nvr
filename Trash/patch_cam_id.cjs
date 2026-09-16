const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// Use custom ID when creating camera
const targetStr = `const newCamId = id || \`cam_\${Date.now()}\`;`;
const replacementStr = `// If id is provided and not empty, use it; otherwise generate
    let newCamId = (id && typeof id === 'string' && id.trim() !== '') ? id.trim() : \`cam_\${Date.now()}\`;
    
    // Check for ID collision
    const existingIds = (dbData.cameras || []).map(c => c.id);
    if (existingIds.includes(newCamId)) {
        return res.status(400).json({ error: 'Camera ID sudah digunakan. Harap gunakan ID yang unik.' });
    }
`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('server.js', code);
console.log("server.js camera ID patched.");
