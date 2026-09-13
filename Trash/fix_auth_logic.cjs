const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

// 1. Fix getDefaultDb
code = code.replace(/administrators: \[\s*\{[\s\S]*?\}\s*\],/, 'administrators: [],');
code = code.replace(/users: \[\s*\{[\s\S]*?\}\s*\],/, 'users: [],');

// 2. Fix login logic
code = code.replace(/const isAdminPasswordValid = adminUser && \([\s\S]*?\);/, 'const isAdminPasswordValid = adminUser && bcrypt.compareSync(password, adminUser.password);');
code = code.replace(/const isUserPasswordValid = standardUser && \([\s\S]*?\);/, 'const isUserPasswordValid = standardUser && bcrypt.compareSync(password, standardUser.password);');

fs.writeFileSync('server.js', code);
console.log('Fixed auth logic');

// 3. Clean existing database if possible
const dbPath = './data/nvr_db.json';
if (fs.existsSync(dbPath)) {
    try {
        const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        let modified = false;
        if (db.administrators && db.administrators.some(a => a.id === 'admin_root')) {
            db.administrators = db.administrators.filter(a => a.id !== 'admin_root');
            modified = true;
        }
        if (db.users && db.users.some(u => u.id === 'user_default')) {
            db.users = db.users.filter(u => u.id !== 'user_default');
            modified = true;
        }
        if (modified) {
            fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
            console.log('Cleaned up hardcoded default accounts from existing database');
        }
    } catch (e) {
        console.error('Error modifying db', e);
    }
}

