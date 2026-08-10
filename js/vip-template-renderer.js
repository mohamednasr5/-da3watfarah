/**
 * js/vip-template-renderer.js
 * ------------------------------------------------------------
 * Defines window.VipTemplateRenderer, used by invite.html to decide
 * between the Normal shared-shell renderer and the VIP (full custom
 * HTML page under /vip/) renderer, and to actually render the VIP
 * template into the page.
 *
 * PREVIOUS BUG: this file never defined window.VipTemplateRenderer at
 * all — it only contained a small, unrelated snippet duplicated from
 * vip/assets/vip-render.js. Because of that, invite.html's check
 *   `typeof VipTemplateRenderer !== 'undefined' && VipTemplateRenderer.isVipTemplate(...)`
 * always evaluated to false, so EVERY VIP template silently fell
 * through to the generic Normal renderer (populateInvitationUI),
 * which is why users always saw a different/generic design regardless
 * of which VIP template they actually picked, both in the live
 * preview and after publishing.
 *
 * HOW IT WORKS
 * VIP templates are full standalone HTML pages living under /vip/.
 * We load the chosen one inside an <iframe> and feed it the visitor's
 * actual data through the same two channels each of the 18 VIP demo
 * pages already listens for (see the inline "VIP Template Data
 * Bridge" script embedded in every vip/*\/demo-*\/*.html file):
 *   1. sessionStorage['vip_template_data'] — read once, synchronously,
 *      by the bridge script as soon as it parses (most reliable for
 *      first paint, no race with the iframe's own load timing).
 *   2. window.postMessage({ type: 'vip-template-data', payload }) —
 *      used for the initial load as a safety net, and for every
 *      subsequent live-preview update while the user keeps typing.
 *
 * The invitation record saved by create-invitation.html is nested
 * (couple.*, event.*, design.*, content.*, vip.*), but the VIP demo
 * pages' [data-bind] elements expect a FLAT legacy shape (groomName,
 * weddingDate, venueName, ...). flattenInvitationData() below is the
 * bridge between the two shapes.
 * ------------------------------------------------------------
 */
(function () {
    'use strict';

    var SINGLE_PERSON_EVENT_TYPES = ['birthday', 'newborn', 'graduation', 'ramadan'];

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function familyFromFather(fatherName) {
        var f = (fatherName || '').trim();
        return f ? ('عائلة ' + f) : '';
    }

    // event.date can arrive as a timestamp (ms, from the wizard's
    // `new Date(...).getTime()`) or already as a string — normalize to
    // a plain YYYY-MM-DD string the way vip/assets/vip-render.js expects.
    function normalizeDateValue(rawDate) {
        if (!rawDate) return null;
        if (typeof rawDate === 'number') {
            var d = new Date(rawDate);
            if (isNaN(d.getTime())) return null;
            return d.toISOString().slice(0, 10);
        }
        return String(rawDate);
    }

    function buildEventDateDisplay(weddingDate, weddingTime) {
        if (!weddingDate) return null;
        try {
            var d = new Date(weddingDate + (weddingTime ? 'T' + weddingTime : ''));
            if (isNaN(d.getTime())) return weddingDate;
            return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch (e) {
            return weddingDate;
        }
    }

    // Converts the nested record shape (couple/event/design/content/vip)
    // used by create-invitation.html and the database into the flat
    // shape the VIP demo pages' [data-bind] elements read.
    function flattenInvitationData(raw) {
        var data = raw || {};
        var couple = data.couple || {};
        var event = data.event || {};
        var design = data.design || {};
        var content = data.content || {};
        var vip = data.vip || {};

        var eventType = event.eventType || data.eventType || 'wedding';
        var isSinglePerson = SINGLE_PERSON_EVENT_TYPES.indexOf(eventType) !== -1;

        // For single-person occasions (birthday, newborn, graduation,
        // ramadan) the wizard reuses the #groomName field as the
        // "person / host" name field — see create-invitation.html's
        // applyEventTypeFieldLabels().
        var groomName = couple.groomName || data.groomName || '';
        var brideName = couple.brideName || data.brideName || '';
        var groomFatherName = couple.groomFatherName || data.groomFatherName || '';
        var brideFatherName = couple.brideFatherName || data.brideFatherName || '';

        var weddingDate = normalizeDateValue(event.date || data.weddingDate);
        var weddingTime = event.time || data.weddingTime || '';
        var eventDateTime = weddingDate ? (weddingDate + 'T' + (weddingTime || '19:00')) : null;
        var eventDateDisplay = buildEventDateDisplay(weddingDate, weddingTime);

        var invitationId = data.slug || data.id || data.key || '';

        var ageSentence = '';
        if (content.birthdayAge) {
            var possessive = content.birthdayGender === 'female' ? 'عامها' : 'عامه';
            ageSentence = 'في ' + possessive + ' الـ ' + content.birthdayAge;
        }

        var personName = isSinglePerson ? groomName : '';
        var coupleNames = [groomName, brideName].filter(Boolean).join(' و ');

        return {
            groomName: groomName,
            brideName: brideName,
            groomFatherName: groomFatherName,
            brideFatherName: brideFatherName,
            groomFamily: familyFromFather(groomFatherName),
            brideFamily: familyFromFather(brideFatherName),
            groomInitial: groomName ? groomName.trim().charAt(0) : '',
            brideInitial: brideName ? brideName.trim().charAt(0) : '',
            coupleNames: coupleNames,
            weddingDate: weddingDate,
            weddingTime: weddingTime,
            eventDateDisplay: eventDateDisplay,
            eventDateTime: eventDateTime,
            venueName: event.venue || '',
            venueAddress: event.address || '',
            googleMapsUrl: event.googleMapsUrl || '',
            invitationText: content.invitationText || '',
            loveStory: content.loveStory || '',
            welcomeText: content.welcomeText || '',
            personName: personName,
            ageSentence: ageSentence,
            invitationId: invitationId,
            rsvpAction: invitationId ? ('/e/' + invitationId + '/rsvp') : '',
            pageTitle: coupleNames || personName || 'دعوة',
            ogDescription: content.invitationText || content.welcomeText || '',
            ogImage: design.coverImage || '',
            ogUrl: (typeof window !== 'undefined' && window.location)
                ? (window.location.origin + '/e/' + invitationId)
                : '',
            design: {
                coverImage: design.coverImage || '',
                galleryImages: design.galleryImages || [],
                musicUrl: design.musicUrl || ''
            },
            eventSchedule: data.eventSchedule || [],
            faq: data.faq || [],
            // Step 4's design intent (see STEP4-CHANGES-README.md): default
            // to true (old records without this field keep the original
            // "tap to enter" behaviour) unless explicitly disabled.
            introEnabled: vip.introEnabled === false ? false : true
        };
    }

    // A template counts as VIP if the wizard marked it as such, or its
    // file path lives under /vip/ — belt-and-braces since both the
    // preview and publish payloads set design.isVipTemplate already.
    function isVipTemplate(templateFile, design) {
        if (design && (design.isVipTemplate === true || design.isVip === true)) {
            return true;
        }
        return typeof templateFile === 'string' && /(^|\/)vip\//.test(templateFile);
    }

    // The wizard strips the .html extension off templateFile before
    // saving it (see create-invitation.html buildPreviewData /
    // publishInvitation), so restore it here — otherwise the iframe
    // would request a path that doesn't exist and silently fail to load.
    function resolveTemplateSrc(templateFile) {
        var src = String(templateFile || '').trim();
        if (!src) return '';
        if (!/\.html?$/i.test(src)) src += '.html';
        if (!/^https?:\/\//i.test(src) && src.charAt(0) !== '/') src = '/' + src;
        return src;
    }

    function sendPayload(iframe, payload) {
        if (!iframe || !iframe.contentWindow) return;
        try {
            iframe.contentWindow.postMessage({ type: 'vip-template-data', payload: payload }, '*');
        } catch (e) {
            console.warn('VipTemplateRenderer: postMessage failed', e);
        }
        // Also set window.invitationData directly + trigger a re-render if
        // the page already ran vip-render.js's own DOMContentLoaded pass
        // (covers the rare case where our message arrives after that).
        try {
            iframe.contentWindow.invitationData = payload;
            if (typeof iframe.contentWindow.__vipRenderRefresh === 'function') {
                iframe.contentWindow.__vipRenderRefresh();
            }
        } catch (e) {
            // Cross-origin or iframe not ready yet — safe to ignore, the
            // postMessage above (or the sessionStorage bridge) still covers it.
        }
    }

    var activeIframe = null;
    var activeSrc = null;

    function render(data, templateFile, container) {
        if (!container) return;

        var src = resolveTemplateSrc(templateFile);
        var payload = flattenInvitationData(data);

        // Same VIP template already mounted (e.g. the user is just typing
        // in the wizard) — push fresh data instead of tearing the iframe
        // down and reloading it, so the live preview stays smooth.
        if (activeIframe && activeSrc === src && container.contains(activeIframe)) {
            try {
                sessionStorage.setItem('vip_template_data', JSON.stringify(payload));
            } catch (e) { /* ignore quota errors */ }
            sendPayload(activeIframe, payload);
            return;
        }

        container.innerHTML = '';

        var iframe = document.createElement('iframe');
        iframe.setAttribute('title', 'VIP Invitation Preview');
        iframe.setAttribute('scrolling', 'yes');
        iframe.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;margin:0;padding:0;background:#0a0a0a;';

        try {
            sessionStorage.setItem('vip_template_data', JSON.stringify(payload));
        } catch (e) { /* ignore quota errors */ }

        iframe.addEventListener('load', function () {
            sendPayload(iframe, payload);
            // Small safety-net resend in case the demo page's own bridge
            // script hadn't registered its message listener yet at 'load'.
            setTimeout(function () { sendPayload(iframe, payload); }, 60);
        });

        iframe.src = src;
        container.appendChild(iframe);

        activeIframe = iframe;
        activeSrc = src;
    }

    // Pushes fresh data into the currently-rendered VIP iframe (used by
    // invite.html's live-preview postMessage handler while the visitor
    // keeps editing the wizard) without recreating it.
    function update(data) {
        if (!activeIframe) return false;
        var payload = flattenInvitationData(data);
        try {
            sessionStorage.setItem('vip_template_data', JSON.stringify(payload));
        } catch (e) { /* ignore quota errors */ }
        sendPayload(activeIframe, payload);
        return true;
    }

    window.VipTemplateRenderer = {
        isVipTemplate: isVipTemplate,
        render: render,
        update: update,
        flattenInvitationData: flattenInvitationData
    };
})();
