# 📊 دليل إعداد قاعدة البيانات - دعوة فرح
## Firebase Firestore Database Setup Guide

---

## 📋 جدول المحتويات

1. [متطلبات ما قبل الإعداد](#-متطلبات-ما-قبل-الإعداد)
2. [إنشاء مشروع Firebase](#-إنشاء-مشروع-firebase)
3. [إعداد Firestore](#-إعداد-firestore)
4. [قواعد الأمان (Security Rules)](#-قواعد-الأمان-security-rules)
5. [هيكل المجموعات (Collections)](#-هيكل-المجموعات-collections)
6. [أوامر إنشاء الفهارس (Indexes)](#-أوامر-إنشاء-الفهارس-indexes)
7. [بيانات تجريبية (Seed Data)](#-بيانات-تجريبية-seed-data)
8. [أوامر CRUD الأساسية](#-أوامر-crud-الأساسية)

---

## 🔧 متطلبات ما قبل الإعداد

### 1. تثبيت Firebase CLI
```bash
# تثبيت Firebase CLI عالمياً
npm install -g firebase-tools

# تسجيل الدخول
firebase login
```

### 2. تهيئة المشروع
```bash
# الانتقال لمجلد المشروع
cd da3watfarah

# تهيئة Firebase
firebase init firestore
```

---

## 🌐 إنشاء مشروع Firebase

### الخطوات:
1. اذهب إلى [Firebase Console](https://console.firebase.google.com/)
2. أنشئ مشروع جديد: `da3watfarah-app`
3. فعّل **Firestore Database**
4. اختر المنطقة: `europe-west1` (أقرب للسعودية)

---

## 📦 إعداد Firestore

### هيكل قاعدة البيانات:

```
da3watfarah-db/
├── users/                    # مجموعة المستخدمين
│   └── {userId}/             # معرف المستخدم
│       ├── profile           # بيانات الشخصية
│       ├── invitations/      # دعوات المستخدم
│       └── settings          # الإعدادات
├── invitations/              # مجموعة الدعوات العامة
│   └── {invitationId}/      # معرف الدعوة
├── rsvps/                   # تأكيدات الحضور
│   └── {rsvpId}/            # معرف التأكيد
├── wishes/                  # التهاني
│   └── {wishId}/            # معرف التهنئة
└── templates/               # القوالب المتاحة
    └── {templateId}/        # معرف القالب
```

---

## 🔒 قواعد الأمان (Security Rules)

### انسخ هذا الكود في Firebase Console → Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // قواعد المستخدمين
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
      
      // دعوات المستخدم
      match /invitations/{invitationId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // الدعوات العامة (للضيوف)
    match /invitations/{invitationId} {
      allow read: if true; // عام للجميع
      
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        resource.data.userId == request.auth.uid;
        
      // RSVPs داخل الدعوة
      match /rsvps/{rsvpId} {
        allow read: if true;
        allow create: if request.auth != null || request.auth == null;
        allow update, delete: if request.auth != null;
      }
      
      // التهاني داخل الدعوة
      match /wishes/{wishId} {
        allow read: if true;
        allow create: if request.auth != null || request.auth == null;
      }
    }
    
    // القوالب (للقراءة العامة)
    match /templates/{templateId} {
      allow read: if true;
      allow write: if false; // للإدارة فقط
    }
  }
}
```

---

## 🗂️ هيكل المجموعات (Collections)

### 1. مجموعة المستخدمين (`users`)

**المسار:** `users/{userId}`

```javascript
// هيكل مستند المستخدم
{
  uid: "string",              // معرف Firebase Auth
  email: "string",            // البريد الإلكتروني
  displayName: "string",      // الاسم المعروض
  photoURL: "string?",        // رابط الصورة (اختياري)
  
  // بيانات الحساب
  plan: "free | premium | vip",  // الباقة
  planExpiry: timestamp?,         // تاريخ انتهاء الباقة
  createdAt: timestamp,           // تاريخ الإنشاء
  updatedAt: timestamp,           // آخر تحديث
  
  // الإعدادات
  settings: {
    language: "ar",           // اللغة
    currency: "SAR",          // العملة
    notifications: true       // الإشعارات
  },
  
  // الإحصائيات
  stats: {
    invitationsCount: 0,     // عدد الدعوات
    totalViews: 0,           // إجمالي المشاهدات
    totalRsvps: 0            // إجمالي التأكيدات
  }
}
```

### 2. مجموعة الدعوات (`invitations`)

**المسار:** `invitations/{invitationId}` أو `users/{userId}/invitations/{invitationId}`

```javascript
// هيكل مستند الدعوة
{
  id: "string",                // معرف فريد
  userId: "string",            // صاحب الدعوة
  
  // أسماء العروسين
  couple: {
    groomName: "string",       // اسم العريس
    groomFatherName: "string?", // اسم أب العريس
    brideName: "string",       // اسم العروس
    brideFatherName: "string?", // اسم أب العروس
    parentsNames: "string"     // أسماء الوالدين كامل
  },
  
  // تفاصيل الحفل
  event: {
    date: timestamp,           // تاريخ الزفاف
    time: "string",            // الوقت (مثلاً: "8:00 مساءً")
    venue: "string",           // اسم القاعة
    address: "string",         // العنوان
    location: {               // إحداثيات GPS
      lat: number,
      lng: number
    },
    googleMapsUrl: "string"    // رابط Google Maps
  },
  
  // التصميم
  design: {
    templateId: "string",      // معرف القالب
    primaryColor: "string",    // اللون الرئيسي
    secondaryColor: "string",  // اللون الثانوي
    fontFamily: "string",      // الخط
    coverImage: "string?",     // صورة الغلاف
    galleryImages: [string[]], // صور المعرض
    musicUrl: "string?"        // رابط الموسيقى
  },
  
  // المحتوى النصي
  content: {
    welcomeText: "string?",    // نص الترحيب
    invitationText: "string",  // نص الدعوة
    quranVerse: "string?",     // آية قرآنية
    loveStory: [{              // قصة الحب (اختياري)
      title: "string",
      text: "string",
      date: timestamp,
      image?: "string"
    }]
  },
  
  // الرابط المخصص
  slug: "string",              // رابط مخصص (مثلاً: "mohamed&mona")
  url: "string",               // URL كامل
  
  // حالة الدعوة
  status: "draft | active | archived",
  isPublished: boolean,
  
  // الإحصائيات
  viewsCount: 0,
  rsvpsCount: 0,
  wishesCount: 0,
  
  // التواريخ
  createdAt: timestamp,
  updatedAt: timestamp,
  weddingDate: timestamp      // تاريخ الزفاف (للعد التنازلي)
}
```

### 3. مجموعة تأكيدات الحضور (`rsvps`)

**المسار:** `invitations/{invitationId}/rsvps/{rsvpId}`

```javascript
// هيكل مستند RSVP
{
  invitationId: "string",      // معرف الدعوة
  guestName: "string",         // اسم الضيف
  guestEmail: "string?",       // بريد الضيف (اختياري)
  guestPhone: "string?",       // هاتف الضيف (اختياري)
  guestCount: number,          // عدد المرافقين (0-5)
  attendance: "attending | not-attending | pending",
  message: "string?",          // رسالة للعروسين
  dietaryRequirements: "string?", // متطلبات غذائية
  
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 4. مجموعة التهاني (`wishes`)

**المسار:** `invitations/{invitationId}/wishes/{wishId}`

```javascript
// هيكل مستند التهنئة
{
  invitationId: "string",      // معرف الدعوة
  authorName: "string",        // اسم الكاتب
  message: "string",           // نص التهنئة
  isVisible: boolean,          // هل ظاهر للعموم؟
  
  createdAt: timestamp
}
```

### 5. مجموعة القوالب (`templates`)

**المسار:** `templates/{templateId}`

```javascript
// هيكل مستند القالب
{
  id: "string",                // معرف القالب
  name: "string",              // اسم القالب
  nameAr: "string",            // الاسم بالعربية
  category: "classic | modern | romantic | islamic | bohemian | royal",
  description: "string",       // وصف
  previewImage: "string",      // صورة المعاينة
  thumbnail: "string",         // صورة مصغرة
  
  // خيارات التصميم
  colors: {
    primary: "string",         // اللون الرئيسي الافتراضي
    secondary: "string",       // اللون الثانوي الافتراضي
    background: "string"       // لون الخلفية
  },
  fontFamily: "string",        // الخط الافتراضي
  
  // التوفر
  availableFor: ["free", "premium", "vip"], // الباقات المتاحة
  isPopular: boolean,          // هل هو شائع؟
  isNew: boolean,              // هل هو جديد؟
  
  sortOrder: number,           // ترتيب العرض
  isActive: boolean            // هل مفعل؟
}
```

---

## 📑 أوامر إنشاء الفهارس (Indexes)

### الطريقة الأولى: عبر Firebase Console

اذهب إلى: **Firestore → Indexes → Composite Indexes → Create Index**

### الطريقة الثانية: عبر CLI

أنشئ ملف `firestore.indexes.json` في جذر المشروع:

```json
{
  "indexes": [
    {
      "collectionGroup": "invitations",
      "queryScope": {
        "collectionId": "invitations",
        "allCollections": true
      },
      "fields": [
        {"fieldPath": "userId", "order": "ASCENDING"},
        {"fieldPath": "createdAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "invitations",
      "queryScope": {
        "collectionId": "invitations"
      },
      "fields": [
        {"fieldPath": "slug", "order": "ASCENDING"},
        {"fieldPath": "isPublished", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "invitations",
      "queryScope": {
        "collectionId": "invitations"
      },
      "fields": [
        {"fieldPath": "userId", "order": "ASCENDING"},
        {"fieldPath": "status", "order": "ASCENDING"},
        {"fieldPath": "weddingDate", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "rsvps",
      "queryScope": {
        "collectionId": "rsvps",
        "allCollections": true
      },
      "fields": [
        {"fieldPath": "invitationId", "order": "ASCENDING"},
        {"fieldPath": "createdAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "wishes",
      "queryScope": {
        "collectionId": "wishes",
        "allCollections": true
      },
      "fields": [
        {"fieldPath": "invitationId", "order": "ASCENDING"},
        {"fieldPath": "isVisible", "order": "ASCENDING"},
        {"fieldPath": "createdAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "templates",
      "queryScope": {
        "collectionId": "templates"
      },
      "fields": [
        {"fieldPath": "isActive", "order": "ASCENDING"},
        {"fieldPath": "sortOrder", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "templates",
      "queryScope": {
        "collectionId": "templates"
      },
      "fields": [
        {"fieldPath": "category", "order": "ASCENDING"},
        {"fieldPath": "isActive", "order": "ASCENDING"}
      ]
    }
  ],
  "fieldOverrides": [
    {
      "collectionGroup": "invitations",
      "fieldPath": "weddingDate",
      "indexes": [
        {
          "order": "DESCENDING",
          "arrayConfig": "CONTAINS"
        }
      ]
    }
  ]
}
```

ثم نفذ الأمر:
```bash
firebase deploy --only firestore:indexes
```

---

## 🌱 بيانات تجريبية (Seed Data)

### سكريبت إضافة القوالب الأولية:

```javascript
// seed-templates.js
// تشغيل: node seed-templates.js

const admin = require('firebase-admin');

// تهيئة Firebase Admin (استبدل بمسار serviceAccount.json)
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

const templates = [
  {
    id: 'classic',
    name: 'Classic',
    nameAr: 'الكلاسيكي',
    category: 'classic',
    description: 'تصميم كلاسيكي أنيق يناسب جميع الأذواق',
    previewImage: '/assets/templates/classic-preview.jpg',
    thumbnail: '/assets/templates/classic-thumb.jpg',
    colors: {
      primary: '#8B4513',
      secondary: '#D4AF37',
      background: '#FFF8F0'
    },
    fontFamily: "'Aref Ruqaa', serif",
    availableFor: ['free', 'premium', 'vip'],
    isPopular: true,
    isNew: false,
    sortOrder: 1,
    isActive: true
  },
  {
    id: 'modern',
    name: 'Modern',
    nameAr: 'العصري',
    category: 'modern',
    description: 'تصميم عصري بألوان جريئة وأشكال حديثة',
    previewImage: '/assets/templates/modern-preview.jpg',
    thumbnail: '/assets/templates/modern-thumb.jpg',
    colors: {
      primary: '#1A1A2E',
      secondary: '#E94560',
      background: '#FFFFFF'
    },
    fontFamily: "'Tajawal', sans-serif",
    availableFor: ['premium', 'vip'],
    isPopular: true,
    isNew: false,
    sortOrder: 2,
    isActive: true
  },
  {
    id: 'romantic',
    name: 'Romantic',
    nameAr: 'الرومانسي',
    category: 'romantic',
    description: 'تصميم رومانسي ناعم بالقلوب والورود',
    previewImage: '/assets/templates/romantic-preview.jpg',
    thumbnail: '/assets/templates/romantic-thumb.jpg',
    colors: {
      primary: '#D4A5A5',
      secondary: '#E8B4BC',
      background: '#FFF0F3'
    },
    fontFamily: "'Amiri', serif",
    availableFor: ['premium', 'vip'],
    isPopular: true,
    isNew: false,
    sortOrder: 3,
    isActive: true
  },
  {
    id: 'islamic',
    name: 'Islamic',
    nameAr: 'الإسلامي',
    category: 'islamic',
    description: 'تصميم إسلامي بالزخارف والآيات القرآنية',
    previewImage: '/assets/templates/islamic-preview.jpg',
    thumbnail: '/assets/templates/islamic-thumb.jpg',
    colors: {
      primary: '#1B5E20',
      secondary: '#D4AF37',
      background: '#FFFDE7'
    },
    fontFamily: "'Aref Ruqaa', serif",
    availableFor: ['free', 'premium', 'vip'],
    isPopular: true,
    isNew: false,
    sortOrder: 4,
    isActive: true
  },
  {
    id: 'bohemian',
    name: 'Bohemian',
    nameAr: 'البوهيمي',
    category: 'bohemian',
    description: 'تصميم بوهيمي حر بألوان الطبيعة',
    previewImage: '/assets/templates/bohemian-preview.jpg',
    thumbnail: '/assets/templates/bohemian-thumb.jpg',
    colors: {
      primary: '#C17F59',
      secondary: '#9CAF88',
      background: '#FAF6F1'
    },
    fontFamily: "'Tajawal', sans-serif",
    availableFor: ['vip'],
    isPopular: false,
    isNew: true,
    sortOrder: 5,
    isActive: true
  },
  {
    id: 'royal',
    name: 'Royal',
    nameAr: 'الملكي',
    category: 'royal',
    description: 'تصميم ملكي فاخر بالذهب والأرجواني',
    previewImage: '/assets/templates/royal-preview.jpg',
    thumbnail: '/assets/templates/royal-thumb.jpg',
    colors: {
      primary: '#1A1A3E',
      secondary: '#D4AF37',
      background: '#FFFFF0'
    },
    fontFamily: "'Aref Ruqaa', serif",
    availableFor: ['vip'],
    isPopular: false,
    isNew: false,
    sortOrder: 6,
    isActive: true
  }
];

async function seedTemplates() {
  console.log('🚀 بدء إضافة القوالب...');
  
  for (const template of templates) {
    await db.collection('templates').doc(template.id).set(template);
    console.log(`✅ تم إضافة القالب: ${template.nameAr}`);
  }
  
  console.log('🎉 تمت إضافة جميع القوالب بنجاح!');
  process.exit(0);
}

seedTemplates().catch(console.error);
```

### سكريبت إنشاء مستخدم تجريبي:

```javascript
// seed-user.js
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

async function createTestUser() {
  const testUser = {
    uid: 'test-user-123',
    email: 'test@da3watfarah.com',
    displayName: 'مستخدم تجريبي',
    plan: 'vip',
    planExpiry: admin.firestore.Timestamp.fromDate(new Date('2027-12-31')),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    settings: {
      language: 'ar',
      currency: 'SAR',
      notifications: true
    },
    stats: {
      invitationsCount: 0,
      totalViews: 0,
      totalRsvps: 0
    }
  };
  
  await db.collection('users').doc(testUser.uid).set(testUser);
  console.log('✅ تم إنشاء المستخدم التجريبي:', testUser.email);
}

createTestUser().catch(console.error);
```

---

## ⚡ أوامر CRUD الأساسية

### قراءة البيانات:

```javascript
// جلب جميع القوالب المفعلة
const templatesSnapshot = await db.collection('templates')
  .where('isActive', '==', true)
  .orderBy('sortOrder', 'asc')
  .get();

// جلب دعوة بواسطة الـ slug
const invitationSnapshot = await db.collection('invitations')
  .where('slug', '==', 'mohamed&mona')
  .where('isPublished', '==', true)
  .limit(1)
  .get();

// جلب تأكيدات الحضور لدعوة محددة
const rsvpsSnapshot = await db.collection('invitations')
  .doc(invitationId)
  .collection('rsvps')
  .orderBy('createdAt', 'desc')
  .get();
```

### كتابة البيانات:

```javascript
// إنشاء دعوة جديدة
const newInvitation = await db.collection('invitations').add({
  userId: currentUser.uid,
  couple: {
    groomName: 'أحمد',
    brideName: 'سارة'
  },
  event: {
    date: Timestamp.fromDate(new Date('2026-06-15')),
    time: '8:00 مساءً',
    venue: 'فندق الريتز'
  },
  design: {
    templateId: 'classic'
  },
  slug: 'ahmed&sara',
  status: 'draft',
  isPublished: false,
  viewsCount: 0,
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp()
});

console.log('تم إنشاء الدعوة:', newInvitation.id);
```

### تحديث البيانات:

```javascript
// تحديث عدد المشاهدات
await db.collection('invitations').doc(invitationId).update({
  viewsCount: FieldValue.increment(1),
  updatedAt: FieldValue.serverTimestamp()
});

// نشر الدعوة
await db.collection('invitations').doc(invitationId).update({
  isPublished: true,
  status: 'active',
  publishedAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp()
});
```

### حذف البيانات:

```javascript
// حذف دعوة (مع جميع البيانات الفرعية)
const batch = db.batch();
const rsvps = await db.collection('invitations').doc(id).collection('rsvps').get();
const wishes = await db.collection('invitations').doc(id).collection('wishes').get();

rsvps.docs.forEach(doc => batch.delete(doc.ref));
wishes.docs.forEach(doc => batch.delete(doc.ref));
batch.delete(db.collection('invitations').doc(id));

await batch.commit();
console.log('تم حذف الدعوة وجميع البيانات المرتبطة');
```

---

## 🔧 أوامر Firebase CLI السريعة

```bash
# عرض حالة المشروع
firebase projects:list

# نشر قواعد الأمان
firebase deploy --only firestore:rules

# نشر الفهارس
firebase deploy --only firestore:indexes

# تصدير البيانات
firestore export gs://your-bucket/backups

# استيراد البيانات
firestore import gs://your-bucket/backups

# فتح وحدة التحكم
firebase console
```

---

## ✅ قائمة التحقق النهائية

- [ ] إنشاء مشروع Firebase
- [ ] تفعيل Firestore Database
- [ ] إعداد قواعد الأمان
- [ ] إنشاء الفهارس المركبة
- [ ] إضافة القوالب الأولية (Seed Data)
- [ ] اختبار عمليات القراءة/الكتابة
- [ ] ربط المشروع بـ Cloudflare R2 (للتخزين)
- [ ] إعداد NVIDIA AI API (للكتابة الذكية)

---

## 📞 الدعم

للمساعدة التقنية، تواصل معنا:
- البريد: support@da3watfarah.com
- الوثائق: docs.da3watfarah.com

---

**© 2025 دعوة فرح - جميع الحقوق محفوظة**
