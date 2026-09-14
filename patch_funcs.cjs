const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const funcs = `
function sanitizeRtspUrl(url) {
    if (!url || typeof url !== 'string') return '';
    let clean = url.trim();
    if (!clean) return '';
    if (clean.toLowerCase() === 'demo' || clean.toLowerCase() === 'test') return 'demo';
    return clean;
}

function formatStreamUrl(url) {
    if (!url) return '';
    if (url === 'demo') {
        return 'rtsp://rtspstream:2dc42abedfc9621360155b1f@zephyr.rtsp.stream/pattern';
    }
    return url;
}
`;

code = code.replace(/function autoCleanupTempSegments\(\)/, funcs + '\nfunction autoCleanupTempSegments()');
fs.writeFileSync('server.js', code);
console.log('Patched funcs');
