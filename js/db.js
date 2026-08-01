/**
 * دعوة فرح - Database Module (Realtime Database + R2)
 * Da3wat Farah - Firebase RTDB & Cloudflare R2 Integration
 */

// ===================================
// Inject notification-toast styles once
// (showNotification() below builds a <div class="notification-toast
// notification-{type}"> — but none of the site's CSS files style that
// class, so on any page that doesn't define its own copy the toast was
// rendered with zero positioning/visibility and was effectively
// invisible. This makes sure every page using db.showNotification()
// gets a visible, floating toast without needing to duplicate the CSS.)
// ===================================
(function injectNotificationStyles() {
    if (document.getElementById('dbNotificationStyles')) return;
    const style = document.createElement('style');
    style.id = 'dbNotificationStyles';
    style.textContent = `
        .notification-toast {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%) translateY(20px);
            background: #fff;
            color: #1F2937;
            padding: 15px 20px;
            border-radius: 14px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.18);
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 99999;
            max-width: 90vw;
            width: max-content;
            min-width: 260px;
            font-family: inherit;
            font-size: 14.5px;
            opacity: 0;
            animation: dbToastIn 0.35s ease forwards;
        }
        @keyframes dbToastIn {
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes slideOut {
            to { opacity: 0; transform: translateX(-50%) translateY(20px); }
        }
        .notification-toast .notification-content {
            display: flex;
            align-items: center;
            gap: 10px;
            flex: 1;
        }
        .notification-toast .notification-content i { font-size: 1.15rem; }
        .notification-toast.notification-success .notification-content i { color: #10B981; }
        .notification-toast.notification-error .notification-content i { color: #EF4444; }
        .notification-toast.notification-info .notification-content i { color: #3B82F6; }
        .notification-toast .notification-close {
            background: none;
            border: none;
            color: #9CA3AF;
            cursor: pointer;
            padding: 4px;
            font-size: 14px;
        }
        .notification-toast .notification-close:hover { color: #4B5563; }
    `;
    document.head.appendChild(style);
})();

// ===================================
// Global Variables
// ===================================
let currentUser = null;
let currentUserId = null;
let invitationsListener = null;

// ===================================
// Initialize on DOM Load
// ===================================
document.addEventListener('DOMContentLoaded', function() {
    initAuthObserver();
    loadUserData();
});

// ===================================
// Auth State Observer
// ===================================
function initAuthObserver() {
    if (window.firebaseAuth) {
        window.firebaseAuth.onAuthStateChanged(async (user) => {
            if (user) {
                currentUser = user;
                currentUserId = user.uid;
                // IMPORTANT: expose on window so every page (gallery.html, music.html,
                // settings.html, ...) can read it. Without this, those pages always
                // believed the visitor was logged out and silently skipped uploads/loads.
                window.currentUser = user;
                window.currentUserId = user.uid;
                console.log('✅ User authenticated:', user.email);
                
                // Load user data
                await loadUserData();
                
                // Update UI with user info
                updateUserUI(user);

                // Let pages that already ran their own DOMContentLoaded logic
                // (and found no user yet, due to the async auth check) know they
                // can now (re)load their user-scoped data.
                document.dispatchEvent(new CustomEvent('da3wat:authReady', { detail: { user } }));
            } else {
                console.log('👤 No user signed in');
                window.currentUser = null;
                window.currentUserId = null;
                // Redirect to login if not on auth pages
                const currentPage = window.location.pathname.split('/').pop();
                if (!currentPage.includes('login') && !currentPage.includes('register') && !currentPage.includes('index')) {
                    window.location.href = 'login.html';
                }
            }
        });
    }
}

// ===================================
// Load User Data from RTDB
// ===================================
async function loadUserData() {
    if (!currentUserId) return;
    
    try {
        const snapshot = await window.rtdbOnce(`users/${currentUserId}`);
        
        if (snapshot) {
            console.log('✅ User data loaded from RTDB');
            
            // Update global user data
            window.userData = snapshot;
            
            // Dispatch custom event for other components
            document.dispatchEvent(new CustomEvent('userDataLoaded', { detail: snapshot }));
            
            return snapshot;
        } else {
            console.log('⚠️ No user data found in RTDB, creating...');
            await createNewUserProfile();
        }
    } catch (error) {
        console.error('❌ Error loading user data:', error);
        return null;
    }
}

// ===================================
// Create New User Profile in RTDB
// ===================================
async function createNewUserProfile() {
    if (!currentUser) return;
    
    const userData = {
        uid: currentUserId,
        email: currentUser.email || '',
        displayName: currentUser.displayName || '',
        photoURL: currentUser.photoURL || '',
        provider: 'email',
        plan: 'free',
        planExpiry: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        settings: {
            language: 'ar',
            currency: 'SAR',
            notifications: true,
            theme: 'auto'
        },
        stats: {
            invitationsCount: 0,
            totalViews: 0,
            totalRsvps: 0
        }
    };
    
    try {
        await window.rtdbSet(`users/${currentUserId}`, userData);
        console.log('✅ New user profile created');
        window.userData = userData;
        return userData;
    } catch (error) {
        console.error('❌ Error creating user profile:', error);
        return null;
    }
}

// ===================================
// Update User UI Elements
// ===================================
function updateUserUI(user) {
    // Update user name displays
    const userNameElements = document.querySelectorAll('#userName, .user-name, #displayName');
    userNameElements.forEach(el => {
        if (el) el.textContent = user.displayName || user.email?.split('@')[0] || 'مستخدم';
    });
    
    // Update avatar
    const avatarElements = document.querySelectorAll('.user-avatar-small, .avatar-placeholder img');
    avatarElements.forEach(el => {
        if (user.photoURL) {
            el.src = user.photoURL;
        }
    });
}

// ===================================
// INVITATIONS CRUD Operations
// ===================================

/**
 * Get all invitations for current user
 */
async function getUserInvitations() {
    if (!currentUserId) return [];
    
    try {
        // IMPORTANT: read from the main "invitations" node (filtered by userId),
        // NOT the "users/{uid}/invitations" mirror. Views/RSVPs/wishes are only
        // ever incremented on the main node (by invite.html and incrementViewCount),
        // so the mirror's counters stay stuck at 0 forever. Reading from the main
        // node guarantees the dashboard always reflects the real, live numbers.
        const snapshot = await window.firebaseDb
            .ref('invitations')
            .orderByChild('userId')
            .equalTo(currentUserId)
            .once('value');
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            const invitations = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
            
            console.log(`✅ Loaded ${invitations.length} invitations`);
            return invitations.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }
        
        return [];
    } catch (error) {
        console.error('❌ Error loading invitations:', error);
        return [];
    }
}

/**
 * Listen to real-time changes in invitations
 */
function listenToInvitations(callback) {
    if (!currentUserId || !window.firebaseDb) return null;
    
    const ref = window.firebaseDb.ref(`users/${currentUserId}/invitations`);
    
    ref.on('value', (snapshot) => {
        if (snapshot.exists()) {
            const invitations = Object.keys(snapshot.val()).map(key => ({
                id: key,
                ...snapshot.val()[key]
            })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            callback(invitations);
        } else {
            callback([]);
        }
    });
    
    // Return unsubscribe function
    return () => ref.off('value');
}

/**
 * Create new invitation
 */
async function createInvitation(invitationData) {
    if (!currentUserId) throw new Error('Not authenticated');
    
    try {
        // Generate unique slug if not provided
        // Uses "-" as separator (not "&") so the pretty link
        // never needs percent-encoding, e.g. da3watfarah.com/mohktar-athar
        if (!invitationData.slug) {
            invitationData.slug = generateSlug(
                invitationData.couple?.groomName || '',
                invitationData.couple?.brideName || ''
            );
        }
        
        // Create invitation object
        // NOTE: invitations no longer go live immediately. Every new invitation
        // is created in "pending_review" state and only becomes visible to the
        // world (isPublished: true) after the admin verifies the payment
        // (or the free plan is confirmed) from the admin panel.
        const newInvitation = {
            userId: currentUserId,
            couple: invitationData.couple || {},
            event: invitationData.event || {},
            design: invitationData.design || {},
            content: invitationData.content || {},
            slug: invitationData.slug,
            url: `https://da3watfarah.com/${invitationData.slug}`,
            status: 'pending_review',
            isPublished: false,
            payment: {
                status: 'unpaid',        // unpaid | pending_verification | verified | rejected | not_required
                plan: null,              // 'free' | 'premium' | 'vip'
                planLabel: null,
                amount: null,
                currency: null,
                method: null,            // 'card', 'bank_transfer', 'instapay', 'barq', 'vodafone_cash'
                methodLabel: null,
                receiptUrl: null,
                submittedAt: null,
                verifiedAt: null,
                rejectionReason: null
            },
            viewsCount: 0,
            rsvpsCount: 0,
            wishesCount: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            weddingDate: invitationData.event?.date || null
        };
        
        // Push to both locations
        const invitationRef = window.firebaseDb.ref('invitations').push();
        const invitationId = invitationRef.key;
        
        newInvitation.id = invitationId;
        
        // Save to main invitations node
        await window.rtdbSet(`invitations/${invitationId}`, newInvitation);
        
        // Save under user's invitations
        await window.rtdbSet(`users/${currentUserId}/invitations/${invitationId}`, newInvitation);
        
        // Update user stats
        await window.rtdbUpdate(`users/${currentUserId}/stats`, {
            invitationsCount: firebase.database.ServerValue.increment(1)
        });
        
        console.log('✅ Invitation created:', invitationId);
        
        return { success: true, invitationId, invitation: newInvitation };
        
    } catch (error) {
        console.error('❌ Error creating invitation:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update existing invitation
 */
async function updateInvitation(invitationId, updateData) {
    if (!currentUserId) throw new Error('Not authenticated');
    
    try {
        updateData.updatedAt = Date.now();
        
        // Update both locations
        await window.rtdbUpdate(`invitations/${invitationId}`, updateData);
        await window.rtdbUpdate(`users/${currentUserId}/invitations/${invitationId}`, updateData);
        
        console.log('✅ Invitation updated:', invitationId);
        return { success: true };
        
    } catch (error) {
        console.error('❌ Error updating invitation:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete invitation and all related data
 */
async function deleteInvitation(invitationId) {
    if (!currentUserId) throw new Error('Not authenticated');
    
    try {
        // Delete from main invitations
        await window.rtdbRemove(`invitations/${invitationId}`);
        
        // Delete from user's invitations
        await window.rtdbRemove(`users/${currentUserId}/invitations/${invitationId}`);
        
        // Update user stats
        await window.rtdbUpdate(`users/${currentUserId}/stats`, {
            invitationsCount: firebase.database.ServerValue.increment(-1)
        });
        
        console.log('✅ Invitation deleted:', invitationId);
        return { success: true };
        
    } catch (error) {
        console.error('❌ Error deleting invitation:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Publish/Unpublish invitation
 */
async function toggleInvitationPublish(invitationId, publish) {
    return updateInvitation(invitationId, {
        isPublished: publish,
        status: publish ? 'active' : 'draft'
    });
}

/**
 * Submit the chosen package + payment proof for an invitation.
 * Does NOT publish the invitation — it only marks it as "pending_verification"
 * so the admin can check the receipt from the admin panel and approve it.
 *
 * @param {string} invitationId
 * @param {Object} paymentInfo
 * @param {string} paymentInfo.plan          'free' | 'premium' | 'vip'
 * @param {string} paymentInfo.planLabel     Arabic label for the plan
 * @param {number} paymentInfo.amount        amount due
 * @param {string} paymentInfo.currency      'USD' | 'SAR' | 'EGP'
 * @param {string} [paymentInfo.method]      payment method key (omitted for free plan)
 * @param {string} [paymentInfo.methodLabel] Arabic label for the method
 * @param {string} [paymentInfo.receiptUrl]  URL of the uploaded receipt image (R2)
 */
async function submitPaymentInfo(invitationId, paymentInfo) {
    if (!currentUserId) throw new Error('Not authenticated');

    try {
        const isFree = paymentInfo.plan === 'free';

        const paymentUpdate = {
            'payment/status': isFree ? 'not_required' : 'pending_verification',
            'payment/plan': paymentInfo.plan || null,
            'payment/planLabel': paymentInfo.planLabel || null,
            'payment/amount': paymentInfo.amount ?? null,
            'payment/currency': paymentInfo.currency || null,
            'payment/method': paymentInfo.method || null,
            'payment/methodLabel': paymentInfo.methodLabel || null,
            'payment/receiptUrl': paymentInfo.receiptUrl || null,
            'payment/submittedAt': Date.now(),
            status: 'pending_review',
            updatedAt: Date.now()
        };

        await window.rtdbUpdate(`invitations/${invitationId}`, paymentUpdate);
        await window.rtdbUpdate(`users/${currentUserId}/invitations/${invitationId}`, paymentUpdate);

        console.log('✅ Payment info submitted for invitation:', invitationId);
        return { success: true };

    } catch (error) {
        console.error('❌ Error submitting payment info:', error);
        return { success: false, error: error.message };
    }
}

// ===================================
// RSVP Operations
// ===================================

/**
 * Add RSVP to invitation
 */
async function addRSVP(invitationId, rsvpData) {
    try {
        const rsvpRef = window.firebaseDb.ref(`invitations/${invitationId}/rsvps`).push();
        const rsvpId = rsvpRef.key;
        
        const newRSVP = {
            ...rsvpData,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        // Save to invitation
        await window.rtdbSet(`invitations/${invitationId}/rsvps/${rsvpId}`, newRSVP);
        
        // Also save under user's invitation
        if (currentUserId) {
            await window.rtdbSet(`users/${currentUserId}/invitations/${invitationId}/rsvps/${rsvpId}`, newRSVP);
        }
        
        // Update RSVP count
        await window.rtdbUpdate(`invitations/${invitationId}`, {
            rsvpsCount: firebase.database.ServerValue.increment(1)
        });
        
        console.log('✅ RSVP added:', rsvpId);
        return { success: true, rsvpId };
        
    } catch (error) {
        console.error('❌ Error adding RSVP:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get RSVPs for invitation
 */
async function getRSVPs(invitationId) {
    try {
        const snapshot = await window.rtdbOnce(`invitations/${invitationId}/rsvps`);
        
        if (snapshot) {
            return Object.keys(snapshot).map(key => ({
                id: key,
                ...snapshot[key]
            }));
        }
        
        return [];
    } catch (error) {
        console.error('❌ Error getting RSVPs:', error);
        return [];
    }
}

// ===================================
// Wishes Operations
// ===================================

/**
 * Add wish/message to invitation
 */
async function addWish(invitationId, wishData) {
    try {
        const wishRef = window.firebaseDb.ref(`invitations/${invitationId}/wishes`).push();
        const wishId = wishRef.key;
        
        const newWish = {
            ...wishData,
            isVisible: true,
            createdAt: Date.now()
        };
        
        // Save to invitation
        await window.rtdbSet(`invitations/${invitationId}/wishes/${wishId}`, newWish);
        
        // Update wishes count
        await window.rtdbUpdate(`invitations/${invitationId}`, {
            wishesCount: firebase.database.ServerValue.increment(1)
        });
        
        console.log('✅ Wish added:', wishId);
        return { success: true, wishId };
        
    } catch (error) {
        console.error('❌ Error adding wish:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get wishes for invitation
 */
async function getWishes(invitationId) {
    try {
        const snapshot = await window.rtdbOnce(`invitations/${invitationId}/wishes`);
        
        if (snapshot) {
            return Object.keys(snapshot)
                .map(key => ({ id: key, ...snapshot[key] }))
                .filter(wish => wish.isVisible)
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }
        
        return [];
    } catch (error) {
        console.error('❌ Error getting wishes:', error);
        return [];
    }
}

// ===================================
// TEMPLATES Operations
// ===================================

/**
 * Get all templates
 */
async function getTemplates() {
    try {
        const snapshot = await window.rtdbOnce('templates');
        
        if (snapshot) {
            return Object.keys(snapshot).map(key => ({
                id: key,
                ...snapshot[key]
            })).filter(t => t.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
        }
        
        return [];
    } catch (error) {
        console.error('❌ Error getting templates:', error);
        return [];
    }
}

/**
 * Get single template by ID
 */
async function getTemplate(templateId) {
    try {
        const template = await window.rtdbOnce(`templates/${templateId}`);
        return template;
    } catch (error) {
        console.error('❌ Error getting template:', error);
        return null;
    }
}

// ===================================
// CLOUDFLARE R2 INTEGRATION
// ===================================

/**
 * Upload file to R2 via Worker
 */
async function uploadToR2(file, type = 'image') {
    if (!window.r2Config || !window.r2Config.workerUrl) {
        console.error('❌ R2 config not found');
        return { success: false, error: 'خدمة رفع الملفات غير مهيأة (R2 config)' };
    }

    if (!file) {
        return { success: false, error: 'لم يتم اختيار ملف' };
    }

    // Pre-flight validation matching the limits enforced by the worker,
    // so the user gets an immediate, clear message instead of a network error.
    const maxSizeMb = type === 'audio' ? 20 : 8;
    if (file.size > maxSizeMb * 1024 * 1024) {
        return { success: false, error: `حجم الملف كبير جداً (الحد الأقصى ${maxSizeMb}MB)` };
    }

    const folderMap = { image: 'images', audio: 'music', video: 'video' };
    const folder = folderMap[type] || 'uploads';

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        // The worker reads "folder" (not "type") to decide where to store the file.
        formData.append('folder', folder);
        formData.append('userId', currentUserId || 'anonymous');

        // Guard against a hanging request (bad worker URL / network issue / CORS)
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        let response;
        try {
            response = await fetch(`${window.r2Config.workerUrl}${window.r2Config.uploadEndpoint}`, {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeout);
        }

        if (!response.ok) {
            let serverMsg = '';
            try {
                const errJson = await response.json();
                serverMsg = errJson.error || '';
            } catch (_) { /* response wasn't JSON */ }
            throw new Error(serverMsg || `فشل رفع الملف (${response.status})`);
        }

        const result = await response.json();

        if (result.success) {
            console.log('✅ File uploaded to R2:', result.url);
            return {
                success: true,
                url: result.url,
                key: result.key
            };
        } else {
            throw new Error(result.error || 'Upload failed');
        }

    } catch (error) {
        console.error('❌ R2 upload error:', error);
        const message = error.name === 'AbortError'
            ? 'انتهت مهلة رفع الملف، تحقق من اتصال الإنترنت وحاول مرة أخرى'
            : (error.message || 'فشل رفع الملف');
        return { success: false, error: message };
    }
}

/**
 * Upload file to R2 via Worker, reporting real upload progress (0-100)
 * through onProgress(percent). Uses XHR since fetch() cannot expose
 * upload progress for request bodies in all browsers.
 */
function uploadToR2WithProgress(file, type = 'image', onProgress) {
    return new Promise((resolve) => {
        if (!window.r2Config || !window.r2Config.workerUrl) {
            console.error('❌ R2 config not found');
            resolve({ success: false, error: 'خدمة رفع الملفات غير مهيأة (R2 config)' });
            return;
        }

        if (!file) {
            resolve({ success: false, error: 'لم يتم اختيار ملف' });
            return;
        }

        const maxSizeMb = type === 'audio' ? 20 : 8;
        if (file.size > maxSizeMb * 1024 * 1024) {
            resolve({ success: false, error: `حجم الملف كبير جداً (الحد الأقصى ${maxSizeMb}MB)` });
            return;
        }

        const folderMap = { image: 'images', audio: 'music', video: 'video' };
        const folder = folderMap[type] || 'uploads';

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        formData.append('folder', folder);
        formData.append('userId', currentUserId || 'anonymous');

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${window.r2Config.workerUrl}${window.r2Config.uploadEndpoint}`, true);
        xhr.timeout = 30000;

        if (xhr.upload && typeof onProgress === 'function') {
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    onProgress(Math.round((e.loaded / e.total) * 100));
                }
            });
        }

        xhr.onload = () => {
            let result;
            try {
                result = JSON.parse(xhr.responseText);
            } catch (_) {
                result = null;
            }

            if (xhr.status >= 200 && xhr.status < 300 && result && result.success) {
                console.log('✅ File uploaded to R2:', result.url);
                if (typeof onProgress === 'function') onProgress(100);
                resolve({ success: true, url: result.url, key: result.key });
            } else {
                const serverMsg = result && result.error ? result.error : `فشل رفع الملف (${xhr.status})`;
                resolve({ success: false, error: serverMsg });
            }
        };

        xhr.onerror = () => {
            resolve({ success: false, error: 'تعذر الاتصال بخدمة الرفع، تحقق من اتصال الإنترنت' });
        };

        xhr.ontimeout = () => {
            resolve({ success: false, error: 'انتهت مهلة رفع الملف، تحقق من اتصال الإنترنت وحاول مرة أخرى' });
        };

        xhr.send(formData);
    });
}

/**
 * Delete file from R2
 */
async function deleteFromR2(fileKey) {
    if (!window.r2Config) {
        return { success: false, error: 'R2 not configured' };
    }
    
    try {
        const response = await fetch(`${window.r2Config.workerUrl}${window.r2Config.deleteEndpoint}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: fileKey })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ File deleted from R2:', fileKey);
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ R2 delete error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Upload multiple files
 */
async function uploadMultipleFiles(files, type = 'image', progressCallback) {
    const results = [];
    const total = files.length;
    
    for (let i = 0; i < files.length; i++) {
        const result = await uploadToR2(files[i], type);
        results.push(result);
        
        if (progressCallback) {
            progressCallback(i + 1, total, result);
        }
    }
    
    return results;
}

// ===================================
// STATS & ANALYTICS
// ===================================

/**
 * Increment view count for invitation
 */
async function incrementViewCount(invitationId) {
    try {
        await window.rtdbUpdate(`invitations/${invitationId}`, {
            viewsCount: firebase.database.ServerValue.increment(1)
        });
        
        // Also increment user's total views
        if (currentUserId) {
            await window.rtdbUpdate(`users/${currentUserId}/stats`, {
                totalViews: firebase.database.ServerValue.increment(1)
            });
        }
    } catch (error) {
        console.warn('⚠️ Could not increment view count');
    }
}

/**
 * Get user statistics
 */
async function getUserStats() {
    if (!currentUserId) return null;
    
    try {
        const userData = await window.rtdbOnce(`users/${currentUserId}`);
        return userData?.stats || {
            invitationsCount: 0,
            totalViews: 0,
            totalRsvps: 0
        };
    } catch (error) {
        console.error('❌ Error getting user stats:', error);
        return null;
    }
}

/**
 * Get overall platform stats (admin only)
 */
async function getPlatformStats() {
    try {
        const usersSnap = await window.rtdbOnce('users');
        const invitesSnap = await window.rtdbOnce('invitations');
        
        return {
            totalUsers: usersSnap ? Object.keys(usersSnap).length : 0,
            totalInvitations: invitesSnap ? Object.keys(invitesSnap).length : 0,
            totalViews: invitesSnap ? Object.values(invitesSnap).reduce((sum, inv) => sum + (inv.viewsCount || 0), 0) : 0
        };
    } catch (error) {
        console.error('❌ Error getting platform stats:', error);
        return null;
    }
}

// ===================================
// USER SETTINGS
// ===================================

/**
 * Update user settings
 */
async function updateUserSettings(settings) {
    if (!currentUserId) return { success: false, error: 'Not authenticated' };
    
    try {
        await window.rtdbUpdate(`users/${currentUserId}/settings`, settings);
        await window.rtdbUpdate(`users/${currentUserId}`, { updatedAt: Date.now() });
        
        console.log('✅ User settings updated');
        return { success: true };
    } catch (error) {
        console.error('❌ Error updating settings:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update user plan
 */
async function updateUserPlan(plan, expiryDate = null) {
    if (!currentUserId) return { success: false, error: 'Not authenticated' };
    
    try {
        const updates = {
            plan: plan,
            planExpiry: expiryDate,
            updatedAt: Date.now()
        };
        
        await window.rtdbUpdate(`users/${currentUserId}`, updates);
        
        console.log(`✅ User plan updated to: ${plan}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error updating plan:', error);
        return { success: false, error: error.message };
    }
}

// ===================================
// SLUG VALIDATION
// ===================================

/**
 * Check if slug is available
 */
async function isSlugAvailable(slug, excludeInvitationId = null) {
    try {
        const snapshot = await window.rtdbOnce('invitations');
        
        if (snapshot) {
            const existing = Object.values(snapshot).find(
                inv => inv.slug === slug && inv.id !== excludeInvitationId
            );
            return !existing;
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error checking slug:', error);
        return false;
    }
}

/**
 * Generate unique slug from names
 */
function generateSlug(groomName, brideName) {
    // Uses "-" as the separator (not "&") so the resulting link
    // is URL-safe as-is and never gets percent-encoded (e.g. %26)
    // when shared, e.g. da3watfarah.com/mohktar-athar
    const clean = (str) => `${str || ''}`
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\u0600-\u06FF\-]/g, '');

    return `${clean(groomName)}-${clean(brideName)}`.substring(0, 50);
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

/**
 * Format date to Arabic locale
 */
function formatDateAr(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Format number with commas
 */
function formatNumber(num) {
    if (!num) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
    // Remove existing notifications
    document.querySelectorAll('.notification-toast').forEach(n => n.remove());
    
    const toast = document.createElement('div');
    toast.className = `notification-toast notification-${type}`;
    toast.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(toast);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

/**
 * Show loading state
 */
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>جاري التحميل...</p>
            </div>
        `;
    }
}

/**
 * Show error state
 */
function showError(elementId, message, onRetry = null) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>حدث خطأ</h3>
                <p>${message}</p>
                ${onRetry ? `<button class="btn btn-primary" onclick="${onRetry}">إعادة المحاولة</button>` : ''}
            </div>
        `;
    }
}

/**
 * Show empty state
 */
function showEmpty(elementId, icon, title, description, actionText = null, actionLink = null) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-${icon}"></i>
                <h3>${title}</h3>
                <p>${description}</p>
                ${actionText ? `<a href="${actionLink}" class="btn btn-primary">${actionText}</a>` : ''}
            </div>
        `;
    }
}

// Export functions globally
window.db = {
    loadUserData,
    createInvitation,
    updateInvitation,
    deleteInvitation,
    toggleInvitationPublish,
    submitPaymentInfo,
    getUserInvitations,
    listenToInvitations,
    addRSVP,
    getRSVPs,
    addWish,
    getWishes,
    getTemplates,
    getTemplate,
    uploadToR2,
    uploadToR2WithProgress,
    deleteFromR2,
    uploadMultipleFiles,
    incrementViewCount,
    getUserStats,
    getPlatformStats,
    updateUserSettings,
    updateUserPlan,
    isSlugAvailable,
    generateSlug,
    formatDateAr,
    formatNumber,
    showNotification,
    showLoading,
    showError,
    showEmpty
};

console.log('✅ Database module loaded (RTDB + R2)');