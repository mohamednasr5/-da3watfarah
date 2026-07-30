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
    if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp(firebaseConfig);
    } else {
        firebaseApp = firebase.app();
    }
    
    // Initialize Auth
    auth = firebase.auth();
    
    // Initialize Firestore (for storing invitation data)
    db = firebase.firestore();
    
    // Initialize Storage (for additional file storage if needed)
    storage = firebase.storage();
    
    // Initialize Analytics
    if (typeof firebase.analytics === 'function') {
        const analytics = firebase.analytics();
    }
    
    console.log('✅ Firebase initialized successfully');
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
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
