/**
 * vip-render.js
 * -----------------------------------------------------------------------
 * محرك ربط موحّد لكل قوالب VIP (17 قالب داخل vip/<category>/<template>/).
 * كل قالب مبني بنظام data-bind ثابت (نص افتراضي فقط للمعاينة/الديمو).
 * هذا الملف يقرأ بيانات الدعوة الحقيقية (من invitationData أو من الـ API)
 * ويستبدل كل عنصر [data-bind] بالقيمة الفعلية، ويتحكم في إظهار/إخفاء
 * الأقسام الاختيارية (مثل "قصتنا") حسب وجود بيانات حقيقية فعلاً.
 *
 * كيف يعمل:
 * 1. يبحث عن متغير عام window.invitationData (تحقنه صفحة العرض
 *    بعد جلب بيانات الدعوة من السيرفر)، أو يقرأه من data-invitation
 *    JSON مضمّن في الصفحة (لو حابب تمرره من السيرفر مباشرة SSR-style).
 * 2. يملأ كل [data-bind="key"] بالقيمة المطابقة من البيانات.
 * 3. يخفي قسم "قصتنا" بالكامل لو لم يكتب العميل قصة.
 * 4. يصحح مشكلة "عائلة العريس والعروسة" (كل عائلة تعرض اسمها الصحيح فقط).
 */
(function () {
    'use strict';

    function getInvitationData() {
        if (window.invitationData && typeof window.invitationData === 'object') {
            return window.invitationData;
        }
        var el = document.getElementById('vip-invitation-data');
        if (el) {
            try {
                return JSON.parse(el.textContent);
            } catch (e) {
                console.warn('vip-render: تعذر قراءة بيانات الدعوة المضمّنة', e);
            }
        }
        return null;
    }

    // يبني نص "قصتنا" على شكل عناصر timeline (نفس شكل القالب الأصلي:
    // رقم + عنوان + نص)، انطلاقًا من نص واحد يكتبه العميل في حقل loveStory.
    // فصل الفقرات بسطر فاضي يولّد أكثر من مرحلة (01, 02, ...)، وأي سطر
    // أول قصير (أقل من 40 حرف) يُستخدم كعنوان للمرحلة تلقائيًا.
    function buildStoryItems(rawText) {
        var chapters = rawText
            .split(/\n\s*\n/)
            .map(function (c) { return c.trim(); })
            .filter(Boolean);

        return chapters.map(function (chapter, idx) {
            var lines = chapter.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
            var title = '';
            var body = chapter;
            if (lines.length > 1 && lines[0].length <= 40) {
                title = lines[0];
                body = lines.slice(1).join(' ');
            }
            return {
                num: String(idx + 1).padStart(2, '0'),
                title: title,
                body: body
            };
        });
    }

    function renderStorySection(data) {
        var section = document.querySelector('[data-einvite-section="story"]');
        if (!section) return;

        var raw = (data.loveStory || '').trim();
        if (!raw) {
            // لا توجد قصة حب مكتوبة -> القسم اختياري، يتم إخفاؤه بالكامل
            section.style.display = 'none';
            section.setAttribute('aria-hidden', 'true');
            // إخفاء رابط "قصتنا" من قائمة التنقل السريع إن وجدت
            var navBtn = document.querySelector('[data-qn-target="story"]');
            if (navBtn) navBtn.style.display = 'none';
            return;
        }

        var list = section.querySelector('.ei-story-list');
        if (!list) return;

        var items = buildStoryItems(raw);
        list.innerHTML = items.map(function (item) {
            return (
                '<div class="ei-story-item ei-reveal is-in">' +
                    '<div class="ei-story-num" aria-hidden="true">' + item.num + '</div>' +
                    '<div class="ei-story-body">' +
                        (item.title ? '<h3>' + escapeHtml(item.title) + '</h3>' : '') +
                        '<p>' + escapeHtml(item.body) + '</p>' +
                    '</div>' +
                '</div>'
            );
        }).join('');

        section.style.display = '';
        section.removeAttribute('aria-hidden');
    }

    // يصحح مشكلة تكرار نفس اسم العائلة في الحقلين: كل بطاقة عائلة
    // تُربط بمفتاحها الصحيح فقط (groomFamily لبطاقة العريس،
    // brideFamily لبطاقة العروس) ولا تُقرأ من مصدر واحد بالخطأ.
    function renderFamilies(data) {
        var groomEl = document.querySelector('[data-bind="groomFamily"]');
        var brideEl = document.querySelector('[data-bind="brideFamily"]');
        if (groomEl && data.groomFamily) groomEl.textContent = data.groomFamily;
        if (brideEl && data.brideFamily) brideEl.textContent = data.brideFamily;
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // الربط العام: كل [data-bind] عادي (أسماء، تواريخ، عناوين...) يُستبدل
    // بالقيمة الحقيقية المطابقة من بيانات الدعوة.
    function renderGenericBindings(data) {
        var nodes = document.querySelectorAll('[data-bind]');
        nodes.forEach(function (node) {
            var key = node.getAttribute('data-bind');
            // هذه المفاتيح تُعالج بمنطق خاص في دوال أخرى، تخطّاها هنا
            if (key === 'groomFamily' || key === 'brideFamily') return;
            if (!(key in data)) return;

            var value = data[key];
            if (value === null || value === undefined || value === '') return;

            var tag = node.tagName.toLowerCase();
            if (tag === 'a' && node.hasAttribute('href')) {
                node.setAttribute('href', value);
            }
            if (tag === 'meta') {
                node.setAttribute('content', value);
            } else if (tag === 'input') {
                node.setAttribute('value', value);
            } else if (tag === 'title') {
                node.textContent = value;
                document.title = value;
            } else {
                node.textContent = value;
            }

            // العد التنازلي: تحديث السمة data-countdown أيضًا لو الحقل هو موعد الحدث
            if (node.hasAttribute('data-countdown') && key === 'eventDateTime') {
                node.setAttribute('data-countdown', value);
            }
        });
    }

    function render() {
        var data = getInvitationData();
        if (!data) {
            // لا توجد بيانات دعوة حقيقية (مثلاً صفحة معاينة/ديمو فقط) —
            // اترك القالب كما هو بنصوصه الافتراضية دون أي تعديل.
            return;
        }
        renderGenericBindings(data);
        renderFamilies(data);
        renderStorySection(data);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', render);
    } else {
        render();
    }

    // متاح للاستدعاء اليدوي لو البيانات وصلت لاحقًا (fetch غير متزامن)
    window.vipRenderInvitation = render;
})();