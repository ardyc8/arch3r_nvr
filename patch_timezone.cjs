const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// Define local time function to inject
const localTimeFunc = `// --- LOCAL TIME UTILITY ---
function getLocalTimeString(dateObj = new Date()) {
    const tzOffset = dateObj.getTimezoneOffset() * 60000; 
    const localISOTime = (new Date(dateObj.getTime() - tzOffset)).toISOString().slice(0, -1);
    const offsetHours = Math.floor(Math.abs(dateObj.getTimezoneOffset()) / 60);
    const offsetMinutes = Math.abs(dateObj.getTimezoneOffset()) % 60;
    const sign = dateObj.getTimezoneOffset() > 0 ? '-' : '+';
    const offsetStr = sign + String(offsetHours).padStart(2, '0') + ':' + String(offsetMinutes).padStart(2, '0');
    return localISOTime + offsetStr;
}
`;

// Inject the function after imports
const importMatch = `const path = require('path');`;
if (code.includes(importMatch) && !code.includes('getLocalTimeString')) {
    code = code.replace(importMatch, importMatch + '\n\n' + localTimeFunc);
} else if (!code.includes('getLocalTimeString')) {
    // Fallback to inserting near the top if require('path') isn't found exactly
    const firstConst = code.indexOf('const ');
    code = code.slice(0, firstConst) + localTimeFunc + '\n' + code.slice(firstConst);
}

// Replace occurrences of new Date().toISOString()
code = code.replace(/new Date\(\)\.toISOString\(\)/g, 'getLocalTimeString()');
code = code.replace(/new Date\((.*?)\)\.toISOString\(\)/g, 'getLocalTimeString(new Date($1))');

fs.writeFileSync('server.js', code);
console.log("Timezone patched successfully!");
