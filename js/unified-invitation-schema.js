/**
 * Unified Invitation Schema — da3watfarah.com
 * =============================================
 * STEP 1 of the Normal/VIP unification plan.
 *
 * Purpose
 * -------
 * Defines ONE canonical data shape that every invitation document
 * (Normal or VIP, any event type) must be saved and read as, plus a
 * `migrateInvitation()` function that converts:
 *   1) legacy "Normal" invitation docs (old flat field names used by
 *      create-invitation.html / js/invitation.js), and
 *   2) the VIP `data-bind` field names used by the 17 static VIP demo
 *      pages (see js/template-field-manifests.js),
 * into this single schema, without needing to touch already-saved
 * Firebase documents. Old documents keep working because every reader
 * (js/invitation.js, js/vip-template-renderer.js) should call
 * `UnifiedInvitationSchema.migrateInvitation(doc)` once on load and
 * work off the returned object from then on.
 *
 * This file intentionally does NOT change how any existing template
 * renders yet — that is Step 2 (converting the 17 VIP templates into
 * data-driven templates) and Step 3 (merging the create form). It is
 * safe to include on any page today with zero visible effect.
 */
(function (global) {
    'use strict';

    /**
     * Canonical schema. Every key below exists on every invitation
     * object after migration, even if empty/null. This is the shape
     * requested in the brief:
     * { type, templateId, isVip, groom, bride, parents, date, time,
     *   venue, address, googleMaps, slug, verse, welcomeText,
     *   invitationText, loveStory, coverImage, gallery, music, theme,
     *   eventSchedule, faq, rsvp, guestbook, countdown, settings }
     */
    function createEmptySchema() {
        return {
            // --- identity ---
            type: null,            // 'wedding' | 'engagement' | 'katb_ketab' | 'birthday' | 'graduation' | 'newborn' | 'ramadan' | 'henna' ...
            templateId: null,      // e.g. 'modern', 'classic-1', 'vip-editorial-noir'
            isVip: false,
            slug: null,

            // --- people ---
            groom: { name: null, family: null },
            bride: { name: null, family: null },
            personName: null,      // for single-person events (birthday/graduation/newborn/ramadan)
            ageSentence: null,
            parents: { groomFather: null, groomMother: null, brideFather: null, brideMother: null },

            // --- date / time / place ---
            date: null,             // ISO date string, e.g. '2026-09-12'
            time: null,             // e.g. '20:00'
            venue: null,
            address: null,
            googleMaps: null,

            // --- content blocks (unified content order) ---
            verse: null,                 // Verse (Optional)
            welcomeText: null,
            invitationText: null,
            loveStory: null,             // Love Story (Optional)
            coverImage: null,
            gallery: [],                 // array of image URLs
            eventSchedule: [],           // NEW: [{ id, title, time, order }]
            faq: [],                     // refactored: [{ id, question, answer, order }]

            // --- interactive sections ---
            rsvp: { enabled: true, action: null },
            guestbook: { enabled: true, entries: [] },
            countdown: { enabled: true },

            // --- media / design ---
            music: null,
            theme: { colors: null, fontFamily: null },

            // --- VIP-only differences (everything else must be identical) ---
            vip: {
                introAnimation: false,
                introVideoUrl: null
            },

            // --- misc / free-form ---
            settings: {}
        };
    }

    function uid() {
        return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    /** Normalize a raw eventSchedule/faq array (old shape or missing ids/order) into the unified item shape. */
    function normalizeScheduleItems(rawArray) {
        if (!Array.isArray(rawArray)) return [];
        return rawArray
            .filter(function (item) { return item && (item.title || item.time); })
            .map(function (item, index) {
                return {
                    id: item.id || uid(),
                    title: item.title || '',
                    time: item.time || '',
                    order: typeof item.order === 'number' ? item.order : index
                };
            })
            .sort(function (a, b) { return a.order - b.order; });
    }

    function normalizeFaqItems(rawArray) {
        if (!Array.isArray(rawArray)) return [];
        return rawArray
            .filter(function (item) { return item && (item.question || item.answer); })
            .map(function (item, index) {
                return {
                    id: item.id || uid(),
                    question: item.question || '',
                    answer: item.answer || '',
                    order: typeof item.order === 'number' ? item.order : index
                };
            })
            .sort(function (a, b) { return a.order - b.order; });
    }

    /**
     * Map the VIP `data-bind` field names (from template-field-manifests.js)
     * onto the unified schema. `raw` is the invitation doc as currently
     * saved for VIP invitations (coupleNames, groomFamily, brideFamily,
     * personName, brideName, eventDateDisplay, eventDateTime, venueName,
     * venueAddress, googleMapsUrl, invitationText, design.coverImage,
     * design.galleryImages, design.musicUrl, ...).
     */
    function migrateFromVipFieldNames(raw, schema) {
        if (raw.coupleNames) {
            var parts = String(raw.coupleNames).split(/&|و/).map(function (s) { return s.trim(); });
            schema.groom.name = schema.groom.name || parts[0] || null;
            schema.bride.name = schema.bride.name || parts[1] || null;
        }
        schema.groom.family = schema.groom.family || raw.groomFamily || null;
        schema.bride.family = schema.bride.family || raw.brideFamily || null;
        schema.bride.name = schema.bride.name || raw.brideName || null; // henna group
        schema.personName = schema.personName || raw.personName || null;
        schema.ageSentence = schema.ageSentence || raw.ageSentence || null;

        schema.date = schema.date || raw.eventDateDisplay || null;
        schema.time = schema.time || null;
        if (!schema.date && raw.eventDateTime) schema.date = raw.eventDateTime;

        schema.venue = schema.venue || raw.venueName || null;
        schema.address = schema.address || raw.venueAddress || null;
        schema.googleMaps = schema.googleMaps || raw.googleMapsUrl || null;

        schema.invitationText = schema.invitationText || raw.invitationText || null;
        schema.welcomeText = schema.welcomeText || raw.welcomeText || null;
        schema.loveStory = schema.loveStory || raw.loveStory || null;
        schema.verse = schema.verse || raw.religiousVerse || null;

        var design = raw.design || {};
        schema.coverImage = schema.coverImage || design.coverImage || raw.coverImage || null;
        schema.gallery = schema.gallery.length ? schema.gallery : (design.galleryImages || raw.galleryImages || []);
        schema.music = schema.music || design.musicUrl || raw.musicUrl || null;

        schema.rsvp.action = schema.rsvp.action || raw.rsvpAction || null;

        return schema;
    }

    /**
     * Map the legacy "Normal" invitation doc field names onto the
     * unified schema. Normal docs already use names close to the
     * unified shape in most cases, so this is mostly a passthrough
     * with a few known legacy aliases.
     */
    function migrateFromNormalFieldNames(raw, schema) {
        schema.groom.name = schema.groom.name || raw.groomName || (raw.groom && raw.groom.name) || null;
        schema.bride.name = schema.bride.name || raw.brideName || (raw.bride && raw.bride.name) || null;
        schema.groom.family = schema.groom.family || raw.groomFamily || (raw.groom && raw.groom.family) || null;
        schema.bride.family = schema.bride.family || raw.brideFamily || (raw.bride && raw.bride.family) || null;

        schema.date = schema.date || raw.eventDate || raw.date || null;
        schema.time = schema.time || raw.eventTime || raw.time || null;
        schema.venue = schema.venue || raw.venueName || raw.venue || null;
        schema.address = schema.address || raw.venueAddress || raw.address || null;
        schema.googleMaps = schema.googleMaps || raw.googleMapsUrl || raw.googleMaps || null;

        schema.verse = schema.verse || raw.religiousVerse || raw.verse || null;
        schema.welcomeText = schema.welcomeText || raw.welcomeText || null;
        schema.invitationText = schema.invitationText || raw.invitationText || null;
        schema.loveStory = schema.loveStory || raw.loveStory || null;

        schema.coverImage = schema.coverImage || raw.coverImage || null;
        schema.gallery = schema.gallery.length ? schema.gallery : (raw.gallery || raw.galleryImages || []);
        schema.music = schema.music || raw.music || raw.musicUrl || null;

        schema.theme.colors = schema.theme.colors || raw.colors || (raw.theme && raw.theme.colors) || null;
        schema.theme.fontFamily = schema.theme.fontFamily || raw.fontFamily || (raw.theme && raw.theme.fontFamily) || null;

        schema.rsvp = Object.assign({ enabled: true, action: null }, raw.rsvp || {});
        schema.guestbook = Object.assign({ enabled: true, entries: [] }, raw.guestbook || {});
        schema.countdown = Object.assign({ enabled: true }, raw.countdown || {});

        return schema;
    }

    /**
     * Public entry point. Accepts a raw Firestore/RTDB invitation
     * document (old Normal shape, old VIP data-bind shape, or an
     * already-unified doc) and returns a fully-populated unified
     * schema object. Never mutates the input.
     */
    function migrateInvitation(raw) {
        var schema = createEmptySchema();
        if (!raw || typeof raw !== 'object') return schema;

        schema.type = raw.type || raw.eventCategory || raw.eventType || null;
        schema.templateId = raw.templateId || raw.id || null;
        schema.isVip = !!(raw.isVip || raw.isVipTemplate || (schema.templateId && String(schema.templateId).indexOf('vip-') === 0));
        schema.slug = raw.slug || raw.invitationId || null;

        schema.parents = Object.assign(schema.parents, raw.parents || {});

        // Field-name migration, layered: normal-shape fields first, then
        // VIP data-bind fields fill in anything still empty.
        migrateFromNormalFieldNames(raw, schema);
        migrateFromVipFieldNames(raw, schema);

        // New / refactored optional sections — support both the new
        // unified key and any prior ad-hoc key names, normalized and
        // sorted, so an empty section always yields [] (hide it).
        schema.eventSchedule = normalizeScheduleItems(raw.eventSchedule || raw.schedule || raw.timeline);
        schema.faq = normalizeFaqItems(raw.faq || raw.faqs || raw.faqItems);

        // VIP-only differentiators.
        schema.vip.introAnimation = !!(raw.vip && raw.vip.introAnimation) || !!raw.introAnimation;
        schema.vip.introVideoUrl = (raw.vip && raw.vip.introVideoUrl) || raw.introVideoUrl || null;

        schema.settings = Object.assign({}, raw.settings || {});

        return schema;
    }

    /** Convenience: true if the schedule section should render. */
    function hasEventSchedule(schema) {
        return !!(schema && Array.isArray(schema.eventSchedule) && schema.eventSchedule.length > 0);
    }

    /** Convenience: true if the FAQ section should render. */
    function hasFaq(schema) {
        return !!(schema && Array.isArray(schema.faq) && schema.faq.length > 0);
    }

    global.UnifiedInvitationSchema = {
        createEmptySchema: createEmptySchema,
        migrateInvitation: migrateInvitation,
        normalizeScheduleItems: normalizeScheduleItems,
        normalizeFaqItems: normalizeFaqItems,
        hasEventSchedule: hasEventSchedule,
        hasFaq: hasFaq
    };
})(window);
