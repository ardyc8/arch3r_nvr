// script.js - Archer NVR Ver. 9.9.6 Multi-Tenant Controller

// --- Universal Token & Auth Fetch Helper (Global Scope) ---
function getAuthToken() {
    return localStorage.getItem('nvr_auth_token') || localStorage.getItem('arch3r_token') || '';
}
window.getAuthToken = getAuthToken;
window.cameras = window.cameras || [];

function authFetch(url, options = {}) {
    const opts = { ...options };
    opts.headers = opts.headers ? { ...opts.headers } : {};
    const token = getAuthToken();
    if (token) {
        opts.headers['Authorization'] = `Bearer ${token}`;
    }
    opts.credentials = 'include';
    return fetch(url, opts);
}
window.authFetch = authFetch;

document.addEventListener('DOMContentLoaded', () => {
    // --- Global State ---
    let currentUserRole = null;
    let currentUsername = '';
    let cameras = [];
    window.cameras = cameras;
    let currentGridCount = 4;
    let mCurrentGridCount = 1;
    let detectedStorageDevices = [];
    let sysStatsInterval = null;
    let clockInterval = null;
    let hlsPlayers = {};

    // --- References: Auth ---
    const authOverlay = document.getElementById('authOverlay');
    const authForm = document.getElementById('authForm');
    const authUsername = document.getElementById('authUsername');
    const authPassword = document.getElementById('authPassword');
    const authError = document.getElementById('authError');

    // --- References: App Containers ---
    const adminApp = document.getElementById('adminApp');
    const userApp = document.getElementById('userApp');

    // --- References: Admin Elements ---
    const lblAdminName = document.getElementById('lblAdminName');
    const btnLogoutAdmin = document.getElementById('btnLogoutAdmin');
    const videoGrid = document.getElementById('videoGrid');
    const liveClock = document.getElementById('liveClock');
    const btnReloadStreams = document.getElementById('btnReloadStreams');
    const modalCameraList = document.getElementById('modalCameraList');
    const cameraForm = document.getElementById('cameraForm');
    const btnCancelEdit = document.getElementById('btnCancelEdit');
    const btnScrollToForm = document.getElementById('btnScrollToForm');
    const formTitle = document.getElementById('formTitle');
    const globalStorageForm = document.getElementById('globalStorageForm');
    const sysStorageDevice = document.getElementById('sysStorageDevice');
    const btnRefreshStorage = document.getElementById('btnRefreshStorage');
    const storageDevicePreview = document.getElementById('storageDevicePreview');
    const sysCustomStoragePath = document.getElementById('sysCustomStoragePath');
    const sysGlobalStorageMode = document.getElementById('sysGlobalStorageMode');
    const sysRecordingQuality = document.getElementById('sysRecordingQuality');
    const systemForm = document.getElementById('systemForm');
    const changePasswordForm = document.getElementById('changePasswordForm');
    const btnRefreshLogs = document.getElementById('btnRefreshLogs');
    const logsContainer = document.getElementById('logsContainer');

    // Admin Users Management Elements
    const btnToggleAddUser = document.getElementById('btnToggleAddUser');
    const boxAddUserForm = document.getElementById('boxAddUserForm');
    const btnCancelAddUser = document.getElementById('btnCancelAddUser');
    const addUserForm = document.getElementById('addUserForm');
    const userTableBody = document.getElementById('userTableBody');

    // Admin Playback Elements
    const selRecCam = document.getElementById('selRecCam');
    const selRecDate = document.getElementById('selRecDate');
    const btnFetchRecordings = document.getElementById('btnFetchRecordings');
    const playbackPlayer = document.getElementById('playbackPlayer');
    const playbackList = document.getElementById('playbackList');
    const pbTitle = document.getElementById('pbTitle');
    const clipCount = document.getElementById('clipCount');

    // --- References: Mobile User Elements ---
    const lblUserMobileName = document.getElementById('lblUserMobileName');
    const btnLogoutUser = document.getElementById('btnLogoutUser');
    const mVideoGrid = document.getElementById('mVideoGrid');
    const btnMRefreshStreams = document.getElementById('btnMRefreshStreams');
    const mSelRecCam = document.getElementById('mSelRecCam');
    const mSelRecDate = document.getElementById('mSelRecDate');
    const mBtnFetchRecordings = document.getElementById('mBtnFetchRecordings');
    const mPlaybackPlayer = document.getElementById('mPlaybackPlayer');
    const mPlaybackList = document.getElementById('mPlaybackList');
    const mCameraCardsList = document.getElementById('mCameraCardsList');
    const mProfileName = document.getElementById('mProfileName');
    const mChangePasswordForm = document.getElementById('mChangePasswordForm');

    // --- Universal Token & Auth Fetch Helper ---
    // (Delegated to global window.getAuthToken & window.authFetch)

    


        window.renderRecordCameraList = function() {
        const list = document.getElementById('recordCameraList');
        if(!list) return;
        
        list.innerHTML = '';
        if(cameras.length === 0) {
            list.innerHTML = '<div style="color:var(--text-muted); font-size:0.85rem;">Tidak ada kamera untuk diatur.</div>';
            return;
        }
        
        cameras.forEach(cam => {
            const isCont = cam.recordMode === 'continuous';
            const div = document.createElement('div');
            div.style.cssText = 'background:rgba(0,0,0,0.2); border:1px solid var(--border); padding:1rem; border-radius:8px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:1rem; align-items:center;';
            div.innerHTML = `
                <div style="flex:1; min-width:200px;">
                    <div style="font-weight:600; font-size:1.05rem; display:flex; align-items:center; gap:0.5rem;">
                        ${cam.name}
                        ${isCont ? '<span class="badge-rec" style="position:static;">REC</span>' : '<span style="font-size:0.7rem; color:#64748b; border:1px solid #64748b; padding:2px 4px; border-radius:4px;">DISABLED</span>'}
                    </div>
                    <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.25rem;">
                        Retention: ${cam.maxStorageDays || 7} Hari / ${cam.maxFolderSizeGB || 10} GB
                    </div>
                </div>
                <div style="display:flex; gap:0.5rem; align-items:center;">
                    <select id="qRecMode_${cam.id}" class="form-control" style="width:140px; font-size:0.85rem; padding:0.4rem;">
                        <option value="disabled" ${!isCont ? 'selected' : ''}>Disabled</option>
                        <option value="continuous" ${isCont ? 'selected' : ''}>Continuous</option>
                    </select>
                    <button class="btn btn-primary" onclick="window.quickSaveRecord('${cam.id}')" style="padding:0.4rem 0.8rem; font-size:0.85rem;">Simpan</button>
                </div>
            `;
            list.appendChild(div);
        });
    };
    
    window.quickSaveRecord = async function(id) {
        const cam = cameras.find(c => c.id === id);
        if(!cam) return;
        const newMode = document.getElementById('qRecMode_'+id).value;
        const payload = {
            name: cam.name,
            enabled: cam.enabled,
            mainStreamUrl: cam.mainStreamUrl,
            subStreamUrl: cam.subStreamUrl,
            recordMode: newMode,
            maxStorageDays: cam.maxStorageDays || 7,
            maxFolderSizeGB: cam.maxFolderSizeGB || 10,
            segmentDurationSec: cam.segmentDurationSec || 900,
            transcode: cam.transcode || 'auto',
            storagePath: cam.storagePath || ''
        };
        
        try {
            const res = await authFetch('/api/cameras/' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if(!res.ok) throw new Error('Failed to update record setting');
            alert('Pengaturan rekam untuk ' + cam.name + ' berhasil disimpan!');
            fetchCameras();
        } catch(e) {
            alert('Error: ' + e.message);
        }
    };

    // --- Password Peek Handler ---
    function initPasswordPeeks() {
        document.querySelectorAll('.btn-peek-pwd').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                const targetId = btn.dataset.target;
                const input = document.getElementById(targetId);
                if (!input) return;
                const icon = btn.querySelector('.peek-icon');
                if (input.type === 'password') {
                    input.type = 'text';
                    if (icon) icon.textContent = '🙈';
                } else {
                    input.type = 'password';
                    if (icon) icon.textContent = '👁️';
                }
            };
        });
    }
    initPasswordPeeks();

    // =========================================================================
    // 1. AUTHENTICATION & ROLE ROUTING
    // =========================================================================
async function checkAuth() {
        try {
            const res = await authFetch('/api/auth/status');
            if (!res.ok) throw new Error('Authentication failed');
            const data = await res.json();

            if (data.authenticated) {
                currentUserRole = data.role;
                currentUsername = data.username;
                localStorage.setItem('nvr_role', data.role);
                localStorage.setItem('nvr_username', data.username);

                if (currentUserRole === 'superadmin') {
                    window.location.href = '/superadmin';
                    return;
                }

                authOverlay.style.display = 'none';

                if (currentUserRole === 'administrator') {
                    userApp.style.display = 'none';
                    adminApp.style.display = 'flex';
                    if (lblAdminName) lblAdminName.textContent = currentUsername;
                    initAdminDashboard();
                } else {
                    // Role: User (Mobile Client PWA)
                    adminApp.style.display = 'none';
                    userApp.style.display = 'flex';
                    if (lblUserMobileName) lblUserMobileName.textContent = currentUsername;
                    if (mProfileName) mProfileName.textContent = currentUsername;
                    initMobileUserApp();
                }
            } else {
                localStorage.removeItem('nvr_auth_token');
                authOverlay.style.display = 'flex';
                adminApp.style.display = 'none';
                userApp.style.display = 'none';
            }
        } catch (err) {
            localStorage.removeItem('nvr_auth_token');
            authOverlay.style.display = 'flex';
            adminApp.style.display = 'none';
            userApp.style.display = 'none';
        }
    }

    window.fillAuth = function(u, p) {
        if (authUsername) authUsername.value = u;
        if (authPassword) authPassword.value = p;
        if (authError) authError.textContent = '';
        const submitBtn = document.getElementById('authSubmitBtn');
        if (submitBtn) {
            submitBtn.style.animation = 'pulse 0.4s ease';
            setTimeout(() => { submitBtn.style.animation = ''; }, 400);
        }
    };

    if (authForm) authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authError.textContent = '';
        const username = authUsername.value.trim();
        const password = authPassword.value;

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                if (data.token) {
                    localStorage.setItem('nvr_auth_token', data.token);
                    localStorage.setItem('arch3r_token', data.token);
                    localStorage.setItem('nvr_role', data.role);
                    localStorage.setItem('nvr_username', data.username || username);
                }

                if (data.role === 'superadmin') {
                    window.location.href = '/superadmin';
                    return;
                }

                // Langsung buka dashboard sesuai role tanpa kendala cookie
                currentUserRole = data.role;
                currentUsername = data.username || username;

                authOverlay.style.display = 'none';

                if (currentUserRole === 'administrator') {
                    userApp.style.display = 'none';
                    adminApp.style.display = 'flex';
                    if (lblAdminName) lblAdminName.textContent = currentUsername;
                    initAdminDashboard();
                } else {
                    // Role: User
                    adminApp.style.display = 'none';
                    userApp.style.display = 'flex';
                    if (lblUserMobileName) lblUserMobileName.textContent = currentUsername;
                    if (mProfileName) mProfileName.textContent = currentUsername;
                    initMobileUserApp();
                }
            } else {
                authError.textContent = data.error || 'Username atau password salah.';
            }
        } catch (err) {
            authError.textContent = 'Gagal menghubungi server NVR.';
        }
    });

async function handleLogout() {
        try {
            await authFetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {}
        localStorage.removeItem('nvr_auth_token');
        localStorage.removeItem('nvr_role');
        localStorage.removeItem('nvr_username');
        currentUserRole = null;
        currentUsername = '';
        authOverlay.style.display = 'flex';
        adminApp.style.display = 'none';
        userApp.style.display = 'none';
    }

    if (btnLogoutAdmin) btnLogoutAdmin.addEventListener('click', handleLogout);
    if (btnLogoutUser) btnLogoutUser.addEventListener('click', handleLogout);

    // =========================================================================
    // 2. ADMINISTRATOR DASHBOARD LOGIC
    // =========================================================================
    function initAdminDashboard() {
        startLiveClock();
        initNavigation();
        initBottomPlayerControls();

    const btnScanNetwork = document.getElementById('btnScanNetwork');
    const scanResults = document.getElementById('scanResults');
    const scanStatus = document.getElementById('scanStatus');

    
    const btnStartAdvancedScan = document.getElementById('btnStartAdvancedScan');
    if (btnStartAdvancedScan) {
        btnStartAdvancedScan.addEventListener('click', async () => {
            const startIp = document.getElementById('scanStartIp').value;
            const endIp = document.getElementById('scanEndIp').value;
            const ports = document.getElementById('scanPorts').value;
            
            const scanResults = document.getElementById('scanResults');
            const scanStatus = document.getElementById('scanStatus');
            
            if(!scanResults || !scanStatus) return;
            
            scanResults.style.display = 'block';
            scanStatus.innerHTML = '<span style="color:#eab308;">Mencari (0%)...</span>';
            
            const oldList = document.getElementById('scanDeviceList');
            if (oldList) oldList.remove();
            
            const listCont = document.createElement('div');
            listCont.id = 'scanDeviceList';
            listCont.style.display = 'flex';
            listCont.style.flexDirection = 'column';
            listCont.style.gap = '0.5rem';
            listCont.style.marginTop = '0.75rem';
            scanResults.appendChild(listCont);

            try {
                const response = await fetch('/api/system/scan-advanced', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + getAuthToken()
                    },
                    body: JSON.stringify({ startIp, endIp, ports })
                });

                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let done = false;
                let foundDevices = 0;

                while (!done) {
                    const { value, done: readerDone } = await reader.read();
                    done = readerDone;
                    if (value) {
                        const chunk = decoder.decode(value, { stream: true });
                        const lines = chunk.split('\n\n');
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const dataStr = line.replace('data: ', '');
                                try {
                                    const data = JSON.parse(dataStr);
                                    if (data.progress) {
                                        scanStatus.innerHTML = `<span style="color:#eab308;">Mencari (${data.progress}%)... Ditemukan ${foundDevices} perangkat.</span>`;
                                    } else if (data.found) {
                                        foundDevices++;
                                        const dev = data.found;
                                        const devItem = document.createElement('div');
                                        devItem.style.background = '#1e293b';
                                        devItem.style.padding = '0.75rem';
                                        devItem.style.borderRadius = '6px';
                                        devItem.style.display = 'flex';
                                        devItem.style.justifyContent = 'space-between';
                                        devItem.style.alignItems = 'center';
                                        devItem.style.border = '1px solid #334155';
                                        
                                        let portStr = dev.ports.join(', ');
                                        
                                        devItem.innerHTML = `
                                            <div>
                                                <div style="font-weight:bold; font-size:0.9rem; color:#e2e8f0;">${dev.name} (${dev.ip})</div>
                                                <div style="font-size:0.75rem; color:#94a3b8;">Port Terbuka: ${portStr}</div>
                                            </div>
                                            <button class="btn-sm btn-primary" style="font-size:0.75rem;">Gunakan</button>
                                        `;
                                        
                                        devItem.querySelector('button').onclick = () => {
                                            document.getElementById('cameraFormBox').style.display = 'block';
                                            document.getElementById('camName').value = 'Kamera ' + dev.ip;
                                            document.getElementById('camMainUrl').value = `rtsp://admin:password@${dev.ip}:554/stream1`;
                                            document.getElementById('camSubUrl').value = `rtsp://admin:password@${dev.ip}:554/stream2`;
                                            const ptzSel = document.getElementById('camPtzSelect');
                                            if (ptzSel) ptzSel.value = dev.isOnvif ? 'yes' : 'no';
                                            
                                            // Asumsi port ONVIF pertama
                                            const onvifPort = dev.ports.find(p => p !== 554) || 80;
                                            const ptzUrlInput = document.getElementById('camPtzUrl');
                                            if (ptzUrlInput) ptzUrlInput.value = `${dev.ip}:${onvifPort}`;
                                            
                                            document.getElementById('advancedScanBox').style.display = 'none';
                                            alert('Data IP disalin. Sesuaikan Username dan Password!');
                                        };
                                        listCont.appendChild(devItem);
                                    } else if (data.status === 'done') {
                                        scanStatus.innerHTML = `<span style="color:#22c55e;">Selesai! Ditemukan ${foundDevices} perangkat terbuka.</span>`;
                                    }
                                } catch (e) {}
                            }
                        }
                    }
                }
            } catch(e) {
                scanStatus.innerHTML = `<span style="color:#ef4444;">Error: ${e.message}</span>`;
            }
        });
    }


        initCameraTabs();
        startSystemMonitoring();
        fetchCameras();
        loadStorageDevices();
        fetchSystemSettings();
        fetchAboutInfo();
        loadUsersList();

        // Default set date to today
        const today = new Date().toISOString().split('T')[0];
        if (selRecDate) selRecDate.value = today;
    }

    // =========================================================================
    // 3. MOBILE APP (PWA) LOGIC
    // =========================================================================
    function initMobileUserApp() {
        fetchCameras();

        // Mobile Grid Switcher
        document.querySelectorAll('.m-grid-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.m-grid-btn').forEach(b => {
                    b.classList.remove('active');
                    b.style.background = '';
                    b.style.color = '';
                });
                btn.classList.add('active');
                btn.style.background = '#2563eb';
                btn.style.color = 'white';
                currentGridCount = parseInt(btn.getAttribute('data-mgrid'), 10) || 1;
                updateGridDisplay();
            });
        });

        // Mobile Bottom Navigation
        const mNavItems = document.querySelectorAll('.mobile-nav-item');
        const mViews = document.querySelectorAll('.mobile-view');
        
        mNavItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                mNavItems.forEach(n => n.classList.remove('active'));
                mViews.forEach(v => v.classList.remove('active'));

                item.classList.add('active');
                const targetId = item.getAttribute('data-mtarget');
                const targetPane = document.getElementById(targetId);
                if (targetPane) targetPane.classList.add('active');
                
                if (targetId === 'mViewCameras') {
                    renderMobileCameraCards();
                }
                if (targetId === 'mViewPlayback') {
                    if (typeof fetchMobileRecordings === 'function') fetchMobileRecordings();
                }
            });
        });

        initMobilePlayback();
    }

    function startLiveClock() {
        if (clockInterval) clearInterval(clockInterval);
        const updateClock = () => {
            const now = new Date();
            if (liveClock) liveClock.textContent = now.toLocaleTimeString('id-ID');
        };
        updateClock();
        clockInterval = setInterval(updateClock, 1000);
    }

    function initNavigation() {
        const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
        const viewPanes = document.querySelectorAll('.view-pane');
        const btnMobileMenu = document.getElementById('btnMobileMenu');
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                navItems.forEach(n => n.classList.remove('active'));
                viewPanes.forEach(v => v.classList.remove('active'));

                item.classList.add('active');
                const targetId = item.getAttribute('data-target');
                const targetPane = document.getElementById(targetId);
                if (targetPane) targetPane.classList.add('active');
                
                if (targetId === 'view-about') {
                    if (typeof fetchAboutInfo === 'function') fetchAboutInfo();
                }
                if (targetId === 'view-addons') {
                    if (typeof fetchInstalledAddons === 'function') fetchInstalledAddons();
                }

                // Close mobile sidebar if open
                if (sidebar) sidebar.classList.remove('mobile-open');
                if (sidebarOverlay) sidebarOverlay.classList.remove('active');

                if (targetId === 'view-logs') fetchLogs();
                if (targetId === 'view-setting-users') loadUsersList();
                if (targetId === 'view-setting-record') loadStorageDevices();
                if (targetId === 'view-playback') fetchRecordings();
            });
        });

        if (btnMobileMenu && sidebar) {
            if (btnMobileMenu) btnMobileMenu.addEventListener('click', () => {
                sidebar.classList.toggle('mobile-open');
                if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
            });
        }

        if (sidebarOverlay) {
            if (sidebarOverlay) sidebarOverlay.addEventListener('click', () => {
                if (sidebar) sidebar.classList.remove('mobile-open');
                sidebarOverlay.classList.remove('active');
            });
        }

        // Layout Grid Switcher
        document.querySelectorAll('.grid-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.grid-btn').forEach(b => {
                    b.classList.remove('active');
                    b.style.background = '';
                    b.style.color = '';
                });
                btn.classList.add('active');
                btn.style.background = '#2563eb';
                btn.style.color = 'white';
                currentGridCount = parseInt(btn.getAttribute('data-grid'), 10) || 4;
                gridPageIndex = 0; // Reset pagination to first page when changing layout
                document.querySelectorAll('.m-grid-btn').forEach(b => {
                    b.classList.remove('active');
                    b.style.background = '';
                    b.style.color = '';
                    if(b.getAttribute('data-mgrid') == currentGridCount) {
                        b.classList.add('active');
                        b.style.background = '#2563eb';
                        b.style.color = 'white';
                    }
                });
                updateGridDisplay();
            });
        });

        if (btnReloadStreams) {
            if (btnReloadStreams) btnReloadStreams.addEventListener('click', () => {
                fetchCameras();
            });
        }

        if (btnScrollToForm && cameraForm) {
            if (btnScrollToForm) btnScrollToForm.addEventListener('click', () => {
                resetCameraForm();
                cameraForm.scrollIntoView({ behavior: 'smooth' });
            });
        }
    }

    function switchCameraTab(tabTargetId) {
        const ctabBtns = document.querySelectorAll('.ctab-btn');
        const ctabPanes = document.querySelectorAll('.ctab-pane');
        ctabBtns.forEach(b => {
            if (b.getAttribute('data-target') === tabTargetId) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });
        ctabPanes.forEach(p => {
            if (p.id === tabTargetId) {
                p.classList.add('active');
            } else {
                p.classList.remove('active');
            }
        });
    }

    function initCameraTabs() {
        const ctabBtns = document.querySelectorAll('.ctab-btn');
        const ctabPanes = document.querySelectorAll('.ctab-pane');
        ctabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                ctabBtns.forEach(b => b.classList.remove('active'));
                ctabPanes.forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const target = document.getElementById(btn.getAttribute('data-target'));
                if (target) target.classList.add('active');
            });
        });
    }

    // --- Real-time Hardware System Monitor (Armbian STB) ---
    function startSystemMonitoring() {
        if (sysStatsInterval) clearInterval(sysStatsInterval);
        updateHardwareStats();
        sysStatsInterval = setInterval(updateHardwareStats, 5000);
    }

async function updateHardwareStats() {
        try {
            const res = await authFetch('/api/system/stats');
            if (!res.ok) return;
            const data = await res.json();
            if (!data) return;

            // 1. CPU
            const wCpu = document.getElementById('wCpu');
            if (wCpu && data.cpu) {
                wCpu.textContent = `${data.cpu.usagePercent || 0}%`;
                wCpu.style.color = (data.cpu.usagePercent > 85) ? '#ef4444' : '#f8fafc';
            }

            // 2. RAM
            const wRam = document.getElementById('wRam');
            if (wRam && data.ram) {
                const ramPct = data.ram.usagePercent !== undefined ? data.ram.usagePercent : (data.ram.usedPercent || 0);
                wRam.textContent = `${ramPct}%`;
                wRam.style.color = (ramPct > 85) ? '#ef4444' : '#f8fafc';
            }

            // 3. STB Thermal Temperature
            const wTemp = document.getElementById('wTemp');
            if (wTemp && data.temp) {
                const deg = data.temp.celsius || 0;
                wTemp.textContent = `${deg}°C`;
                wTemp.style.color = (deg >= 70) ? '#ef4444' : (deg >= 60 ? '#f59e0b' : '#34d399');
            }

            // 4. Disk Storage
            const wStorage = document.getElementById('wStorage');
            if (wStorage && data.storage) {
                const diskPct = data.storage.percentUsed || 0;
                wStorage.textContent = `${diskPct}%`;
                wStorage.style.color = (diskPct > 90) ? '#ef4444' : '#f8fafc';
            }

            // 5. Network Rx/Tx
            const wNetIf = document.getElementById('wNetIf');
            const wNetDown = document.getElementById('wNetDown');
            const wNetUp = document.getElementById('wNetUp');
            if (data.network) {
                if (wNetIf) wNetIf.textContent = data.network.interface || 'eth0';
                if (wNetDown) wNetDown.textContent = data.network.rxSpeedFormatted || '0 KB/s';
                if (wNetUp) wNetUp.textContent = data.network.txSpeedFormatted || '0 KB/s';
            }
        } catch (err) {
            // silent polling error
        }
    }

    function renderModalCameraList() {
        const modalCameraList = document.getElementById('modalCameraList');
        if (!modalCameraList) return;
        
        modalCameraList.innerHTML = '';
        if (cameras.length === 0) {
            modalCameraList.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">Belum ada kamera. Tambahkan melalui form di bawah.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'w-full';
        table.style.borderCollapse = 'collapse';
        table.style.fontSize = '0.85rem';
        table.innerHTML = `
            <thead>
                <tr style="border-bottom:1px solid var(--border); text-align:left;">
                    <th style="padding:0.5rem;">Nama Kamera</th>
                    <th style="padding:0.5rem;">Status Stream</th>
                    <th style="padding:0.5rem;">Rekam</th>
                    <th style="padding:0.5rem; text-align:right;">Aksi</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        const tbody = table.querySelector('tbody');
        cameras.forEach(cam => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border)';
            const isEnabled = cam.enabled !== false;
            
            tr.innerHTML = `
                <td style="padding:0.5rem;">
                    <div style="font-weight:600;">${cam.name}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted); word-break:break-all;">${cam.mainStreamUrl || '-'}</div>
                </td>
                <td style="padding:0.5rem;">
                    ${isEnabled ? '<span style="color:#10b981;">Online</span>' : '<span style="color:#ef4444;">Offline</span>'}
                </td>
                <td style="padding:0.5rem;">
                    ${cam.recordMode === 'continuous' ? '<span style="color:#f59e0b;">Continuous</span>' : 'Disabled'}
                </td>
                <td style="padding:0.5rem; text-align:right;">
                    <button class="btn-sm btn-primary" onclick="openAIGridModal('${cam.id}')" style="margin-right:0.25rem; background:#3b82f6; border-color:#3b82f6;" title="Konfigurasi AI YOLOv8">🤖 AI</button>
                    <button class="btn-sm btn-secondary" onclick="window.editCamera('${cam.id}')" style="margin-right:0.25rem;">Edit</button>
                    <button class="btn-sm btn-primary" onclick="window.deleteCamera('${cam.id}')" style="background:#ef4444; border-color:#ef4444;">Hapus</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        modalCameraList.appendChild(table);
    }

    function extractRtspCredentials(url) {
        if (!url || typeof url !== 'string') return { host: '', user: '', pass: '' };
        try {
            const m = url.match(/rtsp:\/\/(?:([^:]+)(?::([^@]+))?@)?([^:\/\s]+)(?::(\d+))?/i);
            if (m) {
                return {
                    user: m[1] ? decodeURIComponent(m[1]) : '',
                    pass: m[2] ? decodeURIComponent(m[2]) : '',
                    host: m[3] ? m[3] : ''
                };
            }
        } catch(e) {}
        return { host: '', user: '', pass: '' };
    }

    function autoFillPtzFromRtsp(force = false) {
        const mainUrl = document.getElementById('camMainUrl') ? document.getElementById('camMainUrl').value.trim() : '';
        const ptzUrlEl = document.getElementById('camPtzUrl');
        const ptzUserEl = document.getElementById('camPtzUser');
        const ptzPassEl = document.getElementById('camPtzPass');
        const ptzSelectEl = document.getElementById('camPtzSelect');

        if (!mainUrl) return;
        const creds = extractRtspCredentials(mainUrl);

        if (force || !ptzUrlEl.value) {
            if (creds.host) ptzUrlEl.value = creds.host;
        }
        if (force || !ptzUserEl.value) {
            if (creds.user) ptzUserEl.value = creds.user;
        }
        if (force || !ptzPassEl.value) {
            if (creds.pass) ptzPassEl.value = creds.pass;
        }
        if (force && ptzSelectEl && ptzSelectEl.value === 'no') {
            ptzSelectEl.value = 'yes';
        }
    }

    // Auto extract saat input RTSP berubah (hanya jika mode tambah baru atau form belum diisi)
    const camMainUrlInput = document.getElementById('camMainUrl');
    if (camMainUrlInput) {
        camMainUrlInput.addEventListener('blur', () => {
            const currentEditingId = document.getElementById('camId') ? document.getElementById('camId').value : '';
            // Jangan timpa otomatis jika sedang dalam mode edit kamera lama
            if (!currentEditingId) {
                autoFillPtzFromRtsp(false);
            }
        });
    }

    const btnAutoFillPtz = document.getElementById('btnAutoFillPtz');
    if (btnAutoFillPtz) {
        btnAutoFillPtz.addEventListener('click', () => {
            autoFillPtzFromRtsp(true);
            const statusEl = document.getElementById('ptzProbeStatus');
            if (statusEl) {
                statusEl.innerHTML = '<span style="color:#22c55e;">✓ Data ONVIF berhasil diekstrak dari RTSP</span>';
                setTimeout(() => { statusEl.innerHTML = ''; }, 3500);
            }
        });
    }

    const btnTestOnvifProbe = document.getElementById('btnTestOnvifProbe');
    if (btnTestOnvifProbe) {
        btnTestOnvifProbe.addEventListener('click', async () => {
            const ptzUrl = document.getElementById('camPtzUrl') ? document.getElementById('camPtzUrl').value.trim() : '';
            const ptzUser = document.getElementById('camPtzUser') ? document.getElementById('camPtzUser').value.trim() : '';
            const ptzPass = document.getElementById('camPtzPass') ? document.getElementById('camPtzPass').value : '';
            const mainStreamUrl = document.getElementById('camMainUrl') ? document.getElementById('camMainUrl').value.trim() : '';
            const statusEl = document.getElementById('ptzProbeStatus');

            if (!ptzUrl && !mainStreamUrl) {
                if (statusEl) statusEl.innerHTML = '<span style="color:#ef4444;">⚠️ Isi IP Kamera atau RTSP terlebih dahulu</span>';
                return;
            }

            if (statusEl) statusEl.innerHTML = '<span style="color:#60a5fa;">⏳ Sedang menguji & mendiagnosa profil ONVIF (Port 8899)...</span>';
            btnTestOnvifProbe.disabled = true;

            try {
                const res = await authFetch('/api/onvif/probe-custom', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ptzUrl, ptzUser, ptzPass, mainStreamUrl })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    let detailHtml = `<div style="color:#22c55e; font-weight:600; margin-bottom:2px;">✅ ${data.message}</div>`;
                    if (data.protocol === 'v380_native') {
                        const ptzSelectEl = document.getElementById('camPtzSelect');
                        if (ptzSelectEl) ptzSelectEl.value = 'v380_native';
                    }
                    if (data.profiles && data.profiles.length > 0) {
                        const profTags = data.profiles.map(p => {
                            const resText = p.resolution && p.resolution !== 'Unknown' ? ` (${p.resolution})` : '';
                            return `<span style="background:rgba(59,130,246,0.18); color:#93c5fd; padding:1px 6px; border-radius:3px; font-family:monospace; font-size:0.75rem; border:1px solid rgba(59,130,246,0.3);">${p.token}${resText}</span>`;
                        }).join(' ');
                        detailHtml += `<div style="font-size:0.75rem; color:#cbd5e1; margin-top:3px;">📋 Profil Terdeteksi (${data.profiles.length}): ${profTags}</div>`;
                    } else if (data.profileToken) {
                        detailHtml += `<div style="font-size:0.75rem; color:#cbd5e1; margin-top:3px;">🔑 Token Aktif: <code style="color:#93c5fd;">${data.profileToken}</code></div>`;
                    }
                    if (statusEl) statusEl.innerHTML = detailHtml;
                } else {
                    if (statusEl) statusEl.innerHTML = `<span style="color:#ef4444; font-weight:600;">❌ Gagal: ${data.error || 'Kamera tidak merespon protokol ONVIF'}</span>`;
                }
            } catch(e) {
                if (statusEl) statusEl.innerHTML = `<span style="color:#ef4444;">❌ Kesalahan: ${e.message}</span>`;
            } finally {
                btnTestOnvifProbe.disabled = false;
            }
        });
    }

    window.editCamera = function(id) {
        const cam = cameras.find(c => c.id === id);
        if (!cam) return;
        
        document.getElementById('camId').value = cam.id;
        document.getElementById('camName').value = cam.name;
        const camCustomIdEl = document.getElementById('camCustomId');
        if (camCustomIdEl) camCustomIdEl.value = cam.id;
        
        const camPtzSelectEl = document.getElementById('camPtzSelect');
        if (camPtzSelectEl) {
            if (cam.ptzProtocol === 'v380_native') {
                camPtzSelectEl.value = 'v380_native';
            } else {
                camPtzSelectEl.value = cam.ptzEnabled ? 'yes' : 'no';
            }
        }

        const camPtzUrlEl = document.getElementById('camPtzUrl');
        if (camPtzUrlEl) camPtzUrlEl.value = cam.ptzUrl || '';

        const camPtzUserEl = document.getElementById('camPtzUser');
        if (camPtzUserEl) camPtzUserEl.value = cam.ptzUser || '';

        const camPtzPassEl = document.getElementById('camPtzPass');
        if (camPtzPassEl) camPtzPassEl.value = cam.ptzPass || '';

        const statusEl = document.getElementById('ptzProbeStatus');
        if (statusEl) statusEl.innerHTML = '';

        document.getElementById('camMainUrl').value = cam.mainStreamUrl || '';
        document.getElementById('camSubUrl').value = cam.subStreamUrl || '';
        document.getElementById('camEnabled').checked = cam.enabled !== false;
        
        const recMode = document.getElementById('camRecordMode');
        if(recMode) recMode.value = cam.recordMode || 'disabled';
        
        const maxDays = document.getElementById('camMaxDays');
        if(maxDays) maxDays.value = cam.maxStorageDays || 7;
        
        const maxGb = document.getElementById('camMaxGB');
        if(maxGb) maxGb.value = cam.maxFolderSizeGB || 10;
        
        const segSec = document.getElementById('camSegmentSec');
        if(segSec) segSec.value = cam.segmentDurationSec || 900;
        
        const tc = document.getElementById('camTranscode');
        if(tc) tc.value = cam.transcode || 'auto';
        
        const sPath = document.getElementById('camStoragePath');
        if(sPath) sPath.value = cam.storagePath || '';
        
        const formTitle = document.getElementById('formTitle');
        if (formTitle) formTitle.textContent = 'Edit Kamera: ' + cam.name;
        
        const btnCancelEdit = document.getElementById('btnCancelEdit');
        if(btnCancelEdit) btnCancelEdit.style.display = 'inline-block';
        
        // Kembalikan form ke tab utama (Stream) secara default saat buka edit
        if (typeof switchCameraTab === 'function') {
            switchCameraTab('ctab-stream');
        }

        const cForm = document.getElementById('cameraForm');
        if(cForm) cForm.scrollIntoView({ behavior: 'smooth' });
    };

    window.deleteCamera = async function(id) {
        if (!confirm('Yakin ingin menghapus kamera ini? Data rekaman juga akan berhenti.')) return;
        try {
            const res = await authFetch('/api/cameras/' + id, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            alert('Kamera berhasil dihapus');
            fetchCameras();
        } catch (e) {
            alert('Gagal menghapus kamera: ' + e.message);
        }
    };
    
    function resetCameraForm() {
        const form = document.getElementById('cameraForm');
        if (form) form.reset();
        const idInput = document.getElementById('camId');
        if (idInput) idInput.value = '';
        const customIdInput = document.getElementById('camCustomId');
        if (customIdInput) customIdInput.value = '';
        
        const ptzSelect = document.getElementById('camPtzSelect');
        if (ptzSelect) ptzSelect.value = 'no';
        const ptzUrl = document.getElementById('camPtzUrl');
        if (ptzUrl) ptzUrl.value = '';
        const ptzUser = document.getElementById('camPtzUser');
        if (ptzUser) ptzUser.value = '';
        const ptzPass = document.getElementById('camPtzPass');
        if (ptzPass) ptzPass.value = '';
        const statusEl = document.getElementById('ptzProbeStatus');
        if (statusEl) statusEl.innerHTML = '';

        if (typeof switchCameraTab === 'function') {
            switchCameraTab('ctab-stream');
        }

        const formTitle = document.getElementById('formTitle');
        if (formTitle) formTitle.textContent = 'Tambah Kamera Baru';
        const btnCancelEdit = document.getElementById('btnCancelEdit');
        if (btnCancelEdit) btnCancelEdit.style.display = 'none';
    }

    // Wire up cancel edit button
    setTimeout(() => {
        const btnCancelEdit = document.getElementById('btnCancelEdit');
        if(btnCancelEdit) {
            btnCancelEdit.onclick = () => {
                resetCameraForm();
            };
        }
    }, 1000);


    /* second cameraForm removed */
    if (cameraForm) {
        if (cameraForm) cameraForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('camId').value;
            const ptzSelect = document.getElementById('camPtzSelect');
            const ptzVal = ptzSelect ? ptzSelect.value : 'no';
            const isPtz = ptzVal === 'yes' || ptzVal === 'v380_native';
            const ptzProtocol = ptzVal === 'v380_native' ? 'v380_native' : (isPtz ? 'onvif' : 'none');

            const payload = {
                id: document.getElementById('camCustomId') ? document.getElementById('camCustomId').value.trim() : undefined,
                name: document.getElementById('camName').value,
                ptzEnabled: isPtz,
                ptzProtocol: ptzProtocol,
                ptzUrl: document.getElementById('camPtzUrl') ? document.getElementById('camPtzUrl').value.trim() : '',
                ptzUser: document.getElementById('camPtzUser') ? document.getElementById('camPtzUser').value.trim() : '',
                ptzPass: document.getElementById('camPtzPass') ? document.getElementById('camPtzPass').value : '',
                mainStreamUrl: document.getElementById('camMainUrl').value,
                subStreamUrl: document.getElementById('camSubUrl').value,
                enabled: document.getElementById('camEnabled').checked,
                recordMode: document.getElementById('camRecordMode') ? document.getElementById('camRecordMode').value : 'disabled',
                maxStorageDays: document.getElementById('camMaxDays') ? parseInt(document.getElementById('camMaxDays').value) : 7,
                maxFolderSizeGB: document.getElementById('camMaxGB') ? parseFloat(document.getElementById('camMaxGB').value) : 10,
                segmentDurationSec: document.getElementById('camSegmentSec') ? parseInt(document.getElementById('camSegmentSec').value) : 900,
                transcode: document.getElementById('camTranscode') ? document.getElementById('camTranscode').value : 'auto',
                storagePath: document.getElementById('camStoragePath') ? document.getElementById('camStoragePath').value : ''
            };
            
            try {
                let res;
                if (id) {
                    res = await authFetch('/api/cameras/' + id, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                } else {
                    res = await authFetch('/api/cameras', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                }
                
                if (!res.ok) throw new Error(await res.text());
                alert('Kamera berhasil disimpan!');
                
                cameraForm.reset();
                document.getElementById('camId').value = '';
                const btnCancelEdit = document.getElementById('btnCancelEdit');
                if (btnCancelEdit) btnCancelEdit.style.display = 'none';
                
                fetchCameras();
            } catch (err) {
                alert('Gagal menyimpan kamera: ' + err.message);
            }
        });
    }

    /* second globalStorageForm removed */
    if (globalStorageForm) globalStorageForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const storageDevice = document.getElementById('sysStorageDevice') ? document.getElementById('sysStorageDevice').value : '';
            const customPath = document.getElementById('sysCustomStoragePath') ? document.getElementById('sysCustomStoragePath').value : '';
            const finalPath = storageDevice === 'custom' ? customPath : storageDevice;
            
            const payload = { globalStoragePath: finalPath };
            const sysGSM = document.getElementById('sysGlobalStorageMode');
            if (sysGSM) payload.globalStorageMode = sysGSM.value;
            const sysRQ = document.getElementById('sysRecordingQuality');
            if (sysRQ) payload.recordingQuality = sysRQ.value;
            try {
                const res = await authFetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Gagal menyimpan pengaturan storage');
                
                if (finalPath && finalPath !== 'custom') {
                    await authFetch('/api/system/storage-devices/select', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ storagePath: finalPath })
                    });
                }
                
                alert('Pengaturan storage berhasil disimpan');
            } catch (err) {
                alert(err.message);
            }
        });

    if (systemForm) systemForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {};
            const sysNet = document.getElementById('sysNetInterface');
            if (sysNet) payload.netInterface = sysNet.value;
            const sysPort = document.getElementById('sysMediaMtxPort');
            if (sysPort && sysPort.value) payload.mediamtxPort = parseInt(sysPort.value);
            const sysPlayer = document.getElementById('sysPlayerMode');
            if (sysPlayer) payload.playerMode = sysPlayer.value;
            const sysTgBot = document.getElementById('sysTgBot');
            if (sysTgBot) payload.telegramBotToken = sysTgBot.value;
            const sysTgChat = document.getElementById('sysTgChat');
            if (sysTgChat) payload.telegramChatId = sysTgChat.value;
            try {
                const res = await authFetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Gagal menyimpan pengaturan sistem');
                alert('Konfigurasi sistem berhasil disimpan!');
            } catch (err) {
                alert(err.message);
            }
        });

    // Refresh Storage button
    /* second btnRefreshStorage removed */

async function loadStorageDevices() {
        const selEl = document.getElementById('sysStorageDevice');
        const customInput = document.getElementById('sysCustomStoragePath');
        if (!selEl) return;

        try {
            selEl.innerHTML = '<option value="">Memindai drive penyimpanan...</option>';
            const res = await authFetch('/api/system/storage-devices');
            if (!res.ok) throw new Error('Gagal memuat daftar perangkat penyimpanan');
            const data = await res.json();
            
            const detectedStorageDevices = data.devices || [];
            selEl.innerHTML = '';
            
            const currentPath = data.currentStoragePath || '';
            let customFound = true;
            
            if (detectedStorageDevices.length === 0) {
                selEl.innerHTML = '<option value="">Tidak ada media eksternal terdeteksi</option>';
            } else {
                let matchFound = false;
                detectedStorageDevices.forEach(dev => {
                    const opt = document.createElement('option');
                    opt.value = dev.mountPath;
                    
                    const icon = dev.category === 'External' ? '🔌 [USB/HDD]' : (dev.category === 'Internal' ? '💽 [Internal]' : '📁 [Kustom]');
                    opt.textContent = `${icon} ${dev.name} • Sisa: ${dev.freeGB} GB (${dev.percentUsed}% terpakai)`;
                    
                    if (dev.selected || dev.mountPath === currentPath) {
                        opt.selected = true;
                        matchFound = true;
                    }
                    selEl.appendChild(opt);
                });
                
                // Add Custom Path Option
                const optCustom = document.createElement('option');
                optCustom.value = "custom";
                optCustom.textContent = "⚙️ Jalur Kustom (Ketik manual)...";
                if (!matchFound && currentPath) {
                    optCustom.selected = true;
                    customFound = false;
                }
                selEl.appendChild(optCustom);
            }

            if (customInput) {
                if (!customFound && currentPath) {
                    customInput.style.display = 'block';
                    customInput.value = currentPath;
                } else {
                    customInput.style.display = 'none';
                    customInput.value = '';
                }
            }
        } catch (err) {
            selEl.innerHTML = '<option value="">Gagal memuat drive eksternal</option>';
        }
    }

    if (btnRefreshStorage) {
        btnRefreshStorage.addEventListener('click', loadStorageDevices);
    }
    
    if (sysStorageDevice && sysCustomStoragePath) {
        sysStorageDevice.addEventListener('change', () => {
            if (sysStorageDevice.value === 'custom') {
                sysCustomStoragePath.style.display = 'block';
                sysCustomStoragePath.focus();
            } else {
                sysCustomStoragePath.style.display = 'none';
            }
        });
    }

    // Call it on admin load if exists
    if (document.getElementById('sysStorageDevice')) {
        loadStorageDevices();
    }


    // --- Camera Fetch & Grid Rendering ---
async function fetchCameras() {
        try {
            const res = await authFetch('/api/cameras');
            if (res.status === 401) {
                localStorage.removeItem("nvr_auth_token");
                authOverlay.style.display = "flex";
                adminApp.style.display = "none";
                userApp.style.display = "none";
                return;
            }
            const data = await res.json();
            cameras = data.cameras || [];
            window.cameras = cameras;
            window.fetchCameras = fetchCameras;
            window.globalStorageMode = data.globalStorageMode || 'disabled';

            // Update Kuota UI untuk Administrator Gedung
            if (data.quota) {
                const banner = document.getElementById('adminCameraQuotaBanner');
                const qCams = document.getElementById('quotaCamsText');
                const qStorage = document.getElementById('quotaStorageText');
                const qGedung = document.getElementById('quotaAdminGedungText');
                const sideCams = document.getElementById('sidebarQuotaCams');
                const sideStorage = document.getElementById('sidebarQuotaStorage');
                const sideBox = document.getElementById('quotaBadgeContainer');

                if (banner && qCams && qStorage) {
                    banner.style.display = 'flex';
                    qCams.textContent = `${data.quota.currentCameras} / ${data.quota.maxCameras} Kamera`;
                    qStorage.textContent = `${data.quota.usedStorageGB} / ${data.quota.maxStorageGB} GB`;
                    if (qGedung) qGedung.textContent = `Gedung: ${data.quota.adminName}`;
                }

                if (sideBox && sideCams && sideStorage) {
                    sideBox.style.display = 'block';
                    sideCams.textContent = `${data.quota.currentCameras} / ${data.quota.maxCameras}`;
                    sideStorage.textContent = `${data.quota.usedStorageGB} / ${data.quota.maxStorageGB} GB`;
                }
            }

            renderAdminGrid(currentGridCount);
            renderModalCameraList();
            populateCameraSelects();
            if(typeof renderRecordCameraList === 'function') renderRecordCameraList();
            if(typeof renderUserCamCheckboxes === 'function') renderUserCamCheckboxes('newUserCamCheckboxes');
        } catch (err) {
        }
    }

    
    
    let activeChannel = 'all';
    let selectedCamIdForPtz = null;
    let gridPageIndex = 0; // Pagination page index for camera grid view

    window.setGridLayout = function(count) {
        currentGridCount = count;
        gridPageIndex = 0;
        document.querySelectorAll('.nvr-grid-btn, .grid-btn').forEach(btn => {
            if (parseInt(btn.getAttribute('data-grid')) === count) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        updateGridDisplay();
    };

    window.onChannelDropdownChange = function(val) {
        activeChannel = val;
        gridPageIndex = 0;
        updateGridDisplay();
    };

    window.nextGridPage = function() {
        const activeGridBtn = document.querySelector('.nvr-grid-btn.active, .grid-btn.active');
        const count = activeGridBtn ? parseInt(activeGridBtn.getAttribute('data-grid')) : currentGridCount || 9;
        const totalPages = Math.max(1, Math.ceil(cameras.length / count));
        if (gridPageIndex < totalPages - 1) {
            gridPageIndex++;
            updateGridDisplay();
        }
    };

    window.prevGridPage = function() {
        if (gridPageIndex > 0) {
            gridPageIndex--;
            updateGridDisplay();
        }
    };

    function populateChannelDropdown() {
        const sel = document.getElementById('camChannelSelect');
        if (!sel) return;
        
        const currentVal = activeChannel || 'all';
        sel.innerHTML = '<option value="all">View: ALL</option>';
        
        if (Array.isArray(cameras) && cameras.length > 0) {
            cameras.forEach((cam, idx) => {
                const opt = document.createElement('option');
                opt.value = cam.id;
                const camLabel = cam.name || `Kamera ${idx + 1}`;
                opt.textContent = `View: CH ${idx + 1} - ${camLabel}`;
                if (cam.id === currentVal) {
                    opt.selected = true;
                }
                sel.appendChild(opt);
            });
        }
        
        sel.value = currentVal;
        if (sel.value !== currentVal) {
            sel.value = 'all';
            activeChannel = 'all';
        }
    }

    function populateCameraSelects() {
        populateChannelDropdown();
        
        // Populate Playback Camera Select
        const selRecCam = document.getElementById('selRecCam');
        if (selRecCam && Array.isArray(cameras)) {
            const prevVal = selRecCam.value;
            selRecCam.innerHTML = '<option value="">-- Pilih Kamera --</option>';
            cameras.forEach((cam, idx) => {
                const opt = document.createElement('option');
                opt.value = cam.id;
                opt.textContent = `CH ${idx + 1}: ${cam.name || ('Kamera ' + (idx + 1))}`;
                selRecCam.appendChild(opt);
            });
            if (prevVal && cameras.some(c => c.id === prevVal)) {
                selRecCam.value = prevVal;
            } else if (cameras.length > 0) {
                selRecCam.value = cameras[0].id;
            }
        }
        
        // Populate Mobile Playback Camera Select
        const mSelRecCam = document.getElementById('mSelRecCam');
        if (mSelRecCam && Array.isArray(cameras)) {
            const prevM = mSelRecCam.value;
            mSelRecCam.innerHTML = '<option value="">-- Pilih Kamera --</option>';
            cameras.forEach((cam, idx) => {
                const opt = document.createElement('option');
                opt.value = cam.id;
                opt.textContent = `CH ${idx + 1}: ${cam.name || ('Kamera ' + (idx + 1))}`;
                mSelRecCam.appendChild(opt);
            });
            if (prevM && cameras.some(c => c.id === prevM)) {
                mSelRecCam.value = prevM;
            } else if (cameras.length > 0) {
                mSelRecCam.value = cameras[0].id;
            }
        }

        // Populate AI Cam Select if element exists
        const aiCamSelect = document.getElementById('ai-cam-select');
        if (aiCamSelect && Array.isArray(cameras)) {
            const prevAi = aiCamSelect.value;
            aiCamSelect.innerHTML = '<option value="">-- Pilih Kamera --</option>';
            cameras.forEach((cam, idx) => {
                const opt = document.createElement('option');
                opt.value = cam.id;
                opt.textContent = `CH ${idx + 1}: ${cam.name || ('Kamera ' + (idx + 1))}`;
                aiCamSelect.appendChild(opt);
            });
            if (prevAi && cameras.some(c => c.id === prevAi)) {
                aiCamSelect.value = prevAi;
            }
        }
    }
    window.populateCameraSelects = populateCameraSelects;
    window.populateChannelDropdown = populateChannelDropdown;

    function renderChannelButtons() {
        populateChannelDropdown();

        const channelBar = document.getElementById('channelBar');
        const mChannelBar = document.getElementById('mChannelBar');
        const mobileQuickChannels = document.getElementById('mobileQuickChannels');
        
        function populateBar(bar) {
            if (!bar) return;
            bar.innerHTML = '';
            
            const btnAll = document.createElement('button');
            btnAll.className = 'btn-sm ' + (activeChannel === 'all' ? 'btn-primary' : 'btn-secondary');
            btnAll.textContent = 'ALL';
            btnAll.style.fontWeight = 'bold';
            btnAll.style.whiteSpace = 'nowrap';
            btnAll.onclick = () => { activeChannel = 'all'; updateGridDisplay(); };
            bar.appendChild(btnAll);

            cameras.forEach((cam, idx) => {
                const btn = document.createElement('button');
                btn.className = 'btn-sm ' + (activeChannel === cam.id ? 'btn-primary' : 'btn-secondary');
                btn.textContent = 'CH' + (idx + 1) + ' : ' + cam.name;
                btn.style.whiteSpace = 'nowrap';
                btn.onclick = () => { activeChannel = cam.id; updateGridDisplay(); };
                bar.appendChild(btn);
            });
        }
        
        populateBar(channelBar);
        populateBar(mChannelBar);
        populateBar(mobileQuickChannels);
    }

    function updateGridDisplay() {
        renderChannelButtons();
        const activeGridBtn = document.querySelector('.nvr-grid-btn.active, .grid-btn.active');
        let count = activeGridBtn ? parseInt(activeGridBtn.getAttribute('data-grid')) : currentGridCount || 9;
        
        if (activeChannel !== 'all') {
            count = 1; 
            selectedCamIdForPtz = activeChannel;
        } else {
            // Keep selection if exists, else default to first
            if (!cameras.find(c => c.id === selectedCamIdForPtz)) {
                selectedCamIdForPtz = cameras[0] ? cameras[0].id : null;
            }
        }

        // Update Paging Indicator & Controls
        const pageIndicator = document.getElementById('gridPageIndicator');
        const btnPrev = document.getElementById('btnPrevGridPage');
        const btnNext = document.getElementById('btnNextGridPage');
        const gridPageNav = document.getElementById('gridPageNav');

        if (activeChannel !== 'all') {
            if (gridPageNav) gridPageNav.style.display = 'none';
        } else {
            if (gridPageNav) gridPageNav.style.display = 'flex';
            const totalPages = Math.max(1, Math.ceil(cameras.length / count));
            if (gridPageIndex >= totalPages) {
                gridPageIndex = Math.max(0, totalPages - 1);
            }
            if (pageIndicator) {
                pageIndicator.textContent = `Hal ${gridPageIndex + 1}/${totalPages}`;
            }
            if (btnPrev) {
                btnPrev.disabled = (gridPageIndex === 0);
            }
            if (btnNext) {
                btnNext.disabled = (gridPageIndex >= totalPages - 1);
            }
        }

        renderGridCells(count);
        updatePtzVisibility();
    }

    
    let selectedVideoElement = null;

    function initBottomPlayerControls() {

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
        return `${h}:${m}:${s}`;
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

        const btnPlay = document.getElementById('btnPlayerPlay');
        const btnMute = document.getElementById('btnPlayerMute');
        const sliderVol = document.getElementById('playerVolume');
        const btnFull = document.getElementById('btnPlayerFullscreen');

        if(btnPlay) btnPlay.addEventListener('click', () => {
            if(!selectedVideoElement) return;
            if(selectedVideoElement.paused) {
                selectedVideoElement.play();
                btnPlay.textContent = '⏸️';
            } else {
                selectedVideoElement.pause();
                btnPlay.textContent = '▶️';
            }
        });

        if(btnMute) btnMute.addEventListener('click', () => {
            if(!selectedVideoElement) return;
            selectedVideoElement.muted = !selectedVideoElement.muted;
            btnMute.textContent = selectedVideoElement.muted ? '🔇' : '🔊';
        });

        if(sliderVol) sliderVol.addEventListener('input', (e) => {
            if(!selectedVideoElement) return;
            selectedVideoElement.volume = e.target.value;
            if(e.target.value > 0) {
                selectedVideoElement.muted = false;
                if(btnMute) btnMute.textContent = '🔊';
            }
        });

        if(btnFull) btnFull.addEventListener('click', () => {
            if(!selectedVideoElement) return;
            if(selectedVideoElement.requestFullscreen) {
                selectedVideoElement.requestFullscreen();
            } else if (selectedVideoElement.webkitRequestFullscreen) {
                selectedVideoElement.webkitRequestFullscreen();
            }
        });
    }

    window.camStreamQualities = window.camStreamQualities || {};

    function updateQualityButtonUI(camId) {
        const btnQuality = document.getElementById('btnPlayerQuality');
        const labelQuality = document.getElementById('playerQualityLabel');
        const effectiveId = camId || selectedCamIdForPtz || (activeChannel !== 'all' ? activeChannel : cameras[0]?.id);
        const q = (effectiveId && window.camStreamQualities[effectiveId]) || 'HD';
        if (labelQuality) labelQuality.textContent = q;
        if (btnQuality) {
            if (q === 'SD') {
                btnQuality.classList.add('is-sd');
            } else {
                btnQuality.classList.remove('is-sd');
            }
        }
    }
    window.updateQualityButtonUI = updateQualityButtonUI;

    window.toggleSelectedQuality = function() {
        const targetId = selectedCamIdForPtz || (activeChannel !== 'all' ? activeChannel : (cameras[0]?.id));
        if (!targetId) {
            alert('Pilih kamera di layar terlebih dahulu.');
            return;
        }
        
        const cur = window.camStreamQualities[targetId] || 'HD';
        const next = (cur === 'HD') ? 'SD' : 'HD';
        window.camStreamQualities[targetId] = next;
        
        updateQualityButtonUI(targetId);
        
        // Find video element and switch source dynamically
        const cam = cameras.find(c => c.id === targetId);
        if (!cam) return;
        
        let hlsUrl = '';
        if (next === 'SD') {
            if (cam.subStreamUrl && cam.subStreamUrl.startsWith('http')) {
                hlsUrl = cam.subStreamUrl;
            } else if (cam.subStreamUrl && cam.subStreamUrl.trim() !== '') {
                hlsUrl = '/stream/' + (cam.mediaMtxPath || cam.id) + '_sub/index.m3u8?token=' + encodeURIComponent(getAuthToken());
            } else {
                hlsUrl = cam.mainStreamUrl && cam.mainStreamUrl.startsWith('http') ? cam.mainStreamUrl : ('/stream/' + (cam.mediaMtxPath || cam.id) + '/index.m3u8?token=' + encodeURIComponent(getAuthToken()));
            }
        } else {
            hlsUrl = cam.mainStreamUrl && cam.mainStreamUrl.startsWith('http') ? cam.mainStreamUrl : ('/stream/' + (cam.mediaMtxPath || cam.id) + '/index.m3u8?token=' + encodeURIComponent(getAuthToken()));
        }

        const cell = document.getElementById('cell_' + targetId) || document.getElementById('m_cell_' + targetId);
        if (cell) {
            const video = cell.querySelector('video');
            if (video && video.id) {
                if (activeHlsPlayers[video.id]) {
                    activeHlsPlayers[video.id].destroy();
                    delete activeHlsPlayers[video.id];
                }
                initHlsPlayer(video.id, hlsUrl);
            }
        }
    };

    function updateBottomPlayerUI() {
        const pCtrl = document.getElementById('playerControls');
        const btnPlay = document.getElementById('btnPlayerPlayPause') || document.getElementById('btnPlayerPlay');
        const btnPlayIcon = document.getElementById('playerPlayIcon');
        const btnPlayText = document.getElementById('playerPlayText');
        const btnMute = document.getElementById('btnPlayerAudioMute') || document.getElementById('btnPlayerMute');
        const btnMuteIcon = document.getElementById('playerMuteIcon');
        const sliderVol = document.getElementById('selectedCamVolume') || document.getElementById('playerVolume');

        if (!selectedVideoElement) {
            if (pCtrl) {
                pCtrl.style.opacity = '0.5';
                pCtrl.style.pointerEvents = 'none';
            }
        } else {
            if (pCtrl) {
                pCtrl.style.opacity = '1';
                pCtrl.style.pointerEvents = 'auto';
            }
            if (btnPlayIcon) {
                btnPlayIcon.textContent = selectedVideoElement.paused ? '▶' : '⏸';
            }
            if (btnPlayText) {
                btnPlayText.textContent = selectedVideoElement.paused ? 'Play' : 'Pause';
            }
            if (btnPlay && !btnPlayIcon) {
                btnPlay.textContent = selectedVideoElement.paused ? '▶️ Play' : '⏸️ Pause';
            }
            if (btnMuteIcon) {
                btnMuteIcon.textContent = selectedVideoElement.muted ? '🔇' : '🔊';
            }
            if (btnMute && !btnMuteIcon) {
                btnMute.textContent = selectedVideoElement.muted ? '🔇 Bisu' : '🔊 Suara';
            }
            if (sliderVol) {
                sliderVol.value = selectedVideoElement.muted ? 0 : Math.round((selectedVideoElement.volume || 1) * 100);
            }
        }
        updateQualityButtonUI(selectedCamIdForPtz);
    }

    window.selectCellForPtz = function(camId) {
        selectedCamIdForPtz = camId;
        document.querySelectorAll('.cam-cell').forEach(cell => cell.classList.remove('selected'));
        const activeCell = document.getElementById('cell_' + camId) || document.getElementById('m_cell_' + camId);
        if (activeCell) {
            activeCell.classList.add('selected');
            selectedVideoElement = activeCell.querySelector('video');
        } else {
            selectedVideoElement = null;
        }
        updateBottomPlayerUI();
        updatePtzVisibility();
    };

    
    function updatePtzVisibility() {
        const ptzController = document.getElementById('ptzController');
        const ptzPlaceholder = document.getElementById('ptzPlaceholder');
        const mPtzController = document.getElementById('mPtzController');
        
        const cam = cameras.find(c => c.id === selectedCamIdForPtz);
        const hasPtz = true; // Forced active by user request
        
        if (ptzController) ptzController.style.display = hasPtz ? 'grid' : 'none';
        if (ptzPlaceholder) {
            ptzPlaceholder.style.display = hasPtz ? 'none' : 'block';
            if (cam && !cam.ptzEnabled) {
                ptzPlaceholder.textContent = "Kamera ini tidak memiliki konfigurasi PTZ.";
            } else if (!cam) {
                ptzPlaceholder.textContent = "Pilih kamera di layar untuk mengaktifkan PTZ";
            }
        }
        if (mPtzController) mPtzController.style.display = hasPtz ? 'grid' : 'none';

        const mActiveCamLabel = document.getElementById('mActiveCamLabel');
        const topActiveCamLabel = document.getElementById('topActiveCamLabel');

        if (topActiveCamLabel) {
            topActiveCamLabel.textContent = cam ? cam.name : (activeChannel !== 'all' ? (cameras.find(c => c.id === activeChannel)?.name || `CH ${activeChannel}`) : (cameras[0]?.name || 'Pilih di grid'));
            topActiveCamLabel.style.color = cam ? '#38bdf8' : '#94a3b8';
        }

        if (mActiveCamLabel) {
            if (cam) {
                mActiveCamLabel.textContent = `Kamera: ${cam.name}`;
            } else if (activeChannel !== 'all') {
                const ac = cameras.find(c => c.id === activeChannel);
                mActiveCamLabel.textContent = ac ? `Kamera: ${ac.name}` : `Kamera: CH ${activeChannel}`;
            } else {
                mActiveCamLabel.textContent = 'Kamera: Multi-View (Semua)';
            }
        }
    }

    window.reloadActiveStreams = function() {
        updateGridDisplay();
    };

    window.toggleSelectedPlayPause = function() {
        const targetId = selectedCamIdForPtz || (activeChannel !== 'all' ? activeChannel : (cameras[0]?.id));
        if (!targetId) return;
        const cell = document.getElementById('cell_' + targetId);
        const video = cell ? cell.querySelector('video') : null;
        const icon = document.getElementById('playerPlayIcon');
        const btn = document.getElementById('btnPlayerPlayPause');
        if (video) {
            if (video.paused) {
                video.play().catch(e => console.log('Play error:', e));
                if (icon) icon.textContent = '⏸';
                if (btn && !icon) btn.textContent = '⏸️ Pause';
            } else {
                video.pause();
                if (icon) icon.textContent = '▶';
                if (btn && !icon) btn.textContent = '▶️ Play';
            }
        }
    };

    window.toggleSelectedMute = function() {
        const targetId = selectedCamIdForPtz || (activeChannel !== 'all' ? activeChannel : (cameras[0]?.id));
        if (!targetId) return;
        const cell = document.getElementById('cell_' + targetId);
        const video = cell ? cell.querySelector('video') : null;
        const icon = document.getElementById('playerMuteIcon');
        const btn = document.getElementById('btnPlayerAudioMute');
        const sliderVol = document.getElementById('selectedCamVolume');
        if (video) {
            video.muted = !video.muted;
            if (icon) icon.textContent = video.muted ? '🔇' : '🔊';
            if (btn && !icon) btn.textContent = video.muted ? '🔇 Bisu' : '🔊 Suara';
            if (sliderVol && video.muted) {
                sliderVol.value = 0;
            } else if (sliderVol && !video.muted) {
                sliderVol.value = Math.round((video.volume || 1) * 100);
            }
        }
    };

    window.setSelectedVolume = function(val) {
        const targetId = selectedCamIdForPtz || (activeChannel !== 'all' ? activeChannel : (cameras[0]?.id));
        if (!targetId) return;
        const cell = document.getElementById('cell_' + targetId);
        const video = cell ? cell.querySelector('video') : null;
        const btn = document.getElementById('btnPlayerAudioMute');
        if (video) {
            const numVal = parseInt(val, 10);
            video.volume = Math.max(0, Math.min(1, numVal / 100));
            if (numVal > 0) {
                video.muted = false;
                if (btn) btn.textContent = '🔊 Suara';
            } else {
                video.muted = true;
                if (btn) btn.textContent = '🔇 Bisu';
            }
        }
    };

    window.takeSnapshotSelected = function() {
        const targetId = selectedCamIdForPtz || (activeChannel !== 'all' ? activeChannel : (cameras[0]?.id));
        if (!targetId) {
            alert("Silakan pilih kamera di layar terlebih dahulu.");
            return;
        }
        const cell = document.getElementById('cell_' + targetId);
        const video = cell ? cell.querySelector('video') : null;
        if (!video) {
            alert("Video kamera belum aktif atau sedang memuat.");
            return;
        }
        try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 1280;
            canvas.height = video.videoHeight || 720;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `snapshot_${targetId}_${Date.now()}.jpg`;
            a.click();
        } catch (e) {
            alert("Gagal snapshot: " + e.message);
        }
    };
    let isPtzSending = false;
    window.ptzMoveSelected = async function(direction) {
        let targetId = selectedCamIdForPtz;
        if (!targetId) {
            targetId = (activeChannel && activeChannel !== 'all') ? activeChannel : (cameras[0]?.id);
            if (targetId) {
                window.selectCellForPtz(targetId);
            }
        }

        if (!targetId) {
            alert('Pilih kamera di layar grid terlebih dahulu untuk mengontrol PTZ.');
            return;
        }

        if (isPtzSending && direction !== 'stop') {
            return; // Hindari spam request bersamaan
        }

        isPtzSending = true;
        try {
            const res = await authFetch(`/api/cameras/${encodeURIComponent(targetId)}/ptz`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ direction, speed: 1.0, durationMs: 450 })
            });
            
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                const errMsg = data.error || 'Gagal mengirim perintah PTZ.';
                console.warn('[PTZ Error]', errMsg);
                // Alert ramah jika gagal
                alert(`⚠️ Kontrol PTZ (${direction}):\n${errMsg}\n\nTips: Pastikan fitur ONVIF aktif di menu pengaturan IP Kamera Anda.`);
            }
        } catch(e) {
            console.error('Kesalahan jaringan PTZ:', e);
            alert('Kesalahan jaringan saat mengirim perintah PTZ: ' + e.message);
        } finally {
            setTimeout(() => { isPtzSending = false; }, 200);
        }
    };

    
    
    
    window.toggleClipList = function() {
        const sidebar = document.getElementById('pbClipSidebar');
        if(!sidebar) return;
        if(sidebar.style.display === 'none') {
            sidebar.style.display = 'flex';
        } else {
            sidebar.style.display = 'none';
        }
    };

    window.toggleTopControls = function() {
        const panel = document.getElementById('topControlPanel');
        const btn = document.getElementById('btnToggleControls');
        if (panel) {
            const isOpen = panel.classList.contains('fullscreen-open');
            if (isOpen) {
                panel.classList.remove('fullscreen-open');
                if (btn) {
                    btn.style.opacity = '0.7';
                    btn.style.background = 'var(--surface)';
                    btn.style.color = '';
                }
            } else {
                panel.classList.add('fullscreen-open');
                if (btn) {
                    btn.style.opacity = '1';
                    btn.style.background = '#3b82f6';
                    btn.style.color = '#fff';
                }
            }
        }
    };

    // Fullscreen state listener and class synchronizer
    function handleFullscreenChange() {
        const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
        const wrapper = document.getElementById('monitorWrapper');
        const panel = document.getElementById('topControlPanel');
        const btn = document.getElementById('btnToggleControls');
        
        if (wrapper) {
            if (isFS) {
                wrapper.classList.add('is-fullscreen');
            } else {
                wrapper.classList.remove('is-fullscreen');
            }
        }
        
        if (!isFS) {
            if (panel) panel.classList.remove('fullscreen-open');
            if (btn) {
                btn.style.opacity = '0.85';
                btn.style.background = 'var(--surface)';
                btn.style.color = '';
            }
        }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    window.toggleGridFullscreen = function(gridId) {
        const elem = document.getElementById(gridId);
        if (!elem) return;
        const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
        if (!isFS) {
            const req = elem.requestFullscreen || elem.webkitRequestFullscreen || elem.mozRequestFullScreen || elem.msRequestFullscreen;
            if (req) {
                req.call(elem).catch(err => {
                    console.warn("Fullscreen request error:", err);
                });
            }
        } else {
            const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
            if (exit) {
                exit.call(document);
            }
        }
    };

    

    const activeHlsPlayers = {};
    window.activeHlsPlayers = activeHlsPlayers;

    function destroyHlsPlayers() {
        for (const id in activeHlsPlayers) {
            if (activeHlsPlayers[id]) {
                activeHlsPlayers[id].destroy();
            }
            delete activeHlsPlayers[id];
        }
    }
    window.destroyHlsPlayers = destroyHlsPlayers;

    function initHlsPlayer(elementId, hlsUrl) {
        const video = document.getElementById(elementId);
        if (!video) return;

        if (Hls.isSupported()) {
            const hls = new Hls({
                lowLatencyMode: true,
                maxBufferLength: 4,
                maxMaxBufferLength: 6,
                maxBufferSize: 10 * 1024 * 1024, // 10 MB per player
                backBufferLength: 0,
                enableWorker: true
            });
            activeHlsPlayers[elementId] = hls;
            hls.loadSource(hlsUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, function() {
                video.play().catch(e => console.log('Autoplay prevented:', e));
            });
            hls.on(Hls.Events.ERROR, function(event, data) {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            // Add a delay to prevent infinite immediate retry loop if backend is down
                            setTimeout(() => {
                                if (activeHlsPlayers[elementId]) {
                                    hls.startLoad();
                                }
                            }, 5000);
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            hls.recoverMediaError();
                            break;
                        default:
                            hls.destroy();
                            break;
                    }
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = hlsUrl;
            video.addEventListener('loadedmetadata', function() {
                video.play().catch(e => console.log('Autoplay prevented:', e));
            });
        }
    }

    window.refreshAllStreams = function() {
        destroyHlsPlayers();
        updateGridDisplay();
    };

    function renderGridCells(count) {
        if (videoGrid) {
            videoGrid.className = "video-grid grid-" + count;
            videoGrid.innerHTML = "";
        }
        const mVideoGrid = document.getElementById("mVideoGrid");
        if (mVideoGrid) {
            mVideoGrid.className = "video-grid grid-" + count;
            mVideoGrid.innerHTML = "";
        }
        
        destroyHlsPlayers();
        
        let camsToShow = [];
        if (activeChannel === 'all') {
            const startIdx = gridPageIndex * count;
            camsToShow = cameras.slice(startIdx, startIdx + count);
        } else {
            const c = cameras.find(x => x.id === activeChannel);
            if (c) camsToShow.push(c);
        }

        const inits = [];
        const isUserApp = document.getElementById("userApp") && document.getElementById("userApp").style.display !== "none";
        const renderForDesktop = Boolean(videoGrid && (!isUserApp || currentUserRole !== 'user'));
        const renderForMobile = Boolean(mVideoGrid && (isUserApp || currentUserRole === 'user'));

        for (let i = 0; i < count; i++) {
            const cam = camsToShow[i];
            
            // Generate for Admin / Desktop Main Grid
            if (renderForDesktop) {
                const cell = document.createElement("div");
                if (cam) {
                    cell.className = "cam-cell" + (cam.id === selectedCamIdForPtz ? " selected" : "");
                    cell.id = "cell_" + cam.id;
                    cell.onclick = () => window.selectCellForPtz(cam.id);
                    
                    const curQuality = (window.camStreamQualities && window.camStreamQualities[cam.id]) || 'HD';
                    let hlsUrl = '';
                    if (curQuality === 'SD') {
                        if (cam.subStreamUrl && cam.subStreamUrl.startsWith('http')) {
                            hlsUrl = cam.subStreamUrl;
                        } else if (cam.subStreamUrl && cam.subStreamUrl.trim() !== '') {
                            hlsUrl = '/stream/' + (cam.mediaMtxPath || cam.id) + '_sub/index.m3u8?token=' + encodeURIComponent(getAuthToken());
                        } else {
                            hlsUrl = cam.mainStreamUrl && cam.mainStreamUrl.startsWith('http') ? cam.mainStreamUrl : ('/stream/' + (cam.mediaMtxPath || cam.id) + '/index.m3u8?token=' + encodeURIComponent(getAuthToken()));
                        }
                    } else {
                        hlsUrl = cam.mainStreamUrl && cam.mainStreamUrl.startsWith('http') ? cam.mainStreamUrl : ('/stream/' + (cam.mediaMtxPath || cam.id) + '/index.m3u8?token=' + encodeURIComponent(getAuthToken()));
                    }
                    const videoId = "cam_video_admin_" + i;
                    
                    cell.innerHTML = `
                        <div style="position:relative; width:100%; height:100%; background: #000; overflow: hidden; border:1px solid var(--border);">
                            <video id="${videoId}" class="cam-player-video" autoplay muted playsinline style="width:100%; height:100%; object-fit:fill; pointer-events:none;"></video>
                            
                            <div style="position:absolute; top:5px; right:5px; z-index:10; display:flex; gap:5px;">
                                ${cam.isRecording ? '<span class="badge-rec">REC</span>' : ''}
                            </div>
                            <div class="cam-title-bar">
                                ${cam.name || ('Kamera ' + (i + 1))}
                            </div>
                        </div>
                    `;
                    inits.push(() => { if (cam.enabled !== false) initHlsPlayer(videoId, hlsUrl); });
                } else {
                    cell.className = "cam-cell empty-cell";
                    cell.id = "cell_empty_" + i;
                    cell.innerHTML = `
                        <div style="display:flex; height:100%; width:100%; align-items:center; justify-content:center; flex-direction:column; background:var(--surface);">
                            <span style="font-size:2rem; opacity:0.4;">📹</span>
                            <span style="font-size:0.8rem; color:var(--text-muted); margin-top:5px;">Kosong</span>
                        </div>
                    `;
                }
                videoGrid.appendChild(cell);
            }

            // Generate for Mobile / Client Grid
            if (renderForMobile) {
                const mCell = document.createElement("div");
                if (cam) {
                    mCell.className = "cam-cell" + (cam.id === selectedCamIdForPtz ? " selected" : "");
                    mCell.id = "m_cell_" + cam.id;
                    mCell.onclick = () => window.selectCellForPtz(cam.id);
                    
                    const curQuality = (window.camStreamQualities && window.camStreamQualities[cam.id]) || 'HD';
                    let hlsUrl = '';
                    if (curQuality === 'SD') {
                        if (cam.subStreamUrl && cam.subStreamUrl.startsWith('http')) {
                            hlsUrl = cam.subStreamUrl;
                        } else if (cam.subStreamUrl && cam.subStreamUrl.trim() !== '') {
                            hlsUrl = '/stream/' + (cam.mediaMtxPath || cam.id) + '_sub/index.m3u8?token=' + encodeURIComponent(getAuthToken());
                        } else {
                            hlsUrl = cam.mainStreamUrl && cam.mainStreamUrl.startsWith('http') ? cam.mainStreamUrl : ('/stream/' + (cam.mediaMtxPath || cam.id) + '/index.m3u8?token=' + encodeURIComponent(getAuthToken()));
                        }
                    } else {
                        hlsUrl = cam.mainStreamUrl && cam.mainStreamUrl.startsWith('http') ? cam.mainStreamUrl : ('/stream/' + (cam.mediaMtxPath || cam.id) + '/index.m3u8?token=' + encodeURIComponent(getAuthToken()));
                    }
                    const videoId = "cam_video_mobile_" + i;
                    
                    mCell.innerHTML = `
                        <div style="position:relative; width:100%; height:100%; background: #000; overflow: hidden; border:1px solid var(--border);">
                            <video id="${videoId}" class="cam-player-video" autoplay muted playsinline style="width:100%; height:100%; object-fit:fill; pointer-events:none;"></video>
                            
                            <div style="position:absolute; top:5px; right:5px; z-index:10; display:flex; gap:5px;">
                                ${cam.isRecording ? '<span class="badge-rec">REC</span>' : ''}
                            </div>
                            <div class="cam-title-bar">
                                ${cam.name || ('Kamera ' + (i + 1))}
                            </div>
                        </div>
                    `;
                    inits.push(() => { if (cam.enabled !== false) initHlsPlayer(videoId, hlsUrl); });
                } else {
                    mCell.className = "cam-cell empty-cell";
                    mCell.id = "m_cell_empty_" + i;
                    mCell.innerHTML = `
                        <div style="display:flex; height:100%; width:100%; align-items:center; justify-content:center; flex-direction:column; background:var(--surface);">
                            <span style="font-size:2rem; opacity:0.4;">📹</span>
                            <span style="font-size:0.8rem; color:var(--text-muted); margin-top:5px;">Kosong</span>
                        </div>
                    `;
                }
                mVideoGrid.appendChild(mCell);
            }
        }

        inits.forEach(fn => fn());
    }


    function renderAdminGrid(count) {
        updateGridDisplay();
    }

    function renderMobileGrid(count) {
        updateGridDisplay(); // We just use the same unified logic for now
    }

    function renderMobileCameraCards() {
        if (!mCameraCardsList) return;
        mCameraCardsList.innerHTML = '';

        if (cameras.length === 0) {
            mCameraCardsList.innerHTML = '<div style="padding:1rem; text-align:center; color:var(--text-muted); font-size:0.85rem;">Tidak ada kamera tersedia.</div>';
            return;
        }

        cameras.forEach(cam => {
            const card = document.createElement('div');
            card.className = 'camera-form-section';
            card.style.padding = '1rem';
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong style="font-size:0.95rem; display:block;">${cam.name}</strong>
                        <span style="font-size:0.75rem; color:var(--text-muted);">Mode: ${cam.recordMode === 'continuous' ? 'Rekam Aktif' : 'Live Only'}</span>
                    </div>
                    <span class="badge ${cam.enabled ? 'badge-online' : 'badge-offline'}">${cam.enabled ? 'ONLINE' : 'OFFLINE'}</span>
                </div>
            `;
            mCameraCardsList.appendChild(card);
        });
    }

let recordingsMap = {};
    // --- Playback Management ---
    let currentZoom = 24; // hours
    let currentPlaybackDate = '';
    let currentPlaybackCam = '';
    let currentPlaybackChunks = []; // array of { startSec, duration, filename }
    let currentFileStartSec = 0;

    const timelineContainer = document.getElementById('timelineContainer');
    const scrollArea = document.getElementById('timelineScrollArea');
    const scale = document.getElementById('timelineScale');
    const tracks = document.getElementById('timelineTracks');
    const scrubber = document.getElementById('timelineScrubber');
    let isDraggingScrubber = false;

    // Zoom Buttons
    document.querySelectorAll('.z-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.z-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentZoom = parseInt(e.target.getAttribute('data-zoom'));
            renderTimeline();
        });
    });

    function parseTimeToSeconds(filename) {
        const clean = filename.replace(/\.(mp4|ts|mkv|avi)$/i, "");
        const matchTime = clean.match(/(\d{2})[-:.](\d{2})[-:.](\d{2})$/);
        if (matchTime) {
            return parseInt(matchTime[1], 10) * 3600 + parseInt(matchTime[2], 10) * 60 + parseInt(matchTime[3], 10);
        }
        const matchCompact = clean.match(/(\d{2})(\d{2})(\d{2})$/);
        if (matchCompact) {
            return parseInt(matchCompact[1], 10) * 3600 + parseInt(matchCompact[2], 10) * 60 + parseInt(matchCompact[3], 10);
        }
        return 0;
    }

    function formatTimeLabel(filename) {
        const clean = filename.replace(/\.(mp4|ts|mkv|avi)$/i, "");
        const matchTime = clean.match(/(\d{2})[-:.](\d{2})[-:.](\d{2})$/);
        if (matchTime) {
            return `${matchTime[1]}:${matchTime[2]}:${matchTime[3]}`;
        }
        return clean;
    }

    function formatSecToHMS(totalSec) {
        const s = Math.max(0, Math.floor(totalSec));
        const h = String(Math.floor(s / 3600)).padStart(2, '0');
        const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
        const sec = String(s % 60).padStart(2, '0');
        return `${h}:${m}:${sec}`;
    }

    function renderTimeline() {
        const scrollArea = document.getElementById('timelineScrollArea');
        const scale = document.getElementById('timelineScale');
        const tracks = document.getElementById('timelineTracks');
        if (!scrollArea || !scale || !tracks) return;

        const widthPercent = (24 / currentZoom) * 100;
        scrollArea.style.width = `${widthPercent}%`;

        scale.innerHTML = '';
        const step = currentZoom <= 6 ? 1 : (currentZoom <= 12 ? 2 : 4);
        for (let i = 0; i <= 24; i += step) {
            const mark = document.createElement('div');
            mark.className = 'scale-mark';
            mark.style.position = 'absolute';
            mark.style.left = `${(i / 24) * 100}%`;
            mark.textContent = `${i.toString().padStart(2, '0')}:00`;
            scale.appendChild(mark);
        }

        tracks.innerHTML = '';
        currentPlaybackChunks.forEach(chunk => {
            const block = document.createElement('div');
            block.className = 'track-block';
            const leftPercent = (chunk.startSec / 86400) * 100;
            const widthPct = Math.max((chunk.duration / 86400) * 100, 0.4);
            block.style.left = `${leftPercent}%`;
            block.style.width = `${widthPct}%`;
            block.style.minWidth = '4px';
            block.title = `${formatTimeLabel(chunk.filename)} (Klik untuk putar)`;
            
            block.addEventListener('click', (e) => {
                e.stopPropagation();
                playChunk(chunk, 0);
            });
            
            tracks.appendChild(block);
        });
    }

    const scrollAreaEl = document.getElementById('timelineScrollArea');
    if (scrollAreaEl) {
        scrollAreaEl.addEventListener('click', (e) => {
            if (e.target.className === 'track-block') return; // Handled by block click
            
            const rect = scrollAreaEl.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickPercent = clickX / rect.width;
            const clickedSec = Math.floor(clickPercent * 86400);
            
            // Find a chunk that contains this time, or the NEXT available chunk
            let targetChunk = currentPlaybackChunks.find(c => clickedSec >= c.startSec && clickedSec <= (c.startSec + c.duration));
            let startOffset = 0;
            
            if (targetChunk) {
                startOffset = clickedSec - targetChunk.startSec;
            } else {
                // Find next available
                targetChunk = currentPlaybackChunks.find(c => c.startSec > clickedSec);
            }
            
            if (targetChunk) {
                playChunk(targetChunk, startOffset);
            }
        });
    }

    function updateScrubberFromEvent(e) {
        if (!scrollArea) return;
        const rect = scrollArea.getBoundingClientRect();
        let x = e.clientX - rect.left;
        if (x < 0) x = 0;
        if (x > rect.width) x = rect.width;
        const pct = (x / rect.width) * 100;
        scrubber.style.left = `${pct}%`;
        const curSec = (pct / 100) * 86400;
        const pbCurrentTime = document.getElementById('pbCurrentTime');
        if (pbCurrentTime) pbCurrentTime.textContent = formatSecToHMS(curSec);
    }

    function seekToScrubberTime() {
        if (!currentPlaybackCam || !currentPlaybackDate || currentPlaybackChunks.length === 0) return;
        
        const pct = parseFloat(scrubber.style.left) || 0;
        const targetSec = (pct / 100) * 86400;
        
        const chunkDuration = 900;
        let foundChunk = currentPlaybackChunks.find(c => targetSec >= c.startSec && targetSec < c.startSec + chunkDuration);
        
        if (!foundChunk) {
            foundChunk = currentPlaybackChunks.slice().reverse().find(c => c.startSec <= targetSec);
        }
        
        if (foundChunk) {
            let offset = targetSec - foundChunk.startSec;
            if (offset < 0) offset = 0;
            playChunk(foundChunk, offset);
        }
    }

    function playChunk(chunk, offsetSec) {
        const camObj = cameras.find(c => c.id === currentPlaybackCam);
        const camName = camObj ? camObj.name : currentPlaybackCam;
        
        currentFileStartSec = chunk.startSec;
        const timePart = formatTimeLabel(chunk.filename);
        if (pbTitle) {
            pbTitle.textContent = `Memutar: ${camName} (${currentPlaybackDate} ${timePart})`;
        }
        
        // Highlight active clip in list
        document.querySelectorAll('#playbackList li').forEach(el => {
            el.classList.remove('active-clip');
            el.style.background = '';
        });
        const activeLi = document.getElementById(`clip-item-${chunk.filename.replace(/[^a-zA-Z0-9]/g, '_')}`);
        if (activeLi) {
            activeLi.classList.add('active-clip');
            activeLi.style.background = 'rgba(37, 99, 235, 0.25)';
            activeLi.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        const token = getAuthToken();
        const videoSrc = `/api/recordings/${encodeURIComponent(currentPlaybackCam)}/${encodeURIComponent(currentPlaybackDate)}/${encodeURIComponent(chunk.filename)}${token ? '?token=' + encodeURIComponent(token) : ''}`;
        
        playbackPlayer.src = videoSrc;
        playbackPlayer.load();
        
        playbackPlayer.onloadedmetadata = () => {
            if (offsetSec > playbackPlayer.duration) offsetSec = 0;
            playbackPlayer.currentTime = offsetSec;
            playbackPlayer.play().catch(e => console.log('Autoplay handled:', e));
        };
        
        const btnPbPlay = document.getElementById('btnPbPlay');
        if (btnPbPlay) btnPbPlay.textContent = '⏸️';

        if (window.innerWidth <= 768) {
            closeMobileMenu();
        }
    }

    // Interactive scrubber events
    if (scrollArea) scrollArea.addEventListener('mousedown', (e) => {
        isDraggingScrubber = true;
        updateScrubberFromEvent(e);
    });
    window.addEventListener('mousemove', (e) => {
        if (isDraggingScrubber) updateScrubberFromEvent(e);
    });
    window.addEventListener('mouseup', (e) => {
        if (isDraggingScrubber) {
            isDraggingScrubber = false;
            updateScrubberFromEvent(e);
            seekToScrubberTime();
        }
    });

    // Touch support
    if (scrollArea) scrollArea.addEventListener('touchstart', (e) => {
        isDraggingScrubber = true;
        updateScrubberFromEvent(e.touches[0]);
    }, {passive: true});
    window.addEventListener('touchmove', (e) => {
        if (isDraggingScrubber) updateScrubberFromEvent(e.touches[0]);
    }, {passive: true});
    window.addEventListener('touchend', (e) => {
        if (isDraggingScrubber) {
            isDraggingScrubber = false;
            seekToScrubberTime();
        }
    });

    if (playbackPlayer) {
        playbackPlayer.addEventListener('timeupdate', () => {
            if (isDraggingScrubber) return; 
            const curSec = (currentFileStartSec || 0) + playbackPlayer.currentTime;
            const pct = (curSec / 86400) * 100;
            scrubber.style.left = `${pct}%`;
            const pbCurrentTime = document.getElementById('pbCurrentTime');
            if (pbCurrentTime) pbCurrentTime.textContent = formatSecToHMS(curSec);
        });
        
        playbackPlayer.addEventListener('ended', () => {
            const currentIndex = currentPlaybackChunks.findIndex(c => c.startSec === currentFileStartSec);
            if (currentIndex !== -1 && currentIndex + 1 < currentPlaybackChunks.length) {
                const nextChunk = currentPlaybackChunks[currentIndex + 1];
                playChunk(nextChunk, 0);
            } else {
                const btnPbPlay = document.getElementById('btnPbPlay');
                if (btnPbPlay) btnPbPlay.textContent = '▶️';
            }
        });

        playbackPlayer.addEventListener('play', () => {
            const btnPbPlay = document.getElementById('btnPbPlay');
            if (btnPbPlay) btnPbPlay.textContent = '⏸️';
        });

        playbackPlayer.addEventListener('pause', () => {
            const btnPbPlay = document.getElementById('btnPbPlay');
            if (btnPbPlay) btnPbPlay.textContent = '▶️';
        });
    }

    // Controls Buttons
    const btnPbPlay = document.getElementById('btnPbPlay');
    if (btnPbPlay && playbackPlayer) {
        btnPbPlay.addEventListener('click', () => {
            if (playbackPlayer.paused) {
                playbackPlayer.play();
                btnPbPlay.textContent = '⏸️';
            } else {
                playbackPlayer.pause();
                btnPbPlay.textContent = '▶️';
            }
        });
    }

    const btnPbMute = document.getElementById('btnPbMute');
    if (btnPbMute && playbackPlayer) {
        btnPbMute.addEventListener('click', () => {
            playbackPlayer.muted = !playbackPlayer.muted;
            btnPbMute.textContent = playbackPlayer.muted ? '🔇' : '🔊';
        });
    }

    const btnPbFullscreen = document.getElementById('btnPbFullscreen');
    if (btnPbFullscreen && playbackPlayer) {
        btnPbFullscreen.addEventListener('click', () => {
            if (playbackPlayer.requestFullscreen) {
                playbackPlayer.requestFullscreen();
            } else if (playbackPlayer.webkitRequestFullscreen) {
                playbackPlayer.webkitRequestFullscreen();
            }
        });
    }

    async function fetchRecordings() {
        try {
            if ((!cameras || cameras.length === 0) && typeof fetchCameras === 'function') {
                try { await fetchCameras(); } catch(e) {}
            }
            const res = await authFetch('/api/recordings');
            if (!res.ok) throw new Error('Gagal mengambil data rekaman dari server');
            recordingsMap = await res.json(); 
            
            const prevCam = selRecCam.value;
            const prevDate = selRecDate.value;
            
            selRecCam.innerHTML = '<option value="">-- Pilih Kamera --</option>';
            
            // Camera mapping
            const camMap = new Map();
            cameras.forEach(c => camMap.set(c.id, c.name));
            Object.keys(recordingsMap).forEach(cid => {
                if (!camMap.has(cid)) camMap.set(cid, `Kamera (${cid})`);
            });

            if (camMap.size === 0) {
                selRecCam.innerHTML = '<option value="">(Tidak ada kamera)</option>';
                selRecDate.innerHTML = '<option value="">(Pilih Kamera Dulu)</option>';
                playbackList.innerHTML = '<li style="padding:1.5rem; text-align:center; color:var(--text-muted);">Belum ada kamera atau rekaman tersedia.</li>';
                if (clipCount) clipCount.textContent = '0 Klip';
                return;
            }

            camMap.forEach((name, id) => {
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = name;
                selRecCam.appendChild(opt);
            });
            
            let targetCam = '';
            if (prevCam && camMap.has(prevCam)) {
                targetCam = prevCam;
            } else {
                // Pick first camera that actually has recordings, or first camera in list
                const camWithRec = Array.from(camMap.keys()).find(cid => recordingsMap[cid] && Object.keys(recordingsMap[cid]).length > 0);
                targetCam = camWithRec || Array.from(camMap.keys())[0];
            }
            
            selRecCam.value = targetCam;
            populateDateDropdown(targetCam, prevDate);
        } catch (err) {
            console.error('Error in fetchRecordings:', err);
        }
    }

    function populateDateDropdown(camId, preferredDate) {
        selRecDate.innerHTML = '';
        if (!camId || !recordingsMap[camId]) {
            selRecDate.innerHTML = '<option value="">Tidak ada rekaman untuk kamera ini</option>';
            playbackList.innerHTML = '<li style="padding:1.5rem; text-align:center; color:var(--text-muted);">Belum ada rekaman tersimpan untuk kamera ini.</li>';
            if (clipCount) clipCount.textContent = '0 Klip';
            currentPlaybackChunks = [];
            renderTimeline();
            return;
        }

        const dates = Object.keys(recordingsMap[camId]).sort().reverse();
        if (dates.length === 0) {
            selRecDate.innerHTML = '<option value="">Tidak ada rekaman untuk kamera ini</option>';
            playbackList.innerHTML = '<li style="padding:1.5rem; text-align:center; color:var(--text-muted);">Belum ada rekaman tersimpan untuk kamera ini.</li>';
            if (clipCount) clipCount.textContent = '0 Klip';
            currentPlaybackChunks = [];
            renderTimeline();
            return;
        }

        dates.forEach(d => {
            const count = (recordingsMap[camId][d] || []).length;
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = `📅 ${d} (${count} klip)`;
            selRecDate.appendChild(opt);
        });

        if (preferredDate && dates.includes(preferredDate)) {
            selRecDate.value = preferredDate;
        } else {
            selRecDate.value = dates[0];
        }

        renderPlaybackList();
    }

    if (selRecCam) {
        selRecCam.addEventListener('change', () => {
            populateDateDropdown(selRecCam.value);
        });
    }

    if (selRecDate) {
        selRecDate.addEventListener('change', renderPlaybackList);
    }

    function renderPlaybackList() {
        playbackList.innerHTML = '';
        currentPlaybackChunks = [];
        
        const camId = selRecCam.value;
        const date = selRecDate.value;
        
        if (!camId || !date || !recordingsMap[camId] || !recordingsMap[camId][date]) {
            if (clipCount) clipCount.textContent = '0 Klip';
            renderTimeline();
            return;
        }

        currentPlaybackCam = camId;
        currentPlaybackDate = date;

        let files = [...recordingsMap[camId][date]];
        files.sort(); 

        if (files.length === 0) {
            playbackList.innerHTML = '<li style="padding:1.5rem; text-align:center; color:var(--text-muted);">Tidak ada rekaman pada tanggal ini.</li>';
            if (clipCount) clipCount.textContent = '0 Klip';
            renderTimeline();
            return;
        }

        if (clipCount) clipCount.textContent = `${files.length} Klip`;

        // Process files for timeline
        files.forEach(f => {
            currentPlaybackChunks.push({
                startSec: parseTimeToSeconds(f),
                duration: 900,
                filename: f
            });
        });
        
        // Sort descending (newest on top)
        const sortedDesc = [...files].reverse();

        sortedDesc.forEach(f => {
            const li = document.createElement('li');
            li.id = `clip-item-${f.replace(/[^a-zA-Z0-9]/g, '_')}`;
            li.style.cssText = 'padding:0.6rem 0.8rem; border-bottom:1px solid rgba(255,255,255,0.06); cursor:pointer; display:flex; justify-content:space-between; align-items:center; transition:background 0.2s;';
            
            const timePart = formatTimeLabel(f);
            const token = getAuthToken();
            const downloadUrl = `/api/recordings/${encodeURIComponent(camId)}/${encodeURIComponent(date)}/${encodeURIComponent(f)}?download=1${token ? '&token=' + encodeURIComponent(token) : ''}`;
            
            li.innerHTML = `
                <div style="display:flex; align-items:center; gap:0.5rem; overflow:hidden;">
                    <span style="font-size:1.1rem;">🎥</span>
                    <div style="overflow:hidden;">
                        <strong style="display:block; font-size:0.85rem; color:#f1f5f9;">${timePart}</strong>
                        <span style="font-size:0.72rem; color:var(--text-muted); font-family:monospace;">${f}</span>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:0.3rem;">
                    <a href="${downloadUrl}" download title="Unduh Klip" class="btn-sm btn-secondary" style="padding:3px 6px; font-size:11px; text-decoration:none; display:inline-flex; align-items:center;" onclick="event.stopPropagation();">⬇️</a>
                    <button title="Putar" class="btn-sm btn-primary" style="padding:3px 8px; font-size:11px;">▶</button>
                </div>
            `;
            
            li.addEventListener('click', () => {
                const chunk = currentPlaybackChunks.find(c => c.filename === f);
                if (chunk) {
                    playChunk(chunk, 0);
                }
            });

            li.addEventListener('mouseenter', () => {
                if (!li.classList.contains('active-clip')) li.style.background = 'rgba(255,255,255,0.06)';
            });
            li.addEventListener('mouseleave', () => {
                if (!li.classList.contains('active-clip')) li.style.background = '';
            });
            
            playbackList.appendChild(li);
        });

        // Update timeline
        renderTimeline();

        // Auto play the latest clip if nothing is playing
        if (currentPlaybackChunks.length > 0 && (!playbackPlayer.src || playbackPlayer.paused)) {
            const latestChunk = currentPlaybackChunks[currentPlaybackChunks.length - 1];
            playChunk(latestChunk, 0);
        }
    }

    if (btnFetchRecordings) btnFetchRecordings.addEventListener('click', fetchRecordings);

    // =========================================================================
    // MOBILE PLAYBACK CONTROLLER
    // =========================================================================
    let mobileRecordingsMap = {};

    window.fetchMobileRecordings = async function() {
        const mSelRecCam = document.getElementById('mSelRecCam');
        const mSelRecDate = document.getElementById('mSelRecDate');
        const mPlaybackList = document.getElementById('mPlaybackList');
        if (!mSelRecCam || !mSelRecDate || !mPlaybackList) return;

        try {
            if ((!cameras || cameras.length === 0) && typeof fetchCameras === 'function') {
                try { await fetchCameras(); } catch(e) {}
            }
            const res = await authFetch('/api/recordings');
            if (!res.ok) return;
            mobileRecordingsMap = await res.json();

            const prevCam = mSelRecCam.value;
            const prevDate = mSelRecDate.value;

            mSelRecCam.innerHTML = '<option value="">-- Pilih Kamera --</option>';
            const camMap = new Map();
            cameras.forEach(c => camMap.set(c.id, c.name));
            Object.keys(mobileRecordingsMap).forEach(cid => {
                if (!camMap.has(cid)) camMap.set(cid, `Kamera (${cid})`);
            });

            if (camMap.size === 0) {
                mSelRecCam.innerHTML = '<option value="">(Tidak ada kamera)</option>';
                mSelRecDate.innerHTML = '<option value="">(Pilih Kamera Dulu)</option>';
                mPlaybackList.innerHTML = '<li style="padding:1rem; text-align:center; color:var(--text-muted); font-size:0.8rem;">Belum ada rekaman.</li>';
                return;
            }

            camMap.forEach((name, id) => {
                const opt = document.createElement('option');
                opt.value = id; opt.textContent = name;
                mSelRecCam.appendChild(opt);
            });

            let targetCam = prevCam && camMap.has(prevCam) ? prevCam : (Array.from(camMap.keys()).find(cid => mobileRecordingsMap[cid] && Object.keys(mobileRecordingsMap[cid]).length > 0) || camMap.keys().next().value);
            mSelRecCam.value = targetCam;
            updateMobileDates(targetCam, prevDate);
        } catch(e) {
            console.error('Error fetchMobileRecordings:', e);
        }
    };

    function updateMobileDates(camId, preferredDate) {
        const mSelRecDate = document.getElementById('mSelRecDate');
        const mPlaybackList = document.getElementById('mPlaybackList');
        if (!mSelRecDate || !mPlaybackList) return;

        mSelRecDate.innerHTML = '';
        if (!camId || !mobileRecordingsMap[camId]) {
            mSelRecDate.innerHTML = '<option value="">Tidak ada rekaman</option>';
            mPlaybackList.innerHTML = '<li style="padding:1rem; text-align:center; color:var(--text-muted); font-size:0.8rem;">Belum ada rekaman untuk kamera ini.</li>';
            return;
        }
        const dates = Object.keys(mobileRecordingsMap[camId]).sort().reverse();
        if (dates.length === 0) {
            mSelRecDate.innerHTML = '<option value="">Tidak ada rekaman</option>';
            mPlaybackList.innerHTML = '<li style="padding:1rem; text-align:center; color:var(--text-muted); font-size:0.8rem;">Belum ada rekaman untuk kamera ini.</li>';
            return;
        }
        dates.forEach(d => {
            const count = (mobileRecordingsMap[camId][d] || []).length;
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = `📅 ${d} (${count} klip)`;
            mSelRecDate.appendChild(opt);
        });

        if (preferredDate && dates.includes(preferredDate)) {
            mSelRecDate.value = preferredDate;
        } else {
            mSelRecDate.value = dates[0];
        }

        renderMobileClips(camId, mSelRecDate.value);
    }

    function renderMobileClips(camId, date) {
        const mPlaybackList = document.getElementById('mPlaybackList');
        const mPlaybackPlayer = document.getElementById('mPlaybackPlayer');
        if (!mPlaybackList || !mPlaybackPlayer) return;

        mPlaybackList.innerHTML = '';
        if (!camId || !date || !mobileRecordingsMap[camId] || !mobileRecordingsMap[camId][date]) {
            mPlaybackList.innerHTML = '<li style="padding:1rem; text-align:center; color:var(--text-muted); font-size:0.8rem;">Tidak ada klip pada tanggal ini.</li>';
            return;
        }

        const files = [...mobileRecordingsMap[camId][date]].reverse();
        if (files.length === 0) {
            mPlaybackList.innerHTML = '<li style="padding:1rem; text-align:center; color:var(--text-muted); font-size:0.8rem;">Tidak ada klip pada tanggal ini.</li>';
            return;
        }

        files.forEach(f => {
            const li = document.createElement('li');
            li.style.cssText = 'padding:0.6rem 0.8rem; border-bottom:1px solid rgba(255,255,255,0.06); display:flex; justify-content:space-between; align-items:center; cursor:pointer; font-size:0.82rem;';
            const timeStr = formatTimeLabel(f);
            const token = getAuthToken();
            const downloadUrl = `/api/recordings/${encodeURIComponent(camId)}/${encodeURIComponent(date)}/${encodeURIComponent(f)}?download=1${token ? '&token=' + encodeURIComponent(token) : ''}`;
            
            li.innerHTML = `
                <div style="overflow:hidden; padding-right:0.5rem;">
                    <strong style="display:block; color:#f1f5f9;">🎥 ${timeStr}</strong>
                    <span style="font-size:0.68rem; color:var(--text-muted); font-family:monospace;">${f}</span>
                </div>
                <div style="display:flex; align-items:center; gap:0.4rem; flex-shrink:0;">
                    <a href="${downloadUrl}" download class="btn-sm btn-secondary" style="padding:3px 6px; font-size:11px; text-decoration:none;" onclick="event.stopPropagation();">⬇️</a>
                    <button class="btn-sm btn-primary" style="padding:4px 8px; font-size:11px;">▶</button>
                </div>
            `;
            li.addEventListener('click', () => {
                mPlaybackPlayer.src = `/api/recordings/${encodeURIComponent(camId)}/${encodeURIComponent(date)}/${encodeURIComponent(f)}${token ? '?token=' + encodeURIComponent(token) : ''}`;
                mPlaybackPlayer.load();
                mPlaybackPlayer.play().catch(e => console.log('Mobile play handled:', e));
            });
            mPlaybackList.appendChild(li);
        });
    }

    function initMobilePlayback() {
        const mSelRecCam = document.getElementById('mSelRecCam');
        const mSelRecDate = document.getElementById('mSelRecDate');
        const mBtnFetchRecordings = document.getElementById('mBtnFetchRecordings');

        if (mSelRecCam) {
            mSelRecCam.addEventListener('change', () => {
                updateMobileDates(mSelRecCam.value);
            });
        }
        if (mSelRecDate) {
            mSelRecDate.addEventListener('change', () => {
                renderMobileClips(mSelRecCam.value, mSelRecDate.value);
            });
        }
        if (mBtnFetchRecordings) {
            mBtnFetchRecordings.addEventListener('click', window.fetchMobileRecordings);
        }
    }

    // =========================================================================
    // ADMINISTRATOR - MANAJEMEN USER (KLIEN MOBILE) DENGAN IZIN KAMERA
    // =========================================================================
    function renderUserCamCheckboxes(containerId, selectedIds = []) {
        const container = document.getElementById(containerId);
        if (!container) return;
        if (!cameras || cameras.length === 0) {
            container.innerHTML = '<span style="color:var(--text-muted); font-size:0.8rem;">Belum ada kamera di gedung Anda. Tambahkan kamera terlebih dahulu.</span>';
            return;
        }
        const selectedSet = new Set(selectedIds || []);
        container.innerHTML = cameras.map(cam => {
            const isChecked = selectedSet.has(cam.id) ? 'checked' : '';
            return `
                <label style="display:flex; align-items:center; gap:0.4rem; font-size:0.85rem; cursor:pointer; background:rgba(255,255,255,0.04); padding:4px 8px; border-radius:4px;">
                    <input type="checkbox" value="${cam.id}" ${isChecked} class="${containerId}-cb">
                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">📹 ${cam.name}</span>
                </label>
            `;
        }).join('');
    }

    const btnSelectAllUserCams = document.getElementById('btnSelectAllUserCams');
    if (btnSelectAllUserCams) {
        btnSelectAllUserCams.addEventListener('click', () => {
            const cbs = document.querySelectorAll('.newUserCamCheckboxes-cb');
            const allChecked = Array.from(cbs).every(cb => cb.checked);
            cbs.forEach(cb => cb.checked = !allChecked);
            btnSelectAllUserCams.textContent = allChecked ? 'Pilih Semua' : 'Batal Semua';
        });
    }

    const btnSelectAllEditUserCams = document.getElementById('btnSelectAllEditUserCams');
    if (btnSelectAllEditUserCams) {
        btnSelectAllEditUserCams.addEventListener('click', () => {
            const cbs = document.querySelectorAll('.editUserCamCheckboxes-cb');
            const allChecked = Array.from(cbs).every(cb => cb.checked);
            cbs.forEach(cb => cb.checked = !allChecked);
            btnSelectAllEditUserCams.textContent = allChecked ? 'Pilih Semua' : 'Batal Semua';
        });
    }

    if (btnToggleAddUser && boxAddUserForm) {
        btnToggleAddUser.addEventListener('click', () => {
            boxAddUserForm.style.display = 'block';
            renderUserCamCheckboxes('newUserCamCheckboxes');
        });
    }

    if (btnCancelAddUser && boxAddUserForm) {
        btnCancelAddUser.addEventListener('click', () => {
            boxAddUserForm.style.display = 'none';
            if (addUserForm) addUserForm.reset();
        });
    }

    if (addUserForm) {
        addUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('newUserName').value.trim();
            const username = document.getElementById('newUserUsername').value.trim();
            const password = document.getElementById('newUserPassword').value;

            const allowedCbs = document.querySelectorAll('.newUserCamCheckboxes-cb:checked');
            const allowed_cameras = Array.from(allowedCbs).map(cb => cb.value);

            if (allowed_cameras.length === 0) {
                if (!confirm('Perhatian: Anda belum memilih kamera untuk user ini. User tidak akan bisa melihat kamera apapun. Lanjutkan?')) {
                    return;
                }
            }

            try {
                const res = await authFetch('/api/admin/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, username, password, allowed_cameras })
                });

                const data = await res.json();
                if (!res.ok || data.error) {
                    alert('Gagal: ' + (data.error || 'Server error'));
                } else {
                    alert(`Akun user '${username}' berhasil dibuat dengan akses ${allowed_cameras.length} kamera!`);
                    addUserForm.reset();
                    boxAddUserForm.style.display = 'none';
                    loadUsersList();
                }
            } catch (err) {
                alert('Gagal membuat akun user.');
            }
        });
    }

    // Modal Edit User
    const modalEditUser = document.getElementById('modalEditUser');
    const formEditUser = document.getElementById('formEditUser');
    const btnCancelEditUser = document.getElementById('btnCancelEditUser');

    window.openEditUser = function(userId) {
        const user = (window._usersList || []).find(u => u.id === userId);
        if (!user) return;
        document.getElementById('editUserId').value = user.id;
        document.getElementById('editUserName').value = user.name || '';
        document.getElementById('editUserPassword').value = '';
        renderUserCamCheckboxes('editUserCamCheckboxes', user.allowed_cameras || []);
        if (modalEditUser) modalEditUser.style.display = 'flex';
    };

    if (btnCancelEditUser && modalEditUser) {
        btnCancelEditUser.addEventListener('click', () => {
            modalEditUser.style.display = 'none';
        });
    }

    if (formEditUser) {
        formEditUser.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('editUserId').value;
            const name = document.getElementById('editUserName').value.trim();
            const password = document.getElementById('editUserPassword').value;
            const allowedCbs = document.querySelectorAll('.editUserCamCheckboxes-cb:checked');
            const allowed_cameras = Array.from(allowedCbs).map(cb => cb.value);

            const payload = { name, allowed_cameras };
            if (password && password.trim().length >= 4) {
                payload.password = password.trim();
            }

            try {
                const res = await authFetch(`/api/admin/users/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    alert('Pengaturan user dan izin kamera berhasil disimpan!');
                    if (modalEditUser) modalEditUser.style.display = 'none';
                    loadUsersList();
                } else {
                    alert(data.error || 'Gagal mengedit user.');
                }
            } catch (err) {
                alert('Terjadi kesalahan jaringan.');
            }
        });
    }


async function fetchSystemSettings() {
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
            
            // Storage Settings (Bugfix: Retain settings)
            const sysGlobalStorageMode = document.getElementById('sysGlobalStorageMode');
            const sysRecordingQuality = document.getElementById('sysRecordingQuality');
            const sysCustomStoragePath = document.getElementById('sysCustomStoragePath');
            const sysStorageDevice = document.getElementById('sysStorageDevice');

            if (sysGlobalStorageMode && data.globalStorageMode) sysGlobalStorageMode.value = data.globalStorageMode;
            if (sysRecordingQuality && data.recordingQuality) sysRecordingQuality.value = data.recordingQuality;
            
            if (sysCustomStoragePath) {
                // Parse whether path is from device selection or custom absolute path
                if (data.globalStoragePath && data.globalStoragePath.startsWith('/')) {
                     sysCustomStoragePath.value = data.globalStoragePath;
                     if (sysStorageDevice) sysStorageDevice.value = 'custom';
                }
            }
        } catch(e) {
            console.error('Failed fetch settings', e);
        }
    }

    async function loadUsersList() {
        if (!userTableBody) return;
        try {
            const res = await authFetch('/api/admin/users');
            const data = await res.json();
            if (data && data.users) {
                window._usersList = data.users || [];
                userTableBody.innerHTML = '';
                if (data.users.length === 0) {
                    userTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--text-muted);">Belum ada data user.</td></tr>';
                    return;
                }
                data.users.forEach(user => {
                    const tr = document.createElement('tr');
                    const d = new Date(user.createdAt);
                    
                    const userAllowedCams = user.allowed_cameras || [];
                    let camBadge = '';
                    if (userAllowedCams.length === 0) {
                        camBadge = '<span style="color:#ef4444; font-size:0.8rem;">Tidak ada kamera</span>';
                    } else {
                        const count = userAllowedCams.length;
                        camBadge = `<span class="badge" style="background:#1e293b; color:#60a5fa; padding:3px 8px; border-radius:4px; font-weight:600; font-size:0.8rem;">📹 ${count} Kamera</span>`;
                    }

                    tr.innerHTML = `
                        <td style="padding:0.75rem; font-family:monospace; font-size:0.8rem; color:var(--text-muted);">${user.id}</td>
                        <td style="padding:0.75rem;"><strong>${user.name}</strong></td>
                        <td style="padding:0.75rem; color:#60a5fa; font-family:monospace;">${user.username}</td>
                        <td style="padding:0.75rem;">${camBadge}</td>
                        <td style="padding:0.75rem; color:var(--text-muted); font-size:0.8rem;">${d.toLocaleDateString('id-ID')}</td>
                        <td style="padding:0.75rem; text-align:right; white-space:nowrap;">
                            <button class="btn-sm btn-secondary" style="margin-right:4px; padding:4px 8px; font-size:0.8rem;" onclick="openEditUser('${user.id}')">✏️ Edit</button>
                            <button class="btn-sm btn-secondary btn-del-user" data-id="${user.id}" style="color:var(--accent); padding:4px 8px; font-size:0.8rem;">🗑️ Hapus</button>
                        </td>
                    `;
                    userTableBody.appendChild(tr);
                });

                document.querySelectorAll('.btn-del-user').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        if (!confirm('Yakin ingin menghapus akun user ini?')) return;
                        const id = e.target.getAttribute('data-id');
                        try {
                            const res = await authFetch('/api/admin/users/' + id, { method: 'DELETE' });
                            const data = await res.json();
                            if (!res.ok || data.error) alert('Gagal: ' + (data.error || 'Server error'));
                            else loadUsersList();
                        } catch (err) {
                            alert('Gagal menghapus user.');
                        }
                    });
                });
            }
        } catch (err) {
            userTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--accent);">Gagal memuat data.</td></tr>';
        }
    }

    // =========================================================================
    // ADMINISTRATOR - SYSTEM LOGS
    // =========================================================================
let allLogsCache = [];
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
        const levelFilter = document.getElementById('logLevelFilter') ? document.getElementById('logLevelFilter').value : 'ALL';
        const searchInput = document.getElementById('logSearchInput') ? document.getElementById('logSearchInput').value.toLowerCase() : '';
        
        const filtered = allLogsCache.filter(log => {
            const logCat = log.category || 'SYSTEM';
            if (catFilter !== 'ALL' && logCat !== catFilter) return false;
            if (levelFilter !== 'ALL' && log.level !== levelFilter) return false;
            
            if (searchInput) {
                if (!log.message.toLowerCase().includes(searchInput)) return false;
            }
            return true;
        });
        
        // Reverse array to put newest logs at the top
        filtered.reverse();
        
        if (filtered.length === 0) {
            logsContainer.innerHTML = '<tr><td colspan="4" style="padding:20px; text-align:center; color:#64748b;">Tidak ada log yang ditemukan.</td></tr>';
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
            
            const timeStr = new Date(log.timestamp).toLocaleString('id-ID');
            
            return `<tr style="border-bottom:1px solid rgba(255,255,255,0.05); color:#f8fafc;">
                <td style="padding:8px 10px; color:#94a3b8; white-space:nowrap; width:160px;">${timeStr}</td>
                <td style="padding:8px 10px; width:100px;"><span style="color:${color}; font-weight:600;">${log.level}</span></td>
                <td style="padding:8px 10px; width:120px;"><span style="background:${catColor}; color:#fff; padding:2px 6px; border-radius:4px; font-size:0.7rem;">${cat}</span></td>
                <td style="padding:8px 10px;">${log.message}</td>
            </tr>`;
        }).join('');
    }
    
    let autoLogInterval = null;
    let isAutoLog = true;
    
    window.toggleAutoLog = function() {
        isAutoLog = !isAutoLog;
        const icon = document.getElementById('autoLogIcon');
        const text = document.getElementById('autoLogText');
        if (isAutoLog) {
            if (icon) icon.textContent = '⏸️';
            if (text) text.textContent = 'Stop';
            autoLogInterval = setInterval(fetchLogs, 3000);
            fetchLogs();
        } else {
            if (icon) icon.textContent = '▶️';
            if (text) text.textContent = 'Play';
            if (autoLogInterval) clearInterval(autoLogInterval);
        }
    };
    
    window.copyLogs = function() {
        if (!allLogsCache || allLogsCache.length === 0) return alert('Tidak ada log untuk dicopy');
        
        // Reverse array to put newest logs at the top
        const filtered = [...allLogsCache].reverse();
        
        const text = filtered.map(log => {
            const timeStr = new Date(log.timestamp).toLocaleString('id-ID');
            return `[${timeStr}] [${log.level}] [${log.category || 'SYSTEM'}] ${log.message}`;
        }).join('\n');
        
        navigator.clipboard.writeText(text).then(() => {
            alert('Log berhasil dicopy ke clipboard!');
        }).catch(err => {
            alert('Gagal mencopy log: ' + err);
        });
    };
    
    // Attach event listeners for filters
    const catEl = document.getElementById('logCategoryFilter');
    const levelEl = document.getElementById('logLevelFilter');
    if (catEl) catEl.addEventListener('change', renderFilteredLogs);
    if (levelEl) levelEl.addEventListener('change', renderFilteredLogs);
    const searchEl = document.getElementById('logSearchInput');
    if (searchEl) searchEl.addEventListener('input', renderFilteredLogs);
    
    // Auto start logs if in index
    if (document.getElementById('view-logs')) {
        autoLogInterval = setInterval(fetchLogs, 3000);
    }

    
    window.fetchLogs = fetchLogs;
    if (btnRefreshLogs) {
        btnRefreshLogs.addEventListener('click', fetchLogs);
    }

    // Mulai Eksekusi Autentikasi
    
    async function fetchAboutInfo() {
        try {
            const res = await authFetch('/api/about');
            if (!res.ok) return;
            const data = await res.json();
            
            const elVersion = document.getElementById('aboutAppVersion');
            const elMachineId = document.getElementById('aboutMachineId');
            const elStatus = document.getElementById('aboutLicenseStatus');
            const elDays = document.getElementById('aboutLicenseDays');
            const elEmail = document.getElementById('aboutLicenseEmail');
            
            if (elVersion) elVersion.textContent = 'Versi ' + data.appVersion;
            if (elMachineId) elMachineId.textContent = data.machineId;
            if (elEmail) elEmail.textContent = data.registeredEmail;
            
            if (elStatus && elDays) {
                if (data.licenseValid) {
                    elStatus.innerHTML = '<span style="color:#10b981; font-weight:600;">Valid & Aktif</span>';
                    if (data.licenseExpiresAt) {
                        const days = Math.floor((data.licenseExpiresAt - Date.now()) / (1000 * 60 * 60 * 24));
                        elDays.textContent = `${days} Hari (Hingga ${new Date(data.licenseExpiresAt).toLocaleDateString('id-ID')})`;
                        elDays.style.color = '#10b981';
                    } else {
                        elDays.textContent = 'Seumur Hidup / Lifetime';
                        elDays.style.color = '#10b981';
                    }
                } else if (data.isTrialActive) {
                    elStatus.innerHTML = '<span style="color:#eab308; font-weight:600;">Mode Evaluasi / Trial</span>';
                    elDays.textContent = `${data.trialDaysLeft} Hari`;
                    elDays.style.color = '#eab308';
                } else {
                    elStatus.innerHTML = '<span style="color:#ef4444; font-weight:600;">Kedaluwarsa / Terkunci</span>';
                    elDays.textContent = '0 Hari';
                    elDays.style.color = '#ef4444';
                }
            }
        } catch(e) {
            console.error('Gagal memuat info About', e);
        }
    }

    // --- ADMIN OTA SYSTEM & LINUX PIPELINE ---
    let adminUpdateData = null;

    window.toggleAdminOtaChangelog = function() {
        const box = document.getElementById('adminOtaChangelogContainer');
        if (!box) return;
        if (box.style.display === 'none' || !box.style.display) {
            box.style.display = 'block';
            if (!adminUpdateData) {
                window.checkAdminOtaUpdate();
            }
        } else {
            box.style.display = 'none';
        }
    };

    window.checkAdminOtaUpdate = async function() {
        const btn = document.getElementById('btnAdminCheckOta');
        const badge = document.getElementById('adminOtaStatusBadge');
        if (btn) btn.textContent = "⏳ Memeriksa...";

        try {
            const res = await authFetch('/api/superadmin/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'check' })
            });
            const data = await res.json();
            adminUpdateData = data;

            if (badge) {
                const isNew = data.update_available || data.isUpdateAvailable;
                const curVer = data.current_version || window.APP_VERSION || '9.9.6';
                const latVer = data.latest_version || window.APP_VERSION || '9.9.6';
                badge.innerHTML = `v${curVer} ${isNew ? '• Ada Update v' + latVer : '• Versi Terbaru'}`;
                badge.style.background = isNew ? '#f59e0b' : '#10b981';
            }

            const changelogList = document.getElementById('adminOtaChangelogList');
            if (changelogList && Array.isArray(data.changelog)) {
                changelogList.innerHTML = data.changelog.map(c => `
                    <div style="background:rgba(255,255,255,0.03); padding:0.65rem 0.85rem; border-radius:6px; border-left:3px solid #3b82f6;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                            <strong style="color:#93c5fd; font-size:0.85rem;">v${c.version} - ${c.title || 'Pembaruan Sistem'}</strong>
                            <span style="font-size:0.75rem; color:var(--text-muted);">${c.date || ''}</span>
                        </div>
                        <ul style="margin:0; padding-left:1.2rem; font-size:0.78rem; color:#cbd5e1; line-height:1.4;">
                            ${(c.items || []).map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    </div>
                `).join('');
            }

            if (btn) btn.textContent = "✅ Diperiksa";
            setTimeout(() => {
                if (btn) btn.textContent = "🔄 Periksa Pembaruan";
            }, 2500);
        } catch (err) {
            console.error("[Admin OTA Check Error]", err);
            if (btn) btn.textContent = "❌ Gagal";
            alert("Gagal memeriksa update: " + err.message);
        }
    };

    window.openOtaWorkflowModal = function() {
        const modal = document.getElementById('modalOtaWorkflow');
        if (modal) {
            modal.style.setProperty('display', 'flex', 'important');
            modal.classList.add('active');
        }
    };

    window.closeOtaWorkflowModal = function() {
        const modal = document.getElementById('modalOtaWorkflow');
        if (modal) {
            modal.style.setProperty('display', 'none', 'important');
            modal.classList.remove('active');
        }
    };

    window.runOtaPipeline = async function() {
        const btnRun = document.getElementById('btnRunOtaPipeline');
        const consoleWrapper = document.getElementById('otaConsoleWrapper');
        const terminalLog = document.getElementById('otaTerminalLog');
        const spinner = document.getElementById('otaExecutionSpinner');

        const steps = {
            backup: document.getElementById('chkOtaBackup')?.checked ?? true,
            git_pull: document.getElementById('chkOtaGitPull')?.checked ?? true,
            npm_install: document.getElementById('chkOtaNpmInstall')?.checked ?? true,
            pm2_restart: document.getElementById('chkOtaPm2Restart')?.checked ?? true,
            git_reset_hard: document.getElementById('chkOtaGitReset')?.checked ?? false,
            clean_npm_cache: document.getElementById('chkOtaCleanCache')?.checked ?? false,
            reboot: document.getElementById('chkOtaReboot')?.checked ?? false
        };

        if (!steps.git_pull && !steps.git_reset_hard && !steps.npm_install && !steps.pm2_restart && !steps.reboot) {
            alert("Harap pilih setidaknya satu langkah pembaruan untuk dieksekusi.");
            return;
        }

        if (!confirm("Konfirmasi eksekusi alur pembaruan sistem pilihan Anda sekarang?")) {
            return;
        }

        if (consoleWrapper) consoleWrapper.style.display = 'block';
        if (spinner) spinner.style.display = 'inline';
        if (btnRun) {
            btnRun.disabled = true;
            btnRun.textContent = "⏳ Mengeksekusi...";
        }

        if (terminalLog) {
            terminalLog.textContent = `[ARCH3R-OTA] Memulai alur pembaruan sistem...\n[ARCH3R-OTA] Waktu: ${new Date().toLocaleString()}\n`;
        }

        try {
            const res = await authFetch('/api/superadmin/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'execute',
                    steps: steps
                })
            });

            const data = await res.json();

            if (terminalLog && data.logs) {
                terminalLog.textContent += "\n" + data.logs.join("\n");
                terminalLog.scrollTop = terminalLog.scrollHeight;
            }

            if (res.ok && data.success) {
                if (terminalLog) {
                    terminalLog.textContent += `\n\n[ARCH3R-OTA] ✅ SELURUH TAHAPAN SELESAI DENGAN SUKSES!`;
                    terminalLog.scrollTop = terminalLog.scrollHeight;
                }
                if (steps.reboot) {
                    alert("STB sedang melakukan reboot fisik. Sistem akan online kembali dalam 1-2 menit.");
                } else if (steps.pm2_restart) {
                    alert("Pembaruan tuntas! Service NVR telah dimuat ulang (PM2). Halaman akan di-refresh otomatis.");
                    setTimeout(() => window.location.reload(), 2500);
                } else {
                    alert("Alur pembaruan sistem selesai dijalankan.");
                }
                if (btnRun) btnRun.textContent = "✅ Berhasil Dieksekusi";
            } else {
                if (terminalLog) {
                    terminalLog.textContent += `\n\n[ARCH3R-OTA] ❌ GAGAL: ${data.error || 'Terjadi kesalahan pada alur eksekusi'}`;
                    terminalLog.scrollTop = terminalLog.scrollHeight;
                }
                alert("Eksekusi gagal: " + (data.error || 'Silakan cek terminal log'));
                if (btnRun) btnRun.textContent = "❌ Gagal Dieksekusi";
            }
        } catch (err) {
            if (terminalLog) {
                terminalLog.textContent += `\n\n[ARCH3R-OTA] ❌ KESALAHAN JARINGAN/TIMEOUT: ${err.message}\nCatatan: Jika PM2 melakukan reload, server mungkin sempat terputus sesaat. Muat ulang halaman dalam beberapa detik.`;
                terminalLog.scrollTop = terminalLog.scrollHeight;
            }
            alert("Proses eksekusi terputus atau server sedang restart: " + err.message);
            if (btnRun) btnRun.textContent = "🔄 Selesai / Terputus";
        } finally {
            if (spinner) spinner.style.display = 'none';
            if (btnRun) btnRun.disabled = false;
        }
    };

    checkAuth();
});



// =========================================================
// =========================================================
// AI YOLOv8 Visual Detection Grid, Live Stream Overlay & ESP8266 IoT
// Arch3r NVR Ver 9.9.9 (Persistent Storage, Real-Time HUD & IoT Trigger)
// =========================================================
let aiDrawCanvas = null;
let aiDrawCtx = null;
let isAIDrawing = false;
let aiGridRect = { x: 0, y: 0, w: 0, h: 0 };
let aiDragStart = { x: 0, y: 0 };
let aiCurrentCam = null;
let aiSimActive = true;
let aiAnimFrameId = null;
let aiSimTarget = { x: 80, y: 100, vx: 2.4, vy: 1.6, w: 56, h: 110, inside: false };

async function openAIGridModal(defaultCamId = null) {
    const modal = document.getElementById('aiGridModalOverlay');
    if (!modal) return;
    modal.style.display = 'flex';
    
    // Ensure cameras list is fetched and available
    const camList = window.cameras || (typeof cameras !== 'undefined' ? cameras : []);
    if ((!camList || camList.length === 0) && (typeof window.fetchCameras === 'function' || typeof fetchCameras === 'function')) {
        const fetcher = window.fetchCameras || fetchCameras;
        try { await fetcher(); } catch (e) {}
    }
    
    const activeCams = window.cameras || (typeof cameras !== 'undefined' ? cameras : []);
    
    // Populate camera selector
    const select = document.getElementById('ai-cam-select');
    if (select) {
        select.innerHTML = '';
        if (activeCams && activeCams.length > 0) {
            activeCams.forEach((cam, idx) => {
                const opt = document.createElement('option');
                opt.value = cam.id;
                opt.textContent = `${cam.name || 'Kamera ' + (idx + 1)} (${cam.ip || 'Stream ' + (idx + 1)})`;
                select.appendChild(opt);
            });
        }
        
        // Add virtual simulation option so grid is testable anytime even with no physical cameras
        const optSim = document.createElement('option');
        optSim.value = 'virtual_test';
        optSim.textContent = '📹 Kamera Simulasi Visual (1080p Grid Matrix)';
        select.appendChild(optSim);
        
        if (defaultCamId) {
            const hasOpt = Array.from(select.options).some(o => o.value === defaultCamId);
            if (hasOpt) {
                select.value = defaultCamId;
            } else if (select.options.length > 0) {
                select.selectedIndex = 0;
            }
        } else if (select.options.length > 0) {
            select.selectedIndex = 0;
        }
        
        // Ensure camera selector container is always visible
        const group = document.getElementById('aiCamSelectGroup') || select.parentElement;
        if (group) group.style.display = 'block';
        select.style.display = 'block';
    }
    
    const feedback = document.getElementById('ai-save-feedback');
    if (feedback) feedback.textContent = '';
    
    // Ensure canvas container is visible
    const container = document.getElementById('ai-canvas-container');
    if (container) container.style.display = 'flex';
    
    // Start continuous rendering loop for real-time visualization
    aiStartRenderLoop();
    
    // Load feed and initialize canvas immediately
    setTimeout(() => {
        loadCamStreamForAI();
    }, 40);
}

async function loadCamStreamForAI() {
    const select = document.getElementById('ai-cam-select');
    const camId = select ? select.value : null;
    const container = document.getElementById('ai-canvas-container');
    const video = document.getElementById('ai-stream-preview');
    const badge = document.getElementById('ai-grid-stream-badge');
    
    if (!container) return;
    container.style.display = 'flex';
    
    // Clean up previous HLS stream preview if running
    const players = window.activeHlsPlayers || (typeof activeHlsPlayers !== 'undefined' ? activeHlsPlayers : null);
    if (players && players['ai-stream-preview']) {
        try { players['ai-stream-preview'].destroy(); } catch (e) {}
        delete players['ai-stream-preview'];
    }
    
    if (video) {
        video.pause();
        video.style.display = 'block'; // Keep video visible under transparent canvas
        video.src = '';
    }
    
    if (badge) {
        badge.innerHTML = '📡 Menghubungkan Feed Kamera...';
        badge.style.color = '#60a5fa';
    }
    
    // Identify camera record
    const activeCams = window.cameras || (typeof cameras !== 'undefined' ? cameras : []);
    let cam = (activeCams || []).find(c => String(c.id) === String(camId));
    if (!cam) {
        cam = {
            id: camId || 'virtual_test',
            name: camId === 'virtual_test' ? 'Kamera Simulasi Visual' : 'Kamera Target',
            ip: '127.0.0.1'
        };
    }
    aiCurrentCam = cam;
    
    // Initialize canvas size and pointer event listeners
    initAIDrawCanvas();
    
    // Fetch saved persistent grid & ESP8266 settings from NVR database
    try {
        const fetchFn = (typeof authFetch === 'function') ? authFetch : (window.authFetch || fetch);
        const res = await fetchFn('/api/ai/grid/' + encodeURIComponent(cam.id));
        if (res.ok) {
            const data = await res.json();
            if (data.grid) {
                restoreAIGridFromData(data.grid);
            } else {
                aiGridRect = { x: 0, y: 0, w: 0, h: 0 };
                updateCoordStatusText();
            }
            
            // Populate ESP8266 settings
            const espCfg = data.esp_config || (cam.ai_config && cam.ai_config.esp_config);
            const chk = document.getElementById('esp-enabled-checkbox');
            const inp = document.getElementById('esp-target-input');
            const mtd = document.getElementById('esp-method-select');
            if (chk) chk.checked = !!(espCfg && espCfg.enabled);
            if (inp && espCfg && espCfg.ip_or_url) inp.value = espCfg.ip_or_url;
            if (mtd && espCfg && espCfg.method) mtd.value = espCfg.method;
        }
    } catch (err) {
        console.warn('[AI Grid] Info: Grid tersimpan belum ada atau default:', err);
    }
    
    // If real camera with stream URL, attempt HLS preview safely
    const hlsFn = window.initHlsPlayer || (typeof initHlsPlayer === 'function' ? initHlsPlayer : null);
    const token = (typeof getAuthToken === 'function') ? getAuthToken() : (localStorage.getItem('nvr_auth_token') || '');
    
    if (cam && (cam.mainStreamUrl || cam.mediaMtxPath) && cam.id !== 'virtual_test' && hlsFn && video) {
        const hlsPath = cam.mediaMtxPath || cam.id;
        const hlsUrl = (cam.mainStreamUrl && cam.mainStreamUrl.startsWith('http')) 
            ? cam.mainStreamUrl 
            : ('/stream/' + hlsPath + '/index.m3u8?token=' + encodeURIComponent(token));
        
        try {
            hlsFn('ai-stream-preview', hlsUrl);
            video.onplaying = () => {
                video.style.display = 'block';
                if (badge) {
                    badge.innerHTML = '🟢 Live Stream Feed Aktif';
                    badge.style.color = '#34d399';
                }
            };
            video.onerror = () => {
                if (badge) {
                    badge.innerHTML = '⚪ Mode Simulasi Visual (Stream Standby)';
                    badge.style.color = '#94a3b8';
                }
            };
        } catch (hlsErr) {
            if (badge) {
                badge.innerHTML = '⚪ Mode Simulasi Visual (Stream Standby)';
                badge.style.color = '#94a3b8';
            }
        }
    } else {
        if (badge) {
            badge.innerHTML = '⚪ Mode Simulasi Visual (1080p HUD Aktif)';
            badge.style.color = '#94a3b8';
        }
    }
}

function initAIDrawCanvas() {
    const container = document.getElementById('ai-canvas-container');
    const canvas = document.getElementById('ai-draw-canvas');
    if (!container || !canvas) return;
    
    const rect = container.getBoundingClientRect();
    const width = Math.max(Math.round(rect.width) || 800, 320);
    const height = Math.max(Math.round(rect.height) || 450, 240);
    
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }
    
    aiDrawCanvas = canvas;
    aiDrawCtx = canvas.getContext('2d');
    
    function getPointerPos(evt) {
        const cRect = canvas.getBoundingClientRect();
        const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
        const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
        return {
            x: Math.max(0, Math.min(canvas.width, clientX - cRect.left)),
            y: Math.max(0, Math.min(canvas.height, clientY - cRect.top))
        };
    }
    
    canvas.onmousedown = (e) => {
        isAIDrawing = true;
        const pos = getPointerPos(e);
        aiDragStart = pos;
        aiGridRect = { x: pos.x, y: pos.y, w: 0, h: 0 };
    };
    
    canvas.onmousemove = (e) => {
        if (!isAIDrawing) return;
        const pos = getPointerPos(e);
        const x = Math.min(aiDragStart.x, pos.x);
        const y = Math.min(aiDragStart.y, pos.y);
        const w = Math.abs(pos.x - aiDragStart.x);
        const h = Math.abs(pos.y - aiDragStart.y);
        aiGridRect = { x, y, w, h };
        updateCoordStatusText();
    };
    
    const endDrawing = () => {
        if (!isAIDrawing) return;
        isAIDrawing = false;
        if (aiGridRect.w < 10 || aiGridRect.h < 10) {
            aiGridRect = { x: 0, y: 0, w: 0, h: 0 };
        }
        updateCoordStatusText();
    };
    
    canvas.onmouseup = endDrawing;
    canvas.onmouseleave = endDrawing;
    
    // Touchscreen / mobile / STB touch monitor support
    canvas.ontouchstart = (e) => {
        e.preventDefault();
        isAIDrawing = true;
        const pos = getPointerPos(e);
        aiDragStart = pos;
        aiGridRect = { x: pos.x, y: pos.y, w: 0, h: 0 };
    };
    
    canvas.ontouchmove = (e) => {
        if (!isAIDrawing) return;
        e.preventDefault();
        const pos = getPointerPos(e);
        const x = Math.min(aiDragStart.x, pos.x);
        const y = Math.min(aiDragStart.y, pos.y);
        const w = Math.abs(pos.x - aiDragStart.x);
        const h = Math.abs(pos.y - aiDragStart.y);
        aiGridRect = { x, y, w, h };
        updateCoordStatusText();
    };
    
    canvas.ontouchend = endDrawing;
}

// Continuous Render Loop: ensures instant visual updates, real-time video transparency & live output visualization
function aiStartRenderLoop() {
    if (aiAnimFrameId) cancelAnimationFrame(aiAnimFrameId);
    
    function loop() {
        const modal = document.getElementById('aiGridModalOverlay');
        if (!modal || modal.style.display === 'none') {
            return; // Stop loop when modal is closed
        }
        
        renderAIFrame();
        aiAnimFrameId = requestAnimationFrame(loop);
    }
    
    aiAnimFrameId = requestAnimationFrame(loop);
}

function aiStopRenderLoop() {
    if (aiAnimFrameId) {
        cancelAnimationFrame(aiAnimFrameId);
        aiAnimFrameId = null;
    }
}

function renderAIFrame() {
    if (!aiDrawCanvas || !aiDrawCtx) return;
    const ctx = aiDrawCtx;
    const w = aiDrawCanvas.width;
    const h = aiDrawCanvas.height;
    const video = document.getElementById('ai-stream-preview');
    const isVideoPlaying = video && !video.paused && video.readyState >= 2 && video.videoWidth > 0;
    
    ctx.clearRect(0, 0, w, h);
    
    // 1. If video is NOT ready, draw the Surveillance CCTV Studio layout
    if (!isVideoPlaying) {
        // Dark gradient backdrop
        const bgGrad = ctx.createLinearGradient(0, 0, w, h);
        bgGrad.addColorStop(0, '#0c1322');
        bgGrad.addColorStop(1, '#060a12');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);
        
        // Perspective room guide lines (Floor, Entrance Door, Walls)
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Floor perspective
        ctx.moveTo(0, h * 0.72); ctx.lineTo(w, h * 0.72);
        ctx.moveTo(w * 0.2, h * 0.72); ctx.lineTo(0, h);
        ctx.moveTo(w * 0.8, h * 0.72); ctx.lineTo(w, h);
        ctx.moveTo(w * 0.5, h * 0.72); ctx.lineTo(w * 0.5, h);
        
        // Entrance door guide
        ctx.rect(w * 0.38, h * 0.28, w * 0.24, h * 0.44);
        ctx.stroke();
        
        // Subtle 10x10 Matrix Grid
        const cols = 10;
        const rows = 10;
        const cellW = w / cols;
        const cellH = h / rows;
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.08)';
        ctx.beginPath();
        for (let c = 1; c < cols; c++) {
            ctx.moveTo(c * cellW, 0); ctx.lineTo(c * cellW, h);
        }
        for (let r = 1; r < rows; r++) {
            ctx.moveTo(0, r * cellH); ctx.lineTo(w, r * cellH);
        }
        ctx.stroke();
        
        // Axis Coordinate markers
        ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
        ctx.font = '10px monospace';
        const colLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        for (let c = 0; c < cols; c++) {
            ctx.fillText(colLetters[c], c * cellW + cellW / 2 - 4, 13);
        }
        for (let r = 0; r < rows; r++) {
            ctx.fillText(String(r + 1), 5, r * cellH + cellH / 2 + 4);
        }
        
        // Center crosshair
        const cx = w / 2;
        const cy = h / 2;
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 14, cy); ctx.lineTo(cx + 14, cy);
        ctx.moveTo(cx, cy - 14); ctx.lineTo(cx, cy + 14);
        ctx.stroke();
        
        // Camera metadata banner
        ctx.fillStyle = '#38bdf8';
        ctx.font = '11px monospace';
        const camLabel = aiCurrentCam ? aiCurrentCam.name : 'KAMERA NVR';
        const dateStr = new Date().toLocaleTimeString('id-ID');
        ctx.fillText(`● CAM: ${camLabel.toUpperCase()} | 1080p HD | LIVE REC ${dateStr}`, 24, 26);
    } else {
        // Video playing: draw very subtle guide overlay
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
        ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
        ctx.stroke();
    }
    
    // Corner brackets
    const bSize = 14;
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, 8 + bSize); ctx.lineTo(8, 8); ctx.lineTo(8 + bSize, 8);
    ctx.moveTo(w - 8 - bSize, 8); ctx.lineTo(w - 8, 8); ctx.lineTo(w - 8, 8 + bSize);
    ctx.moveTo(8, h - 8 - bSize); ctx.lineTo(8, h - 8); ctx.lineTo(8 + bSize, h - 8);
    ctx.moveTo(w - 8 - bSize, h - 8); ctx.lineTo(w - 8, h - 8); ctx.lineTo(w - 8, h - 8 - bSize);
    ctx.stroke();
    
    // 2. Real-Time Detection Output Simulation (Answers user: "bisakah langsung memvisualisasikan langsung output waktu sedang memilih grid videonya")
    let targetColliding = false;
    if (aiSimActive) {
        // Move target smoothly
        aiSimTarget.x += aiSimTarget.vx;
        aiSimTarget.y += aiSimTarget.vy;
        
        // Bounce off canvas walls
        if (aiSimTarget.x <= 15) {
            aiSimTarget.x = 15;
            aiSimTarget.vx = Math.abs(aiSimTarget.vx);
        } else if (aiSimTarget.x + aiSimTarget.w >= w - 15) {
            aiSimTarget.x = w - 15 - aiSimTarget.w;
            aiSimTarget.vx = -Math.abs(aiSimTarget.vx);
        }
        if (aiSimTarget.y <= 30) {
            aiSimTarget.y = 30;
            aiSimTarget.vy = Math.abs(aiSimTarget.vy);
        } else if (aiSimTarget.y + aiSimTarget.h >= h - 20) {
            aiSimTarget.y = h - 20 - aiSimTarget.h;
            aiSimTarget.vy = -Math.abs(aiSimTarget.vy);
        }
        
        // Collision Detection: is target center inside user drawn grid?
        const tx = aiSimTarget.x;
        const ty = aiSimTarget.y;
        const tw = aiSimTarget.w;
        const th = aiSimTarget.h;
        const tCenterX = tx + tw / 2;
        const tCenterY = ty + th * 0.7; // Feet / torso anchor
        
        if (aiGridRect.w > 10 && aiGridRect.h > 10) {
            const gx = aiGridRect.x;
            const gy = aiGridRect.y;
            const gw = aiGridRect.w;
            const gh = aiGridRect.h;
            
            if (tCenterX >= gx && tCenterX <= gx + gw && tCenterY >= gy && tCenterY <= gy + gh) {
                targetColliding = true;
            }
        }
        aiSimTarget.inside = targetColliding;
        
        // Draw Simulated Human Box
        const pulse = Math.sin(Date.now() / 150) * 0.2 + 0.8;
        ctx.save();
        if (targetColliding) {
            // Alarm Collision State: glowing red
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 15;
            ctx.strokeStyle = `rgba(239, 68, 68, ${pulse})`;
            ctx.lineWidth = 2.5;
            ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        } else {
            // Safe State: cyan
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 8;
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.8;
            ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
        }
        
        ctx.fillRect(tx, ty, tw, th);
        ctx.strokeRect(tx, ty, tw, th);
        ctx.restore();
        
        // Human Silhouette Representation
        ctx.save();
        ctx.fillStyle = targetColliding ? '#ef4444' : '#38bdf8';
        const headRadius = tw * 0.16;
        ctx.beginPath();
        ctx.arc(tx + tw / 2, ty + headRadius * 2, headRadius, 0, Math.PI * 2);
        ctx.fill();
        // Body lines
        ctx.strokeStyle = targetColliding ? '#ef4444' : '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        // Spine
        ctx.moveTo(tx + tw / 2, ty + headRadius * 3);
        ctx.lineTo(tx + tw / 2, ty + th * 0.65);
        // Arms
        ctx.moveTo(tx + tw * 0.2, ty + th * 0.45);
        ctx.lineTo(tx + tw * 0.8, ty + th * 0.45);
        // Legs
        ctx.moveTo(tx + tw / 2, ty + th * 0.65);
        ctx.lineTo(tx + tw * 0.22, ty + th * 0.95);
        ctx.moveTo(tx + tw / 2, ty + th * 0.65);
        ctx.lineTo(tx + tw * 0.78, ty + th * 0.95);
        ctx.stroke();
        ctx.restore();
        
        // Target Badge Label
        const badgeColor = targetColliding ? '#ef4444' : '#0284c7';
        const badgeText = targetColliding ? '🚨 [MANUSIA 96%] INTRUSI!' : '🚶 [MANUSIA 96%] Aman';
        ctx.fillStyle = badgeColor;
        ctx.fillRect(tx, Math.max(0, ty - 18), 125, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9.5px monospace';
        ctx.fillText(badgeText, tx + 4, Math.max(12, ty - 5));
    }
    
    // Update live banner
    const banner = document.getElementById('ai-live-collision-banner');
    if (banner) {
        banner.style.display = targetColliding ? 'block' : 'none';
    }
    
    // 3. User Drawn Intrusion Detection Grid (ROI)
    if (aiGridRect.w > 0 && aiGridRect.h > 0) {
        const { x, y, w: rw, h: rh } = aiGridRect;
        
        // Fill color: more intense if target is inside
        ctx.fillStyle = targetColliding ? 'rgba(239, 68, 68, 0.42)' : 'rgba(239, 68, 68, 0.22)';
        ctx.fillRect(x, y, rw, rh);
        
        // Dashed Red Border
        ctx.save();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([7, 4]);
        ctx.strokeRect(x, y, rw, rh);
        ctx.restore();
        
        // Corner anchor points
        const pSize = 7;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        const corners = [
            [x, y],
            [x + rw, y],
            [x, y + rh],
            [x + rw, y + rh]
        ];
        corners.forEach(([cx, cy]) => {
            ctx.fillRect(cx - pSize/2, cy - pSize/2, pSize, pSize);
            ctx.strokeRect(cx - pSize/2, cy - pSize/2, pSize, pSize);
        });
        
        // Floating Top Label
        ctx.fillStyle = 'rgba(239, 68, 68, 0.95)';
        const tagH = 20;
        const tagW = Math.min(rw, 190);
        ctx.fillRect(x, Math.max(0, y - tagH), tagW, tagH);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(targetColliding ? '🚨 ALARM: TARGET DI AREA ROI!' : '🎯 AREA DETEKSI INTRUSI', x + 6, Math.max(14, y - 5));
    }
}

function updateCoordStatusText() {
    const el = document.getElementById('ai-coord-status');
    if (!el) return;
    if (!aiDrawCanvas || aiGridRect.w === 0 || aiGridRect.h === 0) {
        el.innerHTML = '<span style="color:#94a3b8;">Belum ada area deteksi yang digambar.</span>';
        return;
    }
    const cw = aiDrawCanvas.width;
    const ch = aiDrawCanvas.height;
    const px = ((aiGridRect.x / cw) * 100).toFixed(1);
    const py = ((aiGridRect.y / ch) * 100).toFixed(1);
    const pw = ((aiGridRect.w / cw) * 100).toFixed(1);
    const ph = ((aiGridRect.h / ch) * 100).toFixed(1);
    el.innerHTML = `<span style="color:#34d399; font-weight:600;">✓ Area ROI Aktif:</span> ` +
        `X: <span style="color:#60a5fa;">${px}%</span> | ` +
        `Y: <span style="color:#60a5fa;">${py}%</span> | ` +
        `Lebar: <span style="color:#f59e0b;">${pw}%</span> | ` +
        `Tinggi: <span style="color:#f59e0b;">${ph}%</span>`;
}

function toggleAISimulation() {
    aiSimActive = !aiSimActive;
    const btn = document.getElementById('btn-toggle-ai-sim');
    if (btn) {
        if (aiSimActive) {
            btn.innerHTML = '👁️ Simulasi Output: AKTIF';
            btn.style.background = 'rgba(16,185,129,0.15)';
            btn.style.color = '#34d399';
            btn.style.borderColor = 'rgba(16,185,129,0.4)';
        } else {
            btn.innerHTML = '👁️ Simulasi Output: MATI';
            btn.style.background = 'rgba(148,163,184,0.15)';
            btn.style.color = '#94a3b8';
            btn.style.borderColor = 'rgba(148,163,184,0.3)';
        }
    }
    const banner = document.getElementById('ai-live-collision-banner');
    if (banner && !aiSimActive) banner.style.display = 'none';
}

function setAIGridPreset(preset) {
    if (!aiDrawCanvas) initAIDrawCanvas();
    if (!aiDrawCanvas) return;
    const cw = aiDrawCanvas.width;
    const ch = aiDrawCanvas.height;
    
    if (preset === 'full') {
        aiGridRect = { x: 4, y: 4, w: cw - 8, h: ch - 8 };
    } else if (preset === 'center') {
        aiGridRect = {
            x: Math.round(cw * 0.15),
            y: Math.round(ch * 0.15),
            w: Math.round(cw * 0.70),
            h: Math.round(ch * 0.70)
        };
    } else if (preset === 'gate') {
        aiGridRect = {
            x: Math.round(cw * 0.10),
            y: Math.round(ch * 0.45),
            w: Math.round(cw * 0.80),
            h: Math.round(ch * 0.50)
        };
    }
    updateCoordStatusText();
}

function clearAIGrid() {
    aiGridRect = { x: 0, y: 0, w: 0, h: 0 };
    updateCoordStatusText();
    const feedback = document.getElementById('ai-save-feedback');
    if (feedback) feedback.textContent = 'Area intrusi dibersihkan.';
}

function restoreAIGridFromData(grid) {
    if (!aiDrawCanvas || !grid) return;
    const cw = aiDrawCanvas.width;
    const ch = aiDrawCanvas.height;
    
    let x = Number(grid.x) || 0;
    let y = Number(grid.y) || 0;
    let w = Number(grid.w) || 0;
    let h = Number(grid.h) || 0;
    
    if (x <= 1 && w <= 1 && (x > 0 || w > 0)) {
        x = x * cw;
        y = y * ch;
        w = w * cw;
        h = h * ch;
    }
    aiGridRect = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
    updateCoordStatusText();
}

// ESP8266 IoT Section Management & Testing
function toggleESPSection() {
    const body = document.getElementById('espSettingsBody');
    const chevron = document.getElementById('espChevron');
    if (!body) return;
    if (body.style.display === 'none') {
        body.style.display = 'block';
        if (chevron) chevron.textContent = '▲ Sembunyikan';
    } else {
        body.style.display = 'none';
        if (chevron) chevron.textContent = '▼ Buka Pengaturan';
    }
}

async function testESP8266Trigger() {
    const inp = document.getElementById('esp-target-input');
    const mtd = document.getElementById('esp-method-select');
    const statusEl = document.getElementById('esp-test-status');
    const btn = document.getElementById('btn-test-esp');
    
    const target = inp ? inp.value.trim() : '';
    const method = mtd ? mtd.value : 'GET';
    
    if (!target) {
        alert('Masukkan IP atau URL ESP8266 terlebih dahulu (contoh: 192.168.1.150)!');
        if (inp) inp.focus();
        return;
    }
    
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Menguji...';
    }
    if (statusEl) {
        statusEl.textContent = 'Menghubungi ESP8266...';
        statusEl.style.color = '#60a5fa';
    }
    
    try {
        const fetchFn = (typeof authFetch === 'function') ? authFetch : (window.authFetch || fetch);
        const res = await fetchFn('/api/ai/test_esp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target, method })
        });
        
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
            if (statusEl) {
                statusEl.textContent = `✅ ${data.message}`;
                statusEl.style.color = '#10b981';
            }
            alert(`Berhasil! ESP8266 merespons sinyal alarm (${data.url}) dengan status HTTP ${data.status}.`);
        } else {
            throw new Error(data.error || 'HTTP ' + res.status);
        }
    } catch (e) {
        console.error('[ESP8266 Test Error]', e);
        if (statusEl) {
            statusEl.textContent = `❌ ${e.message}`;
            statusEl.style.color = '#ef4444';
        }
        alert(`Gagal menghubungi ESP8266:\n${e.message}\n\nPastikan ESP8266 dan STB NVR berada pada jaringan WiFi/LAN yang sama.`);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '🔔 Test Trigger ESP8266';
        }
    }
}

function showArduinoCodeModal() {
    const modal = document.getElementById('arduinoCodeModalOverlay');
    const pre = document.getElementById('arduinoCodeSnippet');
    if (pre) {
        pre.textContent = `/*
 * Arch3r NVR (Ver. 9.9.9) - ESP8266 IoT Alarm & Siren Receiver
 * Board: NodeMCU 1.0 (ESP-12E Module) atau Wemos D1 Mini
 * Output: Pin D1 (GPIO 5) terhubung ke Relay / Buzzer Aktif
 */

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>

const char* ssid = "NAMA_WIFI_ANDA";
const char* password = "PASSWORD_WIFI_ANDA";

ESP8266WebServer server(80);
const int RELAY_PIN = D1; // GPIO5 -> Pin Relay / Buzzer

unsigned long alarmOffTime = 0;
bool isAlarmActive = false;

void handleAlarm() {
  String event = server.arg("event");
  String cam = server.arg("cam");
  Serial.printf("[NVR ALARM] Terpicu Kamera: %s | Event: %s\\n", cam.c_str(), event.c_str());

  // Nyalakan relay / sirine selama 3 detik
  digitalWrite(RELAY_PIN, HIGH);
  isAlarmActive = true;
  alarmOffTime = millis() + 3000;

  server.send(200, "application/json", "{\\"status\\":\\"ok\\",\\"alarm\\":true,\\"pin\\":5}");
}

void handleRoot() {
  server.send(200, "text/plain", "Arch3r NVR ESP8266 Alarm Receiver Siaga");
}

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("Menghubungkan ke WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\\nWiFi Terhubung!");
  Serial.print("Alamat IP ESP8266: ");
  Serial.println(WiFi.localIP()); // Masukkan IP ini ke Pengaturan Arch3r NVR!

  server.on("/", handleRoot);
  server.on("/alarm", handleAlarm);
  server.begin();
}

void loop() {
  server.handleClient();
  
  // Matikan sirine setelah durasi berakhir secara non-blocking
  if (isAlarmActive && millis() > alarmOffTime) {
    digitalWrite(RELAY_PIN, LOW);
    isAlarmActive = false;
  }
}`;
    }
    if (modal) modal.style.display = 'flex';
}

function closeArduinoCodeModal() {
    const modal = document.getElementById('arduinoCodeModalOverlay');
    if (modal) modal.style.display = 'none';
}

function copyArduinoCode() {
    const pre = document.getElementById('arduinoCodeSnippet');
    const btn = document.getElementById('btn-copy-arduino');
    if (!pre) return;
    navigator.clipboard.writeText(pre.textContent).then(() => {
        if (btn) {
            btn.textContent = '✅ Disalin!';
            setTimeout(() => { btn.textContent = '📋 Salin Skrip'; }, 2000);
        }
    }).catch(() => {
        alert('Gagal menyalin otomatis. Silakan pilih dan salin teks secara manual.');
    });
}

async function saveAIGrid() {
    const select = document.getElementById('ai-cam-select');
    const camId = select ? select.value : null;
    const btnSave = document.getElementById('btn-save-ai-grid');
    const feedback = document.getElementById('ai-save-feedback');
    
    if (!camId) {
        alert('Pilih target kamera terlebih dahulu!');
        return;
    }
    
    if (aiGridRect.w === 0 || aiGridRect.h === 0) {
        if (!confirm('Belum ada area deteksi (kotak merah) yang digambar. Apakah Anda ingin mengosongkan area ROI kamera ini?')) {
            return;
        }
    }
    
    const cw = (aiDrawCanvas && aiDrawCanvas.width) || 800;
    const ch = (aiDrawCanvas && aiDrawCanvas.height) || 450;
    
    // Read ESP8266 settings
    const espChk = document.getElementById('esp-enabled-checkbox');
    const espInp = document.getElementById('esp-target-input');
    const espMtd = document.getElementById('esp-method-select');
    const espConfig = {
        enabled: espChk ? espChk.checked : false,
        ip_or_url: espInp ? espInp.value.trim() : '',
        method: espMtd ? espMtd.value : 'GET',
        cooldown_sec: 4
    };
    
    const payload = {
        camera_id: camId,
        x: parseFloat(((aiGridRect.x || 0) / cw).toFixed(4)),
        y: parseFloat(((aiGridRect.y || 0) / ch).toFixed(4)),
        w: parseFloat(((aiGridRect.w || 0) / cw).toFixed(4)),
        h: parseFloat(((aiGridRect.h || 0) / ch).toFixed(4)),
        pixel_width: cw,
        pixel_height: ch,
        enabled: aiGridRect.w > 0,
        esp_config: espConfig,
        updated_at: new Date().toISOString()
    };
    
    if (btnSave) {
        btnSave.disabled = true;
        btnSave.textContent = '💾 Menyimpan...';
    }
    if (feedback) {
        feedback.textContent = 'Menyimpan konfigurasi...';
        feedback.style.color = '#60a5fa';
    }
    
    try {
        const fetchFn = (typeof authFetch === 'function') ? authFetch : (window.authFetch || fetch);
        const res = await fetchFn('/api/ai/save_grid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
            if (feedback) {
                feedback.textContent = '✅ Berhasil disimpan ke NVR database!';
                feedback.style.color = '#10b981';
            }
            alert('Konfigurasi Area Deteksi Visual & ESP8266 berhasil disimpan secara persisten ke NVR!');
            setTimeout(() => {
                closeAIGridModal();
            }, 600);
        } else {
            throw new Error(data.error || 'Server error ' + res.status);
        }
    } catch (e) {
        console.error('[AI Grid Save Error]', e);
        if (feedback) {
            feedback.textContent = '❌ Gagal: ' + e.message;
            feedback.style.color = '#ef4444';
        }
        alert('Gagal menyimpan area deteksi: ' + (e.message || e));
    } finally {
        if (btnSave) {
            btnSave.disabled = false;
            btnSave.textContent = '💾 Simpan Konfigurasi AI & ESP';
        }
    }
}

function closeAIGridModal() {
    aiStopRenderLoop();
    
    const modal = document.getElementById('aiGridModalOverlay');
    if (modal) modal.style.display = 'none';
    
    const banner = document.getElementById('ai-live-collision-banner');
    if (banner) banner.style.display = 'none';
    
    const video = document.getElementById('ai-stream-preview');
    if (video) {
        video.pause();
        video.src = '';
    }
    
    const players = window.activeHlsPlayers || (typeof activeHlsPlayers !== 'undefined' ? activeHlsPlayers : null);
    if (players && players['ai-stream-preview']) {
        try { players['ai-stream-preview'].destroy(); } catch (e) {}
        delete players['ai-stream-preview'];
    }
}

// Bind to window for global invocation
window.openAIGridModal = openAIGridModal;
window.loadCamStreamForAI = loadCamStreamForAI;
window.setAIGridPreset = setAIGridPreset;
window.clearAIGrid = clearAIGrid;
window.saveAIGrid = saveAIGrid;
window.closeAIGridModal = closeAIGridModal;
window.toggleAISimulation = toggleAISimulation;
window.toggleESPSection = toggleESPSection;
window.testESP8266Trigger = testESP8266Trigger;
window.showArduinoCodeModal = showArduinoCodeModal;
window.closeArduinoCodeModal = closeArduinoCodeModal;
window.copyArduinoCode = copyArduinoCode;

// ADDON MARKETPLACE LOGIC
async function fetchInstalledAddons() {
    const tbody = document.getElementById('installed-addons-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5" style="padding: 2rem; text-align: center; color: var(--text-muted);">Memuat modul addons...</td></tr>';
    
    try {
        const fetchFn = (typeof authFetch === 'function') ? authFetch : (window.authFetch || fetch);
        const response = await fetchFn('/api/addons');
        if (response.ok) {
            const data = await response.json();
            
            if (data.addons && data.addons.length > 0) {
                tbody.innerHTML = '';
                data.addons.forEach(addon => {
                    const statusColor = addon.active ? '#22c55e' : 'var(--text-muted)';
                    const statusText = addon.active ? 'Aktif' : 'Nonaktif';
                    const icon = addon.icon || '🧩';
                    
                    const tr = document.createElement('tr');
                    tr.style.borderBottom = '1px solid var(--border)';
                    tr.innerHTML = `
                        <td style="padding: 1rem 1.5rem; font-size: 1.5rem;">${icon}</td>
                        <td style="padding: 1rem 1.5rem;">
                            <strong style="display:block; color:var(--text);">${addon.name}</strong>
                            <span style="font-size:0.85rem; color:var(--text-muted);">${addon.description || 'Tidak ada deskripsi'}</span>
                        </td>
                        <td style="padding: 1rem 1.5rem; color:var(--text-muted);">${addon.version || '1.0.0'}</td>
                        <td style="padding: 1rem 1.5rem;">
                            <span style="display:inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; background: ${addon.active ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)'}; color: ${statusColor}; font-size: 0.85rem; border: 1px solid ${addon.active ? 'rgba(34,197,94,0.3)' : 'var(--border)'};">
                                ${statusText}
                            </span>
                        </td>
                        <td style="padding: 1rem 1.5rem; text-align:right;">
                            <div style="display:flex; justify-content:flex-end; gap:0.5rem;">
                                <button class="btn-sm btn-primary" onclick="openAddonConfig('${addon.id}', '${addon.name}')" title="Pengaturan">⚙️</button>
                                ${addon.id === 'ai_yolo' ? `<button class="btn-sm btn-primary" onclick="openAIGridModal()" title="Konfigurasi Area">🎯</button>` : ''}
                                <button class="btn-sm btn-secondary" onclick="toggleAddonState('${addon.id}', ${!addon.active})" title="${addon.active ? 'Matikan' : 'Nyalakan'}">
                                    ${addon.active ? '⏹️' : '▶️'}
                                </button>
                                <button class="btn-sm btn-danger" onclick="deleteAddon('${addon.id}')" title="Hapus Addon">🗑️</button>
                            </div>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="5" style="padding: 2rem; text-align: center; color: var(--text-muted);">Belum ada addon yang terinstal. Silakan instal melalui GitHub/URL.</td></tr>';
            }
        } else if (response.status === 401 || response.status === 403) {
            tbody.innerHTML = `<tr><td colspan="5" style="padding: 2rem; text-align: center; color: #f59e0b;">
                Sesi login kedaluwarsa atau memerlukan hak akses Administrator / Superadmin.<br>
                <button class="btn-sm btn-secondary" onclick="fetchInstalledAddons()" style="margin-top:0.75rem;">🔄 Coba Segarkan</button>
            </td></tr>`;
        } else {
            const errData = await response.json().catch(() => ({}));
            tbody.innerHTML = `<tr><td colspan="5" style="padding: 2rem; text-align: center; color: #ef4444;">
                Gagal memuat daftar addon: ${errData.error || 'HTTP ' + response.status}<br>
                <button class="btn-sm btn-secondary" onclick="fetchInstalledAddons()" style="margin-top:0.75rem;">🔄 Coba Lagi</button>
            </td></tr>`;
        }
    } catch (e) {
        console.error('[Addons] Error fetching installed addons:', e);
        tbody.innerHTML = `<tr><td colspan="5" style="padding: 2rem; text-align: center; color: #ef4444;">
            Error koneksi ke server: ${e.message || e}<br>
            <button class="btn-sm btn-secondary" onclick="fetchInstalledAddons()" style="margin-top:0.75rem;">🔄 Coba Hubungkan Ulang</button>
        </td></tr>`;
    }
}

async function toggleAddonState(addonId, newState) {
    if (!confirm(`Apakah Anda yakin ingin ${newState ? 'menyalakan' : 'mematikan'} addon ini?`)) return;
    
    try {
        const response = await authFetch('/api/addons/' + encodeURIComponent(addonId) + '/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: newState })
        });
        
        const data = await response.json().catch(() => ({}));
        if (response.ok) {
            fetchInstalledAddons();
        } else {
            alert('Gagal mengubah status addon: ' + (data.error || 'HTTP ' + response.status));
        }
    } catch (e) {
        console.error('[Addon Toggle Error]', e);
        alert('Gagal menghubungi server: ' + (e.message || e));
    }
}

async function deleteAddon(addonId) {
    if (!confirm('Apakah Anda yakin ingin MENGHAPUS addon ini? Data dan script addon akan dihapus permanen.')) return;
    
    try {
        const response = await authFetch('/api/addons/' + encodeURIComponent(addonId), {
            method: 'DELETE'
        });
        
        const data = await response.json().catch(() => ({}));
        if (response.ok) {
            fetchInstalledAddons();
        } else {
            alert('Gagal menghapus addon: ' + (data.error || 'HTTP ' + response.status));
        }
    } catch (e) {
        console.error('[Addon Delete Error]', e);
        alert('Gagal menghubungi server: ' + (e.message || e));
    }
}

function openInstallAddonModal() {
    document.getElementById('addon-url-input').value = '';
    document.getElementById('installAddonModalOverlay').style.display = 'flex';
}

function closeInstallAddonModal() {
    document.getElementById('installAddonModalOverlay').style.display = 'none';
}

let currentConfigAddonId = null;

async function openAddonConfig(addonId, addonName) {
    currentConfigAddonId = addonId;
    const titleEl = document.getElementById('addonConfigTitle');
    const bodyEl = document.getElementById('addonConfigBody');
    if (titleEl) titleEl.textContent = addonName;
    if (bodyEl) bodyEl.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem;">Memuat modul konfigurasi...</p>';
    
    const modal = document.getElementById('addonConfigModalOverlay');
    if (modal) modal.style.display = 'flex';

    try {
        const [configRes, statusRes] = await Promise.all([
            authFetch('/api/addons/' + addonId + '/config'),
            (addonId === 'ai_yolo' || addonId === 'ai-yolo') ? authFetch('/api/addons/ai_yolo/status').catch(() => null) :
            (addonId === 'hdmi-kiosk' || addonId === 'hdmi_kiosk') ? authFetch('/api/addons/hdmi-kiosk/status').catch(() => null) :
            Promise.resolve(null)
        ]);

        const configData = await configRes.json();
        let statusData = null;
        if (statusRes && statusRes.ok) {
            statusData = await statusRes.json().catch(() => null);
        }

        if (configRes.ok) {
            renderAddonConfigForm(addonId, addonName, configData.config || {}, statusData);
        } else {
            if (bodyEl) bodyEl.innerHTML = `<p style="color:#ef4444;text-align:center;padding:2rem;">Gagal memuat: ${configData.error || 'Terjadi kesalahan'}</p>`;
        }
    } catch (e) {
        if (bodyEl) bodyEl.innerHTML = `<p style="color:#ef4444;text-align:center;padding:2rem;">Gagal menghubungi server: ${e.message || e}</p>`;
    }
}

function renderAddonConfigForm(addonId, addonName, configObj, statusData) {
    const container = document.getElementById('addonConfigBody');
    if (!container) return;

    const availableCams = window.cameras || [];

    // --- 1. SPESIFIKASI: AI YOLOv8 Human Detection Addon ---
    if (addonId === 'ai_yolo' || addonId === 'ai-yolo') {
        const isRunning = statusData ? statusData.active : true;
        const currentCam = configObj.camera_id || '';
        const confPercent = Math.round((configObj.confidence_threshold !== undefined ? configObj.confidence_threshold : 0.50) * 100);
        const frameSkip = configObj.frame_skip || 15;
        const streamType = configObj.stream_type || 'sub';

        let camOptionsHtml = '<option value="">-- Analisis Semua Kamera / Standar --</option>';
        availableCams.forEach(cam => {
            const isSel = String(cam.id) === String(currentCam) ? 'selected' : '';
            camOptionsHtml += `<option value="${cam.id}" ${isSel}>${cam.name} (${cam.ip || 'RTSP'})</option>`;
        });

        container.innerHTML = `
            <div style="margin-bottom: 1.25rem; padding: 1rem; border-radius: 6px; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.3);">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
                    <div>
                        <strong style="color:#60a5fa; font-size:1rem; display:block;">🧠 Mesin AI: YOLOv8n (Ultra-Lightweight ARM64)</strong>
                        <span style="font-size:0.85rem; color:var(--text-muted);">Dioptimalkan untuk SoC Amlogic STB Linux Armbian (Zero-Crash Guard)</span>
                    </div>
                    <span style="padding: 0.25rem 0.6rem; border-radius: 4px; font-size: 0.8rem; font-weight: bold; background:${isRunning ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}; color:${isRunning ? '#22c55e' : '#ef4444'}; border: 1px solid ${isRunning ? '#22c55e' : '#ef4444'};">
                        ${isRunning ? '🟢 Layanan Aktif' : '⚪ Siaga / Mati'}
                    </span>
                </div>
                <div style="display:flex; gap:0.5rem; margin-top:0.75rem; flex-wrap:wrap;">
                    <button type="button" class="btn btn-sm btn-primary" onclick="openAIGridModal('${currentCam}')" style="display:flex; align-items:center; gap:0.3rem;">
                        <span>🎯</span> Buka Visual Intrusion Area (Grid Editor)
                    </button>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="testAIYoloAlarm()" style="display:flex; align-items:center; gap:0.3rem;">
                        <span>🔔</span> Uji Alarm / Test Webhook
                    </button>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="restartAIYoloService()" style="display:flex; align-items:center; gap:0.3rem;">
                        <span>⚡</span> Terapkan & Restart Service
                    </button>
                </div>
            </div>

            <form id="addonConfigForm">
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
                    <div>
                        <label style="display:block; margin-bottom:0.4rem; font-weight:600; font-size:0.88rem; color:var(--text);">Target Kamera Pengawasan:</label>
                        <select name="camera_id" id="addon_cfg_cam_id" style="width:100%; padding:0.65rem; background:rgba(0,0,0,0.25); border:1px solid var(--border); color:white; border-radius:4px;">
                            ${camOptionsHtml}
                        </select>
                    </div>

                    <div>
                        <label style="display:block; margin-bottom:0.4rem; font-weight:600; font-size:0.88rem; color:var(--text);">Sumber Stream Video:</label>
                        <select name="stream_type" style="width:100%; padding:0.65rem; background:rgba(0,0,0,0.25); border:1px solid var(--border); color:white; border-radius:4px;">
                            <option value="sub" ${streamType === 'sub' ? 'selected' : ''}>Sub-Stream (RTSP Ringan - Sangat Disarankan STB)</option>
                            <option value="main" ${streamType === 'main' ? 'selected' : ''}>Main-Stream (Full HD - Butuh Kapasitas CPU Tinggi)</option>
                        </select>
                    </div>
                </div>

                <div style="margin-bottom: 1.25rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
                        <label style="font-weight:600; font-size:0.88rem; color:var(--text);">Ambang Batas Kepercayaan (Confidence Threshold):</label>
                        <span id="addon_conf_label" style="font-weight:bold; color:#3b82f6; font-size:0.9rem;">${confPercent}%</span>
                    </div>
                    <input type="range" name="confidence_threshold" min="0.10" max="0.95" step="0.05" value="${configObj.confidence_threshold || 0.50}"
                        oninput="document.getElementById('addon_conf_label').textContent = Math.round(this.value * 100) + '%';"
                        style="width:100%; accent-color:#3b82f6;">
                    <small style="color:var(--text-muted); display:block; margin-top:0.25rem;">Rekomendasi 50% untuk mengurangi false alarm dari dedaunan atau bayangan cahaya.</small>
                </div>

                <div style="margin-bottom: 1.25rem;">
                    <label style="display:block; margin-bottom:0.4rem; font-weight:600; font-size:0.88rem; color:var(--text);">Interval Pemrosesan Frame (Frame Skip Rate):</label>
                    <select name="frame_skip" style="width:100%; padding:0.65rem; background:rgba(0,0,0,0.25); border:1px solid var(--border); color:white; border-radius:4px;">
                        <option value="15" ${frameSkip === 15 ? 'selected' : ''}>15 Frames (~2 FPS) - Sangat Hemat CPU (Rekomendasi STB Armbian)</option>
                        <option value="10" ${frameSkip === 10 ? 'selected' : ''}>10 Frames (~3 FPS) - Deteksi Sedang</option>
                        <option value="5" ${frameSkip === 5 ? 'selected' : ''}>5 Frames (~6 FPS) - Deteksi Cepat</option>
                    </select>
                </div>

                <div style="background:rgba(0,0,0,0.15); padding:1rem; border-radius:6px; border:1px solid var(--border); margin-bottom:1.25rem;">
                    <strong style="display:block; margin-bottom:0.75rem; font-size:0.88rem; color:var(--text);">Aksi Respon & Notifikasi Alarm:</strong>
                    <div style="display:flex; flex-direction:column; gap:0.6rem;">
                        <label style="display:flex; align-items:center; gap:0.6rem; cursor:pointer; font-size:0.88rem;">
                            <input type="checkbox" name="sound_buzzer" value="true" ${configObj.sound_buzzer !== false ? 'checked' : ''} style="width:16px; height:16px; accent-color:#3b82f6;">
                            <span>Bunyikan Alarm Buzzer Audio di Web UI saat terjadi intrusi manusia</span>
                        </label>
                        <label style="display:flex; align-items:center; gap:0.6rem; cursor:pointer; font-size:0.88rem;">
                            <input type="checkbox" name="log_alerts" value="true" ${configObj.log_alerts !== false ? 'checked' : ''} style="width:16px; height:16px; accent-color:#3b82f6;">
                            <span>Catat setiap event deteksi manusia ke NVR System Logs</span>
                        </label>
                        <label style="display:flex; align-items:center; gap:0.6rem; cursor:pointer; font-size:0.88rem;">
                            <input type="checkbox" name="auto_start" value="true" ${configObj.auto_start ? 'checked' : ''} style="width:16px; height:16px; accent-color:#3b82f6;">
                            <span>Otomatis jalankan layanan AI YOLO saat STB dinyalakan (Boot)</span>
                        </label>
                    </div>
                </div>

                <div>
                    <label style="display:block; margin-bottom:0.4rem; font-weight:600; font-size:0.88rem; color:var(--text);">Webhook Alarm Endpoint (Opsional):</label>
                    <input type="text" name="webhook_url" value="${configObj.webhook_url || 'http://127.0.0.1:3000/api/ai/webhook'}" style="width:100%; padding:0.65rem; background:rgba(0,0,0,0.25); border:1px solid var(--border); color:white; border-radius:4px; font-family:monospace; font-size:0.85rem;">
                </div>
            </form>
        `;
        return;
    }

    // --- 2. SPESIFIKASI: HDMI Monitor & Kiosk Service Addon ---
    if (addonId === 'hdmi-kiosk' || addonId === 'hdmi_kiosk') {
        const isHdmiConn = statusData ? !!statusData.isHdmiConnected : false;
        const isKioskAct = statusData ? !!statusData.isKioskServiceActive : false;
        const sysPath = (statusData && statusData.detectedSysPath) || '/sys/class/drm/...';
        const preset = configObj.preset || 'live_grid';

        let camOptionsHtml = '<option value="">-- Pilih Kamera Fullscreen --</option>';
        availableCams.forEach(cam => {
            const isSel = String(cam.id) === String(configObj.target_cam_id) ? 'selected' : '';
            camOptionsHtml += `<option value="${cam.id}" ${isSel}>${cam.name}</option>`;
        });

        container.innerHTML = `
            <div style="margin-bottom: 1.25rem; padding: 1rem; border-radius: 6px; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3);">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
                    <div>
                        <strong style="color:#34d399; font-size:1rem; display:block;">📺 Telemetri Port HDMI & Layar TV/Monitor</strong>
                        <span style="font-size:0.82rem; color:var(--text-muted); font-family:monospace;">Sysfs: ${sysPath}</span>
                    </div>
                    <div style="display:flex; gap:0.5rem;">
                        <span style="padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: bold; background:${isHdmiConn ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}; color:${isHdmiConn ? '#22c55e' : '#ef4444'}; border: 1px solid ${isHdmiConn ? '#22c55e' : '#ef4444'};">
                            ${isHdmiConn ? '🟢 Kabel HDMI Terhubung' : '⚪ Kabel Terlepas (Headless)'}
                        </span>
                        <span style="padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: bold; background:${isKioskAct ? 'rgba(59,130,246,0.15)' : 'rgba(156,163,175,0.15)'}; color:${isKioskAct ? '#60a5fa' : '#9ca3af'}; border: 1px solid ${isKioskAct ? '#60a5fa' : '#9ca3af'};">
                            ${isKioskAct ? '🖥️ Layar Aktif' : '⏹️ Layar Siaga'}
                        </span>
                    </div>
                </div>
                <div style="display:flex; gap:0.5rem; margin-top:0.75rem; flex-wrap:wrap;">
                    <button type="button" class="btn btn-sm btn-primary" onclick="toggleHdmiKioskOutput('start')" style="display:flex; align-items:center; gap:0.3rem;">
                        <span>▶️</span> Nyalakan Output HDMI
                    </button>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="toggleHdmiKioskOutput('stop')" style="display:flex; align-items:center; gap:0.3rem;">
                        <span>⏹️</span> Matikan Output HDMI
                    </button>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="refreshHdmiKioskStatus()" style="display:flex; align-items:center; gap:0.3rem;">
                        <span>🔄</span> Cek Kabel Ulang
                    </button>
                </div>
            </div>

            <form id="addonConfigForm">
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
                    <div>
                        <label style="display:block; margin-bottom:0.4rem; font-weight:600; font-size:0.88rem; color:var(--text);">Preset Tampilan Kiosk:</label>
                        <select name="preset" id="kioskPresetSelect" onchange="toggleKioskCamSelector(this.value)" style="width:100%; padding:0.65rem; background:rgba(0,0,0,0.25); border:1px solid var(--border); color:white; border-radius:4px;">
                            <option value="live_grid" ${preset === 'live_grid' ? 'selected' : ''}>Grid 4 Kamera (2x2 Quad Live View)</option>
                            <option value="live_grid_3x3" ${preset === 'live_grid_3x3' ? 'selected' : ''}>Grid 9 Kamera (3x3 Live View)</option>
                            <option value="single_cam" ${preset === 'single_cam' ? 'selected' : ''}>Kamera Tunggal Fullscreen</option>
                            <option value="full_dashboard" ${preset === 'full_dashboard' ? 'selected' : ''}>Tampilan Penuh Dashboard NVR</option>
                        </select>
                    </div>

                    <div id="kioskSingleCamBox" style="display:${preset === 'single_cam' ? 'block' : 'none'};">
                        <label style="display:block; margin-bottom:0.4rem; font-weight:600; font-size:0.88rem; color:var(--text);">Pilih Kamera Utama:</label>
                        <select name="target_cam_id" style="width:100%; padding:0.65rem; background:rgba(0,0,0,0.25); border:1px solid var(--border); color:white; border-radius:4px;">
                            ${camOptionsHtml}
                        </select>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
                    <div>
                        <label style="display:block; margin-bottom:0.4rem; font-weight:600; font-size:0.88rem; color:var(--text);">Resolusi Tampilan Layar:</label>
                        <select name="resolution" style="width:100%; padding:0.65rem; background:rgba(0,0,0,0.25); border:1px solid var(--border); color:white; border-radius:4px;">
                            <option value="auto" ${configObj.resolution === 'auto' ? 'selected' : ''}>Otomatis (Sesuai EDID Layar TV/Monitor)</option>
                            <option value="1080p" ${configObj.resolution === '1080p' ? 'selected' : ''}>1080p Full HD (1920x1080)</option>
                            <option value="720p" ${configObj.resolution === '720p' ? 'selected' : ''}>720p HD (1280x720)</option>
                            <option value="4k" ${configObj.resolution === '4k' ? 'selected' : ''}>4K UHD (3840x2160)</option>
                        </select>
                    </div>

                    <div>
                        <label style="display:block; margin-bottom:0.4rem; font-weight:600; font-size:0.88rem; color:var(--text);">Rotasi Orientasi Layar:</label>
                        <select name="rotation" style="width:100%; padding:0.65rem; background:rgba(0,0,0,0.25); border:1px solid var(--border); color:white; border-radius:4px;">
                            <option value="0" ${String(configObj.rotation) === '0' ? 'selected' : ''}>0° (Normal Horizontal Landscape)</option>
                            <option value="90" ${String(configObj.rotation) === '90' ? 'selected' : ''}>90° (Vertical Signage Kanan)</option>
                            <option value="180" ${String(configObj.rotation) === '180' ? 'selected' : ''}>180° (Terbalik Inverted)</option>
                            <option value="270" ${String(configObj.rotation) === '270' ? 'selected' : ''}>270° (Vertical Signage Kiri)</option>
                        </select>
                    </div>
                </div>

                <div style="background:rgba(0,0,0,0.15); padding:1rem; border-radius:6px; border:1px solid var(--border); margin-bottom:1.25rem;">
                    <strong style="display:block; margin-bottom:0.75rem; font-size:0.88rem; color:var(--text);">Pengaturan Sistem & Penghemat Daya:</strong>
                    <div style="display:flex; flex-direction:column; gap:0.6rem;">
                        <label style="display:flex; align-items:center; gap:0.6rem; cursor:pointer; font-size:0.88rem;">
                            <input type="checkbox" name="auto_start" value="true" ${configObj.auto_start ? 'checked' : ''} style="width:16px; height:16px; accent-color:#3b82f6;">
                            <span>Otomatis nyalakan tampilan HDMI saat STB Boot jika kabel terdeteksi</span>
                        </label>
                        <label style="display:flex; align-items:center; gap:0.6rem; cursor:pointer; font-size:0.88rem;">
                            <input type="checkbox" name="auto_restart_crash" value="true" ${configObj.auto_restart_crash !== false ? 'checked' : ''} style="width:16px; height:16px; accent-color:#3b82f6;">
                            <span>Auto-restart tampilan peramban Kiosk jika sesi grafis crash / tertutup</span>
                        </label>
                    </div>
                </div>

                <div>
                    <label style="display:block; margin-bottom:0.4rem; font-weight:600; font-size:0.88rem; color:var(--text);">URL Tampilan Lokal (Default Port NVR):</label>
                    <input type="text" name="display_url" value="${configObj.display_url || 'http://localhost:3000'}" style="width:100%; padding:0.65rem; background:rgba(0,0,0,0.25); border:1px solid var(--border); color:white; border-radius:4px; font-family:monospace; font-size:0.85rem;">
                </div>
            </form>
        `;
        return;
    }

    // --- 3. FORMAT GENERIK (Untuk Addon Kustom Lainnya) ---
    if (!configObj || Object.keys(configObj).length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem;">Addon ini siap beroperasi secara default dan tidak memerlukan parameter konfigurasi tambahan.</p>';
        return;
    }

    let html = '<form id="addonConfigForm">';
    for (let key in configObj) {
        const val = configObj[key];
        const type = typeof val;
        const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        html += `<div style="margin-bottom:1.2rem;">
            <label style="display:block; margin-bottom:0.4rem; color:var(--text); font-size:0.88rem; font-weight:600;">${displayKey}</label>`;

        if (type === 'boolean') {
            html += `<select name="${key}" style="width:100%; padding:0.65rem; background:rgba(0,0,0,0.25); border:1px solid var(--border); color:white; border-radius:4px;">
                <option value="true" ${val ? 'selected' : ''}>Aktif (True)</option>
                <option value="false" ${!val ? 'selected' : ''}>Mati (False)</option>
            </select>`;
        } else if (type === 'number') {
            html += `<input type="number" name="${key}" value="${val}" style="width:100%; padding:0.65rem; background:rgba(0,0,0,0.25); border:1px solid var(--border); color:white; border-radius:4px;">`;
        } else {
            html += `<input type="text" name="${key}" value="${val}" style="width:100%; padding:0.65rem; background:rgba(0,0,0,0.25); border:1px solid var(--border); color:white; border-radius:4px;">`;
        }
        html += `</div>`;
    }
    html += '</form>';
    container.innerHTML = html;
}

function toggleKioskCamSelector(val) {
    const box = document.getElementById('kioskSingleCamBox');
    if (box) box.style.display = (val === 'single_cam') ? 'block' : 'none';
}

async function testAIYoloAlarm() {
    const camSelect = document.getElementById('addon_cfg_cam_id');
    const camId = camSelect ? camSelect.value : '';
    const camName = camSelect && camSelect.selectedIndex >= 0 ? camSelect.options[camSelect.selectedIndex].text : 'Kamera 1';
    
    try {
        const res = await authFetch('/api/addons/ai_yolo/test', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ camera_id: camId, camera_name: camName })
        });
        const data = await res.json();
        if (res.ok) {
            // Mainkan suara chime buzzer jika audio context tersedia
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(880, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.3);
            } catch (_) {}
            
            alert(data.message || 'Alarm simulasi deteksi manusia berhasil dipicu!');
        } else {
            alert('Gagal uji alarm: ' + (data.error || 'Terjadi kesalahan'));
        }
    } catch (e) {
        alert('Gagal menghubungi server untuk memicu alarm uji.');
    }
}

async function restartAIYoloService() {
    try {
        const res = await authFetch('/api/addons/ai_yolo/restart', { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            alert(data.message || 'AI YOLO Service berhasil direstart!');
            openAddonConfig(currentConfigAddonId, document.getElementById('addonConfigTitle').textContent);
        } else {
            alert('Gagal restart: ' + (data.error || 'Terjadi kesalahan'));
        }
    } catch (e) {
        alert('Gagal menghubungi server untuk restart service.');
    }
}

async function toggleHdmiKioskOutput(action) {
    try {
        const res = await authFetch('/api/addons/hdmi-kiosk/toggle', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: action })
        });
        const data = await res.json();
        if (res.ok) {
            alert(`Aksi ${action} pada tampilan HDMI berhasil dikirim ke systemd service.`);
            openAddonConfig('hdmi-kiosk', 'HDMI Monitor & Armbian Kiosk');
        } else {
            alert('Gagal mengatur tampilan HDMI: ' + (data.error || 'Terjadi kesalahan'));
        }
    } catch (e) {
        alert('Gagal menghubungi server.');
    }
}

async function refreshHdmiKioskStatus() {
    openAddonConfig('hdmi-kiosk', 'HDMI Monitor & Armbian Kiosk');
}

async function saveAddonConfig() {
    if (!currentConfigAddonId) return;
    const form = document.getElementById('addonConfigForm');
    if (!form) return closeAddonConfigModal();

    const formData = new FormData(form);
    const newConfig = {};

    // First collect all elements to handle unchecked checkboxes properly
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        const name = input.name;
        if (!name) return;

        if (input.type === 'checkbox') {
            newConfig[name] = input.checked;
        } else if (input.type === 'number' || input.type === 'range') {
            newConfig[name] = input.value === '' ? 0 : Number(input.value);
        } else if (input.value === 'true') {
            newConfig[name] = true;
        } else if (input.value === 'false') {
            newConfig[name] = false;
        } else {
            newConfig[name] = input.value;
        }
    });

    try {
        const res = await authFetch('/api/addons/' + currentConfigAddonId + '/config', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ config: newConfig })
        });
        const data = await res.json();
        if (res.ok) {
            alert('Konfigurasi berhasil disimpan dan langsung diterapkan ke addon!');
            closeAddonConfigModal();
            fetchInstalledAddons();
        } else {
            alert('Gagal menyimpan konfigurasi: ' + (data.error || 'Terjadi kesalahan'));
        }
    } catch (e) {
        alert('Gagal menghubungi server untuk menyimpan konfigurasi: ' + (e.message || e));
    }
}

function closeAddonConfigModal() {
    const modal = document.getElementById('addonConfigModalOverlay');
    if (modal) modal.style.display = 'none';
}

async function submitInstallAddon() {
    const url = document.getElementById('addon-url-input').value.trim();
    if (!url) {
        alert('Harap masukkan URL atau repository GitHub.');
        return;
    }
    
    const btn = document.querySelector('#installAddonModalOverlay .btn-primary');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '⏳ Sedang Menginstal...';
    btn.disabled = true;
    
    try {
        const response = await authFetch('/api/addons/install', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url })
        });
        
        const data = await response.json();
        if (response.ok) {
            alert('Addon berhasil diinstal!\nLog: ' + (data.message || 'Selesai'));
            closeInstallAddonModal();
            fetchInstalledAddons();
        } else {
            alert('Gagal menginstal addon: ' + (data.error || 'Terjadi kesalahan server'));
        }
    } catch (e) {
        alert('Gagal menghubungi server untuk proses instalasi addon.');
    } finally {
        btn.innerHTML = oldHtml;
        btn.disabled = false;
    }
}

// Attach all addon methods to window for inline onclick accessibility
window.fetchInstalledAddons = fetchInstalledAddons;
window.toggleAddonState = toggleAddonState;
window.deleteAddon = deleteAddon;
window.openInstallAddonModal = openInstallAddonModal;
window.closeInstallAddonModal = closeInstallAddonModal;
window.openAddonConfig = openAddonConfig;
window.renderAddonConfigForm = renderAddonConfigForm;
window.saveAddonConfig = saveAddonConfig;
window.closeAddonConfigModal = closeAddonConfigModal;
window.submitInstallAddon = submitInstallAddon;


