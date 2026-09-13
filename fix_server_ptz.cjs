const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// POST /api/cameras
code = code.replace(
    /const \{ id, name, enabled, mainStreamUrl, subStreamUrl, rtspUrl, storagePath, resolution, fps, recordMode, maxStorageDays, maxFolderSizeGB, segmentDurationSec, transcode \} = req.body;/,
    "const { id, name, enabled, mainStreamUrl, subStreamUrl, rtspUrl, storagePath, resolution, fps, recordMode, maxStorageDays, maxFolderSizeGB, segmentDurationSec, transcode, ptzEnabled, ptzUrl, ptzUser, ptzPass } = req.body;"
);

code = code.replace(
    /maxStorageDays: parseInt\(maxStorageDays\) \|\| 7,/,
    "maxStorageDays: parseInt(maxStorageDays) || 7,\n        ptzEnabled: !!ptzEnabled,\n        ptzUrl: ptzUrl || '',\n        ptzUser: ptzUser || '',\n        ptzPass: ptzPass || '',"
);

// PUT /api/cameras/:id
code = code.replace(
    /const \{ name, enabled, mainStreamUrl, subStreamUrl, rtspUrl, storagePath, resolution, fps, recordMode, maxStorageDays, maxFolderSizeGB, segmentDurationSec, transcode \} = req.body;/,
    "const { name, enabled, mainStreamUrl, subStreamUrl, rtspUrl, storagePath, resolution, fps, recordMode, maxStorageDays, maxFolderSizeGB, segmentDurationSec, transcode, ptzEnabled, ptzUrl, ptzUser, ptzPass } = req.body;"
);

code = code.replace(
    /transcode: transcode !== undefined \? transcode : \(cams\[index\]\.transcode \|\| 'auto'\),/,
    "transcode: transcode !== undefined ? transcode : (cams[index].transcode || 'auto'),\n        ptzEnabled: ptzEnabled !== undefined ? !!ptzEnabled : !!cams[index].ptzEnabled,\n        ptzUrl: ptzUrl !== undefined ? ptzUrl : (cams[index].ptzUrl || ''),\n        ptzUser: ptzUser !== undefined ? ptzUser : (cams[index].ptzUser || ''),\n        ptzPass: ptzPass !== undefined ? ptzPass : (cams[index].ptzPass || ''),"
);

fs.writeFileSync('server.js', code);
console.log('server.js updated for PTZ fields');
