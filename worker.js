/**
 * دعوة فرح - Cloudflare Worker
 * Handles R2 Storage uploads (images/songs) + AI invitation text generation
 *
 * IMPORTANT SETUP NOTE:
 * This worker looks for the R2 bucket binding under several common names
 * (FARAH, R2_BUCKET, MEDIA_BUCKET, BUCKET, R2) and will also auto-detect ANY
 * binding that behaves like an R2 bucket, so it keeps working even if the
 * binding variable name configured on the Cloudflare dashboard doesn't
 * exactly match. Still, for clarity it's best to name the binding "FARAH"
 * in Worker > Settings > Bindings, to match wrangler.toml.
 *
 * Required Worker configuration (Settings > Variables and secrets):
 *   - R2 bucket binding (any of the names above) -> your R2 bucket
 *   - PUBLIC_URL (optional plain variable) -> public R2.dev / custom domain
 *     for the bucket. If not set, the worker will self-serve uploaded files
 *     through its own /files/:key route instead.
 *   - NVIDIA_API_KEY (secret) -> used by /api/ai/generate
 */

const KNOWN_BUCKET_BINDING_NAMES = ['FARAH', 'R2_BUCKET', 'MEDIA_BUCKET', 'BUCKET', 'R2', 'da3watfarah'];

// Admin panel (admin.html) login password. Used to be a Firebase
// email + password login shared with regular users; now the admin only
// types this single password (kept here, on the Worker — not in the
// front-end code). Override it by setting an ADMIN_PASSWORD secret on
// the Worker (Settings > Variables and secrets) if you want to change it
// without editing this file.
const DEFAULT_ADMIN_PASSWORD = '521988';

function getBucket(env) {
    for (const name of KNOWN_BUCKET_BINDING_NAMES) {
        if (env[name] && typeof env[name].put === 'function') {
            return env[name];
        }
    }
    // Fallback: duck-type scan for anything that looks like an R2 bucket binding
    for (const key of Object.keys(env)) {
        const candidate = env[key];
        if (candidate && typeof candidate === 'object' &&
            typeof candidate.put === 'function' &&
            typeof candidate.get === 'function' &&
            typeof candidate.list === 'function') {
            return candidate;
        }
    }
    return null;
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-custom-header',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        if (url.pathname === '/api/upload' && request.method === 'POST') {
            return handleUpload(request, env, corsHeaders, url);
        }

        if (url.pathname === '/api/delete' && request.method === 'DELETE') {
            return handleDelete(request, env, corsHeaders);
        }

        if (url.pathname === '/api/list' && request.method === 'GET') {
            return handleList(request, env, corsHeaders, url);
        }

        if (url.pathname === '/api/ai/generate' && request.method === 'POST') {
            return handleAiGenerate(request, env, corsHeaders);
        }

        if (url.pathname === '/api/admin/login' && request.method === 'POST') {
            return handleAdminLogin(request, env, corsHeaders);
        }

        // Dynamic social-share preview image: /api/og/<slug>.png
        // Renders a branded card with the couple's names (used as og:image
        // for invitation links shared on WhatsApp/Facebook/etc).
        if (url.pathname.startsWith('/api/og/') && request.method === 'GET') {
            return handleOgImage(request, env, url);
        }

        // Server-rendered invitation page: injects the real couple names /
        // cover photo into <title> and the Open Graph meta tags BEFORE the
        // HTML is sent, so link-preview crawlers (which never run JS) show
        // the correct names and image. Bind a Cloudflare Worker Route for
        // da3watfarah.com/* to this Worker for this to take effect on the
        // real domain (see deployment notes).
        if ((url.pathname === '/invite.html' || isPrettyInviteSlug(url.pathname)) && request.method === 'GET') {
            return handleInvitePage(request, env, url);
        }

        // Dynamic sitemap of published invitations (kept separate from the
        // static sitemap.xml so it always reflects the live database).
        if (url.pathname === '/sitemap-invitations.xml' && request.method === 'GET') {
            return handleInvitationsSitemap(env);
        }

        // Random cover image endpoint /api/random-cover?event=wedding
        // Returns a random cover image URL suitable for the event type
        if (url.pathname === '/api/random-cover' && request.method === 'GET') {
            return handleRandomCover(request, env, corsHeaders, url);
        }

        if (url.pathname.startsWith('/files/')) {
            return serveFile(url, env, corsHeaders);
        }

        if (url.pathname === '/health') {
            const bucket = getBucket(env);
            return jsonResponse({
                status: 'ok',
                service: 'da3watfarah-worker',
                timestamp: new Date().toISOString(),
                r2BucketConnected: !!bucket,
                publicUrlConfigured: !!env.PUBLIC_URL,
                nvidiaKeyConfigured: !!env.NVIDIA_API_KEY,
                // Diagnostics for the admin.html login (does NOT reveal the
                // actual secret values, just whether they're set):
                adminPasswordConfigured: !!env.ADMIN_PASSWORD,
                adminFirebaseEmailConfigured: !!env.ADMIN_FIREBASE_EMAIL,
                adminFirebasePasswordConfigured: !!env.ADMIN_FIREBASE_PASSWORD
            }, corsHeaders);
        }

        return jsonResponse({
            message: 'Da3wat Farah API',
            version: '1.2.0',
            endpoints: [
                'POST /api/upload - Upload file to R2',
                'DELETE /api/delete - Delete file from R2',
                'GET /api/list - List files in bucket',
                'POST /api/ai/generate - Generate invitation text via AI',
                'POST /api/admin/login - Owner login with a single password (no email)',
                'GET /api/random-cover?event=wedding - Get random cover image for event type',
                'GET /files/:key - Serve file from R2',
                'GET /health - Diagnostics'
            ]
        }, corsHeaders, 200);
    },
};

/**
 * Handle file upload to R2 (images + songs)
 * Accepts either:
 *   - formData field "folder" (e.g. "uploads"), or
 *   - formData fields "type" + "slug" (e.g. type=cover, slug=ahmed-sara)
 * to build the storage key, so it works with every page in the project.
 */
async function handleUpload(request, env, corsHeaders, url) {
    try {
        const bucket = getBucket(env);
        if (!bucket) {
            console.error('No R2 bucket binding found on this Worker.');
            return errorResponse(
                'R2 غير مربوط بهذا الـ Worker. تحقق من Worker > Settings > Bindings على Cloudflare وتأكد من وجود ربط R2 bucket صحيح، ثم أعد النشر.',
                500,
                corsHeaders
            );
        }

        const formData = await request.formData();
        const file = formData.get('file');

        if (!file || typeof file === 'string') {
            return errorResponse('No file provided', 400, corsHeaders);
        }

        // Build folder from either "folder" or "type"/"slug" fields
        const explicitFolder = formData.get('folder');
        const type = formData.get('type');
        const slug = formData.get('slug');
        let folder;
        if (explicitFolder) {
            folder = explicitFolder;
        } else if (type && slug) {
            folder = `${slug}/${type}`;
        } else if (type) {
            folder = type;
        } else {
            folder = 'uploads';
        }

        // Validate file size (max 15MB, covers both images and songs)
        const maxSize = 15 * 1024 * 1024;
        if (file.size > maxSize) {
            return errorResponse('الملف كبير جدًا. الحد الأقصى للحجم هو 15 ميجابايت', 400, corsHeaders);
        }

        // Validate file type. Mobile browsers/OS pickers sometimes send an
        // empty or generic ("application/octet-stream") MIME type for valid
        // images/audio, so we also accept based on the file extension.
        const allowedTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'image/heic', 'image/heif', 'image/svg+xml',
            'audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/ogg',
            'video/mp4'
        ];
        const allowedExtensions = [
            'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'svg',
            'mp3', 'wav', 'm4a', 'ogg', 'mp4'
        ];
        const extension = (file.name.split('.').pop() || '').toLowerCase();
        const typeOk = allowedTypes.includes(file.type);
        const extOk = allowedExtensions.includes(extension);

        if (!typeOk && !extOk) {
            return errorResponse('نوع الملف غير مسموح به', 400, corsHeaders);
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        const key = `${folder}/${timestamp}_${randomId}.${extension || 'bin'}`;

        const extToMime = {
            jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
            webp: 'image/webp', heic: 'image/heic', heif: 'image/heif', svg: 'image/svg+xml',
            mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', ogg: 'audio/ogg', mp4: 'video/mp4'
        };
        const contentType = file.type || extToMime[extension] || 'application/octet-stream';

        await bucket.put(key, file.stream(), {
            httpMetadata: {
                contentType: contentType,
                contentDisposition: `inline; filename="${file.name}"`
            }
        });

        // Prefer PUBLIC_URL if configured, otherwise self-serve via /files/:key
        const publicBase = env.PUBLIC_URL || `${url.origin}/files`;
        const publicUrl = `${publicBase}/${key}`;

        return jsonResponse({
            success: true,
            key: key,
            url: publicUrl,
            name: file.name,
            size: file.size,
            type: contentType
        }, corsHeaders, 201);

    } catch (error) {
        console.error('Upload error:', error);
        return errorResponse('فشل رفع الملف: ' + (error.message || 'خطأ غير معروف'), 500, corsHeaders);
    }
}

/**
 * Handle file deletion from R2
 */
async function handleDelete(request, env, corsHeaders) {
    try {
        const bucket = getBucket(env);
        if (!bucket) {
            return errorResponse('R2 غير مربوط بهذا الـ Worker.', 500, corsHeaders);
        }

        const { key } = await request.json();
        if (!key) {
            return errorResponse('No key provided', 400, corsHeaders);
        }

        const object = await bucket.get(key);
        if (!object) {
            return errorResponse('File not found', 404, corsHeaders);
        }

        await bucket.delete(key);

        return jsonResponse({ success: true, message: 'File deleted successfully', key: key }, corsHeaders);

    } catch (error) {
        console.error('Delete error:', error);
        return errorResponse('Failed to delete file', 500, corsHeaders);
    }
}

/**
 * List files in R2 bucket
 */
async function handleList(request, env, corsHeaders, url) {
    try {
        const bucket = getBucket(env);
        if (!bucket) {
            return errorResponse('R2 غير مربوط بهذا الـ Worker.', 500, corsHeaders);
        }

        const prefix = url.searchParams.get('prefix') || '';
        const limit = parseInt(url.searchParams.get('limit')) || 100;

        const listed = await bucket.list({ prefix, limit });
        const publicBase = env.PUBLIC_URL || `${url.origin}/files`;

        const files = listed.objects.map(obj => ({
            key: obj.key,
            size: obj.size,
            uploaded: obj.uploaded.toISOString(),
            url: `${publicBase}/${obj.key}`
        }));

        return jsonResponse({ success: true, count: files.length, files: files, truncated: listed.truncated }, corsHeaders);

    } catch (error) {
        console.error('List error:', error);
        return errorResponse('Failed to list files', 500, corsHeaders);
    }
}

/**
 * Serve file from R2 (used when PUBLIC_URL isn't configured)
 */
async function serveFile(url, env, corsHeaders) {
    try {
        const bucket = getBucket(env);
        if (!bucket) {
            return errorResponse('R2 غير مربوط بهذا الـ Worker.', 500, corsHeaders);
        }

        const key = decodeURIComponent(url.pathname.replace('/files/', ''));
        const object = await bucket.get(key);

        if (!object) {
            return errorResponse('File not found', 404, corsHeaders);
        }

        const headers = new Headers(corsHeaders);
        headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
        headers.set('Content-Length', object.size.toString());
        headers.set('Cache-Control', 'public, max-age=31536000');

        return new Response(object.body, { headers });

    } catch (error) {
        console.error('Serve error:', error);
        return errorResponse('Failed to serve file', 500, corsHeaders);
    }
}

/**
 * Generate invitation text via NVIDIA AI (NIM API)
 */
async function handleAiGenerate(request, env, corsHeaders) {
    try {
        if (!env.NVIDIA_API_KEY) {
            return errorResponse('مفتاح NVIDIA_API_KEY غير مضبوط على هذا الـ Worker.', 500, corsHeaders);
        }

        const body = await request.json();
        const { groomName = '', brideName = '', eventType = 'wedding', venueName = '', tone = 'رسمي' } = body;

        const eventLabel = { wedding: 'حفل زفاف', engagement: 'خطوبة', katb_ketab: 'كتب كتاب' }[eventType] || 'حفل زفاف';

        const systemPrompt =
            'أنت كاتب محترف لنصوص دعوات الأفراح باللغة العربية الفصحى السهلة. ' +
            'اكتب نص دعوة قصير وأنيق (من ٣٠ إلى ٦٠ كلمة)، بدون عنوان وبدون شرح إضافي، فقط نص الدعوة نفسه.';

        const userPrompt =
            `اكتب نص دعوة ${eventLabel} بأسلوب ${tone}، ` +
            `للعروسين ${groomName} و${brideName}` +
            (venueName ? ` في ${venueName}` : '') +
            `. النص يوجَّه للضيوف مباشرة ويدعوهم لمشاركة الفرحة.`;

        const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.NVIDIA_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'meta/llama-3.1-70b-instruct',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.8,
                max_tokens: 300,
            }),
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error('NVIDIA API error:', errText);
            return errorResponse('تعذر توليد النص عبر الذكاء الاصطناعي الآن', 502, corsHeaders);
        }

        const data = await res.json();
        const text = data.choices?.[0]?.message?.content?.trim() || '';

        return jsonResponse({ success: true, text }, corsHeaders);

    } catch (error) {
        console.error('AI generate error:', error);
        return errorResponse('Failed to generate text', 500, corsHeaders);
    }
}

/**
 * Admin panel login — password only, no email.
 *
 * admin.html now shows a single password field. The password itself
 * is checked right here on the Worker against env.ADMIN_PASSWORD
 * (falls back to DEFAULT_ADMIN_PASSWORD = "521988" if that secret
 * isn't set), so it never has to live in the front-end code.
 *
 * Firebase Realtime Database security rules (database.rules.json)
 * still require a real Firebase Auth session belonging to a UID listed
 * under "admins/{uid} = true" before they'll allow admin.html to
 * read/update/delete invitations. So, on a correct password, this
 * endpoint also hands back one hidden Firebase account's email +
 * password (env.ADMIN_FIREBASE_EMAIL / env.ADMIN_FIREBASE_PASSWORD) so
 * the browser can sign in to Firebase silently in the background — the
 * admin never sees or types that email/password, only the number above.
 *
 * One-time setup needed on the Worker (Settings > Variables and secrets):
 *   - ADMIN_PASSWORD           optional — overrides the default 521988
 *   - ADMIN_FIREBASE_EMAIL     email of a Firebase user you created once
 *                              (e.g. via register.html or Firebase Console)
 *   - ADMIN_FIREBASE_PASSWORD  that user's Firebase password
 *   ...and in the Realtime Database, add: admins/{that user's uid} = true
 */
async function handleAdminLogin(request, env, corsHeaders) {
    try {
        const body = await request.json().catch(() => ({}));
        const password = body.password;
        const expectedPassword = env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;

        if (!password || password !== expectedPassword) {
            return errorResponse('كلمة السر غير صحيحة', 401, corsHeaders);
        }

        if (!env.ADMIN_FIREBASE_EMAIL || !env.ADMIN_FIREBASE_PASSWORD) {
            return errorResponse(
                'كلمة السر صحيحة، لكن لم يتم ضبط حساب المالك على الـ Worker بعد. ' +
                'أضف ADMIN_FIREBASE_EMAIL و ADMIN_FIREBASE_PASSWORD من Worker > Settings > Variables and secrets.',
                500,
                corsHeaders
            );
        }

        return jsonResponse({
            success: true,
            email: env.ADMIN_FIREBASE_EMAIL,
            password: env.ADMIN_FIREBASE_PASSWORD
        }, corsHeaders);

    } catch (error) {
        console.error('Admin login error:', error);
        return errorResponse('حدث خطأ أثناء تسجيل الدخول', 500, corsHeaders);
    }
}

// ==========================================================================
// Dynamic social-preview (Open Graph) support
// ==========================================================================

const FIREBASE_DB_URL = 'https://da3watfarah-default-rtdb.firebaseio.com';

// Reserved top-level pages that are NOT invitation slugs (pretty URLs like
// da3watfarah.com/ahmed-sara route through 404.html today; once this Worker
// sits in front of the domain we can resolve them directly instead).
const RESERVED_PATHS = new Set([
    '/', '/index.html', '/login.html', '/register.html', '/editor.html',
    '/admin.html', '/invite.html', '/invitation.html', '/dashboard.html',
    '/gallery.html', '/my-invitations.html', '/settings.html', '/overview.html',
    '/create-invitation.html', '/music.html', '/ai-writer.html', '/404.html',
    '/robots.txt', '/sitemap.xml', '/sitemap-invitations.xml', '/llms.txt',
    '/manifest.json', '/sw.js'
]);

function isPrettyInviteSlug(pathname) {
    if (RESERVED_PATHS.has(pathname)) return false;
    if (pathname.startsWith('/css/') || pathname.startsWith('/js/') || pathname.startsWith('/assets/') || pathname.startsWith('/api/') || pathname.startsWith('/files/')) return false;
    if (pathname.includes('.')) return false; // skip actual asset requests
    return true;
}

// Looks up a published invitation by its slug using the public Firebase
// Realtime Database REST API (invitations/ is ".read": true in the rules).
async function fetchInvitationBySlug(slug) {
    const query = `${FIREBASE_DB_URL}/invitations.json?orderBy=${encodeURIComponent('"slug"')}&equalTo=${encodeURIComponent('"' + slug + '"')}`;
    const res = await fetch(query);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data) return null;
    const [id, inv] = Object.entries(data)[0] || [];
    return inv ? { id, ...inv } : null;
}

function escapeXmlAttr(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// GET /api/og/<slug>.png  -> branded PNG card with the couple's names,
// used as the og:image for invitation links shared on WhatsApp/Facebook/etc.
async function handleOgImage(request, env, url) {
    const slug = decodeURIComponent(url.pathname.replace('/api/og/', '').replace(/\.png$/, ''));
    let groomName = 'العريس', brideName = 'العروسة', dateText = '';
    try {
        const inv = await fetchInvitationBySlug(slug);
        if (inv) {
            groomName = inv.couple?.groomName || groomName;
            brideName = inv.couple?.brideName || brideName;
            if (inv.event?.date) {
                try { dateText = new Date(inv.event.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }); } catch (e) {}
            }
        }
    } catch (e) {
        console.error('OG lookup error:', e);
    }

    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    groomName = esc(groomName); brideName = esc(brideName); dateText = esc(dateText);

    try {
        const { ImageResponse } = await import('workers-og');
        const html = `
        <div style="height:100%;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#0B0F0E 0%,#152420 100%);font-family:sans-serif;color:#F5F1E8;padding:60px;text-align:center">
          <div style="display:flex;font-size:28px;color:#C9A227;letter-spacing:4px;margin-bottom:24px">دعوة زفاف</div>
          <div style="display:flex;align-items:center;font-size:72px;font-weight:700;color:#E8C766">
            <span>${brideName}</span>
            <span style="margin:0 30px;color:#C9A227">&amp;</span>
            <span>${groomName}</span>
          </div>
          ${dateText ? `<div style="display:flex;font-size:30px;color:#A9B3AC;margin-top:30px">${dateText}</div>` : ''}
        </div>`;
        return new ImageResponse(html, { width: 1200, height: 630 });
    } catch (e) {
        console.error('OG image generation error:', e);
        // Fallback so a broken image generator never breaks link previews
        return new Response(null, { status: 302, headers: { Location: (env.PUBLIC_URL ? env.PUBLIC_URL + '/og-default.jpg' : 'https://da3watfarah.com/assets/images/og-cover.jpg') } });
    }
}

// GET /invite.html?slug=... or GET /<pretty-slug>
// Fetches the real static page from the site origin, then rewrites the
// <title> and Open Graph/Twitter meta tags in-place using the real
// invitation data before returning it — so WhatsApp/Facebook/Twitter
// previews (and Google) see the couple's real names and a real image,
// not the generic placeholder.
async function handleInvitePage(request, env, url) {
    const slug = url.searchParams.get('slug') || url.pathname.replace(/^\//, '');

    // NOTE: adjust ORIGIN_BASE if your GitHub Pages repo/user differs.
    // This fetches the page from GitHub Pages' default domain so the
    // Worker doesn't loop back into itself when routed on da3watfarah.com.
    const ORIGIN_BASE = env.ORIGIN_BASE || 'https://mohamednasr5.github.io/-da3watfarah';
    const originRes = await fetch(`${ORIGIN_BASE}/invite.html${url.search || ('?slug=' + encodeURIComponent(slug))}`, {
        cf: { cacheTtl: 60, cacheEverything: false }
    });

    if (!originRes.ok || !slug) return originRes;

    const inv = await fetchInvitationBySlug(slug).catch(() => null);
    if (!inv) return originRes; // unknown slug: serve the page as-is (its own JS/404 flow handles it)

    const groomName = inv.couple?.groomName || '';
    const brideName = inv.couple?.brideName || '';
    const title = groomName && brideName ? `دعوة زفاف ${brideName} و ${groomName} | دعوة فرح` : 'دعوة زفاف | دعوة فرح';
    const description = inv.content?.invitationText || inv.invitationText || `يسرنا دعوتكم لحضور زفاف ${brideName} و ${groomName}`;
    const image = inv.design?.coverImage || inv.coverImage || `${new URL(request.url).origin}/api/og/${encodeURIComponent(slug)}.png`;
    const pageUrl = `https://da3watfarah.com/${slug}`;

    class MetaRewriter {
        element(el) {
            const prop = el.getAttribute('property');
            const name = el.getAttribute('name');
            if (prop === 'og:title') el.setAttribute('content', title);
            if (prop === 'og:description') el.setAttribute('content', description);
            if (prop === 'og:image') el.setAttribute('content', image);
            if (prop === 'og:url') el.setAttribute('content', pageUrl);
            if (name === 'twitter:title') el.setAttribute('content', title);
            if (name === 'twitter:description') el.setAttribute('content', description);
            if (name === 'twitter:image') el.setAttribute('content', image);
            if (name === 'description') el.setAttribute('content', description);
        }
    }
    class TitleRewriter {
        element(el) { el.setInnerContent(title); }
    }

    return new HTMLRewriter()
        .on('meta', new MetaRewriter())
        .on('title', new TitleRewriter())
        .transform(originRes);
}

// GET /sitemap-invitations.xml — lists published invitations so Google can
// index individual invitation pages (extra organic-search reach).
async function handleInvitationsSitemap(env) {
    try {
        const res = await fetch(`${FIREBASE_DB_URL}/invitations.json?orderBy=${encodeURIComponent('"isPublished"')}&equalTo=true`);
        const data = res.ok ? await res.json() : null;
        const entries = data ? Object.values(data) : [];
        const urls = entries.filter(inv => inv.slug).map(inv =>
            `  <url><loc>https://da3watfarah.com/${escapeXmlAttr(inv.slug)}</loc><changefreq>weekly</changefreq><priority>0.5</priority></url>`
        ).join('\n');
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
        return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
    } catch (e) {
        return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', { headers: { 'Content-Type': 'application/xml' } });
    }
}

function jsonResponse(data, headers, status = 200) {
    return new Response(JSON.stringify(data), {
        status: status,
        headers: { ...headers, 'Content-Type': 'application/json' }
    });
}

function errorResponse(message, status, headers) {
    return jsonResponse({ success: false, error: message }, headers, status);
}

// ==========================================================================
// Random Cover Image System
// نظام الصور العشوائية للأغلفة
// ==========================================================================

/**
 * Cover image sources configuration per event type
 * إعدادات مصادر صور الأغلفة حسب نوع المناسبة
 */
const COVER_IMAGE_CONFIG = {
    wedding: {
        queries: ['wedding', 'wedding decoration', 'wedding flowers', 'romantic wedding', 'bridal'],
        colors: ['#D4AF37', '#F5E6D3', '#8B0000', '#FFFFFF'],
        fallbackText: 'زفاف سعيد'
    },
    engagement: {
        queries: ['engagement ring', 'romantic dinner', 'couple love', 'engagement party', 'roses'],
        colors: ['#FF69B4', '#FFD700', '#C0C0C0', '#FFE4E1'],
        fallbackText: 'خطوبة سعيدة'
    },
    katb_ketab: {
        queries: ['islamic decoration', 'arabic calligraphy', 'mosque interior', 'islamic pattern'],
        colors: ['#1A5F1A', '#D4AF37', '#FFFFFF', '#2C3E50'],
        fallbackText: 'كتب الكتاب'
    },
    henna: {
        queries: ['henna design', 'henna party', 'arabic celebration', 'women gathering'],
        colors: ['#8B008B', '#FF1493', '#D4AF37', '#2D1B4E'],
        fallbackText: 'ليلة حناء'
    },
    birthday: {
        queries: ['birthday party', 'birthday cake', 'balloons', 'celebration', 'confetti'],
        colors: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3'],
        fallbackText: 'عيد ميلاد سعيد'
    },
    newborn: {
        queries: ['baby', 'newborn', 'baby shower', 'baby feet', 'soft baby'],
        colors: ['#FFB6C1', '#87CEEB', '#F0E68C', '#DDA0DD'],
        fallbackText: 'مبارك المولود'
    },
    graduation: {
        queries: ['graduation', 'cap and gown', 'university', 'diploma', 'academic'],
        colors: ['#1E3A5F', '#D4AF37', '#2E4057', '#F5F5DC'],
        fallbackText: 'مبروك التخرج'
    },
    ramadan: {
        queries: ['ramadan', 'iftar', 'lanterns', 'moon and stars', 'dates', 'mosque at night'],
        colors: ['#6B8E23', '#D4AF37', '#1a1a2e', '#8B4513'],
        fallbackText: 'رمضان كريم'
    }
};

/**
 * Valid event types for random cover images
 * أنواع المناسبات الصالحة للصور العشوائية
 */
const VALID_EVENT_TYPES = Object.keys(COVER_IMAGE_CONFIG);

/**
 * Generate a placeholder SVG image as fallback
 * إنشاء صورة SVG بديلة
 * 
 * @param {string} eventType - Type of event
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {string} SVG data URL
 */
function generatePlaceholderSVG(eventType, width = 800, height = 600) {
    const config = COVER_IMAGE_CONFIG[eventType] || COVER_IMAGE_CONFIG.wedding;
    const colors = config.colors;
    const color1 = colors[Math.floor(Math.random() * colors.length)];
    let color2 = colors[Math.floor(Math.random() * colors.length)];
    while (color2 === color1) {
        color2 = colors[Math.floor(Math.random() * colors.length)];
    }
    
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
            <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
                </linearGradient>
            </defs>
            <rect width="${width}" height="${height}" fill="url(#grad)"/>
            <text x="50%" y="50%" font-family="Arial,sans-serif" font-size="36" fill="white" 
                  text-anchor="middle" dominant-baseline="middle">${config.fallbackText}</text>
        </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

/**
 * Handle GET /api/random-cover?event=wedding&width=800&height=600
 * Returns a random cover image URL suitable for the specified event type
 * 
 * Supports multiple image sources:
 * 1. Unsplash Source API (free, no key needed)
 * 2. Picsum Photos (free, reliable)
 * 3. Generated SVG placeholder (fallback)
 * 
 * Query parameters:
 *  - event: Event type (wedding, engagement, etc.) - required
 *  - width: Image width in pixels (default: 800)
 *  - height: Image height in pixels (default: 600)
 *  - source: Preferred source (unsplash, picsum, placeholder) - optional
 */
async function handleRandomCover(request, env, corsHeaders, url) {
    try {
        // Get query parameters / الحصول على معاملات الاستعلام
        const eventType = url.searchParams.get('event') || 'wedding';
        const width = parseInt(url.searchParams.get('width')) || 800;
        const height = parseInt(url.searchParams.get('height')) || 600;
        const preferredSource = url.searchParams.get('source') || 'unsplash';
        
        // Validate event type / التحقق من نوع المناسبة
        if (!VALID_EVENT_TYPES.includes(eventType)) {
            return errorResponse(
                `Invalid event type. Supported types: ${VALID_EVENT_TYPES.join(', ')}`,
                400,
                corsHeaders
            );
        }
        
        const config = COVER_IMAGE_CONFIG[eventType];
        let imageUrl;
        let source = preferredSource;
        
        // Try to get image based on preferred source
        // محاولة الحصول على الصورة بناءً على المصدر المفضل
        switch (preferredSource) {
            case 'unsplash':
                // Unsplash Source API (deprecated but functional)
                const query = config.queries[Math.floor(Math.random() * config.queries.length)];
                const timestamp = Date.now();
                imageUrl = `https://source.unsplash.com/${width}x${height}/?${encodeURIComponent(query)}&sig=${timestamp}`;
                break;
                
            case 'picsum':
                // Picsum Photos (reliable alternative)
                const seed = `${eventType}-${Math.random().toString(36).substring(7)}`;
                imageUrl = `https://picsum.photos/seed/${seed}/${width}/${height}`;
                break;
                
            case 'placeholder':
            default:
                // Generate SVG placeholder
                imageUrl = generatePlaceholderSVG(eventType, width, height);
                source = 'placeholder';
        }
        
        // Return the image URL / إرجاع رابط الصورة
        return jsonResponse({
            success: true,
            eventType,
            imageUrl,
            source,
            width,
            height,
            query: config.queries[0],
            colors: config.colors,
            timestamp: new Date().toISOString(),
            cacheTtl: 3600 // Suggested cache time in seconds
        }, corsHeaders);
        
    } catch (error) {
        console.error('Random cover error:', error);
        return errorResponse(
            `Error: ${error.message}`,
            500,
            corsHeaders
        );
    }
}
