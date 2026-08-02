/**
 * ===================================
 * دعوة فرح - AI Prompts & Random Cover System
 * Da3wat Farah - نظام الـ Prompts الذكية والصور العشوائية
 * ===================================
 * 
 * This module provides:
 * 1. AI_PROMPTS - Professional prompts for each event type (in English for AI)
 * 2. COVER_IMAGE_SOURCES - Image sources configuration per event type
 * 3. getRandomCoverImage() - Function to fetch random cover images
 * 
 * APIs Used:
 * - Unsplash Source (free, no API key needed): https://source.unsplash.com
 * - Pexels API (free tier, optional): https://api.pexels.com
 * 
 * @version 1.0.0
 * @author Da3wat Farah Team
 */

// ===================================
// A. AI Prompts System / نظام الـ Prompts الذكية
// ===================================
// All prompts are in English for better AI understanding
// جميع الـ Prompts بالإنجليزية لفهم أفضل من الـ AI

const AI_PROMPTS = {
    // Wedding / زفاف
    wedding: {
        en: `You are a professional Arabic wedding invitation writer. Write a beautiful, elegant wedding invitation in Arabic for:

- Groom: {groomName}
- Bride: {brideName}
- Date: {date}
- Venue: {venue}
- Style: {style} (formal/modern/poetic/simple)

Requirements:
- Write in fluent, natural Arabic
- Include Islamic blessings (بسم الله الرحمن الرحيم, الحمد لله رب العالمين)
- Make it warm and inviting
- Keep it 3-5 paragraphs max
- End with RSVP-style closing (يرجى تأكيد الحضور)
- Use appropriate Arabic wedding terminology
- Include traditional Arabic welcome phrases`,
        
        formal: `Write a FORMAL and TRADITIONAL Arabic wedding invitation for:
- Groom: {groomName}
- Bride: {brideName}
- Date: {date}
- Venue: {venue}

Style guidelines:
- Use classical Arabic (فصحى)
- Include Quranic verses about marriage
- Traditional Islamic opening (بسم الله الرحمن الرحيم)
- Formal closing with Dua
- Elegant and sophisticated tone`,
        
        modern: `Write a MODERN and CONTEMPORARY Arabic wedding invitation for:
- Groom: {groomName}
- Bride: {brideName}
- Date: {date}
- Venue: {venue}

Style guidelines:
- Use modern simple Arabic (عربية فصحى مبسطة)
- Creative and unique opening
- Warm and friendly tone
- Include emoji or decorative elements suggestions
- Modern RSVP style`,
        
        poetic: `Write a POETIC and ROMANTIC Arabic wedding invitation for:
- Groom: {groomName}
- Bride: {brideName}
- Date: {date}
- Venue: {venue}

Style guidelines:
- Use beautiful Arabic poetry style
- Include romantic imagery and metaphors
- Reference to love and union in Arabic literary tradition
- Elegant flowery language
- Poetic closing with blessings`,
        
        simple: `Write a SIMPLE and WARM Arabic wedding invitation for:
- Groom: {groomName}
- Bride: {brideName}
- Date: {date}
- Venue: {venue}

Style guidelines:
- Clear and easy to understand Arabic
- Direct and heartfelt
- Not too long (2-3 paragraphs)
- Friendly and welcoming
- Simple RSVP`
    },

    // Engagement / خطوبة
    engagement: {
        en: `You are a professional Arabic engagement invitation writer. Write a beautiful engagement celebration invitation in Arabic for:

- Groom: {groomName}
- Bride: {brideName}
- Date: {date}
- Venue: {venue}
- Style: {style} (formal/modern/poetic/simple)

Requirements:
- Write in fluent, natural Arabic
- Celebrate the engagement milestone
- Express joy and blessings for the couple
- Keep it 2-4 paragraphs
- Include warm wishes for the journey ahead`,
        
        formal: `Write a FORMAL Arabic engagement invitation for:
- Groom: {groomName}
- Bride: {brideName}
- Date: {date}
- Venue: {venue}

Use classical Arabic with traditional engagement terminology.`,
        
        modern: `Write a MODERN Arabic engagement invitation for:
- Groom: {groomName}
- Bride: {brideName}
- Date: {date}
- Venue: {venue}

Make it creative, fun, and contemporary.`,
        
        poetic: `Write a POETIC Arabic engagement invitation for:
- Groom: {groomName}
- Bride: {brideName}
- Date: {date}
- Venue: {venue}

Use romantic, flowing Arabic prose.`,
        
        simple: `Write a SIMPLE Arabic engagement invitation for:
- Groom: {groomName}
- Bride: {brideName}
- Date: {date}
- Venue: {venue}

Keep it warm, direct, and heartfelt.`
    },

    // Katb Kitab / كتب الكتاب
    katb_ketab: {
        en: `You are a professional Arabic katb kitab (marriage contract) invitation writer. Write a beautiful religious ceremony invitation in Arabic for:

- Groom: {groomName}
- Bride: {brideName}
- Date: {date}
- Venue: {venue}
- Style: {style} (formal/modern/poetic/simple)

Requirements:
- Write in fluent, natural Arabic
- Emphasize the religious significance of katb kitab
- Include appropriate Islamic references
- Keep it 3-4 paragraphs
- Reflect the solemnity and joy of this religious occasion`,
        
        formal: `Write a FORMAL Arabic katb kitab invitation for:
- Groom: {groomName}
- Bride: {brideName}
- Date: {date}
- Venue: {venue}

Emphasize the religious and legal significance of this ceremony.`,
        
        modern: `Write a MODERN Arabic katb kitab invitation for:
- Groom: {groomName}
- Bride: {brideName}
- Date: {date}
- Venue: {venue}

Balance tradition with contemporary expression.`,
        
        poetic: `Write a POETIC Arabic katb kitab invitation for:
- Groom: {groomName}
- Bride: {brideName}
- Date: {date}
- Venue: {venue}

Use spiritual and elevated language.`,
        
        simple: `Write a SIMPLE Arabic katb kitab invitation for:
- Groom: {groomName}
- Bride: {brideName}
- Date: {date}
- Venue: {venue}

Clear, warm, and respectful.`
    },

    // Henna Night / ليلة الحناء
    henna: {
        en: `You are a professional Arabic henna night invitation writer. Write a festive, joyful henna night invitation in Arabic for:

- Bride: {brideName}
- Groom: {groomName} (optional)
- Date: {date}
- Venue: {venue}
- Style: {style} (formal/modern/poetic/simple)

Requirements:
- Write in fluent, natural Arabic
- Capture the festive atmosphere of henna night
- Include traditional henna night elements
- Keep it 2-3 paragraphs
- Make it celebratory and warm`,
        
        formal: `Write a FORMAL Arabic henna night invitation for:
- Bride: {brideName}
- Date: {date}
- Venue: {venue}

Elegant and traditional.`,
        
        modern: `Write a MODERN Arabic henna night invitation for:
- Bride: {brideName}
- Date: {date}
- Venue: {venue}

Fun, energetic, and contemporary.`,
        
        poetic: `Write a POETIC Arabic henna night invitation for:
- Bride: {brideName}
- Date: {date}
- Venue: {venue}

Beautiful and evocative language.`,
        
        simple: `Write a SIMPLE Arabic henna night invitation for:
- Bride: {brideName}
- Date: {date}
- Venue: {venue}

Warm and inviting.`
    },

    // Birthday / عيد ميلاد
    birthday: {
        en: `You are a professional Arabic birthday celebration invitation writer. Write a joyful birthday invitation in Arabic for:

- Celebrant Name: {groomName}
- Age: (if provided)
- Date: {date}
- Venue: {venue}
- Style: {style} (formal/modern/poetic/simple)

Requirements:
- Write in fluent, natural Arabic
- Make it celebratory and joyful
- Include birthday wishes and blessings
- Keep it 2-3 paragraphs
- Fun and welcoming tone`,
        
        formal: `Write a FORMAL Arabic birthday invitation for:
- Celebrant: {groomName}
- Date: {date}
- Venue: {venue}

Elegant and dignified.`,
        
        modern: `Write a MODERN Arabic birthday invitation for:
- Celebrant: {groomName}
- Date: {date}
- Venue: {venue}

Fun, creative, and exciting!`,
        
        poetic: `Write a POETIC Arabic birthday invitation for:
- Celebrant: {groomName}
- Date: {date}
- Venue: {venue}

Beautiful and inspiring language.`,
        
        simple: `Write a SIMPLE Arabic birthday invitation for:
- Celebrant: {groomName}
- Date: {date}
- Venue: {venue}

Warm, direct, and friendly.`
    },

    // Newborn / استقبال مولود
    newborn: {
        en: `You are a professional Arabic newborn celebration (Aqeeqah/Sebr) invitation writer. Write a heartwarming newborn celebration invitation in Arabic for:

- Baby Name: {groomName}
- Parent Names: {brideName} (mother/family)
- Date: {date}
- Venue: {venue}
- Style: {style} (formal/modern/poetic/simple)

Requirements:
- Write in fluent, natural Arabic
- Express joy for the new blessing
- Include Islamic congratulations for newborn
- Keep it 2-3 paragraphs
- Warm and blessed tone`,
        
        formal: `Write a FORMAL Arabic newborn celebration invitation for:
- Baby: {groomName}
- Parents: {brideName}
- Date: {date}
- Venue: {venue}

Traditional and elegant with Islamic blessings.`,
        
        modern: `Write a MODERN Arabic newborn celebration invitation for:
- Baby: {groomName}
- Parents: {brideName}
- Date: {date}
- Venue: {venue}

Contemporary and heartwarming.`,
        
        poetic: `Write a POETIC Arabic newborn celebration invitation for:
- Baby: {groomName}
- Parents: {brideName}
- Date: {date}
- Venue: {venue}

Beautiful language celebrating new life.`,
        
        simple: `Write a SIMPLE Arabic newborn celebration invitation for:
- Baby: {groomName}
- Parents: {brideName}
- Date: {date}
- Venue: {venue}

Warm and straightforward.`
    },

    // Graduation / تخرج
    graduation: {
        en: `You are a professional Arabic graduation celebration invitation writer. Write an inspiring graduation invitation in Arabic for:

- Graduate Name: {groomName}
- Major/Field: (if provided)
- Date: {date}
- Venue: {venue}
- Style: {style} (formal/modern/poetic/simple)

Requirements:
- Write in fluent, natural Arabic
- Celebrate academic achievement
- Include encouraging words for the future
- Keep it 2-3 paragraphs
- Inspiring and proud tone`,
        
        formal: `Write a FORMAL Arabic graduation invitation for:
- Graduate: {groomName}
- Date: {date}
- Venue: {venue}

Dignified and impressive.`,
        
        modern: `Write a MODERN Arabic graduation invitation for:
- Graduate: {groomName}
- Date: {date}
- Venue: {venue}

Dynamic and forward-looking!`,
        
        poetic: `Write a POETIC Arabic graduation invitation for:
- Graduate: {groomName}
- Date: {date}
- Venue: {venue}

Inspiring and eloquent language.`,
        
        simple: `Write a SIMPLE Arabic graduation invitation for:
- Graduate: {groomName}
- Date: {date}
- Venue: {venue}

Proud and welcoming.`
    },

    // Ramadan / رمضان
    ramadan: {
        en: `You are a professional Arabic Ramadan greeting and iftar party invitation writer. Write a beautiful Ramadan invitation/greeting in Arabic for:

- Host Name: {groomName}
- Occasion: {brideName} (e.g., Iftar Party, Suhoor, Ramadan Gathering)
- Date: {date}
- Venue: {venue}
- Style: {style} (formal/modern/poetic/simple)

Requirements:
- Write in fluent, natural Arabic
- Include Ramadan greetings and blessings
- Reference the holy month appropriately
- Keep it 2-3 paragraphs
- Warm, spiritual, and inviting tone
- Include traditional Ramadan phrases (رمضان كريم، كل عام وأنتم بخير)`,
        
        formal: `Write a FORMAL Arabic Ramadan invitation for:
- Host: {groomName}
- Event: {brideName}
- Date: {date}
- Venue: {venue}

Traditional and reverent with proper Islamic expressions.`,
        
        modern: `Write a MODERN Arabic Ramadan invitation for:
- Host: {groomName}
- Event: {brideName}
- Date: {date}
- Venue: {venue}

Contemporary while respecting the holy month.`,
        
        poetic: `Write a POETIC Arabic Ramadan invitation for:
- Host: {groomName}
- Event: {brideName}
- Date: {date}
- Venue: {venue}

Beautiful spiritual language about Ramadan blessings.`,
        
        simple: `Write a SIMPLE Arabic Ramadan invitation for:
- Host: {groomName}
- Event: {brideName}
- Date: {date}
- Venue: {venue}

Warm, clear, and welcoming.`
    }
};

// ===================================
// B. Cover Image Sources Configuration
// إعدادات مصادر صور الأغلفة
// ===================================

const COVER_IMAGE_SOURCES = {
    // Wedding images / صور الزفاف
    wedding: {
        unsplash: ['wedding', 'wedding decoration', 'wedding flowers', 'romantic wedding', 'bridal', 'wedding venue'],
        loremflickr: ['bride,groom', 'wedding,couple', 'bride,wedding', 'wedding,ceremony', 'groom,bride'],
        pexels: ['wedding', 'marriage', 'bridal', 'wedding ceremony'],
        pixabay: ['wedding', 'marriage', 'bridal'],
        colors: ['#D4AF37', '#F5E6D3', '#8B0000', '#FFFFFF'], // Gold, Cream, Dark Red, White
        fallbackText: 'زفاف سعيد' // Fallback image text
    },
    
    // Engagement images / صور الخطوبة
    engagement: {
        unsplash: ['engagement ring', 'romantic dinner', 'couple love', 'engagement party', 'roses'],
        loremflickr: ['couple,ring', 'engagement,ring', 'couple,romantic', 'couple,roses'],
        pexels: ['engagement', 'ring', 'couple', 'romantic'],
        pixabay: ['engagement', 'ring', 'love'],
        colors: ['#FF69B4', '#FFD700', '#C0C0C0', '#FFE4E1'], // Pink, Gold, Silver, Misty Rose
        fallbackText: 'خطوبة سعيدة'
    },
    
    // Katb Kitab images / صور كتب الكتاب
    katb_ketab: {
        unsplash: ['islamic decoration', 'arabic calligraphy', 'mosque interior', 'islamic pattern'],
        loremflickr: ['mosque,islamic', 'quran,islamic', 'arabic,calligraphy', 'mosque,interior'],
        pexels: ['islamic', 'mosque', 'arabic', 'traditional'],
        pixabay: ['islamic', 'mosque', 'arabic'],
        colors: ['#1A5F1A', '#D4AF37', '#FFFFFF', '#2C3E50'], // Green, Gold, White, Dark Blue
        fallbackText: 'كتب الكتاب'
    },
    
    // Henna Night images / صور ليلة الحناء
    henna: {
        unsplash: ['henna design', 'henna party', 'arabic celebration', 'women gathering'],
        loremflickr: ['henna,hands', 'henna,party', 'henna,design'],
        pexels: ['henna', 'celebration', 'party', 'decorated hands'],
        pixabay: ['henna', 'party', 'decoration'],
        colors: ['#8B008B', '#FF1493', '#D4AF37', '#2D1B4E'], // Purple, Pink, Gold, Deep Purple
        fallbackText: 'ليلة حناء'
    },
    
    // Birthday images / صور عيد الميلاد
    birthday: {
        unsplash: ['birthday party', 'birthday cake', 'balloons', 'celebration', 'confetti'],
        loremflickr: ['birthday,cake', 'balloons,party', 'birthday,celebration', 'confetti,party'],
        pexels: ['birthday', 'cake', 'balloons', 'party'],
        pixabay: ['birthday', 'cake', 'celebration'],
        colors: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3'], // Coral, Teal, Yellow, Mint
        fallbackText: 'عيد ميلاد سعيد'
    },
    
    // Newborn images / صور استقبال مولود
    newborn: {
        unsplash: ['baby', 'newborn', 'baby shower', 'baby feet', 'soft baby'],
        loremflickr: ['baby,newborn', 'baby,cute', 'baby,shower'],
        pexels: ['baby', 'newborn', 'baby shower', 'cute baby'],
        pixabay: ['baby', 'newborn', 'baby shower'],
        colors: ['#FFB6C1', '#87CEEB', '#F0E68C', '#DDA0DD'], // Light Pink, Sky Blue, Khaki, Plum
        fallbackText: 'مبارك المولود'
    },
    
    // Graduation images / صور التخرج
    graduation: {
        unsplash: ['graduation', 'cap and gown', 'university', 'diploma', 'academic'],
        loremflickr: ['graduation,cap', 'graduation,university', 'graduation,diploma'],
        pexels: ['graduation', 'university', 'student', 'education'],
        pixabay: ['graduation', 'university', 'education'],
        colors: ['#1E3A5F', '#D4AF37', '#2E4057', '#F5F5DC'], // Navy Blue, Gold, Dark Gray, Beige
        fallbackText: 'مبروك التخرج'
    },
    
    // Ramadan images / صور رمضان
    ramadan: {
        unsplash: ['ramadan', 'iftar', 'lanterns', 'moon and stars', 'dates', 'mosque at night'],
        loremflickr: ['ramadan,lantern', 'mosque,night', 'lantern,moon'],
        pexels: ['ramadan', 'iftar', 'lantern', 'islamic'],
        pixabay: ['ramadan', 'lantern', 'moon', 'islamic'],
        colors: ['#6B8E23', '#D4AF37', '#1a1a2e', '#8B4513'], // Olive Green, Gold, Dark Purple, Saddle Brown
        fallbackText: 'رمضان كريم'
    }
};

// ===================================
// C. Random Cover Image Functions
// دوال جلب الصور العشوائية
// ===================================

/**
 * Get a random item from an array
 * الحصول على عنصر عشوائي من مصفوفة
 * @param {Array} arr - The array to pick from
 * @returns {*} Random item from array
 */
function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a placeholder image URL using CSS gradients and text
 * إنشاء رابط صورة بديلة باستخدام تدرجات CSS ونص
 * @param {string} eventType - Type of event
 * @param {number} width - Image width (default 800)
 * @param {number} height - Image height (default 600)
 * @returns {string} Data URL or placeholder URL
 */
function generatePlaceholderImage(eventType, width = 800, height = 600) {
    const config = COVER_IMAGE_SOURCES[eventType] || COVER_IMAGE_SOURCES.wedding;
    const color1 = getRandomItem(config.colors);
    const color2 = getRandomItem(config.colors.filter(c => c !== color1));
    const text = config.fallbackText || 'دعوة فرح';
    
    // Using placeholder.com-like service or generate SVG
    // For production, use a proper placeholder service
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
            <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
                </linearGradient>
            </defs>
            <rect width="${width}" height="${height}" fill="url(#grad)"/>
            <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="36" fill="white" 
                  text-anchor="middle" dominant-baseline="middle">${text}</text>
        </svg>
    `;
    
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

/**
 * Fetch random cover image from Unsplash Source (Free, no API key needed)
 * جلب صورة غلاف عشوائية من Unsplash Source (مجاني بدون مفتاح API)
 * 
 * Note: Unsplash Source is deprecated but still works.
 * Alternative: Use https://images.unsplash.com with specific photo IDs
 * 
 * @param {string} eventType - Type of event (wedding, engagement, etc.)
 * @param {Object} options - Additional options
 * @param {number} options.width - Image width (default 800)
 * @param {number} options.height - Image height (default 600)
 * @returns {Promise<string>} URL of the random image
 */
async function fetchFromUnsplash(eventType, options = {}) {
    const config = COVER_IMAGE_SOURCES[eventType];
    if (!config) {
        console.warn(`Unknown event type: ${eventType}, falling back to wedding`);
        return fetchFromUnsplash('wedding', options);
    }
    
    const query = getRandomItem(config.unsplash);
    const width = options.width || 800;
    const height = options.height || 600;
    
    // Unsplash Source API (deprecated but functional)
    // Alternative: Use picsum.photos or other free services
    const url = `https://source.unsplash.com/${width}x${height}/?${encodeURIComponent(query)}&sig=${Date.now()}`;
    
    return url;
}

/**
 * Fetch a REAL photo (not a placeholder) from LoremFlickr, category-aware.
 * جلب صورة حقيقية (وليست بديلة) من LoremFlickr حسب قسم المناسبة
 * source.unsplash.com is permanently shut down since 2024, so this is the
 * primary working real-photo source (no API key needed).
 * 
 * @param {string} eventType - Type of event (wedding, engagement, etc.)
 * @param {Object} options - Additional options
 * @returns {Promise<string>} URL of a real matching photo
 */
async function fetchFromLoremFlickr(eventType, options = {}) {
    const config = COVER_IMAGE_SOURCES[eventType];
    if (!config) {
        console.warn(`Unknown event type: ${eventType}, falling back to wedding`);
        return fetchFromLoremFlickr('wedding', options);
    }
    
    const tags = getRandomItem(config.loremflickr || config.unsplash);
    const width = options.width || 800;
    const height = options.height || 600;
    
    return `https://loremflickr.com/${width}/${height}/${encodeURIComponent(tags)}?random=${Date.now()}`;
}

/**
 * Fetch random cover image from Picsum Photos (Free, reliable alternative)
 * جلب صورة عشوائية من Picsum Photos (مجاني وموثوق)
 * 
 * @param {string} eventType - Type of event
 * @param {Object} options - Options
 * @returns {Promise<string>} URL of the random image
 */
async function fetchFromPicsum(eventType, options = {}) {
    const width = options.width || 800;
    const height = options.height || 600;
    // Use random seed based on event type for some consistency
    const seed = eventType + Math.random().toString(36).substring(7);
    
    return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

/**
 * Fetch random cover image from custom Worker endpoint
 * جلب صورة عشوائية من نقطة نهاية الـ Worker المخصصة
 * 
 * @param {string} eventType - Type of event
 * @returns {Promise<Object>} Object containing imageUrl and metadata
 */
async function fetchFromWorkerAPI(eventType) {
    try {
        // Get the worker URL from current origin or default
        const workerUrl = window.WORKER_URL || `${window.location.origin}`;
        const response = await fetch(`${workerUrl}/api/random-cover?event=${eventType}&t=${Date.now()}`);
        
        if (!response.ok) {
            throw new Error(`Worker API error: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data || !data.imageUrl) {
            throw new Error('Worker returned no imageUrl');
        }
        return data;
    } catch (error) {
        console.warn('Worker API failed, falling back to a real photo via LoremFlickr:', error.message);
        try {
            return {
                imageUrl: await fetchFromLoremFlickr(eventType),
                source: 'loremflickr-fallback',
                error: error.message
            };
        } catch (fallbackError) {
            // Only reached if even LoremFlickr URL-building fails / لن يحدث إلا في حالة خطأ غير متوقع
            return {
                imageUrl: generatePlaceholderImage(eventType),
                source: 'placeholder',
                error: fallbackError.message
            };
        }
    }
}

/**
 * Main function to get a random cover image
 * الدالة الرئيسية للحصول على صورة غلاف عشوائية
 * 
 * Priority order:
 * 1. Custom Worker API (best quality, curated)
 * 2. Unsplash Source (good variety)
 * 3. Placeholder generation (fallback)
 * 
 * @param {string} eventType - Type of event (wedding, engagement, etc.)
 * @param {Object} options - Options
 * @param {string} options.preferredSource - Preferred source ('worker', 'unsplash', 'placeholder')
 * @param {number} options.width - Image width
 * @param {number} options.height - Image height
 * @param {Function} options.onLoading - Callback when loading starts
 * @param {Function} options.onSuccess - Callback with image URL
 * @param {Function} options.onError - Callback on error
 * @returns {Promise<Object>} Result object with imageUrl, source, and metadata
 */
async function getRandomCoverImage(eventType, options = {}) {
    const {
        preferredSource = 'worker',
        width = 800,
        height = 600,
        onLoading = null,
        onSuccess = null,
        onError = null
    } = options;
    
    // Validate event type
    const validEventTypes = Object.keys(COVER_IMAGE_SOURCES);
    if (!validEventTypes.includes(eventType)) {
        console.warn(`Invalid event type "${eventType}". Valid types: ${validEventTypes.join(', ')}`);
        // Default to wedding for unknown types
        eventType = 'wedding';
    }
    
    // Loading callback
    if (onLoading) onLoading();
    
    try {
        let result;
        
        switch (preferredSource) {
            case 'worker':
                result = await fetchFromWorkerAPI(eventType);
                break;
            case 'loremflickr':
                result = {
                    imageUrl: await fetchFromLoremFlickr(eventType, { width, height }),
                    source: 'loremflickr'
                };
                break;
            case 'unsplash':
                result = {
                    imageUrl: await fetchFromUnsplash(eventType, { width, height }),
                    source: 'unsplash'
                };
                break;
            case 'picsum':
                result = {
                    imageUrl: await fetchFromPicsum(eventType, { width, height }),
                    source: 'picsum'
                };
                break;
            case 'placeholder':
            default:
                result = {
                    imageUrl: generatePlaceholderImage(eventType, width, height),
                    source: 'placeholder'
                };
        }
        
        // Success callback
        if (onSuccess) onSuccess(result.imageUrl, result);
        
        return {
            success: true,
            eventType,
            ...result,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('Error fetching random cover image:', error);
        
        // Try a real photo before giving up to a gradient placeholder
        // محاولة صورة حقيقية قبل اللجوء للصورة البديلة
        let fallbackImageUrl;
        let fallbackSource;
        try {
            fallbackImageUrl = await fetchFromLoremFlickr(eventType, { width, height });
            fallbackSource = 'loremflickr-fallback';
        } catch (e) {
            fallbackImageUrl = generatePlaceholderImage(eventType, width, height);
            fallbackSource = 'placeholder-fallback';
        }
        
        const fallbackResult = {
            success: true,
            eventType,
            imageUrl: fallbackImageUrl,
            source: fallbackSource,
            error: error.message,
            timestamp: new Date().toISOString()
        };
        
        // Error callback
        if (onError) onError(error, fallbackResult.imageUrl);
        
        return fallbackResult;
    }
}

/**
 * Preload image to verify it loads correctly
 * تحميل الصورة مسبقاً للتحقق من أنها تعمل بشكل صحيح
 * 
 * @param {string} url - Image URL to preload
 * @returns {Promise<boolean>} True if image loaded successfully
 */
function preloadImage(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
    });
}

/**
 * Get multiple random cover images for gallery selection
 * الحصول على عدة صور عشوائية للاختيار منها
 * 
 * @param {string} eventType - Type of event
 * @param {number} count - Number of images to get (default 6)
 * @returns {Promise<Array>} Array of image objects
 */
async function getRandomCoverImagesBatch(eventType, count = 6) {
    const images = [];
    const config = COVER_IMAGE_SOURCES[eventType] || COVER_IMAGE_SOURCES.wedding;
    
    for (let i = 0; i < count; i++) {
        const query = getRandomItem(config.loremflickr || config.unsplash);
        const url = `https://loremflickr.com/400/300/${encodeURIComponent(query)}?random=${Date.now()}-${i}`;
        
        images.push({
            id: `${eventType}-${i}`,
            url,
            query,
            thumbnail: `https://loremflickr.com/200/150/${encodeURIComponent(query)}?random=${Date.now()}-${i}`
        });
    }
    
    return images;
}

// ===================================
// D. Prompt Builder Functions
// دوال بناء الـ Prompts
// ===================================

/**
 * Build a complete prompt by replacing placeholders
 * بناء prompt كامل باستبدال العناصر النائبة
 * 
 * @param {string} template - Prompt template string
 * @param {Object} params - Parameters to replace
 * @returns {string} Completed prompt
 */
function buildPrompt(template, params) {
    let prompt = template;
    
    // Replace all placeholders
    const placeholders = {
        '{groomName}': params.groomName || '[اسم العريس]',
        '{brideName}': params.brideName || '[اسم العروس]',
        '{date}': params.date || '[التاريخ]',
        '{venue}': params.venue || '[المكان]',
        '{style}': params.style || 'formal',
        '{age}': params.age || '',
        '{major}': params.major || ''
    };
    
    for (const [placeholder, value] of Object.entries(placeholders)) {
        prompt = prompt.replaceAll(placeholder, value);
    }
    
    return prompt;
}

/**
 * Get the appropriate prompt for an event type and style
 * الحصول على المناسب لنوع المناسبة والنمط
 * 
 * @param {string} eventType - Type of event
 * @param {string} style - Writing style (formal, modern, poetic, simple)
 * @param {Object} params - Parameters for the prompt
 * @returns {string} Complete prompt ready for AI
 */
function getAIPrompt(eventType, style = 'formal', params = {}) {
    const eventPrompts = AI_PROMPTS[eventType];
    
    if (!eventPrompts) {
        console.warn(`No prompts found for event type: ${eventType}`);
        return buildPrompt(AI_PROMPTS.wedding.en, params);
    }
    
    // Try to get style-specific prompt, fall back to generic 'en' prompt
    const template = eventPrompts[style] || eventPrompts.en;
    
    return buildPrompt(template, params);
}

/**
 * Get all available styles for an event type
 * الحصول على جميع الأنماط المتاحة لنوع مناسبة
 * 
 * @param {string} eventType - Type of event
 * @returns {Array<string>} Available styles
 */
function getAvailableStyles(eventType) {
    const eventPrompts = AI_PROMPTS[eventType];
    
    if (!eventPrompts) {
        return ['formal', 'modern', 'poetic', 'simple'];
    }
    
    // Return all keys except 'en' which is the generic template
    return Object.keys(eventPrompts).filter(key => key !== 'en');
}

// ===================================
// E. UI Helper Functions for Random Cover Button
// دوال مساعدة لواجهة المستخدم لزر الصورة العشوائية
// ===================================

/**
 * Create and setup the random cover button UI
 * إنشاء وإعداد واجهة زر الصورة العشوائية
 * 
 * @param {string} containerId - ID of the container element
 * @param {string} previewId - ID of the preview element
 * @param {string} inputId - ID of the hidden input to store the URL
 * @param {Function} getEventTypeFn - Function that returns current event type
 * @returns {Object} Controller object with update method
 */
function setupRandomCoverButton(containerId, previewId, inputId, getEventTypeFn) {
    const container = document.getElementById(containerId);
    const preview = document.getElementById(previewId);
    const input = document.getElementById(inputId);
    
    if (!container) {
        console.error(`Container #${containerId} not found`);
        return null;
    }
    
    // Create the random button
    const randomBtn = document.createElement('button');
    randomBtn.type = 'button';
    randomBtn.className = 'random-cover-btn';
    randomBtn.innerHTML = '<i class="fas fa-dice"></i> صورة عشوائية';
    randomBtn.title = 'الحصول على صورة عشوائية مناسبة للمناسبة';
    
    // Insert after upload area or at end of container
    const uploadArea = container.querySelector('.upload-area');
    if (uploadArea && uploadArea.nextSibling) {
        uploadArea.parentNode.insertBefore(randomBtn, uploadArea.nextSibling);
    } else {
        container.appendChild(randomBtn);
    }
    
    // Add loading state
    let isLoading = false;
    
    // Click handler
    randomBtn.addEventListener('click', async () => {
        if (isLoading) return;
        
        const eventType = typeof getEventTypeFn === 'function' ? getEventTypeFn() : 'wedding';
        isLoading = true;
        
        // Update button state
        randomBtn.disabled = true;
        randomBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري البحث...';
        
        try {
            const result = await getRandomCoverImage(eventType, {
                onLoading: () => {
                    // Show loading in preview
                    if (preview) {
                        preview.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><p>جاري تحميل صورة مناسبة...</p></div>';
                        preview.style.display = 'block';
                    }
                },
                onSuccess: (imageUrl) => {
                    // Show preview
                    if (preview) {
                        preview.innerHTML = `
                            <div class="random-image-preview">
                                <img src="${imageUrl}" alt="صورة مقترحة" 
                                     onerror="this.parentElement.innerHTML='<p class=\\'error\\'>تعذر تحميل الصورة</p>'">
                                <div class="preview-actions">
                                    <button type="button" class="accept-btn" title="قبول هذه الصورة">
                                        <i class="fas fa-check"></i> قبول
                                    </button>
                                    <button type="button" class="reject-btn" title="صورة أخرى">
                                        <i class="fas fa-redo"></i> تغيير
                                    </button>
                                </div>
                            </div>
                        `;
                        preview.style.display = 'block';
                        
                        // Setup action buttons
                        const acceptBtn = preview.querySelector('.accept-btn');
                        const rejectBtn = preview.querySelector('.reject-btn');
                        
                        if (acceptBtn) {
                            acceptBtn.addEventListener('click', () => {
                                if (input) input.value = imageUrl;
                                showNotification('تم اختيار الصورة بنجاح', 'success');
                            });
                        }
                        
                        if (rejectBtn) {
                            rejectBtn.addEventListener('click', () => {
                                // Trigger new random image
                                randomBtn.click();
                            });
                        }
                    }
                    
                    // Store in input
                    if (input) input.value = imageUrl;
                }
            });
            
            console.log('Random cover image fetched:', result.source);
            
        } catch (error) {
            console.error('Error:', error);
            if (preview) {
                preview.innerHTML = `<p class="error">حدث خطأ: ${error.message}</p>`;
                preview.style.display = 'block';
            }
        } finally {
            isLoading = false;
            randomBtn.disabled = false;
            randomBtn.innerHTML = '<i class="fas fa-dice"></i> صورة عشوائية';
        }
    });
    
    // Return controller
    return {
        refresh: () => randomBtn.click(),
        setEventType: (type) => {
            // Update internal state if needed
        },
        destroy: () => {
            randomBtn.remove();
        }
    };
}

/**
 * Show notification helper
 * دالة مساعدة لإشعار
 * 
 * @param {string} message - Notification message
 * @param {string} type - Type (success, error, warning, info)
 */
function showNotification(message, type = 'info') {
    // Check if there's a global notification system
    if (typeof window.db !== 'undefined' && typeof window.db.showNotification === 'function') {
        window.db.showNotification(message, type);
        return;
    }
    
    // Fallback: create temporary notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i> ${message}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 24px;
        background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
        color: white;
        border-radius: 8px;
        z-index: 9999;
        animation: fadeInOut 3s forwards;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
}

// ===================================
// F. Export for Module Usage
// التصدير للاستخدام كوحدة
// ===================================

// If using ES modules, export everything
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AI_PROMPTS,
        COVER_IMAGE_SOURCES,
        getRandomCoverImage,
        getRandomCoverImagesBatch,
        getAIPrompt,
        buildPrompt,
        getAvailableStyles,
        setupRandomCoverButton,
        preloadImage,
        generatePlaceholderImage,
        fetchFromLoremFlickr
    };
}

// Log initialization
console.log('✅ AI Prompts & Random Cover System loaded successfully');
console.log(`📝 Supported events: ${Object.keys(AI_PROMPTS).join(', ')}`);
console.log(`🖼️ Cover sources available: ${Object.keys(COVER_IMAGE_SOURCES).join(', ')}`);
