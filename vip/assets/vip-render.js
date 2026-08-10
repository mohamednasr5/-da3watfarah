/**
 * vip-render.js
 * ------------------------------------------------------------
 * محرك موحّد يُحقن في كل صفحات قوالب VIP (17 تصميمًا) ليقوم بـ:
 *
 *  1. استبدال كل عنصر [data-bind] بالقيمة الحقيقية القادمة من
 *     window.invitationData (بدل الأسماء الثابتة الموجودة في الديمو).
 *  2. إظهار/إخفاء قسم "قصتنا" حسب وجود نص فعلي في invitationData.loveStory
 *     (لو العميل لم يكتب قصة، القسم بالكامل يُخفى تلقائيًا).
 *  3. تصحيح مشكلة تكرار نفس اسم عائلة العريس في عائلة العروس: يتم
 *     تحديد كل بطاقة عائلة عبر دورها الفعلي (العريس/العروس) بدلاً من
 *     ترتيبها في الصفحة، فلا يمكن أبدًا أن تُملأ من مصدر بيانات خاطئ.
 *
 * لا حاجة لتعديل أي كود آخر داخل ملفات الديمو الـ 17 – هذا الملف وحده
 * كافٍ. يكفي إضافة سطر واحد قبل </body> في كل ملف:
 *   <script src="/vip/assets/vip-render.js"></script>
 *
 * البيانات المتوقعة في window.invitationData (نفس الحقول التي يرسلها
 * create-invitation.html):
 *   groomName, brideName, groomFatherName, brideFatherName,
 *   groomFamily, brideFamily (اختياريان - إن غابا يُبنيان من اسم الأب),
 *   weddingDate, weddingTime, venueName, venueAddress, googleMapsUrl,
 *   invitationText, loveStory, invitationId, personName, ageSentence
 * ------------------------------------------------------------
 */
(function () {
    'use strict';

    function onReady(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // يبني اسم العائلة من اسم الأب لو ما كان محددًا صريحًا فى البيانات،
    // بحيث لا تُترك عائلة العريس/العروس فاضية أو تتكرر بالخطأ من مصدر آخر.
    function resolveFamilyName(explicitFamily, fatherName, fallback) {
        if (explicitFamily && String(explicitFamily).trim()) {
            return String(explicitFamily).trim();
        }
        if (fatherName && String(fatherName).trim()) {
            return 'عائلة ' + String(fatherName).trim();
        }
        return fallback;
    }

    function buildEventDateDisplay(data) {
        if (data.eventDateDisplay) return data.eventDateDisplay;
        if (!data.weddingDate) return null;
        try {
            const d = new Date(data.weddingDate + (data.weddingTime ? 'T' + data.weddingTime : ''));
            if (isNaN(d.getTime())) return data.weddingDate;
            return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch (e) {
            return data.weddingDate;
        }
    }

    function buildEventDateTime(data) {
        if (!data.weddingDate) return null;
        return data.weddingDate + 'T' + (data.weddingTime || '19:00');
    }

    function normalizeData(raw) {
        const data = Object.assign({}, raw || {});

        data.coupleNames = data.coupleNames ||
            [data.groomName, data.brideName].filter(Boolean).join(' و ') || null;

        // كل عائلة تُحل من حقلها الخاص فقط - أبدًا من حقل العائلة الأخرى.
        data.groomFamily = resolveFamilyName(data.groomFamily, data.groomFatherName, null);
        data.brideFamily = resolveFamilyName(data.brideFamily, data.brideFatherName, null);

        data.eventDateDisplay = buildEventDateDisplay(data);
        data.eventDateTime = data.eventDateTime || buildEventDateTime(data);

        if (data.invitationId && !data.rsvpAction) {
            data.rsvpAction = '/e/' + data.invitationId + '/rsvp';
        }

        return data;
    }

    // ---------------------------------------------------------------
    // 1) استبدال كل عناصر [data-bind] بالقيمة الحقيقية
    // ---------------------------------------------------------------
    function applyDataBindings(data) {
        const nodes = document.querySelectorAll('[data-bind]');
        nodes.forEach(function (el) {
            const key = el.getAttribute('data-bind');
            const value = data[key];

            // لا قيمة حقيقية لهذا الحقل؟ نترك نص الديمو الافتراضي كما هو
            // (data-bind-default) بدل ترك العنصر فاضيًا.
            if (value === undefined || value === null || value === '') return;

            if (el.hasAttribute('data-countdown')) {
                el.setAttribute('data-countdown', value);
                return;
            }
            if (el.tagName === 'A' && el.hasAttribute('href')) {
                el.setAttribute('href', value);
                if (el.dataset.bind === 'rsvpAction') {
                    const form = el.closest('form');
                    if (form) form.setAttribute('action', value);
                }
                return;
            }
            if (el.tagName === 'INPUT') {
                el.value = value;
                return;
            }
            if (el.tagName === 'FORM') {
                el.setAttribute('action', value);
                return;
            }
            if (el.tagName === 'META') {
                el.setAttribute('content', value);
                return;
            }
            el.textContent = value;
        });

        // الفورم الأصلي مربوط بـ data-bind على input مخفي أحيانًا فقط،
        // نضمن كذلك ضبط action الفورم مباشرة لو متوفر rsvpAction.
        if (data.rsvpAction) {
            document.querySelectorAll('form[data-rsvp-form]').forEach(function (form) {
                form.setAttribute('action', data.rsvpAction);
            });
        }
    }

    // ---------------------------------------------------------------
    // 2) قسم "قصتنا" - اختياري بالكامل
    // ---------------------------------------------------------------
    function applyLoveStory(data) {
        const section = document.querySelector('[data-einvite-section="story"]');
        if (!section) return;

        const loveStory = (data.loveStory || '').trim();

        if (!loveStory) {
            section.style.display = 'none';
            section.setAttribute('aria-hidden', 'true');
            // نخفي أيضًا رابط التنقل السريع لقسم القصة لو موجود
            document.querySelectorAll('[data-qn-target="story"]').forEach(function (btn) {
                btn.style.display = 'none';
            });
            return;
        }

        const list = section.querySelector('.ei-story-list');
        if (!list) return;

        // كل فقرة (مفصولة بسطر فاضي) تتحول لمرحلة برقمها الخاص فى القصة،
        // بدل النصوص الثابتة "اللقاء الأول / الخطوبة" الموجودة فى الديمو.
        const chapters = loveStory.split(/\n\s*\n/).map(function (c) { return c.trim(); }).filter(Boolean);

        list.innerHTML = chapters.map(function (chapter, i) {
            const num = String(i + 1).padStart(2, '0');
            return (
                '<div class="ei-story-item ei-reveal">' +
                '<div aria-hidden="true" class="ei-story-num">' + num + '</div>' +
                '<div class="ei-story-body"><p>' + escapeHtml(chapter).replace(/\n/g, '<br>') + '</p></div>' +
                '</div>'
            );
        }).join('');
    }

    // ---------------------------------------------------------------
    // 3) بطاقات العائلتين - كل بطاقة تُملأ من حقلها فقط عبر دورها الفعلي
    // ---------------------------------------------------------------
    function applyFamilies(data) {
        const cards = document.querySelectorAll('.ei-family');
        cards.forEach(function (card) {
            const roleEl = card.querySelector('.ei-family-role');
            const nameEl = card.querySelector('.ei-family-names span, .ei-family-names');
            if (!roleEl || !nameEl) return;

            const role = roleEl.textContent.trim();
            let value = null;

            if (role === 'العريس') {
                value = data.groomFamily;
            } else if (role === 'العروس') {
                value = data.brideFamily;
            }

            // لا نكتب فوق النص إلا لو عندنا قيمة حقيقية مؤكدة لهذا الدور
            // بالتحديد - هذا يمنع نهائيًا تكرار نفس اسم العائلة فى الحقلين.
            if (value) {
                nameEl.textContent = value;
            }
        });
    }

    function render() {
        if (!window.invitationData) return; // لا بيانات عميل = نترك صفحة الديمو كما هي
        const data = normalizeData(window.invitationData);
        applyDataBindings(data);
        applyFamilies(data);
        applyLoveStory(data);
    }

    onReady(render);

    // يسمح لصفحة الاستضافة الحقيقية بإعادة الرسم لو وصلت البيانات
    // بشكل غير متزامن (مثلاً بعد fetch من الـ API) عن طريق:
    //   window.invitationData = {...}; window.__vipRenderRefresh();
    window.__vipRenderRefresh = render;
})();
