/**
 * دعوة فرح - Invitation Page JavaScript
 * Public Invitation View - Interactive Features
 */

// ===================================
// Global Variables
// ===================================
let currentLightboxIndex = 0;
let galleryImages = [];
let countdownInterval = null;
let isMusicPlaying = false;

// Invitation Data (would come from database in production)
const invitationData = {
    groomName: 'أحمد',
    brideName: 'سارة',
    weddingDate: '2025-08-15T20:00:00',
    venueName: 'فندق الريتز كارلتون',
    venueAddress: 'الرياض، المملكة العربية السعودية',
    googleMapsUrl: 'https://maps.google.com/?q=Ritz+Carlton+Riyadh',
    welcomeText: '﴿وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا لِّتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً﴾',
    invitationText: 'يسرنا ويسعدنا أن ندعوكم لحضور زفاف ابنتنا الحبيبة سارة مع فارس أحلامها أحمد',
    parentsNames: 'الأب: محمد أحمد | الأم: فاطمة علي',
    slug: 'ahmed-sara'
};

// ===================================
// Initialize
// ===================================
document.addEventListener('DOMContentLoaded', function() {
    // Initialize AOS
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            easing: 'ease-out-cubic',
            once: true,
            offset: 50
        });
    }
    
    // Load invitation data from URL or API
    loadInvitationData();
    
    // Initialize components
    initCountdown();
    initMusicPlayer();
    initGallery();
    initRSVPForm();
    initSmoothScroll();
    
    // Hide loader after content loads
    hideLoader();
});

// ===================================
// Loader
// ===================================
function hideLoader() {
    const loader = document.getElementById('invitationLoader');
    const container = document.getElementById('invitationContainer');
    
    setTimeout(() => {
        if (loader) {
            loader.classList.add('hidden');
            setTimeout(() => loader.remove(), 500);
        }
        
        if (container) {
            container.classList.add('loaded');
        }
        
        // Start music after user interaction (browser policy)
        document.body.addEventListener('click', enableAutoplay, { once: true });
        document.body.addEventListener('touchstart', enableAutoplay, { once: true });
        
    }, 1500);
}

function enableAutoplay() {
    const audio = document.getElementById('bgMusic');
    if (audio) {
        audio.volume = 0.5;
    }
}

// ===================================
// Load Invitation Data
// ===================================
function loadInvitationData() {
    // Get slug from URL
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug') || window.location.pathname.split('/').pop().replace('.html', '');
    
    // In production, fetch data from API based on slug
    // For demo, use the default data
    
    updateInvitationUI(invitationData);
}

function updateInvitationUI(data) {
    // Update names
    const groomNameEl = document.getElementById('groomName');
    const brideNameEl = document.getElementById('brideName');
    
    if (groomNameEl) groomNameEl.textContent = data.groomName;
    if (brideNameEl) brideNameEl.textContent = data.brideName;
    
    // Update page title
    document.title = `دعوة زفاف ${data.groomName} & ${data.brideName} | دعوة فرح`;
    
    // Update meta tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    
    if (ogTitle) ogTitle.content = `دعوة زفاف ${data.groomName} & ${data.brideName}`;
    if (ogDescription) ogDescription.content = data.invitationText || 'يسرنا دعوتكم لحضور زفافنا';
    
    // Update welcome text
    const welcomeTextEl = document.getElementById('welcomeText');
    if (welcomeTextEl && data.welcomeText) {
        welcomeTextEl.innerHTML = `<p>${data.welcomeText}</p>`;
    }
    
    // Update invitation text
    const invitationTextEl = document.getElementById('invitationText');
    if (invitationTextEl && data.invitationText) {
        invitationTextEl.querySelector('.main-invitation-text').innerHTML = data.invitationText;
    }
    
    // Update love story (optional section - only shown if the couple actually wrote one)
    const loveStorySection = document.getElementById('loveStorySection');
    const loveStoryContent = document.getElementById('loveStoryContent');
    if (loveStorySection && loveStoryContent) {
        const loveStory = (data.loveStory || '').trim();
        if (loveStory) {
            // Allow the couple to separate multiple moments with a blank line;
            // each becomes its own timeline item. A single paragraph still works fine.
            const chapters = loveStory.split(/\n\s*\n/).map(c => c.trim()).filter(Boolean);
            loveStoryContent.innerHTML = chapters.map(chapter => `
                <div class="timeline-item">
                    <p>${chapter.replace(/\n/g, '<br>')}</p>
                </div>
            `).join('');
            loveStorySection.style.display = '';
        } else {
            loveStoryContent.innerHTML = '';
            loveStorySection.style.display = 'none';
        }
    }

    // Update parents names
    const parentsNamesEl = document.getElementById('parentsNames');
    if (parentsNamesEl && data.parentsNames) {
        parentsNamesEl.querySelector('span').textContent = data.parentsNames;
    }
    
    // Update wedding date
    const weddingDateEl = document.getElementById('weddingDate');
    if (weddingDateEl && data.weddingDate) {
        weddingDateEl.textContent = formatArabicDate(data.weddingDate);
    }
    
    // Update venue info
    const venueInfoEl = document.getElementById('venueInfo');
    if (venueInfoEl && data.venueName) {
        venueInfoEl.querySelector('span').textContent = `${data.venueName}, ${data.venueAddress || ''}`;
    }
    
    // Update map link
    const directionsLink = document.getElementById('directionsLink');
    if (directionsLink && data.googleMapsUrl) {
        directionsLink.href = data.googleMapsUrl;
    }
    
    // Update map iframe
    const mapEmbed = document.getElementById('mapEmbed');
    if (mapEmbed && data.googleMapsUrl) {
        const embedUrl = data.googleMapsUrl.replace('maps.google.com/maps', 'www.google.com/maps/embed');
        mapEmbed.querySelector('iframe').src = embedUrl + '&output=embed';
    }
}

// ===================================
// Countdown Timer
// ===================================
function initCountdown() {
    if (!invitationData.weddingDate) return;
    
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
}

function updateCountdown() {
    const weddingDate = new Date(invitationData.weddingDate).getTime();
    const now = new Date().getTime();
    const distance = weddingDate - now;
    
    // If wedding date has passed
    if (distance < 0) {
        clearInterval(countdownInterval);
        setCountdownValues(0, 0, 0, 0);
        return;
    }
    
    // Calculate time units
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    
    setCountdownValues(days, hours, minutes, seconds);
}

function setCountdownValues(days, hours, minutes, seconds) {
    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');
    
    if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
    if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
    if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
    if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
}

// ===================================
// Music Player
// ===================================
function initMusicPlayer() {
    const toggleBtn = document.getElementById('musicToggle');
    const audio = document.getElementById('bgMusic');
    
    if (!toggleBtn || !audio) return;
    
    toggleBtn.addEventListener('click', toggleMusic);
    
    // Handle audio events
    audio.addEventListener('play', () => {
        isMusicPlaying = true;
        toggleBtn.classList.add('playing');
        toggleBtn.innerHTML = '<i class="fas fa-pause"></i>';
    });
    
    audio.addEventListener('pause', () => {
        isMusicPlaying = false;
        toggleBtn.classList.remove('playing');
        toggleBtn.innerHTML = '<i class="fas fa-music"></i>';
    });
}

function toggleMusic() {
    const audio = document.getElementById('bgMusic');
    
    if (!audio) return;
    
    if (isMusicPlaying) {
        audio.pause();
    } else {
        audio.play().catch(e => console.log('Autoplay prevented:', e));
    }
}

// ===================================
// Photo Gallery & Lightbox
// ===================================
function initGallery() {
    const galleryItems = document.querySelectorAll('.gallery-item img');
    
    galleryItems.forEach((img, index) => {
        galleryImages.push(img.src);
        
        img.parentElement.addEventListener('click', () => openLightbox(index));
    });
}

function openLightbox(index) {
    currentLightboxIndex = index;
    const modal = document.getElementById('lightboxModal');
    const lightboxImg = document.getElementById('lightboxImage');
    
    if (modal && lightboxImg) {
        lightboxImg.src = galleryImages[index];
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeLightbox() {
    const modal = document.getElementById('lightboxModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function changeLightboxImage(direction) {
    currentLightboxIndex += direction;
    
    if (currentLightboxIndex < 0) {
        currentLightboxIndex = galleryImages.length - 1;
    } else if (currentLightboxIndex >= galleryImages.length) {
        currentLightboxIndex = 0;
    }
    
    const lightboxImg = document.getElementById('lightboxImage');
    if (lightboxImg) {
        lightboxImg.src = galleryImages[currentLightboxIndex];
    }
}

// Close lightbox on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') changeLightboxImage(1); // RTL
    if (e.key === 'ArrowRight') changeLightboxImage(-1); // RTL
});

// Close lightbox when clicking outside image
const lightboxModal = document.getElementById('lightboxModal');
if (lightboxModal) {
    lightboxModal.addEventListener('click', (e) => {
        if (e.target === lightboxModal) closeLightbox();
    });
}

// ===================================
// RSVP Form
// ===================================
function initRSVPForm() {
    const form = document.getElementById('rsvpForm');
    if (!form) return;
    
    form.addEventListener('submit', handleRSVPSubmit);
}

async function handleRSVPSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        name: formData.get('guestName'),
        guests: formData.get('guestCount'),
        attendance: formData.get('attendance'),
        message: formData.get('message'),
        invitationSlug: invitationData.slug,
        timestamp: new Date().toISOString()
    };
    
    // Validate
    if (!data.name || !data.attendance) {
        showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    // Get submit button
    const submitBtn = e.target.querySelector('.rsvp-submit-btn');
    const originalText = submitBtn.innerHTML;
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جارٍ الإرسال...';
    
    try {
        // Simulate API call
        await saveRSVP(data);
        
        // Show success state
        e.target.style.display = 'none';
        const successDiv = document.getElementById('rsvpSuccess');
        if (successDiv) successDiv.style.display = 'block';
        
        // Add to wishes wall
        addWishToWall(data);
        
        showNotification('شكراً لتأكيد حضوركم! 🎉', 'success');
        
    } catch (error) {
        console.error('RSVP error:', error);
        showNotification('حدث خطأ، يرجى المحاولة مرة أخرى', 'error');
        
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

async function saveRSVP(data) {
    // Simulate API call
    return new Promise((resolve) => {
        setTimeout(() => {
            // Save to localStorage for demo
            const rsvps = JSON.parse(localStorage.getItem('da3watfarah_rsvps') || '[]');
            rsvps.push(data);
            localStorage.setItem('da3watfarah_rsvps', JSON.stringify(rsvps));
            
            resolve(true);
        }, 1500);
    });
}

function addWishToWall(data) {
    const wishesList = document.getElementById('wishesList');
    if (!wishesList) return;
    
    const wishCard = document.createElement('div');
    wishCard.className = 'wish-card';
    wishCard.setAttribute('data-aos', 'fade-up');
    wishCard.innerHTML = `
        <div class="wish-avatar">${data.name.charAt(0)}</div>
        <div class="wish-content">
            <h4>${data.name}</h4>
            <p>${data.message || (data.attendance === 'attending' ? 'سأحضر بإذن الله ✓' : 'أعتذر عن عدم الحضور')}</p>
            <span class="wish-time">الآن</span>
        </div>
    `;
    
    wishesList.insertBefore(wishCard, wishesList.firstChild);
    
    // Re-initialize AOS for new element
    if (typeof AOS !== 'undefined') {
        AOS.refresh();
    }
}

// ===================================
// Share Functions
// ===================================
function shareOnWhatsApp() {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`✨ دعوتكم لحضور زفاف ${invitationData.groomName} & ${invitationData.brideName}`);
    window.open(`https://wa.me/?text=${text}%20${url}`, '_blank');
}

function shareOnTwitter() {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`✨ دعوتكم لحضور زفاف ${invitationData.groomName} & ${invitationData.brideName}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
}

function shareOnTelegram() {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`✨ دعوتكم لحضور زفاف ${invitationData.groomName} & ${invitationData.brideName}`);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
}

function copyInvitationLink() {
    navigator.clipboard.writeText(window.location.href)
        .then(() => showNotification('تم نسخ الرابط بنجاح!', 'success'))
        .catch(() => showNotification('فشل نسخ الرابط', 'error'));
}

// ===================================
// Smooth Scroll
// ===================================
function initSmoothScroll() {
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
        scrollIndicator.addEventListener('click', () => {
            const coverHeight = document.getElementById('invCover')?.offsetHeight || window.innerHeight;
            window.scrollTo({
                top: coverHeight,
                behavior: 'smooth'
            });
        });
    }
}

// ===================================
// Utility Functions
// ===================================

function formatArabicDate(dateString) {
    const date = new Date(dateString);
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    return date.toLocaleDateString('ar-SA', options);
}

function showNotification(message, type = 'info') {
    // Remove existing notification
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
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
        zIndex: '99999',
        animation: 'slideDown 0.3s ease forwards',
        maxWidth: '90%'
    });
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideDown 0.3s ease reverse forwards';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Add animation keyframes if not exists
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

// Console Welcome Message
console.log('%c💍 دعوة فرح %c Da3wat Farah ', 
    'background: linear-gradient(135deg, #D4AF37, #F4E4BC); color: #1A1A2E; padding: 10px 20px; border-radius: 10px 0 10px 0; font-size: 16px;',
    'background: #1A1A2E; color: #D4AF37; padding: 10px 20px; border-radius: 0 10px 0 10px;'
);
console.log('%c🎉 مرحباً بضيفنا الكريم!', 'color: #D4AF37; font-size: 14px;');