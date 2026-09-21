// script.js - Archer NVR Ver. 10.1.7 Multi-Tenant Controller & Multi-Zone Vision Engine

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
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-peek-pwd');
            if (!btn) return;
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

        window.navigateToView = function(targetId) {
            navItems.forEach(n => {
                if (n.getAttribute('data-target') === targetId) {
                    n.classList.add('active');
                } else {
                    n.classList.remove('active');
                }
            });
            viewPanes.forEach(v => {
                if (v.id === targetId) {
                    v.classList.add('active');
                } else {
                    v.classList.remove('active');
                }
            });

            // Close mobile sidebar if open
            if (sidebar) sidebar.classList.remove('mobile-open');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');

            if (targetId === 'view-yolo-ai') {
                if (typeof openYoloAiPage === 'function') {
                    openYoloAiPage();
                }
            } else if (targetId === 'view-about') {
                if (typeof fetchAboutInfo === 'function') fetchAboutInfo();
            } else if (targetId === 'view-addons') {
                if (typeof fetchInstalledAddons === 'function') fetchInstalledAddons();
            } else if (targetId === 'view-logs') {
                if (typeof fetchLogs === 'function') fetchLogs();
            } else if (targetId === 'view-setting-users') {
                if (typeof loadUsersList === 'function') loadUsersList();
            } else if (targetId === 'view-setting-record') {
                if (typeof loadStorageDevices === 'function') loadStorageDevices();
            } else if (targetId === 'view-playback') {
                if (typeof fetchRecordings === 'function') fetchRecordings();
            }
        };

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = item.getAttribute('data-target');
                window.navigateToView(targetId);
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
        const ipEl = document.getElementById('camIpAddress');
        const userEl = document.getElementById('camUsername');
        const passEl = document.getElementById('camPassword');
        const rtspPortEl = document.getElementById('camRtspPort');

        if (!mainUrl) return;
        const creds = extractRtspCredentials(mainUrl);

        if (force || (ptzUrlEl && !ptzUrlEl.value)) {
            if (creds.host && ptzUrlEl) ptzUrlEl.value = creds.host;
        }
        if (force || (ptzUserEl && !ptzUserEl.value)) {
            if (creds.user && ptzUserEl) ptzUserEl.value = creds.user;
        }
        if (force || (ptzPassEl && !ptzPassEl.value)) {
            if (creds.pass && ptzPassEl) ptzPassEl.value = creds.pass;
        }
        if (creds.host && ipEl && (force || !ipEl.value)) {
            ipEl.value = creds.host;
        }
        if (creds.user && userEl && (force || !userEl.value)) {
            userEl.value = creds.user;
        }
        if (creds.pass && passEl && (force || !passEl.value)) {
            passEl.value = creds.pass;
        }
        if (creds.port && rtspPortEl && (force || !rtspPortEl.value)) {
            rtspPortEl.value = creds.port;
        }
        if (force && ptzSelectEl && ptzSelectEl.value === 'no') {
            ptzSelectEl.value = 'yes';
        }
    }

    // Auto-probe logic from General tab (btnQuickProbe) or PTZ tab (btnTestOnvifProbe)
    async function runOnvifProbeTest(callerType = 'general') {
        const ipAddress = document.getElementById('camIpAddress') ? document.getElementById('camIpAddress').value.trim() : '';
        const onvifPort = document.getElementById('camOnvifPort') ? document.getElementById('camOnvifPort').value.trim() : '';
        const rtspPort = document.getElementById('camRtspPort') ? document.getElementById('camRtspPort').value.trim() : '';
        const username = document.getElementById('camUsername') ? document.getElementById('camUsername').value.trim() : '';
        const password = document.getElementById('camPassword') ? document.getElementById('camPassword').value : '';
        const ptzUrl = document.getElementById('camPtzUrl') ? document.getElementById('camPtzUrl').value.trim() : '';
        const ptzUser = document.getElementById('camPtzUser') ? document.getElementById('camPtzUser').value.trim() : '';
        const ptzPass = document.getElementById('camPtzPass') ? document.getElementById('camPtzPass').value : '';
        const mainStreamUrl = document.getElementById('camMainUrl') ? document.getElementById('camMainUrl').value.trim() : '';
        
        const statusEl = callerType === 'general' ? document.getElementById('quickProbeStatus') : document.getElementById('ptzProbeStatus');
        const triggerBtn = callerType === 'general' ? document.getElementById('btnQuickProbe') : document.getElementById('btnTestOnvifProbe');

        if (!ipAddress && !ptzUrl && !mainStreamUrl) {
            if (statusEl) {
                statusEl.style.display = 'block';
                statusEl.innerHTML = '<span style="color:#ef4444;">⚠️ Masukkan IP Address Kamera atau RTSP URL terlebih dahulu</span>';
            }
            return;
        }

        if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.innerHTML = '<span style="color:#60a5fa;">⏳ Sedang melakukan Auto-Discovery ONVIF Probe...</span>';
        }
        if (triggerBtn) triggerBtn.disabled = true;

        try {
            const probePayload = {
                ipAddress: ipAddress || ptzUrl || '',
                onvifPort: onvifPort || undefined,
                rtspPort: rtspPort || undefined,
                username: username || ptzUser || '',
                password: password || ptzPass || '',
                ptzUrl: ptzUrl || ipAddress || '',
                ptzUser: ptzUser || username || '',
                ptzPass: ptzPass || password || '',
                mainStreamUrl: mainStreamUrl || ''
            };

            const res = await authFetch('/api/system/onvif-probe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(probePayload)
            });
            const data = await res.json();

            if (res.ok && data.success) {
                let detailHtml = `<div style="color:#22c55e; font-weight:600; margin-bottom:2px;">✅ ${data.message}</div>`;
                
                // 1. [Tab General] Auto-fill IP, Port, Username & Password
                if (data.host) {
                    const ipEl = document.getElementById('camIpAddress');
                    if (ipEl && !ipEl.value) ipEl.value = data.host;
                }
                if (data.onvifPort) {
                    const opEl = document.getElementById('camOnvifPort');
                    if (opEl) opEl.value = data.onvifPort;
                }
                const rpEl = document.getElementById('camRtspPort');
                if (rpEl && !rpEl.value) rpEl.value = '554';
                if (username) {
                    const uEl = document.getElementById('camUsername');
                    if (uEl && !uEl.value) uEl.value = username;
                }
                if (password) {
                    const pEl = document.getElementById('camPassword');
                    if (pEl && !pEl.value) pEl.value = password;
                }

                // 2. [Tab PTZ] Auto-fill PTZ Switch, Host, User, Pass & Token
                const ptzUrlEl = document.getElementById('camPtzUrl');
                if (ptzUrlEl && (!ptzUrlEl.value || ptzUrlEl.value === '')) {
                    ptzUrlEl.value = data.host || ipAddress;
                }
                const ptzUserEl = document.getElementById('camPtzUser');
                if (ptzUserEl && (!ptzUserEl.value || ptzUserEl.value === '')) {
                    ptzUserEl.value = username || ptzUser || 'admin';
                }
                const ptzPassEl = document.getElementById('camPtzPass');
                if (ptzPassEl && (!ptzPassEl.value || ptzPassEl.value === '')) {
                    ptzPassEl.value = password || ptzPass || '';
                }

                if (data.profileToken) {
                    const profEl = document.getElementById('camOnvifProfileToken');
                    if (profEl) profEl.value = data.profileToken;
                }
                if (data.protocol === 'v380_native') {
                    const ptzSelectEl = document.getElementById('camPtzSelect');
                    if (ptzSelectEl) ptzSelectEl.value = 'v380_native';
                } else if (data.hasPtz) {
                    const ptzSelectEl = document.getElementById('camPtzSelect');
                    if (ptzSelectEl && ptzSelectEl.value === 'no') ptzSelectEl.value = 'yes';
                }

                // 3. [Tab Streams] Auto-fill RTSP stream URLs & Audio
                const mainUrlEl = document.getElementById('camMainUrl');
                const subUrlEl = document.getElementById('camSubUrl');
                if (data.mainStreamUri && mainUrlEl && !mainUrlEl.value) {
                    mainUrlEl.value = data.mainStreamUri;
                }
                if (data.subStreamUri && subUrlEl && !subUrlEl.value) {
                    subUrlEl.value = data.subStreamUri;
                }
                if (data.hasAudio !== undefined) {
                    const audioEl = document.getElementById('camAudioEnabled');
                    if (audioEl) audioEl.checked = !!data.hasAudio;
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
                if (statusEl) statusEl.innerHTML = `<span style="color:#ef4444; font-weight:600;">❌ Gagal: ${data.error || 'Kamera tidak merespon handshake ONVIF'}</span>`;
            }
        } catch(e) {
            if (statusEl) statusEl.innerHTML = `<span style="color:#ef4444;">❌ Kesalahan: ${e.message}</span>`;
        } finally {
            if (triggerBtn) triggerBtn.disabled = false;
        }
    }

    // Auto extract saat input RTSP berubah
    const camMainUrlInput = document.getElementById('camMainUrl');
    if (camMainUrlInput) {
        camMainUrlInput.addEventListener('blur', () => {
            const currentEditingId = document.getElementById('camId') ? document.getElementById('camId').value : '';
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

    const btnQuickProbe = document.getElementById('btnQuickProbe');
    if (btnQuickProbe) {
        btnQuickProbe.addEventListener('click', () => runOnvifProbeTest('general'));
    }

    const btnTestOnvifProbe = document.getElementById('btnTestOnvifProbe');
    if (btnTestOnvifProbe) {
        btnTestOnvifProbe.addEventListener('click', () => runOnvifProbeTest('ptz'));
    }

    window.editCamera = function(id) {
        const cam = cameras.find(c => c.id === id);
        if (!cam) return;
        
        document.getElementById('camId').value = cam.id;
        document.getElementById('camName').value = cam.name;
        const camCustomIdEl = document.getElementById('camCustomId');
        if (camCustomIdEl) camCustomIdEl.value = cam.id;
        
        const ipEl = document.getElementById('camIpAddress');
        if (ipEl) ipEl.value = cam.ipAddress || '';
        const opEl = document.getElementById('camOnvifPort');
        if (opEl) opEl.value = cam.onvifPort || '';
        const rpEl = document.getElementById('camRtspPort');
        if (rpEl) rpEl.value = cam.rtspPort || '';
        const uEl = document.getElementById('camUsername');
        if (uEl) uEl.value = cam.ptzUser || '';
        const pEl = document.getElementById('camPassword');
        if (pEl) pEl.value = cam.ptzPass || '';

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

        const camOnvifProfEl = document.getElementById('camOnvifProfileToken');
        if (camOnvifProfEl) camOnvifProfEl.value = cam.onvifProfileToken || '';

        const camAudioEnabledEl = document.getElementById('camAudioEnabled');
        if (camAudioEnabledEl) camAudioEnabledEl.checked = cam.audioEnabled !== false;

        const camAudioCodecEl = document.getElementById('camAudioCodec');
        if (camAudioCodecEl) camAudioCodecEl.value = cam.audioCodec || 'aac';

        const statusEl = document.getElementById('ptzProbeStatus');
        if (statusEl) statusEl.innerHTML = '';
        const qStatusEl = document.getElementById('quickProbeStatus');
        if (qStatusEl) { qStatusEl.style.display = 'none'; qStatusEl.innerHTML = ''; }

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
        
        // Kembalikan form ke tab utama (General) secara default saat buka edit
        if (typeof switchCameraTab === 'function') {
            switchCameraTab('ctab-general');
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
        
        const ipEl = document.getElementById('camIpAddress');
        if (ipEl) ipEl.value = '';
        const opEl = document.getElementById('camOnvifPort');
        if (opEl) opEl.value = '';
        const rpEl = document.getElementById('camRtspPort');
        if (rpEl) rpEl.value = '';
        const uEl = document.getElementById('camUsername');
        if (uEl) uEl.value = '';
        const pEl = document.getElementById('camPassword');
        if (pEl) pEl.value = '';

        const ptzSelect = document.getElementById('camPtzSelect');
        if (ptzSelect) ptzSelect.value = 'no';
        const ptzUrl = document.getElementById('camPtzUrl');
        if (ptzUrl) ptzUrl.value = '';
        const ptzUser = document.getElementById('camPtzUser');
        if (ptzUser) ptzUser.value = '';
        const ptzPass = document.getElementById('camPtzPass');
        if (ptzPass) ptzPass.value = '';
        const camOnvifProfEl = document.getElementById('camOnvifProfileToken');
        if (camOnvifProfEl) camOnvifProfEl.value = '';
        const camAudioEnabledEl = document.getElementById('camAudioEnabled');
        if (camAudioEnabledEl) camAudioEnabledEl.checked = true;
        const camAudioCodecEl = document.getElementById('camAudioCodec');
        if (camAudioCodecEl) camAudioCodecEl.value = 'aac';
        const statusEl = document.getElementById('ptzProbeStatus');
        if (statusEl) statusEl.innerHTML = '';
        const qStatusEl = document.getElementById('quickProbeStatus');
        if (qStatusEl) { qStatusEl.style.display = 'none'; qStatusEl.innerHTML = ''; }

        if (typeof switchCameraTab === 'function') {
            switchCameraTab('ctab-general');
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

    /* cameraForm submit */
    if (cameraForm) {
        cameraForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('camId').value;
            const ptzSelect = document.getElementById('camPtzSelect');
            const ptzVal = ptzSelect ? ptzSelect.value : 'no';
            const isPtz = ptzVal === 'yes' || ptzVal === 'v380_native';
            const ptzProtocol = ptzVal === 'v380_native' ? 'v380_native' : (isPtz ? 'onvif' : 'none');

            const ipAddress = document.getElementById('camIpAddress') ? document.getElementById('camIpAddress').value.trim() : '';
            const onvifPort = document.getElementById('camOnvifPort') ? document.getElementById('camOnvifPort').value.trim() : '';
            const rtspPort = document.getElementById('camRtspPort') ? document.getElementById('camRtspPort').value.trim() : '';
            const username = document.getElementById('camUsername') ? document.getElementById('camUsername').value.trim() : '';
            const password = document.getElementById('camPassword') ? document.getElementById('camPassword').value : '';

            const payload = {
                id: document.getElementById('camCustomId') ? document.getElementById('camCustomId').value.trim() : undefined,
                name: document.getElementById('camName').value,
                cameraName: document.getElementById('camName').value,
                ipAddress: ipAddress,
                onvifPort: onvifPort ? parseInt(onvifPort, 10) : undefined,
                rtspPort: rtspPort ? parseInt(rtspPort, 10) : undefined,
                username: username,
                password: password,
                ptzEnabled: isPtz,
                hasPtz: isPtz,
                ptzProtocol: ptzProtocol,
                ptzUrl: document.getElementById('camPtzUrl') ? document.getElementById('camPtzUrl').value.trim() : (ipAddress ? `${ipAddress}${onvifPort ? `:${onvifPort}` : ''}` : ''),
                ptzUser: document.getElementById('camPtzUser') ? document.getElementById('camPtzUser').value.trim() : username,
                ptzPass: document.getElementById('camPtzPass') ? document.getElementById('camPtzPass').value : password,
                onvifProfileToken: document.getElementById('camOnvifProfileToken') ? document.getElementById('camOnvifProfileToken').value.trim() : '',
                profileToken: document.getElementById('camOnvifProfileToken') ? document.getElementById('camOnvifProfileToken').value.trim() : '',
                audioEnabled: document.getElementById('camAudioEnabled') ? document.getElementById('camAudioEnabled').checked : true,
                hasAudio: document.getElementById('camAudioEnabled') ? document.getElementById('camAudioEnabled').checked : true,
                audioCodec: document.getElementById('camAudioCodec') ? document.getElementById('camAudioCodec').value : 'aac',
                mainStreamUrl: document.getElementById('camMainUrl').value,
                mainStreamUri: document.getElementById('camMainUrl').value,
                subStreamUrl: document.getElementById('camSubUrl').value,
                subStreamUri: document.getElementById('camSubUrl').value,
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
                
                resetCameraForm();
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

    // --- Advanced IP Network Scanner Handler ---
    const btnStartIpScan = document.getElementById('btnStartIpScan');
    const ipScanStatus = document.getElementById('ipScanStatus');
    const ipScanResultsTable = document.getElementById('ipScanResultsTable');

    if (btnStartIpScan) {
        btnStartIpScan.addEventListener('click', async () => {
            const startIp = document.getElementById('ipScanStart') ? document.getElementById('ipScanStart').value.trim() : '192.168.1.1';
            const endIp = document.getElementById('ipScanEnd') ? document.getElementById('ipScanEnd').value.trim() : '192.168.1.254';
            const portsStr = document.getElementById('ipScanPorts') ? document.getElementById('ipScanPorts').value.trim() : '80, 8080, 8899, 554, 8800';

            btnStartIpScan.disabled = true;
            if (ipScanStatus) {
                ipScanStatus.style.display = 'block';
                ipScanStatus.innerHTML = '<span style="color:#60a5fa;">⏳ Sedang memindai jaringan lokal (Scanning port ONVIF & RTSP)...</span>';
            }
            if (ipScanResultsTable) {
                ipScanResultsTable.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:15px; color:#94a3b8;">Sedang memindai rentang IP...</td></tr>';
            }

            try {
                const portsArr = portsStr.split(',').map(p => parseInt(p.trim(), 10)).filter(p => !isNaN(p));
                const res = await authFetch('/api/system/scan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ startIp, endIp, ports: portsArr })
                });

                const data = await res.json();
                if (res.ok && data.success) {
                    if (ipScanStatus) {
                        ipScanStatus.innerHTML = `<span style="color:#22c55e; font-weight:600;">✅ Pemindaian selesai: Terdeteksi ${data.discoveredCount} perangkat dari total ${data.totalScanned} IP.</span>`;
                    }

                    if (!data.devices || data.devices.length === 0) {
                        if (ipScanResultsTable) {
                            ipScanResultsTable.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:15px; color:#94a3b8;">Tidak ada kamera atau perangkat dengan port terbuka yang ditemukan pada rentang ini.</td></tr>';
                        }
                    } else {
                        let rowsHtml = '';
                        data.devices.forEach((dev) => {
                            const openPortBadges = dev.openPorts.map(p => `<span style="background:rgba(59,130,246,0.18); color:#93c5fd; padding:1px 5px; border-radius:3px; font-family:monospace; font-size:0.75rem; border:1px solid rgba(59,130,246,0.3);">${p}</span>`).join(' ');
                            
                            rowsHtml += `
                                <tr style="border-bottom:1px solid #334155;">
                                    <td style="padding:8px 10px; font-weight:600; color:#f8fafc; font-family:monospace;">${dev.ip}</td>
                                    <td style="padding:8px 10px; color:#cbd5e1;">${dev.deviceType || 'Network Device'}</td>
                                    <td style="padding:8px 10px;">${openPortBadges}</td>
                                    <td style="padding:8px 10px; text-align:right;">
                                        <button type="button" class="btn-scan-use" data-ip="${dev.ip}" data-onvif="${dev.onvifPort || ''}" data-rtsp="${dev.rtspPort || '554'}" data-mainurl="${dev.suggestedMainUrl || ''}" data-suburl="${dev.suggestedSubUrl || ''}" style="background:#2563eb; color:#fff; border:none; padding:4px 10px; border-radius:4px; font-size:0.75rem; cursor:pointer; font-weight:600;">
                                            ➕ Terapkan ke Form
                                        </button>
                                    </td>
                                </tr>
                            `;
                        });

                        if (ipScanResultsTable) {
                            ipScanResultsTable.innerHTML = rowsHtml;

                            // Pasang handler tombol "Terapkan ke Form"
                            ipScanResultsTable.querySelectorAll('.btn-scan-use').forEach(btn => {
                                btn.addEventListener('click', () => {
                                    const ip = btn.getAttribute('data-ip');
                                    const onvifPort = btn.getAttribute('data-onvif');
                                    const rtspPort = btn.getAttribute('data-rtsp');
                                    const mainUrl = btn.getAttribute('data-mainurl');
                                    const subUrl = btn.getAttribute('data-suburl');

                                    // Tab General
                                    const ipEl = document.getElementById('camIpAddress');
                                    if (ipEl) ipEl.value = ip;
                                    const opEl = document.getElementById('camOnvifPort');
                                    if (opEl && onvifPort) opEl.value = onvifPort;
                                    const rpEl = document.getElementById('camRtspPort');
                                    if (rpEl && rtspPort) rpEl.value = rtspPort;

                                    // Tab PTZ
                                    const ptzUrlEl = document.getElementById('camPtzUrl');
                                    if (ptzUrlEl) ptzUrlEl.value = ip;
                                    const ptzSelectEl = document.getElementById('camPtzSelect');
                                    if (ptzSelectEl && onvifPort) {
                                        if (onvifPort === '8800') ptzSelectEl.value = 'v380_native';
                                        else if (ptzSelectEl.value === 'no') ptzSelectEl.value = 'yes';
                                    }

                                    // Tab Streams
                                    const mainUrlEl = document.getElementById('camMainUrl');
                                    if (mainUrlEl && mainUrl && !mainUrlEl.value) mainUrlEl.value = mainUrl;
                                    const subUrlEl = document.getElementById('camSubUrl');
                                    if (subUrlEl && subUrl && !subUrlEl.value) subUrlEl.value = subUrl;

                                    // Auto probe untuk mendeteksi profil lebih detail
                                    if (typeof runOnvifProbeTest === 'function') {
                                        runOnvifProbeTest('general');
                                    }

                                    const cForm = document.getElementById('cameraForm');
                                    if (cForm) cForm.scrollIntoView({ behavior: 'smooth' });
                                });
                            });
                        }
                    }
                } else {
                    if (ipScanStatus) {
                        ipScanStatus.innerHTML = `<span style="color:#ef4444; font-weight:600;">❌ Pemindaian gagal: ${data.error || 'Terjadi kesalahan sistem'}</span>`;
                    }
                }
            } catch (err) {
                if (ipScanStatus) {
                    ipScanStatus.innerHTML = `<span style="color:#ef4444; font-weight:600;">❌ Terjadi kesalahan: ${err.message}</span>`;
                }
            } finally {
                btnStartIpScan.disabled = false;
            }
        });
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
    window.activeHlsPlayers = activeHlsPlayers;

    function initHlsPlayer(elementId, hlsUrl, onReady, onError) {
        const video = (typeof elementId === 'string') ? document.getElementById(elementId) : elementId;
        if (!video) return null;

        const id = video.id || (typeof elementId === 'string' ? elementId : 'video_' + Math.random().toString(36).substr(2, 9));

        if (activeHlsPlayers[id]) {
            try { activeHlsPlayers[id].destroy(); } catch (e) {}
            delete activeHlsPlayers[id];
        }

        if (Hls.isSupported()) {
            const hls = new Hls({
                lowLatencyMode: true,
                maxBufferLength: 4,
                maxMaxBufferLength: 6,
                maxBufferSize: 10 * 1024 * 1024, // 10 MB per player
                backBufferLength: 0,
                enableWorker: true
            });
            activeHlsPlayers[id] = hls;
            hls.loadSource(hlsUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, function() {
                video.play().then(() => {
                    if (typeof onReady === 'function') onReady(hls);
                }).catch(e => {
                    console.log('Autoplay prevented:', e);
                    if (typeof onReady === 'function') onReady(hls);
                });
            });
            hls.on(Hls.Events.ERROR, function(event, data) {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            if (typeof onError === 'function') onError(data);
                            setTimeout(() => {
                                if (activeHlsPlayers[id]) {
                                    activeHlsPlayers[id].loadSource(hlsUrl);
                                    activeHlsPlayers[id].startLoad();
                                }
                            }, 3000);
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            hls.recoverMediaError();
                            break;
                        default:
                            if (typeof onError === 'function') onError(data);
                            hls.destroy();
                            break;
                    }
                }
            });
            return hls;
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = hlsUrl;
            video.addEventListener('loadedmetadata', function() {
                video.play().then(() => {
                    if (typeof onReady === 'function') onReady(null);
                }).catch(e => console.log('Autoplay prevented:', e));
            });
            return null;
        }
        return null;
    }
    window.initHlsPlayer = initHlsPlayer;

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
                    
                    // Dual Stream Auto Switch: SD for multi-grid if distinct subStream exists, HD for single-view
                    const hasDistinctSub = Boolean(cam.subStreamUrl && cam.subStreamUrl.trim() !== '' && cam.subStreamUrl.trim() !== (cam.mainStreamUrl || '').trim());
                    const userQuality = window.camStreamQualities && window.camStreamQualities[cam.id];
                    const defaultQuality = (count > 1 && hasDistinctSub) ? 'SD' : 'HD';
                    const curQuality = userQuality || defaultQuality;
                    let hlsUrl = '';
                    if (curQuality === 'SD' && hasDistinctSub) {
                        if (cam.subStreamUrl && cam.subStreamUrl.startsWith('http')) {
                            hlsUrl = cam.subStreamUrl;
                        } else {
                            const subPath = cam.mediaMtxSubPath || ((cam.mediaMtxPath || cam.id) + '_sub');
                            hlsUrl = '/stream/' + subPath + '/index.m3u8?token=' + encodeURIComponent(getAuthToken());
                        }
                    } else {
                        const mainPath = cam.mediaMtxPath || cam.id;
                        hlsUrl = cam.mainStreamUrl && cam.mainStreamUrl.startsWith('http') ? cam.mainStreamUrl : ('/stream/' + mainPath + '/index.m3u8?token=' + encodeURIComponent(getAuthToken()));
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
                    
                    const hasDistinctSub = Boolean(cam.subStreamUrl && cam.subStreamUrl.trim() !== '' && cam.subStreamUrl.trim() !== (cam.mainStreamUrl || '').trim());
                    const userQuality = window.camStreamQualities && window.camStreamQualities[cam.id];
                    const defaultQuality = (count > 1 && hasDistinctSub) ? 'SD' : 'HD';
                    const curQuality = userQuality || defaultQuality;
                    let hlsUrl = '';
                    if (curQuality === 'SD' && hasDistinctSub) {
                        if (cam.subStreamUrl && cam.subStreamUrl.startsWith('http')) {
                            hlsUrl = cam.subStreamUrl;
                        } else {
                            const subPath = cam.mediaMtxSubPath || ((cam.mediaMtxPath || cam.id) + '_sub');
                            hlsUrl = '/stream/' + subPath + '/index.m3u8?token=' + encodeURIComponent(getAuthToken());
                        }
                    } else {
                        const mainPath = cam.mediaMtxPath || cam.id;
                        hlsUrl = cam.mainStreamUrl && cam.mainStreamUrl.startsWith('http') ? cam.mainStreamUrl : ('/stream/' + mainPath + '/index.m3u8?token=' + encodeURIComponent(getAuthToken()));
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
// ============================================================================
// ARCH3R NVR - AI VISION DETECTION, RTSP VIDEO, TEXT TELEMETRY & PROMPT RULES (Ver. 10.0.0)
// ============================================================================
let aiDrawCanvas = null;
let aiDrawCtx = null;
let isAIDrawing = false;
let aiGridRect = { x: 0, y: 0, w: 0, h: 0, label: 'Area Deteksi Utama', color: '#3b82f6', themeColor: 'rgba(59,130,246,0.92)' };
let aiDragStart = { x: 0, y: 0 };
let aiCurrentCam = null;
let aiSimActive = false; // Live tab MUST be pure surveillance video without simulated cartoons
let aiAnimFrameId = null;
let aiTelemetryAutoScroll = true;
let aiLastTelemetryTick = 0;
let aiDwellTimer = 0;
let aiPromptConditionMet = false;
let aiActiveZoneColor = '#3b82f6';
let aiActiveZoneThemeColor = 'rgba(59,130,246,0.92)';
let aiCustomStreamActive = false;

// Zoom, Pan & Collapsible HUD State for AI Vision Fullscreen Mode
let aiZoomScale = 1.0;
let aiPanX = 0;
let aiPanY = 0;
let aiInteractionMode = 'draw'; // 'draw' or 'pan'
let isAIPanning = false;
let aiPanStart = { x: 0, y: 0 };
let isSpacePressed = false;
let isAIHudCollapsed = false;
let aiTouchPinchStartDist = 0;
let aiTouchStartScale = 1.0;

// Multi-Zone & Fullscreen Editor State
let aiZones = [
    {
        id: 'zone_1',
        label: '⛽ Area Pompa BBM',
        color: '#3b82f6',
        themeColor: 'rgba(59,130,246,0.92)',
        x: 0, y: 0, w: 0, h: 0,
        targets: ['car', 'motorcycle', 'person']
    }
];
let aiActiveZoneIndex = 0;
let isAIFullscreen = false;

// Tab switcher for AI Vision Studio Modal
function switchAIGridTab(tabName) {
    const tabs = ['live', 'sim', 'market'];
    tabs.forEach(t => {
        const pane = document.getElementById(`ai-tab-pane-${t}`);
        const btn = document.getElementById(`ai-tab-btn-${t}`);
        if (pane) pane.style.display = (t === tabName) ? 'block' : 'none';
        if (btn) {
            if (t === tabName) {
                btn.style.color = (t === 'market') ? '#f59e0b' : ((t === 'sim') ? '#60a5fa' : '#38bdf8');
                btn.style.borderBottomColor = (t === 'market') ? '#f59e0b' : ((t === 'sim') ? '#60a5fa' : '#38bdf8');
                btn.style.background = 'rgba(255,255,255,0.04)';
            } else {
                btn.style.color = 'var(--text-muted, #94a3b8)';
                btn.style.borderBottomColor = 'transparent';
                btn.style.background = 'none';
            }
        }
    });

    if (tabName === 'sim') {
        initSimSandbox();
    } else if (tabName === 'market') {
        fetchMarketplacePresets();
    } else if (tabName === 'live') {
        setTimeout(() => {
            initAIDrawCanvas();
            loadCamStreamForAI();
        }, 30);
    }
}
window.switchAIGridTab = switchAIGridTab;

// Sub-tab switcher for Live Studio settings (zones, prompt, esp, telemetry)
function switchAISubTab(subTabName) {
    const subTabs = ['zones', 'prompt', 'esp', 'telemetry'];
    subTabs.forEach(tab => {
        const pane = document.getElementById(`ai-subtab-pane-${tab}`);
        const btn = document.getElementById(`ai-subtab-btn-${tab}`);
        if (pane) {
            pane.style.display = (tab === subTabName) ? 'block' : 'none';
        }
        if (btn) {
            if (tab === subTabName) {
                btn.style.color = '#38bdf8';
                btn.style.borderBottomColor = '#38bdf8';
                btn.style.background = 'rgba(56,189,248,0.08)';
            } else {
                btn.style.color = 'var(--text-muted, #94a3b8)';
                btn.style.borderBottomColor = 'transparent';
                btn.style.background = 'transparent';
            }
        }
    });
}
window.switchAISubTab = switchAISubTab;

// Simulated SPBU targets (Motorcyclist & Person Refueling)
let aiSimState = {
    phase: 'approaching', // 'approaching', 'refueling', 'leaving'
    phaseTimer: 0,
    vehicle: { type: 'motorcycle', label: '🛵 Sepeda Motor', x: 40, y: 220, vx: 2.2, vy: 0, w: 90, h: 60, stationary: false, conf: 0.94 },
    person: { type: 'person', label: '👤 Pengendara/Pelanggan', x: 75, y: 195, vx: 2.2, vy: 0, w: 45, h: 95, stationary: false, conf: 0.96 },
    pump: { x: 0.52, y: 0.38, w: 0.12, h: 0.35 } // relative coordinates
};

async function openYoloAiPage(defaultCamId = null) {
    if (typeof window.navigateToView === 'function') {
        window.navigateToView('view-yolo-ai');
    } else {
        const targetPane = document.getElementById('view-yolo-ai');
        if (targetPane) {
            document.querySelectorAll('.view-pane').forEach(v => v.classList.remove('active'));
            targetPane.classList.add('active');
        }
    }
    
    // Switch to live tab by default when opened
    switchAIGridTab('live');
    
    // Ensure cameras list is fetched and available
    let camList = window.cameras || (typeof cameras !== 'undefined' ? cameras : []);
    if ((!camList || camList.length === 0) && (typeof window.fetchCameras === 'function' || typeof fetchCameras === 'function')) {
        const fetcher = window.fetchCameras || fetchCameras;
        try { 
            await fetcher(); 
            camList = window.cameras || (typeof cameras !== 'undefined' ? cameras : []);
        } catch (e) {}
    }
    
    // Filter real cameras only from NVR database (no virtual_test in live feed list)
    const activeCams = (camList || []).filter(c => c && c.id && c.id !== 'virtual_test');
    
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
            if (defaultCamId) {
                const hasOpt = Array.from(select.options).some(o => o.value === defaultCamId);
                if (hasOpt) {
                    select.value = defaultCamId;
                } else {
                    select.selectedIndex = 0;
                }
            } else {
                select.selectedIndex = 0;
            }
        } else {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = '-- Tidak Ada Kamera Terhubung di NVR --';
            opt.disabled = true;
            opt.selected = true;
            select.appendChild(opt);
        }
        
        const group = document.getElementById('aiCamSelectGroup') || select.parentElement;
        if (group) group.style.display = 'block';
        select.style.display = 'block';

        select.onchange = () => {
            loadCamStreamForAI();
        };
    }
    
    const feedback = document.getElementById('ai-save-feedback');
    if (feedback) feedback.textContent = '';
    
    const container = document.getElementById('ai-canvas-container');
    if (container) container.style.display = 'flex';
    
    // Clear & seed initial telemetry log
    clearAITelemetryLog();
    appendAITelemetry('🚀 Inisialisasi Detektor Visi AI & RTSP Stream Engine Ver. 10.0.3...', 'system');
    appendAITelemetry('📋 Memuat konfigurasi kamera nyata NVR & Engine Prompt SPBU.', 'system');
    
    // Start continuous rendering loop
    aiStartRenderLoop();
    
    // Load feed and initialize canvas immediately
    setTimeout(() => {
        loadCamStreamForAI();
    }, 40);
}

window.openYoloAiPage = openYoloAiPage;
window.openAIGridModal = openYoloAiPage;
function openAIGridModal(defaultCamId = null) {
    return openYoloAiPage(defaultCamId);
}

function toggleCustomStreamBox() {
    const row = document.getElementById('ai-custom-stream-row');
    const btn = document.getElementById('btn-toggle-custom-stream');
    if (!row) return;
    if (row.style.display === 'none' || !row.style.display) {
        row.style.display = 'block';
        if (btn) btn.style.background = 'rgba(59,130,246,0.3)';
    } else {
        row.style.display = 'none';
        if (btn) btn.style.background = 'rgba(59,130,246,0.12)';
    }
}

function playCustomRTSPStream() {
    const inp = document.getElementById('ai-custom-rtsp-input');
    const url = inp ? inp.value.trim() : '';
    const video = document.getElementById('ai-stream-preview');
    const badge = document.getElementById('ai-grid-stream-badge');
    const metaBadge = document.getElementById('ai-video-meta-badge');
    
    if (!url) {
        alert('Masukkan URL stream RTSP, HLS (.m3u8), atau file video terlebih dahulu!');
        return;
    }
    
    appendAITelemetry(`🌐 Menghubungkan ke URL stream kustom: ${url}`, 'info');
    if (badge) {
        badge.innerHTML = `🌐 Menghubungkan Stream Kustom...`;
        badge.style.color = '#60a5fa';
    }
    
    // Clean up previous HLS instance
    const players = window.activeHlsPlayers || (typeof activeHlsPlayers !== 'undefined' ? activeHlsPlayers : null);
    if (players && players['ai-stream-preview']) {
        try { players['ai-stream-preview'].destroy(); } catch (e) {}
        delete players['ai-stream-preview'];
    }
    
    if (video) {
        video.pause();
        video.style.display = 'block';
        
        if (url.includes('.m3u8') && window.Hls && Hls.isSupported()) {
            const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
            hls.loadSource(url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.play().catch(() => {});
                if (badge) {
                    badge.innerHTML = '🟢 Live HLS Stream Aktif';
                    badge.style.color = '#34d399';
                }
                if (metaBadge) metaBadge.textContent = 'LIVE HLS • 25 FPS';
                appendAITelemetry('✅ Live HLS Stream berhasil diputar langsung di kotak video AI!', 'success');
            });
            if (players) players['ai-stream-preview'] = hls;
        } else {
            video.src = url;
            video.play().then(() => {
                if (badge) {
                    badge.innerHTML = '🟢 Live Video Feed Aktif';
                    badge.style.color = '#34d399';
                }
                if (metaBadge) metaBadge.textContent = 'DIRECT STREAM • 25 FPS';
                appendAITelemetry('✅ Direct Video Stream aktif di player!', 'success');
            }).catch(e => {
                console.warn('[Video Direct Play]', e);
                appendAITelemetry(`ℹ️ Stream RTSP terdaftar. Menggunakan underlay matrix & visual simulator.`, 'info');
            });
        }
    }
}

function loadDemoSPBUFeed() {
    const select = document.getElementById('ai-cam-select');
    if (select) select.value = 'virtual_test';
    
    applyAIPromptPreset('spbu_refuel');
    setAIGridPreset('spbu');
    
    aiSimActive = true;
    const btnSim = document.getElementById('btn-toggle-ai-sim');
    if (btnSim) {
        btnSim.innerHTML = '👁️ Simulasi Output: AKTIF';
        btnSim.style.background = 'rgba(16,185,129,0.15)';
        btnSim.style.color = '#34d399';
    }
    
    appendAITelemetry('⛽ Skenario Demo SPBU Dimuat: Kendaraan datang ke dispenser BBM.', 'system');
    loadCamStreamForAI();
}

async function loadCamStreamForAI() {
    const select = document.getElementById('ai-cam-select');
    const camId = select ? select.value : null;
    const container = document.getElementById('ai-canvas-container');
    const video = document.getElementById('ai-stream-preview');
    const badge = document.getElementById('ai-grid-stream-badge');
    const metaBadge = document.getElementById('ai-video-meta-badge');
    const noVideoOverlay = document.getElementById('ai-no-video-overlay');
    
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
        video.src = '';
    }

    // Filter real cameras from NVR database
    const activeCams = (window.cameras || (typeof cameras !== 'undefined' ? cameras : [])).filter(c => c && c.id && c.id !== 'virtual_test');
    let cam = (activeCams || []).find(c => String(c.id) === String(camId));
    
    if (!cam && activeCams.length > 0 && !camId) {
        cam = activeCams[0];
        if (select) select.value = cam.id;
    }

    // If no real camera available in NVR database
    if (!cam) {
        if (noVideoOverlay) noVideoOverlay.style.display = 'flex';
        if (video) video.style.display = 'none';
        if (badge) {
            badge.innerHTML = '🔴 Tidak Ada Video Kamera';
            badge.style.color = '#ef4444';
        }
        if (metaBadge) metaBadge.textContent = 'NO VIDEO SIGNAL';
        appendAITelemetry('⚠️ Tidak ada kamera terhubung di NVR. Menampilkan sinyal "NO VIDEO SIGNAL".', 'alarm');
        initAIDrawCanvas();
        return;
    }

    // Real camera is identified
    aiCurrentCam = cam;
    initAIDrawCanvas();
    appendAITelemetry(`📹 Target Kamera NVR: ${cam.name} (${cam.ip || 'Stream RTSP'})`, 'info');

    // Fetch saved persistent grid, prompt rules & ESP8266 settings from NVR database
    try {
        const fetchFn = (typeof authFetch === 'function') ? authFetch : (window.authFetch || fetch);
        const res = await fetchFn('/api/ai/grid/' + encodeURIComponent(cam.id));
        if (res.ok) {
            const data = await res.json();
            if (data.grid) {
                restoreAIGridFromData(data.grid);
            } else {
                setAIGridPreset('spbu');
            }
            
            // Populate ESP8266 settings
            const espCfg = data.esp_config || (cam.ai_config && cam.ai_config.esp_config);
            const chk = document.getElementById('esp-enabled-checkbox');
            const inp = document.getElementById('esp-target-input');
            const mtd = document.getElementById('esp-method-select');
            if (chk) chk.checked = !!(espCfg && espCfg.enabled);
            if (inp && espCfg && espCfg.ip_or_url) inp.value = espCfg.ip_or_url;
            if (mtd && espCfg && espCfg.method) mtd.value = espCfg.method || 'GET';
            
            // Populate AI Prompt Rules
            const promptRules = data.prompt_rules || (cam.ai_config && cam.ai_config.prompt_rules);
            if (promptRules) {
                const promptInp = document.getElementById('ai-prompt-input');
                if (promptInp && promptRules.prompt_text) promptInp.value = promptRules.prompt_text;
                
                const chkPerson = document.getElementById('ai-filter-person');
                const chkMotor = document.getElementById('ai-filter-motorcycle');
                const chkCar = document.getElementById('ai-filter-car');
                if (chkPerson && Array.isArray(promptRules.target_classes)) {
                    chkPerson.checked = promptRules.target_classes.includes('person');
                }
                if (chkMotor && Array.isArray(promptRules.target_classes)) {
                    chkMotor.checked = promptRules.target_classes.includes('motorcycle');
                }
                if (chkCar && Array.isArray(promptRules.target_classes)) {
                    chkCar.checked = promptRules.target_classes.includes('car');
                }
                
                const motionSel = document.getElementById('ai-motion-condition');
                if (motionSel) {
                    motionSel.value = promptRules.require_stationary ? 'stationary_only' : 'moving_or_stationary';
                }
                
                const dwellInp = document.getElementById('ai-dwell-seconds');
                if (dwellInp && promptRules.min_dwell_sec) {
                    dwellInp.value = promptRules.min_dwell_sec;
                }
                
                const confInp = document.getElementById('ai-confidence-min');
                if (confInp && promptRules.confidence_min) {
                    confInp.value = Math.round(promptRules.confidence_min * 100);
                }
            }
        }
    } catch (err) {
        console.warn('[AI Grid] Info: Grid tersimpan belum ada atau default:', err);
    }

    // Connect to real NVR video feed via HLS
    const hlsFn = window.initHlsPlayer || (typeof initHlsPlayer === 'function' ? initHlsPlayer : null);
    const token = (typeof getAuthToken === 'function') ? getAuthToken() : (localStorage.getItem('nvr_auth_token') || '');

    if (cam && (cam.mainStreamUrl || cam.mediaMtxPath || cam.id) && hlsFn && video) {
        const hlsPath = cam.mediaMtxPath || cam.id;
        const primaryHlsUrl = (cam.mainStreamUrl && cam.mainStreamUrl.startsWith('http')) 
            ? cam.mainStreamUrl 
            : ('/stream/' + encodeURIComponent(hlsPath) + '/index.m3u8?token=' + encodeURIComponent(token));
        const fallbackHlsUrl = `/streams/${encodeURIComponent(cam.id)}/main.m3u8`;
        
        let currentStreamUrl = primaryHlsUrl;
        let isPlaying = false;

        if (badge) {
            badge.innerHTML = '📡 Menghubungkan Live Stream Kamera...';
            badge.style.color = '#60a5fa';
        }

        const markSuccess = () => {
            if (isPlaying) return;
            isPlaying = true;
            if (noVideoOverlay) noVideoOverlay.style.display = 'none';
            video.style.display = 'block';
            if (badge) {
                badge.innerHTML = '🟢 Live NVR Stream Aktif';
                badge.style.color = '#34d399';
            }
            if (metaBadge) metaBadge.textContent = 'LIVE RTSP • 25 FPS';
            appendAITelemetry(`🟢 Stream video kamera "${cam.name}" terhubung aktif: ${currentStreamUrl}`, 'success');
        };

        const markFailure = () => {
            if (isPlaying) return;
            if (currentStreamUrl === primaryHlsUrl && fallbackHlsUrl) {
                currentStreamUrl = fallbackHlsUrl;
                appendAITelemetry(`🔄 Mencoba rute stream fallback NVR: ${fallbackHlsUrl}...`, 'info');
                try {
                    hlsFn('ai-stream-preview', fallbackHlsUrl, markSuccess, markFinalFailure);
                } catch (e) {
                    markFinalFailure();
                }
                return;
            }
            markFinalFailure();
        };

        const markFinalFailure = () => {
            if (isPlaying) return;
            if (noVideoOverlay) noVideoOverlay.style.display = 'flex';
            if (badge) {
                badge.innerHTML = '🔴 Kamera Offline / Stream Terputus';
                badge.style.color = '#ef4444';
            }
            if (metaBadge) metaBadge.textContent = 'NO VIDEO SIGNAL';
            appendAITelemetry(`⚠️ Sinyal video kamera "${cam.name}" (${cam.ip || 'RTSP'}) tidak terdeteksi. Pastikan kamera RTSP lokal menyala.`, 'alarm');
        };

        try {
            video.style.display = 'block';
            video.onplaying = markSuccess;
            video.onerror = markFailure;

            hlsFn('ai-stream-preview', primaryHlsUrl, markSuccess, markFailure);

            // Safety timeout: if after 6 seconds stream hasn't produced frames, check fallback or notify
            setTimeout(() => {
                if (!isPlaying && video.paused) {
                    markFailure();
                }
            }, 6000);
        } catch (hlsErr) {
            markFailure();
        }
    } else {
        if (noVideoOverlay) noVideoOverlay.style.display = 'flex';
        if (badge) {
            badge.innerHTML = '🔴 Tidak Ada Stream';
            badge.style.color = '#ef4444';
        }
        if (metaBadge) metaBadge.textContent = 'NO SIGNAL';
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

    // Attach ResizeObserver to keep canvas razor-sharp and matched to container/video size
    if (!window.aiCanvasResizeObserver && window.ResizeObserver) {
        window.aiCanvasResizeObserver = new ResizeObserver(() => {
            if (!aiDrawCanvas) return;
            const cRect = container.getBoundingClientRect();
            const nw = Math.max(Math.round(cRect.width) || 800, 320);
            const nh = Math.max(Math.round(cRect.height) || 450, 240);
            if (aiDrawCanvas.width !== nw || aiDrawCanvas.height !== nh) {
                aiDrawCanvas.width = nw;
                aiDrawCanvas.height = nh;
                if (aiZones && aiZones.length > 0) {
                    aiZones.forEach(z => {
                        if (typeof z.nx === 'number' && typeof z.nw === 'number' && z.nw > 0) {
                            z.x = Math.round(z.nx * nw);
                            z.y = Math.round(z.ny * nh);
                            z.w = Math.round(z.nw * nw);
                            z.h = Math.round(z.nh * nh);
                        } else if (z.w > 0) {
                            z.nx = z.x / (nw || 1);
                            z.ny = z.y / (nh || 1);
                            z.nw = z.w / (nw || 1);
                            z.nh = z.h / (nh || 1);
                        }
                    });
                }
            }
        });
        window.aiCanvasResizeObserver.observe(container);
    }
    
    function getPointerPos(evt) {
        if (!canvas) return { x: 0, y: 0 };
        const cRect = canvas.getBoundingClientRect();
        const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
        const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
        const scaleX = (cRect.width > 0) ? (canvas.width / cRect.width) : 1;
        const scaleY = (cRect.height > 0) ? (canvas.height / cRect.height) : 1;
        const unscaledX = (clientX - cRect.left) * scaleX;
        const unscaledY = (clientY - cRect.top) * scaleY;
        return {
            x: Math.max(0, Math.min(canvas.width, Math.round(unscaledX))),
            y: Math.max(0, Math.min(canvas.height, Math.round(unscaledY)))
        };
    }
    
    function getActiveZone() {
        if (!aiZones || aiZones.length === 0) {
            aiZones = [{
                id: 'zone_1',
                label: 'Area Deteksi 1',
                color: aiActiveZoneColor || '#3b82f6',
                themeColor: aiActiveZoneThemeColor || 'rgba(59,130,246,0.92)',
                x: 0, y: 0, w: 0, h: 0,
                nx: 0, ny: 0, nw: 0, nh: 0,
                targets: ['car', 'motorcycle', 'person']
            }];
            aiActiveZoneIndex = 0;
        }
        if (aiActiveZoneIndex < 0 || aiActiveZoneIndex >= aiZones.length) {
            aiActiveZoneIndex = 0;
        }
        return aiZones[aiActiveZoneIndex];
    }
    
    updateAICursor();
    
    canvas.onmousedown = (e) => {
        // Pan condition: middle mouse (1), right click (2), space key held, or tool is 'pan'
        if (e.button === 1 || e.button === 2 || isSpacePressed || aiInteractionMode === 'pan') {
            e.preventDefault();
            isAIPanning = true;
            aiPanStart = { x: e.clientX - aiPanX, y: e.clientY - aiPanY };
            canvas.style.cursor = 'grabbing';
            return;
        }
        
        if (e.button !== 0) return; // Left click only for drawing
        
        isAIDrawing = true;
        const pos = getPointerPos(e);
        aiDragStart = pos;
        const curZone = getActiveZone();
        curZone.x = pos.x;
        curZone.y = pos.y;
        curZone.w = 0;
        curZone.h = 0;
        curZone.nx = pos.x / (canvas.width || 1);
        curZone.ny = pos.y / (canvas.height || 1);
        curZone.nw = 0;
        curZone.nh = 0;
        aiGridRect = curZone;
    };
    
    canvas.onmousemove = (e) => {
        if (isAIPanning) {
            aiPanX = e.clientX - aiPanStart.x;
            aiPanY = e.clientY - aiPanStart.y;
            clampAIPan();
            updateAIViewportTransform();
            return;
        }
        
        if (!isAIDrawing) return;
        const pos = getPointerPos(e);
        const x = Math.min(aiDragStart.x, pos.x);
        const y = Math.min(aiDragStart.y, pos.y);
        const w = Math.abs(pos.x - aiDragStart.x);
        const h = Math.abs(pos.y - aiDragStart.y);
        const curZone = getActiveZone();
        curZone.x = x;
        curZone.y = y;
        curZone.w = w;
        curZone.h = h;
        curZone.nx = x / (canvas.width || 1);
        curZone.ny = y / (canvas.height || 1);
        curZone.nw = w / (canvas.width || 1);
        curZone.nh = h / (canvas.height || 1);
        aiGridRect = curZone;
        updateCoordStatusText();
    };
    
    const handleMouseUpOrLeave = () => {
        if (isAIPanning) {
            isAIPanning = false;
            updateAICursor();
        }
        
        if (isAIDrawing) {
            isAIDrawing = false;
            const curZone = getActiveZone();
            if (curZone.w < 8 || curZone.h < 8) {
                // If clicked without drag, keep existing or set minimum size
                if (curZone.nw <= 0) {
                    curZone.x = 0;
                    curZone.y = 0;
                    curZone.w = 0;
                    curZone.h = 0;
                    curZone.nx = 0;
                    curZone.ny = 0;
                    curZone.nw = 0;
                    curZone.nh = 0;
                }
            }
            aiGridRect = curZone;
            updateCoordStatusText();
            renderAIZonesChips();
            if (curZone.w > 0) {
                appendAITelemetry(`📐 Kotak "${curZone.label}" diperbarui: [X:${curZone.x}, Y:${curZone.y}, W:${curZone.w}, H:${curZone.h}]`, 'info');
            }
        }
    };
    
    canvas.onmouseup = handleMouseUpOrLeave;
    canvas.onmouseleave = handleMouseUpOrLeave;
    canvas.oncontextmenu = (e) => {
        e.preventDefault(); // Prevent browser context menu during right-drag pan
    };
    
    // Touchscreen / mobile / STB touch monitor support
    canvas.ontouchstart = (e) => {
        // Multi-touch pinch zoom
        if (e.touches.length === 2) {
            isAIDrawing = false;
            isAIPanning = false;
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            aiTouchPinchStartDist = Math.hypot(dx, dy);
            aiTouchStartScale = aiZoomScale;
            return;
        }
        
        if (e.touches.length === 1) {
            if (aiInteractionMode === 'pan') {
                isAIPanning = true;
                aiPanStart = { x: e.touches[0].clientX - aiPanX, y: e.touches[0].clientY - aiPanY };
                return;
            }
            
            // Draw mode
            e.preventDefault();
            isAIDrawing = true;
            const pos = getPointerPos(e);
            aiDragStart = pos;
            const curZone = getActiveZone();
            curZone.x = pos.x;
            curZone.y = pos.y;
            curZone.w = 0;
            curZone.h = 0;
            curZone.nx = pos.x / (canvas.width || 1);
            curZone.ny = pos.y / (canvas.height || 1);
            curZone.nw = 0;
            curZone.nh = 0;
            aiGridRect = curZone;
        }
    };
    
    canvas.ontouchmove = (e) => {
        if (e.touches.length === 2 && aiTouchPinchStartDist > 0) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const newDist = Math.hypot(dx, dy);
            const scaleFactor = newDist / aiTouchPinchStartDist;
            aiZoomScale = Math.max(0.75, Math.min(4.0, Math.round(aiTouchStartScale * scaleFactor * 100) / 100));
            updateAIViewportTransform();
            return;
        }
        
        if (e.touches.length === 1) {
            if (isAIPanning) {
                e.preventDefault();
                aiPanX = e.touches[0].clientX - aiPanStart.x;
                aiPanY = e.touches[0].clientY - aiPanStart.y;
                clampAIPan();
                updateAIViewportTransform();
                return;
            }
            
            if (isAIDrawing) {
                e.preventDefault();
                const pos = getPointerPos(e);
                const x = Math.min(aiDragStart.x, pos.x);
                const y = Math.min(aiDragStart.y, pos.y);
                const w = Math.abs(pos.x - aiDragStart.x);
                const h = Math.abs(pos.y - aiDragStart.y);
                const curZone = getActiveZone();
                curZone.x = x;
                curZone.y = y;
                curZone.w = w;
                curZone.h = h;
                curZone.nx = x / (canvas.width || 1);
                curZone.ny = y / (canvas.height || 1);
                curZone.nw = w / (canvas.width || 1);
                curZone.nh = h / (canvas.height || 1);
                aiGridRect = curZone;
                updateCoordStatusText();
            }
        }
    };
    
    canvas.ontouchend = (e) => {
        if (e.touches.length < 2) {
            aiTouchPinchStartDist = 0;
        }
        handleMouseUpOrLeave();
    };

    // Attach wheel listener to container for zoom in/out with mouse scroll
    if (!container._hasAIWheelListener) {
        container._hasAIWheelListener = true;
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY < 0) {
                zoomInAI(0.15);
            } else {
                zoomOutAI(0.15);
            }
        }, { passive: false });
    }
}

// Continuous Render Loop: ensures instant visual updates, real-time video transparency & live output visualization
function aiStartRenderLoop() {
    if (aiAnimFrameId) cancelAnimationFrame(aiAnimFrameId);
    
    function loop() {
        // Render if either the dedicated YOLO AI view pane is active OR the modal overlay is open
        const yoloView = document.getElementById('view-yolo-ai');
        const modal = document.getElementById('aiGridModalOverlay');
        const isViewActive = yoloView && yoloView.classList.contains('active');
        const isModalActive = modal && modal.style.display !== 'none';
        
        if (!isViewActive && !isModalActive) {
            aiAnimFrameId = requestAnimationFrame(loop);
            return;
        }
        
        const livePane = document.getElementById('ai-tab-pane-live');
        if (livePane && livePane.style.display !== 'none') {
            renderAIFrame();
        }

        const simPane = document.getElementById('ai-tab-pane-sim');
        if (simPane && simPane.style.display !== 'none') {
            renderSimSandboxFrame();
        }
        
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

// RENDER AI SURVEILLANCE OVERLAY FOR LIVE CAMERA (100% TRANSPARENT BACKGROUND)
function renderAIFrame() {
    if (!aiDrawCanvas || !aiDrawCtx) return;
    const ctx = aiDrawCtx;
    const w = aiDrawCanvas.width;
    const h = aiDrawCanvas.height;
    const video = document.getElementById('ai-stream-preview');
    const isVideoPlaying = video && !video.paused && video.readyState >= 2 && video.videoWidth > 0;
    
    // Always clear canvas for 100% transparency - video underneath will show directly!
    ctx.clearRect(0, 0, w, h);
    
    // Corner surveillance brackets (Subtle surveillance HUD)
    const bSize = 14;
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, 8 + bSize); ctx.lineTo(8, 8); ctx.lineTo(8 + bSize, 8);
    ctx.moveTo(w - 8 - bSize, 8); ctx.lineTo(w - 8, 8); ctx.lineTo(w - 8, 8 + bSize);
    ctx.moveTo(8, h - 8 - bSize); ctx.lineTo(8, h - 8); ctx.lineTo(8 + bSize, h - 8);
    ctx.moveTo(w - 8 - bSize, h - 8); ctx.lineTo(w - 8, h - 8); ctx.lineTo(w - 8, h - 8 - bSize);
    ctx.stroke();

    // Mode Status Badge (Top-Left)
    const modeBadgeText = isAIFullscreen ? '✏️ MODE GAMBAR OBJEK (FULLSCREEN)' : '👁️ PRATINJAU LOKASI (PREVIEW ONLY)';
    ctx.font = 'bold 9px monospace';
    const mbW = ctx.measureText(modeBadgeText).width + 16;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.strokeStyle = isAIFullscreen ? 'rgba(56, 189, 248, 0.45)' : 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 1;
    ctx.fillRect(8, 8, mbW, 22);
    ctx.strokeRect(8, 8, mbW, 22);
    ctx.fillStyle = isAIFullscreen ? '#38bdf8' : '#94a3b8';
    ctx.fillText(modeBadgeText, 16, 23);

    // Active HUD badge in corner (Top-Right)
    const camName = (aiCurrentCam && aiCurrentCam.name) ? aiCurrentCam.name.toUpperCase() : 'KAMERA NVR';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1;
    ctx.fillRect(w - 210, 8, 202, 22);
    ctx.strokeRect(w - 210, 8, 202, 22);
    ctx.fillStyle = isVideoPlaying ? '#34d399' : '#38bdf8';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(isVideoPlaying ? `🟢 LIVE STREAM: ${camName}` : `📡 SIAGA: ${camName}`, w - 202, 23);
    
    // Multi-Object Intrusion Detection Zones Rendering
    const zonesToDraw = (aiZones && aiZones.length > 0) ? aiZones : (aiGridRect.w > 0 ? [aiGridRect] : []);
    zonesToDraw.forEach((zone, idx) => {
        if (!zone) return;
        
        // Compute pixel coordinates from normalized ratio (or fallback to absolute pixel if ratio not present)
        let x = 0, y = 0, rw = 0, rh = 0;
        if (typeof zone.nx === 'number' && typeof zone.nw === 'number' && (zone.nw > 0 || zone.nx > 0)) {
            x = Math.round(zone.nx * w);
            y = Math.round(zone.ny * h);
            rw = Math.round(zone.nw * w);
            rh = Math.round(zone.nh * h);
            zone.x = x;
            zone.y = y;
            zone.w = rw;
            zone.h = rh;
        } else if (zone.w > 0 && zone.h > 0) {
            x = zone.x;
            y = zone.y;
            rw = zone.w;
            rh = zone.h;
            zone.nx = x / (w || 1);
            zone.ny = y / (h || 1);
            zone.nw = rw / (w || 1);
            zone.nh = rh / (h || 1);
        }
        
        if (rw <= 0 || rh <= 0) return;
        
        const isActive = (idx === aiActiveZoneIndex);
        const colorHex = zone.color || (isActive ? aiActiveZoneColor : '#3b82f6');
        const colorTheme = zone.themeColor || (isActive ? aiActiveZoneThemeColor : 'rgba(59,130,246,0.92)');
        
        // Semi-transparent fill of zone color (active is more visible)
        ctx.fillStyle = colorTheme.replace(/[\d\.]+\)$/, isActive ? '0.25)' : '0.12)');
        ctx.fillRect(x, y, rw, rh);
        
        // Fine interior cross lines for active grid area
        if (isActive) {
            ctx.save();
            ctx.strokeStyle = colorTheme.replace(/[\d\.]+\)$/, '0.18)');
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let gx = x + 30; gx < x + rw; gx += 30) { ctx.moveTo(gx, y); ctx.lineTo(gx, y + rh); }
            for (let gy = y + 30; gy < y + rh; gy += 30) { ctx.moveTo(x, gy); ctx.lineTo(x + rw, gy); }
            ctx.stroke();
            ctx.restore();
        }
        
        // Border: active zone gets dashed line with corner anchors; non-active gets clean solid border
        ctx.save();
        ctx.strokeStyle = colorHex;
        ctx.lineWidth = isActive ? 2.6 : 1.8;
        if (isActive) {
            ctx.setLineDash([8, 4]);
        } else {
            ctx.setLineDash([]);
        }
        ctx.strokeRect(x, y, rw, rh);
        ctx.restore();
        
        // Corner anchor points for active zone
        if (isActive) {
            const pSize = 7;
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = colorHex;
            ctx.lineWidth = 2;
            const corners = [
                [x, y], [x + rw, y], [x, y + rh], [x + rw, y + rh]
            ];
            corners.forEach(([cx, cy]) => {
                ctx.fillRect(cx - pSize/2, cy - pSize/2, pSize, pSize);
                ctx.strokeRect(cx - pSize/2, cy - pSize/2, pSize, pSize);
            });
        }
        
        // Floating Top Header Tag with Object Name & Index Number
        const tagH = isActive ? 22 : 18;
        const rawLabel = zone.label || `Objek #${idx + 1}`;
        const displayLabel = isActive ? `✏️ [${idx + 1}] ${rawLabel}` : `[${idx + 1}] ${rawLabel}`;
        
        ctx.font = isActive ? 'bold 10px monospace' : 'bold 9px monospace';
        const textWidth = ctx.measureText(displayLabel).width;
        const tagW = Math.min(Math.max(rw, textWidth + 14), 320);
        
        ctx.fillStyle = isActive ? colorTheme : colorTheme.replace(/[\d\.]+\)$/, '0.82)');
        ctx.fillRect(x, Math.max(0, y - tagH), tagW, tagH);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(displayLabel, x + 6, Math.max(isActive ? 15 : 13, y - 5));
    });
}

// Drawing Simulated Vehicle
function drawSimVehicle(ctx, veh, promptMet, colliding) {
    const { x, y, w, h, label, conf, stationary } = veh;
    const pulse = Math.sin(Date.now() / 150) * 0.2 + 0.8;
    
    ctx.save();
    if (promptMet) {
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 14;
        ctx.strokeStyle = `rgba(239, 68, 68, ${pulse})`;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
    } else if (colliding) {
        ctx.strokeStyle = '#eab308';
        ctx.fillStyle = 'rgba(234, 179, 8, 0.15)';
    } else {
        ctx.strokeStyle = '#38bdf8';
        ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
    }
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
    
    // Wheels & chassis lines
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(x + 18, y + h - 6, 12, 0, Math.PI * 2);
    ctx.arc(x + w - 18, y + h - 6, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = promptMet ? '#ef4444' : '#38bdf8';
    ctx.stroke();
    
    // Label Badge
    const tagBg = promptMet ? '#ef4444' : (colliding ? '#d97706' : '#0284c7');
    ctx.fillStyle = tagBg;
    ctx.fillRect(x, Math.max(0, y - 18), 150, 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    const statusText = stationary ? 'BERHENTI (Dwell)' : 'BERGERAK';
    ctx.fillText(`${label} [${Math.round(conf * 100)}%] ${statusText}`, x + 4, Math.max(12, y - 5));
}

// Drawing Simulated Person
function drawSimPerson(ctx, per, promptMet, colliding) {
    const { x, y, w, h, label, conf, stationary } = per;
    const pulse = Math.sin(Date.now() / 150) * 0.2 + 0.8;
    
    ctx.save();
    if (promptMet) {
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 14;
        ctx.strokeStyle = `rgba(239, 68, 68, ${pulse})`;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
    } else if (colliding) {
        ctx.strokeStyle = '#eab308';
        ctx.fillStyle = 'rgba(234, 179, 8, 0.15)';
    } else {
        ctx.strokeStyle = '#10b981';
        ctx.fillStyle = 'rgba(16, 185, 129, 0.14)';
    }
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
    
    // Stickman figure
    const headRadius = w * 0.2;
    ctx.fillStyle = promptMet ? '#ef4444' : '#10b981';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + headRadius * 2, headRadius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = promptMet ? '#ef4444' : '#10b981';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y + headRadius * 3);
    ctx.lineTo(x + w / 2, y + h * 0.65);
    // Arms (reaching nozzle if refueling)
    if (stationary) {
        ctx.moveTo(x + w * 0.2, y + h * 0.45);
        ctx.lineTo(x + w * 0.9, y + h * 0.4);
    } else {
        ctx.moveTo(x + w * 0.2, y + h * 0.45);
        ctx.lineTo(x + w * 0.8, y + h * 0.45);
    }
    // Legs
    ctx.moveTo(x + w / 2, y + h * 0.65);
    ctx.lineTo(x + w * 0.25, y + h * 0.95);
    ctx.moveTo(x + w / 2, y + h * 0.65);
    ctx.lineTo(x + w * 0.75, y + h * 0.95);
    ctx.stroke();
    
    // Tag
    const tagBg = promptMet ? '#ef4444' : (colliding ? '#d97706' : '#059669');
    ctx.fillStyle = tagBg;
    ctx.fillRect(x, Math.max(0, y - 18), 150, 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    const stateStr = stationary ? 'MENGISI BENSIN' : 'BERJALAN';
    ctx.fillText(`${label} [${Math.round(conf * 100)}%] ${stateStr}`, x + 4, Math.max(12, y - 5));
}

// Emits structured text telemetry for user
function emitLiveTelemetryTick(promptMet, colliding, stationary, minDwell) {
    if (!aiSimActive) return;
    const v = aiSimState.vehicle;
    const p = aiSimState.person;
    
    // Detection reading line
    appendAITelemetry(`👁️ SCAN: ${v.label} [${Math.round(v.conf * 100)}%] di (X:${Math.round(v.x)}, Y:${Math.round(v.y)}) • ${v.stationary ? 'BERHENTI' : 'BERGERAK'}`, 'scan');
    appendAITelemetry(`👁️ SCAN: ${p.label} [${Math.round(p.conf * 100)}%] di (X:${Math.round(p.x)}, Y:${Math.round(p.y)}) • ${p.stationary ? 'BERHENTI (DWELL)' : 'BERGERAK'}`, 'scan');
    
    if (colliding) {
        if (stationary) {
            appendAITelemetry(`⏳ EVALUASI LOGIKA: Objek berhenti di dalam ROI Pompa BBM • Dwell Time: ${aiDwellTimer.toFixed(1)}s / ${minDwell}s`, 'eval');
        } else {
            appendAITelemetry(`ℹ️ EVALUASI LOGIKA: Objek melintas di area ROI (Bergerak)...`, 'eval');
        }
    }
    
    if (promptMet) {
        appendAITelemetry(`🚨 SYARAT PROMPT TERPENUHI: "Orang berhenti sedang menunggu mengisi bensin"! (Dwell ${aiDwellTimer.toFixed(1)}s >= ${minDwell}s)`, 'alarm');
        appendAITelemetry(`📡 TRIGGER ALARM: Notifikasi HTTP Webhook & Alarm ESP8266 dikirimkan ke relay!`, 'success');
    }
}

// REAL-TIME TEXT TELEMETRY CONSOLE FUNCTIONS
function appendAITelemetry(line, type = 'info') {
    const term = document.getElementById('ai-text-telemetry-log');
    if (!term) return;
    
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
    
    const row = document.createElement('div');
    row.style.marginBottom = '2px';
    row.style.wordBreak = 'break-word';
    
    let color = '#38bdf8';
    let prefix = '●';
    if (type === 'alarm') {
        color = '#ef4444';
        prefix = '🚨';
        row.style.fontWeight = 'bold';
    } else if (type === 'success') {
        color = '#10b981';
        prefix = '✅';
    } else if (type === 'scan') {
        color = '#94a3b8';
        prefix = '👁️';
    } else if (type === 'eval') {
        color = '#f59e0b';
        prefix = '⏳';
    } else if (type === 'system') {
        color = '#60a5fa';
        prefix = '⚙️';
    }
    
    row.style.color = color;
    row.textContent = `[${timeStr}] ${prefix} ${line}`;
    term.appendChild(row);
    
    // Cap lines at 150 to keep browser memory lightweight on Armbian STBs
    if (term.childNodes.length > 150) {
        term.removeChild(term.firstChild);
    }
    
    if (aiTelemetryAutoScroll) {
        term.scrollTop = term.scrollHeight;
    }
}

function copyAITelemetryLog() {
    const term = document.getElementById('ai-text-telemetry-log');
    if (!term) return;
    const text = term.innerText || term.textContent;
    navigator.clipboard.writeText(text).then(() => {
        alert('Teks telemetri AI berhasil disalin ke clipboard!');
    }).catch(() => {
        alert('Gagal menyalin otomatis. Silakan pilih dan salin teks secara manual.');
    });
}

function clearAITelemetryLog() {
    const term = document.getElementById('ai-text-telemetry-log');
    if (term) term.innerHTML = '';
}

function toggleAITelemetryScroll() {
    aiTelemetryAutoScroll = !aiTelemetryAutoScroll;
    const btn = document.getElementById('btn-telemetry-scroll');
    if (btn) {
        btn.textContent = aiTelemetryAutoScroll ? '⬇️ Auto-Scroll: ON' : '⏸️ Auto-Scroll: OFF';
        btn.style.color = aiTelemetryAutoScroll ? '#38bdf8' : '#94a3b8';
    }
}

// AI PROMPT PRESETS & LOGIC MANAGEMENT
function applyAIPromptPreset(presetId) {
    const promptInp = document.getElementById('ai-prompt-input');
    const chkPerson = document.getElementById('ai-filter-person');
    const chkMotor = document.getElementById('ai-filter-motorcycle');
    const chkCar = document.getElementById('ai-filter-car');
    const motionSel = document.getElementById('ai-motion-condition');
    const dwellInp = document.getElementById('ai-dwell-seconds');
    const confInp = document.getElementById('ai-confidence-min');
    
    if (presetId === 'spbu_refuel') {
        if (promptInp) promptInp.value = 'Deteksi orang/pengendara yang datang ke area pompa bensin, berhenti lebih dari 3 detik, dan sedang menunggu atau mengisi bensin.';
        if (chkPerson) chkPerson.checked = true;
        if (chkMotor) chkMotor.checked = true;
        if (chkCar) chkCar.checked = true;
        if (motionSel) motionSel.value = 'stationary_only';
        if (dwellInp) dwellInp.value = 3;
        if (confInp) confInp.value = 75;
        setAIGridPreset('spbu');
        appendAITelemetry('⛽ Menerapkan Preset SPBU: Deteksi Orang/Pengendara Berhenti Mengisi Bensin (>= 3s)', 'system');
    } else if (presetId === 'waiting_queue') {
        if (promptInp) promptInp.value = 'Deteksi orang berdiri diam atau menunggu di area pompa lebih dari 5 detik.';
        if (chkPerson) chkPerson.checked = true;
        if (chkMotor) chkMotor.checked = false;
        if (chkCar) chkCar.checked = false;
        if (motionSel) motionSel.value = 'stationary_only';
        if (dwellInp) dwellInp.value = 5;
        if (confInp) confInp.value = 75;
        setAIGridPreset('center');
        appendAITelemetry('🛑 Menerapkan Preset Antrean: Deteksi Orang Berdiri Diam / Menunggu (>= 5s)', 'system');
    } else if (presetId === 'vehicle_entry') {
        if (promptInp) promptInp.value = 'Deteksi kendaraan masuk dan berhenti di samping dispenser BBM minimal 2 detik.';
        if (chkPerson) chkPerson.checked = false;
        if (chkMotor) chkMotor.checked = true;
        if (chkCar) chkCar.checked = true;
        if (motionSel) motionSel.value = 'stationary_only';
        if (dwellInp) dwellInp.value = 2;
        if (confInp) confInp.value = 70;
        setAIGridPreset('spbu');
        appendAITelemetry('🚗 Menerapkan Preset Kendaraan: Deteksi Kendaraan Berhenti di Dispenser (>= 2s)', 'system');
    } else if (presetId === 'instant_intrusion') {
        if (promptInp) promptInp.value = 'Deteksi siapapun objek manusia atau kendaraan yang melintas di area ini.';
        if (chkPerson) chkPerson.checked = true;
        if (chkMotor) chkMotor.checked = true;
        if (chkCar) chkCar.checked = true;
        if (motionSel) motionSel.value = 'moving_or_stationary';
        if (dwellInp) dwellInp.value = 1;
        if (confInp) confInp.value = 60;
        setAIGridPreset('gate');
        appendAITelemetry('⚡ Menerapkan Preset Intrusi Kilat: Deteksi Semua Gerakan Objek', 'system');
    }
}

async function testAIPromptCondition() {
    const select = document.getElementById('ai-cam-select');
    const camId = select ? select.value : 'virtual_test';
    const promptText = document.getElementById('ai-prompt-input')?.value.trim() || '';
    const minDwell = parseInt(document.getElementById('ai-dwell-seconds')?.value, 10) || 3;
    const feedback = document.getElementById('ai-prompt-test-feedback');
    const btn = document.getElementById('btn-test-prompt-trigger');
    
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Menguji Syarat...';
    }
    if (feedback) feedback.textContent = 'Mengevaluasi prompt ke server...';
    
    appendAITelemetry(`🧪 Menguji syarat output prompt: "${promptText}"`, 'info');
    
    try {
        const fetchFn = (typeof authFetch === 'function') ? authFetch : (window.authFetch || fetch);
        const res = await fetchFn('/api/ai/test_prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                camera_id: camId,
                prompt_text: promptText,
                detected_class: 'person',
                dwell_sec: minDwell + 0.8,
                trigger_alarm: true
            })
        });
        
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.condition_met) {
            if (feedback) feedback.textContent = `✅ Syarat Terpenuhi! (${data.message})`;
            appendAITelemetry(`🚨 UJI COBA BERHASIL: Syarat prompt terpenuhi! Alarm terpicu.`, 'alarm');
            if (data.esp_triggered) {
                appendAITelemetry(`📡 ESP8266 Alarm Berhasil diaktifkan: ${data.esp_url}`, 'success');
            }
            alert(`Uji Coba Berhasil!\n\nSyarat Prompt AI Terpenuhi:\n"${promptText}"\n\nStatus Evaluasi: OK\nESP8266 Triggered: ${data.esp_triggered ? 'Ya' : 'Tidak'}`);
        } else {
            throw new Error(data.message || 'Evaluasi syarat tidak terpenuhi');
        }
    } catch (e) {
        console.error('[Prompt Test Error]', e);
        if (feedback) feedback.textContent = `❌ ${e.message}`;
        appendAITelemetry(`❌ Uji coba gagal: ${e.message}`, 'alarm');
        alert('Uji coba syarat prompt gagal: ' + e.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '⚡ Uji Coba Pemicu Syarat (Test Trigger)';
        }
    }
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
            appendAITelemetry('👁️ Simulasi Output Diaktifkan.', 'info');
        } else {
            btn.innerHTML = '👁️ Simulasi Output: MATI';
            btn.style.background = 'rgba(148,163,184,0.15)';
            btn.style.color = '#94a3b8';
            btn.style.borderColor = 'rgba(148,163,184,0.3)';
            appendAITelemetry('⏸️ Simulasi Output Dimatikan.', 'info');
        }
    }
    const banner = document.getElementById('ai-live-collision-banner');
    if (banner && !aiSimActive) banner.style.display = 'none';
}

function updateCoordStatusText() {
    const el = document.getElementById('ai-coord-status');
    const fsEl = document.getElementById('ai-fs-coord-status');
    
    const curZone = (aiZones && aiZones[aiActiveZoneIndex]) ? aiZones[aiActiveZoneIndex] : aiGridRect;
    
    if (!aiDrawCanvas || !curZone || curZone.w === 0 || curZone.h === 0) {
        const emptyMsg = '<span style="color:#94a3b8;">Belum ada kotak yang digambar untuk objek ini. Tarik kursor di video.</span>';
        if (el) el.innerHTML = emptyMsg;
        if (fsEl) fsEl.innerHTML = emptyMsg;
        return;
    }
    const cw = aiDrawCanvas.width || 800;
    const ch = aiDrawCanvas.height || 450;
    const px = ((curZone.x / cw) * 100).toFixed(1);
    const py = ((curZone.y / ch) * 100).toFixed(1);
    const pw = ((curZone.w / cw) * 100).toFixed(1);
    const ph = ((curZone.h / ch) * 100).toFixed(1);
    
    const htmlStr = `<span style="color:#34d399; font-weight:600;">✓ Objek #${aiActiveZoneIndex + 1} (${curZone.label || 'Area'}):</span> ` +
        `X: <span style="color:#60a5fa;">${px}%</span> | ` +
        `Y: <span style="color:#60a5fa;">${py}%</span> | ` +
        `L: <span style="color:#f59e0b;">${pw}%</span> | ` +
        `T: <span style="color:#f59e0b;">${ph}%</span>`;
        
    if (el) el.innerHTML = htmlStr;
    if (fsEl) fsEl.innerHTML = htmlStr;
}

// Multi-Zone Chips & Detailed Cards List Render for normal, subtab & fullscreen HUD
function renderAIZonesChips() {
    const listEl = document.getElementById('ai-zones-chips-list');
    const fsListEl = document.getElementById('ai-fs-zones-chips');
    const fsSlotBadge = document.getElementById('ai-fs-active-slot-badge');
    const countBadge = document.getElementById('ai-zones-count-badge');
    const cardsGrid = document.getElementById('ai-zones-cards-grid');
    
    if (fsSlotBadge) {
        fsSlotBadge.textContent = `Objek ${aiActiveZoneIndex + 1} dari ${aiZones.length}`;
    }
    if (countBadge) {
        countBadge.textContent = `${aiZones.length} Objek Terdata (${aiActiveZoneIndex + 1} Aktif)`;
    }
    
    const buildChips = (targetEl) => {
        if (!targetEl) return;
        targetEl.innerHTML = '';
        
        if (!aiZones || aiZones.length === 0) {
            targetEl.innerHTML = '<span style="color:#94a3b8; font-size:0.75rem;">Belum ada objek. Klik "+ Tambah Objek".</span>';
            return;
        }
        
        aiZones.forEach((zone, idx) => {
            const isActive = (idx === aiActiveZoneIndex);
            const chip = document.createElement('div');
            chip.className = `ai-zone-chip ${isActive ? 'active' : ''}`;
            chip.style.borderLeft = `3px solid ${zone.color || '#3b82f6'}`;
            if (isActive) {
                chip.style.background = zone.color ? `${zone.color}28` : 'rgba(59,130,246,0.3)';
            }
            
            const hasBox = (zone.w > 0 && zone.h > 0) || (zone.nw > 0 && zone.nh > 0);
            const boxStatus = hasBox ? '📐' : '⚠️ (Kosong)';
            
            chip.innerHTML = `
                <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${zone.color || '#3b82f6'};"></span>
                <span>[${idx + 1}] ${zone.label || 'Objek ' + (idx + 1)}</span>
                <small style="color:${hasBox ? '#34d399' : '#f59e0b'}; font-size:0.68rem; margin-left:2px;">${boxStatus}</small>
            `;
            
            chip.onclick = (e) => {
                e.stopPropagation();
                selectActiveZone(idx);
            };
            
            targetEl.appendChild(chip);
        });
    };
    
    buildChips(listEl);
    buildChips(fsListEl);

    // Build Detailed Cards List for Subpane 1
    if (cardsGrid) {
        cardsGrid.innerHTML = '';
        if (!aiZones || aiZones.length === 0) {
            cardsGrid.innerHTML = '<div style="grid-column:1/-1; color:#94a3b8; font-size:0.78rem; text-align:center; padding:0.5rem;">Belum ada objek yang dibuat.</div>';
            return;
        }

        aiZones.forEach((zone, idx) => {
            const isActive = (idx === aiActiveZoneIndex);
            const card = document.createElement('div');
            card.style.background = isActive ? 'rgba(30, 41, 59, 0.95)' : 'rgba(15, 23, 42, 0.75)';
            card.style.border = isActive ? `2px solid ${zone.color || '#3b82f6'}` : '1px solid rgba(255,255,255,0.1)';
            card.style.borderRadius = '6px';
            card.style.padding = '0.5rem 0.65rem';
            card.style.cursor = 'pointer';
            card.style.transition = 'all 0.15s ease';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.gap = '0.35rem';
            
            const hasBox = (zone.w > 0 && zone.h > 0) || (zone.nw > 0 && zone.nh > 0);
            const targetsStr = (zone.targets && zone.targets.length > 0) ? zone.targets.join(', ') : 'Semua';
            const dimStr = hasBox ? `X:${Math.round((zone.nx || 0)*100)}% Y:${Math.round((zone.ny || 0)*100)}% W:${Math.round((zone.nw || 0)*100)}% H:${Math.round((zone.nh || 0)*100)}%` : '⚠️ Belum digambar';

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:0.35rem;">
                        <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${zone.color || '#3b82f6'};"></span>
                        <strong style="font-size:0.8rem; color:${isActive ? '#38bdf8' : '#f8fafc'};">[${idx + 1}] ${zone.label || 'Objek #' + (idx + 1)}</strong>
                    </div>
                    <span style="font-size:0.68rem; padding:1px 5px; border-radius:3px; font-weight:bold; background:${isActive ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.06)'}; color:${isActive ? '#38bdf8' : '#94a3b8'};">
                        ${isActive ? '● AKTIF' : 'PILIH'}
                    </span>
                </div>
                <div style="font-size:0.72rem; color:var(--text-muted); font-family:monospace;">
                    ${dimStr}
                </div>
                <div style="font-size:0.7rem; color:#cbd5e1; display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.06); padding-top:0.3rem; margin-top:0.1rem;">
                    <span>Target: <b>${targetsStr}</b></span>
                    <button type="button" class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteZoneByIndex(${idx})" style="padding:0 5px; font-size:0.68rem; line-height:1.4;" title="Hapus objek ini">🗑️</button>
                </div>
            `;

            card.onclick = () => {
                selectActiveZone(idx);
            };

            cardsGrid.appendChild(card);
        });
    }
}

function deleteZoneByIndex(idx) {
    if (!aiZones || idx < 0 || idx >= aiZones.length) return;
    selectActiveZone(idx);
    deleteCurrentZone();
}

function selectActiveZone(idx) {
    if (!aiZones || idx < 0 || idx >= aiZones.length) return;
    aiActiveZoneIndex = idx;
    syncActiveZoneUI();
    renderAIZonesChips();
    updateCoordStatusText();
    appendAITelemetry(`🎯 Beralih ke Objek #${idx + 1}: "${aiZones[idx].label}"`, 'info');
}

function syncActiveZoneUI() {
    if (!aiZones || aiZones.length === 0) return;
    if (aiActiveZoneIndex < 0 || aiActiveZoneIndex >= aiZones.length) aiActiveZoneIndex = 0;
    
    const curZone = aiZones[aiActiveZoneIndex];
    aiGridRect = curZone;
    aiActiveZoneColor = curZone.color || '#3b82f6';
    aiActiveZoneThemeColor = curZone.themeColor || 'rgba(59,130,246,0.92)';
    
    // Sync input label in normal & fullscreen HUD
    const inp = document.getElementById('ai-zone-label-input');
    const fsInp = document.getElementById('ai-fs-zone-label');
    if (inp) inp.value = curZone.label || `Objek #${aiActiveZoneIndex + 1}`;
    if (fsInp) fsInp.value = curZone.label || `Objek #${aiActiveZoneIndex + 1}`;
    
    // Sync target checkboxes
    const targets = curZone.targets || ['car', 'motorcycle', 'person'];
    const chkCar = document.getElementById('ai-target-car');
    const chkMotor = document.getElementById('ai-target-motor');
    const chkPerson = document.getElementById('ai-target-person');
    const fsChkCar = document.getElementById('ai-fs-target-car');
    const fsChkMotor = document.getElementById('ai-fs-target-motor');
    const fsChkPerson = document.getElementById('ai-fs-target-person');
    
    if (chkCar) chkCar.checked = targets.includes('car');
    if (chkMotor) chkMotor.checked = targets.includes('motorcycle');
    if (chkPerson) chkPerson.checked = targets.includes('person');
    if (fsChkCar) fsChkCar.checked = targets.includes('car');
    if (fsChkMotor) fsChkMotor.checked = targets.includes('motorcycle');
    if (fsChkPerson) fsChkPerson.checked = targets.includes('person');
    
    // Set color buttons active
    setZoneColor(curZone.color || '#3b82f6', curZone.themeColor || 'rgba(59,130,246,0.92)', true);
    syncMiniHudUI();
}

function addNewZoneSlot() {
    if (!aiZones) aiZones = [];
    
    const palette = [
        { hex: '#3b82f6', theme: 'rgba(59,130,246,0.92)' },  // Biru
        { hex: '#eab308', theme: 'rgba(234,179,8,0.92)' },   // Kuning
        { hex: '#10b981', theme: 'rgba(16,185,129,0.92)' },  // Hijau
        { hex: '#ef4444', theme: 'rgba(239,68,68,0.92)' },   // Merah
        { hex: '#a855f7', theme: 'rgba(168,85,247,0.92)' },  // Ungu
        { hex: '#f97316', theme: 'rgba(249,115,22,0.92)' },  // Oranye
        { hex: '#06b6d4', theme: 'rgba(6,182,212,0.92)' }    // Cyan
    ];
    
    const nextColor = palette[aiZones.length % palette.length];
    const newIdx = aiZones.length + 1;
    
    let defaultLabel = `Objek / Area #${newIdx}`;
    let defaultTargets = ['car', 'motorcycle', 'person'];
    if (newIdx === 1) {
        defaultLabel = '⛽ Area Pompa BBM';
        defaultTargets = ['car', 'motorcycle'];
    } else if (newIdx === 2) {
        defaultLabel = '🅿️ Area Parkir';
        defaultTargets = ['car', 'motorcycle'];
    } else if (newIdx === 3) {
        defaultLabel = '👤 Antrean / Orang Mendekat';
        defaultTargets = ['person'];
    }
    
    // Provide clean visible offset default coordinates so second object is immediately visible in preview & fullscreen
    const cw = (aiDrawCanvas && aiDrawCanvas.width) ? aiDrawCanvas.width : 800;
    const ch = (aiDrawCanvas && aiDrawCanvas.height) ? aiDrawCanvas.height : 450;
    const offsetFactor = (newIdx - 1) * 0.08;
    const defNx = Math.min(0.55, 0.15 + offsetFactor);
    const defNy = Math.min(0.50, 0.20 + (offsetFactor * 0.7));
    const defNw = 0.35;
    const defNh = 0.40;

    const newZone = {
        id: 'zone_' + Date.now(),
        label: defaultLabel,
        color: nextColor.hex,
        themeColor: nextColor.theme,
        x: Math.round(defNx * cw),
        y: Math.round(defNy * ch),
        w: Math.round(defNw * cw),
        h: Math.round(defNh * ch),
        nx: defNx,
        ny: defNy,
        nw: defNw,
        nh: defNh,
        targets: defaultTargets
    };
    
    aiZones.push(newZone);
    aiActiveZoneIndex = aiZones.length - 1;
    
    syncActiveZoneUI();
    renderAIZonesChips();
    updateCoordStatusText();
    
    appendAITelemetry(`➕ Objek #${newIdx} ("${defaultLabel}") Ditambahkan! Kotak langsung terlihat di pratinjau. Anda dapat mengubah ukuran atau menggambarnya kembali.`, 'info');
    
    // Flash HUD hint
    const feedback = document.getElementById('ai-save-feedback');
    if (feedback) {
        feedback.textContent = `Objek #${newIdx} dibuat & aktif! Silakan atur atau simpan.`;
        feedback.style.color = '#38bdf8';
    }
}

function deleteCurrentZone() {
    if (!aiZones || aiZones.length === 0) return;
    const cur = aiZones[aiActiveZoneIndex];
    const label = cur ? cur.label : 'Objek';
    
    if (aiZones.length === 1) {
        // Just clear box instead of empty array
        aiZones[0].x = 0;
        aiZones[0].y = 0;
        aiZones[0].w = 0;
        aiZones[0].h = 0;
        aiZones[0].label = 'Area Deteksi Utama';
        aiGridRect = aiZones[0];
        syncActiveZoneUI();
        renderAIZonesChips();
        updateCoordStatusText();
        appendAITelemetry(`🗑️ Kotak objek utama dibersihkan.`, 'info');
        return;
    }
    
    aiZones.splice(aiActiveZoneIndex, 1);
    if (aiActiveZoneIndex >= aiZones.length) {
        aiActiveZoneIndex = aiZones.length - 1;
    }
    
    syncActiveZoneUI();
    renderAIZonesChips();
    updateCoordStatusText();
    appendAITelemetry(`🗑️ Objek "${label}" dihapus.`, 'info');
    
    // Auto sync deletion to backend
    saveAIGrid(true);
}

async function saveCurrentZone(silent = false) {
    if (!aiZones || aiZones.length === 0) {
        alert('Belum ada objek untuk disimpan. Silakan buat objek terlebih dahulu.');
        return;
    }
    
    const curZone = aiZones[aiActiveZoneIndex];
    if (curZone) {
        // Read current label from input
        const inp = document.getElementById('ai-zone-label-input');
        const fsInp = document.getElementById('ai-fs-zone-label');
        const activeLabel = (fsInp && isAIFullscreen) ? fsInp.value.trim() : (inp ? inp.value.trim() : '');
        if (activeLabel) curZone.label = activeLabel;
        
        // Read target checkboxes
        const targets = [];
        const chkCar = isAIFullscreen ? document.getElementById('ai-fs-target-car') : document.getElementById('ai-target-car');
        const chkMotor = isAIFullscreen ? document.getElementById('ai-fs-target-motor') : document.getElementById('ai-target-motor');
        const chkPerson = isAIFullscreen ? document.getElementById('ai-fs-target-person') : document.getElementById('ai-target-person');
        if (chkCar && chkCar.checked) targets.push('car');
        if (chkMotor && chkMotor.checked) targets.push('motorcycle');
        if (chkPerson && chkPerson.checked) targets.push('person');
        curZone.targets = targets;
        
        aiGridRect = curZone;
    }
    
    renderAIZonesChips();
    
    // Save to NVR backend persistently keeping the modal/fullscreen open
    await saveAIGrid(true);
    
    // Flash feedback
    const feedback = document.getElementById('ai-save-feedback');
    const msg = `✅ Objek #${aiActiveZoneIndex + 1} "${curZone ? curZone.label : ''}" berhasil disimpan!`;
    if (feedback) {
        feedback.textContent = msg;
        feedback.style.color = '#34d399';
    }
    appendAITelemetry(msg, 'success');
}

// Fullscreen Drawing Mode Management
function toggleAIFullscreenDrawing() {
    if (isAIFullscreen) {
        exitAIFullscreenDrawing();
    } else {
        enterAIFullscreenDrawing();
    }
}

function enterAIFullscreenDrawing() {
    const container = document.getElementById('ai-canvas-container');
    const hud = document.getElementById('ai-fullscreen-hud');
    const watermark = document.getElementById('ai-normal-preview-watermark');
    const btn = document.getElementById('btn-open-ai-fullscreen');
    if (!container) return;
    
    isAIFullscreen = true;
    container.classList.add('ai-fullscreen-active');
    
    // Reset zoom and pan whenever entering fullscreen
    aiZoomScale = 1.0;
    aiPanX = 0;
    aiPanY = 0;
    aiInteractionMode = 'draw';
    isAIPanning = false;
    isSpacePressed = false;
    isAIHudCollapsed = false;
    container.classList.remove('hud-collapsed');
    updateAIViewportTransform();
    
    if (hud) hud.style.display = 'flex';
    if (watermark) watermark.style.display = 'none';
    if (btn) btn.innerHTML = '🗗 Keluar Layar Penuh (ESC)';
    
    updateAICursor();
    
    // Trigger native browser fullscreen if permissible
    try {
        if (container.requestFullscreen) {
            container.requestFullscreen().catch(() => {});
        } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen();
        }
    } catch (e) {}
    
    // Sync current zone values into HUD inputs
    syncActiveZoneUI();
    renderAIZonesChips();
    syncMiniHudUI();
    
    // Re-initialize canvas to match full viewport dimensions
    setTimeout(() => {
        initAIDrawCanvas();
        updateCoordStatusText();
    }, 50);
    
    // Keyboard listeners
    window.addEventListener('keydown', handleAIFullscreenKey);
    window.addEventListener('keyup', handleAIFullscreenKeyUp);
    appendAITelemetry('🖥️ Mode Layar Penuh (Fullscreen) Diaktifkan. Tarik kotak pada video. Panel dapat diminimalkan lewat tombol [▲ Sembunyikan Panel].', 'info');
}

function exitAIFullscreenDrawing() {
    const container = document.getElementById('ai-canvas-container');
    const hud = document.getElementById('ai-fullscreen-hud');
    const miniHud = document.getElementById('ai-fullscreen-mini-hud');
    const watermark = document.getElementById('ai-normal-preview-watermark');
    const btn = document.getElementById('btn-open-ai-fullscreen');
    if (!container) return;
    
    isAIFullscreen = false;
    container.classList.remove('ai-fullscreen-active');
    container.classList.remove('hud-collapsed');
    
    // Reset zoom and pan
    aiZoomScale = 1.0;
    aiPanX = 0;
    aiPanY = 0;
    isAIPanning = false;
    isSpacePressed = false;
    isAIHudCollapsed = false;
    updateAIViewportTransform();
    
    if (hud) hud.style.display = 'none';
    if (miniHud) miniHud.style.display = 'none';
    if (watermark) watermark.style.display = 'flex';
    if (btn) btn.innerHTML = '<span style="font-size:1.05rem;">⛶</span> Buka Mode Layar Penuh (Edit & Gambar Objek)';
    if (aiDrawCanvas) aiDrawCanvas.style.cursor = 'default';
    
    try {
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        } else if (document.webkitFullscreenElement && document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    } catch (e) {}
    
    window.removeEventListener('keydown', handleAIFullscreenKey);
    window.removeEventListener('keyup', handleAIFullscreenKeyUp);
    
    syncActiveZoneUI();
    renderAIZonesChips();
    
    setTimeout(() => {
        initAIDrawCanvas();
        updateCoordStatusText();
    }, 50);
    
    appendAITelemetry('🗗 Kembali ke Mode Pratinjau Saja.', 'info');
}

function handleAIFullscreenKey(e) {
    if (!isAIFullscreen) return;
    
    if (e.key === 'Escape') {
        exitAIFullscreenDrawing();
        return;
    }
    
    // Don't intercept single-letter shortcuts if typing into an input
    const activeEl = document.activeElement;
    const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
    if (isTyping) return;
    
    if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        toggleAIHudCollapse();
    } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        setAIInteractionMode('draw');
    } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setAIInteractionMode('pan');
    } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomInAI();
    } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomOutAI();
    } else if (e.key === '0') {
        e.preventDefault();
        resetAIZoom();
    } else if (e.key === ' ' && !isSpacePressed) {
        e.preventDefault();
        isSpacePressed = true;
        updateAICursor();
    }
}

function handleAIFullscreenKeyUp(e) {
    if (!isAIFullscreen) return;
    if (e.key === ' ') {
        isSpacePressed = false;
        updateAICursor();
    }
}

function updateAIViewportTransform() {
    const stage = document.getElementById('ai-viewport-stage');
    if (stage) {
        stage.style.transform = `translate(${aiPanX}px, ${aiPanY}px) scale(${aiZoomScale})`;
    }
    
    const zoomPct = Math.round(aiZoomScale * 100) + '%';
    const fsZoomLabel = document.getElementById('ai-fs-zoom-level');
    const miniZoomLabel = document.getElementById('ai-mini-zoom-level');
    if (fsZoomLabel) fsZoomLabel.textContent = zoomPct;
    if (miniZoomLabel) miniZoomLabel.textContent = zoomPct;
}

function clampAIPan() {
    const container = document.getElementById('ai-canvas-container');
    if (!container) return;
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 450;
    
    const boundX = Math.max(w * (aiZoomScale - 1), 0) + (w * 0.45);
    const boundY = Math.max(h * (aiZoomScale - 1), 0) + (h * 0.45);
    
    if (aiZoomScale <= 1.0) {
        aiPanX = Math.max(-w * 0.35, Math.min(w * 0.35, aiPanX));
        aiPanY = Math.max(-h * 0.35, Math.min(h * 0.35, aiPanY));
    } else {
        aiPanX = Math.max(-boundX, Math.min(boundX, aiPanX));
        aiPanY = Math.max(-boundY, Math.min(boundY, aiPanY));
    }
}

function resetAIZoom() {
    aiZoomScale = 1.0;
    aiPanX = 0;
    aiPanY = 0;
    updateAIViewportTransform();
    appendAITelemetry('🔄 Zoom & Posisi Layar Direset ke 100%', 'info');
}

function zoomInAI(step = 0.25) {
    aiZoomScale = Math.min(4.0, Math.round((aiZoomScale + step) * 100) / 100);
    clampAIPan();
    updateAIViewportTransform();
    appendAITelemetry(`🔍 Zoom In: ${Math.round(aiZoomScale * 100)}%`, 'info');
}

function zoomOutAI(step = 0.25) {
    aiZoomScale = Math.max(0.75, Math.round((aiZoomScale - step) * 100) / 100);
    if (aiZoomScale <= 1.0 && Math.abs(aiPanX) < 25 && Math.abs(aiPanY) < 25) {
        aiPanX = 0;
        aiPanY = 0;
    }
    clampAIPan();
    updateAIViewportTransform();
    appendAITelemetry(`🔍 Zoom Out: ${Math.round(aiZoomScale * 100)}%`, 'info');
}

function toggleAIHudCollapse(forceState = null) {
    const container = document.getElementById('ai-canvas-container');
    if (!container) return;
    
    if (forceState !== null) {
        isAIHudCollapsed = forceState;
    } else {
        isAIHudCollapsed = !isAIHudCollapsed;
    }
    
    if (isAIHudCollapsed) {
        container.classList.add('hud-collapsed');
        appendAITelemetry('▲ Panel Layar Penuh diminimalkan. Tampilan video 100% bebas hambatan.', 'info');
    } else {
        container.classList.remove('hud-collapsed');
        appendAITelemetry('▼ Panel Layar Penuh dibuka kembali.', 'info');
    }
    syncMiniHudUI();
}

function syncMiniHudUI() {
    const curZone = (aiZones && aiZones[aiActiveZoneIndex]) ? aiZones[aiActiveZoneIndex] : null;
    const miniName = document.getElementById('ai-mini-zone-name');
    const miniDot = document.getElementById('ai-mini-zone-dot');
    const miniBadge = document.getElementById('ai-mini-zone-badge');
    
    if (curZone) {
        if (miniName) miniName.textContent = curZone.label || `Objek #${aiActiveZoneIndex + 1}`;
        if (miniDot) miniDot.style.background = curZone.color || '#3b82f6';
        if (miniBadge) miniBadge.style.borderColor = curZone.color || '#3b82f6';
    }
    
    const isPan = (aiInteractionMode === 'pan');
    const toolDrawBtn = document.getElementById('ai-tool-draw-btn');
    const toolPanBtn = document.getElementById('ai-tool-pan-btn');
    const miniDrawBtn = document.getElementById('ai-mini-tool-draw');
    const miniPanBtn = document.getElementById('ai-mini-tool-pan');
    
    if (toolDrawBtn) {
        toolDrawBtn.style.background = !isPan ? '#2563eb' : 'transparent';
        toolDrawBtn.style.color = !isPan ? 'white' : '#94a3b8';
        toolDrawBtn.style.borderColor = !isPan ? '#60a5fa' : 'transparent';
    }
    if (toolPanBtn) {
        toolPanBtn.style.background = isPan ? '#2563eb' : 'transparent';
        toolPanBtn.style.color = isPan ? 'white' : '#94a3b8';
        toolPanBtn.style.borderColor = isPan ? '#60a5fa' : 'transparent';
    }
    if (miniDrawBtn) {
        miniDrawBtn.style.background = !isPan ? '#2563eb' : 'transparent';
        miniDrawBtn.style.color = !isPan ? 'white' : '#94a3b8';
    }
    if (miniPanBtn) {
        miniPanBtn.style.background = isPan ? '#2563eb' : 'transparent';
        miniPanBtn.style.color = isPan ? 'white' : '#94a3b8';
    }
    
    updateAICursor();
}

function setAIInteractionMode(mode) {
    aiInteractionMode = mode;
    syncMiniHudUI();
    if (mode === 'pan') {
        appendAITelemetry('✋ Mode Geser Video (Pan) aktif. Seret mouse atau layar untuk menggeser video.', 'info');
    } else {
        appendAITelemetry('✏️ Mode Gambar Objek aktif. Tarik kursor untuk membuat kotak area deteksi.', 'info');
    }
}

function updateAICursor() {
    if (!aiDrawCanvas) return;
    if (!isAIFullscreen) {
        aiDrawCanvas.style.cursor = 'default';
        return;
    }
    if (isAIPanning) {
        aiDrawCanvas.style.cursor = 'grabbing';
    } else if (aiInteractionMode === 'pan' || isSpacePressed) {
        aiDrawCanvas.style.cursor = 'grab';
    } else {
        aiDrawCanvas.style.cursor = 'crosshair';
    }
}

window.toggleAIHudCollapse = toggleAIHudCollapse;
window.setAIInteractionMode = setAIInteractionMode;
window.zoomInAI = zoomInAI;
window.zoomOutAI = zoomOutAI;
window.resetAIZoom = resetAIZoom;

function setZoneColor(hex, themeRgba, skipTelemetry = false) {
    aiActiveZoneColor = hex;
    aiActiveZoneThemeColor = themeRgba;
    
    const cur = (aiZones && aiZones[aiActiveZoneIndex]) ? aiZones[aiActiveZoneIndex] : aiGridRect;
    if (cur) {
        cur.color = hex;
        cur.themeColor = themeRgba;
    }
    if (aiGridRect) {
        aiGridRect.color = hex;
        aiGridRect.themeColor = themeRgba;
    }
    
    // Update active highlight border on color buttons
    document.querySelectorAll('.ai-zone-color-btn').forEach(btn => {
        if (btn.getAttribute('data-color') === hex) {
            btn.style.borderColor = '#ffffff';
            btn.style.boxShadow = '0 0 8px ' + hex;
            btn.style.transform = 'scale(1.15)';
        } else {
            btn.style.borderColor = 'transparent';
            btn.style.boxShadow = 'none';
            btn.style.transform = 'scale(1)';
        }
    });
    
    renderAIZonesChips();
    if (!skipTelemetry) {
        appendAITelemetry(`🎨 Warna Objek #${aiActiveZoneIndex + 1} diubah ke: ${hex}`, 'info');
    }
}

function updateActiveZoneLabel(text) {
    const trimmed = text.trim();
    const cur = (aiZones && aiZones[aiActiveZoneIndex]) ? aiZones[aiActiveZoneIndex] : aiGridRect;
    if (cur) {
        cur.label = trimmed || `Objek #${aiActiveZoneIndex + 1}`;
    }
    if (aiGridRect) {
        aiGridRect.label = trimmed || `Objek #${aiActiveZoneIndex + 1}`;
    }
    
    // Sync to other input if changed in one place
    const inp = document.getElementById('ai-zone-label-input');
    const fsInp = document.getElementById('ai-fs-zone-label');
    if (inp && inp.value !== trimmed) inp.value = trimmed;
    if (fsInp && fsInp.value !== trimmed) fsInp.value = trimmed;
    
    renderAIZonesChips();
    syncMiniHudUI();
}

function updateActiveZoneTargets(isFs = false) {
    const cur = (aiZones && aiZones[aiActiveZoneIndex]) ? aiZones[aiActiveZoneIndex] : aiGridRect;
    if (!cur) return;
    
    const targets = [];
    const chkCar = isFs ? document.getElementById('ai-fs-target-car') : document.getElementById('ai-target-car');
    const chkMotor = isFs ? document.getElementById('ai-fs-target-motor') : document.getElementById('ai-target-motor');
    const chkPerson = isFs ? document.getElementById('ai-fs-target-person') : document.getElementById('ai-target-person');
    
    if (chkCar && chkCar.checked) targets.push('car');
    if (chkMotor && chkMotor.checked) targets.push('motorcycle');
    if (chkPerson && chkPerson.checked) targets.push('person');
    
    cur.targets = targets;
    
    // Cross-sync to other panel's checkboxes
    const otherCar = isFs ? document.getElementById('ai-target-car') : document.getElementById('ai-fs-target-car');
    const otherMotor = isFs ? document.getElementById('ai-target-motor') : document.getElementById('ai-fs-target-motor');
    const otherPerson = isFs ? document.getElementById('ai-target-person') : document.getElementById('ai-fs-target-person');
    if (otherCar) otherCar.checked = targets.includes('car');
    if (otherMotor) otherMotor.checked = targets.includes('motorcycle');
    if (otherPerson) otherPerson.checked = targets.includes('person');
}

function updateCamAIActiveState() {
    const chk = document.getElementById('ai-cam-active-toggle');
    const badge = document.getElementById('ai-cam-active-badge');
    const isActive = chk ? chk.checked : true;
    if (badge) {
        if (isActive) {
            badge.textContent = 'AKTIF';
            badge.style.background = 'rgba(34,197,94,0.2)';
            badge.style.color = '#34d399';
            badge.style.borderColor = 'rgba(34,197,94,0.4)';
        } else {
            badge.textContent = 'NONAKTIF';
            badge.style.background = 'rgba(239,68,68,0.2)';
            badge.style.color = '#ef4444';
            badge.style.borderColor = 'rgba(239,68,68,0.4)';
        }
    }
    appendAITelemetry(`⚙️ Status AI Kamera ${aiCurrentCam ? aiCurrentCam.name : ''}: ${isActive ? 'AKTIF' : 'NONAKTIF'}`, 'info');
}

function setUniversalPreset(preset) {
    return setAIGridPreset(preset);
}

function setAIGridPreset(preset) {
    if (!aiDrawCanvas) initAIDrawCanvas();
    if (!aiDrawCanvas) return;
    const cw = aiDrawCanvas.width || 800;
    const ch = aiDrawCanvas.height || 450;
    
    let x = 0, y = 0, w = 0, h = 0, label = 'Area Deteksi';
    let nx = 0, ny = 0, nw = 0, nh = 0;
    
    if (preset === 'spbu') {
        nx = 0.30; ny = 0.25; nw = 0.48; nh = 0.65;
        label = '⛽ Area Pompa / Dispenser BBM';
    } else if (preset === 'parking') {
        nx = 0.15; ny = 0.35; nw = 0.70; nh = 0.60;
        label = '🅿️ Area Parkir Kendaraan';
    } else if (preset === 'gate') {
        nx = 0.12; ny = 0.40; nw = 0.76; nh = 0.55;
        label = '🚪 Pintu Masuk / Gerbang Utama';
    } else if (preset === 'cashier') {
        nx = 0.35; ny = 0.25; nw = 0.38; nh = 0.55;
        label = '💳 Meja Kasir / Transaksi';
    } else if (preset === 'center') {
        nx = 0.20; ny = 0.20; nw = 0.60; nh = 0.60;
        label = '🎯 Area Fokus Tengah (ROI)';
    } else if (preset === 'full') {
        nx = 0.01; ny = 0.01; nw = 0.98; nh = 0.98;
        label = '🔲 Seluruh Area Pantauan (Full Frame)';
    }
    
    x = Math.round(nx * cw);
    y = Math.round(ny * ch);
    w = Math.round(nw * cw);
    h = Math.round(nh * ch);
    
    const cur = (aiZones && aiZones[aiActiveZoneIndex]) ? aiZones[aiActiveZoneIndex] : aiGridRect;
    if (cur) {
        cur.x = x;
        cur.y = y;
        cur.w = w;
        cur.h = h;
        cur.nx = nx;
        cur.ny = ny;
        cur.nw = nw;
        cur.nh = nh;
        cur.label = label;
    }
    aiGridRect = cur;
    
    syncActiveZoneUI();
    renderAIZonesChips();
    updateCoordStatusText();
    appendAITelemetry(`📐 Preset Area "${label}" Diterapkan ke Objek #${aiActiveZoneIndex + 1}.`, 'info');
}

function clearAIGrid() {
    const cur = (aiZones && aiZones[aiActiveZoneIndex]) ? aiZones[aiActiveZoneIndex] : aiGridRect;
    if (cur) {
        cur.x = 0;
        cur.y = 0;
        cur.w = 0;
        cur.h = 0;
        cur.nx = 0;
        cur.ny = 0;
        cur.nw = 0;
        cur.nh = 0;
    }
    aiGridRect = cur;
    updateCoordStatusText();
    renderAIZonesChips();
    const feedback = document.getElementById('ai-save-feedback');
    if (feedback) feedback.textContent = `Kotak Objek #${aiActiveZoneIndex + 1} dibersihkan.`;
    appendAITelemetry(`🗑️ Kotak Objek #${aiActiveZoneIndex + 1} dibersihkan.`, 'info');
}

function restoreAIGridFromData(grid) {
    if (!aiDrawCanvas || !grid) return;
    const cw = aiDrawCanvas.width || 800;
    const ch = aiDrawCanvas.height || 450;
    
    // Check if multi-zone array exists
    if (Array.isArray(grid.zones) && grid.zones.length > 0) {
        aiZones = grid.zones.map((z, idx) => {
            let zx = Number(z.x) || 0;
            let zy = Number(z.y) || 0;
            let zw = Number(z.w) || 0;
            let zh = Number(z.h) || 0;
            
            let nx = 0, ny = 0, nw = 0, nh = 0;
            if (zx <= 1 && zw <= 1 && (zx > 0 || zw > 0)) {
                nx = zx; ny = zy; nw = zw; nh = zh;
            } else if (cw > 0 && ch > 0) {
                nx = zx / cw; ny = zy / ch; nw = zw / cw; nh = zh / ch;
            }
            
            return {
                id: z.id || ('zone_' + (idx + 1)),
                label: z.label || `Objek #${idx + 1}`,
                color: z.color || '#3b82f6',
                themeColor: z.themeColor || 'rgba(59,130,246,0.92)',
                x: Math.round(nx * cw),
                y: Math.round(ny * ch),
                w: Math.round(nw * cw),
                h: Math.round(nh * ch),
                nx: nx,
                ny: ny,
                nw: nw,
                nh: nh,
                targets: z.targets || ['car', 'motorcycle', 'person']
            };
        });
        aiActiveZoneIndex = 0;
    } else {
        // Single zone fallback
        let x = Number(grid.x) || 0;
        let y = Number(grid.y) || 0;
        let w = Number(grid.w) || 0;
        let h = Number(grid.h) || 0;
        
        let nx = 0, ny = 0, nw = 0, nh = 0;
        if (x <= 1 && w <= 1 && (x > 0 || w > 0)) {
            nx = x; ny = y; nw = w; nh = h;
        } else if (cw > 0 && ch > 0) {
            nx = x / cw; ny = y / ch; nw = w / cw; nh = h / ch;
        }
        
        const zoneLabel = grid.label || '⛽ Area Pompa BBM';
        const zoneColor = grid.color || '#3b82f6';
        const zoneTheme = grid.themeColor || 'rgba(59,130,246,0.92)';
        
        aiZones = [
            {
                id: 'zone_1',
                label: zoneLabel,
                color: zoneColor,
                themeColor: zoneTheme,
                x: Math.round(nx * cw),
                y: Math.round(ny * ch),
                w: Math.round(nw * cw),
                h: Math.round(nh * ch),
                nx: nx,
                ny: ny,
                nw: nw,
                nh: nh,
                targets: ['car', 'motorcycle', 'person']
            }
        ];
        aiActiveZoneIndex = 0;
    }
    
    syncActiveZoneUI();
    renderAIZonesChips();
    updateCoordStatusText();
    
    // Set AI active toggle
    const chkActive = document.getElementById('ai-cam-active-toggle');
    if (chkActive && typeof grid.enabled !== 'undefined') {
        chkActive.checked = !!grid.enabled;
        updateCamAIActiveState();
    }
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
    
    appendAITelemetry(`📡 Mengirim sinyal uji coba ke ESP8266: ${target} (${method})`, 'info');
    
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
            appendAITelemetry(`✅ ESP8266 merespons sinyal alarm (${data.url}) dengan status HTTP ${data.status}!`, 'success');
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
        appendAITelemetry(`❌ Gagal menghubungi ESP8266: ${e.message}`, 'alarm');
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
 * Arch3r NVR (Ver. 10.0.0) - ESP8266 IoT Alarm & Siren Receiver
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

// SAVE AI CONFIGURATION (MULTI-ZONES ROI + PROMPT RULES + ESP8266)
async function saveAIGrid(keepOpen = false) {
    const select = document.getElementById('ai-cam-select');
    const camId = select ? select.value : null;
    const btnSave = document.getElementById('btn-save-ai-grid');
    const feedback = document.getElementById('ai-save-feedback');
    
    if (!camId) {
        alert('Pilih target kamera terlebih dahulu!');
        return;
    }
    
    const cw = (aiDrawCanvas && aiDrawCanvas.width) || 800;
    const ch = (aiDrawCanvas && aiDrawCanvas.height) || 450;
    
    // Sync current active zone inputs before saving
    if (aiZones && aiZones[aiActiveZoneIndex]) {
        const curZone = aiZones[aiActiveZoneIndex];
        const inp = document.getElementById('ai-zone-label-input');
        const fsInp = document.getElementById('ai-fs-zone-label');
        const activeLabel = (fsInp && isAIFullscreen) ? fsInp.value.trim() : (inp ? inp.value.trim() : '');
        if (activeLabel) curZone.label = activeLabel;
        
        const targets = [];
        const chkCar = isAIFullscreen ? document.getElementById('ai-fs-target-car') : document.getElementById('ai-target-car');
        const chkMotor = isAIFullscreen ? document.getElementById('ai-fs-target-motor') : document.getElementById('ai-target-motor');
        const chkPerson = isAIFullscreen ? document.getElementById('ai-fs-target-person') : document.getElementById('ai-target-person');
        if (chkCar && chkCar.checked) targets.push('car');
        if (chkMotor && chkMotor.checked) targets.push('motorcycle');
        if (chkPerson && chkPerson.checked) targets.push('person');
        curZone.targets = targets;
        
        aiGridRect = curZone;
    }
    
    // Normalize zones array for backend
    const normalizedZones = (aiZones && aiZones.length > 0) ? aiZones.map(z => ({
        id: z.id || ('zone_' + Math.random().toString(36).substring(2, 7)),
        label: z.label || 'Area Deteksi',
        color: z.color || '#3b82f6',
        themeColor: z.themeColor || 'rgba(59,130,246,0.92)',
        x: parseFloat(((z.x || 0) / cw).toFixed(4)),
        y: parseFloat(((z.y || 0) / ch).toFixed(4)),
        w: parseFloat(((z.w || 0) / cw).toFixed(4)),
        h: parseFloat(((z.h || 0) / ch).toFixed(4)),
        targets: z.targets || ['car', 'motorcycle', 'person']
    })) : [];
    
    const curActive = (aiZones && aiZones[aiActiveZoneIndex]) ? aiZones[aiActiveZoneIndex] : aiGridRect;
    
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
    
    // Read AI Prompt Rules
    const promptText = document.getElementById('ai-prompt-input')?.value.trim() || '';
    const targetClasses = [];
    if (document.getElementById('ai-filter-person')?.checked) targetClasses.push('person');
    if (document.getElementById('ai-filter-motorcycle')?.checked) targetClasses.push('motorcycle');
    if (document.getElementById('ai-filter-car')?.checked) targetClasses.push('car');
    const requireStationary = (document.getElementById('ai-motion-condition')?.value === 'stationary_only');
    const minDwellSec = parseInt(document.getElementById('ai-dwell-seconds')?.value, 10) || 3;
    const confidenceMin = (parseInt(document.getElementById('ai-confidence-min')?.value, 10) || 75) / 100;
    
    const promptRules = {
        prompt_text: promptText,
        preset_id: 'custom_zone',
        target_classes: targetClasses,
        require_stationary: requireStationary,
        min_dwell_sec: minDwellSec,
        confidence_min: confidenceMin
    };
    
    const zoneLabel = curActive.label || document.getElementById('ai-zone-label-input')?.value?.trim() || 'Area Deteksi Utama';
    const zoneColor = curActive.color || aiActiveZoneColor || '#3b82f6';
    const zoneTheme = curActive.themeColor || aiActiveZoneThemeColor || 'rgba(59,130,246,0.92)';
    const isCamAIActive = document.getElementById('ai-cam-active-toggle') ? document.getElementById('ai-cam-active-toggle').checked : true;
    
    const payload = {
        camera_id: camId,
        x: parseFloat(((curActive.x || 0) / cw).toFixed(4)),
        y: parseFloat(((curActive.y || 0) / ch).toFixed(4)),
        w: parseFloat(((curActive.w || 0) / cw).toFixed(4)),
        h: parseFloat(((curActive.h || 0) / ch).toFixed(4)),
        pixel_width: cw,
        pixel_height: ch,
        enabled: isCamAIActive && (normalizedZones.some(z => z.w > 0 && z.h > 0)),
        ai_active: isCamAIActive,
        label: zoneLabel,
        color: zoneColor,
        themeColor: zoneTheme,
        zones: normalizedZones,
        active_zone_index: aiActiveZoneIndex,
        esp_config: espConfig,
        prompt_rules: promptRules,
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
    
    appendAITelemetry(`💾 Menyimpan ${normalizedZones.length} objek ROI, Prompt Rules & ESP8266 ke NVR...`, 'info');
    
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
                feedback.textContent = `✅ Berhasil disimpan (${normalizedZones.length} Objek Terdata)!`;
                feedback.style.color = '#10b981';
            }
            appendAITelemetry(`✅ Konfigurasi ${normalizedZones.length} Objek ROI, Prompt Rules & ESP8266 berhasil disimpan!`, 'success');
            
            if (!keepOpen) {
                alert(`Konfigurasi ${normalizedZones.length} Area Objek Deteksi, Prompt Rules & ESP8266 berhasil disimpan secara persisten ke NVR!`);
                setTimeout(() => {
                    closeAIGridModal();
                }, 600);
            }
        } else {
            throw new Error(data.error || 'Server error ' + res.status);
        }
    } catch (e) {
        console.error('[AI Grid Save Error]', e);
        if (feedback) {
            feedback.textContent = '❌ Gagal: ' + e.message;
            feedback.style.color = '#ef4444';
        }
        appendAITelemetry('❌ Gagal menyimpan konfigurasi: ' + e.message, 'alarm');
        alert('Gagal menyimpan konfigurasi: ' + e.message);
    } finally {
        if (btnSave) {
            btnSave.disabled = false;
            btnSave.textContent = '💾 Simpan Konfigurasi AI Grid';
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

// ============================================================================
// SIMULATION LAB SANDBOX (ISOLATED VISUAL TESTING FOR AI LOGIC & SPBU SCENARIO)
// ============================================================================
let simSandboxCanvas = null;
let simSandboxCtx = null;
let simCurrentScenario = 'refuel'; // 'refuel', 'queue', 'walkby'
let simPlaybackPaused = false;
let simScenarioTimer = 0;
let simDwellTimer = 0;
let simLastTelemetryTick = 0;

let simObjects = {
    vehicle: { id: 201, type: 'motorcycle', label: '🛵 Sepeda Motor', x: 20, y: 190, vx: 2.5, vy: 0, w: 90, h: 60, stationary: false, conf: 0.95 },
    person: { id: 101, type: 'person', label: '👤 Pengendara/Pelanggan', x: 55, y: 165, vx: 2.5, vy: 0, w: 45, h: 95, stationary: false, conf: 0.97 },
    car: { id: 301, type: 'car', label: '🚗 Mobil Antre', x: -140, y: 200, vx: 2.0, vy: 0, w: 120, h: 65, stationary: false, conf: 0.92 }
};

function initSimSandbox() {
    const canvas = document.getElementById('ai-sim-sandbox-canvas');
    if (!canvas) return;
    simSandboxCanvas = canvas;
    simSandboxCtx = canvas.getContext('2d');
    
    const container = canvas.parentElement;
    if (container) {
        const rect = container.getBoundingClientRect();
        canvas.width = Math.max(Math.round(rect.width) || 750, 480);
        canvas.height = Math.max(Math.round(rect.height) || 380, 260);
    }
}

function setSimScenario(scen) {
    simCurrentScenario = scen;
    simScenarioTimer = 0;
    simDwellTimer = 0;
    
    const btns = {
        'refuel': document.getElementById('sim-btn-refuel'),
        'queue': document.getElementById('sim-btn-queue'),
        'walkby': document.getElementById('sim-btn-walkby')
    };
    
    Object.keys(btns).forEach(k => {
        const b = btns[k];
        if (b) {
            if (k === scen) {
                b.style.color = '#f59e0b';
                b.style.borderColor = 'rgba(245,158,11,0.5)';
                b.style.background = 'rgba(245,158,11,0.15)';
            } else {
                b.style.color = 'var(--text)';
                b.style.borderColor = 'var(--border)';
                b.style.background = 'none';
            }
        }
    });

    restartSimScenario();
}

function toggleSimPlayback() {
    simPlaybackPaused = !simPlaybackPaused;
    const btn = document.getElementById('btn-sim-playpause');
    if (btn) {
        btn.innerHTML = simPlaybackPaused ? '▶️ Lanjutkan' : '⏸️ Jeda';
        btn.style.color = simPlaybackPaused ? '#34d399' : 'var(--text)';
    }
}

function restartSimScenario() {
    simScenarioTimer = 0;
    simDwellTimer = 0;
    
    if (simCurrentScenario === 'refuel') {
        simObjects.vehicle = { id: 201, type: 'motorcycle', label: '🛵 Sepeda Motor', x: -80, y: 190, vx: 2.2, vy: 0, w: 90, h: 60, stationary: false, conf: 0.95 };
        simObjects.person = { id: 101, type: 'person', label: '👤 Pengendara', x: -45, y: 165, vx: 2.2, vy: 0, w: 45, h: 95, stationary: false, conf: 0.97 };
    } else if (simCurrentScenario === 'queue') {
        simObjects.vehicle = { id: 201, type: 'motorcycle', label: '🛵 Motor Sedang Mengisi', x: 380, y: 190, vx: 0, vy: 0, w: 90, h: 60, stationary: true, conf: 0.95 };
        simObjects.person = { id: 101, type: 'person', label: '👤 Operator SPBU', x: 415, y: 165, vx: 0, vy: 0, w: 45, h: 95, stationary: true, conf: 0.98 };
        simObjects.car = { id: 301, type: 'car', label: '🚗 Mobil Mengantre', x: -120, y: 200, vx: 2.4, vy: 0, w: 125, h: 65, stationary: false, conf: 0.93 };
    } else if (simCurrentScenario === 'walkby') {
        simObjects.person = { id: 108, type: 'person', label: '🚶 Pejalan Cepat', x: -50, y: 180, vx: 3.8, vy: 0, w: 45, h: 95, stationary: false, conf: 0.91 };
    }
    
    const banner = document.getElementById('ai-sim-alarm-banner');
    if (banner) banner.style.display = 'none';
}

function renderSimSandboxFrame() {
    if (!simSandboxCanvas || !simSandboxCtx) return;
    const ctx = simSandboxCtx;
    const w = simSandboxCanvas.width;
    const h = simSandboxCanvas.height;
    
    ctx.clearRect(0, 0, w, h);
    
    // Background night station driveway
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#0a101d');
    bgGrad.addColorStop(1, '#030712');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);
    
    // Driveway ground
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, h * 0.44, w, h * 0.56);
    
    // Canopy roof line
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, h * 0.16);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(0, h * 0.16 - 5, w, 5);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(0, h * 0.16, w, 3);
    
    // Canopy pillars
    ctx.fillStyle = '#334155';
    ctx.fillRect(w * 0.15, h * 0.16, 16, h * 0.35);
    ctx.fillRect(w * 0.85, h * 0.16, 16, h * 0.35);
    
    // SPBU Gas Pump Dispenser Body
    const pumpX = w * 0.56;
    const pumpY = h * 0.36;
    const pumpW = 54;
    const pumpH = 105;
    
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.fillRect(pumpX, pumpY, pumpW, pumpH);
    ctx.strokeRect(pumpX, pumpY, pumpW, pumpH);
    
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(pumpX, pumpY, pumpW, 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8.5px monospace';
    ctx.fillText('SPBU BBM', pumpX + 6, pumpY + 13);
    
    // Digital Meter
    ctx.fillStyle = '#020617';
    ctx.fillRect(pumpX + 6, pumpY + 24, pumpW - 12, 26);
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 8px monospace';
    const liters = (simDwellTimer * 1.5).toFixed(1);
    ctx.fillText(`L: ${liters}`, pumpX + 8, pumpY + 35);
    ctx.fillText(`Rp: ${Math.round(liters * 10000)}`, pumpX + 8, pumpY + 45);
    
    // Dispenser Hose
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(pumpX + 4, pumpY + 56);
    ctx.quadraticCurveTo(pumpX - 18, pumpY + 75, pumpX - 22, pumpY + 68);
    ctx.stroke();
    
    // Ground markings (Yellow bay)
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(w * 0.28, h * 0.50); ctx.lineTo(w * 0.72, h * 0.50);
    ctx.moveTo(w * 0.24, h * 0.88); ctx.lineTo(w * 0.76, h * 0.88);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Define Simulation ROI Area (Fueling Zone)
    const roiX = w * 0.30;
    const roiY = h * 0.30;
    const roiW = w * 0.45;
    const roiH = h * 0.60;
    
    let targetColliding = false;
    let stationaryInside = false;
    let currentTargets = [];
    
    // Advance physics if not paused
    if (!simPlaybackPaused) {
        simScenarioTimer += 0.04;
        
        if (simCurrentScenario === 'refuel') {
            const v = simObjects.vehicle;
            const p = simObjects.person;
            currentTargets = [v, p];
            
            if (v.x < pumpX - 70) {
                // Moving into pump
                v.x += v.vx;
                p.x += p.vx;
                v.stationary = false;
                p.stationary = false;
            } else if (simDwellTimer < 7.5) {
                // Stopped at pump (Refueling)
                v.stationary = true;
                p.stationary = true;
                p.x = pumpX - 20;
                p.y = pumpY + 15;
                simDwellTimer += 0.04;
            } else {
                // Refueling finished, leaving
                v.x += 2.6;
                p.x += 2.6;
                v.stationary = false;
                p.stationary = false;
                if (v.x > w + 60) {
                    restartSimScenario();
                }
            }
        } else if (simCurrentScenario === 'queue') {
            const v = simObjects.vehicle;
            const p = simObjects.person;
            const c = simObjects.car;
            currentTargets = [v, p, c];
            
            if (c.x < w * 0.18) {
                c.x += c.vx;
                c.stationary = false;
            } else {
                c.stationary = true; // Stopped in line
                simDwellTimer += 0.04;
                if (simDwellTimer > 9.0) {
                    restartSimScenario();
                }
            }
        } else if (simCurrentScenario === 'walkby') {
            const p = simObjects.person;
            currentTargets = [p];
            p.x += p.vx;
            p.stationary = false;
            if (p.x > w + 60) {
                restartSimScenario();
            }
        }
    }
    
    // Evaluate collision with ROI
    currentTargets.forEach(t => {
        const cx = t.x + t.w / 2;
        const cy = t.y + t.h * 0.7;
        if (cx >= roiX && cx <= roiX + roiW && cy >= roiY && cy <= roiY + roiH) {
            targetColliding = true;
            if (t.stationary) stationaryInside = true;
        }
    });
    
    // Rule evaluation: requires stationary and dwell >= 3s
    const promptSatisfied = targetColliding && stationaryInside && (simDwellTimer >= 3.0);
    
    // Draw ROI Box
    ctx.fillStyle = promptSatisfied ? 'rgba(239, 68, 68, 0.28)' : (targetColliding ? 'rgba(234, 179, 8, 0.2)' : 'rgba(59, 130, 246, 0.15)');
    ctx.fillRect(roiX, roiY, roiW, roiH);
    ctx.strokeStyle = promptSatisfied ? '#ef4444' : (targetColliding ? '#eab308' : '#3b82f6');
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 5]);
    ctx.strokeRect(roiX, roiY, roiW, roiH);
    ctx.setLineDash([]);
    
    // Floating ROI label
    ctx.fillStyle = promptSatisfied ? 'rgba(239, 68, 68, 0.95)' : (targetColliding ? 'rgba(234, 179, 8, 0.95)' : 'rgba(37, 99, 235, 0.9)');
    ctx.fillRect(roiX, roiY - 18, Math.min(roiW, 210), 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    const tag = promptSatisfied ? `🚨 ALARM SPBU (BERHENTI ${simDwellTimer.toFixed(1)}s)` : (targetColliding ? `⏳ DWELL: ${simDwellTimer.toFixed(1)}s / 3.0s` : '🎯 AREA GRID ROI (DISPENSER BBM)');
    ctx.fillText(tag, roiX + 5, roiY - 5);
    
    // Draw Simulated Objects
    currentTargets.forEach(t => {
        if (t.type === 'motorcycle' || t.type === 'car') {
            drawSimVehicle(ctx, t, promptSatisfied, targetColliding);
        } else if (t.type === 'person') {
            drawSimPerson(ctx, t, promptSatisfied, targetColliding);
        }
    });
    
    // Sim Alarm Banner
    const alarmBanner = document.getElementById('ai-sim-alarm-banner');
    if (alarmBanner) {
        if (promptSatisfied) {
            alarmBanner.style.display = 'block';
            alarmBanner.innerHTML = `⛽ SYARAT PROMPT TERPENUHI: ORANG BERHENTI MENGISI BENSIN (${simDwellTimer.toFixed(1)}s)!`;
        } else {
            alarmBanner.style.display = 'none';
        }
    }
    
    // Update Telemetry log in Sim tab (~1 sec tick)
    const now = Date.now();
    if (now - simLastTelemetryTick > 900) {
        simLastTelemetryTick = now;
        updateSimTelemetryUI(currentTargets, promptSatisfied, targetColliding, stationaryInside);
    }
}

function updateSimTelemetryUI(targets, promptMet, colliding, stationary) {
    const logContainer = document.getElementById('sim-telemetry-text-log');
    const jsonPreview = document.getElementById('sim-json-payload-preview');
    const countBadge = document.getElementById('sim-target-count');
    const dispatchBadge = document.getElementById('sim-esp-dispatch-badge');
    
    if (countBadge) {
        countBadge.textContent = `${targets.length} Target Terdeteksi`;
    }
    
    if (logContainer) {
        const time = new Date().toTimeString().split(' ')[0];
        targets.forEach(t => {
            const row = document.createElement('div');
            const stateStr = t.stationary ? 'BERHENTI (DWELL)' : 'BERGERAK';
            const icon = t.type === 'person' ? '👤' : (t.type === 'motorcycle' ? '🛵' : '🚗');
            row.textContent = `[${time}] ${icon} ${t.type} #${t.id} x:${Math.round(t.x)} y:${Math.round(t.y)} | ${stateStr} (${Math.round(t.conf * 100)}%)`;
            if (promptMet && t.stationary) {
                row.style.color = '#ef4444';
                row.style.fontWeight = 'bold';
            } else if (t.stationary) {
                row.style.color = '#f59e0b';
            } else {
                row.style.color = '#38bdf8';
            }
            logContainer.appendChild(row);
        });
        
        while (logContainer.childNodes.length > 30) {
            logContainer.removeChild(logContainer.firstChild);
        }
        logContainer.scrollTop = logContainer.scrollHeight;
    }
    
    if (jsonPreview) {
        const payload = {
            timestamp: new Date().toISOString(),
            event: promptMet ? "ai_prompt_match" : (colliding ? "roi_object_dwell" : "monitoring_idle"),
            rule_id: "spbu_refuel",
            condition_met: promptMet,
            prompt_requirement: "Orang berhenti sedang mengisi bensin >= 3s",
            dwell_seconds: parseFloat(simDwellTimer.toFixed(1)),
            detected_objects: targets.map(t => ({
                id: t.id,
                class: t.type,
                confidence: t.conf,
                status: t.stationary ? "stationary" : "moving"
            })),
            esp8266_trigger: promptMet,
            esp_target_url: promptMet ? "http://192.168.1.150/alarm?event=spbu_refuel" : null
        };
        jsonPreview.textContent = JSON.stringify(payload, null, 2);
    }
    
    if (dispatchBadge) {
        if (promptMet) {
            dispatchBadge.textContent = '🚨 TRIGGER SENT';
            dispatchBadge.style.color = '#ef4444';
        } else {
            dispatchBadge.textContent = '● READY';
            dispatchBadge.style.color = '#34d399';
        }
    }
}

// ============================================================================
// .YAI CONFIGURATION IMPORT / EXPORT & MARKETPLACE LOGIC
// ============================================================================

// Download currently active AI Grid & Prompt configuration as <name>.yai
function downloadCustomYaiConfig() {
    const nameInp = document.getElementById('ai-export-name-input');
    let rawName = (nameInp ? nameInp.value.trim() : '') || 'kios_bensin';
    const cleanName = rawName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    
    const cw = (aiDrawCanvas && aiDrawCanvas.width) || 800;
    const ch = (aiDrawCanvas && aiDrawCanvas.height) || 450;
    
    // Normalize grid to percentage
    const gridPercent = {
        x: parseFloat(((aiGridRect.x / cw) * 100).toFixed(2)),
        y: parseFloat(((aiGridRect.y / ch) * 100).toFixed(2)),
        w: parseFloat(((aiGridRect.w / cw) * 100).toFixed(2)),
        h: parseFloat(((aiGridRect.h / ch) * 100).toFixed(2))
    };
    
    const targetClasses = [];
    if (document.getElementById('ai-filter-person')?.checked) targetClasses.push('person');
    if (document.getElementById('ai-filter-motorcycle')?.checked) targetClasses.push('motorcycle');
    if (document.getElementById('ai-filter-car')?.checked) targetClasses.push('car');
    
    const promptText = document.getElementById('ai-prompt-input')?.value.trim() || 'Deteksi orang berhenti mengisi bensin';
    const requireStationary = (document.getElementById('ai-motion-condition')?.value === 'stationary_only');
    const minDwellSec = parseInt(document.getElementById('ai-dwell-seconds')?.value, 10) || 3;
    const confidenceMin = (parseInt(document.getElementById('ai-confidence-min')?.value, 10) || 75) / 100;
    
    const espChk = document.getElementById('esp-enabled-checkbox');
    const espInp = document.getElementById('esp-target-input');
    const espMtd = document.getElementById('esp-method-select');
    
    const yaiData = {
        format: "arch3r_yai",
        version: "1.0",
        preset_name: cleanName,
        display_title: cleanName.replace(/_/g, ' ').toUpperCase(),
        description: "Preset konfigurasi Visi AI Arch3r NVR untuk deteksi area dan notifikasi IoT",
        created_at: new Date().toISOString(),
        grid_rect_percent: gridPercent,
        prompt_rules: {
            prompt_text: promptText,
            target_classes: targetClasses,
            require_stationary: requireStationary,
            min_dwell_sec: minDwellSec,
            confidence_min: confidenceMin
        },
        esp_config: {
            enabled: espChk ? espChk.checked : false,
            ip_or_url: espInp ? espInp.value.trim() : '192.168.1.150',
            method: espMtd ? espMtd.value : 'GET',
            cooldown_sec: 4
        }
    };
    
    const jsonStr = JSON.stringify(yaiData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cleanName}.yai`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    appendAITelemetry(`📥 File konfigurasi "${cleanName}.yai" berhasil diunduh ke komputer Anda.`, 'success');
    alert(`File konfigurasi berhasil diunduh:\n${cleanName}.yai\n\nSimpan file ini untuk backup atau bagikan ke perangkat STB lain!`);
}

function triggerUploadYaiConfig() {
    const fileInp = document.getElementById('ai-upload-yai-file');
    if (fileInp) {
        fileInp.value = '';
        fileInp.click();
    }
}

function handleUploadYaiConfig(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            applyYaiDataToActiveEditor(data);
            appendAITelemetry(`📤 File "${file.name}" berhasil diunggah dan diterapkan ke editor.`, 'success');
            alert(`Konfigurasi .yai "${data.preset_name || file.name}" berhasil diimpor!\n\nPreset telah diterapkan pada kamera aktif.`);
            switchAIGridTab('live');
        } catch (err) {
            console.error('[YAI Import Error]', err);
            alert('Gagal membaca file .yai! Pastikan format file valid JSON / .yai.');
            appendAITelemetry(`❌ Gagal membaca file .yai: ${err.message}`, 'alarm');
        }
    };
    reader.readAsText(file);
}

function applyYaiDataToActiveEditor(data) {
    if (!data) return;
    
    // 1. Grid coordinates
    const grid = data.grid_rect_percent || data.grid;
    if (grid && aiDrawCanvas) {
        const cw = aiDrawCanvas.width || 800;
        const ch = aiDrawCanvas.height || 450;
        const x = (grid.x <= 1 && grid.w <= 1) ? (grid.x * cw) : (grid.x > 1 ? (grid.x / 100 * cw) : 0);
        const y = (grid.y <= 1 && grid.h <= 1) ? (grid.y * ch) : (grid.y > 1 ? (grid.y / 100 * ch) : 0);
        const w = (grid.w <= 1) ? (grid.w * cw) : (grid.w / 100 * cw);
        const h = (grid.h <= 1) ? (grid.h * ch) : (grid.h / 100 * ch);
        aiGridRect = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
        updateCoordStatusText();
    }
    
    // 2. Prompt rules
    const pr = data.prompt_rules;
    if (pr) {
        const promptInp = document.getElementById('ai-prompt-input');
        if (promptInp && pr.prompt_text) promptInp.value = pr.prompt_text;
        
        const chkPerson = document.getElementById('ai-filter-person');
        const chkMotor = document.getElementById('ai-filter-motorcycle');
        const chkCar = document.getElementById('ai-filter-car');
        if (chkPerson && Array.isArray(pr.target_classes)) chkPerson.checked = pr.target_classes.includes('person');
        if (chkMotor && Array.isArray(pr.target_classes)) chkMotor.checked = pr.target_classes.includes('motorcycle');
        if (chkCar && Array.isArray(pr.target_classes)) chkCar.checked = pr.target_classes.includes('car');
        
        const motionSel = document.getElementById('ai-motion-condition');
        if (motionSel) motionSel.value = pr.require_stationary ? 'stationary_only' : 'moving_or_stationary';
        
        const dwellInp = document.getElementById('ai-dwell-seconds');
        if (dwellInp && pr.min_dwell_sec) dwellInp.value = pr.min_dwell_sec;
        
        const confInp = document.getElementById('ai-confidence-min');
        if (confInp && pr.confidence_min) confInp.value = Math.round(pr.confidence_min * 100);
    }
    
    // 3. ESP8266 config
    const esp = data.esp_config;
    if (esp) {
        const chk = document.getElementById('esp-enabled-checkbox');
        const inp = document.getElementById('esp-target-input');
        const mtd = document.getElementById('esp-method-select');
        if (chk) chk.checked = !!esp.enabled;
        if (inp && esp.ip_or_url) inp.value = esp.ip_or_url;
        if (mtd && esp.method) mtd.value = esp.method || 'GET';
    }
    
    // 4. Update export name input
    const exportNameInp = document.getElementById('ai-export-name-input');
    if (exportNameInp && data.preset_name) {
        exportNameInp.value = data.preset_name;
    }
}

// Fetch and render presets catalog from backend API or Marketplace Hosting Database
async function fetchMarketplacePresets() {
    const container = document.getElementById('ai-market-cards-container');
    if (!container) return;
    
    container.innerHTML = '<div style="color:var(--text-muted); font-size:0.82rem; padding:1rem; grid-column:1/-1; text-align:center;">⏳ Memuat katalog preset dari database hosting...</div>';
    
    try {
        const fetchFn = (typeof authFetch === 'function') ? authFetch : (window.authFetch || fetch);
        const res = await fetchFn('/api/ai/presets');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const presets = await res.json();
        
        if (!Array.isArray(presets) || presets.length === 0) {
            container.innerHTML = '<div style="color:var(--text-muted); font-size:0.82rem; padding:1rem; grid-column:1/-1; text-align:center;">Belum ada preset terdaftar.</div>';
            return;
        }
        
        container.innerHTML = '';
        presets.forEach(p => {
            const card = document.createElement('div');
            card.style.background = 'rgba(2, 6, 23, 0.75)';
            card.style.border = '1px solid #1e293b';
            card.style.borderRadius = '6px';
            card.style.padding = '0.85rem';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.justifyContent = 'space-between';
            card.style.transition = 'transform 0.15s, border-color 0.15s';
            
            const classesHtml = (p.prompt_rules?.target_classes || []).map(c => 
                `<span style="background:rgba(59,130,246,0.15); color:#60a5fa; padding:1px 6px; border-radius:3px; font-size:0.68rem; font-family:monospace;">${c}</span>`
            ).join(' ');
            
            card.innerHTML = `
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.4rem;">
                        <strong style="font-size:0.88rem; color:#f8fafc;">${p.display_title || p.preset_name}</strong>
                        <span style="background:#f59e0b; color:#020617; font-weight:bold; font-size:0.68rem; padding:1px 6px; border-radius:4px; font-family:monospace;">.yai</span>
                    </div>
                    <div style="font-size:0.75rem; color:#94a3b8; line-height:1.4; margin-bottom:0.6rem;">
                        ${p.description || 'Preset konfigurasi deteksi AI SPBU.'}
                    </div>
                    <div style="display:flex; gap:0.3rem; flex-wrap:wrap; margin-bottom:0.6rem;">
                        ${classesHtml}
                        <span style="background:rgba(245,158,11,0.12); color:#f59e0b; padding:1px 6px; border-radius:3px; font-size:0.68rem; font-family:monospace;">⏳ ${p.prompt_rules?.min_dwell_sec || 3}s</span>
                    </div>
                </div>
                <div style="display:flex; gap:0.4rem; margin-top:0.5rem; pt:0.5rem; border-top:1px solid #1e293b;">
                    <button type="button" class="btn btn-sm btn-primary" onclick='applyMarketPresetById("${p.id}")' style="flex:1; font-size:0.75rem; background:#2563eb; border-color:#2563eb; padding:0.3rem 0.5rem;">
                        📥 Pasang ke Kamera
                    </button>
                    <a href="/api/ai/presets/download/${encodeURIComponent(p.id)}" download="${p.preset_name || 'preset'}.yai" class="btn btn-sm btn-secondary" style="font-size:0.75rem; color:#f59e0b; border-color:rgba(245,158,11,0.4); text-decoration:none; display:flex; align-items:center; padding:0.3rem 0.5rem;">
                        💾 .yai
                    </a>
                </div>
            `;
            container.appendChild(card);
        });
        
        appendAITelemetry(`🏪 Katalog marketplace dimuat: ${presets.length} preset .yai siap digunakan.`, 'system');
    } catch (err) {
        console.error('[Marketplace Error]', err);
        container.innerHTML = `<div style="color:#ef4444; font-size:0.8rem; padding:1rem; grid-column:1/-1;">❌ Gagal memuat database marketplace: ${err.message}</div>`;
    }
}

async function applyMarketPresetById(presetId) {
    try {
        const fetchFn = (typeof authFetch === 'function') ? authFetch : (window.authFetch || fetch);
        const res = await fetchFn('/api/ai/presets');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const presets = await res.json();
        const found = presets.find(p => p.id === presetId);
        if (!found) throw new Error('Preset tidak ditemukan');
        
        applyYaiDataToActiveEditor(found);
        appendAITelemetry(`📥 Preset Marketplace "${found.display_title || found.preset_name}" berhasil dipasang ke editor.`, 'success');
        alert(`Preset "${found.display_title || found.preset_name}" berhasil dipasang ke editor kamera aktif!`);
        switchAIGridTab('live');
    } catch (e) {
        alert('Gagal memasang preset: ' + e.message);
    }
}
window.openAIGridModal = openAIGridModal;
window.switchAIGridTab = switchAIGridTab;
window.setSimScenario = setSimScenario;
window.toggleSimPlayback = toggleSimPlayback;
window.restartSimScenario = restartSimScenario;
window.downloadCustomYaiConfig = downloadCustomYaiConfig;
window.triggerUploadYaiConfig = triggerUploadYaiConfig;
window.handleUploadYaiConfig = handleUploadYaiConfig;
window.fetchMarketplacePresets = fetchMarketplacePresets;
window.applyMarketPresetById = applyMarketPresetById;
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
window.toggleCustomStreamBox = toggleCustomStreamBox;
window.playCustomRTSPStream = playCustomRTSPStream;
window.loadDemoSPBUFeed = loadDemoSPBUFeed;
window.copyAITelemetryLog = copyAITelemetryLog;
window.clearAITelemetryLog = clearAITelemetryLog;
window.toggleAITelemetryScroll = toggleAITelemetryScroll;
window.applyAIPromptPreset = applyAIPromptPreset;
window.testAIPromptCondition = testAIPromptCondition;

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
                            <div style="display:flex; justify-content:flex-end; gap:0.5rem; flex-wrap:wrap; align-items:center;">
                                ${(addon.id === 'ai_yolo' || addon.id === 'ai-yolo') ? `
                                    <button class="btn-sm btn-primary" onclick="openYoloAiPage()" title="Kelola & Konfigurasi AI Kamera" style="background:#2563eb; border-color:#2563eb; font-weight:600; display:inline-flex; align-items:center; gap:0.35rem; padding:0.4rem 0.8rem;">
                                        <span>🎯</span> Kelola AI Kamera
                                    </button>
                                ` : `
                                    <button class="btn-sm btn-primary" onclick="openAddonConfig('${addon.id}', '${addon.name}')" title="Pengaturan">⚙️</button>
                                `}
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
                    <button type="button" class="btn btn-sm btn-primary" onclick="closeAddonConfigModal(); openYoloAiPage('${currentCam}')" style="display:flex; align-items:center; gap:0.3rem; background:#2563eb; border-color:#2563eb;">
                        <span>🎯</span> Buka Halaman YOLO AI Vision & Area Grid
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
window.setZoneColor = setZoneColor;
window.updateActiveZoneLabel = updateActiveZoneLabel;
window.setUniversalPreset = setUniversalPreset;
window.updateCamAIActiveState = updateCamAIActiveState;
window.toggleAISimulation = toggleAISimulation;
window.enterAIFullscreenDrawing = enterAIFullscreenDrawing;
window.exitAIFullscreenDrawing = exitAIFullscreenDrawing;
window.toggleAIFullscreenDrawing = toggleAIFullscreenDrawing;
window.addNewZoneSlot = addNewZoneSlot;
window.deleteCurrentZone = deleteCurrentZone;
window.saveCurrentZone = saveCurrentZone;
window.updateActiveZoneTargets = updateActiveZoneTargets;
window.selectActiveZone = selectActiveZone;


