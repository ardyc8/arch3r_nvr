const fs = require('fs');

let css = fs.readFileSync('public/style.css', 'utf8');

// Remove the forced height from max-width: 1024px
css = css.replace(/\.view-pane\.active\s*\{\s*height:\s*calc\(100vh\s*-\s*var\(--header-height\)\);\s*\}/g, '');

// Improve the landscape media query
css = css.replace(/@media \(max-width: 768px\) and \(orientation: landscape\) \{[\s\S]*?\}/, `
@media (max-width: 1024px) and (orientation: landscape) {
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
        flex: 1;
        height: 100%;
        overflow-y: auto;
    }
    .view-content {
        padding: 1rem !important;
        padding-bottom: 3rem !important;
    }
    .mobile-header {
        position: sticky;
        top: 0;
        z-index: 50;
    }
}
`);

// Also fix the grid layout for landscape mobile so cameras aren't squished
css += `
@media (max-width: 1024px) and (orientation: landscape) {
    .video-grid.grid-4, .video-grid.grid-9, .video-grid.grid-16 {
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) !important;
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
console.log("Responsive CSS patched.");
