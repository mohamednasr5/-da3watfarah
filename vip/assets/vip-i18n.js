/**
 * vip-i18n.js — generic AR ⇄ EN engine for da3watfarah VIP invitation templates.
 *
 * WHAT IT DOES
 * The old "EN / ع" buttons in every VIP template were plain links to
 * `?lang=en` / `?lang=ar` with no script reading that query string — so
 * clicking them did nothing. This file makes those buttons actually work,
 * for BOTH kinds of text on the page:
 *
 *   1. Static template copy   — section titles, labels, FAQ, button text —
 *      marked with `data-i18n` (or already implied because the element sits
 *      inside a `[data-einvite-section]`/nav and has no `data-bind`).
 *   2. Dynamic couple content — names, custom invitation text, venue,
 *      family names, etc. — already marked with `data-bind` by each
 *      template's own bridge script (see the `applyData()` function near
 *      the bottom of every demo-*.html file).
 *
 * Every translatable string is sent, ONCE, to the Worker's
 * `POST /api/ai/translate` endpoint (see worker.js), which asks the AI to
 * translate the whole batch AR → EN in one call. The result is cached in
 * localStorage per template + content, so re-toggling languages (or
 * reloading the page) never re-hits the AI unless the underlying Arabic
 * text actually changed (e.g. a different invitation's data was bound).
 *
 * HOW TO ADD THIS TO A TEMPLATE
 * Just add, right before `</body>`:
 *   <script src="/vip/assets/vip-i18n.js"></script>
 * (or the relative path to this file, e.g. "../../assets/vip-i18n.js").
 * No other markup changes are required — the existing
 * `[data-einvite-langswitch] a[href*="lang="]` buttons are auto-wired.
 *
 * To get the STATIC copy translated too (not just the couple's data), add
 * `data-i18n` to the elements that hold it, e.g.:
 *   <h2 class="section-title" data-i18n>كل ما يهمكم</h2>
 * (see demo-royal-maroon.html for a fully tagged reference template).
 *
 * CONFIGURATION (optional, set before this script tag if needed)
 *   window.VIP_I18N_API       — full URL of the translate endpoint
 *   window.VIP_TEMPLATE_ID    — cache namespace (defaults to pathname)
 */
(function () {
    'use strict';

    var DEFAULT_API = 'https://da3watfarah.nonm1724.workers.dev/api/ai/translate';
    var API_URL = window.VIP_I18N_API || DEFAULT_API;
    var STORAGE_PREFIX = 'vip_i18n_v1_';
    var LANG_KEY = 'vip_lang';

    function templateId() {
        return window.VIP_TEMPLATE_ID || location.pathname.replace(/[^a-z0-9_-]+/gi, '_') || 'vip-template';
    }

    function cacheKey() {
        return STORAGE_PREFIX + templateId() + '_en';
    }

    function loadCache() {
        try {
            var raw = localStorage.getItem(cacheKey());
            return raw ? JSON.parse(raw) : {};
        } catch (e) { return {}; }
    }

    function saveCache(map) {
        try { localStorage.setItem(cacheKey(), JSON.stringify(map)); } catch (e) { /* storage full/blocked, non-fatal */ }
    }

    // Attribute/key patterns for data-bind values that are NOT free text
    // (urls, isolated ids, machine-formatted dates) and must never be sent
    // to the translator or have their text swapped.
    var SKIP_BIND_PATTERN = /url|Url|Image|Action|Id$|DateTime|token|Token/;

    function isEligible(el) {
        if (el.hasAttribute('data-i18n-skip')) return false;
        var tag = el.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'FORM' || tag === 'SCRIPT' || tag === 'STYLE') return false;
        var bindKey = el.getAttribute('data-bind');
        if (bindKey && SKIP_BIND_PATTERN.test(bindKey)) return false;
        // Only translate leaf-ish text: skip containers whose text is only
        // whitespace or that wrap other translatable elements (avoids
        // double-sending the same words as both parent and child).
        if (el.querySelector('[data-i18n], [data-bind]')) return false;
        var text = (el.textContent || '').trim();
        if (!text) return false;
        // Skip pure numbers/times/symbols (nothing to translate).
        if (/^[\d\s:./%\-–—+PMAمص]+$/.test(text) && !/[\u0600-\u06FF]/.test(text)) return false;
        return true;
    }

    function collectNodes(root) {
        root = root || document;
        var candidates = root.querySelectorAll('[data-i18n], [data-bind]');
        return Array.prototype.filter.call(candidates, isEligible);
    }

    function collectPlaceholders(root) {
        root = root || document;
        return Array.prototype.slice.call(root.querySelectorAll('[data-i18n-placeholder]'));
    }

    var originals = new WeakMap();
    var originalPlaceholders = new WeakMap();

    function snapshotOriginals(nodes) {
        nodes.forEach(function (el) {
            var text = (el.textContent || '').trim();
            if (text) originals.set(el, text);
        });
    }

    function snapshotPlaceholders(nodes) {
        nodes.forEach(function (el) {
            var ph = el.getAttribute('placeholder') || '';
            if (ph) originalPlaceholders.set(el, ph);
        });
    }

    function setBusy(isBusy) {
        try {
            document.dispatchEvent(new CustomEvent('vip-i18n:loading', { detail: isBusy }));
        } catch (e) { /* older browsers without CustomEvent(detail) support, ignore */ }
        document.querySelectorAll('[data-einvite-langswitch]').forEach(function (el) {
            el.classList.toggle('vip-i18n-busy', !!isBusy);
        });
    }

    async function translateBatch(strings) {
        var unique = [];
        var seen = {};
        strings.forEach(function (s) {
            if (s && !seen[s]) { seen[s] = true; unique.push(s); }
        });
        if (!unique.length) return {};

        var res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texts: unique, target: 'en' })
        });
        if (!res.ok) throw new Error('vip-i18n: translate request failed (' + res.status + ')');
        var data = await res.json();
        if (!data || !Array.isArray(data.translations)) throw new Error('vip-i18n: bad translate response');

        var map = {};
        unique.forEach(function (s, i) { map[s] = data.translations[i] || s; });
        return map;
    }

    var currentLang = 'ar';
    var pending = null; // in-flight translate promise, so rapid toggling doesn't fire duplicate requests

    async function applyLang(lang) {
        var nodes = collectNodes();
        var placeholders = collectPlaceholders();
        snapshotOriginals(nodes);
        snapshotPlaceholders(placeholders);

        if (lang !== 'en') {
            nodes.forEach(function (el) {
                var src = originals.get(el);
                if (src != null) el.textContent = src;
            });
            placeholders.forEach(function (el) {
                var src = originalPlaceholders.get(el);
                if (src != null) el.setAttribute('placeholder', src);
            });
            document.documentElement.lang = 'ar';
            document.documentElement.dir = 'rtl';
            currentLang = 'ar';
            refreshSwitcherUI();
            try { localStorage.setItem(LANG_KEY, 'ar'); } catch (e) {}
            return;
        }

        var cache = loadCache();
        var missing = [];
        nodes.forEach(function (el) {
            var src = originals.get(el);
            if (src && !cache[src]) missing.push(src);
        });
        placeholders.forEach(function (el) {
            var src = originalPlaceholders.get(el);
            if (src && !cache[src]) missing.push(src);
        });

        if (missing.length) {
            if (!pending) {
                setBusy(true);
                pending = translateBatch(missing)
                    .then(function (fresh) {
                        Object.assign(cache, fresh);
                        saveCache(cache);
                    })
                    .catch(function (err) {
                        console.error('[vip-i18n]', err);
                    })
                    .finally(function () {
                        setBusy(false);
                        pending = null;
                    });
            }
            await pending;
        }

        nodes.forEach(function (el) {
            var src = originals.get(el);
            if (src && cache[src]) el.textContent = cache[src];
        });
        placeholders.forEach(function (el) {
            var src = originalPlaceholders.get(el);
            if (src && cache[src]) el.setAttribute('placeholder', cache[src]);
        });
        document.documentElement.lang = 'en';
        document.documentElement.dir = 'ltr';
        currentLang = 'en';
        refreshSwitcherUI();
        try { localStorage.setItem(LANG_KEY, 'en'); } catch (e) {}
    }

    function linkLang(a) {
        var href = a.getAttribute('href') || '';
        var m = href.match(/lang=(en|ar)/i);
        if (m) return m[1].toLowerCase();
        return /en/i.test(a.textContent || '') ? 'en' : 'ar';
    }

    function wireSwitcher() {
        document.querySelectorAll('[data-einvite-langswitch] a').forEach(function (a) {
            var lang = linkLang(a);
            a.setAttribute('data-vip-lang', lang);
            a.removeAttribute('href');
            a.style.cursor = 'pointer';
            a.addEventListener('click', function (e) {
                e.preventDefault();
                applyLang(lang);
            });
        });
        refreshSwitcherUI();
    }

    function refreshSwitcherUI() {
        document.querySelectorAll('[data-einvite-langswitch] a').forEach(function (a) {
            var isActive = a.getAttribute('data-vip-lang') === currentLang;
            a.classList.toggle('active', isActive);
        });
    }

    // Whenever fresh invitation data is posted in from invite.html (initial
    // load, or a live preview update from create-invitation.html), the
    // template's own bridge re-fills `[data-bind]` elements with Arabic
    // text. If we're currently showing English, re-run the translation
    // pass on the new content shortly after so it doesn't flash Arabic.
    window.addEventListener('message', function (e) {
        if (e && e.data && e.data.type === 'vip-template-data') {
            setTimeout(function () {
                if (currentLang === 'en') applyLang('en');
            }, 80);
        }
    });

    function init() {
        wireSwitcher();
        try {
            var saved = localStorage.getItem(LANG_KEY);
            if (saved === 'en') applyLang('en');
        } catch (e) {}
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.VipI18n = {
        applyLang: applyLang,
        get currentLang() { return currentLang; }
    };
})();
