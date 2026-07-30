/**
 * دعوة فرح - Dashboard Module
 * Da3wat Farah - Dashboard Functionality
 */

// ===================================
// Global Variables
// ===================================
let currentWizardStep = 1;
let invitationData = {};

// ===================================
// Initialize Dashboard
// ===================================
document.addEventListener('DOMContentLoaded', function() {
    // Initialize AOS
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 600,
            once: true
        });
    }
    
    // Initialize components
    initSidebar();
    initNavigation();
    initWizard();
    initUploadAreas();
    initAIWriter();
    
    // Check authentication
    checkDashboardAuth();
});

// ===================================
// Authentication Check for Dashboard
// ===================================
function checkDashboardAuth() {
    // In a real app, this would check Firebase Auth state
    // For demo, we'll allow access
    
    const user = localStorage.getItem('da3watfarah_currentUser');
    if (!user) {
        // Redirect to login if not authenticated (optional)
        console.log('⚠️ No authenticated user found');
        // window.location.href = 'login.html';
    } else {
        console.log('✅ User authenticated:', JSON.parse(user).email);
    }
}

// ===================================
// Sidebar Toggle (Mobile)
// ===================================
function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('mobileSidebarBtn');
    const closeBtn = document.getElementById('sidebarClose');
    
    if (!sidebar) return;
    
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    }
    
    // Close sidebar when clicking on nav links (mobile)
    const navLinks = sidebar.querySelectorAll('.sidebar-nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 1024) {
                sidebar.classList.remove('open');
            }
        });
    });
}

// ===================================
// Section Navigation
// ===================================
function initNavigation() {
    const navLinks = document.querySelectorAll('.sidebar-nav a[data-section]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            showSection(section);
            
            // Update active state in nav
            navLinks.forEach(l => l.parentElement.classList.remove('active'));
            link.parentElement.classList.add('active');
        });
    });
}

function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.dashboard-section');
    sections.forEach(section => section.classList.remove('active'));
    
    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update page title
    const pageTitle = document.getElementById('pageTitle');
    const titles = {
        'overview': 'نظرة عامة',
        'create': 'إنشاء دعوة جديدة',
        'invitations': 'دعواتي',
        'gallery': 'معرض الصور',
        'music': 'الموسيقى',
        'ai': 'كاتب AI',
        'settings': 'الإعدادات'
    };
    
    if (pageTitle && titles[sectionId]) {
        pageTitle.textContent = titles[sectionId];
    }
    
    // Scroll to top of content
    const contentWrapper = document.querySelector('.content-wrapper');
    if (contentWrapper) {
        contentWrapper.scrollTop = 0;
    }
}

// ===================================
// Wizard Navigation
// ===================================
function initWizard() {
    // Template selection handlers
    const templateOptions = document.querySelectorAll('.template-option input[name="template"]');
    templateOptions.forEach(option => {
        option.addEventListener('change', () => {
            invitationData.template = option.value;
        });
    });
    
    // Color scheme selection
    const colorOptions = document.querySelectorAll('.color-option input[name="colorScheme"]');
    colorOptions.forEach(option => {
        option.addEventListener('change', () => {
            invitationData.colorScheme = option.value;
        });
    });
}

function nextWizardStep(step) {
    // Validate current step before proceeding
    if (step > currentWizardStep + 1 || step < currentWizardStep - 1) return;
    
    // Save current step data
    saveCurrentStepData();
    
    // Update wizard UI
    updateWizardUI(step);
    
    currentWizardStep = step;
    
    // Scroll to top of wizard
    const wizardContent = document.querySelector('.wizard-content.active');
    if (wizardContent) {
        wizardContent.scrollIntoView({ behavior: 'smooth' });
    }
}

function saveCurrentStepData() {
    switch(currentWizardStep) {
        case 1:
            invitationData.groomName = document.getElementById('groomNameCreate')?.value;
            invitationData.brideName = document.getElementById('brideNameCreate')?.value;
            invitationData.weddingDate = document.getElementById('weddingDate')?.value;
            invitationData.weddingTime = document.getElementById('weddingTime')?.value;
            invitationData.venueName = document.getElementById('venueName')?.value;
            invitationData.venueAddress = document.getElementById('venueAddress')?.value;
            invitationData.googleMapsLink = document.getElementById('googleMapsLink')?.value;
            invitationData.slug = document.getElementById('customSlug')?.value;
            break;
        case 3:
            invitationData.welcomeText = document.getElementById('welcomeText')?.value;
            invitationData.invitationText = document.getElementById('invitationText')?.value;
            invitationData.loveStory = document.getElementById('loveStory')?.value;
            invitationData.parentsNames = document.getElementById('parentsNames')?.value;
            invitationData.bgMusic = document.getElementById('bgMusic')?.value;
            break;
    }
}

function updateWizardUI(step) {
    // Hide all wizard content
    const contents = document.querySelectorAll('.wizard-content');
    contents.forEach(content => content.classList.remove('active'));
    
    // Show target content
    const targetContent = document.getElementById(`wizardStep${step}`);
    if (targetContent) {
        targetContent.classList.add('active');
    }
    
    // Update step indicators
    const steps = document.querySelectorAll('.wiz-step');
    const lines = document.querySelectorAll('.wiz-step-line');
    
    steps.forEach((s, index) => {
        const stepNum = parseInt(s.dataset.step);
        s.classList.remove('active', 'completed');
        
        if (stepNum === step) {
            s.classList.add('active');
        } else if (stepNum < step) {
            s.classList.add('completed');
        }
    });
    
    lines.forEach((line, index) => {
        line.classList.toggle('completed', index < step - 1);
    });
    
    // Generate preview URL when reaching step 4
    if (step === 4) {
        generatePreview();
    }
}

// ===================================
// Upload Areas
// ===================================
function initUploadAreas() {
    const uploadAreas = document.querySelectorAll('.upload-area');
    
    uploadAreas.forEach(area => {
        const input = area.querySelector('input[type="file"]');
        
        if (!input) return;
        
        // Click to upload
        area.addEventListener('click', () => input.click());
        
        // Drag and drop
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.style.borderColor = 'var(--primary-gold)';
            area.style.background = 'rgba(212, 175, 55, 0.05)';
        });
        
        area.addEventListener('dragleave', () => {
            area.style.borderColor = '#ddd';
            area.style.background = '';
        });
        
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.style.borderColor = '#ddd';
            area.style.background = '';
            
            const files = e.dataTransfer.files;
            handleFileUpload(files, area);
        });
        
        // File selected
        input.addEventListener('change', () => {
            handleFileUpload(input.files, area);
        });
    });
}

async function handleFileUpload(files, area) {
    if (!files.length) return;
    
    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showNotification('يرجى اختيار ملف صورة صالح', 'error');
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('حجم الملف يجب أن يكون أقل من 5 ميجابايت', 'error');
        return;
    }
    
    // Show loading state
    area.innerHTML = `
        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-gold);"></i>
        <p>جارٍ الرفع...</p>
    `;
    
    try {
        // Simulate upload (in real app, upload to Cloudflare R2)
        await simulateUpload(file);
        
        // Show success state with preview
        const reader = new FileReader();
        reader.onload = (e) => {
            area.innerHTML = `
                <img src="${e.target.result}" alt="Uploaded image" style="max-width: 100%; max-height: 200px; border-radius: 8px;">
                <p style="margin-top: 10px;"><i class="fas fa-check-circle" style="color: #10B981;"></i> تم الرفع بنجاح</p>
                <small>اضغط لتغيير الصورة</small>
            `;
            area.querySelector('input[type="file"]').files = files;
        };
        reader.readAsDataURL(file);
        
        showNotification('تم رفع الصورة بنجاح!', 'success');
        
    } catch (error) {
        console.error('Upload error:', error);
        area.innerHTML = `
            <i class="fas fa-cloud-upload-alt"></i>
            <p>اسحب الصورة هنا أو <span>تصفح</span></p>
            <small>PNG, JPG حتى 5MB</small>
        `;
        showNotification('حدث خطأ أثناء رفع الصورة', 'error');
    }
}

function simulateUpload(file) {
    return new Promise((resolve) => {
        setTimeout(resolve, 1500); // Simulate network delay
    });
}

// ===================================
// AI Writer Integration
// ===================================
function initAIWriter() {
    const aiForm = document.getElementById('aiWriterForm');
    if (!aiForm) return;
    
    aiForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await generateAIContent();
    });
}

async function generateAIContent() {
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    
    // Get form values
    const textType = document.getElementById('aiTextType')?.value || 'invitation';
    const groomName = document.getElementById('aiGroomName')?.value || invitationData.groomName || 'العريس';
    const brideName = document.getElementById('aiBrideName')?.value || invitationData.brideName || 'العروسة';
    const weddingDate = document.getElementById('aiWeddingDate')?.value || invitationData.weddingDate || '';
    const venue = document.getElementById('aiVenue')?.value || invitationData.venueName || '';
    const extraNotes = document.getElementById('aiExtraNotes')?.value || '';
    
    // Validate required fields
    if (!groomName || !brideName) {
        showNotification('يرجى إدخال أسماء العروسين', 'error');
        return;
    }
    
    // Show loading state
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جارٍ التوليد...';
    
    try {
        // Call NVIDIA AI API
        const generatedText = await callNVIDIA_AI({
            type: textType,
            groomName,
            brideName,
            weddingDate,
            venue,
            extraNotes
        });
        
        // Display result
        displayAIResult(generatedText);
        
    } catch (error) {
        console.error('AI generation error:', error);
        showNotification('حدث خطأ في توليد النص، يرجى المحاولة مرة أخرى', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function callNVIDIA_AI(params) {
    // In production, this would call your backend which calls NVIDIA AI
    // For demo, we'll generate placeholder text
    
    const { type, groomName, brideName, weddingDate, venue, extraNotes } = params;
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate different text based on type
    const templates = {
        invitation: `بسم الله الرحمن الرحيم

قال تعالى: ﴿وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا لِّتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً﴾

يسرنا ويسعدنا أن ندعوكم لحضور زفاف ابنتنا الحبيبة
${brideName}
مع فارس أحلامها
${groomName}

في يوم ${formatArabicDate(weddingDate)}
بإذن الله تعالى

📍 ${venue || 'سيتم تحديد المكان لاحقاً'}

نأمل تشريفكم ومشاركتنا فرحتنا

والسلام عليكم ورحمة الله وبركاته`,

        romantic: `💕 قصة حب بدأت بكلمة...

عندما التقينا لأول مرة، لم نكن نعلم أن هذه البداية ستقودنا إلى هذا اليوم الجميل...

اليوم، وبكل حب وفخر، نعلن عن اتحاد قلوبنا
${groomName} ❤️ ${brideName}

سنبدأ معاً رحلة العمر...
ونأمل أن تكونوا بجانبنا في هذه اللحظات الخاصة

📅 ${formatArabicDate(weddingDate)}
📍 ${venue || 'قريباً}`,

        islamic: `﷽

{بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ}

الحمد لله رب العالمين والصلاة والسلام على أشرف الأنبياء والمرسلين

نبشركم بمقدم موسم الفرح والسرور
بزفاف العروسين الكريمين

${groomName}
و
${brideName}

سائلي الله أن يجمع بينهما في خير ويبارك لهما ويجعل شأنهما إلى خير

التاريخ: ${formatArabicDate(weddingDate)}
المكان: ${venue || 'سيتم الإعلان لاحقاً}

﴿رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ﴾`,

        modern: `✨ أنتم مدعوون! ✨

احتفلوا معنا!

${groomName} & ${brideName}

يتزوجان! 💍

📅 ${formatArabicDate(weddingDate)}
📍 ${venue || 'المكان قريباً'}

انتظروكم لنكون معاً في أجمل لحظات حياتنا 🎉`,

        story: `💫 كيف التقينا... 💫

في يوم عادي من أيام السنة، كانت القدرة ترتب لقاء غير متوقع بين شخصين لم يتخيلا أبداً أن مصيرهما سيلتقي...

${groomName} كان يبحث عن شيء ما...
${brideName} كانت تبحث عن شيء آخر...

لكن القدر جمعهما في مكان واحد، وفي تلك اللحظة، بدأت قصتهما التي ستستمر مدى الحياة...

والآن، بعد رحلة جميلة من الحب والتفاهم، قررا أن يبدأا فصل جديد معاً...

📍 انضموا إلينا في ${formatArabicDate(weddingDate)} لتحتفلوا معنا بهذه البداية الجديدة!`
    };
    
    return templates[type] || templates.invitation;
}

function formatArabicDate(dateStr) {
    if (!dateStr) return 'قريباً';
    
    const date = new Date(dateStr);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('ar-SA', options);
}

function displayAIResult(text) {
    const resultDiv = document.getElementById('aiResult');
    const textDiv = document.getElementById('aiGeneratedText');
    
    if (resultDiv && textDiv) {
        textDiv.textContent = text;
        resultDiv.style.display = 'block';
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function copyAIText() {
    const textDiv = document.getElementById('aiGeneratedText');
    if (textDiv) {
        navigator.clipboard.writeText(textDiv.textContent);
        showNotification('تم نسخ النص بنجاح!', 'success');
    }
}

function useInInvitation() {
    const textDiv = document.getElementById('aiGeneratedText');
    const invitationTextarea = document.getElementById('invitationText');
    
    if (textDiv && invitationTextarea) {
        invitationTextarea.value = textDiv.textContent;
        showSection('create');
        nextWizardStep(3);
        showNotification('تم نقل النص إلى محرر الدعوة!', 'success');
    }
}

function regenerateAI() {
    generateAIContent();
}

// ===================================
// Preview Generation
// ===================================
function generatePreview() {
    const previewScreen = document.getElementById('previewScreenMini');
    const urlDisplay = document.getElementById('finalInvitationUrl');
    const qrContainer = document.getElementById('qrCodePreview');
    
    if (!previewScreen) return;
    
    // Generate URL
    const slug = invitationData.slug || `${invitationData.groomName || 'couple'}-${invitationData.brideName || 'name'}`;
    const fullUrl = `da3watfarah.com/${slug.replace(/\s+/g, '-').toLowerCase()}`;
    
    if (urlDisplay) {
        urlDisplay.textContent = fullUrl;
    }
    
    // Generate mini preview
    const templateClass = invitationData.template || 'classic';
    previewScreen.innerHTML = `
        <div class="mini-invitation-preview ${templateClass}-preview">
            <div class="mini-bismillah">بسم الله الرحمن الرحيم</div>
            <h3>${invitationData.groomName || 'العريس'} & ${invitationData.brideName || 'العروسة'}</h3>
            <div class="preview-line"></div>
            <p class="preview-date">${formatArabicDate(invitationData.weddingDate)}</p>
            <div class="preview-venue">${invitationData.venueName || 'المكان'}</div>
        </div>
    `;
    
    // Generate QR Code
    if (qrContainer && typeof QRCode !== 'undefined') {
        qrContainer.innerHTML = '';
        new QRCode(qrContainer, {
            text: `https://${fullUrl}`,
            width: 150,
            height: 150,
            colorDark: '#1A1A2E',
            colorLight: '#FFFFFF',
            correctLevel: QRCode.CorrectLevel.H
        });
    }
}

function openPreview() {
    // Open full preview in new tab/window
    const slug = invitationData.slug || 'preview';
    window.open(`invitation.html?preview=true&slug=${slug}`, '_blank');
}

function copyInvitationUrl() {
    const urlDisplay = document.getElementById('finalInvitationUrl');
    if (urlDisplay) {
        navigator.clipboard.writeText(`https://${urlDisplay.textContent}`);
        showNotification('تم نسخ الرابط بنجاح!', 'success');
    }
}

// ===================================
// Publish Invitation
// ===================================
async function publishInvitation() {
    // Gather all data
    saveCurrentStepData();
    
    // Validate required fields
    if (!invitationData.groomName || !invitationData.brideName) {
        showNotification('يرجى إدخال أسماء العروسين', 'error');
        nextWizardStep(1);
        return;
    }
    
    if (!invitationData.weddingDate) {
        showNotification('يرجى تحديد تاريخ الزفاف', 'error');
        nextWizardStep(1);
        return;
    }
    
    if (!invitationData.slug) {
        showNotification('يرجى إدخال رابط الدعوة', 'error');
        nextWizardStep(1);
        return;
    }
    
    // Show publishing state
    const publishBtn = document.querySelector('.wizard-buttons.final .btn-success');
    if (publishBtn) {
        publishBtn.disabled = true;
        publishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جارٍ النشر...';
    }
    
    try {
        // Simulate saving to database
        await saveInvitationToDatabase(invitationData);
        
        // Show success message
        showSuccessPublishModal();
        
    } catch (error) {
        console.error('Publish error:', error);
        showNotification('حدث خطأ أثناء نشر الدعوة، يرجى المحاولة مرة أخرى', 'error');
        
        if (publishBtn) {
            publishBtn.disabled = false;
            publishBtn.innerHTML = '<i class="fas fa-rocket"></i> نشر الدعوة الآن!';
        }
    }
}

async function saveInvitationToDatabase(data) {
    // Simulate API call
    return new Promise((resolve) => {
        setTimeout(() => {
            // Save to localStorage for demo
            const invitations = JSON.parse(localStorage.getItem('da3watfarah_invitations') || '[]');
            const newInvitation = {
                id: Date.now().toString(),
                ...data,
                createdAt: new Date().toISOString(),
                status: 'published',
                views: 0,
                rsvps: []
            };
            invitations.push(newInvitation);
            localStorage.setItem('da3watfarah_invitations', JSON.stringify(invitations));
            
            resolve(newInvitation);
        }, 2000);
    });
}

function showSuccessPublishModal() {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = 'display:flex;';
    modal.innerHTML = `
        <div class="modal-content success-modal" style="text-align:center;">
            <div class="success-animation">
                <div class="checkmark-circle">
                    <svg viewBox="0 0 52 52" class="checkmark-svg">
                        <circle cx="26" cy="26" r="25" fill="none"/>
                        <path fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                    </svg>
                </div>
            </div>
            <h3>تم نشر الدعوة بنجاح! 🎉</h3>
            <p>دعوتك الآن متاحة للضيوف عبر الرابط:</p>
            <code style="background:#f5f5f5;padding:10px 20px;border-radius:8px;display:inline-block;margin:15px 0;font-size:1rem;">
                https://${document.getElementById('finalInvitationUrl')?.textContent || 'da3watfarah.com/your-slug'}
            </code>
            <div style="display:flex;gap:10px;justify-content:center;margin-top:20px;flex-wrap:wrap;">
                <a href="#" onclick="window.open('invitation.html?slug=${invitationData.slug}','_blank')" class="btn btn-primary">
                    <i class="fas fa-eye"></i> معاينة الدعوة
                </a>
                <button onclick="copyInvitationUrl();this.closest('.modal-overlay').remove();" class="btn btn-outline">
                    <i class="fas fa-copy"></i> نسخ الرابط
                </button>
                <button onclick="this.closest('.modal-overlay').remove();showSection('invitations');" class="btn btn-glass">
                    دعواتي
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// ===================================
// Utility Functions
// ===================================

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
        top: '80px',
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

// Add styles for mini preview
const previewStyles = document.createElement('style');
previewStyles.textContent = `
    .mini-invitation-preview {
        padding: 30px 20px;
        text-align: center;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }
    
    .mini-invitation-preview .mini-bismillah {
        font-family: var(--font-aref);
        font-size: 0.9rem;
        margin-bottom: 15px;
    }
    
    .mini-invitation-preview h3 {
        font-family: var(--font-aref);
        font-size: 1.4rem;
        margin-bottom: 10px;
    }
    
    .mini-invitation-preview .preview-line {
        width: 40px;
        height: 2px;
        background: currentColor;
        margin: 10px auto;
    }
    
    .mini-invitation-preview .preview-date {
        font-size: 0.85rem;
        opacity: 0.8;
        margin-bottom: 8px;
    }
    
    .mini-invitation-preview .preview-venue {
        font-size: 0.8rem;
        opacity: 0.7;
    }
    
    /* Preview theme colors */
    .classic-preview { background: linear-gradient(180deg, #1a1a2e, #2d2d44); color: #D4AF37; }
    .modern-preview { background: linear-gradient(180deg, #f8f9fa, #e9ecef); color: #333; }
    .romantic-preview { background: linear-gradient(180deg, #fce4ec, #f8bbd0); color: #c2185b; }
    .islamic-preview { background: linear-gradient(180deg, #1b5e20, #2e7d32); color: #c8e6c9; }
    .bohemian-preview { background: linear-gradient(180deg, #fff8e1, #ffecb3); color: #8d6e63; }
    .royal-preview { background: linear-gradient(180deg, #212121, #424242); color: #ffd700; }
`;
document.head.appendChild(previewStyles);

console.log('✅ Dashboard module loaded successfully');
