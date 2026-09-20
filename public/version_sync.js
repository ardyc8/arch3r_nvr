// version_sync.js - Arch3r NVR Centralized Dynamic Version Synchronizer
(function () {
    const CURRENT_STATIC_VERSION = '9.9.5';
    window.APP_VERSION = CURRENT_STATIC_VERSION;

    function applyVersionToDOM(version) {
        if (!version) return;
        window.APP_VERSION = version;

        // 1. Update Document Title
        if (document.title && /Ver\.?\s*[0-9]+\.[0-9]+\.[0-9]+/i.test(document.title)) {
            document.title = document.title.replace(/Ver\.?\s*[0-9]+\.[0-9]+\.[0-9]+/i, `Ver. ${version}`);
        }

        // 2. Update all text nodes or elements containing "Ver."
        const targets = document.querySelectorAll(
            '.app-version, [data-app-version], .badge, span, h2, h3, p'
        );

        targets.forEach(el => {
            if (el.children.length === 0 && el.textContent.includes('Ver.')) {
                el.textContent = el.textContent.replace(/Ver\.?\s*[0-9]+\.[0-9]+\.[0-9]+/gi, `Ver. ${version}`);
            }
        });
    }

    // Run immediately when DOM is available
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => applyVersionToDOM(window.APP_VERSION));
    } else {
        applyVersionToDOM(window.APP_VERSION);
    }

    // Dynamically query server API to guarantee 100% synchronization
    if (typeof fetch === 'function') {
        fetch('/api/version')
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data && data.version) {
                    applyVersionToDOM(data.version);
                }
            })
            .catch(() => {});
    }

    window.syncAppVersion = applyVersionToDOM;
})();
