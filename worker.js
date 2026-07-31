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
                nvidiaKeyConfigured: !!env.NVIDIA_API_KEY
            }, corsHeaders);
        }

        return jsonResponse({
            message: 'Da3wat Farah API',
            version: '1.1.0',
            endpoints: [
                'POST /api/upload - Upload file to R2',
                'DELETE /api/delete - Delete file from R2',
                'GET /api/list - List files in bucket',
                'POST /api/ai/generate - Generate invitation text via AI',
                'POST /api/admin/login - Owner login with a single password (no email)',
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

function jsonResponse(data, headers, status = 200) {
    return new Response(JSON.stringify(data), {
        status: status,
        headers: { ...headers, 'Content-Type': 'application/json' }
    });
}

function errorResponse(message, status, headers) {
    return jsonResponse({ success: false, error: message }, headers, status);
}
