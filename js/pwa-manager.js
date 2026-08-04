/**
 * PWA Manager - إدارة شاملة لمميزات Progressive Web App
 * يوفر: بانر التثبيت، إشعارات، مزامنة خلفية، وضع offline
 */

class PWAManager {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.sw = null;
    this.init();
  }

  /**
   * تهيئة مدير PWA
   */
  async init() {
    console.log('🚀 تهيئة PWA Manager...');
    
    // تسجيل Service Worker
    await this.registerServiceWorker();
    
    // فحص التثبيت السابق
    this.checkIfInstalled();
    
    // معالجة حدث beforeinstallprompt
    this.handleInstallPrompt();
    
    // معالجة تغييرات الاتصال
    this.handleConnectivityChanges();
    
    // إنشاء بانر التثبيت
    this.createInstallBanner();
    
    // إذا لم يتم تثبيت التطبيق، عرض البانر
    if (!this.isInstalled) {
      this.showInstallBanner();
    }

    console.log('✅ تم تهيئة PWA Manager');
  }

  /**
   * تسجيل Service Worker
   */
  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('⚠️ Service Worker غير مدعوم في هذا المتصفح');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
        updateViaCache: 'none'
      });

      console.log('✅ تم تسجيل Service Worker بنجاح');

      // الاستماع لتحديثات الـ SW
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('🔄 توفر تحديث جديد للتطبيق');
            this.showUpdateNotification();
          }
        });
      });

      this.sw = registration;
      
      // فحص التحديثات كل ساعة
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);

    } catch (error) {
      console.error('❌ خطأ في تسجيل Service Worker:', error);
    }
  }

  /**
   * معالجة حدث beforeinstallprompt
   */
  handleInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (event) => {
      // منع الـ browser من عرض بانره الخاص
      event.preventDefault();
      
      // حفظ الـ event للاستخدام لاحقاً
      this.deferredPrompt = event;
      
      console.log('💾 تم حفظ install prompt event');
      
      // عرض بانر التثبيت المخصص
      this.showInstallBanner();
    });
  }

  /**
   * فحص ما إذا كان التطبيق مثبت
   */
  checkIfInstalled() {
    // التحقق من display mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
      console.log('✅ التطبيق مثبت كـ standalone');
      document.body.classList.add('pwa-installed');
    }

    // معالجة تغيير display mode
    window.matchMedia('(display-mode: standalone)').addListener(matches => {
      if (matches) {
        this.isInstalled = true;
        console.log('✅ تم تثبيت التطبيق');
        document.body.classList.add('pwa-installed');
        this.hideInstallBanner();
      }
    });

    // فحص Apple standalone
    if (window.navigator.standalone === true) {
      this.isInstalled = true;
      document.body.classList.add('pwa-installed');
    }
  }

  /**
   * إنشاء بانر التثبيت
   */
  createInstallBanner() {
    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.className = 'pwa-install-banner';
    banner.innerHTML = `
      <div class="banner-content">
        <div class="banner-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        </div>
        <div class="banner-text">
          <h3>💝 ثبّت التطبيق</h3>
          <p>استمتع بتجربة أفضل وأسرع مع تطبيق دعوة فرح على جهازك</p>
        </div>
        <div class="banner-actions">
          <button id="pwa-install-btn" class="btn-install">
            <span>تثبيت</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M5 12h14M12 5l7 7m-7-7l-7 7"/>
            </svg>
          </button>
          <button id="pwa-dismiss-btn" class="btn-dismiss">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="banner-progress"></div>
    `;

    document.body.insertBefore(banner, document.body.firstChild);

    // معالجة زر التثبيت
    document.getElementById('pwa-install-btn').addEventListener('click', () => {
      this.promptInstall();
    });

    // معالجة زر الإغلاق
    document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
      this.hideInstallBanner();
      localStorage.setItem('pwa-dismiss-until', Date.now() + (7 * 24 * 60 * 60 * 1000));
    });
  }

  /**
   * عرض بانر التثبيت
   */
  showInstallBanner() {
    // التحقق من أن التطبيق غير مثبت والـ prompt محفوظ
    if (this.isInstalled || !this.deferredPrompt) {
      return;
    }

    // التحقق من أنه لم يتم إغلاق البانر مؤخراً
    const dismissedUntil = localStorage.getItem('pwa-dismiss-until');
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil)) {
      return;
    }

    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
      banner.classList.add('show');
      console.log('👁️ عرض بانر التثبيت');
      // البانر يبقى ظاهرًا حتى يتفاعل المستخدم (تثبيت أو إغلاق) لزيادة فرصة التثبيت
    }
  }

  /**
   * إخفاء بانر التثبيت
   */
  hideInstallBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
      banner.classList.remove('show');
    }
  }

  /**
   * طلب تثبيت التطبيق
   */
  async promptInstall() {
    if (!this.deferredPrompt) {
      console.log('⚠️ لا توجد إمكانية تثبيت متاحة');
      return;
    }

    try {
      // عرض نافذة التثبيت الأصلية
      this.deferredPrompt.prompt();
      
      // الانتظار لاختيار المستخدم
      const { outcome } = await this.deferredPrompt.userChoice;
      
      console.log(`المستخدم اختار: ${outcome}`);

      if (outcome === 'accepted') {
        console.log('✅ تم قبول التثبيت');
        this.hideInstallBanner();
        this.isInstalled = true;
        document.body.classList.add('pwa-installed');
        
        // عرض رسالة نجاح
        this.showSuccessMessage('تم تثبيت التطبيق بنجاح! 🎉');
      } else {
        console.log('❌ تم رفض التثبيت');
      }

      // مسح الـ prompt
      this.deferredPrompt = null;

    } catch (error) {
      console.error('❌ خطأ في التثبيت:', error);
    }
  }

  /**
   * معالجة تغييرات الاتصال
   */
  handleConnectivityChanges() {
    window.addEventListener('online', () => {
      console.log('✅ عاد الاتصال بالإنترنت');
      document.body.classList.remove('offline');
      this.showNotification('✅ عاد الاتصال بالإنترنت', 'success');
      
      // مزامنة البيانات إذا كان الـ SW يدعمها
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then(registration => {
          registration.sync.register('sync-invitations');
        });
      }
    });

    window.addEventListener('offline', () => {
      console.log('⚠️ تم فقدان الاتصال بالإنترنت');
      document.body.classList.add('offline');
      this.showNotification('⚠️ أنت في وضع بدون اتصال', 'warning');
    });

    // فحص الاتصال الحالي
    if (!navigator.onLine) {
      document.body.classList.add('offline');
    }
  }

  /**
   * عرض إشعار تحديث
   */
  showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'pwa-update-notification';
    notification.innerHTML = `
      <div class="update-content">
        <span class="update-icon">🔄</span>
        <span class="update-text">تحديث جديد متاح!</span>
        <button id="update-btn" class="btn-update">تحديث الآن</button>
      </div>
    `;

    document.body.appendChild(notification);

    document.getElementById('update-btn').addEventListener('click', () => {
      if (this.sw && this.sw.waiting) {
        this.sw.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        // إعادة تحميل الصفحة بعد تحديث الـ SW
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });
      }
      notification.remove();
    });

    // إزالة الإشعار تلقائياً بعد 5 ثوانٍ
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  /**
   * عرض إشعار عام
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `pwa-notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // إزالة الإشعار تلقائياً
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * عرض رسالة نجاح
   */
  showSuccessMessage(message) {
    this.showNotification(message, 'success');
  }

  /**
   * طلب إذن الإشعارات
   */
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.warn('⚠️ الإشعارات غير مدعومة');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  /**
   * إرسال إشعار
   */
  async sendNotification(title, options = {}) {
    if (Notification.permission !== 'granted') {
      await this.requestNotificationPermission();
    }

    if (Notification.permission === 'granted' && this.sw) {
      this.sw.active.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        options: {
          icon: '/assets/icons/icon-192x192.png',
          badge: '/assets/icons/icon-192x192.png',
          theme_color: '#d4a574',
          ...options
        }
      });
    }
  }

  /**
   * الحصول على معلومات حول تثبيت التطبيق
   */
  getInstallationInfo() {
    return {
      isInstalled: this.isInstalled,
      canInstall: !this.isInstalled && this.deferredPrompt !== null,
      swActive: this.sw !== null,
      offline: !navigator.onLine,
      notificationPermission: Notification.permission
    };
  }

  /**
   * مسح بيانات الـ cache
   */
  async clearCache() {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('✅ تم مسح الـ cache');
      this.showNotification('تم مسح البيانات المخزنة', 'success');
      return true;
    } catch (error) {
      console.error('❌ خطأ في مسح الـ cache:', error);
      return false;
    }
  }

  /**
   * الحصول على حجم الـ cache
   */
  async getCacheSize() {
    try {
      if ('estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          usage: estimate.usage,
          quota: estimate.quota,
          percentage: (estimate.usage / estimate.quota) * 100
        };
      }
    } catch (error) {
      console.error('❌ خطأ في حساب حجم الـ cache:', error);
    }
    return null;
  }
}

// إنشاء instance من PWAManager عند تحميل الصفحة
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.pwaManager = new PWAManager();
  });
} else {
  window.pwaManager = new PWAManager();
}

console.log('✅ PWA Manager تم تحميله');
