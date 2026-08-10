var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-custom-header"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (url.pathname === "/api/upload" && request.method === "POST") {
      return handleUpload(request, env, corsHeaders, url);
    }
    if (url.pathname === "/api/delete" && request.method === "DELETE") {
      return handleDelete(request, env, corsHeaders);
    }
    if (url.pathname === "/api/list" && request.method === "GET") {
      return handleList(request, env, corsHeaders, url);
    }
    if (url.pathname === "/api/ai/generate" && request.method === "POST") {
      return handleAiGenerate(request, env, corsHeaders);
    }
    if (url.pathname === "/api/ai/translate" && request.method === "POST") {
      return handleAiTranslate(request, env, corsHeaders);
    }
    if (url.pathname === "/api/admin/login" && request.method === "POST") {
      return handleAdminLogin(request, env, corsHeaders);
    }
    if (url.pathname === "/api/telegram/webhook" && request.method === "POST") {
      return handleTelegramWebhook(request, env);
    }
    if (url.pathname === "/api/notify" && request.method === "POST") {
      return handleNotifyEvent(request, env, corsHeaders);
    }
    if (url.pathname.startsWith("/api/og/") && request.method === "GET") {
      return handleOgImage(request, env, url);
    }
    if ((url.pathname === "/invite.html" || isPrettyInviteSlug(url.pathname)) && request.method === "GET") {
      return handleInvitePage(request, env, url);
    }
    if (url.pathname === "/sitemap-invitations.xml" && request.method === "GET") {
      return handleInvitationsSitemap(env);
    }
    if (url.pathname === "/api/random-cover" && request.method === "GET") {
      return handleRandomCover(request, env, corsHeaders, url);
    }
    if (url.pathname.startsWith("/files/")) {
      return serveFile(url, env, corsHeaders);
    }
    if (url.pathname === "/health") {
      const bucket = getBucket(env);
      return jsonResponse({
        status: "ok",
        service: "da3watfarah-worker",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        r2BucketConnected: !!bucket,
        publicUrlConfigured: !!env.PUBLIC_URL,
        nvidiaKeyConfigured: !!env.NVIDIA_API_KEY,
        adminPasswordConfigured: !!env.ADMIN_PASSWORD,
        adminFirebaseEmailConfigured: !!env.ADMIN_FIREBASE_EMAIL,
        adminFirebasePasswordConfigured: !!env.ADMIN_FIREBASE_PASSWORD,
        telegramBotConfigured: !!env.TELEGRAM_BOT_TOKEN,
        telegramChatConfigured: !!env.TELEGRAM_CHAT_ID,
        telegramWebhookSecretConfigured: !!env.TELEGRAM_WEBHOOK_SECRET,
        firebaseDbSecretConfigured: !!env.FIREBASE_DB_SECRET
      }, corsHeaders);
    }

    // أي مسار آخر (ملفات الموقع الثابتة: admin.html, gallery.html, ...)
    // يُمرَّر (proxy) مباشرة إلى GitHub Pages بدل إرجاع رسالة الـ API الافتراضية.
    if (request.method === "GET" || request.method === "HEAD") {
      const ORIGIN_BASE = env.ORIGIN_BASE || "https://mohamednasr5.github.io/-da3watfarah";
      const originUrl = ORIGIN_BASE + url.pathname + url.search;
      try {
        const originRes = await fetch(originUrl, {
          method: request.method,
          headers: request.headers,
          cf: { cacheTtl: 60, cacheEverything: false }
        });
        const newHeaders = new Headers(originRes.headers);
        // نضيف CORS احتياطًا لو احتجناها من صفحات ثابتة
        for (const [k, v] of Object.entries(corsHeaders)) {
          if (!newHeaders.has(k)) newHeaders.set(k, v);
        }
        return new Response(originRes.body, {
          status: originRes.status,
          statusText: originRes.statusText,
          headers: newHeaders
        });
      } catch (e) {
        console.error("Origin proxy error:", e);
        return errorResponse("تعذر الوصول لمصدر الموقع (GitHub Pages).", 502, corsHeaders);
      }
    }

    return jsonResponse({
      message: "Da3wat Farah API",
      version: "1.2.0",
      endpoints: [
        "POST /api/upload - Upload file to R2",
        "DELETE /api/delete - Delete file from R2",
        "GET /api/list - List files in bucket",
        "POST /api/ai/generate - Generate invitation text via AI",
        "POST /api/ai/translate - Translate invitation text (AR<->EN) via AI",
        "POST /api/admin/login - Owner login with a single password (no email)",
        "POST /api/telegram/webhook - Telegram bot updates (set via setWebhook)",
        "POST /api/notify - Relay new_invitation/payment_submitted/new_rsvp/new_wish to Telegram",
        "GET /api/random-cover?event=wedding - Get random cover image for event type",
        "GET /files/:key - Serve file from R2",
        "GET /health - Diagnostics"
      ]
    }, corsHeaders, 200);
  }
};