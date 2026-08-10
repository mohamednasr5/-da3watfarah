# 💍 دعوة فرح - Da3wat Farah

منصة SaaS احترافية لإنشاء دعوات الزفاف الإلكترونية

## 📋 المتطلبات

- حساب على [Firebase](https://firebase.google.com/)
- حساب على [Cloudflare](https://cloudflare.com/) (لـ R2 Storage + Workers)
- متصفح حديث (Chrome, Firefox, Safari, Edge)

## 🚀 التثبيت والتشغيل

### 1. Firebase Setup

1. أنشئ مشروع جديد في [Firebase Console](https://console.firebase.google.com/)
2. فعّل **Authentication**:
   - Email/Password
   - Google (أضف OAuth Client ID)
3. فعّل **Firestore Database** (لتخزين بيانات المستخدمين والدعوات)
4. فعّل **Storage** (اختياري - للملفات الإضافية)
5. انسخ إعدادات المشروع إلى `js/firebase-config.js`

### 2. Cloudflare R2 Setup

1. أنشئ **R2 Bucket** باسم `farah` (أو أي اسم تريده)
2. فعّل **Public Access** وانسخ Public URL
3. أنشئ **Worker** واربطه بالـ Bucket:

```bash
# تثبيت Wrangler CLI
npm install -g wrangler

# تسجيل الدخول إلى Cloudflare
wrangler login

# نشر الـ Worker
cd da3watfarah
wrangler deploy
```

4. حدّث الإعدادات في `js/firebase-config.js`:

```javascript
const r2Config = {
    bucketName: 'farah',
    s3Endpoint: 'https://YOUR_S3_ENDPOINT.r2.cloudflarestorage.com',
    publicUrl: 'https://YOUR_PUBLIC_URL.r2.dev',
    workerUrl: 'https://da3watfarah.nonm1724.workers.dev'
};
```

### 3. Google Sign-In Setup

1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com/)
2. أنشئ مشروع (أو استخدم الموجود)
3. فعّل **Google+ API** أو **Identity Platform**
4. أنشئ **OAuth 2.0 Client ID**:
   - Type: Web Application
   - Authorized JavaScript origins: `https://yourdomain.com`
   - Authorized redirect URIs: `https://yourdomain.com`
5. انسخ Client ID وأضفه في Firebase Console > Authentication > Sign-in method > Google

### 4. NVIDIA AI (اختياري)

1. سجّل في [NVIDIA Build](https://build.nvidia.com/)
2. احصل على API Key
3. أضف المفتاح في `js/firebase-config.js`:

```javascript
const nvidiaConfig = {
    apiKey: 'YOUR_NVIDIA_API_KEY',
    baseUrl: 'https://ai.api.nvidia.com/v1',
    model: 'meta/llama3-70b-instruct'
};
```

## 📁 هيكل المشروع

```
da3watfarah/
├── index.html              # الصفحة الرئيسية
├── login.html              # تسجيل الدخول
├── register.html           # إنشاء حساب
├── dashboard.html          # لوحة التحكم
├── invitation.html         # صفحة الدعوة العامة
│
├── css/
│   ├── style.css           # الأنماط الأساسية
│   ├── landing.css         # الصفحة الرئيسية
│   ├── auth.css            # المصادقة
│   ├── dashboard.css       # لوحة التحكم
│   └── invitation.css      # صفحة الدعوة
│
├── js/
│   ├── firebase-config.js  # إعدادات Firebase & R2 & AI
│   ├── auth.js             # نظام المصادقة
│   ├── main.js             # الصفحة الرئيسية
│   ├── dashboard.js        # لوحة التحكم
│   └── invitation.js       # تفاعلات الدعوة
│
├── worker.js               # Cloudflare Worker لـ R2
├── wrangler.toml           # إعدادات Cloudflare Worker
│
└── assets/
    ├── images/             # صور ثابتة
    └── music/              # ملفات صوتية
```

## 🔧 التخصيص

### تغيير الألوان
عدّل CSS Variables في `css/style.css`:

```css
:root {
    --primary-gold: #D4AF37;
    --primary-rose: #E8B4B8;
    /* ... */
}
```

### إضافة قوالب جديد
1. أضف class جديد في `css/invitation.css`
2. أضف خيار في `dashboard.html` قسم القوالب
3. عدّل `js/dashboard.js` لمعالجة القالب الجديد

## 🌐 النشر

### Option 1: Hosting تقليدي
ارفع الملفات لأي استضافة تدعم HTML/CSS/JS

### Option 2: Cloudflare Pages
```bash
npm install -g wrangler
wrangler pages publish da3watfarah
```

### Option 3: Firebase Hosting
```bash
firebase init hosting
firebase deploy
```

## 📱 الروابط الديناميكية

كل دعوة تحصل على رابط فريد:
```
da3watfarah.com/mohamed-mona
da3watfarah.com/ahmed-sara
da3watfarah.com/[custom-slug]
```

## 🎨 القوالب المتوفرة

1. **الكلاسيكي الذهبي** - أناقة وخلود
2. **العصري الأنيق** - بساطة ورقي
3. **الرومانسي الناعم** - عاطفة وجمال
4. **الإسلامي الفاخر** - بركة وهناء
5. **البوهيمي الحر** - طبيعة وحيوية
6. **الملكي الفاخر** - فخامة وتميز

## 🛡️ الأمان

- ✅ Firebase Authentication (Email + Google)
- ✅ CORS Protection على R2
- ✅ Validation من جانب العميل والخادم
- ✅ File size limits (10MB max)
- ✅ File type restrictions

## 📞 الدعم

- البريد: support@da3watfarah.com
- الوثائق: docs.da3watfarah.com

---

**صُنع بـ ❤️ لجميع العروسين في العالم العربي**
