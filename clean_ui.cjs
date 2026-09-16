const fs = require('fs');

// 1. CLEAN UP SUPERADMIN.HTML
let html = fs.readFileSync('public/superadmin.html', 'utf8');

// Remove the bad inline media query
const badStyleRegex = /<style>[\s\S]*?height:\s*calc\(100vh\s*-\s*120px\);[\s\S]*?<\/style>/g;
html = html.replace(badStyleRegex, `
<style>
@media (max-width: 768px) {
    .zone-bahaya-mobile {
        padding-left: 0 !important;
        border-left: none !important;
        border-top: 1px solid var(--border);
        padding-top: 1.5rem;
        margin-top: 1rem;
        width: 100% !important;
    }
}
</style>
`);

// Clean up "berlebih-lebih" styling (Remove inline colored backgrounds and colored borders)
html = html.replace(/;\s*border-color:#[a-fA-F0-9]{3,6}/g, '');
html = html.replace(/background:rgba\([^)]+\)/g, 'background:var(--bg-lighter)');
html = html.replace(/;\s*color:#[a-fA-F0-9]{3,6}/g, '');
// Keep some essential colors like standard text or specific indicators, but remove the flashy ones on cards
html = html.replace(/border:1px solid #[a-fA-F0-9]{3,6}/g, 'border:1px solid var(--border)');
html = html.replace(/style="background:#ef4444;.*?border-color:#ef4444;"/g, 'class="btn btn-primary" style="background:#ef4444;"'); // danger button

// Rewrite some specific over-styled divs
html = html.replace(/background:var\(--bg-lighter\); padding:1rem; border-radius:6px; border:1px solid var\(--border\);/g, 'background:var(--surface); padding:1rem; border-radius:6px; border:1px solid var(--border);');
html = html.replace(/background:#8b5cf6/g, 'background:var(--accent-blue)'); // use standard primary button color

fs.writeFileSync('public/superadmin.html', html);
console.log("superadmin.html cleaned up.");

// 2. TWEAK STYLE.CSS FOR LANDSCAPE
let css = fs.readFileSync('public/style.css', 'utf8');

// Add responsive padding to view-content
if (!css.includes('.view-content { padding:')) {
    css += `
@media (max-width: 768px) {
    .view-content {
        padding: 1rem !important;
    }
}
@media (max-width: 768px) and (orientation: landscape) {
    .view-pane.active {
        height: auto;
        min-height: calc(100vh - var(--header-height));
    }
    .main-content {
        height: auto;
        overflow-y: auto;
    }
    .view-content {
        padding: 0.75rem !important;
    }
}
`;
    fs.writeFileSync('public/style.css', css);
    console.log("style.css responsive tweaks added.");
}
