const fs = require('fs');
let data = fs.readFileSync('data/nvr_db.json', 'utf8');
console.log(data);
