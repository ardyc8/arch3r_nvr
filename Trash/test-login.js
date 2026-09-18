import fs from 'fs';
import path from 'path';

let db = JSON.parse(fs.readFileSync('data/nvr_db.json', 'utf8'));
db.administrators = [
    {
        "id": "admin_123",
        "username": "admin",
        "password": "plainpassword",
        "name": "Admin"
    }
];
fs.writeFileSync('data/nvr_db.json', JSON.stringify(db, null, 2));
