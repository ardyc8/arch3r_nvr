// version_sync.js - Arch3r NVR Centralized Dynamic Version Synchronizer
(function () {
    const CURRENT_STATIC_VERSION = '10.8.4';
    window.APP_VERSION = CURRENT_STATIC_VERSION;

    function applyVersionToDOM(version) {
        if (!version) return;
        window.APP_VERSION = version;

        // 1. Update Document Title
        if (document.title) {
            document.title = document.title
                .replace(/Ver\.?\s*[0-9]+(\.[0-9]+)+/gi, `Ver. ${version}`)
                .replace(/v[0-9]+(\.[0-9]+)+/gi, `v${version}`);
        }

        // 2. Target specific version badges and elements
        const specificIds = ['adminOtaStatusBadge', 'aboutAppVersion'];
        specificIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (id === 'aboutAppVersion') {
                    el.textContent = `Arch3r NVR Ver. ${version}`;
                } else {
                    el.textContent = `v${version}`;
                }
            }
        });

        // 3. Update all text nodes or elements containing "Ver." or "v9."
        const targets = document.querySelectorAll(
            '.app-version, [data-app-version], .badge, span, h2, h3, h4, p'
        );

        targets.forEach(el => {
            // If leaf element or simple text container
            if (el.children.length === 0 && el.textContent) {
                const txt = el.textContent.trim();
                // Replace "Ver. X.Y.Z" or "Ver X.Y.Z"
                if (/Ver\.?\s*[0-9]+(\.[0-9]+)+/i.test(txt)) {
                    el.textContent = el.textContent.replace(/Ver\.?\s*[0-9]+(\.[0-9]+)+/gi, `Ver. ${version}`);
                }
                // Replace standalone "v9.x.x" or "vX.Y.Z"
                else if (/^v[0-9]+(\.[0-9]+)+$/i.test(txt) || /Versi Terpasang:\s*v[0-9]+(\.[0-9]+)+/i.test(txt)) {
                    el.textContent = el.textContent.replace(/v[0-9]+(\.[0-9]+)+/gi, `v${version}`);
                }
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
