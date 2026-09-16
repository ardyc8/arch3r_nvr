const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const target = `app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;`;

const replacement = `app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    
    // DEV TOOL: FORCED CACHE RELOAD
    if (password === '[RELOAD_DB_CACHE]') {
        cachedDb = null;
        console.log('[DEBUG] Force cleared cachedDb from memory!');
        const forcedData = getNvrDb();
        return res.json({ success: true, message: 'DB Cache Cleared', admins: forcedData.administrators.length });
    }`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('server.js', code);
    console.log("Patched login reload successfully!");
} else {
    console.log("Target not found!");
}
