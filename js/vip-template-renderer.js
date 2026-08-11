/**
 * vip-template-renderer.js
 * ------------------------------------------------------------
 * يعرض قوالب VIP (التصاميم الكاملة تحت مجلد vip، ملفات demo-xxx.html) داخل invite.html
 * ببيانات الدعوة الحقيقية بدل بيانات الديمو الثابتة.
 *
 * كل ملف ديمو VIP يحتوي بالفعل على محرّكين مدمجين:
 *   1) vip/assets/vip-render.js — يقرأ window.invitationData ويملأ كل
 *      عنصر [data-bind]، ويكشف window.__vipRenderRefresh() لإعادة الرسم.
 *   2) سكربت "VIP Template Data Bridge" المضمّن فى نهاية كل ديمو — يستمع
 *      لرسالة postMessage من نوع "vip-template-data" ليضبط صورة الغلاف
 *      والموسيقى الخلفية، ويستدعي window.__vipRsvpHandler عند الإرسال.
 *
 * هذا الملف هو الجسر الذي كان ناقصًا: يحمّل ملف الديمو داخل iframe (نفس
 * الأصل origin، فلا مشاكل CORS)، يحقن البيانات الحقيقية فى اللحظة
 * المناسبة، ويحوّل تأكيد الحضور (RSVP) ليُخزَّن فعليًا فى Firebase بدل
 * إرساله لرابط ديمو وهمي.
 * ------------------------------------------------------------
 */
(function (global) {
    'use strict';

    function resolveTemplateUrl(templateFile) {
        var f = String(templateFile || '').replace(/\.html$/i, '');
        if (!f) return '';
        if (f.charAt(0) !== '/') f = '/' + f;
        // ?vipEmbed=1 marks this load as "inside the real invitation renderer"
        // (as opposed to someone browsing the /vip/ demo catalog directly).
        // vip-widget.js reads this flag to skip injecting the "Buy this
        // design" promo ribbon/CTA on an invitation the guest is already
        // viewing — that widget is only useful on the public demo pages.
        return f + '.html?vipEmbed=1';
    }

    function isVipTemplate(templateFile, design) {
        if (global.UnifiedInvitationSchema) {
            return global.UnifiedInvitationSchema.isVipTemplate(templateFile, design);
        }
        var f = String(templateFile || '');
        return (design && design.isVipTemplate) || f.indexOf('vip/') === 0 || f.indexOf('/vip/') !== -1;
    }

    function normalizeData(rawData) {
        if (global.UnifiedInvitationSchema) {
            return global.UnifiedInvitationSchema.normalize(rawData);
        }
        return rawData || {};
    }

    // ---------------------------------------------------------------
    // ضبط ارتفاع الـ iframe تلقائيًا مع محتوى الصفحة (تصميم كامل بلا سكرول
    // داخلي — الصفحة الأم هي التي تسكرول).
    // ---------------------------------------------------------------
    function watchIframeHeight(iframe) {
        // Sanity cap: a real one-page invitation (many sections stacked on a
        // narrow mobile viewport) can legitimately run tens of thousands of
        // pixels tall, but nowhere near this. Purely a defensive backstop
        // against any future runaway-growth bug, not a normal ceiling.
        var MAX_HEIGHT = 100000;
        var pollTimer = null;
        var pollStartedAt = Date.now();

        // While the fullscreen "tap to open" video intro (#einvite-envelope)
        // is still showing, the page's body carries the 'env-locked' class
        // and much of its layout is sized in vh/dvh units *relative to the
        // iframe's own current height*. Measuring scrollHeight and resizing
        // the iframe during this phase used to create a runaway feedback
        // loop: growing the iframe grew the vh-based intro/hero sections,
        // which grew the measured scrollHeight, which grew the iframe again
        // — within a couple of seconds the iframe would balloon to hundreds
        // of thousands of pixels tall, leaving the intro video effectively
        // invisible (and any fixed-position widget pinned far down that
        // giant page, looking like stray unstyled text once you scrolled
        // all the way down). We now simply don't touch the iframe height
        // while the intro is locked, and let it keep the default 100vh from
        // createIframe()'s CSS until the guest actually opens the envelope.
        function isLocked(doc) {
            if (!doc) return true;
            // Keep skipping resize not just while 'env-locked' is set, but
            // for as long as the intro overlay element is still in the DOM
            // at all: finish() fades it out over ~900ms (class swaps to
            // 'gone', env-locked is removed) before actually removing it,
            // and that fixed-position, full-viewport element still feeds
            // back into scrollHeight for that whole window — resizing during
            // it reproduces the same feedback loop this guard exists to
            // prevent, just capped lower by MAX_HEIGHT instead of avoided.
            var envelope = doc.getElementById('einvite-envelope');
            if (envelope) return true;
            return !!(doc.body && doc.body.classList.contains('env-locked'));
        }

        // A second, independent source of the same feedback loop: most VIP
        // designs also use min-height:100vh on a hero/cover section *outside*
        // the intro overlay (i.e. it's still there after the intro is fully
        // gone). Any auto-resize-to-content approach is inherently circular
        // whenever the content itself contains full-viewport-height units —
        // setting the iframe taller makes 100vh taller, which can make that
        // section taller, which measures as more scrollHeight, which sets
        // the iframe taller again. Reacting to *every* layout change (which
        // is what a ResizeObserver here would do, including changes caused
        // by our own previous apply() call) turns that circularity into an
        // unbounded loop. So instead of observing for changes, we only ever
        // call apply() a small, fixed number of times — enough to settle
        // after real async events (fonts/images loading, the intro
        // finishing), never in reaction to a resize we caused ourselves.
        var applyCount = 0;
        var MAX_APPLIES = 8;
        var lastApplied = null;

        function apply() {
            if (applyCount >= MAX_APPLIES) return;
            try {
                var doc = iframe.contentDocument;
                if (!doc || !doc.documentElement) return;
                if (isLocked(doc)) return;
                var h = Math.max(
                    doc.documentElement.scrollHeight || 0,
                    doc.body ? doc.body.scrollHeight : 0
                );
                if (h <= 0) return;
                // The FIRST post-unlock measurement is taken while the
                // iframe still has its natural (viewport-matched) height, so
                // any min-height:100vh sections inside are exactly one real
                // screen tall as the design intends — this number is the
                // trustworthy, correct one. Every apply() after that resizes
                // the iframe itself, which changes what 100vh means *inside*
                // it, so a later measurement showing a much bigger number
                // isn't new content revealing itself — it's that same
                // vh-based section re-inflating to match the box we just
                // grew it to. Real late-loading content (a font or image
                // arriving after first paint) only shifts layout by a small
                // amount, so we only accept subsequent measurements that
                // grow modestly and treat any big jump as vh feedback to be
                // ignored rather than acted on.
                if (lastApplied !== null) {
                    var allowedMax = Math.max(lastApplied * 1.15, lastApplied + 800);
                    if (h > allowedMax) return;
                }
                applyCount++;
                lastApplied = Math.min(h, MAX_HEIGHT);
                iframe.style.height = lastApplied + 'px';
            } catch (e) { /* ignore cross-origin edge cases */ }
        }

        // Once the intro video/envelope finishes and the page unlocks, the
        // guest should land right at the top of the actual invitation —
        // not be left scrolled down wherever the (now-collapsing) full
        // screen intro used to be, staring at a gap that only slowly
        // fills in as apply() runs its few resize passes. So the moment
        // we detect the unlock, we scroll the iframe to the top of the
        // viewport BEFORE the height changes are applied, so any of that
        // step-wise growth happens below the fold instead of appearing as
        // a stray expanding gap.
        function scrollToTop() {
            try {
                iframe.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } catch (e) { /* ignore */ }
        }

        // Templates without an intro overlay (isLocked() always false) are
        // unaffected by this and get their real height right away. Templates
        // with an intro poll cheaply until it unlocks (guest taps to open,
        // or the video finishes), then apply the real height a couple of
        // times (layout can still shift slightly right as the overlay's
        // fade-out finishes).
        function startPolling() {
            if (pollTimer) return;
            pollTimer = setInterval(function () {
                try {
                    var doc = iframe.contentDocument;
                    if (!doc) return;
                    if (!isLocked(doc)) {
                        clearInterval(pollTimer);
                        pollTimer = null;
                        scrollToTop();
                        apply();
                        setTimeout(apply, 300);
                        setTimeout(apply, 1000);
                        return;
                    }
                    // Safety valve: never poll forever (e.g. a guest who
                    // never taps the envelope).
                    if (Date.now() - pollStartedAt > 30000) {
                        clearInterval(pollTimer);
                        pollTimer = null;
                    }
                } catch (e) { /* ignore */ }
            }, 400);
        }

        apply();
        setTimeout(apply, 300);
        setTimeout(apply, 1000);
        setTimeout(apply, 2500);
        startPolling();
        try {
            var doc = iframe.contentDocument;
            if (doc) {
                doc.addEventListener('einvite:opened', function () {
                    scrollToTop();
                    setTimeout(apply, 200);
                    setTimeout(apply, 1000);
                });
            }
        } catch (e) { /* ignore */ }
        // A real window resize (rotating the device, etc.) is a legitimate,
        // naturally-bounded reason to re-measure — it only fires on actual
        // user action, not as a side effect of our own writes.
        global.addEventListener('resize', apply);
    }

    // ---------------------------------------------------------------
    // تحويل تأكيد الحضور (RSVP) ليُخزَّن فعليًا فى Firebase بدل إرساله
    // لرابط الديمو الخارجي. نعترض الحدث فى مرحلة الالتقاط (capture)
    // حتى نسبق معالج الديمو العام (document.addEventListener('submit', ...))
    // الذي يحاول عمل fetch لرابط وهمي وهو ما كان يظهر كرسالة خطأ زائفة.
    // ---------------------------------------------------------------
    function attachRsvpHandler(iframe, data) {
        var doc = iframe.contentDocument;
        if (!doc) return;

        function findSection(el) {
            var s = el;
            while (s && s.getAttribute) {
                if (s.hasAttribute && s.hasAttribute('data-einvite-section')) return s;
                s = s.parentElement;
            }
            return null;
        }

        function submitRsvp(form) {
            if (!global.db || typeof global.db.addRSVP !== 'function') {
                console.warn('VIP RSVP: db.addRSVP غير متاح');
                return;
            }
            if (!data.invitationId) {
                console.warn('VIP RSVP: لا يوجد invitationId');
                return;
            }

            var fd = new (doc.defaultView.FormData)(form);
            var attendingRaw = fd.get('attending');
            var attending = attendingRaw ? String(attendingRaw) === 'yes' : true;

            var payload = {
                guestName: String(fd.get('name') || '').trim(),
                phone: (String(fd.get('phone_country_code') || '') + ' ' + String(fd.get('phone') || '')).trim(),
                attending: attending,
                guestsCount: parseInt(fd.get('party_size'), 10) || 1,
                message: String(fd.get('message') || '').trim()
            };

            var btn = form.querySelector('button[type="submit"]');
            var originalHtml = btn ? btn.innerHTML : '';
            if (btn) { btn.disabled = true; btn.innerHTML = 'جارٍ الإرسال…'; }

            global.db.addRSVP(data.invitationId, payload).then(function (result) {
                if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
                var section = findSection(form);
                if (result && result.success) {
                    form.style.display = 'none';
                    var successSel = attending ? '[data-rsvp-success]' : '[data-rsvp-declined]';
                    var successEl = section ? section.querySelector(successSel) : null;
                    if (successEl) {
                        successEl.removeAttribute('hidden');
                        successEl.style.display = '';
                        successEl.style.opacity = '1';
                        successEl.style.transform = 'none';
                        successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                } else if (global.db.showNotification) {
                    global.db.showNotification('تعذر إرسال تأكيد الحضور، حاول مرة أخرى', 'error');
                }
            }).catch(function (err) {
                if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
                console.error('VIP RSVP error:', err);
            });
        }

        // نكشف نفس الواجهة التي يتوقعها جسر بيانات القالب المضمّن.
        iframe.contentWindow.__vipRsvpHandler = function (form) { submitRsvp(form); };

        doc.addEventListener('submit', function (e) {
            var form = e.target && e.target.closest ? e.target.closest('[data-rsvp-form], form[action*="rsvp"]') : null;
            if (!form) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            submitRsvp(form);
        }, true);
    }

    function pushDataIntoFrame(iframe, data) {
        try {
            iframe.contentWindow.invitationData = data;
            if (typeof iframe.contentWindow.__vipRenderRefresh === 'function') {
                iframe.contentWindow.__vipRenderRefresh();
            }
        } catch (e) { /* ignore */ }

        try {
            iframe.contentWindow.postMessage({ type: 'vip-template-data', payload: data }, '*');
        } catch (e) { /* ignore */ }

        attachRsvpHandler(iframe, data);
        watchIframeHeight(iframe);
    }

    function createIframe(url) {
        var iframe = document.createElement('iframe');
        iframe.title = 'VIP Invitation Preview';
        iframe.setAttribute('scrolling', 'no');
        iframe.style.cssText = 'width:100%;min-height:100vh;border:0;display:block;background:#fff;transition:height .25s ease;';
        iframe.src = url;
        return iframe;
    }

    /**
     * يعرض القالب داخل container. يُستدعى مرارًا مع بيانات جديدة أثناء
     * المعاينة الحية من المعالج (wizard) — لو الرابط لم يتغيّر نعيد حقن
     * البيانات فقط بدل إعادة تحميل الـ iframe بالكامل (يمنع الوميض).
     */
    function render(rawData, templateFile, container) {
        if (!container) return;
        var url = resolveTemplateUrl(templateFile);
        if (!url) return;

        var data = normalizeData(rawData);
        var existing = container.querySelector('iframe[title="VIP Invitation Preview"]');

        if (existing && existing.getAttribute('data-vip-src') === url) {
            if (existing.__vipReady) {
                pushDataIntoFrame(existing, data);
            } else {
                existing.__vipPendingData = data;
            }
            return;
        }

        container.innerHTML = '';
        var iframe = createIframe(url);
        iframe.setAttribute('data-vip-src', url);
        iframe.addEventListener('load', function () {
            iframe.__vipReady = true;
            pushDataIntoFrame(iframe, iframe.__vipPendingData || data);
            iframe.__vipPendingData = null;
        });
        container.appendChild(iframe);
    }

    global.VipTemplateRenderer = {
        isVipTemplate: isVipTemplate,
        render: render
    };
})(window);
