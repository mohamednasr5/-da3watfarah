/* ===================================================
   دعوة فرح - VIP Demo Page Widget
   Injected into every vip/<category>/<slug>/*.html page.
   Adds:
     1) An "حصري VIP" ribbon badge
     2) A floating "أعجبتك هذه الدعوة؟" buy CTA
   Buying routes into create-invitation.html?vip=1&source=...
   which preselects the VIP publish plan and shows the
   VIP-required banner + price + pay-now flow.
   =================================================== */
(function () {
    'use strict';

    var CONFIG = {
        priceEgp: 400,
        priceSar: 500,
        priceUsd: 25,
        buyUrl: '/create-invitation.html',
        whatsappUrl: 'https://wa.me/201279934735?text=' + encodeURIComponent('أهلاً، أعجبني تصميم VIP وحابب حد يجهزه لي'),
        planStorageKey: 'da3wa_selected_plan',
        sourceStorageKey: 'da3wa_vip_source_template'
    };

    function ready(fn) {
        if (document.readyState !== 'loading') fn();
        else document.addEventListener('DOMContentLoaded', fn);
    }

    function injectCss() {
        // vip.css is already linked via a <link> tag placed next to this
        // script in each demo page; nothing to inject here. Kept as a
        // hook in case a page only includes this script.
        if (!document.querySelector('link[href*="vip.css"]')) {
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            // NOTE: document.currentScript is null by the time this runs
            // (it's only valid synchronously while the script executes,
            // not inside the deferred DOMContentLoaded callback below),
            // so it can no longer be used to derive the script's folder.
            // This script always lives at /vip/assets/vip-widget.js, so
            // the stylesheet path is hardcoded to match.
            link.href = '/vip/assets/vip.css';
            document.head.appendChild(link);
        }
    }

    function templateName() {
        var h1 = document.querySelector('.ei-hero-title, h1');
        if (h1 && h1.textContent) return h1.textContent.trim().slice(0, 80);
        return (document.title || 'هذا التصميم').trim();
    }

    function buildRibbon() {
        var ribbon = document.createElement('div');
        ribbon.className = 'vip-exclusive-ribbon';
        ribbon.innerHTML = '<span class="vip-ribbon-icon" aria-hidden="true">👑</span><span>تصميم حصري VIP</span>';
        document.body.appendChild(ribbon);
    }

    function buildWidget() {
        var wrap = document.createElement('div');
        wrap.className = 'vip-cta-widget';
        wrap.setAttribute('dir', 'rtl');
        wrap.innerHTML =
            '<button type="button" class="vip-cta-close" aria-label="إغلاق">&times;</button>' +
            '<div class="vip-cta-badge">👑 حصري VIP</div>' +
            '<h4>أعجبتك هذه الدعوة؟</h4>' +
            '<div class="vip-cta-price"><span class="num">' + CONFIG.priceEgp + '</span><span class="cur">ج.م / ' + CONFIG.priceSar + ' ر.س / $' + CONFIG.priceUsd + '</span></div>' +
            '<ul class="vip-cta-list">' +
                '<li>جاهزة خلال دقائق</li>' +
                '<li>تأكيد حضور مباشر</li>' +
                '<li>تعديل في أي وقت</li>' +
            '</ul>' +
            '<button type="button" class="vip-cta-buy">اشترِ وخصصها الآن</button>' +
            '<a class="vip-cta-wa" href="' + CONFIG.whatsappUrl + '" target="_blank" rel="noopener">تبين حد يجهزها لك؟ كلمنا واتساب</a>';

        document.body.appendChild(wrap);

        wrap.querySelector('.vip-cta-close').addEventListener('click', function () {
            wrap.classList.add('vip-cta-hidden');
        });

        wrap.querySelector('.vip-cta-buy').addEventListener('click', function () {
            var name = templateName();
            try {
                localStorage.setItem(CONFIG.planStorageKey, 'vip');
                localStorage.setItem(CONFIG.sourceStorageKey, name);
            } catch (e) {}
            var url = CONFIG.buyUrl + '?vip=1&source=' + encodeURIComponent(name);
            window.location.href = url;
        });
    }

    ready(function () {
        injectCss();
        buildRibbon();
        buildWidget();
    });
})();