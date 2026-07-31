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
    const MAX_CARDS = 12;
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

    function buildCard(inv, index) {
        const names = coupleLabel(inv);
        const theme = THEME_COLORS[inv.design?.templateId] || DEFAULT_THEME;
        const cover = inv.design?.coverImage || (inv.design?.galleryImages && inv.design.galleryImages[0]) || '';
        const views = (inv.viewsCount || 0).toLocaleString('ar-EG');

        const thumbStyle = cover
            ? `background-image: url('${cover.replace(/'/g, "%27")}')`
            : `background: linear-gradient(145deg, ${theme.primary}, ${theme.secondary})`;

        const card = document.createElement('a');
        card.href = invitationUrl(inv);
        card.target = '_blank';
        card.rel = 'noopener';
        card.className = 'real-invitation-card';
        card.setAttribute('data-aos', 'zoom-in');
        card.setAttribute('data-aos-delay', String(Math.min(index * 80, 400)));
        card.innerHTML = `
            <div class="real-invitation-thumb" style="${thumbStyle}">
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
            invitations = invitations.slice(0, MAX_CARDS);

            grid.innerHTML = '';
            invitations.forEach((inv, i) => grid.appendChild(buildCard(inv, i)));

            if (typeof AOS !== 'undefined') AOS.refresh();

        } catch (error) {
            console.warn('⚠️ Could not load real invitations:', error);
            renderEmpty(grid);
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const grid = document.getElementById(GRID_ID);
        if (grid) renderSkeleton(grid);
        loadRealInvitations();
    });
})();

console.log('✅ Real invitations showcase module loaded');
