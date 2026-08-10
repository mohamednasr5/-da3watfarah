/**
 * unified-invitation-schema.js
 * ------------------------------------------------------------
 * يحوّل كائن الدعوة كما هو مخزّن فى Firebase (couple/event/design/content)
 * إلى الشكل المسطّح الذي يفهمه محرك عرض قوالب VIP (vip/assets/vip-render.js
 * وسكربت "VIP Template Data Bridge" المضمّن داخل كل ملف ديمو).
 *
 * لا حاجة لتعديل أي من ملفات الديمو الـ 17 أو vip-render.js — هذا الملف
 * فقط يبني جسر البيانات، ويستخدمه js/vip-template-renderer.js.
 * ------------------------------------------------------------
 */
(function (global) {
    'use strict';

    function s(val) {
        if (val === undefined || val === null) return '';
        return String(val).trim();
    }

    function toDateParts(dateValue) {
        if (!dateValue) return { date: '', time: '' };
        var d = (dateValue instanceof Date) ? dateValue : new Date(dateValue);
        if (isNaN(d.getTime())) return { date: '', time: '' };
        var pad = function (n) { return String(n).padStart(2, '0'); };
        var date = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
        var time = pad(d.getHours()) + ':' + pad(d.getMinutes());
        return { date: date, time: time };
    }

    var EVENT_LABELS = {
        wedding: 'حفل زفاف',
        engagement: 'خطوبة',
        katb_ketab: 'كتب كتاب',
        henna: 'ليلة حناء',
        birthday: 'عيد ميلاد',
        newborn: 'مولود جديد',
        graduation: 'حفل تخرج',
        ramadan: 'دعوة إفطار'
    };

    /**
     * يحوّل كائن الدعوة (raw) — بنفس الشكل الذي يحفظه create-invitation.html
     * أو يقرأه invite.html من Firebase — إلى كائن مسطّح جاهز لحقنه كـ
     * window.invitationData داخل قالب VIP.
     */
    function normalize(raw) {
        raw = raw || {};
        var couple = raw.couple || {};
        var event = raw.event || {};
        var design = raw.design || {};
        var content = raw.content || {};

        var groomName = s(couple.groomName);
        var brideName = s(couple.brideName);
        var groomFatherName = s(couple.groomFatherName);
        var brideFatherName = s(couple.brideFatherName);

        var dt = toDateParts(event.date);
        var eventType = raw.eventType || event.eventType || raw.type || 'wedding';

        // الاسم الشخصي المستخدم فى قوالب المولود/التخرج/عيد الميلاد التي
        // لا تحتوي على "عريس وعروسة" — نبني أفضل قيمة متاحة.
        var personName = groomName || brideName || s(raw.personName);

        var ageSentence = '';
        if (eventType === 'birthday' && content.birthdayAge) {
            ageSentence = 'بعمر ' + s(content.birthdayAge) + ' سنة';
        }

        var invitationText = s(content.invitationText) || s(content.welcomeText);
        var loveStory = s(content.loveStory);

        var invitationId = raw.id || raw.key || '';
        var slug = s(raw.slug);

        var coupleNames = [groomName, brideName].filter(Boolean).join(' و ') || personName;

        var eventLabel = EVENT_LABELS[eventType] || EVENT_LABELS.wedding;
        var pageTitle = coupleNames ? (eventLabel + ' ' + coupleNames) : eventLabel;
        var ogDescription = invitationText || pageTitle;
        var ogUrl = slug ? ('https://da3watfarah.com/' + slug) : '';
        var ogImage = s(design.coverImage) || 'https://da3watfarah.com/10.jpg';

        var data = {
            // أسماء وعائلات
            groomName: groomName,
            brideName: brideName,
            groomFatherName: groomFatherName,
            brideFatherName: brideFatherName,
            groomFamily: s(couple.groomFamily),
            brideFamily: s(couple.brideFamily),
            coupleNames: coupleNames,
            personName: personName,
            ageSentence: ageSentence,

            // الموعد والمكان
            weddingDate: dt.date,
            weddingTime: dt.time,
            venueName: s(event.venue),
            venueAddress: s(event.address),
            googleMapsUrl: s(event.googleMapsUrl),

            // النصوص
            invitationText: invitationText,
            loveStory: loveStory,

            // ميتاداتا الصفحة (تُستخدم لعنوان التاب ومعاينات المشاركة)
            pageTitle: pageTitle,
            ogDescription: ogDescription,
            ogUrl: ogUrl,
            ogImage: ogImage,

            // معرّفات
            invitationId: invitationId,
            slug: slug,
            eventType: eventType,

            // الوسائط (يستخدمها جسر بيانات القالب لضبط صورة الغلاف والموسيقى)
            design: {
                coverImage: s(design.coverImage),
                galleryImages: Array.isArray(design.galleryImages) ? design.galleryImages : [],
                musicUrl: s(design.musicUrl)
            }
        };

        return data;
    }

    /**
     * هل هذا القالب من قوالب VIP (تصميمات كاملة تحت vip/) وليس مجرد
     * ثيم لوني من TEMPLATES_CONFIG العادية؟
     */
    function isVipTemplate(templateFile, design) {
        if (design && design.isVipTemplate) return true;
        var f = String(templateFile || '');
        return f.indexOf('vip/') === 0 || f.indexOf('/vip/') !== -1;
    }

    global.UnifiedInvitationSchema = {
        normalize: normalize,
        isVipTemplate: isVipTemplate
    };
})(window);
