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

/**
 * CACHING NOTE (PageSpeed: "استخدام فترات التخزين المؤقت الفعّالة"):
 * This Worker only handles the routes matched below (/api/*, /files/*,
 * /invite.html, /sitemap*.xml, etc). Static files like css/style.css,
 * js/main.js and bg.mp3 are served by GitHub Pages (see the CNAME file),
 * with Cloudflare only proxying DNS in front of it — this fetch() handler
 * never sees those requests, so their cache headers can't be fixed here,
 * and the `_headers` file in this repo has NO effect (GitHub Pages ignores
 * it; that convention only works on Cloudflare Pages/Netlify).
 *
 * REAL FIX: Cloudflare dashboard → Rules → Cache Rules → add a rule for
 * da3watfarah.com/css/*, /js/*, *.mp3, *.jpg, *.png setting Edge Cache TTL
 * and Browser Cache TTL (e.g. 7 days for css/js, 30 days for images).
 * This must be done in the Cloudflare dashboard, not in a committed file.
 */
const KNOWN_BUCKET_BINDING_NAMES = ['FARAH', 'R2_BUCKET', 'MEDIA_BUCKET', 'BUCKET', 'R2', 'da3watfarah'];

/**
 * =============================================================================
 * TELEGRAM ADMIN BOT
 * =============================================================================
 * Full control panel over Telegram: notifications for new orders / payment
 * receipts / RSVPs / wishes, plus inline-button actions to approve/reject
 * invitations and payments directly from the chat, without opening
 * admin.html.
 *
 * One-time setup on the Worker (Settings > Variables and secrets):
 *   - TELEGRAM_BOT_TOKEN   token from @BotFather
 *   - TELEGRAM_CHAT_ID     your personal chat id (or group/channel id) that
 *                          receives notifications. Get it by messaging your
 *                          bot once, then opening:
 *                          https://api.telegram.org/bot<TOKEN>/getUpdates
 *   - TELEGRAM_WEBHOOK_SECRET  any random string you pick — used to verify
 *                          incoming Telegram webhook calls (Telegram sends it
 *                          back in the X-Telegram-Bot-Api-Secret-Token header)
 *
 * After deploying, register the webhook ONCE by visiting (in your browser):
 *   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://da3watfarah.com/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>
 *
 * Bot commands (typed in the Telegram chat):
 *   /start            - shows the main menu
 *   /pending          - lists invitations awaiting review (pending_review)
 *   /payments         - lists invitations with a payment pending verification
 *   /stats            - platform stats (users / invitations / views)
 *   /find <slug>      - look up one invitation by slug and get action buttons
 */
const TG_API = (env) => `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`;

async function tgCall(env, method, payload) {
    const res = await fetch(`${TG_API(env)}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    return res.json().catch(() => null);
}

async function tgSendMessage(env, text, extra = {}) {
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return null;
    return tgCall(env, 'sendMessage', {
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...extra
    });
}

async function tgAnswerCallback(env, callbackQueryId, text = '') {
    return tgCall(env, 'answerCallbackQuery', { callback_query_id: callbackQueryId, text, show_alert: false });
}

function escapeHtml(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const RTDB_BASE = 'https://da3watfarah-default-rtdb.firebaseio.com';

// Firebase RTDB REST helpers using a database secret (legacy token) so the
// Worker can read/write without going through client Firebase Auth.
function rtdbUrl(path, env, extraQuery = '') {
    const secret = env.FIREBASE_DB_SECRET ? `auth=${encodeURIComponent(env.FIREBASE_DB_SECRET)}` : '';
    const sep = extraQuery ? '&' : '';
    const q = [secret, extraQuery].filter(Boolean).join('&');
    return `${RTDB_BASE}/${path}.json${q ? '?' + q : ''}`;
}

async function rtdbGet(path, env) {
    const res = await fetch(rtdbUrl(path, env));
    if (!res.ok) return null;
    return res.json();
}

async function rtdbPatch(path, env, data) {
    const res = await fetch(rtdbUrl(path, env), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return res.ok;
}

function inviteSummaryText(id, inv) {
    const groom = escapeHtml(inv.couple?.groomName || '—');
    const bride = escapeHtml(inv.couple?.brideName || '');
    const names = bride ? `${groom} &amp; ${bride}` : groom;
    const type = escapeHtml(inv.type || inv.event?.eventType || 'wedding');
    const slug = escapeHtml(inv.slug || '');
    const payStatus = escapeHtml(inv.payment?.status || 'unpaid');
    const plan = escapeHtml(inv.payment?.planLabel || inv.payment?.plan || '—');
    return (
        `👰🤵 <b>${names}</b>\n` +
        `النوع: ${type}\n` +
        `السلاج: <code>${slug}</code>\n` +
        `الرابط: https://da3watfarah.com/${slug}\n` +
        `حالة الدعوة: <b>${escapeHtml(inv.status || '—')}</b>\n` +
        `الدفع: <b>${payStatus}</b> (${plan})\n` +
        `المشاهدات: ${inv.viewsCount || 0}\n` +
        `ID: <code>${id}</code>`
    );
}

function inviteActionButtons(id, inv) {
    const rows = [];
    if (inv.status === 'pending_review') {
        rows.push([
            { text: '✅ اعتماد الدعوة', callback_data: `approve_inv:${id}` },
            { text: '❌ رفض الدعوة', callback_data: `reject_inv:${id}` }
        ]);
    }
    if (inv.payment?.status === 'pending_verification') {
        rows.push([
            { text: '💰 تأكيد الدفع', callback_data: `verify_pay:${id}` },
            { text: '🚫 رفض الدفع', callback_data: `reject_pay:${id}` }
        ]);
    }
    if (inv.payment?.receiptUrl) {
        rows.push([{ text: '🧾 عرض إيصال الدفع', url: inv.payment.receiptUrl }]);
    }
    rows.push([{ text: '🔗 فتح الدعوة', url: `https://da3watfarah.com/${inv.slug}` }]);
    return { inline_keyboard: rows };
}

// Push a Telegram notification when a new invitation is submitted for review,
// a payment receipt is submitted, a new RSVP arrives, or a new wish arrives.
// Called from the existing REST endpoints below (fire-and-forget, never
// blocks or breaks the caller if Telegram env vars aren't configured).
async function notifyTelegram(env, kind, id, inv) {
    try {
        if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
        const headers = {
            new_invitation: '🆕 <b>دعوة جديدة تنتظر المراجعة</b>',
            payment_submitted: '💳 <b>إيصال دفع جديد بانتظار التأكيد</b>',
            new_rsvp: '📩 <b>تأكيد حضور جديد</b>',
            new_wish: '💌 <b>تهنئة جديدة</b>'
        };
        const header = headers[kind] || '🔔 <b>تنبيه جديد</b>';
        const text = `${header}\n\n${inviteSummaryText(id, inv)}`;
        await tgSendMessage(env, text, { reply_markup: inviteActionButtons(id, inv) });
    } catch (e) {
        console.error('Telegram notify error:', e);
    }
}

async function findInvitationBySlugOrId(env, key) {
    // Try as a direct ID first
    const direct = await rtdbGet(`invitations/${key}`, env);
    if (direct) return { id: key, inv: direct };
    // Fall back to slug lookup
    const all = await rtdbGet('invitations', env);
    if (!all) return null;
    for (const [id, inv] of Object.entries(all)) {
        if (inv && inv.slug === key) return { id, inv };
    }
    return null;
}

// GET/POST /api/telegram/webhook - receives updates from Telegram
async function handleTelegramWebhook(request, env) {
    // Verify the secret token Telegram sends back, if configured.
    if (env.TELEGRAM_WEBHOOK_SECRET) {
        const got = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
        if (got !== env.TELEGRAM_WEBHOOK_SECRET) {
            return new Response('forbidden', { status: 403 });
        }
    }
    if (!env.TELEGRAM_BOT_TOKEN) {
        return new Response('bot not configured', { status: 500 });
    }

    let update;
    try {
        update = await request.json();
    } catch (e) {
        return new Response('ok');
    }

    try {
        if (update.callback_query) {
            await handleTelegramCallback(env, update.callback_query);
        } else if (update.message) {
            await handleTelegramMessage(env, update.message);
        }
    } catch (e) {
        console.error('Telegram webhook handling error:', e);
    }

    // Always 200 quickly so Telegram doesn't retry-storm us.
    return new Response('ok');
}

async function handleTelegramMessage(env, message) {
    const chatId = message.chat && message.chat.id;
    const text = (message.text || '').trim();

    // Restrict to the configured admin chat only (ignore/deny anyone else).
    if (env.TELEGRAM_CHAT_ID && String(chatId) !== String(env.TELEGRAM_CHAT_ID)) {
        await tgCall(env, 'sendMessage', { chat_id: chatId, text: '⛔ غير مصرح لك باستخدام هذا البوت.' });
        return;
    }

    if (text === '/start' || text === '/menu') {
        await tgSendMessage(env,
            '👋 <b>أهلًا بك في بوت إدارة دعوة فرح</b>\n\n' +
            'الأوامر المتاحة:\n' +
            '📝 /pending — الدعوات بانتظار المراجعة\n' +
            '💳 /payments — طلبات دفع بانتظار التأكيد\n' +
            '📊 /stats — إحصائيات المنصة\n' +
            '🔍 /find slug — البحث عن دعوة بالسلاج أو الـ ID'
        );
        return;
    }

    if (text === '/pending') {
        const all = await rtdbGet('invitations', env);
        const pending = all ? Object.entries(all).filter(([, inv]) => inv.status === 'pending_review') : [];
        if (!pending.length) {
            await tgSendMessage(env, '✅ لا توجد دعوات بانتظار المراجعة حاليًا.');
            return;
        }
        await tgSendMessage(env, `📝 يوجد <b>${pending.length}</b> دعوة بانتظار المراجعة:`);
        for (const [id, inv] of pending.slice(0, 15)) {
            await tgSendMessage(env, inviteSummaryText(id, inv), { reply_markup: inviteActionButtons(id, inv) });
        }
        return;
    }

    if (text === '/payments') {
        const all = await rtdbGet('invitations', env);
        const pending = all ? Object.entries(all).filter(([, inv]) => inv.payment?.status === 'pending_verification') : [];
        if (!pending.length) {
            await tgSendMessage(env, '✅ لا توجد طلبات دفع بانتظار التأكيد حاليًا.');
            return;
        }
        await tgSendMessage(env, `💳 يوجد <b>${pending.length}</b> طلب دفع بانتظار التأكيد:`);
        for (const [id, inv] of pending.slice(0, 15)) {
            await tgSendMessage(env, inviteSummaryText(id, inv), { reply_markup: inviteActionButtons(id, inv) });
        }
        return;
    }

    if (text === '/stats') {
        const [users, invitations] = await Promise.all([
            rtdbGet('users', env),
            rtdbGet('invitations', env)
        ]);
        const totalUsers = users ? Object.keys(users).length : 0;
        const invList = invitations ? Object.values(invitations) : [];
        const totalInvitations = invList.length;
        const totalViews = invList.reduce((s, i) => s + (i.viewsCount || 0), 0);
        const pendingReview = invList.filter(i => i.status === 'pending_review').length;
        const pendingPay = invList.filter(i => i.payment?.status === 'pending_verification').length;
        await tgSendMessage(env,
            `📊 <b>إحصائيات المنصة</b>\n\n` +
            `👥 المستخدمين: ${totalUsers}\n` +
            `💌 الدعوات: ${totalInvitations}\n` +
            `👁️ إجمالي المشاهدات: ${totalViews}\n` +
            `📝 بانتظار المراجعة: ${pendingReview}\n` +
            `💳 بانتظار تأكيد الدفع: ${pendingPay}`
        );
        return;
    }

    if (text.startsWith('/find')) {
        const key = text.replace('/find', '').trim();
        if (!key) {
            await tgSendMessage(env, 'استخدم: <code>/find mokhtar-aathar</code>');
            return;
        }
        const found = await findInvitationBySlugOrId(env, key);
        if (!found) {
            await tgSendMessage(env, `❌ لم يتم العثور على دعوة بالسلاج/الـ ID: <code>${escapeHtml(key)}</code>`);
            return;
        }
        await tgSendMessage(env, inviteSummaryText(found.id, found.inv), { reply_markup: inviteActionButtons(found.id, found.inv) });
        return;
    }

    await tgSendMessage(env, 'أمر غير معروف. اكتب /start لعرض القائمة.');
}

async function handleTelegramCallback(env, callbackQuery) {
    const chatId = callbackQuery.message?.chat?.id;
    if (env.TELEGRAM_CHAT_ID && String(chatId) !== String(env.TELEGRAM_CHAT_ID)) {
        await tgAnswerCallback(env, callbackQuery.id, '⛔ غير مصرح لك.');
        return;
    }

    const data = callbackQuery.data || '';
    const [action, id] = data.split(':');
    if (!id) {
        await tgAnswerCallback(env, callbackQuery.id, 'طلب غير صالح');
        return;
    }

    const inv = await rtdbGet(`invitations/${id}`, env);
    if (!inv) {
        await tgAnswerCallback(env, callbackQuery.id, '❌ الدعوة غير موجودة (تم حذفها؟)');
        return;
    }

    const patches = { updatedAt: Date.now() };
    let ackText = '';
    let userNote = '';

    if (action === 'approve_inv') {
        patches.status = 'active';
        patches.isPublished = true;
        ackText = '✅ تم اعتماد الدعوة ونشرها';
        userNote = `✅ تم اعتماد دعوتك ونشرها:\nhttps://da3watfarah.com/${inv.slug}`;
    } else if (action === 'reject_inv') {
        patches.status = 'rejected';
        patches.isPublished = false;
        ackText = '❌ تم رفض الدعوة';
        userNote = '❌ تم رفض دعوتك، يرجى التواصل مع الإدارة.';
    } else if (action === 'verify_pay') {
        patches['payment/status'] = 'verified';
        patches['payment/verifiedAt'] = Date.now();
        // A verified payment on a previously-pending invitation also unlocks review.
        if (inv.status === 'pending_review') { patches.status = 'active'; patches.isPublished = true; }
        ackText = '💰 تم تأكيد الدفع';
        userNote = '💰 تم تأكيد دفعتك بنجاح، شكرًا لك!';
    } else if (action === 'reject_pay') {
        patches['payment/status'] = 'rejected';
        ackText = '🚫 تم رفض الدفع';
        userNote = '🚫 تم رفض إيصال الدفع المرسل، يرجى إعادة الإرسال أو التواصل مع الإدارة.';
    } else {
        await tgAnswerCallback(env, callbackQuery.id, 'إجراء غير معروف');
        return;
    }

    const ok = await rtdbPatch(`invitations/${id}`, env, patches);
    if (inv.userId) {
        await rtdbPatch(`users/${inv.userId}/invitations/${id}`, env, patches).catch(() => {});
    }

    await tgAnswerCallback(env, callbackQuery.id, ok ? ackText : '⚠️ فشل التحديث في قاعدة البيانات');

    if (ok) {
        const updatedInv = { ...inv, ...patches, payment: { ...(inv.payment || {}), ...(patches['payment/status'] ? { status: patches['payment/status'] } : {}) } };
        // Edit the original message to reflect the new state + remove stale buttons.
        try {
            await tgCall(env, 'editMessageText', {
                chat_id: chatId,
                message_id: callbackQuery.message.message_id,
                parse_mode: 'HTML',
                text: `${inviteSummaryText(id, updatedInv)}\n\n<b>${escapeHtml(ackText)}</b>`,
                reply_markup: inviteActionButtons(id, updatedInv)
            });
        } catch (e) { /* ignore edit failures */ }
    }
}

// Admin panel (admin.html) login password. Used to be a Firebase
// email + password login shared with regular users; now the admin only
// types this single password (kept here, on the Worker — not in the
// front-end code). Override it by setting an ADMIN_PASSWORD secret on
// the Worker (Settings > Variables and secrets) if you want to change it
// without editing this file.
const DEFAULT_ADMIN_PASSWORD = '521988';

// Where the actual static site files (HTML/CSS/JS) live. Uses jsDelivr's
// raw-file CDN pointed at the GitHub repo/branch — NOT github.io — because
// GitHub Pages 301-redirects github.io requests back to the custom domain
// (da3watfarah.com) whenever a CNAME file is present, which breaks fetches
// made from *inside* the Worker that fronts that very same custom domain.
// Override with the ORIGIN_BASE environment variable if the repo/branch
// ever changes (Worker > Settings > Variables and secrets).
function getOriginBase(env) {
    return env.ORIGIN_BASE || 'https://cdn.jsdelivr.net/gh/mohamednasr5/-da3watfarah@main';
}

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

        if (url.pathname === '/api/ai/translate' && request.method === 'POST') {
            return handleAiTranslate(request, env, corsHeaders);
        }

        if (url.pathname === '/api/admin/login' && request.method === 'POST') {
            return handleAdminLogin(request, env, corsHeaders);
        }

        // Telegram bot webhook — receives messages/button clicks from the
        // admin chat and pushes notifications for new orders/reviews/payments.
        if (url.pathname === '/api/telegram/webhook' && request.method === 'POST') {
            return handleTelegramWebhook(request, env);
        }

        // Fired by the front-end whenever something notification-worthy
        // happens (new invitation submitted, payment receipt submitted, new
        // RSVP, new wish) so the front-end never needs to know Telegram
        // exists — it just POSTs a generic event and the Worker relays it.
        if (url.pathname === '/api/notify' && request.method === 'POST') {
            return handleNotifyEvent(request, env, corsHeaders);
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
                adminFirebasePasswordConfigured: !!env.ADMIN_FIREBASE_PASSWORD,
                telegramBotConfigured: !!env.TELEGRAM_BOT_TOKEN,
                telegramChatConfigured: !!env.TELEGRAM_CHAT_ID,
                telegramWebhookSecretConfigured: !!env.TELEGRAM_WEBHOOK_SECRET,
                firebaseDbSecretConfigured: !!env.FIREBASE_DB_SECRET
            }, corsHeaders);
        }

        // Anything else (admin.html, gallery.html, css/js/assets, the root
        // "/", etc.) is a request for one of the site's own static files.
        // Proxy it straight through from the origin (see getOriginBase)
        // instead of returning the API info JSON, which is what made every
        // page on da3watfarah.com show the raw API message previously.
        if (request.method === 'GET' || request.method === 'HEAD') {
            return serveStaticFile(request, env, url, corsHeaders);
        }

        return jsonResponse({
            message: 'Da3wat Farah API',
            version: '1.2.0',
            endpoints: [
                'POST /api/upload - Upload file to R2',
                'DELETE /api/delete - Delete file from R2',
                'GET /api/list - List files in bucket',
                'POST /api/ai/generate - Generate invitation text via AI',
                'POST /api/ai/translate - Translate invitation text (AR<->EN) via AI',
                'POST /api/admin/login - Owner login with a single password (no email)',
                'POST /api/telegram/webhook - Telegram bot updates (set via setWebhook)',
                'POST /api/notify - Relay new_invitation/payment_submitted/new_rsvp/new_wish to Telegram',
                'GET /api/random-cover?event=wedding - Get random cover image for event type',
                'GET /files/:key - Serve file from R2',
                'GET /health - Diagnostics'
            ]
        }, corsHeaders, 200);
    },
};

// Proxies a request for a static site file (HTML/CSS/JS/image/etc.) from
// the origin (jsDelivr CDN by default — see getOriginBase) so the whole
// site can be served through da3watfarah.com via this single Worker,
// without needing a separate GitHub Pages / Cloudflare Pages custom-domain
// setup. "/" is mapped to "/index.html" since the CDN has no directory
// index behaviour of its own.
async function serveStaticFile(request, env, url, corsHeaders) {
    const ORIGIN_BASE = getOriginBase(env);
    let pathname = url.pathname;
    if (pathname === '/' || pathname === '') pathname = '/index.html';

    try {
        const originRes = await fetch(`${ORIGIN_BASE}${pathname}${url.search}`, {
            method: request.method,
            cf: { cacheTtl: 300, cacheEverything: false },
        });

        // Unknown file -> let the site's own 404.html render instead of a
        // bare CDN error page, and use a real 404 status.
        if (originRes.status === 404 && pathname !== '/404.html') {
            const notFoundRes = await fetch(`${ORIGIN_BASE}/404.html`, {
                cf: { cacheTtl: 300, cacheEverything: false },
            });
            const headers2 = new Headers(notFoundRes.headers);
            for (const [k, v] of Object.entries(corsHeaders)) {
                if (!headers2.has(k)) headers2.set(k, v);
            }
            headers2.set('Cache-Control', 'no-store');
            return new Response(notFoundRes.body, { status: 404, headers: headers2 });
        }

        const headers = new Headers(originRes.headers);
        for (const [k, v] of Object.entries(corsHeaders)) {
            if (!headers.has(k)) headers.set(k, v);
        }
        // jsDelivr sets an aggressive shared Cache-Control by default;
        // keep pages reasonably fresh so content edits show up quickly.
        if (pathname.endsWith('.html') || pathname === '/index.html') {
            headers.set('Cache-Control', 'public, max-age=60');
        }
        return new Response(originRes.body, {
            status: originRes.status,
            statusText: originRes.statusText,
            headers,
        });
    } catch (e) {
        console.error('Static proxy error:', e);
        return errorResponse('تعذر تحميل الصفحة المطلوبة من المصدر.', 502, corsHeaders);
    }
}

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
 * Translate a batch of Arabic invitation strings to English (or vice versa)
 * via the AI, used by vip/assets/vip-i18n.js on every VIP template so the
 * EN/AR switcher can translate BOTH the template's own static copy
 * (section titles, labels, FAQ, etc. — sent as data-i18n text) AND the
 * couple's own entered data (names, custom invitation text, venue, etc. —
 * sent as data-bind text), without anyone having to hand-write an EN
 * dictionary for every invitation.
 *
 * Request body:  { texts: string[], target: "en" | "ar", context?: string }
 * Response body: { success: true, translations: string[] }  (same length +
 *                 order as `texts`, one-to-one)
 *
 * The caller (vip-i18n.js) caches the result in localStorage per template,
 * so this endpoint is only hit once per unique invitation text — not on
 * every language toggle.
 */
async function handleAiTranslate(request, env, corsHeaders) {
    try {
        if (!env.NVIDIA_API_KEY) {
            return errorResponse('مفتاح NVIDIA_API_KEY غير مضبوط على هذا الـ Worker.', 500, corsHeaders);
        }

        const body = await request.json();
        const texts = Array.isArray(body.texts) ? body.texts.map((t) => String(t == null ? '' : t)) : [];
        const target = body.target === 'ar' ? 'ar' : 'en';
        const context = typeof body.context === 'string' ? body.context.trim() : '';

        if (!texts.length) {
            return jsonResponse({ success: true, translations: [] }, corsHeaders);
        }
        // Keep batches sane — a single invitation page has well under 150
        // translatable strings, but guard against abuse either way.
        const capped = texts.slice(0, 200);

        const targetLabel = target === 'en' ? 'English' : 'Arabic';

        // Callers that are translating people's given names (e.g. the
        // groom/bride name fields, used to build the English URL slug)
        // pass a context string mentioning "name". Real Arabic first
        // names are very often also ordinary Arabic words (e.g. أثر,
        // أمل, نور, وفاء), so a generic translation prompt will render
        // their *meaning* ("effect", "hope"...) instead of transliterating
        // the *name itself* ("Athar", "Amal"...). Use a dedicated,
        // stricter prompt whenever the context signals this is a
        // person-name request, regardless of language of the context text.
        const isNameRequest = /name|اسم|أسماء/i.test(context);

        const systemPrompt = isNameRequest
            ? 'You transliterate Arabic people\'s given names into English letters (romanization), for use in a wedding invitation URL. ' +
              'You will receive a JSON array of Arabic first names (in the original order). ' +
              'Return ONLY a JSON array of the same length, in the same order — one romanized name per entry. ' +
              'CRITICAL: these are personal names, not ordinary words. Even if a name is spelled the same as a common Arabic ' +
              'word (e.g. "أثر" -> "Athar", NOT "Effect" or "Trace"; "أمل" -> "Amal", NOT "Hope"; "نور" -> "Nour", NOT "Light"), ' +
              'you must always output the phonetic English spelling of the name, never a translation of its dictionary meaning. ' +
              'Use standard, natural romanization (e.g. "محمد" -> "Mohamed", "سارة" -> "Sara", "عبدالله" -> "Abdullah"). ' +
              'Do not add titles, honorifics, or extra words. ' +
              'do not add, remove, merge, or reorder array items; ' +
              'if a string is empty, return an empty string in that position; ' +
              'output must be valid JSON and nothing else — no markdown fences, no commentary.'
            : `You translate short strings from a wedding/event invitation website from Arabic to ${targetLabel}. ` +
              'You will receive a JSON array of strings (in the original order). ' +
              'Return ONLY a JSON array of the same length, in the same order, with each string translated. ' +
              (context ? `Context: ${context}. ` : '') +
              'Rules: keep personal names transliterated naturally (do not translate names literally); ' +
              'keep numbers, dates and times as-is unless the surrounding words need translating too; ' +
              'keep the tone warm and appropriate for a formal invitation; ' +
              'do not add, remove, merge, or reorder array items; ' +
              'if a string is empty, return an empty string in that position; ' +
              'output must be valid JSON and nothing else — no markdown fences, no commentary.';

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
                    { role: 'user', content: JSON.stringify(capped) },
                ],
                temperature: 0.2,
                max_tokens: 2000,
            }),
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error('NVIDIA API translate error:', errText);
            return errorResponse('تعذر ترجمة النص عبر الذكاء الاصطناعي الآن', 502, corsHeaders);
        }

        const data = await res.json();
        let raw = (data.choices?.[0]?.message?.content || '').trim();
        // Strip ```json fences if the model added them despite instructions.
        raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

        let translations;
        try {
            translations = JSON.parse(raw);
        } catch (parseErr) {
            console.error('AI translate: could not parse model output as JSON:', raw);
            return errorResponse('تعذرت قراءة نتيجة الترجمة', 502, corsHeaders);
        }

        if (!Array.isArray(translations)) {
            return errorResponse('نتيجة الترجمة غير صالحة', 502, corsHeaders);
        }

        // Defensive: pad/truncate to exactly match the input length so the
        // caller can always zip translations[i] with texts[i] safely.
        while (translations.length < capped.length) translations.push(capped[translations.length]);
        translations = translations.slice(0, capped.length).map((t) => (t == null ? '' : String(t)));

        return jsonResponse({ success: true, translations }, corsHeaders);

    } catch (error) {
        console.error('AI translate error:', error);
        return errorResponse('Failed to translate text', 500, corsHeaders);
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

/**
 * POST /api/notify
 * Body: { kind: 'new_invitation'|'payment_submitted'|'new_rsvp'|'new_wish', id: string }
 * The front-end (create-invitation.html, invite.html RSVP/wish forms, the
 * payment step) calls this right after writing to Firebase, so the Telegram
 * notification always carries the freshest saved data (re-fetched here from
 * RTDB by id, never trusted blindly from the client).
 */
async function handleNotifyEvent(request, env, corsHeaders) {
    try {
        const body = await request.json().catch(() => ({}));
        const { kind, id } = body;
        const validKinds = ['new_invitation', 'payment_submitted', 'new_rsvp', 'new_wish'];
        if (!validKinds.includes(kind) || !id) {
            return errorResponse('kind/id غير صالحين', 400, corsHeaders);
        }
        const inv = await rtdbGet(`invitations/${id}`, env);
        if (!inv) {
            return errorResponse('الدعوة غير موجودة', 404, corsHeaders);
        }
        await notifyTelegram(env, kind, id, inv);
        return jsonResponse({ success: true }, corsHeaders);
    } catch (error) {
        console.error('Notify error:', error);
        return errorResponse('فشل إرسال الإشعار', 500, corsHeaders);
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
    '/manifest.json', '/sw.js', '/health'
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
        return new Response(null, { status: 302, headers: { Location: (env.PUBLIC_URL ? env.PUBLIC_URL + '/og-default.jpg' : 'https://da3watfarah.com/10.png') } });
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

    // NOTE: adjust ORIGIN_BASE if your GitHub repo/user/branch differs.
    // IMPORTANT: this uses jsDelivr's raw-file CDN (NOT github.io) because
    // GitHub Pages automatically 301-redirects any request that hits its
    // own <user>.github.io domain back to the custom domain configured in
    // the repo's CNAME file (da3watfarah.com) — which, since this Worker
    // sits in front of da3watfarah.com, caused an infinite loop / wrong
    // page being served ("الدعوة غير موجودة" showing up for every page).
    // jsDelivr serves the exact same files straight from the git repo with
    // no such redirect, so it's safe to fetch from inside the Worker.
    const ORIGIN_BASE = getOriginBase(env);
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
        flickr: ['bride,groom', 'wedding,couple', 'bride,wedding', 'wedding,ceremony', 'groom,bride'],
        colors: ['#D4AF37', '#F5E6D3', '#8B0000', '#FFFFFF'],
        fallbackText: 'زفاف سعيد'
    },
    engagement: {
        queries: ['engagement ring', 'romantic dinner', 'couple love', 'engagement party', 'roses'],
        flickr: ['couple,ring', 'engagement,ring', 'couple,romantic', 'couple,roses'],
        colors: ['#FF69B4', '#FFD700', '#C0C0C0', '#FFE4E1'],
        fallbackText: 'خطوبة سعيدة'
    },
    katb_ketab: {
        queries: ['islamic decoration', 'arabic calligraphy', 'mosque interior', 'islamic pattern'],
        flickr: ['mosque,islamic', 'quran,islamic', 'arabic,calligraphy', 'mosque,interior'],
        colors: ['#1A5F1A', '#D4AF37', '#FFFFFF', '#2C3E50'],
        fallbackText: 'كتب الكتاب'
    },
    henna: {
        queries: ['henna design', 'henna party', 'arabic celebration', 'women gathering'],
        flickr: ['henna,hands', 'henna,party', 'henna,design'],
        colors: ['#8B008B', '#FF1493', '#D4AF37', '#2D1B4E'],
        fallbackText: 'ليلة حناء'
    },
    birthday: {
        queries: ['birthday party', 'birthday cake', 'balloons', 'celebration', 'confetti'],
        flickr: ['birthday,cake', 'balloons,party', 'birthday,celebration', 'confetti,party'],
        colors: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3'],
        fallbackText: 'عيد ميلاد سعيد'
    },
    newborn: {
        queries: ['baby', 'newborn', 'baby shower', 'baby feet', 'soft baby'],
        flickr: ['baby,newborn', 'baby,cute', 'baby,shower'],
        colors: ['#FFB6C1', '#87CEEB', '#F0E68C', '#DDA0DD'],
        fallbackText: 'مبارك المولود'
    },
    graduation: {
        queries: ['graduation', 'cap and gown', 'university', 'diploma', 'academic'],
        flickr: ['graduation,cap', 'graduation,university', 'graduation,diploma'],
        colors: ['#1E3A5F', '#D4AF37', '#2E4057', '#F5F5DC'],
        fallbackText: 'مبروك التخرج'
    },
    ramadan: {
        queries: ['ramadan', 'iftar', 'lanterns', 'moon and stars', 'dates', 'mosque at night'],
        flickr: ['ramadan,lantern', 'mosque,night', 'lantern,moon'],
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
        const preferredSource = url.searchParams.get('source') || 'loremflickr';
        
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
            case 'loremflickr': {
                // Real Creative-Commons photos from Flickr, keyword-matched per event
                // section - no API key needed, and unlike source.unsplash.com (shut
                // down permanently in 2024) this is currently working.
                const flickrTags = config.flickr[Math.floor(Math.random() * config.flickr.length)];
                imageUrl = `https://loremflickr.com/${width}/${height}/${encodeURIComponent(flickrTags)}?random=${Date.now()}`;
                break;
            }
                
            case 'unsplash':
                // source.unsplash.com has been permanently shut down since 2024 -
                // kept only for backward compatibility, do not use as default.
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