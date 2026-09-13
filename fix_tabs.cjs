const fs = require('fs');
let code = fs.readFileSync('public/index.html', 'utf8');

const correctTabs = `                        <div class="cam-inner-tabs">
                            <button type="button" class="ctab-btn active" data-target="ctab-general">General</button>
                            <button type="button" class="ctab-btn" data-target="ctab-streams">Streams</button>
                            <button type="button" class="ctab-btn" data-target="ctab-storage">Storage</button>
                            <button type="button" class="ctab-btn" data-target="ctab-ptz">PTZ</button>
                        </div>`;

code = code.replace(/<div class="cam-inner-tabs">[\s\S]*?<\/div>/m, correctTabs);

fs.writeFileSync('public/index.html', code);
console.log('Fixed tabs');
