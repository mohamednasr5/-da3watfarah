/**
 * دعوة فرح - Firebase Configuration (REAL CREDENTIALS)
 * Da3wat Farah - Firebase Config
 */

// Firebase Configuration Object (REAL)
const firebaseConfig = {
    apiKey: "AIzaSyAIyJ_oZdA1VGDMfKwCUfQwdO5ZOoQy2DQ",
    authDomain: "da3watfarah.firebaseapp.com",
    databaseURL: "https://da3watfarah-default-rtdb.firebaseio.com",
    projectId: "da3watfarah",
    storageBucket: "da3watfarah.firebasestorage.app",
    messagingSenderId: "818147201311",
    appId: "1:818147201311:web:cb83942913bc2d6a86e02a",
    measurementId: "G-J9D7R961V7"
};

// Initialize Firebase (only if not already initialized)
let firebaseApp;
let auth;
let db;
let storage;

try {
    // Check if Firebase is loaded
    if (typeof firebase === 'undefined') {
        throw new Error('Firebase SDK not loaded. Make sure firebase-app-compat.js is included.');
    }
    
    if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp(firebaseConfig);
    } else {
        firebaseApp = firebase.app();
    }
    
    // Initialize Auth (required)
    if (typeof firebase.auth === 'function') {
        auth = firebase.auth();
        console.log('✅ Firebase Auth initialized');
    } else {
        console.warn('⚠️ Firebase Auth SDK not loaded');
    }
    
    // Initialize Realtime Database (for storing invitation data) - PRIMARY
    if (typeof firebase.database === 'function') {
        db = firebase.database();
        console.log('✅ Firebase Realtime Database initialized');
    } else {
        console.warn('⚠️ Firebase Realtime Database SDK not loaded - using localStorage fallback');
        db = null;
    }
    
    // Initialize Firestore (secondary/backup) - with fallback
    if (typeof firebase.firestore === 'function') {
        window.firebaseFirestore = firebase.firestore();
        console.log('✅ Firebase Firestore initialized (backup)');
    } else {
        window.firebaseFirestore = null;
        console.warn('⚠️ Firebase Firestore SDK not loaded');
    }
    
    // Initialize Storage (for file storage) - with fallback
    if (typeof firebase.storage === 'function') {
        storage = firebase.storage();
        console.log('✅ Firebase Storage initialized');
    } else {
        console.warn('⚠️ Firebase Storage SDK not loaded - using R2 fallback');
        storage = null;
    }
    
    // Initialize Analytics (optional)
    if (typeof firebase.analytics === 'function') {
        try {
            const analytics = firebase.analytics();
            console.log('✅ Firebase Analytics initialized');
        } catch (e) {
            console.warn('⚠️ Analytics initialization failed:', e.message);
        }
    }
    
    console.log('✅ Firebase initialized successfully');
    
} catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    
    // Set null values for all services
    firebaseApp = null;
    auth = null;
    db = null;
    storage = null;
}

// ===================================
// Export for use in other files
// ===================================
window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseStorage = storage;
window.firebaseApp = firebaseApp;

// ===================================
// Cloudflare R2 Configuration (REAL)
// ===================================
const r2Config = {
    // R2 Bucket Info (from your screenshots)
    bucketName: 'farah',
    
    // S3 API Endpoint (from Settings page)
    s3Endpoint: 'https://43544e748a23cd826c1b0339bc4c3409.r2.cloudflarestorage.com',
    
    // Public URL for accessing files
    publicUrl: 'https://pub-67b746453495438199c20622c45722a3.r2.dev',
    
    // Worker Endpoint (for upload API)
    workerUrl: 'https://da3watfarah.nonm1724.workers.dev',
    
    // API Endpoints
    uploadEndpoint: '/api/upload',
    deleteEndpoint: '/api/delete'
};

window.r2Config = r2Config;

// ===================================
// NVIDIA AI Configuration
// ===================================
const nvidiaConfig = {
    apiKey: '',  // Add your NVIDIA API key here
    baseUrl: 'https://ai.api.nvidia.com/v1',
    model: 'meta/llama3-70b-instruct'
};

window.nvidiaConfig = nvidiaConfig;

// ===================================
// App Configuration
// ===================================
const appConfig = {
    appName: 'دعوة فرح',
    appUrl: window.location.origin,
    supportEmail: 'support@da3watfarah.com'
};

window.appConfig = appConfig;

// ===================================
// Helper: Check if Firebase is ready
// ===================================
window.isFirebaseReady = function() {
    return {
        app: !!firebaseApp,
        auth: !!auth,
        database: !!db,  // Realtime Database (PRIMARY)
        firestore: !!window.firebaseFirestore,  // Firestore (backup)
        storage: !!storage
    };
};

// ===================================
// Helper: Get Realtime Database Reference
// ===================================
window.getDbRef = function(path) {
    if (!db) {
        console.error('❌ Realtime Database not initialized');
        return null;
    }
    return db.ref(path);
};

// ===================================
// Helper: Common RTDB Operations
// ===================================

// قراءة بيانات مرة واحدة (once)
window.rtdbOnce = async function(path) {
    try {
        const snapshot = await db.ref(path).once('value');
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('❌ RTDB Read Error:', error);
        throw error;
    }
};

// كتابة/تحديث بيانات (set)
window.rtdbSet = async function(path, data) {
    try {
        await db.ref(path).set(data);
        return true;
    } catch (error) {
        console.error('❌ RTDB Set Error:', error);
        throw error;
    }
};

// تحديث جزئي (update)
window.rtdbUpdate = async function(path, data) {
    try {
        await db.ref(path).update(data);
        return true;
    } catch (error) {
        console.error('❌ RTDB Update Error:', error);
        throw error;
    }
};

// دفع بيانة جديدة مع مفتاح فريد (push)
window.rtdbPush = async function(path, data) {
    try {
        const newRef = db.ref(path).push();
        await newRef.set(data);
        return newRef.key; // إرجاع المفتاح الجديد
    } catch (error) {
        console.error('❌ RTDB Push Error:', error);
        throw error;
    }
};

// حذف بيانات
window.rtdbRemove = async function(path) {
    try {
        await db.ref(path).remove();
        return true;
    } catch (error) {
        console.error('❌ RTDB Remove Error:', error);
        throw error;
    }
};

// الاستماع للتغييرات في الوقت الحقيقي (on)
window.rtdbOn = function(path, eventType, callback) {
    // eventType: 'value', 'child_added', 'child_changed', 'child_removed'
    const handler = (snapshot) => {
        callback(snapshot.exists() ? snapshot.val() : null, snapshot.key);
    };
    
    db.ref(path).on(eventType, handler);
    
    // إرجاع دالة لإلغاء الاستماع
    return () => db.ref(path).off(eventType, handler);
};
