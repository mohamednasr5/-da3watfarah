/**
 * دعوة فرح - Shared Sidebar Component
 * Da3wat Farah - Sidebar Navigation (Loads in all pages)
 */

// ===================================
// Load Sidebar into Page
// ===================================
function loadSidebar() {
    const sidebarContainer = document.getElementById('sidebar');
    if (!sidebarContainer) return;
    
    const currentPage = window.location.pathname.split('/').pop() || 'overview.html';
    
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
                <h4 id="sidebarUserName">جاري التحميل...</h4>
                <span id="userPlan">خطة: مجانية</span>
            </div>
        </div>

        <!-- Navigation Menu -->
        <nav class="sidebar-nav">
            <ul>
                <li class="${currentPage === 'overview.html' ? 'active' : ''}">
                    <a href="overview.html" data-section="overview">
                        <i class="fas fa-home"></i>
                        <span>نظرة عامة</span>
                    </a>
                </li>
                <li class="${currentPage === 'create-invitation.html' ? 'active' : ''}">
                    <a href="create-invitation.html" data-section="create">
                        <i class="fas fa-plus-circle"></i>
                        <span>إنشاء دعوة جديدة</span>
                    </a>
                </li>
                <li class="${currentPage === 'my-invitations.html' ? 'active' : ''}">
                    <a href="my-invitations.html" data-section="invitations">
                        <i class="fas fa-envelope-open-text"></i>
                        <span>دعواتي</span>
                    </a>
                </li>
                <li class="${currentPage === 'gallery.html' ? 'active' : ''}">
                    <a href="gallery.html" data-section="gallery">
                        <i class="fas fa-images"></i>
                        <span>معرض الصور</span>
                    </a>
                </li>
                <li class="${currentPage === 'music.html' ? 'active' : ''}">
                    <a href="music.html" data-section="music">
                        <i class="fas fa-music"></i>
                        <span>الموسيقى</span>
                    </a>
                </li>
                <li class="${currentPage === 'ai-writer.html' ? 'active' : ''}">
                    <a href="ai-writer.html" data-section="ai">
                        <i class="fas fa-wand-magic-sparkles"></i>
                        <span>كاتب AI</span>
                    </a>
                </li>
                <li class="${currentPage === 'settings.html' ? 'active' : ''}">
                    <a href="settings.html" data-section="settings">
                        <i class="fas fa-cog"></i>
                        <span>الإعدادات</span>
                    </a>
                </li>
            </ul>
        </nav>

        <!-- Upgrade Card -->
        <div class="sidebar-upgrade">
            <div class="upgrade-icon">👑</div>
            <h4>ترقية لـ VIP</h4>
            <p>احصل على ميزات حصرية ومزيد من التخصيص</p>
            <a href="#" class="btn btn-sm btn-gold">ترقية الآن</a>
        </div>

        <!-- Logout Button -->
        <div class="sidebar-footer">
            <button onclick="logout()" class="btn-logout">
                <i class="fas fa-sign-out-alt"></i>
                <span>تسجيل الخروج</span>
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
}

// ===================================
// Update User Info in Sidebar
// ===================================
function updateSidebarUserInfo(userData) {
    const nameEl = document.getElementById('sidebarUserName');
    const planEl = document.getElementById('userPlan');
    
    if (nameEl && userData?.displayName) {
        nameEl.textContent = userData.displayName;
    } else if (nameEl && userData?.email) {
        nameEl.textContent = userData.email.split('@')[0];
    }
    
    if (planEl && userData?.plan) {
        const planNames = {
            free: 'مجانية',
            premium: 'بريميوم',
            vip: 'VIP'
        };
        planEl.textContent = `خطة: ${planNames[userData.plan] || userData.plan}`;
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
