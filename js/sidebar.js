/**
 * دعوة فرح - Shared Sidebar Component
 * Da3wat Farah - Sidebar Navigation (Loads in all pages)
 */

// ===================================
// Sidebar Translations
// ===================================
const SIDEBAR_T = {
    ar: {
        loading: 'جاري التحميل...',
        plan_free: 'خطة: مجانية',
        plan_premium: 'خطة: بريميوم',
        plan_vip: 'خطة: VIP',
        nav_overview: 'نظرة عامة',
        nav_create: 'إنشاء دعوة جديدة',
        nav_invitations: 'دعواتي',
        nav_gallery: 'معرض الصور',
        nav_music: 'الموسيقى',
        nav_ai: 'كاتب AI',
        nav_settings: 'الإعدادات',
        upgrade_title: 'ترقية لـ VIP',
        upgrade_desc: 'احصل على ميزات حصرية ومزيد من التخصيص',
        upgrade_btn: 'ترقية الآن',
        logout_btn: 'تسجيل الخروج'
    },
    en: {
        loading: 'Loading...',
        plan_free: 'Plan: Free',
        plan_premium: 'Plan: Premium',
        plan_vip: 'Plan: VIP',
        nav_overview: 'Overview',
        nav_create: 'Create Invitation',
        nav_invitations: 'My Invitations',
        nav_gallery: 'Photo Gallery',
        nav_music: 'Music',
        nav_ai: 'AI Writer',
        nav_settings: 'Settings',
        upgrade_title: 'Upgrade to VIP',
        upgrade_desc: 'Get exclusive features and more customization',
        upgrade_btn: 'Upgrade Now',
        logout_btn: 'Log Out'
    }
};

function sidebarLang() {
    try {
        const saved = localStorage.getItem('df_lang');
        return (saved === 'ar' || saved === 'en') ? saved : 'ar';
    } catch (e) { return 'ar'; }
}

function SL(key) {
    const t = SIDEBAR_T[sidebarLang()] || SIDEBAR_T.ar;
    return t[key] !== undefined ? t[key] : key;
}

// ===================================
// Apply Sidebar Language
// ===================================
window.applySidebarLang = function(lang) {
    const t = SIDEBAR_T[lang] || SIDEBAR_T.ar;
    
    // Update navigation items
    const navItems = {
        'nav_overview': '.sidebar-nav a[data-section="overview"] span',
        'nav_create': '.sidebar-nav a[data-section="create"] span',
        'nav_invitations': '.sidebar-nav a[data-section="invitations"] span',
        'nav_gallery': '.sidebar-nav a[data-section="gallery"] span',
        'nav_music': '.sidebar-nav a[data-section="music"] span',
        'nav_ai': '.sidebar-nav a[data-section="ai"] span',
        'nav_settings': '.sidebar-nav a[data-section="settings"] span'
    };
    
    Object.keys(navItems).forEach(key => {
        const el = document.querySelector(navItems[key]);
        if (el && t[key]) el.textContent = t[key];
    });
    
    // Update upgrade card
    const upgradeTitle = document.querySelector('.sidebar-upgrade h4');
    const upgradeDesc = document.querySelector('.sidebar-upgrade p');
    const upgradeBtn = document.getElementById('sidebarUpgradeBtn');
    
    if (upgradeTitle) upgradeTitle.textContent = t.upgrade_title;
    if (upgradeDesc) upgradeDesc.textContent = t.upgrade_desc;
    if (upgradeBtn) upgradeBtn.textContent = t.upgrade_btn;
    
    // Update logout button
    const logoutSpan = document.querySelector('.btn-logout span');
    if (logoutSpan) logoutSpan.textContent = t.logout_btn;
};

// ===================================
// Load Sidebar into Page
// ===================================
function loadSidebar() {
    const sidebarContainer = document.getElementById('sidebar');
    if (!sidebarContainer) return;
    
    const currentPage = window.location.pathname.split('/').pop() || 'overview.html';
    const t = SIDEBAR_T[sidebarLang()] || SIDEBAR_T.ar;
    
    sidebarContainer.innerHTML = `
        <!-- Logo -->
        <div class="sidebar-header">
            <a href="index.html" class="logo">
                <span class="logo-icon">💍</span>
                <span class="logo-text">دعوة<span class="gold">فرح</span></span>
            </a>
            <button class="sidebar-close" id="sidebarClose">
                <i class="fas fa-times"></i>
            </button>
        </div>

        <!-- User Info -->
        <div class="user-profile-mini">
            <div class="avatar-placeholder">
                <i class="fas fa-user"></i>
            </div>
            <div class="user-info-text">
                <h4 id="sidebarUserName">${t.loading}</h4>
                <span id="userPlan">${t.plan_free}</span>
            </div>
        </div>

        <!-- Navigation Menu -->
        <nav class="sidebar-nav">
            <ul>
                <li class="${currentPage === 'overview.html' ? 'active' : ''}">
                    <a href="overview.html" data-section="overview">
                        <i class="fas fa-home"></i>
                        <span data-i18n="nav_overview">${t.nav_overview}</span>
                    </a>
                </li>
                <li class="${currentPage === 'create-invitation.html' ? 'active' : ''}">
                    <a href="create-invitation.html" data-section="create">
                        <i class="fas fa-plus-circle"></i>
                        <span data-i18n="nav_create">${t.nav_create}</span>
                    </a>
                </li>
                <li class="${currentPage === 'my-invitations.html' ? 'active' : ''}">
                    <a href="my-invitations.html" data-section="invitations">
                        <i class="fas fa-envelope-open-text"></i>
                        <span data-i18n="nav_invitations">${t.nav_invitations}</span>
                    </a>
                </li>
                <li class="${currentPage === 'gallery.html' ? 'active' : ''}">
                    <a href="gallery.html" data-section="gallery">
                        <i class="fas fa-images"></i>
                        <span data-i18n="nav_gallery">${t.nav_gallery}</span>
                    </a>
                </li>
                <li class="${currentPage === 'music.html' ? 'active' : ''}">
                    <a href="music.html" data-section="music">
                        <i class="fas fa-music"></i>
                        <span data-i18n="nav_music">${t.nav_music}</span>
                    </a>
                </li>
                <li class="${currentPage === 'ai-writer.html' ? 'active' : ''}">
                    <a href="ai-writer.html" data-section="ai">
                        <i class="fas fa-wand-magic-sparkles"></i>
                        <span data-i18n="nav_ai">${t.nav_ai}</span>
                    </a>
                </li>
                <li class="${currentPage === 'settings.html' ? 'active' : ''}">
                    <a href="settings.html" data-section="settings">
                        <i class="fas fa-cog"></i>
                        <span data-i18n="nav_settings">${t.nav_settings}</span>
                    </a>
                </li>
            </ul>
        </nav>

        <!-- Upgrade Card -->
        <div class="sidebar-upgrade">
            <div class="upgrade-icon">👑</div>
            <h4 data-i18n="upgrade_title">${t.upgrade_title}</h4>
            <p data-i18n="upgrade_desc">${t.upgrade_desc}</p>
            <a href="#" class="btn btn-sm btn-gold" id="sidebarUpgradeBtn" data-i18n="upgrade_btn">${t.upgrade_btn}</a>
        </div>

        <!-- Logout Button -->
        <div class="sidebar-footer">
            <button onclick="logout()" class="btn-logout">
                <i class="fas fa-sign-out-alt"></i>
                <span data-i18n="logout_btn">${t.logout_btn}</span>
            </button>
        </div>
    `;
    
    // Initialize sidebar functionality
    initSidebarFunctionality();
}

// ===================================
// Sidebar Functionality
// ===================================
function initSidebarFunctionality() {
    // Mobile menu toggle
    const mobileBtn = document.getElementById('mobileSidebarBtn');
    const closeBtn = document.getElementById('sidebarClose');
    const sidebar = document.getElementById('sidebar');
    
    if (mobileBtn && sidebar) {
        mobileBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
        });
    }
    
    if (closeBtn && sidebar) {
        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    }
    
    // Close sidebar when clicking nav links on mobile
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 1024) {
                sidebar?.classList.remove('open');
            }
        });
    });

    // "ترقية لـ VIP" banner — remember the VIP plan then head into
    // create-invitation.html, whose payment gate (linked to the same
    // payment methods shown on the homepage) will open on the VIP plan
    // automatically instead of asking the user to pick a plan again.
    const upgradeBtn = document.getElementById('sidebarUpgradeBtn');
    if (upgradeBtn) {
        upgradeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            try { localStorage.setItem('da3wa_selected_plan', 'vip'); } catch (err) {}
            window.location.href = 'create-invitation.html';
        });
    }
}

// ===================================
// Update User Info in Sidebar
// ===================================
function updateSidebarUserInfo(userData) {
    const nameEl = document.getElementById('sidebarUserName');
    const planEl = document.getElementById('userPlan');
    const t = SIDEBAR_T[sidebarLang()] || SIDEBAR_T.ar;
    
    if (nameEl && userData?.displayName) {
        nameEl.textContent = userData.displayName;
    } else if (nameEl && userData?.email) {
        nameEl.textContent = userData.email.split('@')[0];
    }
    
    if (planEl && userData?.plan) {
        const planNames = {
            free: t.plan_free.split(': ')[1] || t.plan_free,
            premium: t.plan_premium.split(': ')[1] || t.plan_premium,
            vip: t.plan_vip.split(': ')[1] || t.plan_vip
        };
        const planKey = `plan_${userData.plan}`;
        planEl.textContent = t[planKey] || `${t.plan_free.split(':')[0]}: ${userData.plan}`;
    }
}

// ===================================
// Listen for user data loaded event
// ===================================
document.addEventListener('userDataLoaded', function(e) {
    updateSidebarUserInfo(e.detail);
});

// ===================================
// Load sidebar when DOM is ready
// ===================================
document.addEventListener('DOMContentLoaded', loadSidebar);

console.log('✅ Sidebar module loaded');
