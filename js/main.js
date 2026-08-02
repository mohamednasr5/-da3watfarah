/**
 * دعوة فرح - Main JavaScript
 * Da3wat Farah - Wedding Invitation Platform
 */

// ===================================
// DOM Content Loaded
// ===================================
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initNavbar();
    initMobileMenu();
    initAOS();
    initBackToTop();
    initTemplateFilter();
    initPricingToggle();
    initRippleEffect();
    initSmoothScroll();
    hideLoader();
});

// ===================================
// Page Loader
// ===================================
function hideLoader() {
    const loader = document.querySelector('.page-loader');
    if (loader) {
        setTimeout(() => {
            loader.classList.add('hidden');
            setTimeout(() => loader.remove(), 500);
        }, 500);
    }
}

// ===================================
// Navbar Scroll Effect
// ===================================
function initNavbar() {
    const navbar = document.getElementById('navbar');
    
    if (!navbar) return;
    
    const handleScroll = () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state
}

// ===================================
// Mobile Menu Toggle
// ===================================
function initMobileMenu() {
    const menuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (!menuBtn || !mobileMenu) return;
    
    menuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
        
        // Toggle icon
        const icon = menuBtn.querySelector('i');
        icon.classList.toggle('fa-bars');
        icon.classList.toggle('fa-times');
    });
    
    // Close menu when clicking on links
    const links = mobileMenu.querySelectorAll('a');
    links.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            const icon = menuBtn.querySelector('i');
            icon.classList.add('fa-bars');
            icon.classList.remove('fa-times');
        });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!menuBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
            mobileMenu.classList.remove('active');
            const icon = menuBtn.querySelector('i');
            icon.classList.add('fa-bars');
            icon.classList.remove('fa-times');
        }
    });
}

// ===================================
// AOS (Animate On Scroll) Initialization
// ===================================
function initAOS() {
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            easing: 'ease-out-cubic',
            once: true,
            offset: 50,
            delay: 0,
        });
    }
}

// ===================================
// Back to Top Button
// ===================================
function initBackToTop() {
    const backToTop = document.querySelector('.back-to-top');
    
    if (!backToTop) return;
    
    // Create button if not exists
    if (!document.querySelector('.back-to-top')) {
        const btn = document.createElement('button');
        btn.className = 'back-to-top';
        btn.innerHTML = '<i class="fas fa-arrow-up"></i>';
        document.body.appendChild(btn);
    }
    
    const button = document.querySelector('.back-to-top');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
            button.classList.add('visible');
        } else {
            button.classList.remove('visible');
        }
    });
    
    button.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// ===================================
// Template Filter
// ===================================
function initTemplateFilter() {
    const styleButtons = document.querySelectorAll('.templates-filter .filter-btn');
    const eventButtons = document.querySelectorAll('.event-templates-filter .event-filter-btn');
    const grid = document.querySelector('.templates-grid');
    const templateCards = grid ? grid.querySelectorAll('.template-card') : document.querySelectorAll('.template-card');
    const emptyState = document.getElementById('templatesEmptyState');

    if (templateCards.length === 0) return;

    let currentStyleFilter = 'all';
    let currentEventFilter = 'all';

    function sortVipWithVideoFirst() {
        if (!grid) return;
        const visibleCards = Array.from(templateCards).filter(c => c.style.display !== 'none');
        visibleCards.sort((a, b) => {
            const rank = c => (c.dataset.vip === '1' ? (c.dataset.video === '1' ? 0 : 1) : 2);
            return rank(a) - rank(b);
        });
        visibleCards.forEach(c => grid.appendChild(c));
    }

    function applyFilters() {
        let visibleCount = 0;
        templateCards.forEach(card => {
            const cardEvents = (card.dataset.event || '').split(' ').filter(Boolean);
            const styleMatch = currentStyleFilter === 'all' || card.dataset.category === currentStyleFilter;
            const eventMatch = currentEventFilter === 'all' || cardEvents.includes(currentEventFilter);
            const show = styleMatch && eventMatch;
            card.style.display = show ? 'block' : 'none';
            if (show) {
                card.style.animation = 'fadeInUp 0.5s ease forwards';
                visibleCount++;
            }
        });
        sortVipWithVideoFirst();
        if (emptyState) emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
    }

    styleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            styleButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentStyleFilter = btn.dataset.filter;
            applyFilters();
        });
    });

    eventButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            eventButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentEventFilter = btn.dataset.event;
            applyFilters();
        });
    });

    applyFilters();
}

// Add fadeInUp animation dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);

// ===================================
// Pricing Toggle (Monthly/Yearly)
// ===================================
function initPricingToggle() {
    const toggle = document.getElementById('pricingToggle');
    const prices = document.querySelectorAll('.amount');
    
    if (!toggle || prices.length === 0) return;
    
    // Original prices (monthly)
    const originalPrices = [0, 49, 99];
    // Yearly prices (20% discount)
    const yearlyPrices = [0, 39, 79];
    
    toggle.addEventListener('change', () => {
        const isYearly = toggle.checked;
        
        prices.forEach((price, index) => {
            // Animate price change
            price.style.transform = 'scale(0.8)';
            price.style.opacity = '0';
            
            setTimeout(() => {
                price.textContent = isYearly ? yearlyPrices[index] : originalPrices[index];
                price.style.transform = 'scale(1)';
                price.style.opacity = '1';
            }, 200);
        });
        
        // Update period text
        const periods = document.querySelectorAll('.period');
        periods.forEach(period => {
            period.textContent = isYearly ? '/سنوياً' : '/شهرياً';
        });
    });
    
    // Add transition to prices
    prices.forEach(price => {
        price.style.transition = 'all 0.3s ease';
        price.style.display = 'inline-block';
    });
}

// ===================================
// Ripple Effect for Buttons
// ===================================
function initRippleEffect() {
    const buttons = document.querySelectorAll('.btn');
    
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            // Create ripple element
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            
            // Get click position
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            // Set ripple styles
            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            
            // Add ripple to button
            this.appendChild(ripple);
            
            // Remove ripple after animation
            setTimeout(() => ripple.remove(), 600);
        });
    });
}

// ===================================
// Smooth Scroll for Anchor Links
// ===================================
function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            if (href === '#') return;
            
            const target = document.querySelector(href);
            
            if (target) {
                e.preventDefault();
                
                const navHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = target.offsetTop - navHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ===================================
// Counter Animation (for stats)
// ===================================
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);
    
    const updateCounter = () => {
        start += increment;
        if (start < target) {
            element.textContent = Math.floor(start).toLocaleString('ar-EG');
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = '+' + target.toLocaleString('ar-EG');
        }
    };
    
    updateCounter();
}

// Initialize counters when visible
const observerOptions = {
    threshold: 0.5
};

const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const statNumbers = entry.target.querySelectorAll('.stat-number');
            statNumbers.forEach(stat => {
                const value = parseInt(stat.textContent.replace(/[+,\s]/g, ''));
                if (!isNaN(value)) {
                    animateCounter(stat, value);
                }
            });
            counterObserver.unobserve(entry.target);
        }
    });
}, observerOptions);

const heroStats = document.querySelector('.hero-stats');
if (heroStats) {
    counterObserver.observe(heroStats);
}

// ===================================
// Newsletter Form Handler
// ===================================
const newsletterForm = document.querySelector('.newsletter-form');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const input = this.querySelector('input[type="email"]');
        const email = input.value.trim();
        
        if (email && isValidEmail(email)) {
            // Show success message (in real app, send to server)
            showNotification('تم الاشتراك بنجاح! شكراً لك 🎉', 'success');
            input.value = '';
        } else {
            showNotification('يرجى إدخال بريد إلكتروني صحيح', 'error');
        }
    });
}

// ===================================
// Utility Functions
// ===================================

// Email Validation
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Show Notification
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) existingNotification.remove();
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '100px',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '15px 25px',
        borderRadius: '12px',
        background: type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        zIndex: '9999',
        animation: 'slideDown 0.3s ease forwards'
    });
    
    // Add animation keyframes
    if (!document.querySelector('#notification-styles')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'notification-styles';
        styleSheet.textContent = `
            @keyframes slideDown {
                from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
        `;
        document.head.appendChild(styleSheet);
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideDown 0.3s ease reverse forwards';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Debounce Function
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle Function
function throttle(func, limit = 300) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ===================================
// Parallax Effect (for hero section)
// ===================================
window.addEventListener('scroll', throttle(() => {
    const hero = document.querySelector('.hero');
    const scrolled = window.pageYOffset;
    
    if (hero && scrolled < window.innerHeight) {
        const sparkles = hero.querySelector('.sparkles');
        if (sparkles) {
            sparkles.style.transform = `translateY(${scrolled * 0.5}px)`;
        }
    }
}, 16));

// ===================================
// Lazy Loading Images
// ===================================
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                }
                observer.unobserve(img);
            }
        });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// ===================================
// Console Welcome Message
// ===================================
console.log(
    '%c💍 دعوة فرح %c Da3wat Farah ',
    'background: linear-gradient(135deg, #D4AF37, #F4E4BC); color: #1A1A2E; padding: 10px 20px; border-radius: 10px 0 10px 0; font-size: 16px; font-weight: bold;',
    'background: #1A1A2E; color: #D4AF37; padding: 10px 20px; border-radius: 0 10px 0 10px; font-size: 14px;'
);
console.log('%c🎉 مرحباً بك في كود دعوة فرح!', 'color: #D4AF37; font-size: 14px;');
