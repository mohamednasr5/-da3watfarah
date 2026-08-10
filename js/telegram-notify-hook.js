/**
 * telegram-notify-hook.js
 * -----------------------------------------------------------------------
 * Wraps window.db.createInvitation / submitPaymentInfo / addRSVP / addWish
 * so that right after each one succeeds, we POST a tiny event to the
 * Worker's /api/notify endpoint. The Worker re-reads the fresh invitation
 * from Firebase and forwards a formatted message + action buttons to the
 * admin's Telegram chat.
 *
 * Include this AFTER js/db.js on every page that calls those functions:
 * dashboard.html, create-invitation.html, invite.html (RSVP/wishes/payment
 * steps), settings.html, etc.
 *
 * Fails silently (never throws, never blocks the UI) if the Worker/Telegram
 * isn't configured yet — the original db.* behaviour is 100% unaffected.
 */
(function () {
    if (!window.db) {
        console.warn('telegram-notify-hook: window.db not found, skipping hook install');
        return;
    }

    function notifyEndpoint() {
        return window.r2Config && window.r2Config.workerUrl
            ? `${window.r2Config.workerUrl}/api/notify`
            : null;
    }

    async function sendNotify(kind, id) {
        try {
            const endpoint = notifyEndpoint();
            if (!endpoint || !id) return;
            await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ kind, id })
            });
        } catch (e) {
            console.warn('telegram-notify-hook: notify failed (ignored):', e);
        }
    }

    const originalCreateInvitation = window.db.createInvitation;
    window.db.createInvitation = async function (data) {
        const result = await originalCreateInvitation(data);
        if (result && result.success && result.invitationId) {
            sendNotify('new_invitation', result.invitationId);
        }
        return result;
    };

    const originalSubmitPaymentInfo = window.db.submitPaymentInfo;
    window.db.submitPaymentInfo = async function (invitationId, paymentData) {
        const result = await originalSubmitPaymentInfo(invitationId, paymentData);
        if (result && result.success) {
            sendNotify('payment_submitted', invitationId);
        }
        return result;
    };

    const originalAddRSVP = window.db.addRSVP;
    window.db.addRSVP = async function (invitationId, rsvpData) {
        const result = await originalAddRSVP(invitationId, rsvpData);
        if (result && result.success) {
            sendNotify('new_rsvp', invitationId);
        }
        return result;
    };

    const originalAddWish = window.db.addWish;
    window.db.addWish = async function (invitationId, wishData) {
        const result = await originalAddWish(invitationId, wishData);
        if (result && result.success) {
            sendNotify('new_wish', invitationId);
        }
        return result;
    };

    console.log('✅ Telegram notify hook installed');
})();
