const fs = require('fs');
let code = fs.readFileSync('public/script.js', 'utf8');

const pbSidebarToggle = `
    window.toggleClipList = function() {
        const sidebar = document.getElementById('pbClipSidebar');
        if(!sidebar) return;
        if(sidebar.style.width === '0px') {
            sidebar.style.width = '300px';
            sidebar.style.opacity = '1';
        } else {
            sidebar.style.width = '0px';
            sidebar.style.opacity = '0';
        }
    };
`;
code = code.replace(/window\.toggleTopControls = function\(\) \{/, pbSidebarToggle + "\n    window.toggleTopControls = function() {");

const pbPlayerControls = `
    const pbPlayer = document.getElementById('playbackPlayer');
    const pbTimeline = document.getElementById('pbTimeline');
    const pbCurrentTime = document.getElementById('pbCurrentTime');
    const pbTotalTime = document.getElementById('pbTotalTime');
    const btnPbPlay = document.getElementById('btnPbPlay');
    const btnPbMute = document.getElementById('btnPbMute');
    const btnPbFull = document.getElementById('btnPbFullscreen');

    function formatTime(seconds) {
        if(isNaN(seconds)) return "00:00:00";
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        return \`\${h}:\${m}:\${s}\`;
    }

    if (pbPlayer) {
        pbPlayer.addEventListener('timeupdate', () => {
            if (pbPlayer.duration) {
                const pct = (pbPlayer.currentTime / pbPlayer.duration) * 100;
                if(pbTimeline) pbTimeline.value = pct;
                if(pbCurrentTime) pbCurrentTime.textContent = formatTime(pbPlayer.currentTime);
            }
        });
        pbPlayer.addEventListener('loadedmetadata', () => {
            if(pbTotalTime) pbTotalTime.textContent = formatTime(pbPlayer.duration);
        });
        pbPlayer.addEventListener('play', () => { if(btnPbPlay) btnPbPlay.textContent = '⏸️'; });
        pbPlayer.addEventListener('pause', () => { if(btnPbPlay) btnPbPlay.textContent = '▶️'; });
    }

    if (pbTimeline) {
        pbTimeline.addEventListener('input', (e) => {
            if (pbPlayer && pbPlayer.duration) {
                const targetTime = (e.target.value / 100) * pbPlayer.duration;
                pbPlayer.currentTime = targetTime;
            }
        });
    }

    if (btnPbPlay) {
        btnPbPlay.addEventListener('click', () => {
            if (!pbPlayer) return;
            if (pbPlayer.paused) pbPlayer.play();
            else pbPlayer.pause();
        });
    }

    if (btnPbMute) {
        btnPbMute.addEventListener('click', () => {
            if (!pbPlayer) return;
            pbPlayer.muted = !pbPlayer.muted;
            btnPbMute.textContent = pbPlayer.muted ? '🔇' : '🔊';
        });
    }

    if (btnPbFull) {
        btnPbFull.addEventListener('click', () => {
            if (!pbPlayer) return;
            if (pbPlayer.requestFullscreen) pbPlayer.requestFullscreen();
            else if (pbPlayer.webkitRequestFullscreen) pbPlayer.webkitRequestFullscreen();
        });
    }
`;

// Insert after playback player references. Let's find "const playbackPlayer = document.getElementById('playbackPlayer');" and add this block inside initNavigation or somewhere safe.
// Wait, I will just append it into initBottomPlayerControls so it initializes properly.
code = code.replace(/function initBottomPlayerControls\(\) \{/, "function initBottomPlayerControls() {\n" + pbPlayerControls);

fs.writeFileSync('public/script.js', code);
console.log('Playback javascript events updated');
