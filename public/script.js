// script.js - Archer NVR Ver. 9.6.2 Multi-Tenant Controller

document.addEventListener('DOMContentLoaded', () => {
    // --- Global State ---
    let currentUserRole = null;
    let currentUsername = '';
    let cameras = [];
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
    function getAuthToken() {
        return localStorage.getItem('nvr_auth_token') || '';
    }

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
                                            document.getElementById('camPtzEnabled').checked = dev.isOnvif;
                                            
                                            // Asumsi port ONVIF pertama
                                            const onvifPort = dev.ports.find(p => p !== 554) || 80;
                                            document.getElementById('camPtzUrl').value = `http://${dev.ip}:${onvifPort}/onvif/device_service`;
                                            
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
                
                if(targetId === 'view-about') {
                    if (typeof fetchAboutInfo === 'function') fetchAboutInfo();
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


    
    function populateCameraSelects() {
        const selRecCam = document.getElementById('selRecCam');
        const mSelRecCam = document.getElementById('mSelRecCam');
        
        let options = '<option value="">-- Pilih Kamera --</option>';
        cameras.forEach(cam => {
            options += `<option value="${cam.id}">${cam.name}</option>`;
        });
        
        if (selRecCam) selRecCam.innerHTML = options;
        if (mSelRecCam) mSelRecCam.innerHTML = options;
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

    window.editCamera = function(id) {
        const cam = cameras.find(c => c.id === id);
        if (!cam) return;
        
        document.getElementById('camId').value = cam.id;
        document.getElementById('camName').value = cam.name;
        const camCustomIdEl = document.getElementById('camCustomId');
        if (camCustomIdEl) camCustomIdEl.value = cam.id;
        const camPtzEnabledEl = document.getElementById('camPtzEnabled');
        if (camPtzEnabledEl) camPtzEnabledEl.checked = !!cam.ptzEnabled;
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
        const ptzInput = document.getElementById('camPtzEnabled');
        if (ptzInput) ptzInput.checked = false;
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
            const payload = {
                id: document.getElementById('camCustomId') ? document.getElementById('camCustomId').value.trim() : undefined,
                name: document.getElementById('camName').value,
                ptzEnabled: document.getElementById('camPtzEnabled') ? document.getElementById('camPtzEnabled').checked : false,
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

    window.nextGridPage = function() {
        const activeGridBtn = document.querySelector('.grid-btn.active');
        const count = activeGridBtn ? parseInt(activeGridBtn.getAttribute('data-grid')) : 1;
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

    
    function renderChannelButtons() {
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
        const activeGridBtn = document.querySelector('.grid-btn.active');
        let count = activeGridBtn ? parseInt(activeGridBtn.getAttribute('data-grid')) : 1;
        
        if (activeChannel !== 'all') {
            count = 1; 
            selectedCamIdForPtz = activeChannel;
        } else {
            // Keep selection if exists, else clear
            if (!cameras.find(c => c.id === selectedCamIdForPtz)) {
                selectedCamIdForPtz = null;
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
                btnPrev.style.opacity = (gridPageIndex === 0) ? '0.5' : '1';
            }
            if (btnNext) {
                btnNext.disabled = (gridPageIndex >= totalPages - 1);
                btnNext.style.opacity = (gridPageIndex >= totalPages - 1) ? '0.5' : '1';
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

    function updateBottomPlayerUI() {
        const pCtrl = document.getElementById('playerControls');
        if(!pCtrl) return;

        if(!selectedVideoElement) {
            pCtrl.style.opacity = '0.5';
            pCtrl.style.pointerEvents = 'none';
        } else {
            pCtrl.style.opacity = '1';
            pCtrl.style.pointerEvents = 'auto';
            
            const btnPlay = document.getElementById('btnPlayerPlay');
            const btnMute = document.getElementById('btnPlayerMute');
            const sliderVol = document.getElementById('playerVolume');
            
            if(btnPlay) btnPlay.textContent = selectedVideoElement.paused ? '▶️' : '⏸️';
            if(btnMute) btnMute.textContent = selectedVideoElement.muted ? '🔇' : '🔊';
            if(sliderVol) sliderVol.value = selectedVideoElement.volume;
        }
    }

    window.selectCellForPtz = function(camId) {
        selectedCamIdForPtz = camId;
        document.querySelectorAll('.cam-cell').forEach(cell => cell.classList.remove('selected'));
        const activeCell = document.getElementById('cell_' + camId);
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
        const camLabelText = cam ? `CH: ${cam.name}` : (activeChannel !== 'all' ? (cameras.find(c => c.id === activeChannel)?.name || `CH ${activeChannel}`) : 'Multi-View (Klik grid)');

        if (topActiveCamLabel) {
            topActiveCamLabel.textContent = cam ? cam.name : (activeChannel !== 'all' ? (cameras.find(c => c.id === activeChannel)?.name || `CH ${activeChannel}`) : 'Pilih di grid');
            topActiveCamLabel.style.color = cam ? '#60a5fa' : '#94a3b8';
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

    window.toggleSelectedMute = function() {
        const targetId = selectedCamIdForPtz || (activeChannel !== 'all' ? activeChannel : (cameras[0]?.id));
        if (!targetId) return;
        const cell = document.getElementById('cell_' + targetId);
        const video = cell ? cell.querySelector('video') : null;
        if (video) {
            video.muted = !video.muted;
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
    window.ptzMoveSelected = async function(direction) {
        if (!selectedCamIdForPtz) {
            alert('Pilih kamera di grid terlebih dahulu!');
            return;
        }
        try {
            const res = await authFetch(`/api/cameras/${selectedCamIdForPtz}/ptz`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ direction })
            });
            if (!res.ok) {
                const data = await res.json();
                alert(data.error || 'Gagal mengirim perintah PTZ');
            }
        } catch(e) {
            alert('Kesalahan jaringan: ' + e.message);
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

    // Reset floating panel state when exiting fullscreen
    document.addEventListener('fullscreenchange', () => {
        const panel = document.getElementById('topControlPanel');
        const btn = document.getElementById('btnToggleControls');
        if (!document.fullscreenElement) {
            if (panel) panel.classList.remove('fullscreen-open');
            if (btn) {
                btn.style.opacity = '0.7';
                btn.style.background = 'var(--surface)';
                btn.style.color = '';
            }
        }
    });


    window.toggleGridFullscreen = function(gridId) {
        const elem = document.getElementById(gridId);
        if (!elem) return;
        if (!document.fullscreenElement) {
            elem.requestFullscreen().catch(err => {
                alert("Gagal fullscreen: " + err.message);
            });
        } else {
            document.exitFullscreen();
        }
    };

    

    const activeHlsPlayers = {};



    function destroyHlsPlayers() {
        for (const id in activeHlsPlayers) {
            if (activeHlsPlayers[id]) {
                activeHlsPlayers[id].destroy();
            }
            delete activeHlsPlayers[id];
        }
    }

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

        for (let i = 0; i < count; i++) {
            const cam = camsToShow[i];
            
            // Generate for Admin
            if (videoGrid && currentUserRole === 'administrator') {
                const cell = document.createElement("div");
                if (cam) {
                    cell.className = "cam-cell" + (cam.id === selectedCamIdForPtz ? " selected" : "");
                    cell.id = "cell_" + cam.id;
                    cell.onclick = () => window.selectCellForPtz(cam.id);
                    
                    const hlsUrl = cam.mainStreamUrl.startsWith('http') ? cam.mainStreamUrl : ('/stream/' + cam.mediaMtxPath + '/index.m3u8?token=' + encodeURIComponent(getAuthToken()));
                    const videoId = "cam_video_admin_" + i;
                    
                    cell.innerHTML = `
                        <div style="position:relative; width:100%; height:100%; background: #000; overflow: hidden; border:1px solid var(--border);">
                                <video id="${videoId}" class="cam-player-video" autoplay muted playsinline style="width:100%; height:100%; object-fit:fill; pointer-events:none;"></video>
                                
                                <div style="position:absolute; top:5px; right:5px; z-index:10; display:flex; gap:5px;">
                                    ${cam.isRecording ? '<span class="badge-rec">REC</span>' : ''}
                                </div>
                                <div class="cam-title-bar" style="position:absolute; bottom:0; left:0; right:0; background:rgba(15, 23, 42, 0.7); text-align:center; padding: 2px 4px; font-size: 10px; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; z-index:5;">
                                    ${cam.name}
                                </div>
                            </div>
                    `;
                    inits.push(() => { if (cam.enabled) initHlsPlayer(videoId, hlsUrl); });
                } else {
                    cell.className = "cam-cell empty-cell";
                    cell.id = "cell_empty_" + i;
                    cell.innerHTML = `
                        <div style="display:flex; height:100%; width:100%; align-items:center; justify-content:center; flex-direction:column; background:#1e293b;">
                            <span style="font-size:2rem; opacity:0.5;">📹</span>
                            <span style="font-size:0.8rem; color:#94a3b8; margin-top:5px;">Kosong</span>
                        </div>
                    `;
                }
                videoGrid.appendChild(cell);
            }

            // Generate for Mobile
            if (mVideoGrid && currentUserRole !== 'administrator') {
                const mCell = document.createElement("div");
                if (cam) {
                    mCell.className = "cam-cell" + (cam.id === selectedCamIdForPtz ? " selected" : "");
                    mCell.id = "m_cell_" + cam.id;
                    mCell.onclick = () => window.selectCellForPtz(cam.id);
                    
                    const hlsUrl = cam.mainStreamUrl.startsWith('http') ? cam.mainStreamUrl : ('/stream/' + cam.mediaMtxPath + '/index.m3u8?token=' + encodeURIComponent(getAuthToken()));
                    const videoId = "cam_video_mobile_" + i;
                    
                    mCell.innerHTML = `
                        <div style="position:relative; width:100%; height:100%; background: #000; overflow: hidden; border:1px solid var(--border);">
                                <video id="${videoId}" class="cam-player-video" autoplay muted playsinline style="width:100%; height:100%; object-fit:fill; pointer-events:none;"></video>
                                
                                <div style="position:absolute; top:5px; right:5px; z-index:10; display:flex; gap:5px;">
                                    ${cam.isRecording ? '<span class="badge-rec">REC</span>' : ''}
                                </div>
                                <div class="cam-title-bar" style="position:absolute; bottom:0; left:0; right:0; background:rgba(15, 23, 42, 0.7); text-align:center; padding: 2px 4px; font-size: 10px; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; z-index:5;">
                                    ${cam.name}
                                </div>
                            </div>
                    `;
                    inits.push(() => { if (cam.enabled) initHlsPlayer(videoId, hlsUrl); });
                } else {
                    mCell.className = "cam-cell empty-cell";
                    mCell.id = "m_cell_empty_" + i;
                    mCell.innerHTML = `
                        <div style="display:flex; height:100%; width:100%; align-items:center; justify-content:center; flex-direction:column; background:#1e293b;">
                            <span style="font-size:2rem; opacity:0.5;">📹</span>
                            <span style="font-size:0.8rem; color:#94a3b8; margin-top:5px;">Kosong</span>
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
                badge.innerHTML = `v${data.current_version || '9.6.4'} ${isNew ? '• Ada Update v' + (data.latest_version || '9.6.4') : '• Versi Terbaru'}`;
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



// ==========================================
// ARCH3R AI ADDON - GRID SELECTION LOGIC
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const aiCanvas = document.getElementById('aiGridCanvas');
    const aiVideo = document.getElementById('aiVideoPlayer');
    if(!aiCanvas) return; // Hanya jalankan jika elemen ada

    const ctx = aiCanvas.getContext('2d');
    const ROWS = 10;
    const COLS = 10;
    let activeCells = new Set();
    let isDrawing = false;
    let drawMode = true; // true = mengaktifkan, false = menghapus

    function resizeCanvas() {
        const rect = aiCanvas.parentElement.getBoundingClientRect();
        aiCanvas.width = rect.width;
        aiCanvas.height = rect.height;
        drawGrid();
    }
    window.addEventListener('resize', resizeCanvas);

    function drawGrid() {
        ctx.clearRect(0, 0, aiCanvas.width, aiCanvas.height);
        const cellW = aiCanvas.width / COLS;
        const cellH = aiCanvas.height / ROWS;

        // Gambar petak aktif
        ctx.fillStyle = 'rgba(239, 68, 68, 0.4)'; // Merah transparan
        activeCells.forEach(cell => {
            const [r, c] = cell.split(',').map(Number);
            ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
        });

        // Gambar garis grid
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i = 1; i < COLS; i++) {
            ctx.moveTo(i * cellW, 0);
            ctx.lineTo(i * cellW, aiCanvas.height);
        }
        for(let i = 1; i < ROWS; i++) {
            ctx.moveTo(0, i * cellH);
            ctx.lineTo(aiCanvas.width, i * cellH);
        }
        ctx.stroke();
    }

    function getCellFromMouseEvent(e) {
        const rect = aiCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cellW = aiCanvas.width / COLS;
        const cellH = aiCanvas.height / ROWS;
        const c = Math.floor(x / cellW);
        const r = Math.floor(y / cellH);
        return {r, c, id: `${r},${c}`};
    }

    aiCanvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        const cell = getCellFromMouseEvent(e);
        drawMode = !activeCells.has(cell.id); // Jika sudah aktif, mode hapus
        if(drawMode) activeCells.add(cell.id);
        else activeCells.delete(cell.id);
        drawGrid();
    });

    aiCanvas.addEventListener('mousemove', (e) => {
        if(!isDrawing) return;
        const cell = getCellFromMouseEvent(e);
        if(drawMode) activeCells.add(cell.id);
        else activeCells.delete(cell.id);
        drawGrid();
    });

    window.addEventListener('mouseup', () => { isDrawing = false; });

    document.getElementById('btnAiGridClear').addEventListener('click', () => {
        activeCells.clear();
        drawGrid();
    });

    document.getElementById('btnAiGridSave').addEventListener('click', async () => {
        const camId = aiCamSelect.value;
        if(!camId) return alert('Pilih kamera terlebih dahulu!');
        
        const payload = {
            camera_id: camId,
            grid_rows: ROWS,
            grid_cols: COLS,
            active_cells: Array.from(activeCells)
        };
        
        try {
            // Asumsi Node.js meneruskan (proxy) ke Python di port 8000
            document.getElementById('aiStatusMsg').textContent = "Menyimpan konfigurasi AI...";
            const res = await fetch('/api/ai/save_grid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('arch3r_token') },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if(res.ok) {
                document.getElementById('aiStatusMsg').textContent = "Konfigurasi AI berhasil disimpan dan dikirim ke YOLO Engine!";
            } else {
                throw new Error(data.error || 'Gagal menyimpan');
            }
        } catch(e) {
            document.getElementById('aiStatusMsg').textContent = "Error: " + e.message;
        }
    });

    // Populasi Kamera (Dipanggil saat menu Addons dibuka)
    const mNavs = document.querySelectorAll('.sidebar-nav .nav-item');
    mNavs.forEach(nav => {
        nav.addEventListener('click', () => {
            if (nav.dataset.target === 'view-addons') {
                setTimeout(resizeCanvas, 100);
                
                // Fetch addon list
                if (typeof fetchInstalledAddons === 'function') {
                    fetchInstalledAddons();
                }
            }
        });
    });
});


// ==========================================
// AI YOLOv8 Grid Management
// ==========================================
let aiDrawCanvas, aiDrawCtx, isAIDrawing = false;
let aiGridRect = { x: 0, y: 0, w: 0, h: 0 };
let aiBaseWidth = 1280; // Asumsi default resolusi AI
let aiBaseHeight = 720;

function openAIGridModal(defaultCamId = null) {
    document.getElementById('aiGridModalOverlay').style.display = 'flex';
    
    // Populate select
    const select = document.getElementById('ai-cam-select');
    select.innerHTML = '<option value="">-- Pilih Kamera --</option>';
    cameras.forEach(cam => {
        select.innerHTML += `<option value="${cam.id}">${cam.name} (${cam.ip})</option>`;
    });
    
    document.getElementById('ai-canvas-container').style.display = 'none';
    
    if (defaultCamId) {
        select.value = defaultCamId;
        if(select.parentElement && select.parentElement.classList.contains('form-group')) {
            select.parentElement.style.display = 'none';
        } else {
            select.style.display = 'none';
        }
        loadCamStreamForAI();
    } else {
        if(select.parentElement && select.parentElement.classList.contains('form-group')) {
            select.parentElement.style.display = 'block';
        } else {
            select.style.display = 'block';
        }
    }
}

function loadCamStreamForAI() {
    const camId = document.getElementById('ai-cam-select').value;
    const container = document.getElementById('ai-canvas-container');
    const video = document.getElementById('ai-stream-preview');
    
    if(!camId) {
        container.style.display = 'none';
        if (activeHlsPlayers['ai-stream-preview']) {
            activeHlsPlayers['ai-stream-preview'].destroy();
            delete activeHlsPlayers['ai-stream-preview'];
        }
        return;
    }
    
    const cam = cameras.find(c => c.id === camId);
    if (!cam) return;
    
    container.style.display = 'block';
    
    // Gunakan live HLS feed untuk preview AI
    const hlsUrl = cam.mainStreamUrl.startsWith('http') ? cam.mainStreamUrl : ('/stream/' + cam.mediaMtxPath + '/index.m3u8?token=' + encodeURIComponent(getAuthToken()));
    initHlsPlayer('ai-stream-preview', hlsUrl);
    
    video.onloadeddata = function() {
        initAIDrawCanvas();
    };
    
    // Fallback if video takes too long to load
    setTimeout(() => {
        if (!aiDrawCanvas || aiDrawCanvas.width === 0) {
            initAIDrawCanvas();
        }
    }, 1500);
}

function initAIDrawCanvas() {
    const video = document.getElementById('ai-stream-preview');
    const canvas = document.getElementById('ai-draw-canvas');
    
    // Sesuaikan resolusi canvas dengan ukuran gambar aslinya (ditampilkan di layar)
    canvas.width = video.clientWidth || 640;
    canvas.height = video.clientHeight || 360;
    
    aiDrawCanvas = canvas;
    aiDrawCtx = canvas.getContext('2d');
    
    // Reset state
    aiGridRect = { x: 0, y: 0, w: 0, h: 0 };
    redrawAIGrid();
    
    // Event listeners
    canvas.onmousedown = (e) => {
        isAIDrawing = true;
        const rect = canvas.getBoundingClientRect();
        aiGridRect.x = e.clientX - rect.left;
        aiGridRect.y = e.clientY - rect.top;
        aiGridRect.w = 0;
        aiGridRect.h = 0;
    };
    
    canvas.onmousemove = (e) => {
        if (!isAIDrawing) return;
        const rect = canvas.getBoundingClientRect();
        aiGridRect.w = (e.clientX - rect.left) - aiGridRect.x;
        aiGridRect.h = (e.clientY - rect.top) - aiGridRect.y;
        redrawAIGrid();
    };
    
    canvas.onmouseup = () => {
        isAIDrawing = false;
        // Hitung persentase agar support berbagai resolusi (YOLOv8 butuh koordinat mentah atau persentase)
        const pX = (aiGridRect.x / canvas.width).toFixed(3);
        const pY = (aiGridRect.y / canvas.height).toFixed(3);
        const pW = (aiGridRect.w / canvas.width).toFixed(3);
        const pH = (aiGridRect.h / canvas.height).toFixed(3);
        
        document.getElementById('ai-coord-status').innerHTML = 
            `Area Tersimpan: X(${pX}) Y(${pY}) W(${pW}) H(${pH})`;
    };
}

function redrawAIGrid() {
    aiDrawCtx.clearRect(0, 0, aiDrawCanvas.width, aiDrawCanvas.height);
    if(aiGridRect.w === 0) return;
    
    aiDrawCtx.strokeStyle = "red";
    aiDrawCtx.lineWidth = 2;
    aiDrawCtx.fillStyle = "rgba(255, 0, 0, 0.2)";
    
    aiDrawCtx.beginPath();
    aiDrawCtx.rect(aiGridRect.x, aiGridRect.y, aiGridRect.w, aiGridRect.h);
    aiDrawCtx.fill();
    aiDrawCtx.stroke();
}

function clearAIGrid() {
    aiGridRect = { x: 0, y: 0, w: 0, h: 0 };
    redrawAIGrid();
    document.getElementById('ai-coord-status').innerHTML = 'Belum ada area yang digambar.';
}

function saveAIGrid() {
    const camId = document.getElementById('ai-cam-select').value;
    if(!camId) {
        alert("Pilih kamera terlebih dahulu!");
        return;
    }
    
    if(aiGridRect.w === 0) {
        alert("Gambarlah kotak area berwarna merah di atas gambar terlebih dahulu!");
        return;
    }

    // Mengonversi koordinat pixel ke persentase untuk dikirim ke Engine YOLO
    const payload = {
        camera_id: camId,
        x: aiGridRect.x / aiDrawCanvas.width,
        y: aiGridRect.y / aiDrawCanvas.height,
        w: aiGridRect.w / aiDrawCanvas.width,
        h: aiGridRect.h / aiDrawCanvas.height,
        enabled: true
    };
    
    fetch('/api/ai/grid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then(res => res.json())
      .then(data => {
          alert("Konfigurasi AI berhasil disimpan dan dikirim ke YOLO Engine!");
          closeAIGridModal();
      }).catch(e => {
          alert("Gagal menghubungi NVR Backend.");
      });
}

function closeAIGridModal() {
    document.getElementById('aiGridModalOverlay').style.display = 'none';
    const video = document.getElementById('ai-stream-preview');
    if (video) {
        video.pause();
        video.src = '';
    }
    if (activeHlsPlayers['ai-stream-preview']) {
        activeHlsPlayers['ai-stream-preview'].destroy();
        delete activeHlsPlayers['ai-stream-preview'];
    }
}

// ADDON MARKETPLACE LOGIC
async function fetchInstalledAddons() {
    const tbody = document.getElementById('installed-addons-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5" style="padding: 2rem; text-align: center; color: var(--text-muted);">Loading addons...</td></tr>';
    
    try {
        const response = await authFetch('/api/addons');
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
        } else {
            tbody.innerHTML = '<tr><td colspan="5" style="padding: 2rem; text-align: center; color: #ef4444;">Gagal memuat daftar addon.</td></tr>';
        }
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" style="padding: 2rem; text-align: center; color: #ef4444;">Error koneksi ke server.</td></tr>';
    }
}

async function toggleAddonState(addonId, newState) {
    if (!confirm(`Apakah Anda yakin ingin ${newState ? 'menyalakan' : 'mematikan'} addon ini?`)) return;
    
    try {
        const response = await authFetch('/api/addons/' + addonId + '/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: newState })
        });
        
        if (response.ok) {
            fetchInstalledAddons();
        } else {
            const data = await response.json();
            alert('Gagal: ' + (data.error || 'Terjadi kesalahan'));
        }
    } catch (e) {
        alert('Gagal menghubungi server.');
    }
}

async function deleteAddon(addonId) {
    if (!confirm('Apakah Anda yakin ingin MENGHAPUS addon ini? Data dan script addon akan dihapus permanen.')) return;
    
    try {
        const response = await authFetch('/api/addons/' + addonId, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            fetchInstalledAddons();
        } else {
            const data = await response.json();
            alert('Gagal menghapus addon: ' + (data.error || 'Terjadi kesalahan'));
        }
    } catch (e) {
        alert('Gagal menghubungi server.');
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
    document.getElementById('addonConfigTitle').textContent = addonName;
    document.getElementById('addonConfigBody').innerHTML = '<p style="color:var(--text-muted);text-align:center;">Memuat konfigurasi...</p>';
    document.getElementById('addonConfigModalOverlay').style.display = 'flex';

    try {
        const res = await authFetch('/api/addons/' + addonId + '/config');
        const data = await res.json();
        if (res.ok) {
            renderAddonConfigForm(data.config);
        } else {
            document.getElementById('addonConfigBody').innerHTML = `<p style="color:#ef4444;text-align:center;">Gagal: ${data.error || 'Terjadi kesalahan'}</p>`;
        }
    } catch (e) {
        document.getElementById('addonConfigBody').innerHTML = `<p style="color:#ef4444;text-align:center;">Gagal menghubungi server.</p>`;
    }
}

function renderAddonConfigForm(configObj) {
    const container = document.getElementById('addonConfigBody');
    if (!configObj || Object.keys(configObj).length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);text-align:center;margin-top:2rem;">Addon ini tidak memiliki parameter yang bisa dikonfigurasi dari antarmuka.</p>';
        return;
    }
    
    let html = '<form id="addonConfigForm">';
    for (let key in configObj) {
        const val = configObj[key];
        const type = typeof val;
        const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        html += `<div style="margin-bottom:1.2rem;">
            <label style="display:block; margin-bottom:0.5rem; color:var(--text); font-size:0.9rem; font-weight:bold;">${displayKey}</label>`;
        
        if (type === 'boolean') {
            html += `<select name="${key}" style="width:100%; padding:0.75rem; background:rgba(0,0,0,0.2); border:1px solid var(--border); color:white; border-radius:4px;">
                <option value="true" ${val ? 'selected' : ''}>Aktif (True)</option>
                <option value="false" ${!val ? 'selected' : ''}>Mati (False)</option>
            </select>`;
        } else if (type === 'number') {
            html += `<input type="number" name="${key}" value="${val}" style="width:100%; padding:0.75rem; background:rgba(0,0,0,0.2); border:1px solid var(--border); color:white; border-radius:4px;">`;
        } else {
            html += `<input type="text" name="${key}" value="${val}" style="width:100%; padding:0.75rem; background:rgba(0,0,0,0.2); border:1px solid var(--border); color:white; border-radius:4px;">`;
        }
        html += `</div>`;
    }
    html += '</form>';
    container.innerHTML = html;
}

async function saveAddonConfig() {
    if (!currentConfigAddonId) return;
    const form = document.getElementById('addonConfigForm');
    if (!form) return closeAddonConfigModal(); 

    const formData = new FormData(form);
    const newConfig = {};
    for (let [k, v] of formData.entries()) {
        if (v === 'true') newConfig[k] = true;
        else if (v === 'false') newConfig[k] = false;
        else if (!isNaN(v) && v.trim() !== '') newConfig[k] = Number(v);
        else newConfig[k] = v;
    }

    try {
        const res = await authFetch('/api/addons/' + currentConfigAddonId + '/config', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ config: newConfig })
        });
        const data = await res.json();
        if (res.ok) {
            alert('Konfigurasi berhasil disimpan dan diaplikasikan ke addon.');
            closeAddonConfigModal();
        } else {
            alert('Gagal menyimpan: ' + (data.error || 'Terjadi kesalahan'));
        }
    } catch (e) {
        alert('Gagal menghubungi server untuk menyimpan konfigurasi.');
    }
}

function closeAddonConfigModal() {
    document.getElementById('addonConfigModalOverlay').style.display = 'none';
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

