/**
 * دعوة فرح - Real-time Dashboard Notifications
 * -----------------------------------------------------------------
 * Watches every invitation belonging to the signed-in user and reacts
 * instantly (no page refresh needed) when a guest:
 *   - confirms/declines attendance (RSVP)
 *   - leaves a congratulation message (wish)
 *
 * It also keeps invitation "views" live so the dashboard stats update
 * as guests open the invitation link.
 *
 * Requires: firebase-config.js, db.js (for currentUserId / getUserInvitations)
 * Include on any dashboard page that has the notification bell markup:
 *   <button class="header-btn notification-btn">
 *       <i class="fas fa-bell"></i>
 *       <span class="notification-badge" id="notificationBadge">0</span>
 *   </button>
 */
(function () {
    const STORAGE_PREFIX = 'da3wat_notifications_';
    const LAST_SEEN_PREFIX = 'da3wat_notifications_seen_';
    const MAX_STORED = 50;

    let notifications = [];
    let watchedInvitations = new Set();
    let unsubscribers = [];
    let panelBuilt = false;
    let currentUid = null;
    let invitationsUnsubscribe = null;
    const invitationViewsMap = {};

    function storageKey() {
        return STORAGE_PREFIX + (currentUid || 'anon');
    }
    function lastSeenKey() {
        return LAST_SEEN_PREFIX + (currentUid || 'anon');
    }

    function loadStored() {
        try {
            const raw = localStorage.getItem(storageKey());
            notifications = raw ? JSON.parse(raw) : [];
        } catch (e) {
            notifications = [];
        }
    }

    function persist() {
        try {
            localStorage.setItem(storageKey(), JSON.stringify(notifications.slice(0, MAX_STORED)));
        } catch (e) { /* localStorage unavailable — notifications stay in-memory only */ }
    }

    function getLastSeen() {
        return parseInt(localStorage.getItem(lastSeenKey()) || '0', 10);
    }
    function setLastSeen(ts) {
        try { localStorage.setItem(lastSeenKey(), String(ts)); } catch (e) {}
    }

    function coupleLabel(inv) {
        const groom = inv?.couple?.groomName || '';
        const bride = inv?.couple?.brideName || '';
        if (groom && bride) return `${groom} و${bride}`;
        return groom || bride || 'دعوتك';
    }

    // ===================================
    // Dropdown Panel UI
    // ===================================
    function ensurePanel() {
        if (panelBuilt) return;
        const btn = document.querySelector('.notification-btn');
        if (!btn) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'notification-wrapper';
        btn.parentNode.insertBefore(wrapper, btn);
        wrapper.appendChild(btn);

        const panel = document.createElement('div');
        panel.className = 'notification-panel';
        panel.id = 'notificationPanel';
        panel.innerHTML = `
            <div class="notification-panel-header">
                <h4><i class="fas fa-bell"></i> الإشعارات</h4>
                <button type="button" class="notification-clear-btn" id="notifClearBtn">مسح الكل</button>
            </div>
            <div class="notification-panel-body" id="notificationPanelBody"></div>
        `;
        wrapper.appendChild(panel);
        panelBuilt = true;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            togglePanel();
        });

        panel.querySelector('#notifClearBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            notifications = [];
            persist();
            renderPanel();
            updateBadge();
        });

        panel.addEventListener('click', (e) => e.stopPropagation());

        document.addEventListener('click', () => closePanel());
    }

    function togglePanel() {
        const panel = document.getElementById('notificationPanel');
        if (!panel) return;
        const willOpen = !panel.classList.contains('open');
        panel.classList.toggle('open', willOpen);
        if (willOpen) {
            setLastSeen(Date.now());
            updateBadge();
        }
    }
    function closePanel() {
        const panel = document.getElementById('notificationPanel');
        if (panel) panel.classList.remove('open');
    }

    function timeAgo(ts) {
        if (!ts) return '';
        const seconds = Math.floor((Date.now() - ts) / 1000);
        if (seconds < 60) return 'الآن';
        if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
        if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;
        if (seconds < 604800) return `منذ ${Math.floor(seconds / 86400)} يوم`;
        return new Date(ts).toLocaleDateString('ar-SA');
    }

    function escapeHtml(str) {
        return (str || '').replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function renderPanel() {
        const body = document.getElementById('notificationPanelBody');
        if (!body) return;

        if (!notifications.length) {
            body.innerHTML = `
                <div class="notification-empty">
                    <i class="fas fa-bell-slash"></i>
                    <p>لا توجد إشعارات جديدة</p>
                </div>`;
            return;
        }

        body.innerHTML = notifications.map(n => `
            <a href="my-invitations.html" class="notification-item notification-item-${n.type}">
                <div class="notification-item-icon ${n.type}">
                    <i class="fas ${n.type === 'rsvp' ? (n.attending ? 'fa-user-check' : 'fa-user-xmark') : 'fa-heart'}"></i>
                </div>
                <div class="notification-item-body">
                    <p>${escapeHtml(n.text)}</p>
                    <span>${timeAgo(n.createdAt)}</span>
                </div>
            </a>
        `).join('');
    }

    function updateBadge() {
        const badge = document.getElementById('notificationBadge');
        if (!badge) return;
        const lastSeen = getLastSeen();
        const unread = notifications.filter(n => n.createdAt > lastSeen).length;
        badge.textContent = unread > 99 ? '99+' : unread;
        badge.style.display = unread > 0 ? 'flex' : 'none';
    }

    function pushNotification(entry) {
        // Avoid duplicates (e.g. re-attaching listeners after navigation)
        if (notifications.some(n => n.id === entry.id)) return;

        notifications.unshift(entry);
        if (notifications.length > MAX_STORED) notifications.length = MAX_STORED;
        persist();
        renderPanel();
        updateBadge();

        if (window.db && typeof window.db.showNotification === 'function') {
            window.db.showNotification(entry.text, entry.type === 'rsvp' ? (entry.attending ? 'success' : 'info') : 'success');
        }

        document.dispatchEvent(new CustomEvent('da3wat:notification', { detail: entry }));
    }

    // ===================================
    // Live view-count tracking
    // ===================================
    function watchViews(inv) {
        if (!window.firebaseDb) return;
        const ref = window.firebaseDb.ref(`invitations/${inv.id}/viewsCount`);
        const handler = (snap) => {
            const views = snap.val() || 0;
            invitationViewsMap[inv.id] = views;
            const totalViews = Object.values(invitationViewsMap).reduce((sum, v) => sum + v, 0);
            document.dispatchEvent(new CustomEvent('da3wat:viewsUpdated', {
                detail: { invitationId: inv.id, views, totalViews }
            }));
        };
        ref.on('value', handler);
        unsubscribers.push(() => ref.off('value', handler));
    }

    // ===================================
    // Live RSVP / wish tracking
    // ===================================
    function watchInvitation(inv) {
        if (!inv || !inv.id || watchedInvitations.has(inv.id) || !window.firebaseDb) return;
        watchedInvitations.add(inv.id);

        const knownRsvpIds = new Set();
        window.firebaseDb.ref(`invitations/${inv.id}/rsvps`).once('value').then(snap => {
            snap.forEach(child => { knownRsvpIds.add(child.key); });

            const rsvpRef = window.firebaseDb.ref(`invitations/${inv.id}/rsvps`);
            const handler = (child) => {
                if (knownRsvpIds.has(child.key)) return;
                knownRsvpIds.add(child.key);
                const r = child.val() || {};
                const attending = r.attending !== false;
                pushNotification({
                    id: `rsvp_${inv.id}_${child.key}`,
                    type: 'rsvp',
                    attending,
                    invitationId: inv.id,
                    text: `${r.guestName || 'ضيف'} ${attending ? 'أكّد حضوره' : 'اعتذر عن الحضور'} لدعوة ${coupleLabel(inv)}`,
                    createdAt: r.createdAt || Date.now()
                });
            };
            rsvpRef.on('child_added', handler);
            unsubscribers.push(() => rsvpRef.off('child_added', handler));
        }).catch(() => {});

        const knownWishIds = new Set();
        window.firebaseDb.ref(`invitations/${inv.id}/wishes`).once('value').then(snap => {
            snap.forEach(child => { knownWishIds.add(child.key); });

            const wishRef = window.firebaseDb.ref(`invitations/${inv.id}/wishes`);
            const handler = (child) => {
                if (knownWishIds.has(child.key)) return;
                knownWishIds.add(child.key);
                const w = child.val() || {};
                pushNotification({
                    id: `wish_${inv.id}_${child.key}`,
                    type: 'wish',
                    invitationId: inv.id,
                    text: `${w.name || 'ضيف'} أرسل تهنئة على دعوة ${coupleLabel(inv)}`,
                    createdAt: w.createdAt || Date.now()
                });
            };
            wishRef.on('child_added', handler);
            unsubscribers.push(() => wishRef.off('child_added', handler));
        }).catch(() => {});

        watchViews(inv);
    }

    function teardown() {
        unsubscribers.forEach(fn => { try { fn(); } catch (e) {} });
        unsubscribers = [];
        watchedInvitations = new Set();
        if (invitationsUnsubscribe) {
            invitationsUnsubscribe();
            invitationsUnsubscribe = null;
        }
    }

    function init(user) {
        if (!user) return;
        if (currentUid === user.uid && watchedInvitations.size) return; // already running

        teardown();
        currentUid = user.uid;
        loadStored();
        ensurePanel();
        renderPanel();
        updateBadge();

        if (window.db && typeof window.db.listenToInvitations === 'function') {
            invitationsUnsubscribe = window.db.listenToInvitations((invitations) => {
                (invitations || []).forEach(watchInvitation);
            });
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (window.firebaseAuth && window.firebaseAuth.currentUser) {
            init(window.firebaseAuth.currentUser);
        }
    });

    document.addEventListener('da3wat:authReady', (e) => {
        if (e.detail && e.detail.user) init(e.detail.user);
    });

    window.addEventListener('beforeunload', teardown);
})();

console.log('✅ Notifications module loaded (real-time RSVPs / wishes / views)');
