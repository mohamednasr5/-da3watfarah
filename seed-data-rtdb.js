/**
 * ===================================
 * 🌱 سكريبت إضافة البيانات التجريبية
 * 🎯 Firebase Realtime Database Version
 * 📦 مشروع: دعوة فرح - da3watfarah.com
 * ===================================
 * 
 * 📝 طريقة الاستخدام:
 * 1. npm install firebase-admin
 * 2. اذهب إلى Firebase Console → Project Settings → Service Accounts
 * 3. أنشئ مفتاح خاص (Private Key) وحمل serviceAccount.json
 * 4. node seed-data-rtdb.js
 */

const admin = require('firebase-admin');
const fs = require('fs');

// تحميل بيانات الاعتماد
let serviceAccount;
try {
  serviceAccount = require('./serviceAccount.json');
} catch (e) {
  console.error('❌ خطأ: لم يتم العثور على ملف serviceAccount.json');
  console.log('📥 حمّل من Firebase Console → Project Settings → Service Accounts → Generate Private Key');
  process.exit(1);
}

// تهيئة Firebase Admin مع Realtime Database
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://da3watfarah-default-rtdb.firebaseio.com'
});

const db = admin.database();

// ===================================
// 📊 البيانات التجريبية
// ===================================

// القوالب المتاحة
const TEMPLATES = {
  classic: {
    id: 'classic',
    name: 'Classic',
    nameAr: 'الكلاسيكي',
    category: 'classic',
    description: 'تصميم كلاسيكي أنيق يناسب جميع الأذواق مع ألوان دافئة وزخارف تقليدية',
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
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  modern: {
    id: 'modern',
    name: 'Modern',
    nameAr: 'العصري',
    category: 'modern',
    description: 'تصميم عصري بألوان جريئة وأشكال هندسية حديثة تناسب الشباب',
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
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  romantic: {
    id: 'romantic',
    name: 'Romantic',
    nameAr: 'الرومانسي',
    category: 'romantic',
    description: 'تصميم رومانسي ناعم بالقلوب والورود وألوان الباستل الدافئة',
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
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  islamic: {
    id: 'islamic',
    name: 'Islamic',
    nameAr: 'الإسلامي',
    category: 'islamic',
    description: 'تصميم إسلامي فاخر بالزخارف الإسلامية والآيات القرآنية والألوان الخضراء والذهبية',
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
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  bohemian: {
    id: 'bohemian',
    name: 'Bohemian',
    nameAr: 'البوهيمي',
    category: 'bohemian',
    description: 'تصميم بوهيمي حر بألوان الطبيعة الترابية والورود البرية، مثالي للأعراس في الهواء الطلق',
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
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  royal: {
    id: 'royal',
    name: 'Royal',
    nameAr: 'الملكي الفاخر',
    category: 'royal',
    description: 'تصميم ملكي فاخر بالذهب والأرجواني الداكن والتاجات، للمناسبات الاستثنائية',
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
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
};

// مستخدم تجريبي
const TEST_USER = {
  uid: 'test-user-demo-001',
  email: 'demo@da3watfarah.com',
  displayName: 'مستخدم تجريبي',
  photoURL: null,
  plan: 'vip',
  planExpiry: new Date('2027-12-31').getTime(),
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

// دعوات تجريبية
const TEST_INVITATIONS = [
  {
    userId: 'test-user-demo-001',
    couple: {
      groomName: 'أحمد',
      groomFatherName: 'محمد',
      brideName: 'فاطمة',
      brideFatherName: 'عبدالله',
      parentsNames: 'محمد العتيبي & نورة الخالد'
    },
    event: {
      date: new Date('2025-12-25T19:00:00.000Z').getTime(),
      time: '7:00 مساءً',
      venue: 'قاعة الأمير سلطان',
      address: 'شارع التحلية، حي الملقا، الرياض',
      location: { lat: 24.71356, lng: 46.67529 },
      googleMapsUrl: 'https://maps.google.com/?q=24.71356,46.67529'
    },
    design: {
      templateId: 'classic',
      primaryColor: '#8B4513',
      secondaryColor: '#D4AF37',
      fontFamily: "'Aref Ruqaa', serif",
      coverImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1920',
      galleryImages: [
        'https://images.unsplash.com/photo-1519741497674-611481863552?w=400',
        'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=400',
        'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400'
      ],
      musicUrl: ''
    },
    content: {
      welcomeText: '﴿وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا لِّتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً﴾',
      invitationText: 'يسرنا ويسعدنا أن ندعوكم لحضور زفاف ابنتنا الحبيبة فاطمة مع فارس أحلامها أحمد',
      quranVerse: 'وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا',
      loveStory: []
    },
    slug: 'ahmed&fatima',
    url: 'https://da3watfarah.com/ahmed&fatima',
    status: 'active',
    isPublished: true,
    viewsCount: 156,
    rsvpsCount: 42,
    wishesCount: 18,
    createdAt: new Date('2025-01-15').getTime(),
    updatedAt: new Date('2025-07-01').getTime(),
    weddingDate: new Date('2025-12-25').getTime()
  },
  {
    userId: 'test-user-demo-001',
    couple: {
      groomName: 'خالد',
      groomFatherName: 'فهد',
      brideName: 'نورة',
      brideFatherName: 'سعد',
      parentsNames: 'سعد الشمري & هيا العتيبي'
    },
    event: {
      date: new Date('2026-01-15T20:00:00.000Z').getTime(),
      time: '8:00 مساءً',
      venue: 'فندق Four Seasons',
      address: 'طريق الملك فهد، الرياض',
      location: { lat: 24.68, lng: 46.70 },
      googleMapsUrl: 'https://maps.google.com/?q=24.68,46.70'
    },
    design: {
      templateId: 'modern',
      primaryColor: '#1A1A2E',
      secondaryColor: '#E94560',
      fontFamily: "'Tajawal', sans-serif",
      coverImage: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=1920',
      galleryImages: [],
      musicUrl: ''
    },
    content: {
      invitationText: 'بحضوركم تتزين المناسبة وتبتهج القلوب - ندعوكم لحضور زفاف ابنتنا نورة مع خالد',
      loveStory: []
    },
    slug: 'khaled&noura',
    url: 'https://da3watfarah.com/khaled&noura',
    status: 'draft',
    isPublished: false,
    viewsCount: 23,
    rsvpsCount: 0,
    wishesCount: 0,
    createdAt: new Date('2025-06-10').getTime(),
    updatedAt: new Date('2025-06-15').getTime(),
    weddingDate: new Date('2026-01-15').getTime()
  }
];

// RSVPs تجريبية
const TEST_RSVPS = [
  {
    guestName: 'سعود الغامدي',
    guestEmail: 'saud@example.com',
    guestPhone: '+966501234567',
    guestCount: 2,
    attendance: 'attending',
    message: 'ألف مبروك! أسأل الله أن يبارك لكما ويجمع بينكما في خير 🌹',
    dietaryRequirements: '',
    createdAt: new Date('2025-07-28T14:30:00.000Z').getTime(),
    updatedAt: new Date('2025-07-28T14:30:00.000Z').getTime()
  },
  {
    guestName: 'منيرة أحمد',
    guestEmail: 'monira@example.com',
    guestPhone: '',
    guestCount: 1,
    attendance: 'attending',
    message: 'ماشاء الله لا قوة إلا بالله! فرحة سعيدة 💕',
    dietaryRequirements: '',
    createdAt: new Date('2025-07-27T09:15:00.000Z').getTime(),
    updatedAt: new Date('2025-07-27T09:15:00.000Z').getTime()
  },
  {
    guestName: 'خالد العتيبي',
    guestEmail: 'khalid@example.com',
    guestPhone: '+966509876543',
    guestCount: 3,
    attendance: 'attending',
    message: 'بارك الله لكما وأسعدكما وأنبت ذريتكما 🤲',
    dietaryRequirements: 'لا يوجد',
    createdAt: new Date('2025-07-26T16:45:00.000Z').getTime(),
    updatedAt: new Date('2025-07-26T16:45:00.000Z').getTime()
  }
];

// تهاني تجريبية
const TEST_WISHES = [
  {
    authorName: 'هدى السعيد',
    authorEmail: 'huda@example.com',
    message: 'ألف مبروك! أسأل الله أن يبارك في زواجكما ويجعله زواجاً سعيداً 🌹💕',
    isVisible: true,
    createdAt: new Date('2025-07-28T15:00:00.000Z').getTime()
  },
  {
    authorName: 'ياسر العمري',
    authorEmail: 'yasir@example.com',
    message: 'ماشاء الله عليكما! اتمنى لكما حياة مليئة بالحب والسعادة 🥰',
    isVisible: true,
    createdAt: new Date('2025-07-27T11:30:00.000Z').getTime()
  },
  {
    authorName: 'ريم العنزي',
    authorEmail: 'reem@example.com',
    message: 'فرحة طيبة مباركة! بارك الله لكما وزادكما حباً 💗',
    isVisible: true,
    createdAt: new Date('2025-07-26T20:00:00.000Z').getTime()
  }
];

// ===================================
// ⚡ دوال الإضافة لـ Realtime Database
// ===================================

async function seedTemplates() {
  console.log('\n🎨 [1/4] جاري إضافة القوالب إلى Realtime Database...');
  
  const templatesRef = db.ref('templates');
  
  for (const [templateId, templateData] of Object.entries(TEMPLATES)) {
    await templatesRef.child(templateId).set(templateData);
    console.log(`   ✅ ${templateData.nameAr} (${templateId})`);
  }
  
  console.log(`\n   📊 تمت إضافة ${Object.keys(TEMPLATES).length} قالب بنجاح`);
}

async function seedUser() {
  console.log('\n👤 [2/4] جاري إنشاء المستخدم التجريبي...');
  
  await db.ref(`users/${TEST_USER.uid}`).set(TEST_USER);
  console.log(`   ✅ ${TEST_USER.displayName} (${TEST_USER.email})`);
  console.log(`   📋 الباقة: ${TEST_USER.plan.toUpperCase()}`);
}

async function seedInvitations() {
  console.log('\n💌 [3/4] جاري إنشاء الدعوات التجريبية...');
  
  const invitationsRef = db.ref('invitations');
  
  for (let i = 0; i < TEST_INVITATIONS.length; i++) {
    // إنشاء معرف فريد للدعوة
    const invitationKey = invitationsRef.push().key;
    
    // تحديث البيانات بالمفتاح
    const invitationData = {
      ...TEST_INVITATIONS[i],
      id: invitationKey,
      slug: `${TEST_INVITATIONS[i].slug}-${i}`,
      url: `https://da3watfarah.com/${TEST_INVITATIONS[i].slug}-${i}`
    };
    
    // حفظ الدعوة في المسارين: العام وتحت المستخدم
    await invitationsRef.child(invitationKey).set(invitationData);
    await db.ref(`users/${TEST_USER.uid}/invitations/${invitationKey}`).set(invitationData);
    
    console.log(`   ✅ ${invitationData.couple.groomName} & ${invitationData.couple.brideName}`);
    console.log(`      🔗 الرابط: /${invitationData.slug}`);
    
    // إضافة RSVPs و Wishes لأول دعوة فقط
    if (i === 0) {
      global.firstInvitationKey = invitationKey;
      
      // إضافة RSVPs
      console.log('\n📝 [3.5/4] جاري إضافة تأكيدات الحضور...');
      for (const rsvp of TEST_RSVPS) {
        const rsvpKey = db.ref(`invitations/${invitationKey}/rsvps`).push().key;
        await db.ref(`invitations/${invitationKey}/rsvps/${rsvpKey}`).set(rsvp);
        await db.ref(`users/${TEST_USER.uid}/invitations/${invitationKey}/rsvps/${rsvpKey}`).set(rsvp);
        console.log(`   ✅ RSVP: ${rsvp.guestName}`);
      }
      
      // إضافة Wishes
      console.log('\n💬 [3.6/4] جاري إضافة التهاني...');
      for (const wish of TEST_WISHES) {
        const wishKey = db.ref(`invitations/${invitationKey}/wishes`).push().key;
        await db.ref(`invitations/${invitationKey}/wishes/${wishKey}`).set(wish);
        await db.ref(`users/${TEST_USER.uid}/invitations/${invitationKey}/wishes/${wishKey}`).set(wish);
        console.log(`   ✅ تهنئة من: ${wish.authorName}`);
      }
    }
  }
  
  console.log(`\n   📊 تم إنشاء ${TEST_INVITATIONS.length} دعوة`);
}

async function verifyData() {
  console.log('\n✅ [4/4] جاري التحقق من البيانات...');
  
  const templatesSnap = await db.ref('templates').once('value');
  const usersSnap = await db.ref('users').once('value');
  const invitationsSnap = await db.ref('invitations').once('value');
  
  const templatesCount = templatesSnap.exists() ? Object.keys(templatesSnap.val()).length : 0;
  const usersCount = usersSnap.exists() ? Object.keys(usersSnap.val()).length : 0;
  const invitationsCount = invitationsSnap.exists() ? Object.keys(invitationsSnap.val()).length : 0;
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 ملخص البيانات المضافة:');
  console.log('='.repeat(50));
  console.log(`   🎨 القوالب:       ${templatesCount}`);
  console.log(`   👤 المستخدمون:    ${usersCount}`);
  console.log(`   💌 الدعوات:      ${invitationsCount}`);
  
  if (global.firstInvitationKey) {
    const rsvpsSnap = await db.ref(`invitations/${global.firstInvitationKey}/rsvps`).once('value');
    const wishesSnap = await db.ref(`invitations/${global.firstInvitationKey}/wishes`).once('value');
    
    const rsvpsCount = rsvpsSnap.exists() ? Object.keys(rsvpsSnap.val()).length : 0;
    const wishesCount = wishesSnap.exists() ? Object.keys(wishesSnap.val()).length : 0;
    
    console.log(`   📝 تأكيدات الحضور: ${rsvpsCount}`);
    console.log(`   💬 التهاني:       ${wishesCount}`);
  }
  
  console.log('='.repeat(50));
  console.log('\n🎉 تمت عملية إضافة البيانات التجريبية بنجاح!');
  console.log('\n💡 يمكنك الآن:');
  console.log('   1. فتح Firebase Console → Realtime Database لعرض البيانات');
  console.log('   2. اختبار التطبيق باستخدام: demo@da3watfarah.com');
  console.log('   3. عرض الدعوة التجريبية على: /ahmed&fatima-0');
  console.log('\n🔗 روابط مفيدة:');
  console.log('   • Console: https://console.firebase.google.com/project/da3watfarah/database/da3watfarah-default-rtdb/data');
}

// ===================================
// 🚀 التنفيذ الرئيسي
// ===================================

async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     🚀 سكريبت إضافة البيانات - Realtime Database           ║');
  console.log('║     🎯 مشروع: دعوة فرح - da3watfarah.com                  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  
  try {
    // اختبار الاتصال بقاعدة البيانات
    await db.ref('.info/connected').once('value');
    console.log('✅ متصل بـ Realtime Database بنجاح\n');
    
    await seedTemplates();
    await seedUser();
    await seedInvitations();
    await verifyData();
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ حدث خطأ:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
