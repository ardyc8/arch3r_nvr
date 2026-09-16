const fs = require('fs');
const path = require('path');
const dataDir = path.join(__dirname, 'data');
const dbFile = path.join(dataDir, 'nvr_db.json');

const db = JSON.parse(fs.readFileSync(dbFile));
console.log("Before:", db.super_settings.ota_github_url);

db.super_settings.ota_github_url = "https://api.github.com/repos/user/test/releases/latest";
fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));

const dbAfter = JSON.parse(fs.readFileSync(dbFile));
console.log("After:", dbAfter.super_settings.ota_github_url);
