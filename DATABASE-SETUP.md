# 📊 دليل إعداد قاعدة البيانات - دعوة فرح
## Firebase Realtime Database Setup Guide

---

## 📋 جدول المحتويات

1. [متطلبات ما قبل الإعداد](#-متطلبات-ما-قبل-الإعداد)
2. [إنشاء مشروع Firebase](#-إنشاء-مشروع-firebase)
3. [إعداد Realtime Database](#-إ-setup-realtime-database)
4. [قواعد الأمان (Security Rules)](#-قواعد-الأمان-security-rules)
5. [هكل البيانات JSON Tree](#-هيكل-البيانات-json-tree)
6. [بيانات تجريبية (Seed Data)](#-بيانات-تجريبية-seed-data)
7. [أوامر CRUD الأساسية](#-أوامر-crud-الأساسية)
8. [استكشاف الأخطاء وإصلاحها](#-استكشاف-الأخطاء وإصلاحها)

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

# تهيئة Firebase مع Realtime Database
firebase init database

# اختر:
# - Which Firebase project? → da3watfarah (أو اسم مشروعك)
# - What file should be used for Realtime Database rules? → database.rules.json
# - Do you want to override it? → Yes (لتحديث القواعد)
```

---

## 🌐 إنشاء مشروع Firebase

### الخطوات:
1. اذهب إلى [Firebase Console](https://console.firebase.google.com/)
2. أنشئ مشروع جديد أو اختر مشروع موجود: `da3watfarah`
3. فعّل **Realtime Database** (مش Firestore!)
4. اختر المنطقة: `us-central1` (أو أقرب منطقة متاحة)
5. **مهم**: اختر "Start in test mode" مؤقتاً للتجربة، ثم غيّر لقواعد الأمان بعد ذلك

### الحصول على بيانات الاعتماد (Service Account):
1. اذهب إلى Project Settings → Service Accounts
2. اضغط "Generate New Private Key"
3. حمّل الملف وسمّيه `serviceAccount.json`
4. ضعه في جذر المشروع (**لا ترفعه على GitHub!**)

---

## 📦 إعداد Realtime Database

### هيكل قاعدة البيانات (JSON Tree):

```json
{
  "users": {
    "{userId}": {
      "uid": "string",
      "email": "string",
      "displayName": "string",
      "photoURL": "string",
      "plan": "free|premium|vip",
      "planExpiry": timestamp,
      "createdAt": timestamp,
      "updatedAt": timestamp,
      "settings": {
        "language": "ar",
        "currency": "SAR",
        "notifications": true,
        "theme": "auto"
      },
      "stats": {
        "invitationsCount": 0,
        "totalViews": 0,
        "totalRsvps": 0
      },
      "invitations": {
        "{invitationId}: { ... }"
      }
    }
  },
  
  "templates": {
    "classic": { ... },
    "modern": { ... },
    "romantic": { ... },
    "islamic": { ... },
    "bohemian": { ... },
    "royal": { ... }
  },
  
  "invitations": {
    "{invitationId}": {
      "userId": "string",
      "couple": { ... },
      "event": { ... },
      "design": { ... },
      "content": { ... },
      "slug": "string",
      "url": "string",
      "status": "draft|active|archived",
      "isPublished": boolean,
      "viewsCount": number,
      "rsvpsCount": number,
      "wishesCount": number,
      "weddingDate": timestamp,
      "createdAt": timestamp,
      "updatedAt": timestamp,
      
      // البيانات الفرعية
      "rsvps": {
        "{rsvpId}": { ... }
      },
      "wishes": {
        "{wishId}": { ... }
      }
    }
  }
}
```

---

## 🔒 قواعد الأمان (Security Rules)

### 📍 موقع الملف: `database.rules.json`

### طريقة النشر:

#### الطريقة الأولى: عبر Firebase Console (الأسهل)
1. اذهب إلى Firebase Console → Realtime Database → Rules
2. احذف القواعد الحالية
3. انسخ محتوى ملف `database.rules.json`
4. اضغط "Publish"

#### الطريقة الثانية: عبر CLI
```bash
# نشر قواعد الأمان
firebase deploy --only database:rules
```

### محتوى قواعد الأمان (database.rules.json):

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid",
        ".validate": "newData.hasChildren(['email', 'createdAt'])",
        
        "invitations": {
          "$invitationId": {
            ".read": "$uid === auth.uid",
            ".write": "$uid === auth.uid"
          }
        }
      }
    },
    
    "templates": {
      ".read": true,
      ".write": false
    },
    
    "invitations": {
      "$invitationId": {
        ".read": true,
        ".write": "auth != null && (data.child('userId').val() === auth.uid || !data.exists())",
        
        "rsvps": {
          ".read": true,
          "$rsvpId": {
            ".write": "auth != null"
          }
        },
        
        "wishes": {
          ".read": true,
          "$wishId": {
            ".write": "auth != null",
            ".validate": "newData.hasChildren(['authorName', 'message'])"
          }
        }
      }
    }
  }
}
```

### شرح القواعد:
- **`.read: false, .write: false`**: حماية الجذر - لا يسمح بالوصول العام
- **`users/$uid`**: المستخدم يقرأ/يكتب بياناته فقط (`auth.uid`)
- **`templates`**: قراءة عامة للجميع، كتابة محظورة (للإدارة فقط)
- **`invitations/$invitationId`**: 
  - قراءة عامة (للضيوف)
  - كتابة: للمستخدم المسجل أو صاحب الدعوة فقط
- **`rsvps` و `wishes`**: قراءة عامة، كتابة للمسجلين فقط

---

## 🗂️ هيكل البيانات JSON Tree

### 1. عقدة المستخدمين (`users/{userId}`)

```json
{
  "uid": "XjG3i8awcJfZ71swBHMneuIuD822",
  "email": "elfannanm@gmail.com",
  "displayName": "Eng :Mohamed Hammad",
  "photoURL": "https://example.com/photo.jpg",
  
  "plan": "premium",
  "planExpiry": 1735689600000,
  
  "createdAt": 1704067200000,
  "updatedAt": 1704153600000,
  
  "settings": {
    "language": "ar",
    "currency": "SAR",
    "notifications": true,
    "theme": "auto"
  },
  
  "stats": {
    "invitationsCount": 3,
    "totalViews": 1250,
    "totalRsvps": 89
  }
}
```

### 2. عقدة الدعوات (`invitations/{invitationId}`)

```json
{
  "id": "-NkLmNoPqRsTuVwXyZ",
  "userId": "XjG3i8awcJfZ71swBHMneuIuD822",
  
  "couple": {
    "groomName": "محمد",
    "groomFatherName": "أحمد",
    "brideName": "منى",
    "brideFatherName": "عبدالله",
    "parentsNames": "أحمد محمد & فاطمة علي"
  },
  
  "event": {
    "date": 1771190400000,
    "time": "8:00 مساءً",
    "venue": "فندق الريتز كارلتون",
    "address": " طريق الملك فهد، حي العليا، الرياض",
    "location": {
      "lat": 24.71356,
      "lng": 46.67529
    },
    "googleMapsUrl": "https://maps.google.com/?q=24.71356,46.67529"
  },
  
  "design": {
    "templateId": "classic",
    "primaryColor": "#8B4513",
    "secondaryColor": "#D4AF37",
    "fontFamily": "'Aref Ruqaa', serif",
    "coverImage": "https://pub-xxx.r2.dev/covers/wedding-photo.jpg",
    "galleryImages": [
      "https://pub-xxx.r2.dev/gallery/photo1.jpg",
      "https://pub-xxx.r2.dev/gallery/photo2.jpg"
    ],
    "musicUrl": "https://pub-xxx.r2.dev/music/wedding-song.mp3"
  },
  
  "content": {
    "welcomeText": "﴿وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا﴾",
    "invitationText": "يسرنا ويسعدنا أن ندعوكم لحضور زفاف ابنتنا منى مع فارس أحلامها محمد",
    "quranVerse": "وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا",
    "loveStory": []
  },
  
  "slug": "mohamed&mona",
  "url": "https://da3watfarah.com/mohamed&mona",
  
  "status": "active",
  "isPublished": true,
  
  "viewsCount": 456,
  "rsvpsCount": 34,
  "wishesCount": 12,
  
  "weddingDate": 1771190400000,
  "createdAt": 1704000000000,
  "updatedAt": 1704200000000
}
```

### 3. عقدة تأكيدات الحضور (`invitations/{id}/rsvps/{rsvpId}`)

```json
{
  "guestName": "سعود الغامدي",
  "guestEmail": "saud@example.com",
  "guestPhone": "+966501234567",
  "guestCount": 2,
  "attendance": "attending",
  "message": "ألف مبروك! أسأل الله أن يبارك لكما ويجمع بينكما في خير 🌹",
  "dietaryRequirements": "",
  "createdAt": 1722200000000,
  "updatedAt": 1722200000000
}
```

### 4. عقدة التهاني (`invitations/{id}/wishes/{wishId}`)

```json
{
  "authorName": "هدى السعيد",
  "authorEmail": "huda@example.com",
  "message": "ألف مبروك! أسأل الله أن يبارك في زواجكما ويجعله زواجاً سعيداً 🌹💕",
  "isVisible": true,
  "createdAt": 1722205000000
}
```

### 5. عقدة القوالب (`templates/{templateId}`)

```json
{
  "id": "classic",
  "name": "Classic",
  "nameAr": "الكلاسيكي",
  "category": "classic",
  "description": "تصميم كلاسيكي أنيق يناسب جميع الأذواق مع ألوان دافئة وزخارف تقليدية",
  "previewImage": "/assets/templates/classic-preview.jpg",
  "thumbnail": "/assets/templates/classic-thumb.jpg",
  "colors": {
    "primary": "#8B4513",
    "secondary": "#D4AF37",
    "background": "#FFF8F0"
  },
  "fontFamily": "'Aref Ruqaa', serif",
  "availableFor": ["free", "premium", "vip"],
  "isPopular": true,
  "isNew": false,
  "sortOrder": 1,
  "isActive": true,
  "createdAt": 1704000000000,
  "updatedAt": 1704000000000
}
```

---

## 🌱 بيانات تجريبية (Seed Data)

### 📍 الملف الجاهز: `seed-data-rtdb.js`

### المتطلبات:
```bash
# تثبيت Firebase Admin SDK
npm install firebase-admin

# حمّل serviceAccount.json من Firebase Console
# ضعه في نفس مجلد السكريبت
```

### تشغيل السكريبت:
```bash
node seed-data-rtdb.js
```

### ما يفعله السكريبت:
1. ✅ إضافة 6 قوالب (classic, modern, romantic, islamic, bohemian, royal)
2. ✅ إنشاء مستخدم تجريبي (demo@da3watfarah.com) - باقة VIP
3. ✅ إنشاء دعتين تجريبيتين:
   - أحمد & فاطمة (منشورة - classic template)
   - خالد & نورة (مسودة - modern template)
4. ✅ إضافة 3 تأكيدات حضور للدعوة الأولى
5. ✅ إضافة 3 تهاني للدعوة الأولى
6. ✅ التحقق من صحة البيانات وعرض ملخص

### مثال على الإخراج المتوقع:
```
╔═══════════════════════════════════════════════════════════╗
║     🚀 سكريبت إضافة البيانات - Realtime Database           ║
║     🎯 مشروع: دعوة فرح - da3watfarah.com                  ║
╚═══════════════════════════════════════════════════════════╝

✅ متصل بـ Realtime Database بنجاح

🎨 [1/4] جاري إضافة القوالب إلى Realtime Database...
   ✅ الكلاسيكي (classic)
   ✅ العصري (modern)
   ✅ الرومانسي (romantic)
   ✅ الإسلامي (islamic)
   ✅ البوهيمي (bohemian)
   ✅ الملكي الفاخر (royal)
   
   📊 تمت إضافة 6 قوالب بنجاح

👤 [2/4] جاري إنشاء المستخدم التجريبي...
   ✅ مستخدم تجريبي (demo@da3watfarah.com)
   📋 الباقة: VIP

💌 [3/4] جاري إنشاء الدعوات التجريبية...
   ✅ أحمد & فاطمة
      🔗 الرابط: /ahmed&fatima-0
   
   📝 [3.5/4] جاري إضافة تأكيدات الحضور...
      ✅ RSVP: سعود الغامدي
      ✅ RSVP: منيرة أحمد
      ✅ RSVP: خالد العتيبي
   
   💬 [3.6/4] جاري إضافة التهاني...
      ✅ تهنئة من: هدى السعيد
      ✅ تهنئة من: ياسر العمري
      ✅ تهنئة من: ريم العنزي
   
   ✅ خالد & نورة
      🔗 الرابط: /khaled&noura-1
   
   📊 تم إنشاء 2 دعوة

✅ [4/4] جاري التحقق من البيانات...

==================================================
📊 ملخص البيانات المضافة:
==================================================
   🎨 القوالب:       6
   👤 المستخدمون:    1
   💌 الدعوات:      2
   📝 تأكيدات الحضور: 3
   💬 التهاني:       3
==================================================

🎉 تمت عملية إضافة البيانات التجريبية بنجاح!

💡 يمكنك الآن:
   1. فتح Firebase Console → Realtime Database لعرض البيانات
   2. اختبار التطبيق باستخدام: demo@da3watfarah.com
   3. عرض الدعوة التجريبية على: /ahmed&fatima-0

🔗 روابط مفيدة:
   • Console: https://console.firebase.google.com/project/da3watfarah/database/da3watfarah-default-rtdb/data
```

---

## ⚡ أوامر CRUD الأساسية (Realtime Database)

### 📖 قراءة البيانات:

```javascript
// ===================================
// باستخدام Firebase Client SDK (في المتصفح)
// ===================================

// قراءة مرة واحدة (once)
const snapshot = await db.ref('templates').once('value');
const templates = snapshot.val();
console.log(templates); // { classic: {...}, modern: {...}, ... }

// قراءة قالب محدد
const classicSnapshot = await db.ref('templates/classic').once('value');
const classicTemplate = classicSnapshot.val();

// الاستماع للتغييرات في الوقت الحقيقي (real-time)
db.ref('invitations/' + invitationId).on('value', (snapshot) => {
  const invitation = snapshot.val();
  console.log('تم تحديث الدعوة:', invitation);
});

// البحث بواسطة slug (يجب استخدام orderByChild + equalTo)
const invitationsBySlug = await db.ref('invitations')
  .orderByChild('slug')
  .equalTo('mohamed&mona')
  .once('value');

// جلب تأكيدات الحضور لدعوة
const rsvpsSnapshot = await db.ref(`invitations/${invitationId}/rsvps`).once('value');
const rsvps = rsvpsSnapshot.val(); // { rsvpId1: {...}, rsvpId2: {...} }

// جلب التهاني المرئية فقط
const wishesSnapshot = await db.ref(`invitations/${invitationId}/wishes`)
  .orderByChild('isVisible')
  .equalTo(true)
  .once('value');
```

### ✏️ كتابة البيانات:

```javascript
// ===================================
// إنشاء بيانات جديدة
// ===================================

// إنشاء دعوة جديدة (مع معرف فريد تلقائي)
const newInvitationRef = db.ref('invitations').push();

await newInvitationRef.set({
  userId: currentUser.uid,
  couple: {
    groomName: 'أحمد',
    brideName: 'سارة'
  },
  event: {
    date: Date.now(), // timestamp
    time: '8:00 مساءً',
    venue: 'فندق الريتز'
  },
  design: {
    templateId: 'classic',
    primaryColor: '#8B4513',
    secondaryColor: '#D4AF37'
  },
  slug: 'ahmed&sara',
  status: 'draft',
  isPublished: false,
  viewsCount: 0,
  createdAt: firebase.database.ServerValue.TIMESTAMP,
  updatedAt: firebase.database.ServerValue.TIMESTAMP
});

console.log('تم إنشاء الدعوة:', newInvitationRef.key);

// ===================================
// تحديث جزئي (update)
// ===================================

// تحديث عدد المشاهدات
await db.ref(`invitations/${invitationId}/viewsCount`).set(
  transaction(current => (current || 0) + 1)
);

// أو استخدام update لتعديل حقول متعددة
await db.ref(`invitations/${invitationId}`).update({
  isPublished: true,
  status: 'active',
  updatedAt: firebase.database.ServerValue.TIMESTAMP
});

// ===================================
// إضافة RSVP جديد
// ===================================

const newRsvpRef = db.ref(`invitations/${invitationId}/rsvps`).push();

await newRsvpRef.set({
  guestName: 'سعود الغامدي',
  guestEmail: 'saud@example.com',
  guestPhone: '+966501234567',
  guestCount: 2,
  attendance: 'attending',
  message: 'ألف مبروك!',
  createdAt: firebase.database.ServerValue.TIMESTAMP,
  updatedAt: firebase.database.ServerValue.TIMESTAMP
});

// ===================================
// إضافة تهنئة جديدة
// ===================================

const newWishRef = db.ref(`invitations/${invitationId}/wishes`).push();

await newWishRef.set({
  authorName: 'هدى السعيد',
  authorEmail: 'huda@example.com',
  message: 'ألف مبروك! فرحة سعيدة 💕',
  isVisible: true,
  createdAt: firebase.database.ServerValue.TIMESTAMP
});
```

### 🗑️ حذف البيانات:

```javascript
// حذف دعوة (مع جميع البيانات الفرعية)
await db.ref(`invitations/${invitationId}`).remove();

// حذف RSVP محدد
await db.ref(`invitations/${invitationId}/rsvps/${rsvpId}`).remove();

// حذف تهنئة محددة
await db.ref(`invitations/${invitationId}/wishes/${wishId}`).remove();

// حذف مستخدم وجميع بياناته
await db.ref(`users/${userId}`).remove();
```

### 🔄 المعاملات (Transactions):

```javascript
// زيادة عدد المشاهدات بأمان (لمنع التعارض)
const viewsRef = db.ref(`invitations/${invitationId}/viewsCount`);

viewsRef.transaction((currentViews) => {
  return (currentViews || 0) + 1;
});

// زيادة عدد تأكيدات الحضور
const rsvpsCountRef = db.ref(`invitations/${invitationId}/rsvpsCount`);

rsvpsCountRef.transaction((currentCount) => {
  return (currentCount || 0) + 1;
});
```

---

## 🔧 أوامر Firebase CLI السريعة (Realtime Database)

```bash
# عرض حالة المشروع
firebase projects:list

# نشر قواعد الأمان (من ملف database.rules.json)
firebase deploy --only database:rules

# تصدير كل البيانات (نسخة احتياطية)
firebase database:export backup.json

# استيراد البيانات (استعادة)
firebase database:import backup.json

# فتح وحدة التحكم في المتصفح
firebase console

# عرض بيانات RTDB مباشرة
firebase database:get /templates

# تعيين بيانات مباشرة
firebase database:set /test '{"hello": "world"}'

# حذف مسار محدد
firebase database:remove /test
```

---

## ⚠️ استكشاف الأخطاء وإصلاحها

### مشكلة 1: PERMISSION_DENIED
**السبب:** قواعد الأمان ترفض الوصول

**الحل:** 
1. تحقق من تسجيل الدخول (`auth.uid`)
2. تأكد من أن القواعد تسمح بالعملية المطلوبة
3. للتجربة: استخدم مؤقتاً قواعد الاختبار:
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

### مشكلة 2: firebase.database is not a function
**السبب:** لم يتم تحميل SDK الخاص بـ Realtime Database

**الحل:** تأكد من وجود هذا السكريبت في HTML:
```html
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js"></script>
```

### مشكلة 3: البيانات لا تظهر في الوقت الحقيقي
**السبب:** استخدام `.once()` بدلاً من `.on()`

**الحل:** للاستماع للتغييرات المستمرة:
```javascript
// ❌ خطأ - يقرأ مرة واحدة فقط
db.ref('path').once('value').then(...);

// ✅ صحيح - يستمع لكل تغيير
db.ref('path').on('value', (snapshot) => {
  console.log(snapshot.val());
});
```

### مشكلة 4: خطأ في بنية البيانات
**الرسالة:** `Invalid data path`

**الحل:** 
- لا تستخدم `/` في بداية المسار
- تجنب `$`, `#`, `[`, `]`, `.`, أو أحرف تحكم أخرى في المفاتيح
- لا تستخدم مفاتيح فارغة

### مشكلة 5: تجاوز الحد الأقصى للحجم
**الحد:** 32 MB لكل عملية قراءة/كتابة، 256 MB عمق الشجرة

**الحل:** 
- قسم البيانات الكبيرة إلى عقد أصغر
- استخدم Pagination للبيانات الكثيرة
- احذف البيانات القديمة غير الضرورية

---

## ✅ قائمة التحقق النهائية (Checklist)

### قبل الإطلاق:
- [ ] إنشاء مشروع Firebase وتفعيل Realtime Database
- [ ] ربط تطبيق الويب بالمشروع (Firebase Config)
- [ ] نشر قواعد الأمان (`database.rules.json`)
- [ ] إضافة القوالب الأولية (`seed-data-rtdb.js`)
- [ ] اختبار تسجيل الدخول (Google + Email/Password)
- [ ] اختبار إنشاء/تعديل/حذف الدعوات
- [ ] اختبار نظام RSVP والتهاني
- [ ] اختبار الوصول العام للدعوات المنشورة
- [ ] ربط Cloudflare R2 (لتخزين الصور والموسيقى)
- [ ] إعداد NVIDIA AI API (للكتابة الذكية)

### الأمان:
- [ ] تغيير قواعد الأمان من وضع الاختبار للوضع الإنتاجي
- [ ] التحقق من صلاحيات القراءة/الكتابة
- [ ] إخفاء `serviceAccount.json` عن Git (إضافته لـ `.gitignore`)
- [ ] تفعيل التحقق من البريد الإلكتروني في Firebase Auth

---

## 🔄 الفرق بين Firestore و Realtime Database

| الميزة | Realtime Database | Firestore |
|--------|------------------|-----------|
| **هيكل البيانات** | JSON Tree واحد كبير | Collection/Document |
| **الاستعلامات** | محدودة (orderBy + limitTo) | مرنة (compound queries) |
| **الوقت الحقيقي** | ✅ فوري (WebSocket) | ✅ سريع لكن ليس فورياً |
| **التوسع** | شجرة واحدة (قد يصبح بطيئاً) | أفضل للتطبيقات الكبيرة |
| **الفهارس** | `.indexOn` في Rules | تلقائي أو يدوي |
| **السعر** | أرخص (بدون فهارس معقدة) | أعلى للمشاريع الكبيرة |
| **السهولة** | أسهل للمبتدئين | يحتاج خبرة أكثر |

**لماذا اخترنا Realtime Database؟**
- ✅ أسهل في التعلم والاستخدام
- ✅ مناسب لحجم البيانات المتوقع
- ✅ تحديثات فورية للضيوف (RSVP, Wishes)
- ✅ تكلفة أقل للمشروع الناشئ
- ✅ JSON Tree بسيط وسهل الفهم

---

## 📞 الدعم والمساعدة

### روابط مفيدة:
- **Firebase RTDB Docs:** https://firebase.google.com/docs/database
- **RTDB Security Rules:** https://firebase.google.com/docs/database/security
- **Firebase Console:** https://console.firebase.google.com

### للتواصل:
- البريد: support@da3watfarah.com
- الوثائق: docs.da3watfarah.com

---

**© 2025 دعوة فرح - جميع الحقوق محفوظة**
**Powered by Firebase Realtime Database ☁️**
