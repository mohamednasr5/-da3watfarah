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
    
    // Initialize Firestore (for storing invitation data) - with fallback
    if (typeof firebase.firestore === 'function') {
        db = firebase.firestore();
        console.log('✅ Firebase Firestore initialized');
    } else {
        console.warn('⚠️ Firebase Firestore SDK not loaded - using localStorage fallback');
        db = null;
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
        firestore: !!db,
        storage: !!storage
    };
};
