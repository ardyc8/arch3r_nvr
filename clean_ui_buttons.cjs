const fs = require('fs');

let html = fs.readFileSync('public/superadmin.html', 'utf8');

// Remove redundant inline backgrounds for buttons
html = html.replace(/style="[^"]*background:\s*var\(--accent-blue\)[^"]*"/g, (match) => {
    return match.replace(/background:\s*var\(--accent-blue\);?\s*/g, '');
});

html = html.replace(/style="[^"]*background:\s*#8b5cf6[^"]*"/g, (match) => {
    return match.replace(/background:\s*#8b5cf6;?\s*/g, '');
});

// The modal overlay was set to var(--bg-lighter), let's make it standard modal overlay
html = html.replace(/background:var\(--bg-lighter\); z-index:9999;/g, 'background:rgba(0,0,0,0.8); z-index:9999;');

fs.writeFileSync('public/superadmin.html', html);
console.log("Button styles cleaned up.");
