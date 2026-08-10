/**
 * vip-dynamic-sections.js — da3watfarah.com
 * ============================================
 * STEP 2 of the Normal/VIP unification plan.
 *
 * Injected into all 18 VIP template pages (one <script> line before
 * </body>, same pattern already used for vip-widget.js /
 * vip-i18n.js). Listens for the SAME `vip-template-data` postMessage
 * that js/vip-template-renderer.js already sends to every VIP iframe,
 * and renders the two new/refactored optional sections requested in
 * the unification brief with IDENTICAL logic on every template:
 *
 *   - Event Schedule ("برنامج الحفل" / agenda section)
 *   - FAQ ("الأسئلة الشائعة" / faq section)
 *
 * Rules (same on every template, Normal or VIP):
 *   - payload.eventSchedule / payload.faq empty or missing -> hide
 *     the whole section.
 *   - otherwise -> render ALL items (unlimited), in `order`, using a
 *     single shared component so there is exactly one implementation
 *     instead of 18 copies.
 *
 * All 18 VIP templates share the same CSS custom properties
 * (--ei-accent, --ei-ink, --ei-soft, --ei-bg, --ei-line), confirmed
 * across every file, so the generated markup below uses those
 * variables (with safe fallbacks) to stay on-theme everywhere without
 * needing per-template styling.
 *
 * 15 of the 18 templates already have a static "agenda" section we
 * reuse (only its list contents are replaced). The 3 that don't
 * (demo-clouds, demo-rosebud, demo-wax-seal) get a section built from
 * scratch and inserted before the FAQ section, only if the customer
 * actually filled in an Event Schedule.
 */
(function () {
    'use strict';

    var STYLE_ID = 'df-dynamic-sections-style';

    function injectStyleOnce() {
        if (document.getElementById(STYLE_ID)) return;
        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = [
            '.df-schedule{padding:6rem 0;border-bottom:1px solid var(--ei-line,#e5e0d8);overflow:hidden;}',
            '.df-schedule-list{border-top:1px solid var(--ei-line,#e5e0d8);}',
            '.df-schedule-item{display:grid;grid-template-columns:110px 34px 1fr;align-items:center;gap:.6rem;padding:1.15rem 0;border-bottom:1px solid var(--ei-line,#e5e0d8);opacity:0;transform:translateY(14px);animation:dfFadeUp .6s ease forwards;}',
            '.df-schedule-time{font-weight:600;color:var(--ei-accent,#b8965a);font-variant-numeric:tabular-nums;white-space:nowrap;}',
            '.df-schedule-dot{width:9px;height:9px;border-radius:50%;background:var(--ei-accent,#b8965a);justify-self:center;position:relative;}',
            '.df-schedule-dot::after{content:"";position:absolute;inset:-5px;border-radius:50%;border:1px solid var(--ei-accent,#b8965a);opacity:.35;}',
            '.df-schedule-title{color:var(--ei-ink,#222);font-size:1.02rem;}',
            '.df-faq-list{border-top:1px solid var(--ei-line,#e5e0d8);}',
            '.df-faq-item{border-bottom:1px solid var(--ei-line,#e5e0d8);}',
            '.df-faq-item summary{display:flex;align-items:center;gap:1.2rem;cursor:pointer;list-style:none;padding:1.3rem .2rem;}',
            '.df-faq-item summary::-webkit-details-marker{display:none;}',
            '.df-faq-q{flex:1;font-weight:500;color:var(--ei-ink,#222);}',
            '.df-faq-chev{width:9px;height:9px;border-inline-end:1.5px solid var(--ei-ink,#222);border-bottom:1.5px solid var(--ei-ink,#222);transform:rotate(45deg);transition:transform .3s;flex-shrink:0;}',
            '.df-faq-item[open] .df-faq-chev{transform:rotate(225deg);}',
            '.df-faq-answer{padding:0 .2rem 1.4rem;color:var(--ei-soft,#777);line-height:1.8;max-width:62ch;}',
            '@keyframes dfFadeUp{to{opacity:1;transform:none;}}'
        ].join('');
        document.head.appendChild(style);
    }

    function normalizeAndSort(arr) {
        if (!Array.isArray(arr)) return [];
        return arr.slice().sort(function (a, b) {
            return (typeof a.order === 'number' ? a.order : 0) - (typeof b.order === 'number' ? b.order : 0);
        });
    }

    function findSection(key) {
        return document.querySelector('[data-einvite-section="' + key + '"]');
    }

    /** Find the first descendant whose class list ends in "-list" (ei-agenda-list, t2-faq-list, agenda-list, ...). */
    function findListEl(section) {
        var all = section.querySelectorAll('*');
        for (var i = 0; i < all.length; i++) {
            var cls = all[i].className;
            if (typeof cls === 'string' && /-list\b/.test(cls)) return all[i];
        }
        return null;
    }

    function buildScheduleSection() {
        var lang = document.documentElement.getAttribute('lang') === 'en' ? 'en' : 'ar';
        var titleAr = 'برنامج الحفل', titleEn = 'Program', subAr = 'الجدول الزمني', subEn = 'Schedule';
        var section = document.createElement('section');
        section.className = 'df-schedule';
        section.setAttribute('data-einvite-section', 'agenda');
        section.innerHTML =
            '<div class="ei-wrap df-wrap">' +
              '<div class="ei-shead"><h2 class="ei-heading">' + (lang === 'en' ? titleEn : titleAr) + '</h2>' +
              '<span class="ei-eyebrow">' + (lang === 'en' ? subEn : subAr) + '</span></div>' +
              '<div class="df-schedule-list"></div>' +
            '</div>';
        var faqSection = findSection('faq');
        var rsvpSection = findSection('rsvp');
        var anchor = faqSection || rsvpSection;
        if (anchor && anchor.parentNode) {
            anchor.parentNode.insertBefore(section, anchor);
        } else {
            document.body.appendChild(section);
        }
        return section;
    }

    function renderSchedule(items) {
        var arr = normalizeAndSort(items);
        var section = findSection('agenda');
        if (!arr.length) {
            if (section) section.style.display = 'none';
            return;
        }
        if (!section) section = buildScheduleSection();
        section.style.display = '';
        var listEl = findListEl(section) || section.querySelector('.df-schedule-list');
        if (!listEl) return;
        listEl.className = (listEl.className + ' df-schedule-list').trim();
        listEl.innerHTML = '';
        arr.forEach(function (item, idx) {
            var row = document.createElement('div');
            row.className = 'df-schedule-item';
            row.style.animationDelay = (idx * 0.06) + 's';
            row.innerHTML =
                '<span class="df-schedule-time">' + escapeHtml(item.time || '') + '</span>' +
                '<span class="df-schedule-dot" aria-hidden="true"></span>' +
                '<span class="df-schedule-title">' + escapeHtml(item.title || '') + '</span>';
            listEl.appendChild(row);
        });
    }

    function renderFaq(items) {
        var arr = normalizeAndSort(items);
        var section = findSection('faq');
        if (!section) return; // all 18 templates already have a faq section
        if (!arr.length) {
            section.style.display = 'none';
            return;
        }
        section.style.display = '';
        var listEl = findListEl(section);
        if (!listEl) return;
        listEl.className = (listEl.className + ' df-faq-list').trim();
        listEl.innerHTML = '';
        arr.forEach(function (item, idx) {
            var num = String(idx + 1).padStart(2, '0');
            var details = document.createElement('details');
            details.className = 'df-faq-item';
            details.innerHTML =
                '<summary><span class="ei-faq-num df-faq-num">' + num + '</span>' +
                '<span class="df-faq-q">' + escapeHtml(item.question || '') + '</span>' +
                '<i class="df-faq-chev" aria-hidden="true"></i></summary>' +
                '<p class="df-faq-answer">' + escapeHtml(item.answer || '') + '</p>';
            listEl.appendChild(details);
        });
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, function (c) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
        });
    }

    // ===================================================
    // VIP-only difference: intro/opening animation toggle.
    // Every VIP template (18/18) shares the same envelope markup
    // (#einvite-envelope / body.env-locked / .gone), confirmed across
    // all of them, so this ONE implementation handles the skip for
    // every template instead of editing each one individually.
    // Normal templates never have this element, so this is a no-op
    // there — the "everything else is identical" rule stays intact.
    // ===================================================
    function applyIntroToggle(introEnabled) {
        var envelope = document.getElementById('einvite-envelope');
        if (!envelope) return; // template has no intro (or this is a Normal template)
        if (introEnabled === false) {
            envelope.classList.add('gone');
            envelope.classList.remove('playing');
            document.body.classList.remove('env-locked');
        }
        // introEnabled !== false -> leave the template's native
        // tap-to-enter behavior untouched (default VIP experience).
    }

    function handlePayload(payload) {
        if (!payload) return;
        injectStyleOnce();
        try { renderSchedule(payload.eventSchedule); } catch (e) { console.warn('[vip-dynamic-sections] schedule', e); }
        try { renderFaq(payload.faq); } catch (e) { console.warn('[vip-dynamic-sections] faq', e); }
        try { applyIntroToggle(payload.introEnabled); } catch (e) { console.warn('[vip-dynamic-sections] intro', e); }
    }

    window.addEventListener('message', function (e) {
        if (e.data && e.data.type === 'vip-template-data') {
            handlePayload(e.data.payload);
        }
    });
})();
