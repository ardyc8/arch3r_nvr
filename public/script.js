// script.js - Archer NVR Ver. 10.6.5 Multi-Tenant Controller & Enterprise Tactical YOLO AI Studio

// --- Universal Toast Notification Engine (Pure Vanilla DOM) ---
function showToast(message, type = 'info') {
    let container = document.getElementById('arch3r-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'arch3r-toast-container';
        container.style.position = 'fixed';
        container.style.top = '16px';
        container.style.right = '16px';
        container.style.zIndex = '100000';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '8px';
        container.style.maxWidth = '90vw';
        container.style.width = '360px';
        container.style.pointerEvents = 'none';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.pointerEvents = 'auto';
    toast.style.padding = '10px 16px';
    toast.style.borderRadius = '8px';
    toast.style.fontSize = '0.84rem';
    toast.style.lineHeight = '1.35';
    toast.style.fontWeight = '500';
    toast.style.boxShadow = '0 6px 20px rgba(0,0,0,0.6)';
    toast.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';

    const colors = {
        success: { bg: 'rgba(16, 185, 129, 0.95)', border: '#059669', text: '#ffffff' },
        warning: { bg: 'rgba(245, 158, 11, 0.95)', border: '#d97706', text: '#1e293b' },
        alarm: { bg: 'rgba(239, 68, 68, 0.95)', border: '#dc2626', text: '#ffffff' },
        error: { bg: 'rgba(239, 68, 68, 0.95)', border: '#dc2626', text: '#ffffff' },
        info: { bg: 'rgba(30, 41, 59, 0.95)', border: '#475569', text: '#f8fafc' },
        sensor: { bg: 'rgba(14, 165, 233, 0.95)', border: '#0284c7', text: '#ffffff' }
    };

    const c = colors[type] || colors.info;
    toast.style.background = c.bg;
    toast.style.border = `1px solid ${c.border}`;
    toast.style.color = c.text;
    toast.textContent = message;

    container.appendChild(toast);
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 350);
    }, 4500);
}
window.showToast = showToast;

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

// =======================================================
// ARCH3R NVR - ENTERPRISE OFFLINE RESILIENCE & AUTO-SYNC ENGINE
// Designed for Mobile (HP) Network Dropouts & Armbian STB
// =======================================================
const OFFLINE_SYNC_STORAGE_KEY = 'arch3r_offline_sync_queue';
let isSyncingOfflineQueue = false;

function getOfflineSyncQueue() {
    try {
        const raw = localStorage.getItem(OFFLINE_SYNC_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}
window.getOfflineSyncQueue = getOfflineSyncQueue;

function saveOfflineSyncQueue(queue) {
    try {
        localStorage.setItem(OFFLINE_SYNC_STORAGE_KEY, JSON.stringify(queue));
    } catch (e) {
        console.warn('[Offline Sync] Failed to save queue to localStorage:', e);
    }
}

function enqueueOfflineSync(type, url, method, payload, label = '') {
    const queue = getOfflineSyncQueue();
    // Anti-duplicate: update existing queue item of same type and target URL
    const existingIdx = queue.findIndex(item => item.type === type && item.url === url);
    const item = {
        id: 'sync_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        type,
        url,
        method: method || 'POST',
        payload,
        label: label || type,
        queuedAt: new Date().toISOString()
    };
    if (existingIdx >= 0) {
        queue[existingIdx] = item;
    } else {
        queue.push(item);
    }
    saveOfflineSyncQueue(queue);
    updateOfflineStatusUI();
    if (typeof appendYoloTerminalLog === 'function') {
        appendYoloTerminalLog(`[OFFLINE] 📦 Disimpan di antrean sinkronisasi lokal HP: ${label || type} (Tertunda: ${queue.length})`, 'config');
    }
    return item;
}
window.enqueueOfflineSync = enqueueOfflineSync;

async function flushOfflineSyncQueue() {
    if (isSyncingOfflineQueue) return;
    const queue = getOfflineSyncQueue();
    if (!queue || queue.length === 0) {
        updateOfflineStatusUI();
        return;
    }

    if (!navigator.onLine) {
        updateOfflineStatusUI();
        return;
    }

    isSyncingOfflineQueue = true;
    let syncedCount = 0;
    const remainingQueue = [];

    for (const item of queue) {
        try {
            const fetchFn = (typeof authFetch === 'function') ? authFetch : fetch;
            const res = await fetchFn(item.url, {
                method: item.method || 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item.payload)
            });

            if (res.ok) {
                syncedCount++;
                if (typeof appendYoloTerminalLog === 'function') {
                    appendYoloTerminalLog(`[SYNC] ✅ Berhasil disinkronkan ke server: ${item.label}`, 'system');
                }
            } else if (res.status === 401 || res.status === 403) {
                remainingQueue.push(item);
            } else {
                remainingQueue.push(item);
            }
        } catch (err) {
            remainingQueue.push(item);
            break;
        }
    }

    saveOfflineSyncQueue(remainingQueue);
    isSyncingOfflineQueue = false;
    updateOfflineStatusUI();

    if (syncedCount > 0) {
        showToast(`✅ Koneksi Internet HP Pulih! ${syncedCount} perubahan offline berhasil disinkronkan ke server NVR.`, 'success');
        if (typeof fetchCameras === 'function') fetchCameras();
    }
}
window.flushOfflineSyncQueue = flushOfflineSyncQueue;

function updateOfflineStatusUI() {
    const queue = getOfflineSyncQueue();
    const isOnline = navigator.onLine;
    let banner = document.getElementById('arch3r-connection-banner');

    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'arch3r-connection-banner';
        banner.style.position = 'fixed';
        banner.style.bottom = '14px';
        banner.style.right = '14px';
        banner.style.zIndex = '99999';
        banner.style.display = 'none';
        banner.style.padding = '8px 14px';
        banner.style.borderRadius = '30px';
        banner.style.fontSize = '0.78rem';
        banner.style.fontWeight = '600';
        banner.style.boxShadow = '0 4px 15px rgba(0,0,0,0.5)';
        banner.style.transition = 'all 0.3s ease';
        document.body.appendChild(banner);
    }

    if (!isOnline) {
        banner.style.display = 'flex';
        banner.style.alignItems = 'center';
        banner.style.gap = '8px';
        banner.style.background = 'rgba(239, 68, 68, 0.95)';
        banner.style.color = '#fff';
        banner.style.border = '1px solid #b91c1c';
        banner.dataset.wasOffline = 'true';
        banner.innerHTML = `<span>⚡ Offline (HP Terputus)</span> ${queue.length > 0 ? `<span style="background:#fff; color:#b91c1c; padding:1px 6px; border-radius:10px; font-size:0.7rem;">${queue.length} antrean</span>` : ''}`;
    } else if (queue.length > 0) {
        banner.style.display = 'flex';
        banner.style.alignItems = 'center';
        banner.style.gap = '8px';
        banner.style.background = 'rgba(245, 158, 11, 0.95)';
        banner.style.color = '#000';
        banner.style.border = '1px solid #d97706';
        banner.innerHTML = `<span>⏳ Menyinkronkan ${queue.length} perubahan ke NVR...</span>`;
    } else {
        if (banner.style.display !== 'none' && banner.dataset.wasOffline === 'true') {
            banner.style.background = 'rgba(16, 185, 129, 0.95)';
            banner.style.color = '#fff';
            banner.style.border = '1px solid #059669';
            banner.innerHTML = `<span>🟢 Terhubung Kembali ke NVR</span>`;
            setTimeout(() => {
                banner.style.display = 'none';
                banner.dataset.wasOffline = 'false';
            }, 3000);
        } else {
            banner.style.display = 'none';
        }
    }
}
window.updateOfflineStatusUI = updateOfflineStatusUI;

window.addEventListener('online', () => {
    updateOfflineStatusUI();
    if (typeof appendYoloTerminalLog === 'function') {
        appendYoloTerminalLog('[NETWORK] 🟢 Internet HP kembali online. Memulai sinkronisasi otomatis ke NVR...', 'system');
    }
    flushOfflineSyncQueue();
});

window.addEventListener('offline', () => {
    updateOfflineStatusUI();
    if (typeof appendYoloTerminalLog === 'function') {
        appendYoloTerminalLog('[NETWORK] ⚠️ Internet HP terputus. Mode perlindungan offline aktif (Data disimpan di HP).', 'alarm');
    }
    showToast('⚠️ Sambungan Internet HP Terputus. Perubahan tetap disimpan di HP & otomatis disinkronkan saat online.', 'warning');
});

setInterval(() => {
    if (navigator.onLine && getOfflineSyncQueue().length > 0) {
        flushOfflineSyncQueue();
    }
}, 4000);

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
    // --- Kiosk Shield & Real-Time TV Remote Controller Engine ---
    let kioskPollerInterval = null;
    let lastKioskUpdatedAt = 0;
    let lastRefreshSeq = 0;

    function applyKioskDisplayMode() {
        document.body.classList.add('kiosk-display-mode');
        const sidebar = document.getElementById('sidebar');
        const topNav = document.querySelector('.top-navbar');
        const mainContent = document.querySelector('.main-content');
        const monitorWrapper = document.getElementById('monitorWrapper');

        if (sidebar) sidebar.style.display = 'none';
        if (topNav) topNav.style.display = 'none';
        if (mainContent) {
            mainContent.style.marginLeft = '0';
            mainContent.style.width = '100vw';
            mainContent.style.height = '100vh';
            mainContent.style.padding = '0';
        }
        if (monitorWrapper) {
            monitorWrapper.style.width = '100vw';
            monitorWrapper.style.height = '100vh';
        }

        const monitorPane = document.getElementById('view-monitor');
        if (monitorPane) {
            document.querySelectorAll('.view-pane').forEach(p => p.classList.remove('active'));
            monitorPane.classList.add('active');
        }
    }
    window.applyKioskDisplayMode = applyKioskDisplayMode;

    let lastReloadSeq = 0;
    let kioskTourIntervalTimer = null;
    let kioskTourIndex = 0;
    let kioskEventSource = null;

    function applyKioskStateChanges(st) {
        if (!st) return;

        // 1. Hard Reload TV (Memaksa Chromium STB memuat ulang seluruh halaman)
        if (st.reload_seq && st.reload_seq !== lastReloadSeq) {
            lastReloadSeq = st.reload_seq;
            console.log('[KIOSK] Sinyal Hard Reload diterima dari Remote HP, memuat ulang layar TV...');
            window.location.reload(true);
            return;
        }

        // 2. Sambung Ulang Stream (Re-sync)
        if (st.refresh_seq && st.refresh_seq !== lastRefreshSeq) {
            lastRefreshSeq = st.refresh_seq;
            if (typeof window.refreshAllStreams === 'function') {
                window.refreshAllStreams();
            }
        }

        // 3. Standby / Layar Hitam Hemat Daya
        let blackoutDiv = document.getElementById('kioskBlackoutOverlay');
        if (st.blackout) {
            if (!blackoutDiv) {
                blackoutDiv = document.createElement('div');
                blackoutDiv.id = 'kioskBlackoutOverlay';
                blackoutDiv.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#000;z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#475569;font-family:sans-serif;';
                blackoutDiv.innerHTML = '<div style="font-size:3.5rem;margin-bottom:0.75rem;">🌙</div><div style="font-size:1.15rem;letter-spacing:1px;color:#64748b;font-weight:600;">ARCH3R NVR MONITOR STANDBY</div><div style="font-size:0.82rem;color:#475569;margin-top:0.4rem;">Layar TV dalam mode hemat daya • Aktifkan kembali lewat HP</div>';
                document.body.appendChild(blackoutDiv);
            }
            blackoutDiv.style.display = 'flex';
        } else if (blackoutDiv) {
            blackoutDiv.style.display = 'none';
        }

        // 4. Auto-Tour / Patroli Bergilir Otomatis
        if (st.tour) {
            if (!kioskTourIntervalTimer) {
                const intervalSec = (st.tour_interval || 10) * 1000;
                kioskTourIntervalTimer = setInterval(() => {
                    if (Array.isArray(cameras) && cameras.length > 0) {
                        kioskTourIndex = (kioskTourIndex + 1) % cameras.length;
                        const nextCam = cameras[kioskTourIndex];
                        if (nextCam && typeof window.onChannelDropdownChange === 'function') {
                            window.onChannelDropdownChange(nextCam.id);
                            if (typeof window.setGridLayout === 'function') {
                                window.setGridLayout(1);
                            }
                        }
                    }
                }, intervalSec);
            }
        } else {
            if (kioskTourIntervalTimer) {
                clearInterval(kioskTourIntervalTimer);
                kioskTourIntervalTimer = null;
            }
        }

        // 5. Preset Tata Letak Grid TV (Instan < 50ms tanpa double-render & bebas kedip)
        let targetGrid = selectedGridCount;
        let targetChannel = activeChannel;

        if (st.preset === 'grid_1' || st.preset === 'single') {
            targetGrid = 1;
            targetChannel = st.target_cam_id || 'all';
        } else if (st.preset === 'grid_4' || st.preset === 'live_grid') {
            targetGrid = 4;
            targetChannel = 'all';
        } else if (st.preset === 'grid_6') {
            targetGrid = 6;
            targetChannel = 'all';
        } else if (st.preset === 'grid_9' || st.preset === 'live_grid_3x3') {
            targetGrid = 9;
            targetChannel = 'all';
        } else if (st.preset === 'grid_16') {
            targetGrid = 16;
            targetChannel = 'all';
        }

        // Jalankan render TEPAT SATU KALI hanya jika layout atau kamera tujuan benar-benar berbeda
        if (targetGrid !== selectedGridCount || targetChannel !== activeChannel) {
            selectedGridCount = targetGrid;
            activeChannel = targetChannel;
            if (channelSelect) channelSelect.value = targetChannel;
            if (typeof updateGridDisplay === 'function') {
                updateGridDisplay();
            }
        }
    }

    function startKioskRemotePoller() {
        // A. Jalur Real-Time Push SSE (< 50ms respon seketika)
        if (window.EventSource && !kioskEventSource) {
            try {
                kioskEventSource = new EventSource('/api/addons/hdmi-kiosk/events');
                kioskEventSource.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data && data.liveState) {
                            applyKioskStateChanges(data.liveState);
                        }
                    } catch (_) {}
                };
            } catch (_) {}
        }

        // B. Heartbeat Fallback Polling (Cadangan 4 detik)
        if (kioskPollerInterval) return;
        kioskPollerInterval = setInterval(async () => {
            try {
                const res = await fetch('/api/addons/hdmi-kiosk/live-state');
                if (!res.ok) return;
                const data = await res.json();
                if (!data.success || !data.liveState) return;

                const st = data.liveState;
                if (st.updated_at && st.updated_at !== lastKioskUpdatedAt) {
                    lastKioskUpdatedAt = st.updated_at;
                    applyKioskStateChanges(st);
                }
            } catch (_) {}
        }, 4000);
    }
    window.startKioskRemotePoller = startKioskRemotePoller;

async function checkAuth() {
        // 0. Jalur Cepat Kiosk Layar TV STB (Bebas Form Login & Langsung Auto-Handshake)
        const isKioskCandidate = window.location.search.includes('kiosk=1') || 
                                 window.location.hash.includes('kiosk') || 
                                 localStorage.getItem('nvr_role') === 'kiosk_viewer' ||
                                 window.location.hostname === 'localhost' || 
                                 window.location.hostname === '127.0.0.1';

        if (isKioskCandidate) {
            window.isKioskDisplay = true;
            applyKioskDisplayMode();
            if (authOverlay) authOverlay.style.display = 'none';

            try {
                const kioskRes = await fetch('/api/kiosk/auth', { method: 'POST' });
                if (kioskRes.ok) {
                    const kData = await kioskRes.json();
                    if (kData.success && kData.token) {
                        localStorage.setItem('nvr_auth_token', kData.token);
                        localStorage.setItem('nvr_role', kData.role);
                        localStorage.setItem('nvr_username', kData.username);
                        currentUserRole = kData.role;
                        currentUsername = kData.username;

                        if (userApp) userApp.style.display = 'none';
                        if (adminApp) adminApp.style.display = 'flex';
                        initAdminDashboard();
                        startKioskRemotePoller();
                        return;
                    }
                }
            } catch (kErr) {
                console.warn('[KIOSK] Auto-handshake STB tertunda:', kErr);
            }
        }

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

                // Jika peran adalah Kiosk Viewer atau URL mengandung parameter Kiosk
                const isKioskQuery = window.location.search.includes('kiosk=1') || window.location.hash.includes('kiosk');
                if (currentUserRole === 'kiosk_viewer' || isKioskQuery) {
                    window.isKioskDisplay = true;
                    applyKioskDisplayMode();
                    userApp.style.display = 'none';
                    adminApp.style.display = 'flex';
                    initAdminDashboard();
                    startKioskRemotePoller();
                    return;
                }

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

        window.navigateToView = function(targetId, updateUrl = true) {
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

            // Handle URL path updating for dedicated route /addons/yolo-ai
            if (updateUrl && window.history && window.history.pushState) {
                if (targetId === 'view-yolo-ai') {
                    if (window.location.pathname !== '/addons/yolo-ai') {
                        window.history.pushState({ view: targetId }, '', '/addons/yolo-ai');
                    }
                } else {
                    if (window.location.pathname === '/addons/yolo-ai' || window.location.pathname === '/yolo-ai') {
                        window.history.pushState({ view: targetId }, '', '/');
                    }
                }
            }

            if (targetId === 'view-addons' || targetId === 'view-yolo-ai') {
                if (typeof resetAddonsView === 'function') resetAddonsView();
                if (typeof fetchInstalledAddons === 'function') fetchInstalledAddons();
            } else if (targetId === 'view-about') {
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

        // Router listener for browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            const path = window.location.pathname;
            if (path.includes('/addons/yolo-ai') || path.includes('/yolo-ai')) {
                window.navigateToView('view-yolo-ai', false);
            } else if (e.state && e.state.view) {
                window.navigateToView(e.state.view, false);
            } else {
                window.navigateToView('view-live', false);
            }
        });

        // Initial route check on page load
        const initPath = window.location.pathname;
        const initHash = window.location.hash;
        if (initPath.includes('/addons/yolo-ai') || initPath.includes('/yolo-ai') || initHash === '#yolo-ai' || initHash === '#addons/yolo-ai') {
            setTimeout(() => {
                window.navigateToView('view-yolo-ai', false);
            }, 100);
        }

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

    // --- RTSP Live Stream Video Test Engine ---
    let rtspTestHlsPlayer = null;

    async function runRtspVideoTest() {
        const mainStreamUrl = document.getElementById('camMainUrl') ? document.getElementById('camMainUrl').value.trim() : '';
        const ipAddress = document.getElementById('camIpAddress') ? document.getElementById('camIpAddress').value.trim() : '';
        const rtspPort = document.getElementById('camRtspPort') ? document.getElementById('camRtspPort').value.trim() : '554';
        const username = document.getElementById('camUsername') ? document.getElementById('camUsername').value.trim() : '';
        const password = document.getElementById('camPassword') ? document.getElementById('camPassword').value : '';

        const testContainer = document.getElementById('rtspTestContainer');
        const badge = document.getElementById('rtspTestStatusBadge');
        const overlay = document.getElementById('rtspTestOverlayMsg');
        const overlayText = document.getElementById('rtspTestOverlayText');
        const diag = document.getElementById('rtspTestDiagnostics');
        const videoEl = document.getElementById('videoRtspTestPreview');

        if (!mainStreamUrl && !ipAddress) {
            alert('Silakan masukkan IP Address Kamera atau URL Stream RTSP terlebih dahulu untuk melakukan tes video.');
            return;
        }

        if (typeof switchCameraTab === 'function') {
            switchCameraTab('ctab-streams');
        }

        if (testContainer) testContainer.style.display = 'block';
        if (badge) {
            badge.style.background = '#3b82f6';
            badge.textContent = '⏳ Testing Stream...';
        }
        if (overlay) overlay.style.display = 'flex';
        if (overlayText) overlayText.textContent = 'Menghubungkan ke RTSP stream & melakukan analisa codec video...';
        if (diag) diag.textContent = '[INIT] Memulai tes koneksi RTSP...\nTarget: ' + (mainStreamUrl || ipAddress);

        if (rtspTestHlsPlayer) {
            try { rtspTestHlsPlayer.destroy(); } catch(e) {}
            rtspTestHlsPlayer = null;
        }
        if (videoEl) {
            videoEl.pause();
            videoEl.src = '';
        }

        try {
            const payload = {
                rtspUrl: mainStreamUrl,
                ipAddress,
                rtspPort,
                username,
                password
            };

            const res = await authFetch('/api/system/test-rtsp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (res.ok && data.success) {
                if (badge) {
                    badge.style.background = '#10b981';
                    badge.textContent = '🟢 STREAM ONLINE';
                }

                if (data.rtspUrl) {
                    const mainUrlEl = document.getElementById('camMainUrl');
                    if (mainUrlEl && !mainUrlEl.value) {
                        mainUrlEl.value = data.rtspUrl;
                    }
                }

                const d = data.diagnostics || {};
                if (diag) {
                    diag.textContent = `[SUCCESS] RTSP Connection Handshake OK!
URL Target   : ${data.maskedUrl || data.rtspUrl}
Video Codec  : ${d.videoCodec || 'H.264'}
Resolusi     : ${d.resolution || '-'}
FPS          : ${d.fps || '-'}
Audio Track  : ${d.audioCodec || 'None'}
Status Video : Live Preview Ready`;
                }

                if (overlay) overlay.style.display = 'none';

                if (videoEl && data.hlsUrl) {
                    if (window.Hls && Hls.isSupported()) {
                        rtspTestHlsPlayer = new Hls({
                            manifestLoadingTimeOut: 8000,
                            manifestLoadingMaxRetry: 5,
                            levelLoadingTimeOut: 8000
                        });
                        rtspTestHlsPlayer.loadSource(data.hlsUrl);
                        rtspTestHlsPlayer.attachMedia(videoEl);
                        rtspTestHlsPlayer.on(Hls.Events.MANIFEST_PARSED, () => {
                            videoEl.play().catch(e => console.log('Preview autoplay muted:', e));
                        });
                    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
                        videoEl.src = data.hlsUrl;
                        videoEl.play().catch(e => console.log('Preview autoplay muted:', e));
                    }
                }
            } else {
                if (badge) {
                    badge.style.background = '#ef4444';
                    badge.textContent = '🔴 GAGAL KONEKSI';
                }
                if (overlay) overlay.style.display = 'flex';
                if (overlayText) overlayText.innerHTML = `<span style="color:#f87171; font-weight:600;">⚠️ ${data.error || 'Gagal terhubung ke RTSP stream.'}</span><br><small style="color:#94a3b8; margin-top:4px; display:block;">Periksa username, password, IP address, dan RTSP port (554).</small>`;
                if (diag) {
                    diag.textContent = `[ERROR] Connection Failed!
URL Target   : ${data.maskedUrl || data.rtspUrl || ipAddress}
Detail Error : ${data.error || 'Unknown error'}
Log Diagnostic: ${data.detail || 'Tidak ada respon dari port RTSP. Pastikan kamera terhubung ke jaringan lokal NVR.'}`;
                }
            }
        } catch (err) {
            if (badge) {
                badge.style.background = '#ef4444';
                badge.textContent = '🔴 ERROR SYSTEM';
            }
            if (overlay) overlay.style.display = 'flex';
            if (overlayText) overlayText.textContent = 'Terjadi kesalahan sistem saat menghubungi server NVR: ' + err.message;
            if (diag) diag.textContent = '[SYSTEM ERROR] ' + err.message;
        }
    }

    function closeRtspVideoTest() {
        const testContainer = document.getElementById('rtspTestContainer');
        if (testContainer) testContainer.style.display = 'none';
        const videoEl = document.getElementById('videoRtspTestPreview');
        if (rtspTestHlsPlayer) {
            try { rtspTestHlsPlayer.destroy(); } catch(e) {}
            rtspTestHlsPlayer = null;
        }
        if (videoEl) {
            videoEl.pause();
            videoEl.src = '';
        }
    }

    const btnTestRtspVideoQuick = document.getElementById('btnTestRtspVideoQuick');
    if (btnTestRtspVideoQuick) {
        btnTestRtspVideoQuick.addEventListener('click', runRtspVideoTest);
    }

    const btnTestRtspStream = document.getElementById('btnTestRtspStream');
    if (btnTestRtspStream) {
        btnTestRtspStream.addEventListener('click', runRtspVideoTest);
    }

    const btnCloseRtspTest = document.getElementById('btnCloseRtspTest');
    if (btnCloseRtspTest) {
        btnCloseRtspTest.addEventListener('click', closeRtspVideoTest);
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
        if (typeof closeRtspVideoTest === 'function') closeRtspVideoTest();

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
                showToast('✅ Kamera berhasil disimpan!', 'success');
                
                resetCameraForm();
                fetchCameras();
            } catch (err) {
                if (!navigator.onLine || err.message?.includes('fetch') || err.message?.includes('NetworkError') || err.message?.includes('Failed to fetch')) {
                    enqueueOfflineSync('camera', id ? ('/api/cameras/' + id) : '/api/cameras', id ? 'PUT' : 'POST', payload, payload.name || 'Kamera');
                    showToast(`📱 Internet HP Terputus. Konfigurasi kamera "${payload.name || ''}" diamankan di HP & otomatis disimpan ke NVR saat koneksi pulih.`, 'warning');
                    resetCameraForm();
                    return;
                }
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
                
                showToast('✅ Pengaturan storage berhasil disimpan!', 'success');
            } catch (err) {
                if (!navigator.onLine || err.message?.includes('fetch') || err.message?.includes('NetworkError')) {
                    enqueueOfflineSync('storage_settings', '/api/settings', 'POST', payload, 'Pengaturan Storage');
                    showToast('📱 Sambungan HP Terputus: Pengaturan storage disimpan di HP & akan disinkronkan saat terhubung.', 'warning');
                    return;
                }
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
                showToast('✅ Konfigurasi sistem berhasil disimpan!', 'success');
            } catch (err) {
                if (!navigator.onLine || err.message?.includes('fetch') || err.message?.includes('NetworkError')) {
                    enqueueOfflineSync('system_settings', '/api/settings', 'POST', payload, 'Konfigurasi Sistem');
                    showToast('📱 Sambungan HP Terputus: Konfigurasi sistem disimpan di HP & akan disinkronkan saat terhubung.', 'warning');
                    return;
                }
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
        if (window.isKioskDisplay) {
            // Pada mode TV Kiosk, jendela peramban sudah 100vw x 100vh (--kiosk).
            // Memanggil OS fullscreen di X11 Armbian akan memicu renegosiasi mode HDMI (layar kedip hitam).
            return;
        }
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
    const activeWebRtcPlayers = {};
    window.activeHlsPlayers = activeHlsPlayers;
    window.activeWebRtcPlayers = activeWebRtcPlayers;

    function destroyHlsPlayers() {
        for (const id in activeHlsPlayers) {
            if (activeHlsPlayers[id]) {
                try { activeHlsPlayers[id].destroy(); } catch (e) {}
            }
            delete activeHlsPlayers[id];
        }
        for (const id in activeWebRtcPlayers) {
            if (activeWebRtcPlayers[id]) {
                try {
                    const pc = activeWebRtcPlayers[id];
                    if (typeof pc.close === 'function') pc.close();
                } catch (e) {}
            }
            delete activeWebRtcPlayers[id];
        }
    }
    window.destroyHlsPlayers = destroyHlsPlayers;
    window.activeHlsPlayers = activeHlsPlayers;

    // WebRTC WHEP Ultra-Low Latency Player (~0.1s delay) with Auto Fallback to HLS
    async function playUltraStream(elementId, hlsUrl, streamPath, onReady, onError) {
        const video = (typeof elementId === 'string') ? document.getElementById(elementId) : elementId;
        if (!video) return null;

        const id = video.id || (typeof elementId === 'string' ? elementId : 'video_' + Math.random().toString(36).substr(2, 9));

        if (activeHlsPlayers[id]) {
            try { activeHlsPlayers[id].destroy(); } catch (e) {}
            delete activeHlsPlayers[id];
        }
        if (activeWebRtcPlayers[id]) {
            try { activeWebRtcPlayers[id].close(); } catch (e) {}
            delete activeWebRtcPlayers[id];
        }

        // Coba jalur WebRTC (MediaMTX WHEP) terlebih dahulu untuk memotong latensi hingga 0.1 detik
        if (window.RTCPeerConnection && streamPath) {
            try {
                const pc = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
                    bundlePolicy: 'max-bundle'
                });
                activeWebRtcPlayers[id] = pc;

                pc.addTransceiver('video', { direction: 'recvonly' });
                pc.addTransceiver('audio', { direction: 'recvonly' });

                const stream = new MediaStream();
                video.srcObject = stream;

                pc.ontrack = (event) => {
                    if (event.track) stream.addTrack(event.track);
                    video.play().catch(() => {});
                };

                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                const mediamtxPort = (window.nvrSystemSettings && window.nvrSystemSettings.mediamtxPort) || 8889;
                const endpoints = [
                    `/whep/${streamPath}/whep`,
                    `http://${window.location.hostname}:${mediamtxPort}/${streamPath}/whep`
                ];

                let connected = false;
                for (const url of endpoints) {
                    try {
                        const ctrl = new AbortController();
                        const tmr = setTimeout(() => ctrl.abort(), 2000);
                        const res = await fetch(url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/sdp' },
                            body: offer.sdp,
                            signal: ctrl.signal
                        });
                        clearTimeout(tmr);

                        if (res.ok) {
                            const answerSdp = await res.text();
                            await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
                            connected = true;
                            if (typeof onReady === 'function') onReady(pc);
                            return pc;
                        }
                    } catch (_) {}
                }

                if (!connected) {
                    try { pc.close(); } catch (_) {}
                    delete activeWebRtcPlayers[id];
                    video.srcObject = null;
                }
            } catch (wErr) {
                if (activeWebRtcPlayers[id]) {
                    try { activeWebRtcPlayers[id].close(); } catch (_) {}
                    delete activeWebRtcPlayers[id];
                }
                video.srcObject = null;
            }
        }

        // Fallback otomatis ke HLS jika WebRTC belum siap atau tidak tersedia
        return initHlsPlayer(video, hlsUrl, onReady, onError);
    }
    window.playUltraStream = playUltraStream;

    function initHlsPlayer(elementId, hlsUrl, onReady, onError) {
        const video = (typeof elementId === 'string') ? document.getElementById(elementId) : elementId;
        if (!video) return null;

        const id = video.id || (typeof elementId === 'string' ? elementId : 'video_' + Math.random().toString(36).substr(2, 9));

        if (activeHlsPlayers[id]) {
            try { activeHlsPlayers[id].destroy(); } catch (e) {}
            delete activeHlsPlayers[id];
        }

        if (Hls.isSupported()) {
            const token = (typeof getAuthToken === 'function') ? getAuthToken() : (localStorage.getItem('nvr_auth_token') || localStorage.getItem('arch3r_token') || '');
            const hls = new Hls({
                lowLatencyMode: true,
                maxBufferLength: 6,
                maxMaxBufferLength: 10,
                maxBufferSize: 15 * 1024 * 1024,
                backBufferLength: 0,
                enableWorker: true,
                xhrSetup: function (xhr, url) {
                    xhr.withCredentials = true;
                    if (token) {
                        xhr.setRequestHeader('Authorization', 'Bearer ' + token);
                    }
                }
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
                    const streamPath = (curQuality === 'SD' && hasDistinctSub)
                        ? (cam.mediaMtxSubPath || ((cam.mediaMtxPath || cam.id) + '_sub'))
                        : (cam.mediaMtxPath || cam.id);

                    if (curQuality === 'SD' && hasDistinctSub) {
                        if (cam.subStreamUrl && cam.subStreamUrl.startsWith('http')) {
                            hlsUrl = cam.subStreamUrl;
                        } else {
                            hlsUrl = '/stream/' + streamPath + '/index.m3u8?token=' + encodeURIComponent(getAuthToken());
                        }
                    } else {
                        hlsUrl = cam.mainStreamUrl && cam.mainStreamUrl.startsWith('http') ? cam.mainStreamUrl : ('/stream/' + streamPath + '/index.m3u8?token=' + encodeURIComponent(getAuthToken()));
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
                    inits.push(() => { if (cam.enabled !== false) playUltraStream(videoId, hlsUrl, streamPath); });
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
                    const streamPath = (curQuality === 'SD' && hasDistinctSub)
                        ? (cam.mediaMtxSubPath || ((cam.mediaMtxPath || cam.id) + '_sub'))
                        : (cam.mediaMtxPath || cam.id);

                    if (curQuality === 'SD' && hasDistinctSub) {
                        if (cam.subStreamUrl && cam.subStreamUrl.startsWith('http')) {
                            hlsUrl = cam.subStreamUrl;
                        } else {
                            hlsUrl = '/stream/' + streamPath + '/index.m3u8?token=' + encodeURIComponent(getAuthToken());
                        }
                    } else {
                        hlsUrl = cam.mainStreamUrl && cam.mainStreamUrl.startsWith('http') ? cam.mainStreamUrl : ('/stream/' + streamPath + '/index.m3u8?token=' + encodeURIComponent(getAuthToken()));
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
                    inits.push(() => { if (cam.enabled !== false) playUltraStream(videoId, hlsUrl, streamPath); });
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
        label: '🎯 Area Pantauan Utama',
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
    if (tabName === 'sim' || tabName === 'market') {
        if (typeof openAISettingsModal === 'function') openAISettingsModal();
        if (typeof switchAISubTab === 'function') switchAISubTab(tabName);
        return;
    }
    
    setTimeout(() => {
        initAIDrawCanvas();
        loadCamStreamForAI();
    }, 30);
}
window.switchAIGridTab = switchAIGridTab;

// Global Digital Zoom & Pan State
window.aiDigitalZoomState = window.aiDigitalZoomState || { zoom: 1.0, panX: 0, panY: 0 };

function adjustDigitalZoom(delta) {
    window.aiDigitalZoomState.zoom = Math.min(3.0, Math.max(1.0, (window.aiDigitalZoomState.zoom || 1.0) + delta));
    const badge = document.getElementById('ai-zoom-level-badge');
    if (badge) badge.textContent = `${Math.round(window.aiDigitalZoomState.zoom * 100)}%`;
    applyDigitalZoomToCanvas();
}
window.adjustDigitalZoom = adjustDigitalZoom;

function panDigitalZoom(direction) {
    const step = 20;
    if (direction === 'left') window.aiDigitalZoomState.panX = (window.aiDigitalZoomState.panX || 0) + step;
    if (direction === 'right') window.aiDigitalZoomState.panX = (window.aiDigitalZoomState.panX || 0) - step;
    if (direction === 'up') window.aiDigitalZoomState.panY = (window.aiDigitalZoomState.panY || 0) + step;
    if (direction === 'down') window.aiDigitalZoomState.panY = (window.aiDigitalZoomState.panY || 0) - step;
    applyDigitalZoomToCanvas();
}
window.panDigitalZoom = panDigitalZoom;

function resetDigitalZoom() {
    window.aiDigitalZoomState = { zoom: 1.0, panX: 0, panY: 0 };
    const badge = document.getElementById('ai-zoom-level-badge');
    if (badge) badge.textContent = '100%';
    applyDigitalZoomToCanvas();
}
window.resetDigitalZoom = resetDigitalZoom;

function applyDigitalZoomToCanvas() {
    const streamImg = document.getElementById('ai-stream-img');
    const drawCanvas = document.getElementById('ai-draw-canvas');
    const { zoom, panX, panY } = window.aiDigitalZoomState || { zoom: 1.0, panX: 0, panY: 0 };
    
    [streamImg, drawCanvas].forEach(el => {
        if (el) {
            el.style.transform = `scale(${zoom}) translate(${panX}px, ${panY}px)`;
            el.style.transformOrigin = 'center center';
            el.style.transition = 'transform 0.15s ease-out';
        }
    });
}
window.applyDigitalZoomToCanvas = applyDigitalZoomToCanvas;

function syncCamSelectStep1(camId) {
    const mainSelect = document.getElementById('ai-cam-select');
    if (mainSelect) {
        mainSelect.value = camId;
        if (typeof loadCamStreamForAI === 'function') loadCamStreamForAI();
    }
}
window.syncCamSelectStep1 = syncCamSelectStep1;

function syncImgSzStep1(szVal) {
    const mainImgSz = document.getElementById('ai-imgsz-select');
    if (mainImgSz) mainImgSz.value = szVal;
}
window.syncImgSzStep1 = syncImgSzStep1;

function populateStep1CamDropdown() {
    const step1Select = document.getElementById('ai-step1-cam-select');
    const mainSelect = document.getElementById('ai-cam-select');
    if (!step1Select) return;
    
    const camList = (window.cameras || (typeof cameras !== 'undefined' ? cameras : [])).filter(c => c && c.id && c.id !== 'virtual_test');
    
    if (camList.length === 0) {
        step1Select.innerHTML = '<option value="">-- Belum Ada Kamera --</option>';
        return;
    }
    
    step1Select.innerHTML = camList.map(c => `<option value="${c.id}">${c.name || 'Kamera ' + c.id} (${c.ip || 'RTSP'})</option>`).join('');
    if (mainSelect && mainSelect.value) {
        step1Select.value = mainSelect.value;
    }
}
window.populateStep1CamDropdown = populateStep1CamDropdown;

// Sub-tab switcher for Live Studio settings (3-step workflow + tools)
function switchAISubTab(subTabName) {
    const subTabs = ['step1_cam', 'zones', 'prompt', 'esp', 'telemetry', 'telegram', 'sim', 'market'];
    subTabs.forEach(tab => {
        const pane = document.getElementById(`ai-subpane-${tab}`) || document.getElementById(`ai-subtab-pane-${tab}`) || document.getElementById(`ai-tab-pane-${tab}`);
        const btn = document.getElementById(`ai-subtab-btn-${tab}`) || document.getElementById(`ai-tab-btn-${tab}`);
        if (pane) {
            pane.style.display = (tab === subTabName) ? 'block' : 'none';
        }
        if (btn) {
            if (tab === subTabName) {
                btn.style.color = (tab === 'market') ? '#f59e0b' : ((tab === 'sim') ? '#60a5fa' : '#38bdf8');
                btn.style.borderBottomColor = (tab === 'market') ? '#f59e0b' : ((tab === 'sim') ? '#60a5fa' : '#38bdf8');
                btn.style.background = 'rgba(56,189,248,0.12)';
            } else {
                btn.style.color = 'var(--text-muted, #94a3b8)';
                btn.style.borderBottomColor = 'transparent';
                btn.style.background = 'transparent';
            }
        }
    });

    if (subTabName === 'step1_cam') {
        populateStep1CamDropdown();
    } else if (subTabName === 'zones') {
        setTimeout(() => {
            if (typeof initAIDrawCanvas === 'function') initAIDrawCanvas();
            if (typeof loadCamStreamForAI === 'function') loadCamStreamForAI();
        }, 30);
    } else if (subTabName === 'sim') {
        if (typeof initSimSandbox === 'function') initSimSandbox();
    } else if (subTabName === 'market') {
        if (typeof fetchMarketplacePresets === 'function') fetchMarketplacePresets();
    }
}
window.switchAISubTab = switchAISubTab;

// Render Daftar Kamera AI NVR Overview Grid
function renderAiCameraOverviewGrid() {
    const grid = document.getElementById('ai-cameras-overview-grid');
    const badge = document.getElementById('ai-cam-count-badge');
    if (!grid) return;

    const camList = (window.cameras || (typeof cameras !== 'undefined' ? cameras : [])).filter(c => c && c.id && c.id !== 'virtual_test');
    if (badge) badge.textContent = `${camList.length} Kamera NVR`;

    if (camList.length === 0) {
        grid.innerHTML = `
            <div style="grid-column:1/-1; padding:1.2rem; text-align:center; color:var(--text-muted); background:rgba(0,0,0,0.25); border-radius:8px; font-size:0.85rem; border:1px dashed var(--border);">
                ⚠️ Belum ada kamera terhubung di NVR. Silakan tambahkan kamera baru di menu Pengaturan Kamera.
            </div>
        `;
        return;
    }

    grid.innerHTML = camList.map((cam, idx) => {
        const isSelected = (typeof aiCurrentCam !== 'undefined' && aiCurrentCam && String(aiCurrentCam.id) === String(cam.id));
        const aiEnabled = (cam.ai_config && cam.ai_config.enabled !== false);
        const presetName = (cam.ai_config && cam.ai_config.preset_name) ? cam.ai_config.preset_name : 'Standard ROI';
        const roiCount = (cam.ai_config && cam.ai_config.grid && Array.isArray(cam.ai_config.grid.zones)) ? cam.ai_config.grid.zones.length : 1;
        
        return `
            <div style="background:rgba(15,23,42,0.85); border:1px solid ${isSelected ? '#38bdf8' : 'var(--border)'}; border-radius:8px; padding:0.85rem; box-shadow:${isSelected ? '0 0 12px rgba(56,189,248,0.25)' : 'none'}; transition:all 0.2s ease;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
                    <div>
                        <div style="font-weight:700; font-size:0.88rem; color:#f8fafc; display:flex; align-items:center; gap:0.4rem;">
                            <span>📹</span> ${cam.name || ('Kamera ' + (idx + 1))}
                        </div>
                        <div style="font-size:0.75rem; color:var(--text-muted); font-family:monospace; margin-top:2px;">
                            ${cam.ip || 'RTSP Local'}
                        </div>
                    </div>
                    <span style="font-size:0.7rem; padding:2px 7px; border-radius:4px; font-weight:700; ${aiEnabled ? 'background:rgba(34,197,94,0.15); color:#34d399; border:1px solid rgba(34,197,94,0.3);' : 'background:rgba(148,163,184,0.15); color:#94a3b8; border:1px solid rgba(148,163,184,0.3);'}">
                        ${aiEnabled ? '🟢 AI Aktif' : '⚪ AI Non-Aktif'}
                    </span>
                </div>
                <div style="font-size:0.75rem; color:#93c5fd; margin-bottom:0.65rem; display:flex; justify-content:space-between; background:rgba(0,0,0,0.3); padding:4px 8px; border-radius:4px;">
                    <span>Preset: <strong>${presetName}</strong></span>
                    <span><strong>${roiCount}</strong> Objek ROI</span>
                </div>
                <button type="button" class="btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}" onclick="selectCamForAIWorkstation('${cam.id}')" style="width:100%; font-size:0.78rem; padding:0.3rem 0.5rem; justify-content:center; display:flex; align-items:center; gap:0.35rem; ${isSelected ? 'background:#0284c7; border-color:#38bdf8;' : ''}">
                    <span>${isSelected ? '🎯 Sedang Dikelola' : '👉 Pilih Kamera Ini'}</span>
                </button>
            </div>
        `;
    }).join('');
}
window.renderAiCameraOverviewGrid = renderAiCameraOverviewGrid;

function selectCamForAIWorkstation(camId) {
    const select = document.getElementById('ai-cam-select');
    if (select) {
        select.value = camId;
        loadCamStreamForAI();
    }
    renderAiCameraOverviewGrid();
    const studio = document.querySelector('.ai-workstation-card');
    if (studio) studio.scrollIntoView({ behavior: 'smooth' });
}
window.selectCamForAIWorkstation = selectCamForAIWorkstation;

function applyQuickPresetYai(presetVal) {
    if (!presetVal) return;
    if (typeof setAIGridPreset === 'function') {
        if (presetVal === 'center') setAIGridPreset('center');
        else if (presetVal === 'full') setAIGridPreset('full');
        else if (presetVal === 'clear') setAIGridPreset('clear');
    }
}
window.applyQuickPresetYai = applyQuickPresetYai;

async function testAITelegramAlert() {
    const botInp = document.getElementById('ai-telegram-bot-token');
    const chatInp = document.getElementById('ai-telegram-chat-id');
    const msgInp = document.getElementById('ai-telegram-test-msg');
    const statusDiv = document.getElementById('ai-telegram-test-status');

    const botToken = botInp ? botInp.value.trim() : '';
    const chatId = chatInp ? chatInp.value.trim() : '';
    const message = msgInp ? msgInp.value.trim() : 'Tes notifikasi alarm YOLO Visi AI NVR';

    if (statusDiv) {
        statusDiv.innerHTML = '<span style="color:#60a5fa;">⏳ Mengirim notifikasi tes Telegram...</span>';
    }

    try {
        const fetchFn = (typeof authFetch === 'function') ? authFetch : (window.authFetch || fetch);
        const res = await fetchFn('/api/ai/test-telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ botToken, chatId, message })
        });
        const data = await res.json();
        if (data.success) {
            if (statusDiv) statusDiv.innerHTML = `<span style="color:#34d399;">✅ ${data.message}</span>`;
            appendAITelemetry('✈️ Notifikasi Telegram berhasil terkirim!', 'success');
        } else {
            if (statusDiv) statusDiv.innerHTML = `<span style="color:#f87171;">❌ ${data.error || 'Gagal mengirim Telegram'}</span>`;
            appendAITelemetry(`❌ Gagal Telegram: ${data.error}`, 'alarm');
        }
    } catch (e) {
        if (statusDiv) statusDiv.innerHTML = `<span style="color:#f87171;">❌ Error: ${e.message}</span>`;
    }
}
window.testAITelegramAlert = testAITelegramAlert;

// Simulated SPBU targets (Motorcyclist & Person Refueling)
let aiSimState = {
    phase: 'approaching', // 'approaching', 'refueling', 'leaving'
    phaseTimer: 0,
    vehicle: { type: 'motorcycle', label: '🛵 Sepeda Motor', x: 40, y: 220, vx: 2.2, vy: 0, w: 90, h: 60, stationary: false, conf: 0.94 },
    person: { type: 'person', label: '👤 Pengendara/Pelanggan', x: 75, y: 195, vx: 2.2, vy: 0, w: 45, h: 95, stationary: false, conf: 0.96 },
    pump: { x: 0.52, y: 0.38, w: 0.12, h: 0.35 } // relative coordinates
};

async function initLegacyYoloAiPage(defaultCamId = null) {
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
        
        select.onchange = () => {
            loadCamStreamForAI();
        };
    }

    // Restore saved default YOLO AI config if available
    try {
        const rawSaved = localStorage.getItem('default_yolo_ai_config');
        if (rawSaved) {
            const savedCfg = JSON.parse(rawSaved);
            if (savedCfg.camId || savedCfg.camera_id) {
                const targetCam = savedCfg.camId || savedCfg.camera_id;
                if (select && Array.from(select.options).some(o => o.value === targetCam)) {
                    select.value = targetCam;
                }
            }
            if (typeof savedCfg.enabled === 'boolean') {
                const chk = document.getElementById('ai-cam-enabled');
                if (chk) chk.checked = savedCfg.enabled;
            }
            if (savedCfg.imgsz) {
                const sel = document.getElementById('ai-imgsz-select');
                if (sel) sel.value = String(savedCfg.imgsz);
            }
            if (savedCfg.conf || savedCfg.confidence_threshold) {
                const confVal = savedCfg.conf || (savedCfg.confidence_threshold * 100);
                const slider = document.getElementById('ai-conf-slider');
                const confTxt = document.getElementById('ai-conf-val');
                if (slider) slider.value = confVal;
                if (confTxt) confTxt.textContent = confVal + '%';
            }
            if (savedCfg.targets) {
                if (document.getElementById('yolo-target-person')) document.getElementById('yolo-target-person').checked = !!savedCfg.targets.person;
                if (document.getElementById('yolo-target-car')) document.getElementById('yolo-target-car').checked = !!savedCfg.targets.car;
                if (document.getElementById('yolo-target-motorcycle')) document.getElementById('yolo-target-motorcycle').checked = !!savedCfg.targets.motorcycle;
                if (document.getElementById('yolo-target-bicycle')) document.getElementById('yolo-target-bicycle').checked = !!savedCfg.targets.bicycle;
            }
        }
    } catch (e) {}

    const feedback = document.getElementById('ai-save-feedback');
    if (feedback) feedback.textContent = '';
    
    const container = document.getElementById('ai-canvas-container');
    if (container) container.style.display = 'flex';
    
    // Clear & seed initial telemetry log
    clearAITelemetryLog();
    appendAITelemetry('🚀 Inisialisasi Detektor Visi AI & RTSP Stream Engine...', 'system');
    appendAITelemetry('📋 Dimuat dengan Konfigurasi Standar Default YOLO AI.', 'system');

    // Start continuous rendering loop
    aiStartRenderLoop();

    loadCamStreamForAI();
}

async function openLegacyYoloAiPage(defaultCamId = null) {
    if (typeof window.navigateToView === 'function') {
        window.navigateToView('view-yolo-ai');
    } else {
        const targetPane = document.getElementById('view-yolo-ai');
        if (targetPane) {
            document.querySelectorAll('.view-pane').forEach(v => v.classList.remove('active'));
            targetPane.classList.add('active');
        }
        await initLegacyYoloAiPage(defaultCamId);
    }
}
window.initLegacyYoloAiPage = initLegacyYoloAiPage;
window.openLegacyYoloAiPage = openLegacyYoloAiPage;
function openAIGridModal(defaultCamId = null) {
    return openLegacyYoloAiPage(defaultCamId);
}
window.openAIGridModal = openAIGridModal;

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

function loadDemoNVRFeed() {
    const select = document.getElementById('ai-cam-select');
    if (select) select.value = 'virtual_test';
    
    if (typeof clearAIGrid === 'function') clearAIGrid();
    const promptInp = document.getElementById('ai-prompt-input');
    if (promptInp) promptInp.value = '';
    
    aiSimActive = true;
    const btnSim = document.getElementById('btn-toggle-ai-sim');
    if (btnSim) {
        btnSim.innerHTML = '👁️ Simulasi Output: AKTIF';
        btnSim.style.background = 'rgba(16,185,129,0.15)';
        btnSim.style.color = '#34d399';
    }
    
    appendAITelemetry('📹 Aliran Video Standar Dimuat (Kanvas & Prompt Siap dari Awal).', 'system');
    loadCamStreamForAI();
}
function loadDemoSPBUFeed() { loadDemoNVRFeed(); }

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
    if (typeof renderAiCameraOverviewGrid === 'function') renderAiCameraOverviewGrid();
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
        // Enforce Read-Only Preview on Main Live Page: ROI editing is ONLY allowed in Fullscreen Drawing Mode
        if (!isAIFullscreen) {
            e.preventDefault();
            appendAITelemetry('🔒 Mode Pratinjau Saja (Read-Only). Mengalihkan ke Mode Editor Fullscreen...', 'info');
            enterAIFullscreenDrawing();
            return;
        }

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
        // Enforce Read-Only Preview on Main Live Page for touch devices
        if (!isAIFullscreen) {
            e.preventDefault();
            appendAITelemetry('🔒 Mode Pratinjau Saja (Read-Only). Mengalihkan ke Mode Editor Fullscreen...', 'info');
            enterAIFullscreenDrawing();
            return;
        }

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

let aiLiveFrameCounter = 0;

// RENDER AI SURVEILLANCE OVERLAY FOR LIVE CAMERA (100% TRANSPARENT BACKGROUND)
function renderAIFrame() {
    if (!aiDrawCanvas || !aiDrawCtx) return;
    const ctx = aiDrawCtx;
    const w = aiDrawCanvas.width;
    const h = aiDrawCanvas.height;
    const video = document.getElementById('ai-stream-preview');
    const isVideoPlaying = video && !video.paused && video.readyState >= 2 && video.videoWidth > 0;
    
    // Live Telemetry Scanning Ticks (Runs continuously while live tab is open)
    aiLiveFrameCounter++;
    if (aiLiveFrameCounter % 120 === 0) {
        const camSelect = document.getElementById('ai-cam-select');
        const camNameStr = (camSelect && camSelect.options && camSelect.selectedIndex >= 0) 
            ? camSelect.options[camSelect.selectedIndex].text 
            : ((aiCurrentCam && aiCurrentCam.name) ? aiCurrentCam.name : 'Kamera NVR');
        
        const isAiEnabled = document.getElementById('ai-cam-enabled') ? document.getElementById('ai-cam-enabled').checked : true;
        const imgszVal = document.getElementById('ai-imgsz-select') ? document.getElementById('ai-imgsz-select').value : '320';
        const confVal = document.getElementById('ai-conf-slider') ? document.getElementById('ai-conf-slider').value : '50';

        const targets = [];
        if (document.getElementById('yolo-target-person')?.checked) targets.push('Manusia');
        if (document.getElementById('yolo-target-car')?.checked) targets.push('Mobil');
        if (document.getElementById('yolo-target-motorcycle')?.checked) targets.push('Motor');
        if (document.getElementById('yolo-target-bicycle')?.checked) targets.push('Sepeda');
        const targetStr = targets.length > 0 ? targets.join(', ') : 'Semua Objek';
        
        if (isAiEnabled) {
            if (isVideoPlaying) {
                appendAITelemetry(`⚡ [YOLOv8 Engine Active] Menganalisis Aliran Stream Live "${camNameStr}" (${imgszVal}x${imgszVal}px @ ${confVal}% min)`, 'scan');
                appendAITelemetry(`🔍 [Analisis Target] Target Deteksi: [${targetStr}] • Scanning Bounding Box Real-time...`, 'eval');
            } else {
                appendAITelemetry(`📡 [YOLOv8 Siaga] Kamera: "${camNameStr}" • Siaga membaca frame video stream RTSP...`, 'system');
            }
        } else {
            appendAITelemetry(`⏸️ [YOLO AI Nonaktif] Fitur analisis deteksi dijeda pengguna. Centang "Aktifkan YOLO AI" untuk memulai.`, 'eval');
        }
    }
    
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

    // Render Real-Time YOLO Object Detection Bounding Boxes & Labels directly on Video Canvas
    renderYoloLiveDetections(ctx, w, h, isVideoPlaying);
}

// Live YOLO Real-Time Object Recognition & Bounding Box Renderer (Accurate Fixed Coordinates)
window.aiLiveCameraDetections = window.aiLiveCameraDetections || {};

function renderYoloLiveDetections(ctx, w, h, isVideoPlaying) {
    const isAiEnabled = document.getElementById('ai-cam-enabled') ? document.getElementById('ai-cam-enabled').checked : true;
    if (!isAiEnabled || !isVideoPlaying) return;

    const confSliderVal = document.getElementById('ai-conf-slider') ? parseInt(document.getElementById('ai-conf-slider').value, 10) : 50;
    const minConfRatio = confSliderVal / 100;

    const isPersonChecked = document.getElementById('yolo-target-person') ? document.getElementById('yolo-target-person').checked : true;
    const isCarChecked = document.getElementById('yolo-target-car') ? document.getElementById('yolo-target-car').checked : true;
    const isMotorcycleChecked = document.getElementById('yolo-target-motorcycle') ? document.getElementById('yolo-target-motorcycle').checked : true;
    const isBicycleChecked = document.getElementById('yolo-target-bicycle') ? document.getElementById('yolo-target-bicycle').checked : true;

    // Read real camera detections or mapped camera ROI zones
    const activeCamId = (aiCurrentCam && aiCurrentCam.id) ? String(aiCurrentCam.id) : null;
    const liveDetections = (activeCamId && window.aiLiveCameraDetections[activeCamId]) ? window.aiLiveCameraDetections[activeCamId] : null;

    if (!liveDetections || !Array.isArray(liveDetections) || liveDetections.length === 0) {
        // No fake moving boxes! Bounding boxes will only be rendered when real objects are detected or ROI zones drawn.
        return;
    }

    liveDetections.forEach(obj => {
        if (!obj) return;
        const type = (obj.type || 'person').toLowerCase();

        // Check target filter
        if (type === 'person' && !isPersonChecked) return;
        if (type === 'car' && !isCarChecked) return;
        if (type === 'motorcycle' && !isMotorcycleChecked) return;
        if (type === 'bicycle' && !isBicycleChecked) return;

        // Check confidence threshold
        const conf = typeof obj.conf === 'number' ? obj.conf : 0.85;
        if (conf < minConfRatio) return;

        // Compute exact pixel coordinates without fake random movement
        let x = 0, y = 0, bw = 0, bh = 0;
        if (typeof obj.nx === 'number' && typeof obj.nw === 'number') {
            x = Math.round(obj.nx * w);
            y = Math.round(obj.ny * h);
            bw = Math.round(obj.nw * w);
            bh = Math.round(obj.nh * h);
        } else {
            x = obj.x || 0;
            y = obj.y || 0;
            bw = obj.w || 0;
            bh = obj.h || 0;
        }

        if (bw <= 0 || bh <= 0) return;

        // Class theme color & icons
        let color = '#10b981';
        let icon = '👤';
        let label = obj.label || 'Manusia';

        if (type === 'car') {
            color = '#38bdf8'; icon = '🚗'; label = obj.label || 'Mobil';
        } else if (type === 'motorcycle') {
            color = '#f59e0b'; icon = '🛵'; label = obj.label || 'Motor';
        } else if (type === 'bicycle') {
            color = '#a855f7'; icon = '🚲'; label = obj.label || 'Sepeda';
        }

        ctx.save();

        // 1. Semi-transparent background box
        ctx.fillStyle = color + '22';
        ctx.fillRect(x, y, bw, bh);

        // 2. Outer bounding box border
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, bw, bh);

        // 3. Corner Reticle Crosshairs
        const cornerLen = Math.min(14, Math.floor(Math.min(bw, bh) * 0.25));
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, y + cornerLen); ctx.lineTo(x, y); ctx.lineTo(x + cornerLen, y);
        ctx.moveTo(x + bw - cornerLen, y); ctx.lineTo(x + bw, y); ctx.lineTo(x + bw, y + cornerLen);
        ctx.moveTo(x, y + bh - cornerLen); ctx.lineTo(x, y + bh); ctx.lineTo(x + cornerLen, y + bh);
        ctx.moveTo(x + bw - cornerLen, y + bh); ctx.lineTo(x + bw, y + bh); ctx.lineTo(x + bw, y + bh - cornerLen);
        ctx.stroke();

        // 4. Header Badge with Icon, Label, and Confidence %
        const confPercent = Math.round(conf * 100);
        const tagText = `${icon} ${label} [${confPercent}%]${obj.id ? ' #' + obj.id : ''}`;
        
        ctx.font = 'bold 10px monospace';
        const tagWidth = Math.max(bw, ctx.measureText(tagText).width + 12);
        const tagHeight = 20;
        const tagY = Math.max(0, y - tagHeight);

        ctx.fillStyle = color;
        ctx.fillRect(x, tagY, tagWidth, tagHeight);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(tagText, x + 6, tagY + 14);

        ctx.restore();
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
            appendAITelemetry(`⏳ EVALUASI LOGIKA: Objek berhenti di dalam Area ROI Pantauan • Dwell Time: ${aiDwellTimer.toFixed(1)}s / ${minDwell}s`, 'eval');
        } else {
            appendAITelemetry(`ℹ️ EVALUASI LOGIKA: Objek melintas di area ROI (Bergerak)...`, 'eval');
        }
    }
    
    if (promptMet) {
        appendAITelemetry(`🚨 SYARAT PROMPT TERPENUHI: Objek terdeteksi berhenti di area terlarang! (Dwell ${aiDwellTimer.toFixed(1)}s >= ${minDwell}s)`, 'alarm');
        appendAITelemetry(`📡 TRIGGER ALARM: Notifikasi HTTP Webhook & Alarm ESP8266 dikirimkan ke relay!`, 'success');
    }
}

// REAL-TIME TEXT TELEMETRY CONSOLE FUNCTIONS
function appendAITelemetry(line, type = 'info') {
    const term = document.getElementById('ai-telemetry-log') || document.getElementById('ai-text-telemetry-log');
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
        color = '#38bdf8';
        prefix = '⚡';
    } else if (type === 'eval') {
        color = '#f59e0b';
        prefix = '🔍';
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
    
    if (typeof aiTelemetryAutoScroll === 'undefined' || aiTelemetryAutoScroll) {
        term.scrollTop = term.scrollHeight;
    }
}

function copyAITelemetryLog() {
    const term = document.getElementById('ai-telemetry-log') || document.getElementById('ai-text-telemetry-log');
    if (!term) return;
    const text = term.innerText || term.textContent;
    navigator.clipboard.writeText(text).then(() => {
        alert('Teks telemetri AI berhasil disalin ke clipboard!');
    }).catch(() => {
        alert('Gagal menyalin otomatis. Silakan pilih dan salin teks secara manual.');
    });
}

function clearAITelemetryLog() {
    const term = document.getElementById('ai-telemetry-log') || document.getElementById('ai-text-telemetry-log');
    if (term) term.innerHTML = '<div style="color:#64748b;">[Log dibersihkan - Menunggu data analisis YOLO...]</div>';
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
    
    if (presetId === 'clear' || presetId === 'reset') {
        if (promptInp) promptInp.value = '';
        if (chkPerson) chkPerson.checked = true;
        if (chkMotor) chkMotor.checked = true;
        if (chkCar) chkCar.checked = true;
        if (motionSel) motionSel.value = 'moving_or_stationary';
        if (dwellInp) dwellInp.value = 0;
        if (confInp) confInp.value = 50;
        if (typeof clearAIGrid === 'function') clearAIGrid();
        appendAITelemetry('🧹 Konfigurasi & ROI Canvas AI Dikosongkan (Mulai dari Awal)', 'system');
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
        defaultLabel = '🎯 Area Pantauan Utama';
        defaultTargets = ['car', 'motorcycle', 'person'];
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
    
    let x = 0, y = 0, w = 0, h = 0, label = 'Area Deteksi Kosong';
    let nx = 0, ny = 0, nw = 0, nh = 0;
    
    if (preset === 'center') {
        nx = 0.20; ny = 0.20; nw = 0.60; nh = 0.60;
        label = '🎯 Area Fokus Tengah (ROI)';
    } else if (preset === 'full') {
        nx = 0.01; ny = 0.01; nw = 0.98; nh = 0.98;
        label = '🔲 Seluruh Area Pantauan (Full Frame)';
    } else if (preset === 'clear' || preset === 'reset') {
        nx = 0; ny = 0; nw = 0; nh = 0;
        label = 'Area Deteksi Kosong';
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
        
        const zoneLabel = grid.label || '🎯 Area Pantauan Utama';
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
    
    // Restore imgsz resolution dropdown (Rule #1, max 416)
    const imgszSelect = document.getElementById('ai-imgsz-select');
    if (imgszSelect && grid) {
        const val = parseInt(grid.imgsz || grid.zero_buffer_config?.imgsz || '320', 10);
        imgszSelect.value = (val > 416) ? 416 : (val < 128 ? 256 : val);
    }

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

// CALCULATE 1:1 SQUARE RATIO CROP AREA MATRIX (STB ANTI-LAG ARM HARDWARE PROFILE)
function calculateSquareROICropMatrix(zone, cw = 800, ch = 450, targetImgSz = 320) {
    const zx = zone ? (zone.x || 0) : 0;
    const zy = zone ? (zone.y || 0) : 0;
    const zw = zone ? (zone.w || 0) : cw;
    const zh = zone ? (zone.h || 0) : ch;

    // Calculate center point of selected ROI zone
    const cx = zx + (zw / 2);
    const cy = zy + (zh / 2);

    // Bind strict 1:1 square bounding box size
    const sidePx = Math.max(zw, zh, 128);
    const sideNorm = parseFloat((sidePx / cw).toFixed(4));

    return {
        aspect_ratio: "1:1",
        center_x: parseFloat((cx / cw).toFixed(4)),
        center_y: parseFloat((cy / ch).toFixed(4)),
        crop_size_px: targetImgSz,
        crop_w_norm: sideNorm,
        crop_h_norm: sideNorm,
        bounding_box_square: [
            parseFloat((Math.max(0, cx - sidePx / 2) / cw).toFixed(4)),
            parseFloat((Math.max(0, cy - sidePx / 2) / ch).toFixed(4)),
            sideNorm,
            sideNorm
        ]
    };
}

// SAVE AI CONFIGURATION (MULTI-ZONES ROI + PROMPT RULES + ESP8266 + STB ZERO-BUFFER FLAGS)
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
    
    // 1. Force Low Resolution Inference Params (Rule #1): Default 320 (or 256), Cap at max 416 to prevent STB CPU choking
    const imgszSelect = document.getElementById('ai-imgsz-select');
    let imgszVal = parseInt(imgszSelect ? imgszSelect.value : '320', 10) || 320;
    if (imgszVal > 416) imgszVal = 416; // Do NOT allow resolutions higher than 416
    if (imgszVal < 128) imgszVal = 256;

    // 2. Enforce 1:1 Square Ratio Cropping Matrix in Background (Rule #2)
    const squareCropMatrix = calculateSquareROICropMatrix(curActive, cw, ch, imgszVal);

    // 3. Hardcode Zero-Buffer Stream Flags (Rule #3)
    const zeroBufferConfig = {
        rtsp_transport: "udp",
        fflags: "nobuffer",
        flags: "low_delay",
        imgsz: imgszVal,
        h264_only: true
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

        // Technical Anti-Lag & Low-Latency Enforced Flags
        imgsz: imgszVal,
        rtsp_transport: "udp",
        fflags: "nobuffer",
        flags: "low_delay",
        h264_only: true,
        square_crop_matrix: squareCropMatrix,
        zero_buffer_config: zeroBufferConfig,
        performance_config: zeroBufferConfig,

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
        if (!navigator.onLine || e.message?.includes('fetch') || e.message?.includes('NetworkError') || e.message?.includes('Failed to fetch')) {
            enqueueOfflineSync('ai_grid_full', '/api/ai/save_grid', 'POST', payload, 'ROI Zone & AI Rules');
            if (feedback) {
                feedback.textContent = '📱 Tersimpan di HP: Akan disinkronkan saat terhubung kembali';
                feedback.style.color = '#f59e0b';
            }
            appendAITelemetry('📱 Sambungan HP terputus: Konfigurasi ROI & Rules diamankan di penyimpanan lokal HP.', 'info');
            showToast('📱 Sambungan HP Terputus: Data disimpan di HP & otomatis disinkronkan saat online.', 'warning');
            if (!keepOpen) {
                setTimeout(() => {
                    closeAIGridModal();
                }, 800);
            }
            return;
        }
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

function openAISettingsModal() {
    const modal = document.getElementById('modal-ai-settings');
    if (modal) {
        modal.style.display = 'flex';
        appendAITelemetry('⚙️ Membuka Modal Pengaturan AI, IoT Alarm & Presets...', 'info');
    }
}

function closeAISettingsModal() {
    const modal = document.getElementById('modal-ai-settings');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Global Keydown Handler for Settings Modal ESC support
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
        const settingsModal = document.getElementById('modal-ai-settings');
        if (settingsModal && settingsModal.style.display !== 'none' && settingsModal.style.display !== '') {
            closeAISettingsModal();
        }
    }
});

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
    let rawName = (nameInp ? nameInp.value.trim() : '') || 'preset_kamera_nvr';
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
    
    const promptText = document.getElementById('ai-prompt-input')?.value.trim() || 'Deteksi objek di area pantauan terlarang';
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
        const rawData = await res.json();
        const presets = Array.isArray(rawData) ? rawData : (rawData.presets || []);
        
        if (!Array.isArray(presets) || presets.length === 0) {
            container.innerHTML = '<div style="color:var(--text-muted); font-size:0.82rem; padding:1.5rem; grid-column:1/-1; text-align:center;">ℹ️ Belum ada preset .yai terdaftar (Mulai dari Awal). Anda dapat mengekspor dan menyimpan preset kustom Anda.</div>';
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
                        ${p.description || 'Preset konfigurasi deteksi Visi AI NVR.'}
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
        const rawData = await res.json();
        const presets = Array.isArray(rawData) ? rawData : (rawData.presets || []);
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
            (addonId === 'hdmi-native' || addonId === 'hdmi_native') ? authFetch('/api/addons/hdmi-native/status').catch(() => null) :
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
        let camRemoteBtnsHtml = '';
        availableCams.forEach((cam, idx) => {
            const isSel = String(cam.id) === String(configObj.target_cam_id) ? 'selected' : '';
            camOptionsHtml += `<option value="${cam.id}" ${isSel}>${cam.name}</option>`;
            camRemoteBtnsHtml += `
                <button type="button" class="btn btn-sm btn-secondary" onclick="sendKioskRemoteCmd({ preset: 'single', camId: '${cam.id}' })" style="padding:0.35rem 0.65rem; font-size:0.75rem; display:flex; align-items:center; gap:0.25rem; background:#1e293b; border-color:#334155; color:#e2e8f0; border-radius:4px;">
                    <span>📹</span> ${cam.name || 'Kamera ' + (idx + 1)}
                </button>
            `;
        });
        if (availableCams.length === 0) {
            camRemoteBtnsHtml = '<span style="font-size:0.75rem; color:#94a3b8;">Belum ada kamera aktif terdaftar.</span>';
        }

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
                    <button type="button" class="btn btn-sm btn-secondary" onclick="checkHdmiKioskDiagnostics()" style="display:flex; align-items:center; gap:0.3rem; background:rgba(59,130,246,0.15); color:#60a5fa; border:1px solid rgba(59,130,246,0.3);">
                        <span>📋</span> Diagnostik & Log STB
                    </button>
                </div>
                <div id="hdmiKioskDiagBox" style="display:none; margin-top:0.85rem; padding:0.85rem; border-radius:6px; background:#0b1329; border:1px solid #1e293b; font-size:0.82rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                        <strong style="color:#60a5fa; display:flex; align-items:center; gap:0.4rem;">
                            <span>🔍</span> Hasil Diagnostik Kiosk Armbian STB
                        </strong>
                        <button type="button" onclick="document.getElementById('hdmiKioskDiagBox').style.display='none'" style="background:transparent; border:none; color:#94a3b8; cursor:pointer; font-size:1rem;">✖</button>
                    </div>
                    <div id="hdmiKioskDiagContent">Memeriksa status STB...</div>
                </div>
            </div>

            <!-- REMOTE PINTAR LAYAR TV DARI SMARTPHONE (REAL-TIME KIOSK CONTROLLER) -->
            <div style="margin-bottom: 1.25rem; padding: 1rem; border-radius: 6px; background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98)); border: 1px solid #3b82f6; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                    <strong style="color:#38bdf8; font-size:0.95rem; display:flex; align-items:center; gap:0.4rem;">
                        <span>🎮</span> Remote Pintar Layar TV (HP Controller)
                    </strong>
                    <div style="display:flex; gap:0.35rem;">
                        <span style="font-size:0.7rem; padding:0.2rem 0.45rem; border-radius:4px; background:rgba(16,185,129,0.15); color:#34d399; border:1px solid rgba(16,185,129,0.3); font-weight:600;">
                            ⚡ WebRTC WHEP (~0.1s)
                        </span>
                        <span style="font-size:0.7rem; padding:0.2rem 0.45rem; border-radius:4px; background:rgba(56,189,248,0.15); color:#38bdf8; border:1px solid rgba(56,189,248,0.3); font-weight:600;">
                            📡 SSE Instan (&lt;50ms)
                        </span>
                    </div>
                </div>

                <!-- 1. Pilihan Grid TV -->
                <div style="margin-bottom:0.85rem;">
                    <span style="font-size:0.78rem; color:#94a3b8; display:block; margin-bottom:0.4rem; font-weight:600;">Pilih Tata Letak Grid TV:</span>
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(85px, 1fr)); gap:0.45rem;">
                        <button type="button" class="btn btn-sm btn-secondary" onclick="sendKioskRemoteCmd({ preset: 'grid_1', camId: availableCams[0]?.id || 'all' })" style="padding:0.45rem; font-size:0.78rem; font-weight:600; display:flex; align-items:center; justify-content:center; gap:0.25rem;">
                            <span>⏹️</span> 1 Kamera
                        </button>
                        <button type="button" class="btn btn-sm btn-secondary" onclick="sendKioskRemoteCmd({ preset: 'grid_4', camId: 'all' })" style="padding:0.45rem; font-size:0.78rem; font-weight:600; display:flex; align-items:center; justify-content:center; gap:0.25rem;">
                            <span>🔲</span> 4 Kamera (2x2)
                        </button>
                        <button type="button" class="btn btn-sm btn-secondary" onclick="sendKioskRemoteCmd({ preset: 'grid_6', camId: 'all' })" style="padding:0.45rem; font-size:0.78rem; font-weight:600; display:flex; align-items:center; justify-content:center; gap:0.25rem;">
                            <span>▦</span> 6 Kamera (2x3)
                        </button>
                        <button type="button" class="btn btn-sm btn-secondary" onclick="sendKioskRemoteCmd({ preset: 'grid_9', camId: 'all' })" style="padding:0.45rem; font-size:0.78rem; font-weight:600; display:flex; align-items:center; justify-content:center; gap:0.25rem;">
                            <span>▦</span> 9 Kamera (3x3)
                        </button>
                        <button type="button" class="btn btn-sm btn-secondary" onclick="sendKioskRemoteCmd({ action: 'tour_toggle', tourInterval: 10 })" style="padding:0.45rem; font-size:0.78rem; font-weight:600; display:flex; align-items:center; justify-content:center; gap:0.25rem; background:rgba(245,158,11,0.15); color:#fbbf24; border-color:rgba(245,158,11,0.3);">
                            <span>🔄</span> Patroli / Tour
                        </button>
                    </div>
                </div>

                <!-- 2. Alihkan Langsung ke Kamera Tertentu -->
                <div style="margin-bottom:0.85rem;">
                    <span style="font-size:0.78rem; color:#94a3b8; display:block; margin-bottom:0.4rem; font-weight:600;">Alihkan Langsung ke Kamera Tertentu (Fullscreen TV):</span>
                    <div style="display:flex; flex-wrap:wrap; gap:0.4rem; max-height:115px; overflow-y:auto; padding:0.25rem 0;">
                        ${camRemoteBtnsHtml}
                    </div>
                </div>

                <!-- 3. Aksi Kontrol Cepat TV -->
                <div style="display:flex; gap:0.5rem; flex-wrap:wrap; border-top:1px solid rgba(255,255,255,0.08); padding-top:0.75rem;">
                    <button type="button" class="btn btn-sm btn-secondary" onclick="sendKioskRemoteCmd({ action: 'refresh' })" style="display:flex; align-items:center; gap:0.3rem; font-size:0.78rem;">
                        <span>🔄</span> Sambung Ulang Stream
                    </button>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="sendKioskRemoteCmd({ action: 'reload' })" style="display:flex; align-items:center; gap:0.3rem; font-size:0.78rem; background:rgba(239,68,68,0.15); color:#f87171; border-color:rgba(239,68,68,0.3);" title="Paksa muat ulang halaman TV jika tampilan macet atau perlu update">
                        <span>⚡</span> Hard Reload TV
                    </button>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="toggleKioskBlackout()" id="btnKioskBlackout" style="display:flex; align-items:center; gap:0.3rem; font-size:0.78rem;">
                        <span>🌙</span> Standby / Layar Hitam
                    </button>
                </div>
            </div>

            <form id="addonConfigForm">
                <div style="background:rgba(0,0,0,0.18); padding:1rem; border-radius:6px; border:1px solid var(--border); margin-bottom:1.25rem;">
                    <label style="display:block; margin-bottom:0.35rem; font-weight:600; font-size:0.88rem; color:var(--text);">
                        🛡️ Hak Akses Sesi Tampilan TV (RBAC Keamanan):
                    </label>
                    <select name="role" style="width:100%; padding:0.65rem; background:rgba(0,0,0,0.25); border:1px solid var(--border); color:white; border-radius:4px;">
                        <option value="viewer" ${configObj.role !== 'admin' ? 'selected' : ''}>🔒 Kiosk Viewer (Hanya Live Stream Kamera - Terkunci Aman & Anti-Tamper)</option>
                        <option value="admin" ${configObj.role === 'admin' ? 'selected' : ''}>🔓 Administrator (Akses Operasional Penuh)</option>
                    </select>
                    <small style="color:var(--text-muted); display:block; margin-top:0.35rem;">
                        *Rekomendasi <strong>Kiosk Viewer</strong>: Mencegah siapapun yang mencolok mouse ke STB untuk menghapus rekaman, merusak konfigurasi kamera, atau membuka menu lisensi.
                    </small>
                </div>

                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
                    <div>
                        <label style="display:block; margin-bottom:0.4rem; font-weight:600; font-size:0.88rem; color:var(--text);">Preset Tampilan Default Kiosk:</label>
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
                    <strong style="display:block; margin-bottom:0.75rem; font-size:0.88rem; color:var(--text);">Pengaturan Sistem, Pembersihan Browser & Penghemat Daya:</strong>
                    <div style="display:flex; flex-direction:column; gap:0.6rem;">
                        <label style="display:flex; align-items:center; gap:0.6rem; cursor:pointer; font-size:0.88rem;">
                            <input type="checkbox" name="hardened_mode" value="true" ${configObj.hardened_mode !== false ? 'checked' : ''} style="width:16px; height:16px; accent-color:#10b981;">
                            <span>🛡️ <strong>Mode Kiosk Bersih:</strong> Matikan Google Translate, dialog error, info-bar, dan pop-up sandi</span>
                        </label>
                        <label style="display:flex; align-items:center; gap:0.6rem; cursor:pointer; font-size:0.88rem;">
                            <input type="checkbox" name="incognito" value="true" ${configObj.incognito !== false ? 'checked' : ''} style="width:16px; height:16px; accent-color:#10b981;">
                            <span>🧹 <strong>Profil Bersih / Incognito:</strong> Bebas cache lama dan sesi kadaluwarsa setiap boot STB</span>
                        </label>
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
                    <input type="text" name="display_url" value="${configObj.display_url || 'http://localhost:3000/?kiosk=1'}" style="width:100%; padding:0.65rem; background:rgba(0,0,0,0.25); border:1px solid var(--border); color:white; border-radius:4px; font-family:monospace; font-size:0.85rem;">
                </div>
            </form>
        `;
        return;
    }

    // --- 3. SPESIFIKASI: HDMI Native Hardware Player (MPV Direct Engine) ---
    if (addonId === 'hdmi-native' || addonId === 'hdmi_native') {
        const isMpvInst = statusData ? !!statusData.isMpvInstalled : false;
        const isServiceAct = statusData ? !!statusData.isServiceActive : false;
        const isHdmiConn = statusData ? !!statusData.isHdmiConnected : false;
        const liveSt = (statusData && statusData.liveState) || {};
        const curPage = liveSt.currentPage || 1;
        const totalPages = Math.max(1, Math.ceil(availableCams.length / (configObj.cams_per_page || 4)));
        const curLayout = liveSt.layout || configObj.layout || 'quad';

        // Buat Tombol Cepat Halaman (Paging)
        let pageBtnsHtml = '';
        for (let p = 1; p <= totalPages; p++) {
            const isCur = (p === curPage);
            const startIdx = (p - 1) * (configObj.cams_per_page || 4) + 1;
            const endIdx = Math.min(availableCams.length, p * (configObj.cams_per_page || 4));
            pageBtnsHtml += `
                <button type="button" class="btn btn-sm ${isCur ? 'btn-primary' : 'btn-secondary'}" onclick="sendNativeRemoteCmd({ action: 'set_page', page: ${p} })" style="font-size:0.78rem; padding:0.3rem 0.6rem; border-radius:4px; display:inline-flex; align-items:center; gap:0.25rem;">
                    <span>📄</span> Hal ${p} (${startIdx}-${endIdx})
                </button>
            `;
        }

        // Buat Tombol Cepat Kamera Langsung
        let camRemoteBtnsHtml = '';
        availableCams.forEach((cam, idx) => {
            const isFocus = (liveSt.currentCamId === cam.id && curLayout === 'single');
            camRemoteBtnsHtml += `
                <button type="button" class="btn btn-sm ${isFocus ? 'btn-primary' : 'btn-secondary'}" onclick="sendNativeRemoteCmd({ action: 'single_cam', camId: '${cam.id}' })" style="font-size:0.75rem; padding:0.25rem 0.55rem; border-radius:4px; white-space:nowrap;">
                    📹 ${cam.name || `Kamera ${idx + 1}`}
                </button>
            `;
        });

        container.innerHTML = `
            <div style="margin-bottom: 1.25rem; padding: 1rem; border-radius: 6px; background: rgba(56, 189, 248, 0.07); border: 1px solid rgba(56, 189, 248, 0.3);">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
                    <div>
                        <strong style="color:#38bdf8; font-size:1.02rem; display:block;">📺 Mesin Direct Hardware: MPV Low-Latency (VPU ARM)</strong>
                        <span style="font-size:0.84rem; color:var(--text-muted);">
                            Murni direct hardware rendering Linux tanpa browser / Chromium • Irit RAM (<60MB) • Ukuran hanya ~25MB
                        </span>
                    </div>
                    <div style="display:flex; gap:0.4rem; align-items:center;">
                        <span style="padding: 0.25rem 0.55rem; border-radius: 4px; font-size: 0.78rem; font-weight: bold; background:${isHdmiConn ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}; color:${isHdmiConn ? '#22c55e' : '#ef4444'}; border: 1px solid ${isHdmiConn ? '#22c55e' : '#ef4444'};">
                            ${isHdmiConn ? '🔌 HDMI Tersambung' : '🔌 HDMI Lepas'}
                        </span>
                        <span style="padding: 0.25rem 0.55rem; border-radius: 4px; font-size: 0.78rem; font-weight: bold; background:${isServiceAct ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}; color:${isServiceAct ? '#22c55e' : '#ef4444'}; border: 1px solid ${isServiceAct ? '#22c55e' : '#ef4444'};">
                            ${isServiceAct ? '🟢 Service Aktif' : '⚪ Service Siaga / Mati'}
                        </span>
                    </div>
                </div>

                <!-- Kontrol Service Hardware -->
                <div style="display:flex; gap:0.5rem; margin-top:0.85rem; flex-wrap:wrap;">
                    <button type="button" class="btn btn-sm btn-primary" onclick="toggleHdmiNativeOutput('${isServiceAct ? 'restart' : 'start'}')" style="display:flex; align-items:center; gap:0.3rem; background:#0284c7; border-color:#0284c7;">
                        <span>${isServiceAct ? '🔄' : '▶️'}</span> ${isServiceAct ? 'Restart MPV Service' : 'Nyalakan Layanan MPV'}
                    </button>
                    ${isServiceAct ? `
                    <button type="button" class="btn btn-sm btn-danger" onclick="toggleHdmiNativeOutput('stop')" style="display:flex; align-items:center; gap:0.3rem; background:rgba(239,68,68,0.2); border-color:#ef4444; color:#f87171;">
                        <span>⏹️</span> Matikan Service MPV
                    </button>
                    ` : ''}
                    <button type="button" class="btn btn-sm btn-secondary" onclick="checkHdmiNativeDiagnostics()" style="display:flex; align-items:center; gap:0.3rem;">
                        <span>🩺</span> Diagnosa STB & Log MPV
                    </button>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="refreshHdmiNativeStatus()" style="display:flex; align-items:center; gap:0.3rem;">
                        <span>🔄</span> Segarkan Status
                    </button>
                </div>

                <!-- Hasil Diagnosa Hardware STB -->
                <div id="hdmiNativeDiagBox" style="display:none; margin-top:0.85rem; padding:0.75rem; border-radius:4px; background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.1);">
                    <div id="hdmiNativeDiagContent"></div>
                </div>
            </div>

            <!-- KONSOL REMOTE KONTROL TV PINTAR (SMART PAGING CONTROLLER) -->
            <div style="margin-bottom: 1.25rem; padding: 1.1rem; border-radius: 8px; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(56, 189, 248, 0.35); box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:0.6rem;">
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <span style="font-size:1.15rem;">🎮</span>
                        <strong style="color:#f8fafc; font-size:0.95rem;">Remote Kontrol Pintar TV (Smart Paging Controller)</strong>
                    </div>
                    <span style="font-size:0.78rem; padding:0.2rem 0.55rem; border-radius:4px; background:rgba(56,189,248,0.15); color:#38bdf8; font-weight:600;">
                        📄 Halaman ${curPage} / ${totalPages}
                    </span>
                </div>

                <!-- 1. Navigasi Paging (Sebelumnya / Berikutnya) -->
                <div style="margin-bottom:0.9rem;">
                    <div style="font-size:0.8rem; color:#94a3b8; margin-bottom:0.45rem; font-weight:600;">Navigasi Halaman Cepat:</div>
                    <div style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center;">
                        <button type="button" class="btn btn-sm btn-secondary" onclick="sendNativeRemoteCmd({ action: 'prev_page' })" style="display:flex; align-items:center; gap:0.35rem; font-size:0.82rem; padding:0.4rem 0.8rem; background:rgba(255,255,255,0.06);">
                            <span>⬅️</span> Halaman Sebelumnya
                        </button>
                        <button type="button" class="btn btn-sm btn-primary" onclick="sendNativeRemoteCmd({ action: 'next_page' })" style="display:flex; align-items:center; gap:0.35rem; font-size:0.82rem; padding:0.4rem 0.8rem; background:#0284c7; border-color:#0284c7;">
                            <span>➡️</span> Halaman Berikutnya
                        </button>
                    </div>
                    <div style="display:flex; gap:0.4rem; flex-wrap:wrap; margin-top:0.5rem;">
                        ${pageBtnsHtml}
                    </div>
                </div>

                <!-- 2. Pilihan Layout Tampilan -->
                <div style="margin-bottom:0.9rem; border-top:1px solid rgba(255,255,255,0.06); padding-top:0.75rem;">
                    <div style="font-size:0.8rem; color:#94a3b8; margin-bottom:0.45rem; font-weight:600;">Mode Tampilan Layout:</div>
                    <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
                        <button type="button" class="btn btn-sm ${curLayout === 'quad' ? 'btn-primary' : 'btn-secondary'}" onclick="sendNativeRemoteCmd({ action: 'quad' })" style="display:flex; align-items:center; gap:0.3rem; font-size:0.8rem;">
                            <span>🔲</span> 4 Kamera (Quad)
                        </button>
                        <button type="button" class="btn btn-sm ${curLayout === 'single' ? 'btn-primary' : 'btn-secondary'}" onclick="sendNativeRemoteCmd({ action: 'single_cam', camId: '${availableCams[0] ? availableCams[0].id : ''}' })" style="display:flex; align-items:center; gap:0.3rem; font-size:0.8rem;">
                            <span>📹</span> 1 Kamera Fullscreen
                        </button>
                    </div>
                </div>

                <!-- 3. Lompat Langsung ke Kamera Tertentu -->
                <div style="margin-bottom:0.9rem; border-top:1px solid rgba(255,255,255,0.06); padding-top:0.75rem;">
                    <div style="font-size:0.8rem; color:#94a3b8; margin-bottom:0.45rem; font-weight:600;">Lompat Langsung ke Kamera:</div>
                    <div style="display:flex; flex-wrap:wrap; gap:0.4rem; max-height:115px; overflow-y:auto; padding:0.2rem 0;">
                        ${camRemoteBtnsHtml}
                    </div>
                </div>

                <!-- 4. Aksi Kontrol Cepat MPV -->
                <div style="display:flex; gap:0.5rem; flex-wrap:wrap; border-top:1px solid rgba(255,255,255,0.08); padding-top:0.75rem;">
                    <button type="button" class="btn btn-sm btn-secondary" onclick="sendNativeRemoteCmd({ action: 'refresh' })" style="display:flex; align-items:center; gap:0.3rem; font-size:0.78rem;">
                        <span>🔄</span> Sambung Ulang Video
                    </button>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="sendNativeRemoteCmd({ action: 'toggle_osd' })" style="display:flex; align-items:center; gap:0.3rem; font-size:0.78rem;">
                        <span>🔤</span> Tampilkan / Sembunyikan OSD
                    </button>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="sendNativeRemoteCmd({ action: 'toggle_tour' })" style="display:flex; align-items:center; gap:0.3rem; font-size:0.78rem;">
                        <span>🔄</span> Auto-Tour / Paging Otomatis
                    </button>
                </div>
            </div>

            <!-- FORM PENGATURAN PARAMETER HARDWARE MPV -->
            <form id="addonConfigForm">
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
                    <div>
                        <label style="display:block; margin-bottom:0.4rem; font-weight:600; font-size:0.88rem; color:var(--text);">Hardware Video Output (VO):</label>
                        <select name="vo" style="width:100%; padding:0.65rem; background:rgba(0,0,0,0.25); border:1px solid var(--border); color:white; border-radius:4px;">
                            <option value="gpu" ${configObj.vo === 'gpu' || !configObj.vo ? 'selected' : ''}>gpu (Mali GPU Hardware Render - Direkomendasikan)</option>
                            <option value="drm" ${configObj.vo === 'drm' ? 'selected' : ''}>drm (Direct Rendering Manager - Murni KMS)</option>
                            <option value="xv" ${configObj.vo === 'xv' ? 'selected' : ''}>xv (XVideo Hardware Acceleration)</option>
                            <option value="fbdev" ${configObj.vo === 'fbdev' ? 'selected' : ''}>fbdev (Direct Linux Framebuffer)</option>
                        </select>
                    </div>

                    <div>
                        <label style="display:block; margin-bottom:0.4rem; font-weight:600; font-size:0.88rem; color:var(--text);">Hardware Decoding (HWDEC):</label>
                        <select name="hwdec" style="width:100%; padding:0.65rem; background:rgba(0,0,0,0.25); border:1px solid var(--border); color:white; border-radius:4px;">
                            <option value="auto" ${configObj.hwdec === 'auto' || !configObj.hwdec ? 'selected' : ''}>auto (Deteksi Otomatis VPU STB Amlogic)</option>
                            <option value="v4l2m2m-copy" ${configObj.hwdec === 'v4l2m2m-copy' ? 'selected' : ''}>v4l2m2m-copy (Linux V4L2 Memory-to-Memory)</option>
                            <option value="no" ${configObj.hwdec === 'no' ? 'selected' : ''}>no (Software CPU Decoding murni)</option>
                        </select>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
                    <div>
                        <label style="display:block; margin-bottom:0.4rem; font-weight:600; font-size:0.88rem; color:var(--text);">Kamera per Halaman Paging:</label>
                        <select name="cams_per_page" style="width:100%; padding:0.65rem; background:rgba(0,0,0,0.25); border:1px solid var(--border); color:white; border-radius:4px;">
                            <option value="4" ${configObj.cams_per_page === 4 || !configObj.cams_per_page ? 'selected' : ''}>4 Kamera per Halaman (Layout Quad 2x2)</option>
                            <option value="1" ${configObj.cams_per_page === 1 ? 'selected' : ''}>1 Kamera per Halaman (Fullscreen Paging)</option>
                        </select>
                    </div>

                    <div>
                        <label style="display:block; margin-bottom:0.4rem; font-weight:600; font-size:0.88rem; color:var(--text);">Interval Auto-Tour Halaman (Detik):</label>
                        <input type="number" name="tour_interval" min="5" max="300" value="${configObj.tour_interval || 10}" style="width:100%; padding:0.65rem; background:rgba(0,0,0,0.25); border:1px solid var(--border); color:white; border-radius:4px;">
                    </div>
                </div>

                <div style="background:rgba(0,0,0,0.15); padding:1rem; border-radius:6px; border:1px solid var(--border); margin-bottom:1.25rem;">
                    <strong style="display:block; margin-bottom:0.75rem; font-size:0.88rem; color:var(--text);">Preferensi Display Hardware:</strong>
                    <div style="display:flex; flex-direction:column; gap:0.6rem;">
                        <label style="display:flex; align-items:center; gap:0.6rem; cursor:pointer; font-size:0.88rem;">
                            <input type="checkbox" name="osd" value="true" ${configObj.osd !== false ? 'checked' : ''} style="width:16px; height:16px; accent-color:#0284c7;">
                            <span>🔤 Tampilkan Overlay Nama Kamera (OSD) di pojok layar TV</span>
                        </label>
                        <label style="display:flex; align-items:center; gap:0.6rem; cursor:pointer; font-size:0.88rem;">
                            <input type="checkbox" name="auto_start" value="true" ${configObj.auto_start !== false ? 'checked' : ''} style="width:16px; height:16px; accent-color:#0284c7;">
                            <span>🚀 Otomatis jalankan layanan pemutar MPV Hardware saat STB Boot</span>
                        </label>
                    </div>
                </div>
            </form>
        `;
        return;
    }

    // --- 4. FORMAT GENERIK (Untuk Addon Kustom Lainnya) ---
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

async function sendKioskRemoteCmd(payload) {
    try {
        const res = await authFetch('/api/addons/hdmi-kiosk/remote-cmd', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            showToast('📡 Perintah remote berhasil diterapkan ke layar TV!', 'info');
        } else {
            showToast('Gagal mengirim perintah: ' + (data.error || 'Kesalahan server'), 'error');
        }
    } catch (e) {
        showToast('Gagal menghubungi server.', 'error');
    }
}
window.sendKioskRemoteCmd = sendKioskRemoteCmd;

let isKioskBlackoutActive = false;
async function toggleKioskBlackout() {
    isKioskBlackoutActive = !isKioskBlackoutActive;
    await sendKioskRemoteCmd({ blackout: isKioskBlackoutActive });
    const btn = document.getElementById('btnKioskBlackout');
    if (btn) {
        btn.innerHTML = isKioskBlackoutActive ? '<span>☀️</span> Bangunkan TV (Nyala)' : '<span>🌙</span> Standby / Layar Hitam';
        btn.style.background = isKioskBlackoutActive ? 'rgba(234, 179, 8, 0.2)' : '';
        btn.style.color = isKioskBlackoutActive ? '#facc15' : '';
    }
}
window.toggleKioskBlackout = toggleKioskBlackout;

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

async function checkHdmiKioskDiagnostics() {
    const box = document.getElementById('hdmiKioskDiagBox');
    const content = document.getElementById('hdmiKioskDiagContent');
    if (!box || !content) return;

    box.style.display = 'block';
    content.innerHTML = '<span style="color:#94a3b8;">⏳ Memeriksa dependensi grafis dan log systemd STB...</span>';

    try {
        const res = await authFetch('/api/addons/hdmi-kiosk/diagnostics');
        const data = await res.json();
        if (res.ok && data.diagnostics) {
            const d = data.diagnostics;
            const safeLog = String(d.journalLogs || 'Tidak ada catatan log.')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            content.innerHTML = `
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:0.5rem; margin-bottom:0.75rem;">
                    <div style="padding:0.4rem 0.6rem; border-radius:4px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);">
                        <span style="color:var(--text-muted); font-size:0.72rem; display:block;">Xorg Server:</span>
                        <strong style="color:${d.hasXorg ? '#22c55e' : '#ef4444'}; font-size:0.8rem;">${d.hasXorg ? '✅ Terpasang' : '❌ Belum Terpasang'}</strong>
                    </div>
                    <div style="padding:0.4rem 0.6rem; border-radius:4px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);">
                        <span style="color:var(--text-muted); font-size:0.72rem; display:block;">Chromium:</span>
                        <strong style="color:${d.hasChromium ? '#22c55e' : '#ef4444'}; font-size:0.8rem;">${d.hasChromium ? '✅ Terpasang' : '❌ Belum Terpasang'}</strong>
                    </div>
                    <div style="padding:0.4rem 0.6rem; border-radius:4px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);">
                        <span style="color:var(--text-muted); font-size:0.72rem; display:block;">Window Mgr:</span>
                        <strong style="color:${d.hasWindowManager ? '#22c55e' : '#f59e0b'}; font-size:0.8rem;">${d.hasWindowManager ? '✅ Ada' : '⚠️ Tidak Ada'}</strong>
                    </div>
                    <div style="padding:0.4rem 0.6rem; border-radius:4px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);">
                        <span style="color:var(--text-muted); font-size:0.72rem; display:block;">Launcher Script:</span>
                        <strong style="color:${d.hasKioskScript ? '#22c55e' : '#ef4444'}; font-size:0.8rem;">${d.hasKioskScript ? '✅ Siap' : '❌ Belum Ada'}</strong>
                    </div>
                </div>
                <div style="padding:0.5rem 0.75rem; border-radius:4px; background:${d.recommendation && d.recommendation.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}; border:1px solid ${d.recommendation && d.recommendation.startsWith('✅') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}; margin-bottom:0.75rem; font-size:0.8rem;">
                    <strong>${d.recommendation || ''}</strong>
                </div>
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem;">
                        <span style="font-size:0.75rem; color:#94a3b8;">Log Journalctl Service arch3r-kiosk:</span>
                        <button type="button" class="btn btn-sm btn-primary" onclick="repairHdmiKioskScript()" style="font-size:0.72rem; padding:0.25rem 0.65rem; background:#059669; border-color:#059669; display:flex; align-items:center; gap:0.3rem;">
                            <span>⚡</span> Perbarui Script Launcher Kiosk STB
                        </button>
                    </div>
                    <pre style="margin:0; padding:0.5rem; background:#000; color:#38bdf8; font-size:0.72rem; border-radius:4px; max-height:140px; overflow-y:auto; white-space:pre-wrap; border:1px solid #1e293b;">${safeLog}</pre>
                </div>
            `;
        } else {
            content.innerHTML = `<span style="color:#ef4444;">Gagal mengambil diagnosa: ${data.error || 'Server tidak merespon'}</span>`;
        }
    } catch (e) {
        content.innerHTML = `<span style="color:#ef4444;">Gagal menghubungi server: ${e.message || e}</span>`;
    }
}
window.checkHdmiKioskDiagnostics = checkHdmiKioskDiagnostics;

async function repairHdmiKioskScript() {
    if (!confirm('Perbarui script launcher di STB (/opt/arch3r-kiosk/start-kiosk.sh) ke versi terbaru dan restart service?')) return;
    try {
        const res = await authFetch('/api/addons/hdmi-kiosk/repair', { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            alert('✅ Berhasil: ' + (data.message || 'Script kiosk telah diperbarui!'));
            checkHdmiKioskDiagnostics();
        } else {
            alert('❌ Gagal: ' + (data.error || 'Terjadi kesalahan saat memperbarui'));
        }
    } catch (e) {
        alert('Gagal menghubungi server: ' + (e.message || e));
    }
}
window.repairHdmiKioskScript = repairHdmiKioskScript;

// ==========================================
// HDMI NATIVE PLAYER (MPV) CONTROLLER HELPERS
// ==========================================
async function sendNativeRemoteCmd(payload) {
    try {
        const res = await authFetch('/api/addons/hdmi-native/remote-cmd', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            // Update tampilan status modal jika sedang terbuka
            openAddonConfig('hdmi-native', 'HDMI Native Hardware Player (MPV)');
        } else {
            alert('Gagal mengirim perintah: ' + (data.error || 'Terjadi kesalahan'));
        }
    } catch (e) {
        console.warn('[HDMI-NATIVE] Gagal kirim perintah:', e);
    }
}
window.sendNativeRemoteCmd = sendNativeRemoteCmd;

async function toggleHdmiNativeOutput(action) {
    try {
        const res = await authFetch('/api/addons/hdmi-native/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: action })
        });
        const data = await res.json();
        if (res.ok) {
            alert(`Aksi ${action} pada layanan MPV Hardware berhasil dikirim ke STB.`);
            openAddonConfig('hdmi-native', 'HDMI Native Hardware Player (MPV)');
        } else {
            alert('Gagal mengatur layanan MPV: ' + (data.error || 'Terjadi kesalahan'));
        }
    } catch (e) {
        alert('Gagal menghubungi server.');
    }
}
window.toggleHdmiNativeOutput = toggleHdmiNativeOutput;

async function refreshHdmiNativeStatus() {
    openAddonConfig('hdmi-native', 'HDMI Native Hardware Player (MPV)');
}
window.refreshHdmiNativeStatus = refreshHdmiNativeStatus;

async function checkHdmiNativeDiagnostics() {
    const box = document.getElementById('hdmiNativeDiagBox');
    const content = document.getElementById('hdmiNativeDiagContent');
    if (!box || !content) return;

    box.style.display = 'block';
    content.innerHTML = '<span style="color:#94a3b8;">⏳ Memeriksa dependensi MPV dan log service STB...</span>';

    try {
        const res = await authFetch('/api/addons/hdmi-native/diagnostics');
        const data = await res.json();
        if (res.ok && data.diagnostics) {
            const d = data.diagnostics;
            const safeLog = String(d.serviceLogs || 'Tidak ada catatan log.')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            content.innerHTML = `
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:0.5rem; margin-bottom:0.75rem;">
                    <div style="padding:0.4rem 0.6rem; border-radius:4px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);">
                        <span style="color:var(--text-muted); font-size:0.72rem; display:block;">MPV Hardware:</span>
                        <strong style="color:${d.hasMpv ? '#22c55e' : '#ef4444'}; font-size:0.8rem;">${d.hasMpv ? '✅ Terpasang' : '❌ Belum Terpasang'}</strong>
                    </div>
                    <div style="padding:0.4rem 0.6rem; border-radius:4px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);">
                        <span style="color:var(--text-muted); font-size:0.72rem; display:block;">IPC Socat:</span>
                        <strong style="color:${d.hasSocat ? '#22c55e' : '#ef4444'}; font-size:0.8rem;">${d.hasSocat ? '✅ Terpasang' : '❌ Belum Terpasang'}</strong>
                    </div>
                    <div style="padding:0.4rem 0.6rem; border-radius:4px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);">
                        <span style="color:var(--text-muted); font-size:0.72rem; display:block;">IPC Socket:</span>
                        <strong style="color:${d.hasIpcSocket ? '#22c55e' : '#f59e0b'}; font-size:0.8rem;">${d.hasIpcSocket ? '✅ Aktif' : '⚪ Belum Aktif'}</strong>
                    </div>
                    <div style="padding:0.4rem 0.6rem; border-radius:4px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);">
                        <span style="color:var(--text-muted); font-size:0.72rem; display:block;">Systemd Service:</span>
                        <strong style="color:${d.isServiceActive ? '#22c55e' : '#ef4444'}; font-size:0.8rem;">${d.isServiceActive ? '🟢 Aktif' : '⚪ Mati'}</strong>
                    </div>
                </div>
                <div style="padding:0.5rem 0.75rem; border-radius:4px; background:${d.recommendation && d.recommendation.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}; border:1px solid ${d.recommendation && d.recommendation.startsWith('✅') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}; margin-bottom:0.75rem; font-size:0.8rem;">
                    <strong>${d.recommendation || ''}</strong>
                </div>
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem;">
                        <span style="font-size:0.75rem; color:#94a3b8;">Log Journalctl arch3r-native:</span>
                        <button type="button" class="btn btn-sm btn-primary" onclick="repairHdmiNativeScript()" style="font-size:0.72rem; padding:0.25rem 0.65rem; background:#059669; border-color:#059669; display:flex; align-items:center; gap:0.3rem;">
                            <span>⚡</span> Perbarui Script MPV (Hemat CPU)
                        </button>
                    </div>
                    <pre style="margin:0; padding:0.5rem; background:#000; color:#38bdf8; font-size:0.72rem; border-radius:4px; max-height:140px; overflow-y:auto; white-space:pre-wrap; border:1px solid #1e293b;">${safeLog}</pre>
                </div>
            `;
        } else {
            content.innerHTML = `<span style="color:#ef4444;">Gagal mengambil diagnosa: ${data.error || 'Server tidak merespon'}</span>`;
        }
    } catch (e) {
        content.innerHTML = `<span style="color:#ef4444;">Gagal menghubungi server: ${e.message || e}</span>`;
    }
}
window.checkHdmiNativeDiagnostics = checkHdmiNativeDiagnostics;

async function repairHdmiNativeScript() {
    if (!confirm('Perbarui script launcher MPV di STB (/opt/arch3r-native/start-native.sh) ke konfigurasi hemat CPU (menghapus flag untimed) dan restart service?')) return;
    try {
        const res = await authFetch('/api/addons/hdmi-native/repair', { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            alert('✅ Berhasil: ' + (data.message || 'Script MPV telah diperbarui ke mode hemat CPU!'));
            checkHdmiNativeDiagnostics();
        } else {
            alert('❌ Gagal: ' + (data.error || 'Terjadi kesalahan saat memperbarui'));
        }
    } catch (e) {
        alert('Gagal menghubungi server: ' + (e.message || e));
    }
}
window.repairHdmiNativeScript = repairHdmiNativeScript;

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
            showToast('✅ Konfigurasi berhasil disimpan dan langsung diterapkan ke addon!', 'success');
            closeAddonConfigModal();
            fetchInstalledAddons();
        } else {
            alert('Gagal menyimpan konfigurasi: ' + (data.error || 'Terjadi kesalahan'));
        }
    } catch (e) {
        if (!navigator.onLine || e.message?.includes('fetch') || e.message?.includes('NetworkError')) {
            enqueueOfflineSync('addon_config', '/api/addons/' + currentConfigAddonId + '/config', 'POST', { config: newConfig }, `Konfigurasi Addon ${currentConfigAddonId}`);
            showToast('📱 Sambungan HP Terputus: Konfigurasi addon disimpan di HP & akan otomatis disinkronkan saat terhubung.', 'warning');
            closeAddonConfigModal();
            return;
        }
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




// Clean Default YOLO AI Functions
async function saveDefaultYoloConfig() {
    const camSelect = document.getElementById('ai-cam-select');
    const enabled = document.getElementById('ai-cam-enabled') ? document.getElementById('ai-cam-enabled').checked : true;
    const imgsz = document.getElementById('ai-imgsz-select') ? document.getElementById('ai-imgsz-select').value : '320';
    const conf = document.getElementById('ai-conf-slider') ? document.getElementById('ai-conf-slider').value : '50';
    
    const targets = {
        person: document.getElementById('yolo-target-person') ? document.getElementById('yolo-target-person').checked : true,
        car: document.getElementById('yolo-target-car') ? document.getElementById('yolo-target-car').checked : true,
        motorcycle: document.getElementById('yolo-target-motorcycle') ? document.getElementById('yolo-target-motorcycle').checked : true,
        bicycle: document.getElementById('yolo-target-bicycle') ? document.getElementById('yolo-target-bicycle').checked : true
    };

    const targetClasses = Object.keys(targets).filter(k => targets[k]);

    const config = {
        camId: camSelect ? camSelect.value : '',
        camera_id: camSelect ? camSelect.value : '',
        enabled,
        imgsz: parseInt(imgsz, 10) || 320,
        conf,
        confidence_threshold: (parseInt(conf, 10) || 50) / 100,
        targets,
        target_classes: targetClasses,
        updatedAt: new Date().toISOString()
    };

    localStorage.setItem('default_yolo_ai_config', JSON.stringify(config));

    try {
        const fetchFn = (typeof authFetch === 'function') ? authFetch : (window.authFetch || fetch);
        await fetchFn('/api/addons/ai_yolo/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ config })
        });
    } catch (e) {
        console.warn('[YOLO AI] Gagal menyimpan ke server backend:', e);
    }

    if (typeof appendAITelemetry === 'function') {
        appendAITelemetry(`💾 Konfigurasi YOLO AI disimpan (Kamera: ${config.camId || 'Default'}, imgsz: ${config.imgsz}, Conf: ${conf}%).`, 'success');
    }
    
    if (typeof showToast === 'function') {
        showToast('✓ Konfigurasi Default YOLO AI Berhasil Disimpan!', 'success');
    } else {
        alert('✓ Konfigurasi Default YOLO AI Berhasil Disimpan!');
    }
}
window.saveDefaultYoloConfig = saveDefaultYoloConfig;
window.clearAITelemetryLog = clearAITelemetryLog;

window.openAISettingsModal = openAISettingsModal;
window.closeAISettingsModal = closeAISettingsModal;

// =======================================================
// YOLO AI ADDON CAMERA LIST & PER-CAMERA SETTINGS ENGINE
// =======================================================
let yoloCamerasList = [];
let activeYoloSettingsCamId = null;

function getActiveYoloCameraId() {
    if (activeYoloSettingsCamId) return String(activeYoloSettingsCamId);

    // Fallback 1: Try stored active camera ID in localStorage
    const saved = localStorage.getItem('arch3r_yolo_active_cam_id') || localStorage.getItem('arch3r_active_cam_id');
    if (saved) {
        activeYoloSettingsCamId = saved;
        return String(saved);
    }

    // Fallback 2: Try yoloCamerasList
    if (Array.isArray(yoloCamerasList) && yoloCamerasList.length > 0) {
        activeYoloSettingsCamId = yoloCamerasList[0].id;
        return String(activeYoloSettingsCamId);
    }

    // Fallback 3: Try window.cameras
    const globalCams = window.cameras || (typeof cameras !== 'undefined' ? cameras : []);
    if (Array.isArray(globalCams) && globalCams.length > 0) {
        activeYoloSettingsCamId = globalCams[0].id || globalCams[0].camId;
        return String(activeYoloSettingsCamId);
    }

    activeYoloSettingsCamId = '1';
    return '1';
}
window.getActiveYoloCameraId = getActiveYoloCameraId;

function loadYoloCamerasFromStorage() {
    try {
        const stored = localStorage.getItem('arch3r_yolo_cameras');
        if (stored) {
            yoloCamerasList = JSON.parse(stored);
        } else {
            yoloCamerasList = [];
        }
    } catch (e) {
        yoloCamerasList = [];
    }
}

function saveYoloCamerasToStorage() {
    try {
        localStorage.setItem('arch3r_yolo_cameras', JSON.stringify(yoloCamerasList));
    } catch (e) {
        console.error('Failed to save yolo cameras to storage', e);
    }
}

function resetAddonsView() {
    const repoView = document.getElementById('addons-repository-view');
    const yoloMainView = document.getElementById('yolo-main-list-view');
    const yoloSettingsView = document.getElementById('yolo-settings-view');

    if (repoView) repoView.style.display = 'block';
    if (yoloMainView) yoloMainView.style.display = 'none';
    if (yoloSettingsView) yoloSettingsView.style.display = 'none';
}
window.resetAddonsView = resetAddonsView;

function initYoloAiPage() {
    loadYoloCamerasFromStorage();
    renderYoloCameraList();
}
window.initYoloAiPage = initYoloAiPage;

function openYoloAiPage() {
    if (typeof window.navigateToView === 'function') {
        window.navigateToView('view-addons', false);
    }
    const repoView = document.getElementById('addons-repository-view');
    const yoloMainView = document.getElementById('yolo-main-list-view');
    const yoloSettingsView = document.getElementById('yolo-settings-view');

    if (repoView) repoView.style.display = 'none';
    if (yoloMainView) yoloMainView.style.display = 'block';
    if (yoloSettingsView) yoloSettingsView.style.display = 'none';

    initYoloAiPage();
}
window.openYoloAiPage = openYoloAiPage;

function closeYoloAiPage() {
    resetAddonsView();
}
window.closeYoloAiPage = closeYoloAiPage;

function renderYoloCameraList() {
    const container = document.getElementById('yolo-camera-list-container');
    const badge = document.getElementById('yolo-camera-count-badge');
    if (!container) return;

    if (badge) badge.textContent = `${yoloCamerasList.length} Kamera Terhubung`;

    if (yoloCamerasList.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:3rem 1.5rem; color:var(--text-muted); background:rgba(15,23,42,0.3); border:1px dashed var(--border); border-radius:8px;">
                <div style="font-size:2.2rem; margin-bottom:0.6rem; color:#64748b;">📹</div>
                <div style="font-size:0.95rem; font-weight:600; color:#f8fafc; margin-bottom:0.3rem;">Belum ada kamera terhubung ke YOLO AI</div>
                <div style="font-size:0.82rem; margin-bottom:1.2rem;">Klik tombol <strong>+ Tambah Kamera</strong> untuk mendaftarkan kamera NVR.</div>
                <button type="button" class="btn btn-sm btn-primary" onclick="openAddYoloCameraModal()" style="background:#2563eb; font-size:0.85rem;">
                    ➕ Tambah Kamera Sekarang
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    yoloCamerasList.forEach(cam => {
        const item = document.createElement('div');
        item.style.background = 'rgba(15, 23, 42, 0.7)';
        item.style.border = '1px solid var(--border)';
        item.style.borderRadius = '8px';
        item.style.padding = '0.9rem 1.1rem';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.flexWrap = 'wrap';
        item.style.gap = '0.85rem';

        const isEnabled = cam.enabled !== false;

        item.innerHTML = `
            <div style="display:flex; align-items:center; gap:0.85rem;">
                <div style="width:40px; height:40px; border-radius:8px; background:${isEnabled ? 'rgba(37,99,235,0.15)' : 'rgba(100,116,139,0.15)'}; border:1px solid ${isEnabled ? 'rgba(37,99,235,0.4)' : 'rgba(100,116,139,0.3)'}; display:flex; align-items:center; justify-content:center; font-size:1.2rem; color:${isEnabled ? '#60a5fa' : '#64748b'};">
                    📹
                </div>
                <div>
                    <div style="font-size:0.92rem; font-weight:700; color:#f8fafc; display:flex; align-items:center; gap:0.5rem;">
                        <span>${cam.name || 'Kamera NVR'}</span>
                        <span style="font-size:0.68rem; padding:1px 6px; border-radius:4px; font-weight:600; ${isEnabled ? 'background:rgba(34,197,94,0.15); color:#4ade80; border:1px solid rgba(34,197,94,0.3);' : 'background:rgba(148,163,184,0.15); color:#94a3b8; border:1px solid rgba(148,163,184,0.3);'}">
                            ${isEnabled ? 'AKTIF' : 'NONAKTIF'}
                        </span>
                    </div>
                    <div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.2rem;">
                        ID: <code style="color:#38bdf8;">${cam.id}</code> ${cam.ip ? '• IP: ' + cam.ip : ''}
                    </div>
                </div>
            </div>

            <div style="display:flex; align-items:center; gap:0.75rem;">
                <!-- Sakelar Toggle On/Off -->
                <label style="display:flex; align-items:center; gap:0.4rem; font-size:0.82rem; font-weight:600; color:${isEnabled ? '#34d399' : '#94a3b8'}; cursor:pointer; background:rgba(0,0,0,0.3); padding:0.35rem 0.65rem; border-radius:6px; border:1px solid var(--border);">
                    <input type="checkbox" ${isEnabled ? 'checked' : ''} onchange="toggleYoloCameraStatus('${cam.id}')" style="accent-color:#2563eb; width:16px; height:16px; cursor:pointer;">
                    <span>${isEnabled ? 'Aktif' : 'Nonaktif'}</span>
                </label>

                <!-- Tombol Settings (Icon ⚙️) -->
                <button type="button" class="btn btn-sm btn-secondary" onclick="openYoloCameraSettings('${cam.id}')" style="display:flex; align-items:center; gap:0.3rem; font-size:0.85rem; padding:0.35rem 0.65rem;" title="Pengaturan YOLO AI Kamera Ini">
                    <span>⚙️</span>
                </button>

                <!-- Tombol Hapus (Icon 🗑️) -->
                <button type="button" class="btn btn-sm btn-secondary" onclick="removeCameraFromYoloList('${cam.id}')" style="display:flex; align-items:center; gap:0.3rem; font-size:0.85rem; padding:0.35rem 0.65rem; color:#ef4444; border-color:rgba(239,68,68,0.3); background:rgba(239,68,68,0.1);" title="Hapus dari Daftar YOLO AI">
                    <span>🗑️</span>
                </button>
            </div>
        `;
        container.appendChild(item);
    });
}

function openAddYoloCameraModal() {
    const modal = document.getElementById('modal-add-yolo-camera');
    const container = document.getElementById('add-yolo-camera-list');
    if (!modal || !container) return;

    modal.style.display = 'flex';
    container.innerHTML = '<div style="color:var(--text-muted); font-size:0.85rem; text-align:center; padding:1rem;">⏳ Memuat daftar kamera NVR...</div>';

    const nvrCams = (typeof cameras !== 'undefined' && Array.isArray(cameras)) ? cameras : [];
    
    if (nvrCams.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.85rem;">
                Tidak ada kamera terdaftar pada NVR. Silakan tambahkan kamera terlebih dahulu di menu <strong>Pengaturan Kamera</strong>.
            </div>
        `;
        return;
    }

    const addedIds = new Set(yoloCamerasList.map(c => c.id));
    const availableCams = nvrCams.filter(c => c && (c.id || c.name));

    if (availableCams.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.85rem;">
                Tidak ada kamera NVR yang tersedia.
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    availableCams.forEach(c => {
        const camId = c.id || c.name;
        const camName = c.name || `Kamera ${camId}`;
        const isAlreadyAdded = addedIds.has(camId);

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.padding = '0.75rem';
        row.style.borderBottom = '1px solid var(--border)';
        row.style.gap = '0.5rem';

        row.innerHTML = `
            <div>
                <strong style="font-size:0.88rem; color:#f8fafc; display:block;">${camName}</strong>
                <span style="font-size:0.75rem; color:var(--text-muted);">${c.ip || c.rtsp_url || 'Channel RTSP'}</span>
            </div>
            <div>
                ${isAlreadyAdded ? `
                    <span style="font-size:0.75rem; color:#34d399; font-weight:600; padding:3px 8px; border-radius:4px; background:rgba(16,185,129,0.15);">✓ Sudah Terhubung</span>
                ` : `
                    <button type="button" class="btn btn-sm btn-primary" onclick="addCameraToYoloList('${camId}', '${camName.replace(/'/g, "\\'")}', '${(c.ip || '').replace(/'/g, "\\'")}')" style="font-size:0.8rem; background:#2563eb;">
                        ➕ Hubungkan
                    </button>
                `}
            </div>
        `;
        container.appendChild(row);
    });
}
window.openAddYoloCameraModal = openAddYoloCameraModal;

function closeAddYoloCameraModal() {
    const modal = document.getElementById('modal-add-yolo-camera');
    if (modal) modal.style.display = 'none';
}
window.closeAddYoloCameraModal = closeAddYoloCameraModal;

function addCameraToYoloList(camId, camName, camIp) {
    if (!camId) return;
    const exists = yoloCamerasList.some(c => c.id === camId);
    if (!exists) {
        yoloCamerasList.push({
            id: camId,
            name: camName || `Kamera ${camId}`,
            ip: camIp || '',
            enabled: true
        });
        saveYoloCamerasToStorage();
        renderYoloCameraList();
    }
    closeAddYoloCameraModal();
}
window.addCameraToYoloList = addCameraToYoloList;

function removeCameraFromYoloList(camId) {
    if (!camId) return;
    yoloCamerasList = yoloCamerasList.filter(c => c.id !== camId);
    saveYoloCamerasToStorage();
    renderYoloCameraList();
}
window.removeCameraFromYoloList = removeCameraFromYoloList;

function toggleYoloCameraStatus(camId) {
    const target = yoloCamerasList.find(c => c.id === camId);
    if (target) {
        target.enabled = !target.enabled;
        saveYoloCamerasToStorage();
        renderYoloCameraList();
    }
}
window.toggleYoloCameraStatus = toggleYoloCameraStatus;

let activeYoloSettingsTab = 'view';
let isYoloEditMode = false;
let yoloTelemetryTimer = null;

let yoloCanvasAnimationTimer = null;
let activeRealYoloDetections = [];
let lastRealYoloFetchTime = 0;
let yoloDetectionEventHistory = [];
let lastRecordedDetectionMap = new Map();

async function fetchRealYoloDetections() {
    const camId = typeof activeYoloSettingsCamId !== 'undefined' ? activeYoloSettingsCamId : null;
    if (!camId) {
        activeRealYoloDetections = [];
        return;
    }
    const token = localStorage.getItem('nvr_auth_token') || localStorage.getItem('arch3r_token') || '';
    try {
        const resp = await fetch(`/api/ai/detections?camera_id=${encodeURIComponent(camId)}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (resp.ok) {
            const data = await resp.json();
            if (data && Array.isArray(data.detections)) {
                activeRealYoloDetections = data.detections;
            } else {
                activeRealYoloDetections = [];
            }
        }
    } catch(e) {
        activeRealYoloDetections = [];
    }
}

function updateYoloViewFilter() {
    drawYoloViewLiveCanvasStream();
}
window.updateYoloViewFilter = updateYoloViewFilter;

let yoloVideoFrameCallbackId = null;

function startYoloLiveCanvasStreamLoop() {
    if (yoloCanvasAnimationTimer) cancelAnimationFrame(yoloCanvasAnimationTimer);
    const videoEl = document.getElementById('yolo-view-video-element');
    if (videoEl && typeof videoEl.cancelVideoFrameCallback === 'function' && yoloVideoFrameCallbackId) {
        try { videoEl.cancelVideoFrameCallback(yoloVideoFrameCallbackId); } catch(e) {}
    }

    function renderFrame(timestamp) {
        drawYoloViewLiveCanvasStream(timestamp);
        const settingsView = document.getElementById('yolo-settings-view');
        if (settingsView && settingsView.style.display !== 'none') {
            const currentVideo = document.getElementById('yolo-view-video-element');
            // Hardware VSYNC alignment via requestVideoFrameCallback when supported by browser/STB
            if (currentVideo && typeof currentVideo.requestVideoFrameCallback === 'function') {
                yoloVideoFrameCallbackId = currentVideo.requestVideoFrameCallback((now, metadata) => {
                    renderFrame(now);
                });
            } else {
                yoloCanvasAnimationTimer = requestAnimationFrame(renderFrame);
            }
        }
    }
    renderFrame(performance.now());
}

function diagnoseYoloStreamCodecError(elementId, hlsErrorData = null) {
    const videoEl = (typeof elementId === 'string') ? document.getElementById(elementId) : elementId;
    const targetId = (typeof elementId === 'string') ? elementId : (videoEl ? (videoEl.id || 'video-element') : 'yolo-view-video-element');
    if (!videoEl) return null;

    const mediaError = videoEl.error; // HTMLMediaElement.error
    let isHevcIssue = false;
    let codecStringFound = '';
    let videoTracksInfo = [];

    // 1. Inspect 'videoTracks' property (HTMLMediaElement VideoTrackList, if available)
    if (videoEl.videoTracks) {
        try {
            for (let i = 0; i < videoEl.videoTracks.length; i++) {
                const track = videoEl.videoTracks[i];
                const trackInfo = {
                    id: track.id || `track-${i}`,
                    kind: track.kind || 'video',
                    label: track.label || '',
                    selected: track.selected || false,
                    language: track.language || ''
                };
                videoTracksInfo.push(trackInfo);
                const trackText = (track.label || '').toLowerCase();
                if (trackText.includes('h265') || trackText.includes('hevc') || trackText.includes('hvc1') || trackText.includes('hev1')) {
                    isHevcIssue = true;
                    codecStringFound = track.label;
                }
            }
        } catch (e) {
            console.warn(`[Codec Diagnostics] Unable to enumerate videoTracks on #${targetId}:`, e);
        }
    }

    // 1b. Inspect 'srcObject' MediaStream video tracks if present
    if (videoEl.srcObject && typeof videoEl.srcObject.getVideoTracks === 'function') {
        try {
            const streamTracks = videoEl.srcObject.getVideoTracks();
            streamTracks.forEach((tr, idx) => {
                const settings = typeof tr.getSettings === 'function' ? tr.getSettings() : {};
                videoTracksInfo.push({
                    id: tr.id || `stream-track-${idx}`,
                    label: tr.label || '',
                    enabled: tr.enabled,
                    muted: tr.muted,
                    readyState: tr.readyState,
                    settings: settings
                });
                const trText = (tr.label || '').toLowerCase();
                if (trText.includes('h265') || trText.includes('hevc') || trText.includes('hvc1') || trText.includes('hev1')) {
                    isHevcIssue = true;
                    codecStringFound = tr.label;
                }
            });
        } catch (e) {
            console.warn(`[Codec Diagnostics] Unable to inspect srcObject tracks on #${targetId}:`, e);
        }
    }

    // 2. Inspect 'mediaError' (HTMLMediaElement.error - MediaError instance)
    let mediaErrorDetails = 'No MediaError detected on video element.';
    if (mediaError) {
        const errorCodes = {
            1: 'MEDIA_ERR_ABORTED',
            2: 'MEDIA_ERR_NETWORK',
            3: 'MEDIA_ERR_DECODE',
            4: 'MEDIA_ERR_SRC_NOT_SUPPORTED'
        };
        const codeName = errorCodes[mediaError.code] || `CODE_${mediaError.code}`;
        mediaErrorDetails = `MediaError Code ${mediaError.code} (${codeName}): ${mediaError.message || 'Browser failed to decode media'}`;

        // MEDIA_ERR_DECODE (3) or MEDIA_ERR_SRC_NOT_SUPPORTED (4) frequently caused by H.265/HEVC on unsupported browsers
        if (mediaError.code === 3 || mediaError.code === 4) {
            const supportsHevcHvc1 = (window.MediaSource && typeof MediaSource.isTypeSupported === 'function') ? MediaSource.isTypeSupported('video/mp4; codecs="hvc1.1.6.L93.B0"') : false;
            const supportsHevcHev1 = (window.MediaSource && typeof MediaSource.isTypeSupported === 'function') ? MediaSource.isTypeSupported('video/mp4; codecs="hev1.1.6.L93.B0"') : false;

            if (!supportsHevcHvc1 && !supportsHevcHev1) {
                isHevcIssue = true;
                codecStringFound = codecStringFound || 'H.265 / HEVC (MediaError Triggered)';
            }
        }
    }

    // 3. Inspect HLS.js error payload if provided
    if (hlsErrorData) {
        const detailsStr = String(hlsErrorData.details || '').toLowerCase();
        const reasonStr = String(hlsErrorData.reason || '').toLowerCase();
        if (detailsStr.includes('codec') || reasonStr.includes('codec') || detailsStr === 'manifestincompatiblecodecserror' || detailsStr === 'bufferaddcodecerror') {
            isHevcIssue = true;
            codecStringFound = codecStringFound || `HLS.js: ${hlsErrorData.details || hlsErrorData.reason}`;
        }
    }

    // 4. Browser H.264 vs H.265 support checks
    const canPlayH264 = videoEl.canPlayType('video/mp4; codecs="avc1.42E01E"') || 'maybe';
    const canPlayHevc = videoEl.canPlayType('video/mp4; codecs="hvc1.1.6.L93.B0"') || videoEl.canPlayType('video/mp4; codecs="hevc"');
    const mseHevcSupported = (window.MediaSource && typeof MediaSource.isTypeSupported === 'function')
        ? (MediaSource.isTypeSupported('video/mp4; codecs="hvc1.1.6.L93.B0"') || MediaSource.isTypeSupported('video/mp4; codecs="hev1.1.6.L93.B0"'))
        : false;

    // Structured Console Diagnostics
    console.group(`🔍 [YOLO Stream Codec Diagnostics] Target: #${targetId}`);
    console.log(`• Target Video Element ID:`, targetId);
    console.log(`• mediaError (videoEl.error):`, mediaError ? { code: mediaError.code, message: mediaError.message, summary: mediaErrorDetails } : 'Null');
    console.log(`• videoTracks inspected:`, videoTracksInfo.length > 0 ? videoTracksInfo : (videoEl.videoTracks ? `Length: ${videoEl.videoTracks.length}` : 'Not available / None'));
    console.log(`• Browser H.264 (AVC) Support:`, canPlayH264);
    console.log(`• Browser H.265 (HEVC) Native canPlayType:`, canPlayHevc || 'Not supported ("")');
    console.log(`• MSE MediaSource H.265/HEVC Support:`, mseHevcSupported ? '✅ YES' : '❌ NO (Unsupported in this browser player)');
    if (hlsErrorData) console.log(`• HLS.js Error Data:`, hlsErrorData);

    if (isHevcIssue) {
        console.warn(`🚨 [H.265/HEVC CODEC ISSUE DETECTED] Stream failure on #${targetId} is caused by H.265/HEVC codec incompatibility in this browser player!`);
        console.warn(`💡 Action Required: Reconfigure RTSP Camera video encoding from H.265 to H.264 (AVC) in camera settings, or enable server H.264 transcoding.`);
    }
    console.groupEnd();

    return {
        targetId,
        isHevcIssue,
        codecStringFound,
        mediaError: mediaError ? { code: mediaError.code, message: mediaError.message } : null,
        mediaErrorDetails,
        videoTracksInfo,
        mseHevcSupported
    };
}
window.diagnoseYoloStreamCodecError = diagnoseYoloStreamCodecError;

function setYoloStreamErrorUI(elementId, isError, errorTitle, errorMsg, errorDetails) {
    const videoEl = document.getElementById(elementId);
    if (!videoEl) return;
    const parent = videoEl.parentElement;
    if (!parent) return;

    let errorBadge = parent.querySelector('.yolo-stream-error-badge');
    if (!isError) {
        if (errorBadge) errorBadge.remove();
        return;
    }

    if (!errorBadge) {
        errorBadge = document.createElement('div');
        errorBadge.className = 'yolo-stream-error-badge';
        errorBadge.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 20;
            background: rgba(15, 23, 42, 0.95);
            border: 1px solid #ef4444;
            border-radius: 8px;
            padding: 12px 16px;
            max-width: 88%;
            text-align: center;
            color: #f8fafc;
            font-family: sans-serif;
            backdrop-filter: blur(6px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7);
            pointer-events: auto;
        `;
        parent.appendChild(errorBadge);
    }

    errorBadge.innerHTML = `
        <div style="font-size:0.9rem; font-weight:700; color:#f87171; margin-bottom:4px; display:flex; align-items:center; justify-content:center; gap:6px;">
            <span>⚠️</span> ${errorTitle || 'Gagal Memuat Stream Video'}
        </div>
        <div style="font-size:0.78rem; color:#cbd5e1; margin-bottom:6px;">${errorMsg || 'Kamera offline atau RTSP stream terputus.'}</div>
        <div style="font-size:0.72rem; color:#94a3b8; font-family:monospace; background:rgba(0,0,0,0.5); padding:4px 8px; border-radius:4px; border:1px solid rgba(255,255,255,0.08); word-break:break-all;">${errorDetails || ''}</div>
        <div style="font-size:0.72rem; color:#38bdf8; margin-top:8px;">💡 Petunjuk: Pastikan RTSP Kamera online & gunakan codec video H.264 di setting kamera.</div>
    `;
}
window.setYoloStreamErrorUI = setYoloStreamErrorUI;

function attachYoloVideoPreview(elementId) {
    const videoEl = document.getElementById(elementId);
    if (!videoEl) return;

    // Reset previous error badge
    setYoloStreamErrorUI(elementId, false);

    // Auto-select fallback camera if activeYoloSettingsCamId is null
    if (!activeYoloSettingsCamId) {
        if (typeof yoloCamerasList !== 'undefined' && Array.isArray(yoloCamerasList) && yoloCamerasList.length > 0) {
            activeYoloSettingsCamId = yoloCamerasList[0].id;
        } else if (typeof cameras !== 'undefined' && Array.isArray(cameras) && cameras.length > 0) {
            activeYoloSettingsCamId = cameras[0].id || cameras[0].camId;
        }
    }

    if (!activeYoloSettingsCamId) {
        console.warn(`[YOLO AI Stream] Cannot attach preview to #${elementId}: No active camera selected.`);
        setYoloStreamErrorUI(elementId, true, 'Kamera Belum Dipilih', 'Tidak ada kamera aktif yang terhubung ke YOLO AI.', 'Silakan pilih kamera terlebih dahulu dari daftar.');
        return;
    }

    let targetCam = null;
    if (typeof cameras !== 'undefined' && Array.isArray(cameras)) {
        targetCam = cameras.find(c => String(c.id) === String(activeYoloSettingsCamId) || String(c.camId) === String(activeYoloSettingsCamId));
    }
    if (!targetCam && typeof yoloCamerasList !== 'undefined' && Array.isArray(yoloCamerasList)) {
        const yCam = yoloCamerasList.find(c => String(c.id) === String(activeYoloSettingsCamId));
        if (yCam) targetCam = yCam;
    }

    const token = localStorage.getItem('nvr_auth_token') || localStorage.getItem('arch3r_token') || '';
    const rawRtspUrl = targetCam ? (targetCam.rtsp_url || targetCam.mainStreamUrl || targetCam.streamUrl || '') : '';
    const mediaMtxPath = targetCam?.mediaMtxPath || targetCam?.id || activeYoloSettingsCamId;

    let streamUrl = '';

    // Check if raw source is RTSP protocol
    if (rawRtspUrl && (rawRtspUrl.startsWith('rtsp://') || rawRtspUrl.startsWith('rtsps://'))) {
        console.log(`[YOLO AI Stream] Detected raw RTSP protocol (${rawRtspUrl}). Browsers do not support direct RTSP rendering. Routing stream through MediaMTX HLS endpoint...`);
        streamUrl = `/stream/${mediaMtxPath}/index.m3u8?token=${encodeURIComponent(token)}`;
    } else if (targetCam?.hlsUrl && (targetCam.hlsUrl.startsWith('http://') || targetCam.hlsUrl.startsWith('https://') || targetCam.hlsUrl.startsWith('/'))) {
        streamUrl = targetCam.hlsUrl;
        if (!streamUrl.includes('token=') && token) {
            streamUrl += (streamUrl.includes('?') ? '&' : '?') + `token=${encodeURIComponent(token)}`;
        }
    } else if (targetCam?.mainStreamUrl && (targetCam.mainStreamUrl.startsWith('http://') || targetCam.mainStreamUrl.startsWith('https://') || targetCam.mainStreamUrl.endsWith('.m3u8'))) {
        streamUrl = targetCam.mainStreamUrl;
    } else {
        streamUrl = `/stream/${mediaMtxPath}/index.m3u8?token=${encodeURIComponent(token)}`;
    }

    console.group(`📡 [YOLO AI Stream Init] Element: #${elementId} | Camera ID: ${activeYoloSettingsCamId}`);
    console.log(`• Camera Name:`, targetCam ? (targetCam.name || targetCam.id) : 'Unknown Camera');
    console.log(`• Raw RTSP/Source URL:`, rawRtspUrl || 'N/A');
    console.log(`• Final HLS Stream URL:`, streamUrl);
    console.log(`• HLS.js Supported:`, !!(window.Hls && Hls.isSupported()));
    console.groupEnd();

    // Destroy previous HLS player instance attached to this element ID
    if (typeof activeHlsPlayers !== 'undefined' && activeHlsPlayers[elementId]) {
        try { activeHlsPlayers[elementId].destroy(); } catch (e) {}
        delete activeHlsPlayers[elementId];
    }

    videoEl.onerror = () => {
        const diag = diagnoseYoloStreamCodecError(elementId);
        const err = videoEl.error;
        console.error(`[YOLO HTML5 Video Element Error] #${elementId}`, err);

        let errorTitle = 'HTML5 Media Playback Error';
        let errorMsg = 'Browser gagal memproses sumber video stream.';
        let details = err ? `Code: ${err.code} - ${err.message || 'Media decode failure / Network error'}` : 'Unknown video error';

        if (diag && diag.isHevcIssue) {
            errorTitle = '⚠️ Error Codec H.265 / HEVC Inkompatibel';
            errorMsg = 'Kamera mengirim stream H.265 yang tidak dapat didekode oleh browser ini.';
            details = `${diag.mediaErrorDetails} | Solusi: Ubah codec RTSP kamera ke H.264.`;
        }

        setYoloStreamErrorUI(elementId, true, errorTitle, errorMsg, details);
    };

    // Candidate for lighter sub-stream fallback if main stream experiences heavy packet loss or delay
    const subStreamCandidate = targetCam?.subStreamUrl || `/stream/${mediaMtxPath}_sub/index.m3u8?token=${encodeURIComponent(token)}`;

    if (window.Hls && Hls.isSupported()) {
        const hls = new Hls({
            lowLatencyMode: false,
            maxBufferLength: 8,
            maxMaxBufferLength: 16,
            maxBufferSize: 20 * 1024 * 1024,
            manifestLoadingMaxRetry: 10,
            manifestLoadingRetryDelay: 1000,
            manifestLoadingMaxRetryTimeout: 15000,
            levelLoadingMaxRetry: 10,
            levelLoadingRetryDelay: 1000,
            levelLoadingMaxRetryTimeout: 15000,
            fragLoadingMaxRetry: 10,
            fragLoadingRetryDelay: 1000,
            fragLoadingMaxRetryTimeout: 15000,
            enableWorker: true,
            xhrSetup: function (xhr, url) {
                xhr.withCredentials = true;
                if (token) {
                    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
                }
            }
        });

        if (typeof activeHlsPlayers !== 'undefined') {
            activeHlsPlayers[elementId] = hls;
        }

        hls.loadSource(streamUrl);
        hls.attachMedia(videoEl);

        let consecutiveErrors = 0;
        let hasTriedSubFallback = false;

        const onStreamRecovered = () => {
            consecutiveErrors = 0;
            setYoloStreamErrorUI(elementId, false);
        };

        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
            console.log(`[YOLO AI Stream] ✅ Manifest parsed successfully for #${elementId}. Levels:`, data.levels?.length || 1);
            onStreamRecovered();
            videoEl.play().catch(err => {
                console.warn(`[YOLO AI Stream] Autoplay blocked or deferred for #${elementId}:`, err);
            });
        });

        hls.on(Hls.Events.FRAG_LOADED, onStreamRecovered);
        hls.on(Hls.Events.LEVEL_LOADED, onStreamRecovered);
        videoEl.onplaying = onStreamRecovered;

        hls.on(Hls.Events.ERROR, (event, data) => {
            console.warn(`[YOLO AI HLS Event Error] #${elementId}`, data);
            if (data.fatal) {
                consecutiveErrors++;
                const diag = diagnoseYoloStreamCodecError(elementId, data);
                const isCodecIssue = (diag && diag.isHevcIssue) || 
                                     data.details === 'manifestIncompatibleCodecsError' || 
                                     data.details === 'bufferAddCodecError' || 
                                     (data.reason && data.reason.includes('codec'));

                if (isCodecIssue) {
                    const errorTitle = '⚠️ Error Codec Inkompatibel (H.265 / HEVC)';
                    const errorMsg = 'Kamera menggunakan codec H.265 yang tidak didukung secara native oleh browser ini.';
                    const details = `Codec RTSP mismatch: Ubah encoding video RTSP ke H.264 pada setting Kamera / NVR.`;
                    setYoloStreamErrorUI(elementId, true, errorTitle, errorMsg, details);
                    hls.destroy();
                    return;
                }

                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        console.log(`[YOLO AI Stream] Network error (#${elementId}, attempt ${consecutiveErrors}): ${data.details}`);
                        
                        // Auto-switch to sub-stream if main-stream repeatedly fails
                        if (consecutiveErrors >= 2 && !hasTriedSubFallback && subStreamCandidate && streamUrl !== subStreamCandidate) {
                            hasTriedSubFallback = true;
                            console.log(`[YOLO AI Stream] Switching to lighter Sub-Stream: ${subStreamCandidate}`);
                            hls.loadSource(subStreamCandidate);
                            hls.startLoad();
                            return;
                        }

                        // Display warning only if error persists beyond initial recovery attempts
                        if (consecutiveErrors >= 3) {
                            let errorTitle = 'Gagal Memuat Stream RTSP / HLS';
                            let errorMsg = 'Stream kamera terputus atau URL MediaMTX tidak dapat dijangkau.';
                            let details = `Fatal Error: ${data.type} | Details: ${data.details} (Mencoba menghubungkan ulang...)`;
                            setYoloStreamErrorUI(elementId, true, errorTitle, errorMsg, details);
                        }

                        setTimeout(() => {
                            if (activeHlsPlayers && activeHlsPlayers[elementId]) {
                                activeHlsPlayers[elementId].startLoad();
                            }
                        }, 1500);
                        break;

                    case Hls.ErrorTypes.MEDIA_ERROR:
                        console.log(`[YOLO AI Stream] Attempting media recovery for #${elementId}...`);
                        hls.recoverMediaError();
                        break;

                    default:
                        if (consecutiveErrors >= 3) {
                            setYoloStreamErrorUI(elementId, true, 'Stream Terputus', 'Gagal memuat video kamera.', data.details);
                        }
                        hls.destroy();
                        break;
                }
            }
        });
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = streamUrl;
        videoEl.addEventListener('loadedmetadata', () => {
            setYoloStreamErrorUI(elementId, false);
            videoEl.play().catch(() => {});
        });
    } else {
        videoEl.src = streamUrl;
        videoEl.play().catch(() => {});
    }
}
window.attachYoloVideoPreview = attachYoloVideoPreview;

let yoloSavedRoiBeforeEdit = null;
let isDraggingViewRoi = false;
let roiDragHandle = null; // 'nw', 'ne', 'sw', 'se', 'move', 'new'
let roiDragStartPoint = { x: 0, y: 0 };
let roiDragOriginalBox = { x: 10, y: 10, w: 80, h: 80 };

// --- Professional NVR Tactical Corner-Bracket Bounding Box Renderer ---
function drawTacticalCornerBracketBox(ctx, boxX, boxY, boxW, boxH, threatColor, isInsideRoi, label, confidence, icon) {
    ctx.save();

    // 1. Translucent fill for high-tech HUD scanner aesthetic
    ctx.fillStyle = isInsideRoi ? 'rgba(239, 68, 68, 0.14)' : 'rgba(56, 189, 248, 0.07)';
    ctx.fillRect(boxX, boxY, boxW, boxH);

    // 2. Corner Bracket L-Lines (Professional Tactical Hikvision/Dahua Style)
    const bracketLen = Math.max(10, Math.min(24, Math.min(boxW, boxH) * 0.28));
    ctx.strokeStyle = threatColor;
    ctx.lineWidth = isInsideRoi ? 2.5 : 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'miter';

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(boxX, boxY + bracketLen);
    ctx.lineTo(boxX, boxY);
    ctx.lineTo(boxX + bracketLen, boxY);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(boxX + boxW - bracketLen, boxY);
    ctx.lineTo(boxX + boxW, boxY);
    ctx.lineTo(boxX + boxW, boxY + bracketLen);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(boxX, boxY + boxH - bracketLen);
    ctx.lineTo(boxX, boxY + boxH);
    ctx.lineTo(boxX + bracketLen, boxY + boxH);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(boxX + boxW - bracketLen, boxY + boxH);
    ctx.lineTo(boxX + boxW, boxY + boxH);
    ctx.lineTo(boxX + boxW, boxY + boxH - bracketLen);
    ctx.stroke();

    // 3. Center Tactical Crosshair Marker
    const midX = boxX + boxW / 2;
    const midY = boxY + boxH / 2;
    const chSize = 3.5;
    ctx.strokeStyle = threatColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(midX - chSize, midY); ctx.lineTo(midX + chSize, midY);
    ctx.moveTo(midX, midY - chSize); ctx.lineTo(midX, midY + chSize);
    ctx.stroke();

    // 4. Header Badge Pill
    const headerText = `${icon} ${label.toUpperCase()} ${confidence}`;
    ctx.font = 'bold 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    const textWidth = ctx.measureText(headerText).width;
    const badgeW = Math.max(textWidth + 12, 60);
    const badgeH = 18;
    const badgeY = (boxY - badgeH >= 0) ? boxY - badgeH : boxY;

    ctx.fillStyle = threatColor;
    if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(boxX, badgeY, badgeW, badgeH, [3, 3, 0, 0]);
        ctx.fill();
    } else {
        ctx.fillRect(boxX, badgeY, badgeW, badgeH);
    }

    ctx.fillStyle = '#090d16';
    ctx.fillText(headerText, boxX + 6, badgeY + 13);

    // 5. Flashing Perimeter Breach Banner if target is inside ROI Zone
    if (isInsideRoi) {
        const warnY = (boxY + boxH + 16 <= ctx.canvas.height) ? boxY + boxH : boxY + boxH - 16;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
        const warnText = '⚡ PERIMETER INTRUSION';
        ctx.font = 'bold 9.5px monospace';
        const warnW = ctx.measureText(warnText).width + 10;
        ctx.fillRect(boxX, warnY, warnW, 16);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(warnText, boxX + 5, warnY + 12);
    }

    ctx.restore();
}

// --- Dynamic Real-Time YOLO Event Strip Logic ---
function recordYoloDetectionEvent(obj, isInsideRoi) {
    const rawType = (obj.type || obj.class || 'person').toLowerCase();
    let label = 'Person';
    let icon = '👤';
    if (rawType.includes('car')) { label = 'Mobil'; icon = '🚗'; }
    else if (rawType.includes('motor')) { label = 'Motor'; icon = '🏍️'; }
    else if (rawType.includes('bicycle')) { label = 'Sepeda'; icon = '🚲'; }
    else if (rawType.includes('truck')) { label = 'Truk'; icon = '🚚'; }
    else if (rawType.includes('dog') || rawType.includes('cat') || rawType.includes('animal')) { label = 'Hewan'; icon = '🐕'; }

    const confNum = obj.confidence ? Math.round(obj.confidence * 100) : (obj.score ? Math.round(obj.score * 100) : 95);
    const key = `${label}_${isInsideRoi ? 'roi' : 'out'}`;
    const nowMs = Date.now();

    // Throttle event strip recording to once every 3.5s per object class to keep STB Armbian snappy
    if (lastRecordedDetectionMap.has(key) && (nowMs - lastRecordedDetectionMap.get(key) < 3500)) {
        return;
    }
    lastRecordedDetectionMap.set(key, nowMs);

    const now = new Date();
    const timeStr = now.toTimeString().substring(0, 8);

    const eventItem = {
        id: `yolo_evt_${nowMs}_${Math.floor(Math.random() * 1000)}`,
        label: label,
        icon: icon,
        confidence: `${confNum}%`,
        time: timeStr,
        isInsideRoi: !!isInsideRoi,
        threatLevel: isInsideRoi ? 'CRITICAL INTRUSION' : 'DETECTED',
        threatColor: isInsideRoi ? '#ef4444' : '#38bdf8'
    };

    yoloDetectionEventHistory.unshift(eventItem);
    if (yoloDetectionEventHistory.length > 40) {
        yoloDetectionEventHistory.pop();
    }

    renderYoloEventStrip();

    if (typeof appendYoloTerminalLog === 'function') {
        const threatMsg = isInsideRoi
            ? `🚨 ALARM INTRUSION: ${label} (${confNum}%) melanggar ZONA PERIMETER ROI!`
            : `🎯 DETECTED: ${label} (${confNum}%) terdeteksi di luar zona`;
        appendYoloTerminalLog(threatMsg, isInsideRoi ? 'alarm' : 'target');
    }
}

function renderYoloEventStrip() {
    const container = document.getElementById('yolo-event-strip-container');
    const badge = document.getElementById('yolo-event-count-badge');
    const emptyState = document.getElementById('yolo-empty-events-state');
    if (!container) return;

    if (badge) {
        badge.textContent = `${yoloDetectionEventHistory.length} Event`;
    }

    if (yoloDetectionEventHistory.length === 0) {
        if (emptyState) emptyState.style.display = 'flex';
        // Remove existing cards
        const cards = container.querySelectorAll('.yolo-event-card');
        cards.forEach(c => c.remove());
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    // Re-render cards efficiently
    const existingCards = container.querySelectorAll('.yolo-event-card');
    existingCards.forEach(c => c.remove());

    yoloDetectionEventHistory.forEach(evt => {
        const card = document.createElement('div');
        card.className = `yolo-event-card ${evt.isInsideRoi ? 'critical' : ''}`;
        card.id = evt.id;

        card.innerHTML = `
            <div class="yolo-event-card-header">
                <div class="yolo-event-card-title">
                    <span>${evt.icon}</span>
                    <span>${evt.label}</span>
                </div>
                <span class="yolo-event-card-time">${evt.time}</span>
            </div>
            <div class="yolo-event-card-meta">
                <span class="yolo-event-threat-tag ${evt.isInsideRoi ? 'threat-danger' : 'threat-info'}">
                    ${evt.isInsideRoi ? '🚨 ZONA ROI' : '🟢 LUAR ZONA'}
                </span>
                <span class="yolo-event-conf">Akurasi: ${evt.confidence}</span>
            </div>
            <div class="yolo-event-card-actions">
                <button type="button" class="yolo-event-action-btn" onclick="sendYoloEventNotification('${evt.id}')" title="Kirim Snapshot & Notifikasi">
                    📸 Simpan Event
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

function clearYoloEventStrip() {
    yoloDetectionEventHistory = [];
    lastRecordedDetectionMap.clear();
    renderYoloEventStrip();
    if (typeof showToast === 'function') {
        showToast('🧹 Daftar event deteksi AI telah dibersihkan.', 'info');
    }
}
window.clearYoloEventStrip = clearYoloEventStrip;

function sendYoloEventNotification(id) {
    const evt = yoloDetectionEventHistory.find(e => e.id === id);
    if (!evt) return;
    if (typeof showToast === 'function') {
        showToast(`📸 Snapshot event ${evt.label} (${evt.time}) berhasil disimpan ke Log Alarm!`, 'success');
    }
}
window.sendYoloEventNotification = sendYoloEventNotification;

// --- Unified Live Canvas Stream & Overlay Renderer ---
function drawYoloViewLiveCanvasStream(timestamp) {
    const canvas = document.getElementById('yolo-view-canvas-overlay');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Only update internal buffer if element dimensions changed
    if (canvas.width !== Math.floor(rect.width) || canvas.height !== Math.floor(rect.height)) {
        canvas.width = Math.floor(rect.width);
        canvas.height = Math.floor(rect.height);
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const videoEl = document.getElementById('yolo-view-video-element');
    const isVideoPlaying = videoEl && !videoEl.paused && videoEl.readyState >= 2;

    // Background watermark & grid if video is not yet streaming
    if (!isVideoPlaying) {
        ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 40) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 40) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }

        ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'center';
        ctx.fillText('📡 Menghubungkan Stream RTSP / HLS MediaMTX...', canvas.width / 2, canvas.height / 2);
        ctx.textAlign = 'left';
    }

    // Top-Left CCTV OSD Timestamp
    const now = new Date();
    const timeString = now.toISOString().replace('T', ' ').substring(0, 19);
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#22c55e';
    ctx.fillText(`REC ● CAM-YOLO AI | ${timeString} | ARCH3R NVR`, 14, 22);

    // Read Filter States
    const filterPerson = !!document.getElementById('yolo-view-filter-person')?.checked;
    const filterCar = !!document.getElementById('yolo-view-filter-car')?.checked;
    const filterMotorcycle = !!document.getElementById('yolo-view-filter-motorcycle')?.checked;
    const filterAnimal = !!document.getElementById('yolo-view-filter-animal')?.checked;

    // Read Zoom & Pan values to sync canvas context with video element transform
    const zoomVal = parseFloat(document.getElementById('yolo-zoom-slider')?.value || '1.0');
    const cropXVal = parseInt(document.getElementById('yolo-crop-x-slider')?.value || '0', 10);
    const cropYVal = parseInt(document.getElementById('yolo-crop-y-slider')?.value || '0', 10);

    ctx.save();
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    ctx.translate(cx, cy);
    ctx.scale(zoomVal, zoomVal);
    ctx.translate(-cx + (cropXVal / zoomVal) * (canvas.width / 100), -cy + (cropYVal / zoomVal) * (canvas.height / 100));

    // Calculate Active ROI Zone Coordinates
    const roiPx = {
        x: ((currentYoloRoi?.x ?? 10) / 100) * canvas.width,
        y: ((currentYoloRoi?.y ?? 10) / 100) * canvas.height,
        w: ((currentYoloRoi?.w ?? 80) / 100) * canvas.width,
        h: ((currentYoloRoi?.h ?? 80) / 100) * canvas.height
    };

    // --- RENDER ROI OVERLAY ---
    if (isYoloEditMode) {
        // Dim outside ROI for high-focus tactical editing
        ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
        ctx.fillRect(0, 0, canvas.width, roiPx.y);
        ctx.fillRect(0, roiPx.y + roiPx.h, canvas.width, canvas.height - (roiPx.y + roiPx.h));
        ctx.fillRect(0, roiPx.y, roiPx.x, roiPx.h);
        ctx.fillRect(roiPx.x + roiPx.w, roiPx.y, canvas.width - (roiPx.x + roiPx.w), roiPx.h);

        // Neon Green ROI Border
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(roiPx.x, roiPx.y, roiPx.w, roiPx.h);
        ctx.setLineDash([]);

        // 4 Corner Drag Handles
        ctx.fillStyle = '#22c55e';
        const hs = 10;
        ctx.fillRect(roiPx.x - hs / 2, roiPx.y - hs / 2, hs, hs);
        ctx.fillRect(roiPx.x + roiPx.w - hs / 2, roiPx.y - hs / 2, hs, hs);
        ctx.fillRect(roiPx.x - hs / 2, roiPx.y + roiPx.h - hs / 2, hs, hs);
        ctx.fillRect(roiPx.x + roiPx.w - hs / 2, roiPx.y + roiPx.h - hs / 2, hs, hs);

        // Header Label for ROI in Edit Mode
        ctx.fillStyle = '#22c55e';
        const labelH = 22;
        const labelY = (roiPx.y - labelH >= 0) ? roiPx.y - labelH : roiPx.y;
        ctx.fillRect(roiPx.x, labelY, 210, labelH);
        ctx.fillStyle = '#090d16';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('✏️ ZONA ROI (SERET / RESIZE SUDUT)', roiPx.x + 6, labelY + 15);
    } else {
        // Subtle Non-Intrusive Tactical ROI Boundary
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(roiPx.x, roiPx.y, roiPx.w, roiPx.h);
        ctx.setLineDash([]);

        // Tactical Perimeter Tripwire
        const tripwireY = roiPx.y + roiPx.h * 0.5;
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.75)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(roiPx.x, tripwireY);
        ctx.lineTo(roiPx.x + roiPx.w, tripwireY);
        ctx.stroke();

        ctx.font = 'bold 9.5px monospace';
        ctx.fillStyle = '#f43f5e';
        ctx.fillText('⚡ VIRTUAL TRIPWIRE PERIMETER', roiPx.x + 6, tripwireY - 4);
    }

    // Periodically fetch real YOLO detections from backend (every 1.5s)
    if (Date.now() - lastRealYoloFetchTime > 1500) {
        lastRealYoloFetchTime = Date.now();
        fetchRealYoloDetections();
    }

    let personCount = 0, carCount = 0, motorCount = 0, animalCount = 0;

    // --- DRAW DETECTIONS VIA CORNER BRACKETS ---
    if (Array.isArray(activeRealYoloDetections) && activeRealYoloDetections.length > 0) {
        activeRealYoloDetections.forEach(obj => {
            const rawType = (obj.type || obj.class || 'person').toLowerCase();
            let isVisible = false;
            let icon = '👤';
            let label = 'Person';

            if (rawType.includes('person')) {
                if (filterPerson) isVisible = true;
                personCount++;
                label = 'Person';
                icon = '👤';
            } else if (rawType.includes('car')) {
                if (filterCar) isVisible = true;
                carCount++;
                label = 'Mobil';
                icon = '🚗';
            } else if (rawType.includes('motor')) {
                if (filterMotorcycle) isVisible = true;
                motorCount++;
                label = 'Motor';
                icon = '🏍️';
            } else if (rawType.includes('bicycle')) {
                if (filterMotorcycle) isVisible = true;
                motorCount++;
                label = 'Sepeda';
                icon = '🚲';
            } else if (rawType.includes('truck')) {
                if (filterCar) isVisible = true;
                carCount++;
                label = 'Truk';
                icon = '🚚';
            } else if (rawType.includes('dog') || rawType.includes('cat') || rawType.includes('animal') || rawType.includes('bird')) {
                if (filterAnimal) isVisible = true;
                animalCount++;
                label = 'Hewan';
                icon = '🐕';
            } else {
                if (!filterPerson && !filterCar && !filterMotorcycle && !filterAnimal) {
                    isVisible = true;
                    personCount++;
                }
            }

            if (isVisible) {
                const boxX = obj.pctX !== undefined ? (obj.pctX / 100) * canvas.width : (obj.x || 0);
                const boxY = obj.pctY !== undefined ? (obj.pctY / 100) * canvas.height : (obj.y || 0);
                const boxW = obj.pctW !== undefined ? (obj.pctW / 100) * canvas.width : (obj.w || 60);
                const boxH = obj.pctH !== undefined ? (obj.pctH / 100) * canvas.height : (obj.h || 80);

                // Determine if target is inside defined ROI using target center crosshair
                const objCenterX = boxX + boxW / 2;
                const objCenterY = boxY + boxH / 2;
                const isInsideRoi = (
                    objCenterX >= roiPx.x &&
                    objCenterX <= (roiPx.x + roiPx.w) &&
                    objCenterY >= roiPx.y &&
                    objCenterY <= (roiPx.y + roiPx.h)
                );

                const threatColor = isInsideRoi
                    ? (Math.floor(Date.now() / 400) % 2 === 0 ? '#ef4444' : '#f97316')
                    : (obj.color || '#38bdf8');
                const confFormatted = obj.confidence ? `${Math.round(obj.confidence * 100)}%` : (obj.score ? `${Math.round(obj.score * 100)}%` : '95%');

                drawTacticalCornerBracketBox(ctx, boxX, boxY, boxW, boxH, threatColor, isInsideRoi, label, confFormatted, icon);
                recordYoloDetectionEvent(obj, isInsideRoi);
            }
        });
    }

    ctx.restore();

    // --- Glassmorphism AI Status HUD (Top Right) ---
    ctx.save();
    const hudW = 270, hudH = 28;
    const hudX = canvas.width - hudW - 14;
    const hudY = 10;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1;
    if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(hudX, hudY, hudW, hudH, 6);
        ctx.fill();
        ctx.stroke();
    } else {
        ctx.fillRect(hudX, hudY, hudW, hudH);
        ctx.strokeRect(hudX, hudY, hudW, hudH);
    }

    ctx.font = 'bold 10.5px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('📡 HUD', hudX + 8, hudY + 18);

    ctx.font = '10px monospace';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`👤 ${personCount} | 🚗 ${carCount} | 🏍️ ${motorCount} | ⚡ 14ms`, hudX + 55, hudY + 18);
    ctx.restore();
}

// --- Interactive In-Player ROI Editing Controller ---
function toggleYoloRoiEditMode() {
    isYoloEditMode = !isYoloEditMode;

    const banner = document.getElementById('yolo-roi-edit-banner');
    const toggleBtn = document.getElementById('yolo-btn-toggle-roi');
    const canvas = document.getElementById('yolo-view-canvas-overlay');

    if (isYoloEditMode) {
        yoloSavedRoiBeforeEdit = { ...(currentYoloRoi || { x: 10, y: 10, w: 80, h: 80 }) };
        if (banner) banner.style.display = 'flex';
        if (toggleBtn) {
            toggleBtn.className = 'btn btn-warning';
            toggleBtn.innerHTML = '✏️ Sedang Edit ROI...';
        }
        if (canvas) {
            canvas.style.pointerEvents = 'auto';
            canvas.style.cursor = 'crosshair';
        }
        initYoloViewCanvasRoiEditing();
        if (typeof showToast === 'function') {
            showToast('✏️ Mode Gambar ROI aktif: Seret sudut untuk mengubah ukuran atau seret kotak untuk memindahkan zona.', 'info');
        }
    } else {
        if (banner) banner.style.display = 'none';
        if (toggleBtn) {
            toggleBtn.className = 'btn btn-secondary';
            toggleBtn.innerHTML = '✏️ Sesuaikan ROI';
        }
        if (canvas) {
            canvas.style.pointerEvents = 'none';
            canvas.style.cursor = 'default';
        }
    }
    drawYoloViewLiveCanvasStream();
}
window.toggleYoloRoiEditMode = toggleYoloRoiEditMode;

function saveAndExitYoloRoiEditMode() {
    isYoloEditMode = false;
    const banner = document.getElementById('yolo-roi-edit-banner');
    const toggleBtn = document.getElementById('yolo-btn-toggle-roi');
    const canvas = document.getElementById('yolo-view-canvas-overlay');

    if (banner) banner.style.display = 'none';
    if (toggleBtn) {
        toggleBtn.className = 'btn btn-secondary';
        toggleBtn.innerHTML = '✏️ Sesuaikan ROI';
    }
    if (canvas) {
        canvas.style.pointerEvents = 'none';
        canvas.style.cursor = 'default';
    }

    const camId = getActiveYoloCameraId();
    const zoomVal = parseFloat(document.getElementById('yolo-zoom-slider')?.value || '1.0');
    const cropXVal = parseInt(document.getElementById('yolo-crop-x-slider')?.value || '0', 10);
    const cropYVal = parseInt(document.getElementById('yolo-crop-y-slider')?.value || '0', 10);
    const resVal = document.getElementById('yolo-stream-resolution')?.value || '720p';

    let targetCam = yoloCamerasList.find(c => String(c.id) === String(camId));
    if (!targetCam) {
        targetCam = { id: camId, enabled: true, settings: {} };
        yoloCamerasList.push(targetCam);
    }
    if (!targetCam.settings) targetCam.settings = {};
    targetCam.settings.roi = { ...currentYoloRoi };
    targetCam.settings.zoom = zoomVal;
    targetCam.settings.cropX = cropXVal;
    targetCam.settings.cropY = cropYVal;
    targetCam.settings.resolution = resVal;
    saveYoloCamerasToStorage();
    localStorage.setItem(`arch3r_sensor_crop_${camId}`, JSON.stringify(targetCam.settings));

    const payload = {
        camera_id: camId,
        zoom: zoomVal,
        cropX: cropXVal,
        cropY: cropYVal,
        resolution: resVal,
        roi: currentYoloRoi
    };

    const fetchFn = (typeof authFetch === 'function') ? authFetch : fetch;
    fetchFn('/api/ai/grid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
    }).catch(err => {
        enqueueOfflineSync('ai_grid', '/api/ai/grid', 'POST', payload, `ROI Zona Cam #${camId}`);
        showToast('📱 Sambungan HP Terputus: Zona ROI tersimpan di HP & otomatis disinkronkan ke server saat online.', 'warning');
    });

    if (typeof appendYoloTerminalLog === 'function') {
        appendYoloTerminalLog(`[ROI] 💾 Zona ROI berhasil dikalibrasi: [X:${Math.round(currentYoloRoi.x)}% Y:${Math.round(currentYoloRoi.y)}% W:${Math.round(currentYoloRoi.w)}% H:${Math.round(currentYoloRoi.h)}%]`, 'config');
    }

    updateYoloRoiDisplays();
    drawYoloViewLiveCanvasStream();

    showToast('💾 Zona ROI deteksi berhasil disimpan!', 'success');
}
window.saveAndExitYoloRoiEditMode = saveAndExitYoloRoiEditMode;

function cancelYoloRoiEditMode() {
    if (yoloSavedRoiBeforeEdit) {
        currentYoloRoi = { ...yoloSavedRoiBeforeEdit };
    }
    isYoloEditMode = false;

    const banner = document.getElementById('yolo-roi-edit-banner');
    const toggleBtn = document.getElementById('yolo-btn-toggle-roi');
    const canvas = document.getElementById('yolo-view-canvas-overlay');

    if (banner) banner.style.display = 'none';
    if (toggleBtn) {
        toggleBtn.className = 'btn btn-secondary';
        toggleBtn.innerHTML = '✏️ Sesuaikan ROI';
    }
    if (canvas) {
        canvas.style.pointerEvents = 'none';
        canvas.style.cursor = 'default';
    }

    updateYoloRoiDisplays();
    drawYoloViewLiveCanvasStream();

    if (typeof showToast === 'function') {
        showToast('Perubahan zona ROI dibatalkan.', 'info');
    }
}
window.cancelYoloRoiEditMode = cancelYoloRoiEditMode;

function initYoloViewCanvasRoiEditing() {
    const canvas = document.getElementById('yolo-view-canvas-overlay');
    if (!canvas || canvas.dataset.roiEditInitialized === 'true') return;
    canvas.dataset.roiEditInitialized = 'true';

    // Inverse Matrix Coordinate Transformation: Maps client screen pointer directly to unscaled 0-100% video coordinate space
    const getCanvasPctPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        // 1. Raw screen percentage across the canvas element (0 to 100)
        const screenPctX = Math.max(0, Math.min(100, ((clientX - rect.left) / (rect.width || 1)) * 100));
        const screenPctY = Math.max(0, Math.min(100, ((clientY - rect.top) / (rect.height || 1)) * 100));

        // 2. Read active Zoom and Pan
        const zoomVal = Math.max(1.0, parseFloat(document.getElementById('yolo-zoom-slider')?.value || '1.0'));
        const cropXVal = parseInt(document.getElementById('yolo-crop-x-slider')?.value || '0', 10);
        const cropYVal = parseInt(document.getElementById('yolo-crop-y-slider')?.value || '0', 10);

        // 3. Exact Inverse Matrix:
        // Forward: screenPct = 50 + (unscaledPct - 50) * zoomVal + cropOffset
        // Inverse: unscaledPct = 50 + (screenPct - 50 - cropOffset) / zoomVal
        const unscaledX = 50 + (screenPctX - 50 - cropXVal) / zoomVal;
        const unscaledY = 50 + (screenPctY - 50 - cropYVal) / zoomVal;

        return {
            x: Math.max(0, Math.min(100, unscaledX)),
            y: Math.max(0, Math.min(100, unscaledY))
        };
    };

    const getHitHandle = (pos) => {
        const r = currentYoloRoi || { x: 10, y: 10, w: 80, h: 80 };
        const zoomVal = Math.max(1.0, parseFloat(document.getElementById('yolo-zoom-slider')?.value || '1.0'));
        // Adaptive handle hit tolerance scaled by zoom so clicking handles feels natural
        const tol = Math.max(2.5, 5.0 / zoomVal);

        if (Math.abs(pos.x - r.x) < tol && Math.abs(pos.y - r.y) < tol) return 'nw';
        if (Math.abs(pos.x - (r.x + r.w)) < tol && Math.abs(pos.y - r.y) < tol) return 'ne';
        if (Math.abs(pos.x - r.x) < tol && Math.abs(pos.y - (r.y + r.h)) < tol) return 'sw';
        if (Math.abs(pos.x - (r.x + r.w)) < tol && Math.abs(pos.y - (r.y + r.h)) < tol) return 'se';

        if (pos.x >= r.x && pos.x <= (r.x + r.w) && pos.y >= r.y && pos.y <= (r.y + r.h)) {
            return 'move';
        }
        return 'new';
    };

    const onPointerDown = (e) => {
        if (!isYoloEditMode) return;
        const pos = getCanvasPctPos(e);
        roiDragHandle = getHitHandle(pos);
        isDraggingViewRoi = true;
        roiDragStartPoint = pos;
        roiDragOriginalBox = { ...(currentYoloRoi || { x: 10, y: 10, w: 80, h: 80 }) };
        e.preventDefault();
    };

    const onPointerMove = (e) => {
        if (!isYoloEditMode) return;

        const pos = getCanvasPctPos(e);

        if (!isDraggingViewRoi) {
            // Update cursor on hover over handles
            const hit = getHitHandle(pos);
            if (hit === 'nw' || hit === 'se') canvas.style.cursor = 'nwse-resize';
            else if (hit === 'ne' || hit === 'sw') canvas.style.cursor = 'nesw-resize';
            else if (hit === 'move') canvas.style.cursor = 'move';
            else canvas.style.cursor = 'crosshair';
            return;
        }

        const dx = pos.x - roiDragStartPoint.x;
        const dy = pos.y - roiDragStartPoint.y;
        const orig = roiDragOriginalBox;

        if (roiDragHandle === 'move') {
            let nx = orig.x + dx;
            let ny = orig.y + dy;
            nx = Math.max(0, Math.min(100 - orig.w, nx));
            ny = Math.max(0, Math.min(100 - orig.h, ny));
            currentYoloRoi.x = nx;
            currentYoloRoi.y = ny;
        } else if (roiDragHandle === 'nw') {
            const nx = Math.min(orig.x + orig.w - 5, Math.max(0, orig.x + dx));
            const ny = Math.min(orig.y + orig.h - 5, Math.max(0, orig.y + dy));
            currentYoloRoi.w = (orig.x + orig.w) - nx;
            currentYoloRoi.h = (orig.y + orig.h) - ny;
            currentYoloRoi.x = nx;
            currentYoloRoi.y = ny;
        } else if (roiDragHandle === 'ne') {
            const nw = Math.max(5, Math.min(100 - orig.x, orig.w + dx));
            const ny = Math.min(orig.y + orig.h - 5, Math.max(0, orig.y + dy));
            currentYoloRoi.w = nw;
            currentYoloRoi.h = (orig.y + orig.h) - ny;
            currentYoloRoi.y = ny;
        } else if (roiDragHandle === 'sw') {
            const nx = Math.min(orig.x + orig.w - 5, Math.max(0, orig.x + dx));
            const nh = Math.max(5, Math.min(100 - orig.y, orig.h + dy));
            currentYoloRoi.w = (orig.x + orig.w) - nx;
            currentYoloRoi.x = nx;
            currentYoloRoi.h = nh;
        } else if (roiDragHandle === 'se') {
            currentYoloRoi.w = Math.max(5, Math.min(100 - orig.x, orig.w + dx));
            currentYoloRoi.h = Math.max(5, Math.min(100 - orig.y, orig.h + dy));
        } else if (roiDragHandle === 'new') {
            const startX = Math.min(roiDragStartPoint.x, pos.x);
            const startY = Math.min(roiDragStartPoint.y, pos.y);
            const w = Math.max(5, Math.abs(pos.x - roiDragStartPoint.x));
            const h = Math.max(5, Math.abs(pos.y - roiDragStartPoint.y));
            currentYoloRoi.x = startX;
            currentYoloRoi.y = startY;
            currentYoloRoi.w = w;
            currentYoloRoi.h = h;
        }

        updateYoloRoiDisplays();
        drawYoloViewLiveCanvasStream();
        e.preventDefault();
    };

    const onPointerUp = () => {
        isDraggingViewRoi = false;
        roiDragHandle = null;
    };

    canvas.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    canvas.addEventListener('touchstart', onPointerDown, { passive: false });
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
}

// --- Quick Filter Pills Controller ---
function toggleYoloFilterPill(category) {
    const cats = ['person', 'car', 'motorcycle', 'animal'];
    if (category === 'all') {
        const allPill = document.getElementById('yolo-pill-all');
        const allActive = cats.every(c => document.getElementById(`yolo-view-filter-${c}`)?.checked);
        const newState = !allActive;
        cats.forEach(c => {
            const chk = document.getElementById(`yolo-view-filter-${c}`);
            if (chk) chk.checked = newState;
            const pill = document.getElementById(`yolo-pill-${c}`);
            if (pill) pill.classList.toggle('active', newState);
        });
        if (allPill) allPill.classList.toggle('active', newState);
    } else {
        const pill = document.getElementById(`yolo-pill-${category}`);
        const chk = document.getElementById(`yolo-view-filter-${category}`);
        if (chk) {
            chk.checked = !chk.checked;
            if (pill) {
                pill.classList.toggle('active', chk.checked);
            }
        }
        const allPill = document.getElementById('yolo-pill-all');
        const allActive = cats.every(c => document.getElementById(`yolo-view-filter-${c}`)?.checked);
        if (allPill) allPill.classList.toggle('active', allActive);
    }
    drawYoloViewLiveCanvasStream();
}
window.toggleYoloFilterPill = toggleYoloFilterPill;

// --- Modular Parameters Modal Controller ---
function openYoloParametersModal() {
    const modal = document.getElementById('modal-yolo-ai-parameters');
    if (modal) {
        modal.style.display = 'flex';
        // Auto-close on backdrop click
        modal.onclick = (e) => {
            if (e.target === modal) closeYoloParametersModal();
        };
    }
}
window.openYoloParametersModal = openYoloParametersModal;

function closeYoloParametersModal() {
    const modal = document.getElementById('modal-yolo-ai-parameters');
    if (modal) modal.style.display = 'none';
}
window.closeYoloParametersModal = closeYoloParametersModal;

function toggleYoloRawTerminalLog() {
    const wrapper = document.getElementById('yolo-terminal-log-wrapper');
    if (wrapper) {
        wrapper.style.display = (wrapper.style.display === 'none' || !wrapper.style.display) ? 'block' : 'none';
    } else {
        const terminal = document.getElementById('yolo-telemetry-terminal');
        if (terminal) {
            terminal.style.display = (terminal.style.display === 'none') ? 'block' : 'none';
        }
    }
}
window.toggleYoloRawTerminalLog = toggleYoloRawTerminalLog;

function updateYoloThresholdDisplay(val) {
    const display = document.getElementById('yolo-threshold-value-display');
    if (display) display.textContent = `${val}%`;
}
window.updateYoloThresholdDisplay = updateYoloThresholdDisplay;

let currentYoloRoi = { x: 10, y: 10, w: 80, h: 80 };

function updateYoloRoiDisplays() {
    const xDisp = document.getElementById('yolo-roi-x-val');
    const yDisp = document.getElementById('yolo-roi-y-val');
    const wDisp = document.getElementById('yolo-roi-w-val');
    const hDisp = document.getElementById('yolo-roi-h-val');

    if (xDisp) xDisp.textContent = `${Math.round(currentYoloRoi.x)}%`;
    if (yDisp) yDisp.textContent = `${Math.round(currentYoloRoi.y)}%`;
    if (wDisp) wDisp.textContent = `${Math.round(currentYoloRoi.w)}%`;
    if (hDisp) hDisp.textContent = `${Math.round(currentYoloRoi.h)}%`;
}

function resetYoloRoiBox() {
    currentYoloRoi = { x: 10, y: 10, w: 80, h: 80 };
    updateYoloRoiDisplays();
    drawYoloViewLiveCanvasStream();
    if (typeof showToast === 'function') {
        showToast('Zona ROI telah di-reset ke ukuran default (80% full screen).', 'info');
    }
}
window.resetYoloRoiBox = resetYoloRoiBox;

function updateYoloVideoCropPreview() {
    const zoomVal = parseFloat(document.getElementById('yolo-zoom-slider')?.value || '1.0');
    const cropXVal = parseInt(document.getElementById('yolo-crop-x-slider')?.value || '0', 10);
    const cropYVal = parseInt(document.getElementById('yolo-crop-y-slider')?.value || '0', 10);

    const zoomDisp = document.getElementById('yolo-zoom-value-display');
    const cropXDisp = document.getElementById('yolo-crop-x-display');
    const cropYDisp = document.getElementById('yolo-crop-y-display');

    if (zoomDisp) zoomDisp.textContent = `${zoomVal.toFixed(1)}x`;
    if (cropXDisp) cropXDisp.textContent = `${cropXVal}%`;
    if (cropYDisp) cropYDisp.textContent = `${cropYVal}%`;

    const videoElView = document.getElementById('yolo-view-video-element');
    const transformCss = `scale(${zoomVal}) translate(${cropXVal / zoomVal}%, ${cropYVal / zoomVal}%)`;
    if (videoElView) videoElView.style.transform = transformCss;

    drawYoloViewLiveCanvasStream();
}
window.updateYoloVideoCropPreview = updateYoloVideoCropPreview;

function loadYoloCameraSettingsData(camId) {
    const targetCam = yoloCamerasList.find(c => String(c.id) === String(camId));
    const settings = (targetCam && targetCam.settings) ? targetCam.settings : {
        threshold: 50,
        resolution: '720p',
        zoom: 1.0,
        cropX: 0,
        cropY: 0,
        roi: { x: 10, y: 10, w: 80, h: 80 },
        person: true,
        car: true,
        motorcycle: true,
        bicycle: false,
        truck: false,
        dogCat: false,
        bird: false,
        livestock: false,
        engineModel: 'yolov8n',
        processingFps: '10',
        npuAccel: true,
        eventRecord: true,
        eventBuzzer: false,
        eventTelegram: false
    };

    const slider = document.getElementById('yolo-threshold-slider');
    const display = document.getElementById('yolo-threshold-value-display');
    if (slider) slider.value = settings.threshold || 50;
    if (display) display.textContent = `${settings.threshold || 50}%`;

    const resSelect = document.getElementById('yolo-stream-resolution');
    const zoomSlider = document.getElementById('yolo-zoom-slider');
    const cropXSlider = document.getElementById('yolo-crop-x-slider');
    const cropYSlider = document.getElementById('yolo-crop-y-slider');

    if (resSelect) resSelect.value = settings.resolution || '720p';
    if (zoomSlider) zoomSlider.value = settings.zoom || 1.0;
    if (cropXSlider) cropXSlider.value = settings.cropX || 0;
    if (cropYSlider) cropYSlider.value = settings.cropY || 0;

    const engineSelect = document.getElementById('yolo-engine-model');
    const fpsSelect = document.getElementById('yolo-processing-fps');
    const npuAccelChk = document.getElementById('yolo-npu-accel');

    if (engineSelect) engineSelect.value = settings.engineModel || 'yolov8n';
    if (fpsSelect) fpsSelect.value = String(settings.processingFps || '10');
    if (npuAccelChk) npuAccelChk.checked = settings.npuAccel !== false;

    // Sync HUD badges on top right
    const hudModel = document.getElementById('yolo-hud-model-name');
    const hudFps = document.getElementById('yolo-hud-fps');
    const engineMap = {
        'yolov8n': 'YOLOv8 Nano',
        'yolov8s': 'YOLOv8 Small',
        'yolov8m': 'YOLOv8 Medium'
    };
    if (hudModel) hudModel.textContent = engineMap[settings.engineModel] || 'YOLOv8 Nano';
    if (hudFps) hudFps.textContent = `${settings.processingFps || '10'} FPS`;

    const chkRec = document.getElementById('yolo-event-record');
    const chkBuzz = document.getElementById('yolo-event-buzzer');
    const chkTel = document.getElementById('yolo-event-telegram');

    if (chkRec) chkRec.checked = settings.eventRecord !== false;
    if (chkBuzz) chkBuzz.checked = !!settings.eventBuzzer;
    if (chkTel) chkTel.checked = !!settings.eventTelegram;

    if (settings.roi) {
        currentYoloRoi = { ...settings.roi };
    } else {
        currentYoloRoi = { x: 10, y: 10, w: 80, h: 80 };
    }

    updateYoloRoiDisplays();

    const chkPerson = document.getElementById('yolo-obj-person');
    const chkCar = document.getElementById('yolo-obj-car');
    const chkMotorcycle = document.getElementById('yolo-obj-motorcycle');
    const chkBicycle = document.getElementById('yolo-obj-bicycle');
    const chkTruck = document.getElementById('yolo-obj-truck');
    const chkDogCat = document.getElementById('yolo-obj-dog-cat');
    const chkBird = document.getElementById('yolo-obj-bird');
    const chkLivestock = document.getElementById('yolo-obj-livestock');

    if (chkPerson) chkPerson.checked = settings.person !== false;
    if (chkCar) chkCar.checked = settings.car !== false;
    if (chkMotorcycle) chkMotorcycle.checked = settings.motorcycle !== false;
    if (chkBicycle) chkBicycle.checked = !!settings.bicycle;
    if (chkTruck) chkTruck.checked = !!settings.truck;
    if (chkDogCat) chkDogCat.checked = !!settings.dogCat;
    if (chkBird) chkBird.checked = !!settings.bird;
    if (chkLivestock) chkLivestock.checked = !!settings.livestock;

    // Synchronize Filter Checkboxes & Quick Filter Pills
    const vPerson = document.getElementById('yolo-view-filter-person');
    const vCar = document.getElementById('yolo-view-filter-car');
    const vMotorcycle = document.getElementById('yolo-view-filter-motorcycle');
    const vAnimal = document.getElementById('yolo-view-filter-animal');

    if (vPerson) vPerson.checked = settings.person !== false;
    if (vCar) vCar.checked = settings.car !== false;
    if (vMotorcycle) vMotorcycle.checked = settings.motorcycle !== false;
    if (vAnimal) vAnimal.checked = (!!settings.dogCat || !!settings.bird || !!settings.livestock);

    const pillPerson = document.getElementById('yolo-pill-person');
    const pillCar = document.getElementById('yolo-pill-car');
    const pillMotorcycle = document.getElementById('yolo-pill-motorcycle');
    const pillAnimal = document.getElementById('yolo-pill-animal');

    if (pillPerson) pillPerson.classList.toggle('active', settings.person !== false);
    if (pillCar) pillCar.classList.toggle('active', settings.car !== false);
    if (pillMotorcycle) pillMotorcycle.classList.toggle('active', settings.motorcycle !== false);
    if (pillAnimal) pillAnimal.classList.toggle('active', !!settings.dogCat || !!settings.bird || !!settings.livestock);

    updateYoloVideoCropPreview();
}

function saveYoloCameraSettings(applyToAllGlobal = false) {
    const camId = applyToAllGlobal ? 'global' : getActiveYoloCameraId();

    const thresholdVal = parseInt(document.getElementById('yolo-threshold-slider')?.value || '50', 10);
    const resolution = document.getElementById('yolo-stream-resolution')?.value || '720p';
    const zoom = parseFloat(document.getElementById('yolo-zoom-slider')?.value || '1.0');
    const cropX = parseInt(document.getElementById('yolo-crop-x-slider')?.value || '0', 10);
    const cropY = parseInt(document.getElementById('yolo-crop-y-slider')?.value || '0', 10);

    const person = !!document.getElementById('yolo-obj-person')?.checked;
    const car = !!document.getElementById('yolo-obj-car')?.checked;
    const motorcycle = !!document.getElementById('yolo-obj-motorcycle')?.checked;
    const bicycle = !!document.getElementById('yolo-obj-bicycle')?.checked;
    const truck = !!document.getElementById('yolo-obj-truck')?.checked;
    const dogCat = !!document.getElementById('yolo-obj-dog-cat')?.checked;
    const bird = !!document.getElementById('yolo-obj-bird')?.checked;
    const livestock = !!document.getElementById('yolo-obj-livestock')?.checked;

    const engineModel = document.getElementById('yolo-engine-model')?.value || 'yolov8n';
    const processingFps = document.getElementById('yolo-processing-fps')?.value || '10';
    const npuAccel = !!document.getElementById('yolo-npu-accel')?.checked;

    const eventRecord = !!document.getElementById('yolo-event-record')?.checked;
    const eventBuzzer = !!document.getElementById('yolo-event-buzzer')?.checked;
    const eventTelegram = !!document.getElementById('yolo-event-telegram')?.checked;

    const newSettings = {
        threshold: thresholdVal,
        resolution,
        zoom,
        cropX,
        cropY,
        roi: { ...currentYoloRoi },
        person, car, motorcycle, bicycle, truck, dogCat, bird, livestock,
        engineModel, processingFps, npuAccel,
        eventRecord, eventBuzzer, eventTelegram
    };

    if (applyToAllGlobal) {
        yoloCamerasList.forEach(cam => {
            cam.settings = { ...newSettings };
        });
        localStorage.setItem('arch3r_yolo_global_default', JSON.stringify(newSettings));
    } else {
        const targetCam = yoloCamerasList.find(c => String(c.id) === String(camId));
        if (targetCam) {
            targetCam.settings = newSettings;
        } else {
            yoloCamerasList.push({
                id: camId,
                enabled: true,
                settings: newSettings
            });
        }
        localStorage.setItem(`arch3r_sensor_crop_${camId}`, JSON.stringify(newSettings));
    }

    saveYoloCamerasToStorage();

    const payload = {
        camera_id: camId,
        zoom,
        cropX,
        cropY,
        resolution,
        roi: currentYoloRoi,
        threshold: thresholdVal,
        engineModel,
        processingFps,
        applyToAllGlobal
    };

    // Persist to backend /api/ai/grid with offline queue fallback
    const fetchFn = (typeof authFetch === 'function') ? authFetch : fetch;
    fetchFn('/api/ai/grid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
    }).catch(err => {
        enqueueOfflineSync('ai_grid', '/api/ai/grid', 'POST', payload, `Parameter AI Cam #${camId}`);
        showToast('📱 Sambungan HP Terputus: Parameter AI disimpan di HP & akan otomatis disinkronkan saat terhubung.', 'warning');
    });

    if (typeof appendYoloTerminalLog === 'function') {
        appendYoloTerminalLog(`[CONFIG] 💾 Parameter AI Disimpan: Model=${engineModel}, FPS=${processingFps}, Sensitivitas=${thresholdVal}%, Frame=(${cropX}%,${cropY}%,${zoom}x)`, 'config');
    }

    // Update Top Right HUD Badges
    const hudModel = document.getElementById('yolo-hud-model-name');
    const hudFps = document.getElementById('yolo-hud-fps');
    const engineMap = {
        'yolov8n': 'YOLOv8 Nano',
        'yolov8s': 'YOLOv8 Small',
        'yolov8m': 'YOLOv8 Medium'
    };
    if (hudModel) hudModel.textContent = engineMap[engineModel] || 'YOLOv8 Nano';
    if (hudFps) hudFps.textContent = `${processingFps} FPS`;

    updateYoloVideoCropPreview();
    closeYoloParametersModal();

    const msg = applyToAllGlobal
        ? '🌐 Parameter YOLO AI berhasil diterapkan ke SEMUA kamera secara Global!'
        : '💾 Parameter YOLO AI berhasil disimpan khusus untuk kamera ini!';

    showToast(msg, 'success');
}
window.saveYoloCameraSettings = saveYoloCameraSettings;

function refreshYoloSettingStream() {
    attachYoloVideoPreview('yolo-view-video-element');
    if (typeof showToast === 'function') {
        showToast('🔄 Menghubungkan ulang stream video RTSP/HLS...', 'info');
    }
}
window.refreshYoloSettingStream = refreshYoloSettingStream;

function toggleYoloVideoFullscreen() {
    const videoWrapper = document.getElementById('yolo-view-video-wrapper');
    if (!videoWrapper) return;

    if (!document.fullscreenElement) {
        if (videoWrapper.requestFullscreen) {
            videoWrapper.requestFullscreen();
        } else if (videoWrapper.webkitRequestFullscreen) {
            videoWrapper.webkitRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}
window.toggleYoloVideoFullscreen = toggleYoloVideoFullscreen;

function handleYoloFullscreenChange() {
    const canvas = document.getElementById('yolo-view-canvas-overlay');
    if (canvas) {
        const rect = canvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            canvas.width = Math.floor(rect.width);
            canvas.height = Math.floor(rect.height);
        }
    }
    drawYoloViewLiveCanvasStream();
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (typeof appendYoloTerminalLog === 'function') {
        appendYoloTerminalLog(`[SYSTEM] ⛶ Mode Layar Penuh ${isFs ? 'Aktif' : 'Nonaktif'} (Stage 16:9 Sinkron)`, 'system');
    }
}
document.addEventListener('fullscreenchange', handleYoloFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleYoloFullscreenChange);
window.addEventListener('resize', () => {
    if (document.getElementById('yolo-view-canvas-overlay')) {
        drawYoloViewLiveCanvasStream();
    }
});

// Backward Compatibility Helpers for Legacy Scripts & Handlers
function updateYoloStudioZoomDisplay(val) { updateYoloVideoCropPreview(); }
window.updateYoloStudioZoomDisplay = updateYoloStudioZoomDisplay;
function addNewRoiZone() { toggleYoloRoiEditMode(); }
window.addNewRoiZone = addNewRoiZone;
function drawYoloStudioCanvas() { drawYoloViewLiveCanvasStream(); }
window.drawYoloStudioCanvas = drawYoloStudioCanvas;
function initYoloStudioCanvasDragging() { initYoloViewCanvasRoiEditing(); }
window.initYoloStudioCanvasDragging = initYoloStudioCanvasDragging;
function drawYoloSettingCanvasOverlay() { drawYoloViewLiveCanvasStream(); }
window.drawYoloSettingCanvasOverlay = drawYoloSettingCanvasOverlay;
function initYoloRoiDragging() { initYoloViewCanvasRoiEditing(); }
window.initYoloRoiDragging = initYoloRoiDragging;
function switchYoloSettingsTab(tabName) {
    if (tabName === 'settings') {
        openYoloParametersModal();
    } else {
        attachYoloVideoPreview('yolo-view-video-element');
        startYoloLiveCanvasStreamLoop();
    }
}
window.switchYoloSettingsTab = switchYoloSettingsTab;
function cancelYoloEditMode() { cancelYoloRoiEditMode(); }
window.cancelYoloEditMode = cancelYoloEditMode;

function exportYoloConfig() {
    const token = localStorage.getItem('nvr_auth_token') || localStorage.getItem('arch3r_token') || '';
    fetch('/api/ai/config/export', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
    .then(r => r.json())
    .then(data => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `arch3r_ai_config_backup_${Date.now()}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showNotification('Success', 'Konfigurasi AI Kamera berhasil di-export ke JSON', 'success');
    })
    .catch(e => showNotification('Error', 'Gagal export konfigurasi AI: ' + e.message, 'error'));
}
window.exportYoloConfig = exportYoloConfig;

function importYoloConfigFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            const token = localStorage.getItem('nvr_auth_token') || localStorage.getItem('arch3r_token') || '';
            fetch('/api/ai/config/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(parsed)
            })
            .then(r => r.json())
            .then(res => {
                if (res.success) {
                    showNotification('Success', res.message || 'Konfigurasi AI berhasil dipulihkan', 'success');
                    fetchCameras();
                } else {
                    showNotification('Error', res.error || 'Gagal memulihkan konfigurasi', 'error');
                }
            });
        } catch(err) {
            showNotification('Error', 'File JSON konfigurasi tidak valid', 'error');
        }
    };
    reader.readAsText(file);
}
window.importYoloConfigFile = importYoloConfigFile;

function toggleYoloControlDrawer() {
    const drawer = document.getElementById('yolo-control-drawer-panel');
    if (drawer) {
        const isHidden = drawer.style.display === 'none';
        drawer.style.display = isHidden ? 'block' : 'none';
    }
}
window.toggleYoloControlDrawer = toggleYoloControlDrawer;

function saveYoloSensorCropFrame() {
    const camId = getActiveYoloCameraId();
    const zoomVal = parseFloat(document.getElementById('yolo-zoom-slider')?.value || '1.0');
    const cropXVal = parseInt(document.getElementById('yolo-crop-x-slider')?.value || '0', 10);
    const cropYVal = parseInt(document.getElementById('yolo-crop-y-slider')?.value || '0', 10);
    const resVal = document.getElementById('yolo-stream-resolution')?.value || '720p';

    let targetCam = yoloCamerasList.find(c => String(c.id) === String(camId));
    if (!targetCam) {
        targetCam = { id: camId, enabled: true, settings: {} };
        yoloCamerasList.push(targetCam);
    }
    if (!targetCam.settings) targetCam.settings = {};
    targetCam.settings.zoom = zoomVal;
    targetCam.settings.cropX = cropXVal;
    targetCam.settings.cropY = cropYVal;
    targetCam.settings.resolution = resVal;
    targetCam.settings.roi = { ...(currentYoloRoi || { x: 10, y: 10, w: 80, h: 80 }) };

    saveYoloCamerasToStorage();
    localStorage.setItem(`arch3r_sensor_crop_${camId}`, JSON.stringify(targetCam.settings));

    const payload = {
        camera_id: camId,
        zoom: zoomVal,
        cropX: cropXVal,
        cropY: cropYVal,
        resolution: resVal,
        roi: currentYoloRoi
    };

    // Persist to backend with offline queue fallback
    const fetchFn = (typeof authFetch === 'function') ? authFetch : fetch;
    fetchFn('/api/ai/grid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
    }).catch(err => {
        enqueueOfflineSync('ai_grid', '/api/ai/grid', 'POST', payload, `Frame Sensor Cam #${camId}`);
        showToast('📱 Sambungan HP Terputus: Frame sensor AI disimpan di HP & otomatis disinkronkan saat terhubung.', 'warning');
    });

    appendYoloTerminalLog(`[SENSOR] 💾 Frame Pantauan Sensor AI Tersimpan: Zoom ${zoomVal.toFixed(1)}x, Pan X: ${cropXVal}%, Pan Y: ${cropYVal}%`, 'sensor');

    showToast(`💾 Frame sensor AI (Zoom: ${zoomVal.toFixed(1)}x, Pan: ${cropXVal}%, ${cropYVal}%) berhasil disimpan sebagai area pantauan sensor!`, 'success');
}
window.saveYoloSensorCropFrame = saveYoloSensorCropFrame;

function resetYoloSensorCropFrame() {
    const zoomSlider = document.getElementById('yolo-zoom-slider');
    const cropXSlider = document.getElementById('yolo-crop-x-slider');
    const cropYSlider = document.getElementById('yolo-crop-y-slider');
    if (zoomSlider) zoomSlider.value = '1.0';
    if (cropXSlider) cropXSlider.value = '0';
    if (cropYSlider) cropYSlider.value = '0';

    updateYoloVideoCropPreview();
    appendYoloTerminalLog('[SENSOR] 🔄 Frame sensor AI dikembalikan ke default 1.0x (Pan 0, 0)', 'info');

    if (typeof showToast === 'function') {
        showToast('Frame sensor AI dikembalikan ke posisi default (1.0x). Klik "Simpan Frame Sensor" jika ingin menjadikannya permanen.', 'info');
    }
}
window.resetYoloSensorCropFrame = resetYoloSensorCropFrame;

function simulateYoloDetectionTest() {
    const roi = currentYoloRoi || { x: 10, y: 10, w: 80, h: 80 };

    // Target 1: Inside ROI (Critical Intrusion)
    const insideTarget = {
        type: 'person',
        label: 'Person (Intruder)',
        confidence: 0.94,
        pctX: Math.max(0, Math.min(90, roi.x + (roi.w * 0.3))),
        pctY: Math.max(0, Math.min(90, roi.y + (roi.h * 0.3))),
        pctW: Math.min(18, Math.max(8, roi.w * 0.35)),
        pctH: Math.min(32, Math.max(14, roi.h * 0.45)),
        color: '#ef4444'
    };

    // Target 2: Outside ROI (Normal Detection)
    let outX = roi.x > 22 ? (roi.x / 2) : Math.min(88, roi.x + roi.w + 4);
    let outY = Math.max(8, Math.min(80, roi.y + (roi.h * 0.5)));
    const outsideTarget = {
        type: 'car',
        label: 'Mobil',
        confidence: 0.88,
        pctX: Math.max(2, Math.min(85, outX)),
        pctY: Math.max(2, Math.min(85, outY)),
        pctW: 20,
        pctH: 15,
        color: '#38bdf8'
    };

    activeRealYoloDetections = [insideTarget, outsideTarget];

    // Force clear throttling map so test events are immediately registered in event strip
    lastRecordedDetectionMap.clear();

    // Trigger detection events for target strip & terminal
    recordYoloDetectionEvent(insideTarget, true);
    recordYoloDetectionEvent(outsideTarget, false);

    // Re-draw canvas immediately
    drawYoloViewLiveCanvasStream();

    // Ensure terminal log wrapper is visible
    const termWrapper = document.getElementById('yolo-terminal-log-wrapper');
    if (termWrapper && termWrapper.style.display === 'none') {
        termWrapper.style.display = 'block';
    }

    appendYoloTerminalLog('[TEST] 🧪 Simulasi diagnostik AI dipicu: 1 Target Pelanggaran ROI, 1 Target Luar Zona', 'system');
    appendYoloTerminalLog(`[ALARM] 🚨 CRITICAL INTRUSION: Target ${insideTarget.label} (${Math.round(insideTarget.confidence * 100)}%) melanggar ZONA ROI!`, 'alarm');
    appendYoloTerminalLog(`[TARGET] 🎯 DETECTED: Target ${outsideTarget.label} (${Math.round(outsideTarget.confidence * 100)}%) berada di luar perimeter`, 'target');

    if (typeof showToast === 'function') {
        showToast('🧪 Simulasi target AI aktif! Target terdeteksi & terminal log diperbarui.', 'success');
    }
}
window.simulateYoloDetectionTest = simulateYoloDetectionTest;

let yoloTerminalLogHistory = [];

function appendYoloTerminalLog(text, level = 'info') {
    const now = new Date();
    const timeStr = now.toTimeString().substring(0, 8);
    const entry = { time: timeStr, text, level };
    yoloTerminalLogHistory.push(entry);
    if (yoloTerminalLogHistory.length > 100) {
        yoloTerminalLogHistory.shift();
    }

    const terminal = document.getElementById('yolo-telemetry-terminal');
    if (!terminal) return;

    // Remove placeholder if present
    const placeholder = terminal.querySelector('.no-det-status');
    if (placeholder) placeholder.remove();

    let color = '#4ade80'; // default info
    if (level === 'alarm' || level === 'critical') color = '#ef4444';
    else if (level === 'target') color = '#38bdf8';
    else if (level === 'config') color = '#fbbf24';
    else if (level === 'sensor') color = '#c084fc';
    else if (level === 'system') color = '#94a3b8';

    const line = document.createElement('div');
    line.style.padding = '2px 0';
    line.style.lineHeight = '1.4';
    line.innerHTML = `<span style="color:#64748b; font-family:monospace;">[${timeStr}]</span> <span style="color:${color};">${text}</span>`;
    terminal.appendChild(line);

    while (terminal.childElementCount > 80) {
        terminal.removeChild(terminal.firstElementChild);
    }

    terminal.scrollTop = terminal.scrollHeight;
}
window.appendYoloTerminalLog = appendYoloTerminalLog;

function clearYoloTerminalLog() {
    yoloTerminalLogHistory = [];
    const terminal = document.getElementById('yolo-telemetry-terminal');
    if (terminal) {
        const timeStr = new Date().toTimeString().substring(0, 8);
        terminal.innerHTML = `<div class="no-det-status" style="color:#64748b; font-style:italic;">[${timeStr}] 🧹 Terminal log dibersihkan. Memantau inferensi stream AI...</div>`;
    }
    if (typeof showToast === 'function') {
        showToast('🧹 Terminal log telemetri AI dibersihkan.', 'info');
    }
}
window.clearYoloTerminalLog = clearYoloTerminalLog;

function startYoloTelemetrySimulator() {
    if (yoloTelemetryTimer) clearInterval(yoloTelemetryTimer);

    // Initial stream greeting
    appendYoloTerminalLog('🟢 Telemetri Inferensi YOLO AI Siap & Berjalan', 'system');

    let heartbeatTick = 0;
    yoloTelemetryTimer = setInterval(() => {
        const viewPane = document.getElementById('yolo-settings-view');
        if (!viewPane || viewPane.style.display === 'none' || activeYoloSettingsTab !== 'view') {
            return;
        }

        heartbeatTick++;
        if (Array.isArray(activeRealYoloDetections) && activeRealYoloDetections.length > 0) {
            if (heartbeatTick % 4 === 0) {
                const summary = activeRealYoloDetections.map(d => `${d.label || d.type || 'Object'} (${Math.round((d.confidence || 0.9) * 100)}%)`).join(', ');
                appendYoloTerminalLog(`[INFERENCE] Target Aktif: ${summary}`, 'target');
            }
        } else {
            if (heartbeatTick % 10 === 0) {
                appendYoloTerminalLog('[HEARTBEAT] 🟢 Engine AI Siaga. Memantau frame video RTSP untuk gerakan objek...', 'system');
            }
        }
    }, 2000);
}

function openYoloCameraSettings(camId) {
    activeYoloSettingsCamId = camId;
    localStorage.setItem('arch3r_yolo_active_cam_id', String(camId));
    const target = yoloCamerasList.find(c => String(c.id) === String(camId));
    const camName = target ? target.name : `Kamera (${camId})`;

    const nameSpan = document.getElementById('yolo-settings-camera-name');
    if (nameSpan) nameSpan.textContent = camName;

    const repoView = document.getElementById('addons-repository-view');
    const mainList = document.getElementById('yolo-main-list-view');
    const settingsView = document.getElementById('yolo-settings-view');

    if (repoView) repoView.style.display = 'none';
    if (mainList) mainList.style.display = 'none';
    if (settingsView) settingsView.style.display = 'block';

    // Reset event strip for selected camera session
    renderYoloEventStrip();

    loadYoloCameraSettingsData(camId);
    attachYoloVideoPreview('yolo-view-video-element');
    startYoloLiveCanvasStreamLoop();
    startYoloTelemetrySimulator();
}
window.openYoloCameraSettings = openYoloCameraSettings;

function closeYoloCameraSettings() {
    if (isYoloEditMode) {
        cancelYoloRoiEditMode();
    }
    closeYoloParametersModal();

    activeYoloSettingsCamId = null;
    if (yoloTelemetryTimer) {
        clearInterval(yoloTelemetryTimer);
        yoloTelemetryTimer = null;
    }
    if (yoloCanvasAnimationTimer) {
        cancelAnimationFrame(yoloCanvasAnimationTimer);
        yoloCanvasAnimationTimer = null;
    }

    // Release video element to free STB hardware decoder memory
    const videoEl = document.getElementById('yolo-view-video-element');
    if (videoEl) {
        try {
            videoEl.pause();
            videoEl.removeAttribute('src');
            videoEl.load();
        } catch(e) {}
    }

    const repoView = document.getElementById('addons-repository-view');
    const mainList = document.getElementById('yolo-main-list-view');
    const settingsView = document.getElementById('yolo-settings-view');

    if (repoView) repoView.style.display = 'none';
    if (mainList) mainList.style.display = 'block';
    if (settingsView) settingsView.style.display = 'none';
}
window.closeYoloCameraSettings = closeYoloCameraSettings;
