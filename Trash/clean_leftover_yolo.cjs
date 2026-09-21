const fs = require('fs');

console.log("Completely cleaning leftover HTML scripts and old AI engine modals from public/index.html...");

let html = fs.readFileSync('public/index.html', 'utf8');

// Update version tag in index.html to 10.2.9
html = html.replace(/Arch3r NVR Ver\. 10\.\d+\.\d+/g, 'Arch3r NVR Ver. 10.2.9');
html = html.replace(/Ver\. 10\.\d+\.\d+/g, 'Ver. 10.2.9');

// Replace everything from `<div id="modal-ai-settings" style="display:none;"></div>` up to `<!-- 9. VIEW ABOUT -->`
const startMarker = '<div id="modal-ai-settings" style="display:none;"></div>';
const endMarker = '<!-- 9. VIEW ABOUT -->';

const startIndex = html.indexOf(startMarker);
const endIndex = html.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const cleanReplacement = `<div id="modal-ai-settings" style="display:none;"></div>
                </div>
            </div>

            `;

    html = html.substring(0, startIndex) + cleanReplacement + html.substring(endIndex);
    fs.writeFileSync('public/index.html', html, 'utf8');
    console.log("public/index.html cleaned successfully!");
} else {
    console.error("Could not locate start or end markers in public/index.html");
    console.log("startIndex:", startIndex, "endIndex:", endIndex);
}
