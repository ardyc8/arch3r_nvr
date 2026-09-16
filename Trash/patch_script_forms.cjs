const fs = require('fs');
let code = fs.readFileSync('public/script.js', 'utf8');

// Patch globalStorageForm
code = code.replace(
`            const payload = {
                globalStorageMode: document.getElementById('sysGlobalStorageMode') ? document.getElementById('sysGlobalStorageMode').value : 'enabled',
                recordingQuality: document.getElementById('sysRecordingQuality') ? document.getElementById('sysRecordingQuality').value : 'main',
                globalStoragePath: finalPath
            };`,
`            const payload = { globalStoragePath: finalPath };
            const sysGSM = document.getElementById('sysGlobalStorageMode');
            if (sysGSM) payload.globalStorageMode = sysGSM.value;
            const sysRQ = document.getElementById('sysRecordingQuality');
            if (sysRQ) payload.recordingQuality = sysRQ.value;`
);

// Patch systemForm
code = code.replace(
`            const payload = {
                netInterface: document.getElementById('sysNetInterface') ? document.getElementById('sysNetInterface').value : 'auto',
                mediamtxPort: document.getElementById('sysMediaMtxPort') ? parseInt(document.getElementById('sysMediaMtxPort').value) : 8889,
                playerMode: document.getElementById('sysPlayerMode') ? document.getElementById('sysPlayerMode').value : 'iframe',
                telegramBotToken: document.getElementById('sysTgBot') ? document.getElementById('sysTgBot').value : '',
                telegramChatId: document.getElementById('sysTgChat') ? document.getElementById('sysTgChat').value : ''
            };`,
`            const payload = {};
            const sysNet = document.getElementById('sysNetInterface');
            if (sysNet) payload.netInterface = sysNet.value;
            const sysPort = document.getElementById('sysMediaMtxPort');
            if (sysPort && sysPort.value) payload.mediamtxPort = parseInt(sysPort.value);
            const sysPlayer = document.getElementById('sysPlayerMode');
            if (sysPlayer) payload.playerMode = sysPlayer.value;
            const sysTgBot = document.getElementById('sysTgBot');
            if (sysTgBot) payload.telegramBotToken = sysTgBot.value;
            const sysTgChat = document.getElementById('sysTgChat');
            if (sysTgChat) payload.telegramChatId = sysTgChat.value;`
);

fs.writeFileSync('public/script.js', code);
console.log("script.js forms patched.");
