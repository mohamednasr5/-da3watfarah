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
        return f + '.html';
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
        function apply() {
            try {
                var doc = iframe.contentDocument;
                if (!doc || !doc.documentElement) return;
                var h = Math.max(
                    doc.documentElement.scrollHeight || 0,
                    doc.body ? doc.body.scrollHeight : 0
                );
                if (h > 0) iframe.style.height = h + 'px';
            } catch (e) { /* ignore cross-origin edge cases */ }
        }
        apply();
        setTimeout(apply, 300);
        setTimeout(apply, 1000);
        setTimeout(apply, 2500);
        try {
            var doc = iframe.contentDocument;
            if (doc && 'ResizeObserver' in global) {
                var ro = new ResizeObserver(function () { apply(); });
                ro.observe(doc.documentElement);
                iframe.__vipResizeObserver = ro;
            }
            if (doc) {
                doc.addEventListener('einvite:opened', function () {
                    setTimeout(apply, 200);
                    setTimeout(apply, 1000);
                });
            }
        } catch (e) { /* ignore */ }
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
        iframe.style.cssText = 'width:100%;min-height:100vh;border:0;display:block;background:#fff;';
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
