# 📊 دليل Firebase Realtime Database - دعوة فرح

## 🎯 هذا الدليل مخصص لـ **Realtime Database** (وليس Firestore)

---

## 📋 جدول المحتويات

1. [مقدمة عن Realtime Database](#-مقدمة)
2. [هيكل قاعدة البيانات](#-هيكل-قاعدة-البيانات)
3. [قواعد الأمان (Security Rules)](#-قواعد-الأمان-security-rules)
4. [أوامر CRUD الأساسية](#-أوامر-crud-الأساسية)
5. [سكريبت البيانات التجريبية](#-سكريبت-البيانات-التجريبية)
6. [أمثلة عملية جاهزة](#-أمثلة-عملية-جاهزة)

---

## 🚀 مقدمة

### ما هو Realtime Database؟
Realtime Database هي قاعدة بيانات NoSQL سحابية من Firebase تخزن البيانات كـ JSON وتزامنها في الوقت الفعلي مع جميع العملاء.

### الفرق بين RTDB و Firestore:

| الميزة | Realtime Database | Firestore |
|--------|------------------|-----------|
| **هيكل البيانات** | JSON Tree واحد | Collections/Documents |
| **المزامنة** | فورية حقيقية | شبه فورية |
| **الاستعلامات** | محدودة | متقدمة (compound queries) |
| **قواعد الأمان** | JSON Rules | Rules v2 |
| **السعر** | أرخص | أعلى |
| **الأداء** | أفضل للبيانات الصغيرة | أفضل للبيانات الكبيرة |

---

## 🌳 هيكل قاعدة البيانات

```
da3watfarah-default-rtdb/
│
├── users/                          # المستخدمين
│   └── {userId}/                   # معرف المستخدم (UID)
│       ├── uid: "string"
│       ├── email: "string"
│       ├── displayName: "string"
│       ├── plan: "free|premium|vip"
│       ├── settings: { ... }
│       ├── stats: { ... }
│       │
│       └── invitations/            # دعوات المستخدم
│           └── {invitationKey}/    # مفتاح الدعوة (push key)
│               ├── id: "string"
│               ├── couple: { ... }
│               ├── event: { ... }
│               ├── design: { ... }
│               ├── slug: "string"
│               ├── status: "string"
│               │
│               ├── rsvps/          # تأكيدات الحضور
│               │   └── {rsvpKey}
│               │
│               └── wishes/         # التهاني
│                   └── {wishKey}
│
├── invitations/                    # الدعوات العامة (للبحث السريع)
│   └── {invitationKey}/
│       ├── (نفس بنية الدعوة فوق)
│       ├── rsvps/
│       └── wishes/
│
├── templates/                      # القوالب المتاحة
│   ├── classic/ { ... }
│   ├── modern/ { ... }
│   ├── romantic/ { ... }
│   ├── islamic/ { ... }
│   ├── bohemian/ { ... }
│   └── royal/ { ... }
│
├── subscriptions/                  # الاشتراكات (اختياري)
│   └── {subId}/
│
└── notifications/                  # الإشعارات (اختياري)
    └── {notifId}/
```

---

## 🔒 قواعد الأمان (Security Rules)

### موقع الملف: `database.rules.json`

```json
{
  "rules": {
    // المستخدمين - كل مستخدم يتحكم في بياناته فقط
    "users": {
      ".read": "auth != null",
      ".write": "auth != null",
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null && auth.uid == $uid",
        "invitations": {
          "$invitationId": {
            ".read": true,
            ".write": "auth != null && auth.uid == $uid"
          }
        }
      }
    },
    
    // الدعوات - عامة للقراءة، صاحبها للكتابة
    "invitations": {
      ".read": true,
      "$invitationId": {
        ".read": true,
        ".write": "auth != null && (data.child('userId').val() == auth.uid || !data.exists())",
        
        // RSVPs - أي شخص يمكنه الكتابة
        "rsvps": {
          ".read": true,
          ".write": true,
          "$rsvpId": {
            ".validate": "newData.hasChildren(['guestName', 'attendance', 'guestCount'])"
          }
        },
        
        // Wishes - أي شخص يمكنه الكتابة
        "wishes": {
          ".read": true,
          ".write": true,
          "$wishId": {
            ".validate": "newData.hasChildren(['authorName', 'message'])"
          }
        }
      }
    },
    
    // القوالب - للقراءة العامة فقط
    "templates": {
      ".read": true,
      ".write": false
    }
  }
}
```

---

## ⚡ أوامر CRUD الأساسية

### 1️⃣ قراءة البيانات (Read)

```javascript
// ✅ قراءة بيانات واحدة (once)
const userData = await rtdbOnce(`users/${userId}`);
console.log(userData);

// ✅ الاستماع للتغييرات الفورية (realtime listener)
const unsubscribe = rtdbOn(`invitations/${invitationId}`, 'value', (data, key) => {
    console.log('تغيرت البيانات:', data);
});

// إيقاف الاستماع لاحقاً
unsubscribe();

// ✅ قراءة قائمة (child_added)
const rsvpsList = [];
const unsubRsvps = rtdbOn(`invitations/${id}/rsvps`, 'child_added', (data, key) => {
    rsvpsList.push({ key, ...data });
});
```

### 2️⃣ كتابة البيانات (Write/Set)

```javascript
// ✅ إنشاء/كتابة بيانات جديدة
await rtdbSet(`templates/classic`, {
    name: 'Classic',
    nameAr: 'الكلاسيكي',
    category: 'classic',
    isActive: true
});

// ✅ تحديث جزئي
await rtdbUpdate(`users/${userId}`, {
    plan: 'premium',
    'settings/currency': 'SAR'
});
```

### 3️⃣ إضافة بيانات بمفتاح فريد (Push)

```javascript
// ✅ إضافة دعوة جديدة (يُنشئ مفتاح فريد تلقائياً)
const invitationKey = await rtdbPush(`invitations`, {
    userId: currentUser.uid,
    couple: { groomName: 'أحمد', brideName: 'سارة' },
    event: { date: Date.now(), venue: 'فندق الريتز' },
    slug: 'ahmed&sara',
    status: 'draft'
});

console.log('معرف الدعوة الجديد:', invitationKey);
```

### 4️⃣ حذف البيانات

```javascript
// ✅ حذف دعوة بكاملها
await rtdbRemove(`invitations/${invitationId}`);

// ✅ حذف RSVP معين
await rtdbRemove(`invitations/${id}/rsvps/${rsvpKey}`);
```

---

## 🎯 أمثلة عملية جاهزة

### مثال 1: إنشاء دعوة جديدة

```javascript
async function createInvitation(invitationData) {
    const userId = firebaseAuth.currentUser.uid;
    
    const newInvitation = {
        userId: userId,
        couple: invitationData.couple,
        event: {
            ...invitationData.event,
            date: new Date(invitationData.event.date).getTime()
        },
        design: invitationData.design || { templateId: 'classic' },
        content: invitationData.content || {},
        slug: generateSlug(invitationData.couple),
        status: 'draft',
        isPublished: false,
        viewsCount: 0,
        rsvpsCount: 0,
        wishesCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    
    // إضافة في المسارين: العام وتحت المستخدم
    const invitationKey = await rtdbPush('invitations', newInvitation);
    await rtdbSet(`users/${userId}/invitations/${invitationKey}`, {
        ...newInvitation,
        id: invitationKey
    });
    
    return { success: true, invitationId: invitationKey };
}

function generateSlug(couple) {
    return `${couple.groomName}&${couple.brideName}`
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9&-]/g, '');
}
```

### مثال 2: الحصول على دعوة بالـ Slug

```javascript
async function getInvitationBySlug(slug) {
    // البحث في جميع الدعوات
    const allInvitations = await rtdbOnce('invitations');
    
    if (!allInvitations) return null;
    
    // البحث عن الدعوة بالـ slug
    for (const [key, inv] of Object.entries(allInvitations)) {
        if (inv.slug === slug && inv.isPublished) {
            return { ...inv, id: key };
        }
    }
    
    return null;
}
```

### مثال 3: إضافة RSVP جديد

```javascript
async function submitRsvp(invitationId, rsvpData) {
    const newRsvp = {
        guestName: rsvpData.guestName,
        guestEmail: rsvpData.guestEmail || '',
        guestPhone: rsvpData.guestPhone || '',
        guestCount: parseInt(rsvpData.guestCount) || 0,
        attendance: rsvpData.attendance, // attending | not-attending
        message: rsvpData.message || '',
        dietaryRequirements: rsvpData.dietaryRequirements || '',
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    
    // التحقق من صحة البيانات
    if (!newRsvp.guestName || newRsvp.guestName.length < 2) {
        throw new Error('اسم الضيف مطلوب');
    }
    
    if (!['attending', 'not-attending'].includes(newRsvp.attendance)) {
        throw new Error('حالة الحضور غير صحيحة');
    }
    
    // إضافة RSVP
    const rsvpKey = await rtdbPush(`invitations/${invitationId}/rsvps`, newRsvp);
    
    // تحديث عداد RSVPs
    const invitation = await rtdbOnce(`invitations/${invitationId}`);
    if (invitation) {
        await rtdbUpdate(`invitations/${invitationId}`, {
            rsvpsCount: (invitation.rsvpsCount || 0) + 1
        });
    }
    
    return { success: true, rsvpId: rsvpKey };
}
```

### مثال 4: إضافة تهنئة جديدة

```javascript
async function submitWish(invitationId, wishData) {
    const newWish = {
        authorName: wishData.authorName,
        authorEmail: wishData.authorEmail || '',
        message: wishData.message,
        isVisible: true,
        createdAt: Date.now()
    };
    
    // التحقق من صحة البيانات
    if (!newWish.authorName || newWish.authorName.length < 2) {
        throw new Error('اسم الكاتب مطلوب');
    }
    
    if (!newWish.message || newWish.message.length > 500) {
        throw new Error('رسالة التهنئة غير صحيحة');
    }
    
    // إضافة التهنئة
    const wishKey = await rtdbPush(`invitations/${invitationId}/wishes`, newWish);
    
    // تحديث عداد التهاني
    const invitation = await rtdbOnce(`invitations/${invitationId}`);
    if (invitation) {
        await rtdbUpdate(`invitations/${invitationId}`, {
            wishesCount: (invitation.wishesCount || 0) + 1
        });
    }
    
    return { success: true, wishId: wishKey };
}
```

### مثال 5: جلب القوالب المتاحة

```javascript
async function getActiveTemplates() {
    const templates = await rtdbOnce('templates');
    
    if (!templates) return [];
    
    return Object.entries(templates)
        .filter(([key, tpl]) => tpl.isActive)
        .map(([key, tpl]) => ({ id: key, ...tpl }))
        .sort((a, b) => a.sortOrder - b.sortOrder);
}

// استخدام:
const templates = await getActiveTemplates();
console.log(templates);
// [
//   { id: 'classic', nameAr: 'الكلاسيكي', ... },
//   { id: 'modern', nameAr: 'العصري', ... },
//   ...
// ]
```

### مثال 6: تحديث عدد المشاهدات

```javascript
async function incrementViews(invitationId) {
    const invitation = await rtdbOnce(`invitations/${invitationId}`);
    
    if (invitation) {
        await rtdbUpdate(`invitations/${invitationId}`, {
            viewsCount: (invitation.viewsCount || 0) + 1
        });
    }
}
```

---

## 🌱 سكريبت البيانات التجريبية

### الملف: `seed-data-rtdb.js`

```bash
# تشغيل السكريبت:
npm install firebase-admin
# حمّل serviceAccount.json من Firebase Console
node seed-data-rtdb.js
```

**النتيجة المتوقعة:**
```
🎨 [1/4] جاري إضافة القوالب إلى Realtime Database...
   ✅ الكلاسيكي (classic)
   ✅ العصري (modern)
   ✅ الرومانسي (romantic)
   ✅ الإسلامي (islamic)
   ✅ البوهيمي (bohemian)
   ✅ الملكي الفاخر (royal)

👤 [2/4] جاري إنشاء المستخدم التجريبي...
   ✅ مستخدم تجريبي (demo@da3watfarah.com)

💌 [3/4] جاري إنشاء الدعوات التجريبية...
   ✅ أحمد & فاطمة
   ✅ خالد & نورة

📝 [3.5/4] جاري إضافة تأكيدات الحضور...
   ✅ RSVP: سعود الغامدي
   ✅ RSVP: منيرة أحمد
   ✅ RSVP: خالد العتيبي

💬 [3.6/4] جاري إضافة التهاني...
   ✅ تهنئة من: هدى السعيد
   ✅ تهنئة من: ياسر العمري
   ✅ تهنئة من: ريم العنزي

✅ [4/4] جاري التحقق من البيانات...

═══════════════════════════════════════════════════
📊 ملخص البيانات المضافة:
═══════════════════════════════════════════════════
   🎨 القوالب:       6
   👤 المستخدمون:    1
   💌 الدعوات:      2
   📝 تأكيدات الحضور: 3
   💬 التهاني:       3
═══════════════════════════════════════════════════
```

---

## 🔧 نشر قواعد الأمان

### الطريقة الأولى: Firebase Console (الأسهل)

1. اذهب إلى [Firebase Console](https://console.firebase.google.com/)
2. اختر مشروعك → **Realtime Database**
3. اضغط على **Rules** (القواعد)
4. **امسح المحتوى الحالي**
5. **انسخ والصق** محتوى `database.rules.json`
6. اضغط **Publish** (نشر)

### الطريقة الثانية: CLI

```bash
# نشر قواعد الأمان
firebase deploy --only database:rules --project da3watfarah

# نشر كل شيء
firebase deploy --project da3watfarah
```

---

## 📱 استخدام Realtime Database في HTML

### تأكد من تضمين SDK الضروري:

```html
<!-- في كل صفحات HTML -->
<script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-database-compat.js"></script> <!-- مهم! -->
<script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-storage-compat.js"></script>
```

---

## ✅ قائمة التحقق النهائية

- [ ] إنشاء مشروع Firebase
- [ ] تفعيل **Realtime Database** (وليس Firestore!)
- [ ] نشر قواعد الأمان (`database.rules.json`)
- [ ] تشغيل سكريبت البيانات (`seed-data-rtdb.js`)
- [ ] اختبار عمليات القراءة/الكتابة
- [ ] اختبار المزامنة الفورية (Realtime listeners)

---

## 🆘 المساعدة والدعم

### روابط مفيدة:
- **Console:** https://console.firebase.google.com/project/da3watfarah/database/da3watfarah-default-rtdb/data
- **Docs:** https://firebase.google.com/docs/database
- **Rules:** https://firebase.google.com/docs/database/security

---

**© 2025 دعوة فرح - جميع الحقوق محفوظة**
