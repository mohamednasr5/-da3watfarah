/**
 * دعوة فرح - Real Invitations Showcase (Landing Page)
 * -----------------------------------------------------------------
 * Pulls the invitations that real couples have created and published
 * on the platform, and renders them as clickable cards on the
 * homepage. Clicking a card opens the actual live invitation
 * (invite.html), which counts as a real view.
 *
 * Read-only and public: relies on the existing RTDB rule that allows
 * ".read": true on the top-level "invitations" node.
 */
(function () {
    const GRID_ID = 'realInvitationsGrid';
    const MAX_CARDS = 24;
    const SKELETON_COUNT = 6;

    // Fallback gradient per template, used when an invitation has no
    // cover photo uploaded yet.
    const THEME_COLORS = {
        modern: { primary: '#1A1A2E', secondary: '#E94560' },
        classic: { primary: '#8B4513', secondary: '#D4AF37' },
        royal: { primary: '#1A1A3E', secondary: '#D4AF37' },
        romantic: { primary: '#D4A5A5', secondary: '#E8B4BC' },
        islamic: { primary: '#1B5E20', secondary: '#D4AF37' },
        bohemian: { primary: '#C17F59', secondary: '#9CAF88' }
    };
    const DEFAULT_THEME = { primary: '#8B4513', secondary: '#D4AF37' };

    const EVENT_TYPE_BADGES = {
        wedding: { label: '💍 فرح', color: '#D4AF37' },
        engagement: { label: '💎 خطوبة', color: '#B76E79' },
        katb_ketab: { label: '📖 كتب كتاب', color: '#0F766E' },
        henna: { label: '✋ حناء', color: '#C17F59' },
        birthday: { label: '🎂 عيد ميلاد', color: '#E8734A' },
        newborn: { label: '👶 مولود', color: '#4B9CD3' },
        graduation: { label: '🎓 تخرج', color: '#5B4B8A' },
        ramadan: { label: '🌙 رمضان', color: '#1B5E20' }
    };
    function getEventType(inv) {
        return (inv.event && inv.event.eventType) || inv.eventType || 'wedding';
    }

    let allLoadedInvitations = [];
    let currentTypeFilter = 'all';

    function escapeHtml(str) {
        return (str || '').replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function coupleLabel(inv) {
        const groom = inv.couple?.groomName || '';
        const bride = inv.couple?.brideName || '';
        if (groom && bride) return `${groom} & ${bride}`;
        return groom || bride || 'دعوة فرح';
    }

    function invitationUrl(inv) {
        return inv.slug
            ? `invite.html?slug=${encodeURIComponent(inv.slug)}&id=${inv.id}`
            : `invite.html?id=${inv.id}`;
    }

    function isVipInvitation(inv) {
        return !!(inv.isVip || (inv.design && inv.design.isVipTemplate));
    }

    function buildCard(inv, index) {
        const names = coupleLabel(inv);
        const theme = THEME_COLORS[inv.design?.templateId] || DEFAULT_THEME;
        const cover = inv.design?.coverImage || (inv.design?.galleryImages && inv.design.galleryImages[0]) || '';
        const views = (inv.viewsCount || 0).toLocaleString('ar-EG');

        const thumbStyle = cover
            ? `background-image: url('${cover.replace(/'/g, "%27")}')`
            : `background: linear-gradient(145deg, ${theme.primary}, ${theme.secondary})`;

        const typeInfo = EVENT_TYPE_BADGES[getEventType(inv)] || EVENT_TYPE_BADGES.wedding;
        const vipBadge = isVipInvitation(inv)
            ? `<span class="real-invitation-vip-badge" data-tooltip="هذا القالب يتطلب الاشتراك في خطة VIP" title="هذا القالب يتطلب الاشتراك في خطة VIP"><i class="fas fa-crown"></i> VIP</span>`
            : '';

        const card = document.createElement('a');
        card.href = invitationUrl(inv);
        card.target = '_blank';
        card.rel = 'noopener';
        card.className = 'real-invitation-card';
        card.setAttribute('data-aos', 'zoom-in');
        card.setAttribute('data-aos-delay', String(Math.min(index * 80, 400)));
        card.innerHTML = `
            <div class="real-invitation-thumb" style="${thumbStyle}">
                ${vipBadge}
                <span style="position:absolute;top:14px;right:14px;background:rgba(0,0,0,.45);color:#fff;font-size:.75rem;font-weight:700;padding:5px 12px;border-radius:999px;border:1px solid ${typeInfo.color}">${typeInfo.label}</span>
                <div class="real-invitation-overlay">
                    <h3>${escapeHtml(names)}</h3>
                </div>
            </div>
            <div class="real-invitation-footer">
                <span class="real-invitation-view">شاهد الدعوة <i class="fas fa-arrow-left"></i></span>
                <span class="real-invitation-count"><i class="fas fa-eye"></i> ${views} زيارة</span>
            </div>
        `;
        return card;
    }

    function renderSkeleton(grid) {
        grid.innerHTML = Array.from({ length: SKELETON_COUNT })
            .map(() => '<div class="real-invitation-card skeleton-card"></div>')
            .join('');
    }

    function renderEmpty(grid) {
        grid.innerHTML = `
            <div class="real-invitations-empty">
                <i class="fas fa-envelope-open-text"></i>
                <p>لا توجد دعوات منشورة بعد. كن أول من يصمم دعوته!</p>
            </div>`;
    }

    async function loadRealInvitations() {
        const grid = document.getElementById(GRID_ID);
        if (!grid) return;

        try {
            if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length || !firebase.database) {
                throw new Error('Firebase Realtime Database not available');
            }

            const snapshot = await firebase.database()
                .ref('invitations')
                .orderByChild('status')
                .equalTo('active')
                .once('value');

            if (!snapshot.exists()) {
                renderEmpty(grid);
                return;
            }

            let invitations = [];
            snapshot.forEach(child => {
                const val = child.val();
                if (val && val.isPublished !== false) {
                    invitations.push({ id: child.key, ...val });
                }
            });

            if (!invitations.length) {
                renderEmpty(grid);
                return;
            }

            // Most-viewed invitations first
            invitations.sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));
            allLoadedInvitations = invitations;
            renderFiltered(grid);

        } catch (error) {
            console.warn('⚠️ Could not load real invitations:', error);
            renderEmpty(grid);
        }
    }

    function renderFiltered(grid) {
        let list = allLoadedInvitations;
        if (currentTypeFilter !== 'all') {
            list = list.filter(inv => getEventType(inv) === currentTypeFilter);
        }
        list = list.slice(0, MAX_CARDS);

        if (!list.length) {
            renderEmpty(grid);
            return;
        }

        grid.innerHTML = '';
        list.forEach((inv, i) => grid.appendChild(buildCard(inv, i)));
        if (typeof AOS !== 'undefined') AOS.refresh();
    }

    document.addEventListener('DOMContentLoaded', () => {
        const grid = document.getElementById(GRID_ID);
        if (grid) renderSkeleton(grid);
        loadRealInvitations();

        const filterBar = document.getElementById('realInvitationsFilter');
        if (filterBar) {
            filterBar.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-type]');
                if (!btn) return;
                filterBar.querySelectorAll('[data-type]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentTypeFilter = btn.dataset.type;
                const g = document.getElementById(GRID_ID);
                if (g) renderFiltered(g);
            });
        }
    });
})();

console.log('✅ Real invitations showcase module loaded');
