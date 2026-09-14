const fs = require('fs');
let code = fs.readFileSync('public/script.js', 'utf8');

const oldFetchSystemSettings = `    async function fetchSystemSettings() {
        try {
            const res = await authFetch('/api/settings');
            const data = await res.json();
            
            const sysNetInterface = document.getElementById('sysNetInterface');
            const sysMediaMtxPort = document.getElementById('sysMediaMtxPort');
            const sysPlayerMode = document.getElementById('sysPlayerMode');
            const sysTgBot = document.getElementById('sysTgBot');
            const sysTgChat = document.getElementById('sysTgChat');
            
            if (sysNetInterface && data.netInterface) sysNetInterface.value = data.netInterface;
            if (sysMediaMtxPort && data.mediamtxPort) sysMediaMtxPort.value = data.mediamtxPort;
            if (sysPlayerMode && data.playerMode) sysPlayerMode.value = data.playerMode;
            if (sysTgBot && data.telegramBotToken) sysTgBot.value = data.telegramBotToken;
            if (sysTgChat && data.telegramChatId) sysTgChat.value = data.telegramChatId;
        } catch(e) {
            console.error('Failed fetch settings', e);
        }
    }`;

const newFetchSystemSettings = `    async function fetchSystemSettings() {
        try {
            const res = await authFetch('/api/settings');
            const data = await res.json();
            
            const sysNetInterface = document.getElementById('sysNetInterface');
            const sysMediaMtxPort = document.getElementById('sysMediaMtxPort');
            const sysPlayerMode = document.getElementById('sysPlayerMode');
            const sysTgBot = document.getElementById('sysTgBot');
            const sysTgChat = document.getElementById('sysTgChat');
            const sysGlobalStorageMode = document.getElementById('sysGlobalStorageMode');
            const sysRecordingQuality = document.getElementById('sysRecordingQuality');
            
            if (sysNetInterface && data.netInterface) sysNetInterface.value = data.netInterface;
            if (sysMediaMtxPort && data.mediamtxPort) sysMediaMtxPort.value = data.mediamtxPort;
            if (sysPlayerMode && data.playerMode) sysPlayerMode.value = data.playerMode;
            if (sysTgBot && data.telegramBotToken) sysTgBot.value = data.telegramBotToken;
            if (sysTgChat && data.telegramChatId) sysTgChat.value = data.telegramChatId;
            
            if (sysGlobalStorageMode && data.globalStorageMode) sysGlobalStorageMode.value = data.globalStorageMode;
            if (sysRecordingQuality && data.recordingQuality) sysRecordingQuality.value = data.recordingQuality;
        } catch(e) {
            console.error('Failed fetch settings', e);
        }
    }`;

code = code.replace(oldFetchSystemSettings, newFetchSystemSettings);
fs.writeFileSync('public/script.js', code);
console.log('Script patched for storage settings!');
