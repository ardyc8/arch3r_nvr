const fs = require('fs');
let code = fs.readFileSync('public/index.html', 'utf8');

if (!code.includes('.grid-4')) {
    // Inject missing grid styles
    const target = `</style>`;
    const gridStyles = `
        .grid-1 { grid-template-columns: 1fr; grid-template-rows: 1fr; }
        .grid-4 { grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr); }
        .grid-9 { grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); }
        .grid-16 { grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(4, 1fr); }
    `;
    code = code.replace(target, gridStyles + '\n    ' + target);
    fs.writeFileSync('public/index.html', code);
    console.log("Grid styles injected.");
} else {
    console.log("Grid styles already present.");
}
