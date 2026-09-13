const fs = require('fs');

let js = fs.readFileSync('public/script.js', 'utf8');

const oldFetchLogs = `async function fetchLogs() {
        if (!logsContainer) return;
        try {
            const res = await authFetch('/api/logs');
            const data = await res.json();
            if (data && data.logs) {
                logsContainer.innerHTML = data.logs.map(log => {
                    let color = '#a3be8c';
                    if (log.level === 'ERROR') color = '#ef4444';
                    if (log.level === 'WARN') color = '#f59e0b';
                    if (log.level === 'INFO') color = '#3b82f6';
                    return \`<div style="margin-bottom:4px;"><span style="color:#64748b; font-size:0.75rem;">[\${new Date(log.timestamp).toLocaleString('id-ID')}]</span> <strong style="color:\${color}; font-size:0.75rem;">[\${log.level}]</strong> <span style="font-size:0.8rem; color:#e2e8f0;">\${log.message}</span></div>\`;
                }).join('');
                logsContainer.scrollTop = logsContainer.scrollHeight;
            }
        } catch(e) {
            logsContainer.innerHTML = '<div style="color:var(--accent);">Gagal memuat log sistem.</div>';
        }
    }`;

const newFetchLogs = `let allLogsCache = [];
    async function fetchLogs() {
        if (!logsContainer) return;
        try {
            const res = await authFetch('/api/logs');
            const data = await res.json();
            if (data && data.logs) {
                allLogsCache = data.logs;
                renderFilteredLogs();
            }
        } catch(e) {
            logsContainer.innerHTML = '<div style="color:#ef4444;">Gagal memuat log sistem.</div>';
        }
    }
    
    function renderFilteredLogs() {
        if (!logsContainer) return;
        
        const catFilter = document.getElementById('logCategoryFilter') ? document.getElementById('logCategoryFilter').value : 'ALL';
        const timeFilter = document.getElementById('logTimeFilter') ? parseInt(document.getElementById('logTimeFilter').value) : 0;
        
        const now = Date.now();
        const filtered = allLogsCache.filter(log => {
            // Category Filter
            const logCat = log.category || 'SYSTEM';
            if (catFilter !== 'ALL' && logCat !== catFilter) return false;
            
            // Time Filter
            if (timeFilter > 0) {
                const limitMs = timeFilter * 24 * 60 * 60 * 1000;
                if ((now - log.id) > limitMs) return false;
            }
            return true;
        });
        
        if (filtered.length === 0) {
            logsContainer.innerHTML = '<div style="color:#64748b; text-align:center; margin-top:2rem;">Tidak ada log yang sesuai dengan filter.</div>';
            return;
        }

        logsContainer.innerHTML = filtered.map(log => {
            let color = '#a3be8c';
            if (log.level === 'ERROR') color = '#ef4444';
            if (log.level === 'WARN') color = '#f59e0b';
            if (log.level === 'INFO') color = '#3b82f6';
            
            const cat = log.category || 'SYSTEM';
            let catColor = '#475569';
            if (cat === 'CAMERA') catColor = '#059669';
            if (cat === 'STORAGE') catColor = '#ca8a04';
            if (cat === 'SECURITY') catColor = '#9333ea';
            
            return \`<div style="padding:6px 10px; background:rgba(30,41,59,0.5); border-left:3px solid \${color}; border-radius:4px; display:flex; align-items:flex-start; gap:10px;">
                <div style="color:#64748b; font-size:0.75rem; white-space:nowrap; padding-top:2px;">\${new Date(log.timestamp).toLocaleString('id-ID')}</div>
                <div style="display:flex; flex-direction:column; gap:2px;">
                    <div>
                        <strong style="color:\${color}; font-size:0.7rem; background:rgba(0,0,0,0.3); padding:2px 4px; border-radius:3px;">\${log.level}</strong>
                        <strong style="color:#fff; font-size:0.7rem; background:\${catColor}; padding:2px 6px; border-radius:3px; margin-left:4px;">\${cat}</strong>
                    </div>
                    <span style="font-size:0.85rem; color:#f8fafc;">\${log.message}</span>
                </div>
            </div>\`;
        }).join('');
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }
    
    // Attach event listeners for filters
    const catEl = document.getElementById('logCategoryFilter');
    const timeEl = document.getElementById('logTimeFilter');
    if (catEl) catEl.addEventListener('change', renderFilteredLogs);
    if (timeEl) timeEl.addEventListener('change', renderFilteredLogs);
`;

js = js.replace(oldFetchLogs, newFetchLogs);
fs.writeFileSync('public/script.js', js);
console.log('Script Logs UI patched!');
