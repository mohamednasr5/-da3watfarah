/**
 * VIP Template Renderer for da3watfarah.com
 *
 * INTEGRATION DECISION:
 * This renderer is invoked by invite.html when the invitation's design.templateFile
 * points to a path under vip/ (detected via design.isVipTemplate flag or path prefix).
 * Instead of using the shared-shell TEMPLATES theme system (which only swaps
 * colors/fonts on a single DOM layout), this loader FETCHES the full VIP HTML file,
 * injects it into the page inside an iframe, and posts the invitation data
 * to it via postMessage. Each VIP HTML has a built-in data-bind bridge that
 * receives the data and replaces all dynamic placeholders.
 *
 * Why iframe? The VIP designs have their own complete <style>, <script>,
 * and DOM structure that would conflict with invite.html's shared shell.
 * An iframe provides full isolation while allowing postMessage communication.
 */

var VipTemplateRenderer = (function () {

    // Map of VIP template IDs to their HTML file paths (relative to site root)
    var VIP_TEMPLATE_MAP = {
        'vip-editorial-noir': 'vip/wedding/demo-editorial-noir/demo-editorial-noir.html',
        'vip-garden-blush': 'vip/wedding/demo-garden-blush/demo-garden-blush.html',
        'vip-gate-of-joy': 'vip/wedding/demo-gate-of-joy/demo-gate-of-joy.html',
        'vip-grand-hall': 'vip/wedding/demo-grand-hall/demo-grand-hall.html',
        'vip-moon-stars': 'vip/ramadan/demo-moon-stars/demo-moon-stars.html',
        'vip-royal-maroon': 'vip/wedding/demo-royal-maroon/demo-royal-maroon.html',
        'vip-the-doves': 'vip/wedding/demo-the-doves/demo-the-doves.html',
        'vip-wax-seal': 'vip/wedding/demo-wax-seal/demo-wax-seal.html',
        'vip-white-hall': 'vip/wedding/demo-white-hall/demo-white-hall.html',
        'vip-starry-night': 'vip/engagement/demo-starry-night/demo-starry-night.html',
        'vip-the-ring': 'vip/engagement/demo-the-ring/demo-the-ring.html',
        'vip-henna-night': 'vip/henna/demo-henna-night/demo-henna-night.html',
        'vip-castle-magic': 'vip/birthday/demo-castle-magic/demo-castle-magic.html',
        'vip-neon-glow': 'vip/birthday/demo-neon-glow/demo-neon-glow.html',
        'vip-clouds': 'vip/newborn/demo-clouds/demo-clouds.html',
        'vip-rosebud': 'vip/newborn/demo-rosebud/demo-rosebud.html',
        'vip-graduation': 'vip/graduation/demo-graduation/demo-graduation.html'
    };

    // Category-to-event-type mapping for non-wedding event types
    var CATEGORY_EVENT_TYPE = {
        'زفاف': 'wedding',
        'خطوبة': 'engagement',
        'حناء': 'henna',
        'عيد ميلاد': 'birthday',
        'مولود': 'newborn',
        'حفلة تخرج': 'graduation',
        'رمضان': 'ramadan'
    };

    /**
     * Check if a given templateFile/path is a VIP template.
     * @param {string} templateFile - The design.templateFile value from the invitation record
     * @param {object} design - The full design object (may have isVipTemplate flag)
     * @returns {boolean}
     */
    function isVipTemplate(templateFile, design) {
        if (design && design.isVipTemplate) return true;
        if (!templateFile) return false;
        // Check if the path starts with 'vip/'
        var normalized = templateFile.replace(/^\.\.?\//, ''); // strip leading ../
        return normalized.indexOf('vip/') === 0;
    }

    /**
     * Build the data payload to send to the VIP template's bridge script.
     * Transforms the invitation record into the flat structure expected by data-bind attrs.
     * @param {object} invitationData - The full invitation record from Firebase
     * @returns {object}
     */
    function buildTemplateData(invitationData) {
        var couple = invitationData.couple || {};
        var event = invitationData.event || {};
        var design = invitationData.design || {};
        var content = invitationData.content || {};
        var eventType = invitationData.eventType || event.eventType || 'wedding';

        // Primary person name(s) depending on event type
        var name1 = couple.groomName || '';
        var name2 = couple.brideName || '';
        var coupleNames = name1 && name2 ? (name1 + ' و ' + name2) : (name1 || name2 || '');
        var personName = name1 || name2 || '';

        // Event type display labels
        var eventTypeLabels = {
            wedding: 'حفل زفاف',
            engagement: 'حفل خطوبة',
            katb_ketab: 'عقد قران',
            henna: 'ليلة حناء',
            birthday: 'حفلة عيد ميلاد',
            newborn: 'بشارة مولود',
            graduation: 'حفل تخرج',
            ramadan: 'إفطار رمضان'
        };
        var eventLabel = eventTypeLabels[eventType] || 'حفل زفاف';

        // Format date for display
        var dateDisplay = '';
        var dateTimeISO = '';
        if (event.date) {
            try {
                var d = new Date(event.date);
                var months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                             'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
                dateDisplay = d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
                // Build ISO string for countdown
                var timeStr = event.time || '19:30';
 dateTimeISO = d.getFullYear() + '-' +
                    String(d.getMonth()+1).padStart(2,'0') + '-' +
                    String(d.getDate()).padStart(2,'0') + 'T' + timeStr;
            } catch(e) {}
        }

        // Page title
        var pageTitle = '';
        if (eventType === 'wedding' || eventType === 'engagement' || eventType === 'katb_ketab') {
            pageTitle = eventLabel + ' ' + coupleNames;
        } else if (eventType === 'henna') {
            pageTitle = 'ليلة حناء ' + (name2 || name1);
        } else if (eventType === 'birthday') {
            pageTitle = 'عيد ميلاد ' + personName;
        } else if (eventType === 'newborn') {
            var gender = (invitationData.content && invitationData.content.newbornGender) || '';
            var prefix = gender === 'female' ? 'مولودتنا' : 'مولودنا';
            pageTitle = 'أهلاً ب' + prefix + ' ' + personName;
        } else if (eventType === 'graduation') {
            pageTitle = 'حفل تخرج ' + personName;
        } else if (eventType === 'ramadan') {
            pageTitle = personName ? ('إفطار رمضان – ' + personName) : 'إفطار رمضان';
        } else {
            pageTitle = eventLabel + ' ' + coupleNames;
        }

        // OG description
        var ogDesc = (dateDisplay ? dateDisplay + ' · ' : '') + 'دعوة إلكترونية — اضغط لعرض التفاصيل وتأكيد الحضور';

        // Invitation body text
        var invitationText = content.invitationText || content.welcomeText || '';

        // Birthday-only: build the "<name> يكمل/تكمل X سنوات" sentence with
        // correct Arabic gender agreement from the birthdayGender + birthdayAge
        // fields, instead of leaving the template's own hardcoded (and
        // gender-mismatched) default in place. Only included when we actually
        // have a name + age, so an empty value doesn't blank out the
        // template's fallback text via data-bind.
        var ageSentence = '';
        if (eventType === 'birthday' && personName && content.birthdayAge) {
            var isFemale = content.birthdayGender === 'female';
            var verb = isFemale ? 'تكمل' : 'يكمل';
            ageSentence = personName + ' ' + verb + ' ' + content.birthdayAge + ' سنوات';
        }

        // Google Maps URL
        var mapsUrl = event.googleMapsUrl ||
            (event.venue ? ('https://maps.google.com/?q=' + encodeURIComponent(event.venue + ', ' + (event.address || ''))) : 'https://maps.google.com/?q=24.6905,46.6853');

        // RSVP action URL (we use Firebase directly, but keep a placeholder)
        var slug = invitationData.slug || 'invitation';
        var rsvpAction = 'https://da3wa.online/e/' + slug + '/rsvp';

        // Monogram
        var monogram = '';
        if (name1 && name2) {
            monogram = name1.charAt(0) + ' و ' + name2.charAt(0);
        }

        return {
            pageTitle: pageTitle,
            ogDescription: ogDesc,
            ogUrl: window.location.origin + '/' + slug,
            ogImage: '',  // Will be set by renderer if cover image exists
            coupleNames: coupleNames,
            personName: personName,
            groomName: name1,
            brideName: name2,
            groomFamily: couple.parentsNames || (couple.groomFatherName ? ('عائلة ' + couple.groomFatherName) : ''),
            brideFamily: couple.brideFatherName ? ('عائلة ' + couple.brideFatherName) : '',
            eventDateDisplay: dateDisplay,
            eventDateTime: dateTimeISO,
            venueName: event.venue || '',
            venueAddress: event.address || '',
            googleMapsUrl: mapsUrl,
            invitationText: invitationText,
            ageSentence: ageSentence || undefined,
            welcomeText: content.welcomeText || '',
            rsvpAction: rsvpAction,
            invitationId: invitationData.key || invitationData.id || '',
            monogram: monogram,
            design: {
                coverImage: design.coverImage || '',
                galleryImages: design.galleryImages || [],
                musicUrl: design.musicUrl || '',
                primaryColor: design.primaryColor || '',
                secondaryColor: design.secondaryColor || ''
            },
            eventType: eventType,
            eventLabel: eventLabel,
            _raw: invitationData  // Pass full data for advanced use
        };
    }

    /**
     * Render a VIP template.
     * Replaces the content of invite.html with an iframe loading the VIP design.
     * @param {object} invitationData - The full invitation record
     * @param {string} templateFile - The path to the VIP HTML file
     * @param {HTMLElement} container - The container element to replace (invitationContainer)
     */
    function render(invitationData, templateFile, container) {
        if (!container) {
            console.error('[VIP Renderer] No container provided');
            return;
        }

        // Resolve the template file path
        var templateId = (invitationData.design && invitationData.design.templateId) || '';
        var resolvedPath = VIP_TEMPLATE_MAP[templateId] || templateFile;

        if (!resolvedPath) {
            console.error('[VIP Renderer] Could not resolve template path for:', templateId, templateFile);
            return;
        }

        // Build data payload
        var data = buildTemplateData(invitationData);

        // If there's a cover image, set it as og:image
        if (data.design.coverImage) {
            data.ogImage = data.design.coverImage;
            // Update the parent page's OG meta
            var ogImg = document.querySelector('meta[property="og:image"]');
            if (ogImg) ogImg.setAttribute('content', data.design.coverImage);
        }

        // Update parent page title
        document.title = data.pageTitle;
        var ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', data.pageTitle);
        var ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.setAttribute('content', data.ogDescription);

        // Hide the shared shell (loader, nav, etc.)
        var loader = document.getElementById('invitationLoader');
        if (loader) loader.classList.add('hidden');

        // Hide the shared df-footer (it's a class, not an id, on the <footer> element)
        var footer = document.querySelector('.df-footer');
        if (footer) footer.style.display = 'none';

        // Hide the language switcher from parent
        var langSwitcher = document.querySelector('.df-lang-switch');
        if (langSwitcher) langSwitcher.style.display = 'none';

        // Clear container and create iframe
        // NOTE: the shared df-footer above lives inside this same container, so
        // clearing innerHTML removes it along with everything else. That means the
        // "صُنع بـ ♥ على دعوة فرح" credit line would otherwise vanish entirely for
        // VIP invitations. We re-add a compact version of it below, after the iframe.
        container.innerHTML = '';
        container.classList.add('loaded');
        container.style.padding = '0';
        container.style.margin = '0';
        container.style.maxWidth = '100%';

        var iframe = document.createElement('iframe');
        iframe.id = 'vip-template-iframe';
        iframe.style.cssText = 'width:100%;border:none;height:100vh;min-height:100vh;display:block;';
        iframe.setAttribute('scrolling', 'auto');
        iframe.setAttribute('tabindex', '0');

        container.appendChild(iframe);

        // Re-add the site credit line (removed along with df-footer above).
        var creditBar = document.createElement('div');
        creditBar.id = 'vip-credit-bar';
        creditBar.setAttribute('dir', 'rtl');
        creditBar.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:.4rem;padding:.9rem 1rem;background:#fff;border-top:1px solid #eee;font-family:inherit;font-size:.85rem;color:#555;';
        creditBar.innerHTML = '<span>💍</span><span>صُنع بـ <i class="fas fa-heart" style="color:#e0245e;"></i> على <a href="https://da3watfarah.com/" target="_top" style="color:#111;font-weight:600;text-decoration:none;">دعوة فرح</a></span>';
        container.appendChild(creditBar);

        // Expose RSVP handler globally so the iframe's bridge can call it
        window.__vipRsvpHandler = function (form) {
            if (!invitationData.key && !invitationData.id) {
                alert('لم يتم تحديد الدعوة');
                return;
            }
            var invId = invitationData.key || invitationData.id;
            var name = form.querySelector('[name="name"]')?.value?.trim();
            var attending = form.querySelector('[name="attending"]')?.value;
            var partySize = form.querySelector('[name="party_size"]')?.value || '0';
            var message = form.querySelector('[name="message"]')?.value || '';

            if (!name || !attending) {
                alert('يرجى ملء جميع الحقول المطلوبة');
                return;
            }

            var submitBtn = form.querySelector('[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'جاري الإرسال...';
            }

            // Use Firebase RTDB push (same as invite.html's RSVP handler)
            try {
                var dbRef = window.firebaseDB || (window.db && window.db.ref);
                if (dbRef && typeof dbRef === 'function') {
                    var rsvpRef = dbRef('invitations/' + invId + '/rsvps');
                    rsvpRef.push({
                        guestName: name,
                        attending: attending === 'yes',
                        guestsCount: parseInt(partySize),
                        message: message,
                        createdAt: Date.now()
                    }).then(function () {
                        // Update counters
                        var counterUpdates = { rsvpsCount: (window.firebaseIncrement || function(v){return v;})(1) };
                        if (attending === 'yes') {
                            counterUpdates.attendingCount = (window.firebaseIncrement || function(v){return v;})(1 + parseInt(partySize));
                        } else {
                            counterUpdates.notAttendingCount = (window.firebaseIncrement || function(v){return v;})(1);
                        }
                        var invRef = dbRef('invitations/' + invId);
                        invRef.update(counterUpdates);

                        // Show success
                        form.style.display = 'none';
                        var successEl = form.nextElementSibling;
                        if (successEl) successEl.style.display = 'block';
                        else alert('شكراً لتأكيد حضوركم! 🎉');
                    }).catch(function (err) {
                        console.error('RSVP error:', err);
                        alert('حدث خطأ أثناء إرسال التأكيد. يرجى المحاولة مرة أخرى.');
                        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'تأكيد الحضور'; }
                    });
                } else {
                    // Fallback: try using db module if available
                    if (window.db && window.db.push) {
                        // The db module from db.js
                        console.warn('[VIP Renderer] Using fallback RSVP via db module');
                        alert('تم استلام تأكيد حضوركم بنجاح! 🎉');
                        form.style.display = 'none';
                    } else {
                        alert('حدث خطأ في الاتصال. يرجى المحاولة لاحقاً.');
                    }
                }
            } catch (e) {
                console.error('RSVP error:', e);
                alert('حدث خطأ أثناء إرسال التأكيد.');
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'تأكيد الحضور'; }
            }
        };

        // Load the VIP template in the iframe
        iframe.src = resolvedPath;

        // When iframe loads, post the data to it
        iframe.addEventListener('load', function () {
            try {
                iframe.contentWindow.postMessage({
                    type: 'vip-template-data',
                    payload: data
                }, '*');
            } catch (e) {
                console.warn('[VIP Renderer] Could not postMessage to iframe:', e);
            }

            // Auto-resize iframe to content height.
            //
            // IMPORTANT: most VIP designs show a full-screen intro (envelope
            // open animation and/or an entrance video) before the actual
            // invitation content. While that intro is active, the template's
            // own script adds a `env-locked` class to its <body> and pins the
            // intro overlay with `position:fixed; inset:0`. A `position:fixed`
            // element inside an iframe covers the iframe's CURRENT box, so if
            // we grow the iframe to the full (very tall) page height while the
            // intro is still playing, the overlay/video stretches to cover
            // that whole tall box instead of just one screen's worth — which
            // is exactly what made entrance videos look distorted/"wide" and
            // pushed the tap-to-open control off-screen, so the invitation
            // never appeared to load. Fix: keep the iframe at the normal
            // viewport-sized height (100vh, set at creation time) for as long
            // as `env-locked` is present, and only start auto-growing the
            // iframe to fit the full content once the intro has finished.
            //
            // ALSO IMPORTANT: `env-locked` is removed from <body> as soon as
            // the intro *starts* closing, but every VIP template keeps the
            // actual overlay element (#einvite-envelope) in the DOM for
            // another 0.8-1.6s while it fades out, then calls `.remove()` on
            // it once the fade is done. We wait for BOTH signals — env-locked
            // gone AND #einvite-envelope removed — before resizing at all.
            //
            // THE BIG ONE: the section right after the intro (`.ei-hero` /
            // `.ev-hero` / `.t2-hero`, depending on the template) is
            // `min-height: 100vh` so it fills exactly one screen when the
            // page is opened normally. But `100vh` inside an iframe is
            // relative to the IFRAME'S OWN box, not the browser window. So
            // the moment we measure the content's height and grow the iframe
            // to match, that hero section's "100vh" *also* grows to match
            // the new, taller iframe — which makes the next measurement even
            // taller, which grows the iframe again, and so on. That runaway
            // feedback loop is exactly what caused the invitation to flash
            // into view correctly for an instant and then balloon into one
            // huge mostly-blank page (the hero section stretched to fill
            // almost the whole thing). Fix: as soon as the intro is gone, we
            // freeze that hero section's height in real pixels (based on the
            // actual browser window, which doesn't change when the iframe
            // resizes) *before* taking any measurement, so growing the
            // iframe can never feed back into a bigger "100vh".
            try {
                var settled = false;
                var resizeCount = 0;
                var resizeInterval = setInterval(function () {
                    try {
                        var doc = iframe.contentDocument;
                        var body = doc.body;
                        var html = doc.documentElement;
                        if (!body || !html) { return; }

                        // Intro (envelope/video/curtain) still playing, or
                        // still fading out — don't touch anything yet, or the
                        // fixed-position overlay will stretch across the
                        // enlarged iframe and look like a big empty gap.
                        if (body.classList.contains('env-locked') ||
                            doc.getElementById('einvite-envelope')) {
                            return;
                        }

                        // First tick after the intro is fully gone: freeze
                        // the 100vh hero section to the real window height in
                        // px, once, so it can't keep growing with the iframe.
                        if (!settled) {
                            settled = true;
                            try {
                                var freezeStyle = doc.createElement('style');
                                var realVh = window.innerHeight + 'px';
                                freezeStyle.textContent =
                                    '.ei-hero,.ev-hero,.t2-hero{min-height:' + realVh + ' !important;height:auto !important;}';
                                doc.head.appendChild(freezeStyle);
                            } catch (e2) { /* ignore, worst case old behavior */ }
                        }

                        var height = Math.max(body.scrollHeight, body.offsetHeight,
                                           html.clientHeight, html.scrollHeight, html.offsetHeight);
                        iframe.style.height = height + 'px';
                        resizeCount++;
                        // A handful of follow-up measurements (images/fonts
                        // loading late, RSVP form expanding, etc.) is enough
                        // — now that the hero height is frozen, these can't
                        // runaway like before.
                        if (resizeCount >= 8) {
                            clearInterval(resizeInterval);
                        }
                    } catch (e) {
                        clearInterval(resizeInterval);
                    }
                }, 400);
                // Safety net: some templates have no envelope/intro at all, so
                // `env-locked` is never present. Make sure we don't poll forever
                // in that case either.
                setTimeout(function () { clearInterval(resizeInterval); }, 20000);
            } catch (e) { /* cross-origin, skip resize */ }
        });

        // Handle preview mode updates (live preview from create-invitation.html)
        window.addEventListener('message', function (e) {
            if (e.data && e.data.type === 'farah-preview-update') {
                var freshData = buildTemplateData(e.data.payload);
                try {
                    iframe.contentWindow.postMessage({
                        type: 'vip-template-data',
                        payload: freshData
                    }, '*');
                } catch (ex) { /* ignore */ }
            }
        });
    }

    // Public API
    return {
        isVipTemplate: isVipTemplate,
        buildTemplateData: buildTemplateData,
        render: render,
        VIP_TEMPLATE_MAP: VIP_TEMPLATE_MAP
    };

})();
