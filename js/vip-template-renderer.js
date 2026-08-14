/*!
 * VIP Template Renderer
 * =======================================================================
 * Two responsibilities:
 *
 * 1) Standalone data-bind runner (window.vipRenderInvitation)
 *    Used when a vip/**\/*.html file is opened directly and already has
 *    window.invitationData (or a <script id="vip-invitation-data"> JSON
 *    blob) embedded in its own markup. Walks every [data-bind] element and
 *    fills it in, plus renders the optional "love story" timeline.
 *
 * 2) window.VipTemplateRenderer.isVipTemplate() / .render()
 *    THIS IS THE PIECE invite.html ACTUALLY CALLS (from both the live
 *    preview in create-invitation.html and the real published page) and
 *    that was previously missing from this file entirely. Because
 *    `typeof VipTemplateRenderer` was always "undefined", invite.html's
 *    "if (VipTemplateRenderer.isVipTemplate(...)) { ...render VIP... }"
 *    check never ran — so no matter which premium/VIP template someone
 *    picked, invite.html silently fell back to its own generic classic
 *    layout (the "double rings" look). That is the bug this file fixes.
 *
 *    render() fetches the chosen template's own full HTML file, fills in
 *    the couple/event/content data directly in the parsed markup (via
 *    DOMParser, BEFORE the page is ever displayed — this matters because
 *    several VIP templates start their own countdown timer the instant
 *    their inline <script> runs, reading whatever is already baked into
 *    the data-countdown attribute at that point), points a <base> tag at
 *    the template's own folder so its relative images/video keep working,
 *    wires its RSVP form to this site's real Firebase database, and shows
 *    the result full-screen in an <iframe srcdoc="...">.
 * =======================================================================
 */
(function () {
    'use strict';

    // -----------------------------------------------------------------
    // Shared helpers
    // -----------------------------------------------------------------
    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // Splits a "loveStory" free-text field into the numbered timeline
    // markup every VIP template's [data-einvite-section="story"] expects.
    // Works against either the live document or an offline DOMParser
    // document — `root` decides which.
    function renderLoveStory(root, loveStory) {
        var section = root.querySelector('[data-einvite-section="story"]');
        if (!section) return;

        var list = section.querySelector('.ei-story-list');
        var text = (loveStory || '').trim();

        if (!text) {
            if (list) {
                list.style.display = 'none';
                list.setAttribute('aria-hidden', 'true');
            }
            var qn = root.querySelector('[data-qn-target="story"]');
            if (qn) qn.style.display = 'none';
            return;
        }
        if (!list) return;

        var paragraphs = text.split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean);
        var items = paragraphs.map(function (paragraph, index) {
            var lines = paragraph.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
            var title = '';
            var body = paragraph;
            if (lines.length > 1 && lines[0].length <= 40) {
                title = lines[0];
                body = lines.slice(1).join(' ');
            }
            return { num: String(index + 1).padStart(2, '0'), title: title, body: body };
        });

        list.innerHTML = items.map(function (item) {
            return '<div class="ei-story-item ei-reveal is-in">' +
                '<div class="ei-story-num" aria-hidden="true">' + item.num + '</div>' +
                '<div class="ei-story-body">' +
                (item.title ? '<h3>' + escapeHtml(item.title) + '</h3>' : '') +
                '<p>' + escapeHtml(item.body) + '</p>' +
                '</div></div>';
        }).join('');
        list.style.display = '';
        list.removeAttribute('aria-hidden');
    }

    // Applies a flat { key: value } object to every [data-bind="key"]
    // element under `root`, using the right property per tag type.
    // (The previous version of this function used a JS comma-expression
    // that, for <a> tags, set href AND THEN unconditionally overwrote the
    // link's visible text with the raw bound value, and for <form> tags —
    // used by rsvpAction — never touched the `action` attribute at all,
    // just dumped the URL into the form's textContent. Both are fixed
    // below with a plain if/else per tag.)
    function bindFields(root, data, docForTitle) {
        var nodes = root.querySelectorAll('[data-bind]');
        for (var i = 0; i < nodes.length; i++) {
            var el = nodes[i];
            var key = el.getAttribute('data-bind');
            if (key === 'groomFamily' || key === 'brideFamily') continue; // handled below
            if (!(key in data)) continue;
            var value = data[key];
            if (value === null || value === undefined || value === '') continue;

            var tag = el.tagName.toLowerCase();
            if (tag === 'meta') {
                el.setAttribute('content', value);
            } else if (tag === 'input') {
                el.setAttribute('value', value);
                el.value = value;
            } else if (tag === 'title') {
                el.textContent = value;
                if (docForTitle) docForTitle.title = value;
            } else if (tag === 'a' && el.hasAttribute('href')) {
                el.setAttribute('href', value);
            } else if (tag === 'form') {
                el.setAttribute('action', value);
            } else {
                el.textContent = value;
            }

            if (key === 'eventDateTime' && el.hasAttribute('data-countdown')) {
                el.setAttribute('data-countdown', value);
            }
        }

        var groomFamilyEl = root.querySelector('[data-bind="groomFamily"]');
        var brideFamilyEl = root.querySelector('[data-bind="brideFamily"]');
        if (groomFamilyEl && data.groomFamily) groomFamilyEl.textContent = data.groomFamily;
        if (brideFamilyEl && data.brideFamily) brideFamilyEl.textContent = data.brideFamily;
    }

    // -----------------------------------------------------------------
    // 1) Standalone mode — window.vipRenderInvitation()
    // -----------------------------------------------------------------
    function getEmbeddedData() {
        if (window.invitationData && typeof window.invitationData === 'object') {
            return window.invitationData;
        }
        var el = document.getElementById('vip-invitation-data');
        if (el) {
            try {
                return JSON.parse(el.textContent);
            } catch (err) {
                console.warn('vip-render: تعذر قراءة بيانات الدعوة المضمّنة', err);
            }
        }
        return null;
    }

    function runStandaloneBinding() {
        var data = getEmbeddedData();
        if (!data) return;
        bindFields(document, data, document);
        renderLoveStory(document, data.loveStory);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runStandaloneBinding);
    } else {
        runStandaloneBinding();
    }
    window.vipRenderInvitation = runStandaloneBinding;

    // -----------------------------------------------------------------
    // 2) window.VipTemplateRenderer — used by invite.html
    // -----------------------------------------------------------------

    // Kept identical to the copy in invite.html's own <script type="module">
    // so a VIP template's RSVP form writes to the exact same database this
    // site already uses for every other (non-VIP) template.
    var FIREBASE_CONFIG = {
        apiKey: 'AIzaSyAIyJ_oZdA1VGDMfKwCUfQwdO5ZOoQy2DQ',
        authDomain: 'da3watfarah.firebaseapp.com',
        databaseURL: 'https://da3watfarah-default-rtdb.firebaseio.com',
        projectId: 'da3watfarah',
        storageBucket: 'da3watfarah.firebasestorage.app',
        messagingSenderId: '818147201311',
        appId: '1:818147201311:web:cb83942913bc2d6a86e02a',
        measurementId: 'G-J9D7R961V7'
    };

    var SINGLE_PERSON_EVENT_TYPES = ['birthday', 'newborn', 'graduation', 'ramadan'];

    function isVipTemplate(templateFile, design) {
        if (design && design.isVipTemplate) return true;
        if (!templateFile) return false;
        return /(^|\/)vip\//i.test(String(templateFile));
    }

    function pad2(n) { return String(n).padStart(2, '0'); }

    function formatArabicDate(ts) {
        if (!ts) return '';
        try {
            return new Date(ts).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch (err) {
            return '';
        }
    }

    // Builds the flat { key: value } map every VIP template's data-bind
    // attributes expect, from the same nested { couple, event, design,
    // content } invitation shape used everywhere else on the site.
    function buildBindData(data) {
        var couple = data.couple || {};
        var event = data.event || {};
        var design = data.design || {};
        var content = data.content || {};

        var groomName = couple.groomName || data.groomName || '';
        var brideName = couple.brideName || data.brideName || '';
        var eventType = event.eventType || data.eventType || 'wedding';
        var isSingle = SINGLE_PERSON_EVENT_TYPES.indexOf(eventType) !== -1;

        var personName = isSingle ? groomName : '';
        var coupleNames = !isSingle
            ? (groomName && brideName ? (groomName + ' و ' + brideName) : (groomName || brideName))
            : '';

        var eventDate = event.date || data.eventDate || null;
        var eventTime = event.time || data.eventTime || '';
        var eventDateTime = '';
        if (eventDate) {
            var d = new Date(eventDate);
            if (eventTime && /^\d{1,2}:\d{2}/.test(eventTime)) {
                var parts = eventTime.split(':');
                d.setHours(parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0, 0, 0);
            }
            eventDateTime = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
                'T' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
        }

        var ageSentence = '';
        if (eventType === 'birthday' && content.birthdayAge) {
            ageSentence = (personName || 'صاحب المناسبة') + ' يكمل ' + content.birthdayAge + ' سنوات';
        } else if (eventType === 'newborn') {
            ageSentence = content.newbornGender === 'female' ? 'مبروك المولودة الجديدة' : 'مبروك المولود الجديد';
        } else if (eventType === 'graduation') {
            ageSentence = (personName ? personName + ' - ' : '') + 'حفل تخرج';
        }

        var coverImage = design.coverImage || data.coverImage || data.coverImageUrl || '';
        var slug = data.slug || '';
        var pageUrl = slug ? ('https://da3watfarah.com/' + slug) : (window.location.href || '');
        var pageTitle = (document.title || personName || coupleNames || 'دعوة').trim();
        var invitationId = data.key || data.id || '';

        return {
            pageTitle: pageTitle,
            ogTitle: pageTitle,
            ogDescription: content.invitationText || data.invitationText || '',
            ogUrl: pageUrl,
            ogImage: coverImage || (window.location.origin + '/api/og/' + encodeURIComponent(slug) + '.png'),
            personName: personName,
            groomName: groomName,
            brideName: brideName,
            groomInitial: groomName ? groomName.trim().charAt(0) : '',
            brideInitial: brideName ? brideName.trim().charAt(0) : '',
            coupleNames: coupleNames,
            groomFamily: couple.groomFatherName || '',
            brideFamily: couple.brideFatherName || '',
            ageSentence: ageSentence,
            invitationText: content.invitationText || data.invitationText || '',
            loveStory: content.loveStory || data.loveStory || '',
            eventDateTime: eventDateTime,
            eventDateDisplay: formatArabicDate(eventDate),
            venueName: event.venue || data.venueName || '',
            venueAddress: event.address || data.venueAddress || '',
            googleMapsUrl: event.googleMapsUrl || data.googleMapsUrl || '',
            invitationId: invitationId
        };
    }

    // 'vip/wedding/demo-royal-maroon/demo-royal-maroon' -> 'vip/wedding/demo-royal-maroon/'
    function directoryOf(templateFile) {
        var clean = String(templateFile || '').replace(/\.html$/i, '');
        var idx = clean.lastIndexOf('/');
        return idx === -1 ? '' : clean.slice(0, idx + 1);
    }

    // Inline <script type="module"> injected into the rendered template.
    // Intercepts the template's own RSVP form submit (which, out of the
    // box, fetch()es a placeholder URL — vip/**/demo-*.html files were
    // never wired to a real backend) and writes the response straight
    // into this invitation's real Firebase RTDB record instead, exactly
    // like every non-VIP template's RSVP form already does.
    function buildRsvpBridgeScript(invitationId) {
        var payload = {
            firebaseConfig: FIREBASE_CONFIG,
            invitationId: invitationId || ''
        };
        return '<script type="module">\n' +
            'import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";\n' +
            'import { getDatabase, ref, push, update, increment } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";\n' +
            'var CFG = ' + JSON.stringify(payload).replace(/</g, '\\u003c') + ';\n' +
            'var app = initializeApp(CFG.firebaseConfig);\n' +
            'var db = getDatabase(app);\n' +
            'var invitationId = CFG.invitationId;\n' +
            'document.addEventListener("submit", function (e) {\n' +
            '  var form = e.target && e.target.closest ? e.target.closest("[data-rsvp-form]") : null;\n' +
            '  if (!form || !invitationId) return;\n' +
            '  e.preventDefault();\n' +
            '  e.stopImmediatePropagation();\n' +
            '  var btn = form.querySelector(\'button[type="submit"]\');\n' +
            '  var section = form.closest("[data-einvite-section]") || form.parentElement;\n' +
            '  var attendingInput = form.querySelector(\'[name="attending"]:checked\');\n' +
            '  var declined = attendingInput ? attendingInput.value !== "yes" : false;\n' +
            '  var nameInput = form.querySelector(\'[name="name"]\');\n' +
            '  var name = nameInput ? nameInput.value.trim() : "";\n' +
            '  var guestsInput = form.querySelector(\'[name="guests"], [name="guestsCount"]\');\n' +
            '  var guestsCount = guestsInput ? (parseInt(guestsInput.value, 10) || 0) : 0;\n' +
            '  if (!name) { if (nameInput) nameInput.focus(); return; }\n' +
            '  var origHtml = btn ? btn.innerHTML : "";\n' +
            '  if (btn) { btn.disabled = true; }\n' +
            '  push(ref(db, "invitations/" + invitationId + "/rsvps"), {\n' +
            '    guestName: name,\n' +
            '    attending: !declined,\n' +
            '    guestsCount: guestsCount,\n' +
            '    createdAt: Date.now()\n' +
            '  }).then(function () {\n' +
            '    var counterUpdates = { rsvpsCount: increment(1) };\n' +
            '    if (!declined) { counterUpdates.attendingCount = increment(1 + guestsCount); }\n' +
            '    else { counterUpdates.notAttendingCount = increment(1); }\n' +
            '    update(ref(db, "invitations/" + invitationId), counterUpdates).catch(function () {});\n' +
            '    form.style.display = "none";\n' +
            '    var outcome = section ? section.querySelector(declined ? "[data-rsvp-declined]" : "[data-rsvp-success]") : null;\n' +
            '    if (outcome) {\n' +
            '      outcome.removeAttribute("hidden");\n' +
            '      outcome.style.display = "";\n' +
            '      outcome.style.opacity = "1";\n' +
            '      outcome.style.transform = "none";\n' +
            '      outcome.scrollIntoView({ behavior: "smooth", block: "center" });\n' +
            '    }\n' +
            '  }).catch(function (err) {\n' +
            '    console.error("VIP RSVP submit failed:", err);\n' +
            '    if (btn) { btn.disabled = false; btn.innerHTML = origHtml; }\n' +
            '    alert("حدث خطأ أثناء إرسال تأكيد الحضور، برجاء المحاولة مرة أخرى.");\n' +
            '  });\n' +
            '}, true);\n' +
            '</' + 'script>';
    }

    function showRenderError(container, loader) {
        if (loader) loader.classList.add('hidden');
        if (!container) return;
        container.innerHTML =
            '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;' +
            'background:#111;color:#fff;font-family:sans-serif;text-align:center;padding:2rem;">' +
            '<p>تعذر تحميل هذا القالب المميز حالياً، برجاء تحديث الصفحة أو المحاولة لاحقاً.</p></div>';
    }

    // Fetches the chosen VIP template's raw HTML, fills in the real
    // invitation data (via an OFFLINE DOMParser document, so every field —
    // including the countdown target date each template reads the instant
    // its own inline <script> runs — is already correct BEFORE the
    // template is ever actually parsed/executed for real), and displays
    // the result full-screen in an iframe.
    function render(data, templateFile, container) {
        if (!container) return;

        var cleanFile = String(templateFile || '').replace(/\.html$/i, '').replace(/^\/+/, '');
        var fetchUrl = '/' + cleanFile + '.html';
        var baseHref = '/' + directoryOf(cleanFile);
        var bindData = buildBindData(data);
        var loader = document.getElementById('invitationLoader');

        container.innerHTML = '';
        var wrap = document.createElement('div');
        wrap.style.cssText = 'position:fixed;inset:0;z-index:1;background:#000;';
        var iframe = document.createElement('iframe');
        iframe.setAttribute('title', bindData.pageTitle || 'invitation');
        iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;display:block;';
        wrap.appendChild(iframe);
        container.appendChild(wrap);

        fetch(fetchUrl)
            .then(function (res) {
                if (!res.ok) throw new Error('VIP template not found: ' + fetchUrl + ' (' + res.status + ')');
                return res.text();
            })
            .then(function (html) {
                var doc = new DOMParser().parseFromString(html, 'text/html');

                bindFields(doc, bindData, doc);
                renderLoveStory(doc, bindData.loveStory);

                if (doc.head) {
                    var base = doc.createElement('base');
                    base.setAttribute('href', baseHref);
                    doc.head.insertBefore(base, doc.head.firstChild);
                }

                if (doc.body) {
                    doc.body.insertAdjacentHTML('beforeend', buildRsvpBridgeScript(bindData.invitationId));
                }

                var finalHtml = '<!DOCTYPE html>' + doc.documentElement.outerHTML;
                iframe.srcdoc = finalHtml;

                iframe.addEventListener('load', function () {
                    if (loader) loader.classList.add('hidden');
                    container.classList.add('loaded');
                });
            })
            .catch(function (err) {
                console.error('VipTemplateRenderer.render error:', err);
                showRenderError(container, loader);
            });
    }

    window.VipTemplateRenderer = {
        isVipTemplate: isVipTemplate,
        render: render
    };
})();
