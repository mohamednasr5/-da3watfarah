// ============================================================
// js/auth.js — Login / Register / Google Sign-in
//
// FIX (Aug 2026): Google sign-in was using signInWithPopup(), which
// depends on a hidden iframe talking to the authDomain
// (da3watfarah.firebaseapp.com) to hand the session back to the main
// tab. In any browser that blocks third-party cookies/storage (Chrome
// Incognito, Brave, Safari, and now increasingly normal Chrome), the
// Google OAuth popup finishes "successfully" but the session never
// actually gets persisted for the site's tab — so the very next auth
// check (on overview.html, or even back on login.html) sees no user
// and bounces back to login.html. Repeat forever = the loop reported.
//
// signInWithRedirect() + getRedirectResult() fixes this: it navigates
// the whole page to Google and back instead of relying on a popup +
// iframe, so it isn't affected by third-party storage partitioning.
// ============================================================

let currentUser = null;

function checkAuthState() {
    if (!window.firebaseAuth) {
        console.warn('Firebase Auth not initialized');
        return;
    }

    // Handle the return trip from signInWithRedirect (Google button).
    // This must run once per page load, before/independently of
    // onAuthStateChanged, so we can show the right message and only
    // redirect to overview.html once the redirect result is settled.
    handleGoogleRedirectResult();

    window.firebaseAuth.onAuthStateChanged((user) => {
        currentUser = user;
        if (!user) {
            console.log('👤 User is signed out');
            return;
        }

        console.log('✅ User is signed in:', user.email);
        const page = window.location.pathname.split('/').pop() || '';
        const shouldRedirect =
            page === 'login.html' ||
            page === 'register.html' ||
            page === '' ||
            window.location.pathname.includes('/auth/') ||
            (page === 'index.html' && window.location.search.includes('redirect'));

        if (shouldRedirect) {
            console.log('🔄 Redirecting to dashboard...');
            showNotification('تم تسجيل الدخول بنجاح! جاري التحويل...', 'success');
            setTimeout(() => {
                window.location.href = 'overview.html';
            }, 500);
        }
    });
}

// Called on every page load that includes auth.js. If the user just
// came back from Google's redirect-based sign-in, this resolves that
// result, saves/updates their profile, and sends them to the
// dashboard. If there's no pending redirect result, it resolves to
// null immediately and does nothing.
async function handleGoogleRedirectResult() {
    try {
        const result = await window.firebaseAuth.getRedirectResult();
        if (!result || !result.user) return; // no pending redirect sign-in

        const user = result.user;
        const isNewUser = !!(result.additionalUserInfo && result.additionalUserInfo.isNewUser);

        console.log('✅ Google sign-in successful:', {
            displayName: user.displayName,
            email: user.email,
            uid: user.uid,
            isNewUser
        });

        if (isNewUser) {
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
            await updateUserLastLogin(user.uid);
            showNotification('مرحباً بعودتك! ✨', 'success');
        }

        setTimeout(() => {
            window.location.href = 'overview.html';
        }, 1000);
    } catch (error) {
        // No pending redirect result throws no error; real failures do.
        if (!error || !error.code) return;
        console.error('❌ Google sign-in error:', error.code, error.message);
        showNotification(getAuthErrorMessage(error.code), 'error');
    }
}

function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    const toggleBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    if (toggleBtn && passwordInput) {
        toggleBtn.addEventListener('click', () => {
            passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
            const icon = toggleBtn.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!validateLoginForm(email, password)) return;

        setButtonLoading('loginBtn', true);
        hideError('loginError');
        try {
            const { user } = await window.firebaseAuth.signInWithEmailAndPassword(email, password);
            console.log('✅ Login successful:', user.email);
            showNotification('تم تسجيل الدخول بنجاح! جاري التحويل...', 'success');
            setTimeout(() => { window.location.href = 'overview.html'; }, 1500);
        } catch (error) {
            console.error('❌ Login error:', error.code, error.message);
            showError('loginError', getAuthErrorMessage(error.code));
        } finally {
            setButtonLoading('loginBtn', false);
        }
    });
}

function initRegisterForm() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    setupTogglePassword('togglePassword', 'password');
    setupTogglePassword('toggleConfirmPassword', 'confirmPassword');

    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', () => updatePasswordStrength(passwordInput.value));
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const groomName = document.getElementById('groomName').value.trim();
        const brideName = document.getElementById('brideName').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const terms = document.getElementById('terms').checked;

        if (!validateRegisterForm(groomName, brideName, email, phone, password, confirmPassword, terms)) return;

        setButtonLoading('registerBtn', true);
        hideError('registerError');
        try {
            const { user } = await window.firebaseAuth.createUserWithEmailAndPassword(email, password);
            console.log('✅ Registration successful:', user.email);
            await saveUserData(user.uid, {
                groomName, brideName, email, phone,
                createdAt: new Date().toISOString()
            });
            showSuccessModal();
        } catch (error) {
            console.error('❌ Registration error:', error.code, error.message);
            showError('registerError', getAuthErrorMessage(error.code));
        } finally {
            setButtonLoading('registerBtn', false);
        }
    });
}

function initForgotPasswordForm() {
    const form = document.getElementById('forgotForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
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

function initSocialLogin() {
    [document.getElementById('googleLoginBtn'), document.getElementById('googleRegisterBtn')]
        .forEach((btn) => btn && btn.addEventListener('click', handleGoogleSignIn));

    [document.getElementById('appleLoginBtn'), document.getElementById('appleRegisterBtn')]
        .forEach((btn) => btn && btn.addEventListener('click', () => {
            showNotification('تسجيل الدخول بحساب Apple قريباً!', 'info');
        }));
}

// Kicks off the redirect-based Google sign-in. The actual result is
// handled by handleGoogleRedirectResult() above, on the page load that
// happens *after* Google sends the browser back to login.html.
async function handleGoogleSignIn() {
    try {
        if (!window.firebaseAuth) {
            showNotification('Firebase لم يتم تهيئته بشكل صحيح', 'error');
            return;
        }
        showNotification('جارٍ الاتصال بـ Google...', 'info');

        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        provider.setCustomParameters({ prompt: 'select_account' });

        await window.firebaseAuth.signInWithRedirect(provider);
        // Browser navigates away here; nothing below this line runs
        // until Google redirects back to this page.
    } catch (error) {
        console.error('❌ Google sign-in error:', error.code, error.message);
        showNotification(getAuthErrorMessage(error.code), 'error');
    }
}

function validateLoginForm(email, password) {
    let valid = true;
    if (!email) {
        showErrorField('emailError', 'يرجى إدخال البريد الإلكتروني');
        valid = false;
    } else if (!isValidEmail(email)) {
        showErrorField('emailError', 'يرجى إدخال بريد إلكتروني صحيح');
        valid = false;
    } else {
        hideErrorField('emailError');
    }

    if (!password) {
        showErrorField('passwordError', 'يرجى إدخال كلمة المرور');
        valid = false;
    } else if (password.length < 6) {
        showErrorField('passwordError', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        valid = false;
    } else {
        hideErrorField('passwordError');
    }
    return valid;
}

function validateRegisterForm(groomName, brideName, email, phone, password, confirmPassword, terms) {
    let valid = true;

    if (!groomName) {
        showErrorField('groomNameError', 'يرجى إدخال اسم العريس');
        valid = false;
    } else if (groomName.length < 2) {
        showErrorField('groomNameError', 'اسم العريس يجب أن يكون حرفين على الأقل');
        valid = false;
    } else {
        hideErrorField('groomNameError');
    }

    if (!brideName) {
        showErrorField('brideNameError', 'يرجى إدخال اسم العروسة');
        valid = false;
    } else if (brideName.length < 2) {
        showErrorField('brideNameError', 'اسم العروسة يجب أن يكون حرفين على الأقل');
        valid = false;
    } else {
        hideErrorField('brideNameError');
    }

    if (!email) {
        showErrorField('emailError', 'يرجى إدخال البريد الإلكتروني');
        valid = false;
    } else if (!isValidEmail(email)) {
        showErrorField('emailError', 'يرجى إدخال بريد إلكتروني صحيح');
        valid = false;
    } else {
        hideErrorField('emailError');
    }

    if (phone && !isValidPhone(phone)) {
        showErrorField('phoneError', 'يرجى إدخال رقم جوال صحيح');
        valid = false;
    }

    if (!password) {
        showErrorField('passwordError', 'يرجى إدخال كلمة المرور');
        valid = false;
    } else if (password.length < 8) {
        showErrorField('passwordError', 'كلمة المرور يجب أن تكون 8 أحرف على الأقل');
        valid = false;
    } else {
        hideErrorField('passwordError');
    }

    if (password !== confirmPassword) {
        showErrorField('confirmPasswordError', 'كلمات المرور غير متطابقة');
        valid = false;
    } else {
        hideErrorField('confirmPasswordError');
    }

    if (!terms) {
        showErrorField('termsError', 'يجب الموافقة على الشروط والأحكام');
        valid = false;
    } else {
        hideErrorField('termsError');
    }

    return valid;
}

function updatePasswordStrength(password) {
    const container = document.getElementById('passwordStrength');
    const bar = container?.querySelector('.strength-bar');
    const text = container?.querySelector('.strength-text');
    if (!container || !password) {
        container && container.classList.remove('visible');
        return;
    }
    container.classList.add('visible');

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z\d]/.test(password)) score++;

    let label, level;
    if (score <= 2) { label = 'ضعيفة - أضف المزيد من الأحرف والرموز'; level = 'weak'; }
    else if (score <= 3) { label = 'متوسطة - جيد، يمكن تحسينها'; level = 'medium'; }
    else { label = 'قوية - ممتاز!'; level = 'strong'; }

    bar.className = `strength-bar ${level}`;
    text.textContent = label;
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
    return /^05[0-9]{8}$/.test(phone.replace(/\s/g, ''));
}

function getAuthErrorMessage(code) {
    const messages = {
        'auth/user-not-found': 'لا يوجد حساب مرتبط بهذا البريد الإلكتروني',
        'auth/wrong-password': 'كلمة المرور غير صحيحة',
        'auth/email-already-in-use': 'هذا البريد الإلكتروني مستخدم بالفعل',
        'auth/weak-password': 'كلمة المرور ضعيفة جداً',
        'auth/invalid-email': 'صيغة البريد الإلكتروني غير صحيحة',
        'auth/too-many-requests': 'محاولات كثيرة جداً، يرجى المحاولة لاحقاً',
        'auth/network-request-failed': 'مشكلة في الاتصال بالإنترنت',
        'auth/popup-closed-by-user': 'تم إلغاء تسجيل الدخول',
        'auth/cancelled-popup-request': 'تم فتح نافذة أخرى مسبقاً',
        'auth/unauthorized-domain': 'هذا الدومين غير مصرح له بتسجيل الدخول عبر Google (راجع Firebase Console > Authentication > Settings > Authorized domains)'
    };
    return messages[code] || 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى';
}

function setupTogglePassword(toggleId, inputId) {
    const toggle = document.getElementById(toggleId);
    const input = document.getElementById(inputId);
    if (!toggle || !input) return;
    toggle.addEventListener('click', () => {
        input.type = input.type === 'password' ? 'text' : 'password';
        const icon = toggle.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    });
}

function setButtonLoading(buttonId, loading) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    const text = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.btn-loader');
    btn.disabled = loading;
    if (text) text.style.display = loading ? 'none' : 'inline';
    if (loader) loader.style.display = loading ? 'inline-flex' : 'none';
}

function showError(containerId, message) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const span = el.querySelector('span');
    if (span) span.textContent = message;
    el.style.display = 'flex';
}

function hideError(containerId) {
    const el = document.getElementById(containerId);
    if (el) el.style.display = 'none';
}

function showErrorField(fieldId, message) {
    const el = document.getElementById(fieldId);
    if (el) el.textContent = message;
}

function hideErrorField(fieldId) {
    const el = document.getElementById(fieldId);
    if (el) el.textContent = '';
}

function showNotification(message, type = 'info') {
    document.querySelector('.notification')?.remove();
    const el = document.createElement('div');
    el.className = `notification notification-${type}`;
    el.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    Object.assign(el.style, {
        position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
        padding: '15px 25px', borderRadius: '12px',
        background: type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6',
        color: 'white', display: 'flex', alignItems: 'center', gap: '15px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)', zIndex: '99999',
        animation: 'slideDown 0.3s ease forwards', maxWidth: '90%', width: 'auto'
    });
    document.body.appendChild(el);
    setTimeout(() => {
        el.style.animation = 'slideDown 0.3s ease reverse forwards';
        setTimeout(() => el.remove(), 300);
    }, 4000);
}

function showSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) modal.style.display = 'flex';
}

function showForgotPassword() {
    const modal = document.getElementById('forgotModal');
    if (modal) modal.style.display = 'flex';
}

function closeForgotPassword() {
    const modal = document.getElementById('forgotModal');
    if (modal) modal.style.display = 'none';
}

async function saveUserData(uid, data) {
    console.log('💾 Saving user data:', { uid, ...data });
    try {
        if (window.firebaseDb && typeof window.firebaseDb.ref === 'function') {
            await window.firebaseDb.ref('users/' + uid).set({
                ...data,
                uid,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });
            console.log('✅ User data saved to Realtime Database');
            return true;
        }
    } catch (e) {
        console.warn('⚠️ Realtime Database not available, using localStorage:', e.message);
    }
    try {
        const users = JSON.parse(localStorage.getItem('da3watfarah_users') || '{}');
        users[uid] = { ...data, uid, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        localStorage.setItem('da3watfarah_users', JSON.stringify(users));
        console.log('✅ User data saved to localStorage');
        return true;
    } catch (e) {
        console.error('❌ Failed to save user data:', e);
        return false;
    }
}

async function updateUserLastLogin(uid) {
    try {
        if (window.firebaseDb && typeof window.firebaseDb.ref === 'function') {
            await window.firebaseDb.ref('users/' + uid + '/lastLogin').set(firebase.database.ServerValue.TIMESTAMP);
            await window.firebaseDb.ref('users/' + uid + '/updatedAt').set(firebase.database.ServerValue.TIMESTAMP);
            console.log('✅ Last login updated in Realtime Database');
        }
        const users = JSON.parse(localStorage.getItem('da3watfarah_users') || '{}');
        if (users[uid]) {
            users[uid].lastLogin = new Date().toISOString();
            users[uid].updatedAt = new Date().toISOString();
            localStorage.setItem('da3watfarah_users', JSON.stringify(users));
        }
    } catch (e) {
        console.warn('⚠️ Could not update last login time:', e.message);
    }
}

async function logout() {
    try {
        await window.firebaseAuth.signOut();
        console.log('👤 User signed out');
        window.location.href = 'index.html';
    } catch (e) {
        console.error('❌ Logout error:', e);
        showNotification('حدث خطأ في تسجيل الخروج', 'error');
    }
}

document.addEventListener('DOMContentLoaded', function () {
    if (typeof AOS !== 'undefined') AOS.init({ duration: 800, easing: 'ease-out-cubic', once: true });
    checkAuthState();
    initLoginForm();
    initRegisterForm();
    initForgotPasswordForm();
    initSocialLogin();
});

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) e.target.style.display = 'none';
});

window.logout = logout;

const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes slideDown {
        from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
`;
document.head.appendChild(styleSheet);

console.log('✅ Auth module loaded successfully');
