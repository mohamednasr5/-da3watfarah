// دعوة فرح - Service Worker محسّن للـ PWA
// يوفر: التخزين المؤقت، العمل دون اتصال، المزامنة الخلفية

const CACHE_NAME = 'da3watfarah-v1.0.2';
const RUNTIME_CACHE = 'da3watfarah-runtime-v3';
const IMAGE_CACHE = 'da3watfarah-images-v1';
const API_CACHE = 'da3watfarah-api-v1';

// الملفات الأساسية التي يجب تخزينها عند التثبيت
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/create-invitation.html',
  '/gallery.html',
  '/my-invitations.html',
  '/invitation.html',
  '/invite.html',
  '/css/main.css',
  '/css/style.css',
  '/css/dashboard.css',
  '/css/invitation.css',
  '/js/main.js',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png',
  '/assets/icons/apple-touch-icon.png'
];

// حدث التثبيت - تخزين الملفات الأساسية
self.addEventListener('install', event => {
  console.log('🔧 تثبيت Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 تخزين الملفات الأساسية...');
        return cache.addAll(PRECACHE_ASSETS).catch(error => {
          console.warn('⚠️ تحذير أثناء تخزين بعض الملفات:', error);
          // لا نرفع الخطأ لأن بعض الملفات قد لا تكون متاحة
        });
      })
      .then(() => {
        console.log('✅ تم تثبيت Service Worker بنجاح');
        return self.skipWaiting(); // تفعيل الـ SW الجديد على الفور
      })
  );
});

// حدث التفعيل - تنظيف الـ caches القديمة
self.addEventListener('activate', event => {
  console.log('🚀 تفعيل Service Worker...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== RUNTIME_CACHE && 
              cacheName !== IMAGE_CACHE &&
              cacheName !== API_CACHE) {
            console.log('🗑️ حذف الـ cache القديم:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ تم تفعيل Service Worker بنجاح');
      return self.clients.claim(); // السيطرة على جميع الـ clients
    })
  );
});

// حدث الـ Fetch - استراتيجية التخزين المؤقت
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // تجاهل الطلبات غير HTTP
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // تجاهل طلبات Firebase و APIs الخارجية الأخرى
  if (url.hostname !== self.location.hostname) {
    return event.respondWith(
      fetch(request)
        .then(response => response)
        .catch(() => {
          // إذا فشل الـ fetch، حاول العودة من الـ cache
          return caches.match(request)
            .then(cachedResponse => cachedResponse || createOfflineResponse());
        })
    );
  }

  // استراتيجيات مختلفة حسب نوع الملف
  const isHtmlPage = request.mode === 'navigate' ||
    request.destination === 'document' ||
    url.pathname.endsWith('.html') ||
    url.pathname === '/';

  if (request.destination === 'image') {
    return event.respondWith(cacheImages(request));
  } else if (url.pathname.includes('/api/') || url.pathname.includes('/firebase')) {
    return event.respondWith(cacheApi(request));
  } else if (isHtmlPage) {
    // HTML pages (invite.html, /vip/*/*.html demo templates, the wizard,
    // etc.) always go network-first. Cache-first here was the root cause
    // of clients getting permanently stuck on an old, buggy build of the
    // app shell — a fix shipped to the server would never reach a browser
    // that already had a cached copy, since cache-first never re-checks
    // the network for an existing entry. Falling back to cache only keeps
    // the app usable offline.
    return event.respondWith(networkFirstStrategy(request));
  } else {
    return event.respondWith(cacheFirstStrategy(request));
  }
});

// استراتيجية: Network First، Fallback to Cache (لصفحات HTML)
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    if (response.ok && response.status !== 206) {
      const cache = await caches.open(RUNTIME_CACHE);
      const responseToCache = response.clone();
      cache.put(request, responseToCache).catch(err => {
        console.warn('SW: Failed to cache:', err.message);
      });
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    return cached || createOfflineResponse();
  }
}

// استراتيجية: Cache First، Fallback to Network
async function cacheFirstStrategy(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    // FIX: Only cache successful responses (status 200-299)
    // Status 206 (Partial Content) cannot be stored in Cache API
    if (response.ok && response.status !== 206) {
      const cache = await caches.open(RUNTIME_CACHE);
      const responseToCache = response.clone();
      cache.put(request, responseToCache).catch(err => {
        console.warn('SW: Failed to cache:', err.message);
      });
    }
    return response;
  } catch (error) {
    console.error('خطأ في الـ fetch:', error);
    return createOfflineResponse();
  }
}

// استراتيجية: تخزين الصور
async function cacheImages(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    // FIX: Only cache successful responses, skip 206 Partial Content
    if (response.ok && response.status !== 206) {
      const cache = await caches.open(IMAGE_CACHE);
      const responseToCache = response.clone();
      cache.put(request, responseToCache).catch(err => {
        console.warn('SW: Failed to cache image:', err.message);
      });
    }
    return response;
  } catch (error) {
    // إرجاع صورة بديلة أو placeholder
    return caches.match('/assets/icons/icon-192x192.png')
      .then(response => response || createPlaceholderImage());
  }
}

// استراتيجية: تخزين API
async function cacheApi(request) {
  try {
    const response = await fetch(request);
    // FIX: Only cache successful responses, skip 206 Partial Content
    if (response.ok && response.status !== 206) {
      const cache = await caches.open(API_CACHE);
      const responseToCache = response.clone();
      cache.put(request, responseToCache).catch(err => {
        console.warn('SW: Failed to cache API response:', err.message);
      });
    }
    return response;
  } catch (error) {
    // محاولة إرجاع النسخة المخزنة من API
    const cached = await caches.match(request);
    return cached || createOfflineResponse();
  }
}

// إنشاء استجابة offline
function createOfflineResponse() {
  return new Response(
    `<!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>أنت في وضع offline</title>
      <style>
        body {
          font-family: 'Tajawal', sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #d4a574 0%, #c89968 100%);
        }
        .container {
          text-align: center;
          background: white;
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          max-width: 400px;
        }
        h1 { color: #333; margin: 0 0 20px 0; font-size: 28px; }
        p { color: #666; line-height: 1.8; margin: 0 0 30px 0; }
        .icon { font-size: 80px; margin-bottom: 20px; }
        button {
          background: #d4a574;
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 25px;
          cursor: pointer;
          font-size: 16px;
          font-weight: bold;
          transition: all 0.3s;
        }
        button:hover { background: #c89968; transform: translateY(-2px); }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">📵</div>
        <h1>أنت غير متصل بالإنترنت</h1>
        <p>يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى</p>
        <button onclick="window.location.reload()">إعادة محاولة</button>
      </div>
    </body>
    </html>`,
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({ 'Content-Type': 'text/html; charset=utf-8' })
    }
  );
}

// إنشاء صورة placeholder
function createPlaceholderImage() {
  const canvas = new OffscreenCanvas(100, 100);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ddd';
  ctx.fillRect(0, 0, 100, 100);
  ctx.fillStyle = '#999';
  ctx.font = '50px Arial';
  ctx.fillText('📷', 25, 60);
  
  return canvas.convertToBlob().then(blob => {
    return new Response(blob, { headers: { 'Content-Type': 'image/png' } });
  });
}

// معالجة Message من الـ Client
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(RUNTIME_CACHE)
      .then(() => {
        event.ports[0].postMessage({ success: true });
      });
  }
});

// معالجة Background Sync للحفظ الدوري
self.addEventListener('sync', event => {
  if (event.tag === 'sync-invitations') {
    event.waitUntil(
      syncInvitations()
        .then(() => console.log('✅ تم مزامنة الدعوات'))
        .catch(err => console.error('❌ خطأ في المزامنة:', err))
    );
  }
});

// دالة مزامنة الدعوات
async function syncInvitations() {
  // سيتم استدعاء API للمزامنة
  return Promise.resolve();
}

// معالجة Push Notifications
self.addEventListener('push', event => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'لديك تنبيه جديد',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/icon-192x192.png',
    theme_color: '#d4a574',
    tag: 'daf-notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'دعوة فرح', options)
  );
});

// معالجة Notification Click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(clientList => {
        // البحث عن نافذة مفتوحة
        for (let client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // فتح نافذة جديدة إذا لم تكن هناك نافذة مفتوحة
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

console.log('✅ Service Worker جاهز');
