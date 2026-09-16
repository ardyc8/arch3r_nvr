const fs = require('fs');

let css = fs.readFileSync('public/style.css', 'utf8');

// Find where the first @media (max-width: 768px) is and strip everything after
const mediaIndex = css.indexOf('@media (max-width: 768px) {');
if (mediaIndex !== -1) {
    css = css.substring(0, mediaIndex);
}

// Ensure .view-content is a global class
if (!css.includes('.view-content {')) {
    css = css.replace('.view-pane.active {', '.view-content { flex: 1; overflow-y: auto; width: 100%; box-sizing: border-box; }\n.view-pane.active {');
}

// Append clean responsive rules
css += `
/* --- UNIFIED RESPONSIVE SYSTEM --- */

@media (max-width: 768px) {
    .view-content {
        padding: 1rem !important;
    }
}

@media (max-width: 1024px) {
    .app-layout {
        height: 100vh;
        overflow: hidden;
    }
    .main-content {
        height: 100%;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }
    .view-pane.active {
        display: flex;
        flex-direction: column;
        flex: 1;
        height: 100%;
        min-height: 0;
        overflow-y: auto;
    }
    .mobile-header {
        position: sticky;
        top: 0;
        z-index: 50;
        flex-shrink: 0;
    }
}

@media (max-width: 1024px) and (orientation: landscape) {
    .view-content {
        padding: 0.75rem !important;
        padding-bottom: 2rem !important;
    }
    .mobile-header {
        height: 48px;
        min-height: 48px;
    }
    /* Fix grid so videos aren't squished flat in landscape */
    .video-grid.grid-4, .video-grid.grid-9, .video-grid.grid-16 {
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)) !important;
        grid-auto-rows: min-content;
        height: auto !important;
        align-content: start;
    }
    .cam-cell {
        aspect-ratio: 16/9;
        min-height: unset;
        height: auto;
    }
}
`;

fs.writeFileSync('public/style.css', css);
console.log("Rewritten responsive CSS.");
