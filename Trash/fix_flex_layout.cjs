const fs = require('fs');

let css = fs.readFileSync('public/style.css', 'utf8');

// Ensure main-content and view-pane are strictly adhering to flex layout
css = css.replace(/\.main-content\s*\{[^}]*\}/, '.main-content { flex: 1; display: flex; flex-direction: column; background: var(--bg-main); overflow: hidden; position: relative; width: 100%; min-width: 0; }');
css = css.replace(/\.view-pane\s*\{[^}]*\}/, '.view-pane { display: none; flex: 1; overflow-y: auto; overflow-x: hidden; width: 100%; position: absolute; top: 0; left: 0; right: 0; bottom: 0; opacity: 0; transition: opacity 0.3s ease; }');
css = css.replace(/\.view-pane\.active\s*\{[^}]*\}/, '.view-pane.active { display: flex; flex-direction: column; opacity: 1; position: relative; z-index: 10; height: 100%; min-height: 0; }');
css = css.replace(/\.view-content\s*\{[^}]*\}/, '.view-content { flex: 1; overflow-y: auto; width: 100%; }');

fs.writeFileSync('public/style.css', css);
console.log("Flex layout normalized.");
