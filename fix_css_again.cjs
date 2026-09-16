const fs = require('fs');
let css = fs.readFileSync('public/style.css', 'utf8');

// Insert global .view-content if it doesn't exist at the root
if (!css.includes('.view-content { flex: 1;')) {
    css = css.replace('.view-pane.active {', '.view-content { flex: 1; overflow-y: auto; width: 100%; box-sizing: border-box; }\n.view-pane.active {');
}

// Restore the media query padding
css = css.replace(/@media \(max-width: 768px\) \{\s*\.view-content\s*\{ flex: 1; overflow-y: auto; width: 100%; \}\s*\}/g, '@media (max-width: 768px) { .view-content { padding: 1rem !important; } }');

fs.writeFileSync('public/style.css', css);
