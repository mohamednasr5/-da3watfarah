/**
 * ===================================
 * 🌱 سكريبت إضافة البيانات التجريبية (Seed Data)
 * 🎯 مشروع: دعوة فرح - da3watfarah.com
 * ===================================
 * 
 * 📝 طريقة الاستخدام:
 * 1. npm install firebase-admin
 * 2. اذهب إلى Firebase Console → Project Settings → Service Accounts
 * 3. أنشئ مفتاح خاص (Private Key) وحمل serviceAccount.json
 * 4. node seed-data.js
 */

const admin = require('firebase-admin');
const fs = require('fs');

// تحميل بيانات الاعتماد (غير المسار حسب موقع الملف لديك)
let serviceAccount;
try {
  serviceAccount = require('./serviceAccount.json');
} catch (e) {
  console.error('❌ خطأ: لم يتم العثور على ملف serviceAccount.json');
  console.log('📥 حمّل من Firebase Console → Project Settings → Service Accounts');
  process.exit(1);
}

// تهيئة Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = admin.firestore();
const Timestamp = admin.firestore.Timestamp;

// ===================================
// 📊 البيانات التجريبية
// ===================================

// القوالب المتاحة
const TEMPLATES = [
  {
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
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  {
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
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  {
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
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  {
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
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  {
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
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  {
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
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  }
];

// مستخدم تجريبي
const TEST_USER = {
  uid: 'test-user-demo-001',
  email: 'demo@da3watfarah.com',
  displayName: 'مستخدم تجريبي',
  photoURL: null,
  plan: 'vip',
  planExpiry: Timestamp.fromDate(new Date('2027-12-31')),
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
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

// دعوات تجريبية (نماذج)
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
      date: Timestamp.fromDate(new Date('2025-12-25T19:00:00.000Z')),
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
    createdAt: Timestamp.fromDate(new Date('2025-01-15')),
    updatedAt: Timestamp.fromDate(new Date('2025-07-01')),
    weddingDate: Timestamp.fromDate(new Date('2025-12-25'))
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
      date: Timestamp.fromDate(new Date('2026-01-15T20:00:00.000Z')),
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
    createdAt: Timestamp.fromDate(new Date('2025-06-10')),
    updatedAt: Timestamp.fromDate(new Date('2025-06-15')),
    weddingDate: Timestamp.fromDate(new Date('2026-01-15'))
  }
];

// RSVPs تجريبية
const TEST_RSVPS = [
  {
    invitationId: '', // سيتم ملؤه لاحقاً
    guestName: 'سعود الغامدي',
    guestEmail: 'saud@example.com',
    guestPhone: '+966501234567',
    guestCount: 2,
    attendance: 'attending',
    message: 'ألف مبروك! أسأل الله أن يبارك لكما ويجمع بينكما في خير 🌹',
    dietaryRequirements: '',
    createdAt: Timestamp.fromDate(new Date('2025-07-28T14:30:00.000Z')),
    updatedAt: Timestamp.fromDate(new Date('2025-07-28T14:30:00.000Z'))
  },
  {
    invitationId: '',
    guestName: 'منيرة أحمد',
    guestEmail: 'monira@example.com',
    guestPhone: '',
    guestCount: 1,
    attendance: 'attending',
    message: 'ماشاء الله لا قوة إلا بالله! فرحة سعيدة 💕',
    dietaryRequirements: '',
    createdAt: Timestamp.fromDate(new Date('2025-07-27T09:15:00.000Z')),
    updatedAt: Timestamp.fromDate(new Date('2025-07-27T09:15:00.000Z'))
  },
  {
    invitationId: '',
    guestName: 'خالد العتيبي',
    guestEmail: 'khalid@example.com',
    guestPhone: '+966509876543',
    guestCount: 3,
    attendance: 'attending',
    message: 'بارك الله لكما وأسعدكما وأنبت ذريتكما 🤲',
    dietaryRequirements: 'لا يوجد',
    createdAt: Timestamp.fromDate(new Date('2025-07-26T16:45:00.000Z')),
    updatedAt: Timestamp.fromDate(new Date('2025-07-26T16:45:00.000Z'))
  }
];

// تهاني تجريبية
const TEST_WISHES = [
  {
    invitationId: '', // سيتم ملؤه لاحقاً
    authorName: 'هدى السعيد',
    authorEmail: 'huda@example.com',
    message: 'ألف مبروك! أسأل الله أن يبارك في زواجكما ويجعله زواجاً سعيداً 🌹💕',
    isVisible: true,
    createdAt: Timestamp.fromDate(new Date('2025-07-28T15:00:00.000Z'))
  },
  {
    invitationId: '',
    authorName: 'ياسر العمري',
    authorEmail: 'yasir@example.com',
    message: 'ماشاء الله عليكما! اتمنى لكما حياة مليئة بالحب والسعادة 🥰',
    isVisible: true,
    createdAt: Timestamp.fromDate(new Date('2025-07-27T11:30:00.000Z'))
  },
  {
    invitationId: '',
    authorName: 'ريم العنزي',
    authorEmail: 'reem@example.com',
    message: 'فرحة طيبة مباركة! بارك الله لكما وزادكما حباً 💗',
    isVisible: true,
    createdAt: Timestamp.fromDate(new Date('2025-07-26T20:00:00.000Z'))
  }
];

// ===================================
// ⚡ دوال الإضافة
// ===================================

async function seedTemplates() {
  console.log('\n🎨 [1/4] جاري إضافة القوالب...');
  
  for (const template of TEMPLATES) {
    await db.collection('templates').doc(template.id).set(template);
    console.log(`   ✅ ${template.nameAr} (${template.id})`);
  }
  
  console.log(`\n   📊 تمت إضافة ${TEMPLATES.length} قالب بنجاح`);
}

async function seedUser() {
  console.log('\n👤 [2/4] جاري إنشاء المستخدم التجريبي...');
  
  await db.collection('users').doc(TEST_USER.uid).set(TEST_USER);
  console.log(`   ✅ ${TEST_USER.displayName} (${TEST_USER.email})`);
  console.log(`   📋 الباقة: ${TEST_USER.plan.toUpperCase()}`);
}

async function seedInvitations() {
  console.log('\n💌 [3/4] جاري إنشاء الدعوات التجريبية...');
  
  for (let i = 0; i < TEST_INVITATIONS.length; i++) {
    const invRef = await db.collection('invitations').add(TEST_INVITATIONS[i]);
    const invId = invRef.id;
    
    // تحديث الحقل slug ليكون فريد إذا لزم
    await invRef.update({ 
      id: invId,
      slug: `${TEST_INVITATIONS[i].slug}-${i}`,
      url: `https://da3watfarah.com/${TEST_INVITATIONS[i].slug}-${i}`
    });
    
    console.log(`   ✅ ${TEST_INVITATIONS[i].couple.groomName} & ${TEST_INVITATIONS[i].couple.brideName}`);
    console.log(`      🔗 الرابط: /${TEST_INVITATIONS[i].slug}-${i}`);
    
    // حفظ ID للاستخدام في RSVPs و Wishes
    if (i === 0) {
      // استخدام أول دعوة للـ RSVPs و Wishes
      global.firstInvitationId = invId;
      
      // إضافة RSVPs لهذه الدعوة
      console.log('\n📝 [3.5/4] جاري إضافة تأكيدات الحضور...');
      for (const rsvp of TEST_RSVPS) {
        rsvp.invitationId = invId;
        await invRef.collection('rsvps').add(rsvp);
        console.log(`   ✅ RSVP: ${rsvp.guestName}`);
      }
      
      // إضافة Wishes لهذه الدعوة
      console.log('\n💬 [3.6/4] جاري إضافة التهاني...');
      for (const wish of TEST_WISHES) {
        wish.invitationId = invId;
        await invRef.collection('wishes').add(wish);
        console.log(`   ✅ تهنئة من: ${wish.authorName}`);
      }
    }
  }
  
  console.log(`\n   📊 تم إنشاء ${TEST_INVITATIONS.length} دعوة`);
}

async function verifyData() {
  console.log('\n✅ [4/4] جاري التحقق من البيانات...');
  
  const templatesCount = (await db.collection('templates').where('isActive', '==', true).get()).size;
  const usersCount = (await db.collection('users').get()).size;
  const invitationsCount = (await db.collection('invitations').get()).size;
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 ملخص البيانات المضافة:');
  console.log('='.repeat(50));
  console.log(`   🎨 القوالب:       ${templatesCount}`);
  console.log(`   👤 المستخدمون:    ${usersCount}`);
  console.log(`   💌 الدعوات:      ${invitationsCount}`);
  
  if (global.firstInvitationId) {
    const rsvpsCount = (await db.collection('invitations').doc(global.firstInvitationId).collection('rsvps').get()).size;
    const wishesCount = (await db.collection('invitations').doc(global.firstInvitationId).collection('wishes').get()).size;
    console.log(`   📝 تأكيدات الحضور: ${rsvpsCount}`);
    console.log(`   💬 التهاني:       ${wishesCount}`);
  }
  
  console.log('='.repeat(50));
  console.log('\n🎉 تمت عملية إضافة البيانات التجريبية بنجاح!');
  console.log('\n💡 يمكنك الآن:');
  console.log('   1. فتح Firebase Console لعرض البيانات');
  console.log('   2. اختبار التطبيق باستخدام: demo@da3watfarah.com');
  console.log('   3. عرض الدعوة التجريبية على: /ahmed&fatima-0');
}

// ===================================
// 🚀 التنفيذ الرئيسي
// ===================================

async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     🚀 سكريبت إضافة البيانات التجريبية - دعوة فرح          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  
  try {
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
