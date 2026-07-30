/**
 * دعوة فرح - Authentication Module
 * Da3wat Farah - Auth (Login & Register)
 */

// ===================================
// Global Variables
// ===================================
let currentUser = null;

// ===================================
// Initialize AOS
// ===================================
document.addEventListener('DOMContentLoaded', function() {
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            easing: 'ease-out-cubic',
            once: true
        });
    }
    
    // Check if user is already logged in
    checkAuthState();
    
    // Initialize form handlers
    initLoginForm();
    initRegisterForm();
    initForgotPasswordForm();
    initSocialLogin();
});

// ===================================
// Auth State Observer
// ===================================
function checkAuthState() {
    if (!window.firebaseAuth) {
        console.warn('Firebase Auth not initialized');
        return;
    }
    
    window.firebaseAuth.onAuthStateChanged((user) => {
        currentUser = user;
        
        if (user) {
            console.log('✅ User is signed in:', user.email);
            // User is signed in, redirect to dashboard if on auth pages
            const currentPage = window.location.pathname.split('/').pop();
            if (currentPage === 'login.html' || currentPage === 'register.html') {
                // Optional: redirect to dashboard
                // window.location.href = 'dashboard.html';
            }
        } else {
            console.log('👤 User is signed out');
        }
    });
}

// ===================================
// Login Form Handler
// ===================================
function initLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;
    
    // Toggle Password Visibility
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            
            const icon = togglePassword.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }
    
    // Form Submit
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        
        // Validate
        if (!validateLoginForm(email, password)) return;
        
        // Show loading state
        setButtonLoading('loginBtn', true);
        hideError('loginError');
        
        try {
            // Sign in with Firebase
            const userCredential = await window.firebaseAuth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            console.log('✅ Login successful:', user.email);
            
            // Show success message
            showNotification('تم تسجيل الدخول بنجاح! جاري التحويل...', 'success');
            
            // Redirect to dashboard after short delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            
        } catch (error) {
            console.error('❌ Login error:', error.code, error.message);
            
            let errorMessage = getAuthErrorMessage(error.code);
            showError('loginError', errorMessage);
        } finally {
            setButtonLoading('loginBtn', false);
        }
    });
}

// ===================================
// Register Form Handler
// ===================================
function initRegisterForm() {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;
    
    // Toggle Passwords Visibility
    setupTogglePassword('togglePassword', 'password');
    setupTogglePassword('toggleConfirmPassword', 'confirmPassword');
    
    // Password Strength Checker
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', () => {
            updatePasswordStrength(passwordInput.value);
        });
    }
    
    // Form Submit
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const groomName = document.getElementById('groomName').value.trim();
        const brideName = document.getElementById('brideName').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const termsAccepted = document.getElementById('terms').checked;
        
        // Validate
        if (!validateRegisterForm(groomName, brideName, email, phone, password, confirmPassword, termsAccepted)) return;
        
        // Show loading state
        setButtonLoading('registerBtn', true);
        hideError('registerError');
        
        try {
            // Create user with Firebase
            const userCredential = await window.firebaseAuth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            console.log('✅ Registration successful:', user.email);
            
            // Save additional user data to database (you would implement this with Firestore/Realtime DB)
            await saveUserData(user.uid, {
                groomName,
                brideName,
                email,
                phone,
                createdAt: new Date().toISOString()
            });
            
            // Show success modal
            showSuccessModal();
            
        } catch (error) {
            console.error('❌ Registration error:', error.code, error.message);
            
            let errorMessage = getAuthErrorMessage(error.code);
            showError('registerError', errorMessage);
        } finally {
            setButtonLoading('registerBtn', false);
        }
    });
}

// ===================================
// Forgot Password Handler
// ===================================
function initForgotPasswordForm() {
    const forgotForm = document.getElementById('forgotForm');
    if (!forgotForm) return;
    
    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('resetEmail').value.trim();
        
        if (!isValidEmail(email)) {
            showNotification('يرجى إدخال بريد إلكتروني صحيح', 'error');
            return;
        }
        
        try {
            await window.firebaseAuth.sendPasswordResetEmail(email);
            showNotification('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني', 'success');
            closeForgotPassword();
        } catch (error) {
            console.error('❌ Password reset error:', error);
            showNotification(getAuthErrorMessage(error.code), 'error');
        }
    });
}

// ===================================
// Social Login Handlers
// ===================================
function initSocialLogin() {
    // Google Login
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const googleRegisterBtn = document.getElementById('googleRegisterBtn');
    
    [googleLoginBtn, googleRegisterBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', handleGoogleSignIn);
        }
    });
    
    // Apple Login (if available)
    const appleLoginBtn = document.getElementById('appleLoginBtn');
    const appleRegisterBtn = document.getElementById('appleRegisterBtn');
    
    [appleLoginBtn, appleRegisterBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                showNotification('تسجيل الدخول بحساب Apple قريباً!', 'info');
            });
        }
    });
}

async function handleGoogleSignIn() {
    try {
        // Check if Firebase Auth is initialized
        if (!window.firebaseAuth) {
            showNotification('Firebase لم يتم تهيئته بشكل صحيح', 'error');
            return;
        }
        
        // Show loading state
        showNotification('جارٍ الاتصال بـ Google...', 'info');
        
        // Create Google Auth Provider with custom parameters
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        provider.setCustomParameters({
            prompt: 'select_account',
            access_type: 'offline'
        });
        
        // Sign in with popup
        const result = await window.firebaseAuth.signInWithPopup(provider);
        const user = result.user;
        
        console.log('✅ Google sign-in successful:', {
            displayName: user.displayName,
            email: user.email,
            uid: user.uid,
            isNewUser: result.additionalUserInfo.isNewUser
        });
        
        // Check if new user
        if (result.additionalUserInfo && result.additionalUserInfo.isNewUser) {
            // Save new user data to Firestore
            await saveUserData(user.uid, {
                displayName: user.displayName || '',
                email: user.email || '',
                photoURL: user.photoURL || '',
                provider: 'google',
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            });
            
            showNotification('تم إنشاء الحساب بنجاح! مرحباً بك 🎉', 'success');
        } else {
            // Update last login time
            await updateUserLastLogin(user.uid);
            showNotification('مرحباً بعودتك! ✨', 'success');
        }
        
        // Redirect to dashboard after short delay
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } catch (error) {
        console.error('❌ Google sign-in error:', error.code, error.message);
        
        // Handle specific errors
        let errorMessage = 'حدث خطأ في تسجيل الدخول بحساب Google';
        
        switch (error.code) {
            case 'auth/popup-closed-by-user':
                errorMessage = 'تم إلغاء تسجيل الدخول';
                break;
            case 'auth/popup-blocked':
                errorMessage = 'تم حظر النافذة المنبثقة، يرجى السماح بها';
                break;
            case 'auth/cancelled-popup-request':
                errorMessage = 'يوجد نافذة مفتوحة بالفعل، يرجى إغلاقها والمحاولة مرة أخرى';
                break;
            case 'auth/user-disabled':
                errorMessage = 'هذا الحساب معطل، يرجى التواصل مع الدعم';
                break;
            case 'auth/invalid-api-key':
                errorMessage = 'مفتاح API غير صالح، يرجى التحقق من الإعدادات';
                break;
            default:
                errorMessage = `خطأ: ${error.message || 'حدث خطأ غير متوقع'}`;
        }
        
        showNotification(errorMessage, 'error');
    }
}

// ===================================
// Validation Functions
// ===================================

function validateLoginForm(email, password) {
    let isValid = true;
    
    if (!email) {
        showErrorField('emailError', 'يرجى إدخال البريد الإلكتروني');
        isValid = false;
    } else if (!isValidEmail(email)) {
        showErrorField('emailError', 'يرجى إدخال بريد إلكتروني صحيح');
        isValid = false;
    } else {
        hideErrorField('emailError');
    }
    
    if (!password) {
        showErrorField('passwordError', 'يرجى إدخال كلمة المرور');
        isValid = false;
    } else if (password.length < 6) {
        showErrorField('passwordError', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        isValid = false;
    } else {
        hideErrorField('passwordError');
    }
    
    return isValid;
}

function validateRegisterForm(groomName, brideName, email, phone, password, confirmPassword, termsAccepted) {
    let isValid = true;
    
    // Groom Name
    if (!groomName) {
        showErrorField('groomNameError', 'يرجى إدخال اسم العريس');
        isValid = false;
    } else if (groomName.length < 2) {
        showErrorField('groomNameError', 'اسم العريس يجب أن يكون حرفين على الأقل');
        isValid = false;
    } else {
        hideErrorField('groomNameError');
    }
    
    // Bride Name
    if (!brideName) {
        showErrorField('brideNameError', 'يرجى إدخال اسم العروسة');
        isValid = false;
    } else if (brideName.length < 2) {
        showErrorField('brideNameError', 'اسم العروسة يجب أن يكون حرفين على الأقل');
        isValid = false;
    } else {
        hideErrorField('brideNameError');
    }
    
    // Email
    if (!email) {
        showErrorField('emailError', 'يرجى إدخال البريد الإلكتروني');
        isValid = false;
    } else if (!isValidEmail(email)) {
        showErrorField('emailError', 'يرجى إدخال بريد إلكتروني صحيح');
        isValid = false;
    } else {
        hideErrorField('emailError');
    }
    
    // Phone (optional but validate if provided)
    if (phone && !isValidPhone(phone)) {
        showErrorField('phoneError', 'يرجى إدخال رقم جوال صحيح');
        isValid = false;
    }
    
    // Password
    if (!password) {
        showErrorField('passwordError', 'يرجى إدخال كلمة المرور');
        isValid = false;
    } else if (password.length < 8) {
        showErrorField('passwordError', 'كلمة المرور يجب أن تكون 8 أحرف على الأقل');
        isValid = false;
    } else {
        hideErrorField('passwordError');
    }
    
    // Confirm Password
    if (password !== confirmPassword) {
        showErrorField('confirmPasswordError', 'كلمات المرور غير متطابقة');
        isValid = false;
    } else {
        hideErrorField('confirmPasswordError');
    }
    
    // Terms
    if (!termsAccepted) {
        showErrorField('termsError', 'يجب الموافقة على الشروط والأحكام');
        isValid = false;
    } else {
        hideErrorField('termsError');
    }
    
    return isValid;
}

// ===================================
// Password Strength Checker
// ===================================
function updatePasswordStrength(password) {
    const strengthContainer = document.getElementById('passwordStrength');
    const strengthBar = strengthContainer?.querySelector('.strength-bar');
    const strengthText = strengthContainer?.querySelector('.strength-text');
    
    if (!strengthContainer || !password) {
        if (strengthContainer) strengthContainer.classList.remove('visible');
        return;
    }
    
    strengthContainer.classList.add('visible');
    
    let strength = 0;
    let text = '';
    let className = '';
    
    // Length check
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    
    // Character variety
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    
    // Determine strength level
    if (strength <= 2) {
        text = 'ضعيفة - أضف المزيد من الأحرف والرموز';
        className = 'weak';
    } else if (strength <= 3) {
        text = 'متوسطة - جيد، يمكن تحسينها';
        className = 'medium';
    } else {
        text = 'قوية - ممتاز!';
        className = 'strong';
    }
    
    // Update UI
    strengthBar.className = `strength-bar ${className}`;
    strengthText.textContent = text;
}

// ===================================
// Utility Functions
// ===================================

function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function isValidPhone(phone) {
    const regex = /^05[0-9]{8}$/;
    return regex.test(phone.replace(/\s/g, ''));
}

function getAuthErrorMessage(errorCode) {
    const errorMessages = {
        'auth/user-not-found': 'لا يوجد حساب مرتبط بهذا البريد الإلكتروني',
        'auth/wrong-password': 'كلمة المرور غير صحيحة',
        'auth/email-already-in-use': 'هذا البريد الإلكتروني مستخدم بالفعل',
        'auth/weak-password': 'كلمة المرور ضعيفة جداً',
        'auth/invalid-email': 'صيغة البريد الإلكتروني غير صحيحة',
        'auth/too-many-requests': 'محاولات كثيرة جداً، يرجى المحاولة لاحقاً',
        'auth/network-request-failed': 'مشكلة في الاتصال بالإنترنت',
        'auth/popup-closed-by-user': 'تم إلغاء تسجيل الدخول',
        'auth/cancelled-popup-request': 'تم فتح نافذة أخرى مسبقاً'
    };
    
    return errorMessages[errorCode] || 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى';
}

function setupTogglePassword(buttonId, inputId) {
    const button = document.getElementById(buttonId);
    const input = document.getElementById(inputId);
    
    if (!button || !input) return;
    
    button.addEventListener('click', () => {
        const type = input.type === 'password' ? 'text' : 'password';
        input.type = type;
        
        const icon = button.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    });
}

function setButtonLoading(buttonId, isLoading) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    const btnText = button.querySelector('.btn-text');
    const btnLoader = button.querySelector('.btn-loader');
    
    if (isLoading) {
        button.disabled = true;
        if (btnText) btnText.style.display = 'none';
        if (btnLoader) btnLoader.style.display = 'inline-flex';
    } else {
        button.disabled = false;
        if (btnText) btnText.style.display = 'inline';
        if (btnLoader) btnLoader.style.display = 'none';
    }
}

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const span = element.querySelector('span');
    if (span) span.textContent = message;
    
    element.style.display = 'flex';
}

function hideError(elementId) {
    const element = document.getElementById(elementId);
    if (element) element.style.display = 'none';
}

function showErrorField(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (field) field.textContent = message;
}

function hideErrorField(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) field.textContent = '';
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
    
    // Styles
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
        alignItems: center,
        gap: '15px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        zIndex: '99999',
        animation: 'slideDown 0.3s ease forwards',
        maxWidth: '90%',
        width: 'auto'
    });
    
    document.body.appendChild(notification);
    
    // Auto remove
    setTimeout(() => {
        notification.style.animation = 'slideDown 0.3s ease reverse forwards';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

function showSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function showForgotPassword() {
    const modal = document.getElementById('forgotModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeForgotPassword() {
    const modal = document.getElementById('forgotModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Close modals when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.style.display = 'none';
    }
});

// ===================================
// Save User Data (Firestore + localStorage fallback)
// ===================================
async function saveUserData(uid, userData) {
    console.log('💾 Saving user data:', { uid, ...userData });
    
    try {
        // Try to save to Firestore first
        if (window.firebaseDb) {
            await window.firebaseDb.collection('users').doc(uid).set({
                ...userData,
                uid: uid,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            
            console.log('✅ User data saved to Firestore');
            return true;
        }
    } catch (error) {
        console.warn('⚠️ Firestore not available, using localStorage');
    }
    
    // Fallback to localStorage
    try {
        const users = JSON.parse(localStorage.getItem('da3watfarah_users') || '{}');
        users[uid] = {
            ...userData,
            uid,
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem('da3watfarah_users', JSON.stringify(users));
        
        console.log('✅ User data saved to localStorage');
        return true;
    } catch (error) {
        console.error('❌ Failed to save user data:', error);
        return false;
    }
}

// ===================================
// Update user last login time
// ===================================
async function updateUserLastLogin(uid) {
    try {
        if (window.firebaseDb) {
            await window.firebaseDb.collection('users').doc(uid).update({
                lastLogin: new Date().toISOString()
            });
        }
        
        // Also update localStorage
        const users = JSON.parse(localStorage.getItem('da3watfarah_users') || '{}');
        if (users[uid]) {
            users[uid].lastLogin = new Date().toISOString();
            localStorage.setItem('da3watfarah_users', JSON.stringify(users));
        }
    } catch (error) {
        console.warn('⚠️ Could not update last login time');
    }
}

// ===================================
// Logout Function (can be called from anywhere)
// ===================================
async function logout() {
    try {
        await window.firebaseAuth.signOut();
        console.log('👤 User signed out');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('❌ Logout error:', error);
        showNotification('حدث خطأ في تسجيل الخروج', 'error');
    }
}

// Make logout available globally
window.logout = logout;

// Add animation keyframes
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes slideDown {
        from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
`;
document.head.appendChild(styleSheet);

console.log('✅ Auth module loaded successfully');
