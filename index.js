// ===== Cloudflare Worker: دعوة فرح =====
// المسارات:
//   POST /api/upload      -> رفع صورة/صوت إلى R2 وإرجاع رابط عام
//   POST /api/ai/generate -> توليد نص دعوة عبر NVIDIA AI (NIM API)
//
// المتغيرات المطلوبة (تُضبط في wrangler.toml أو Cloudflare Dashboard):
//   R2_BUCKET        binding لباكت R2 (اسم الـ binding: MEDIA_BUCKET)
//   PUBLIC_R2_URL    الدومين العام لباكت الـ R2 (مثال: https://media.da3watfarah.com)
//   NVIDIA_API_KEY   مفتاح NVIDIA NIM API (secret)

const ALLOWED_ORIGIN = "*"; // غيّرها لـ https://da3watfarah.com في الإنتاج

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (url.pathname === "/api/upload" && request.method === "POST") {
        return await handleUpload(request, env);
      }
      if (url.pathname === "/api/ai/generate" && request.method === "POST") {
        return await handleAiGenerate(request, env);
      }
      return json({ error: "not found" }, 404);
    } catch (err) {
      return json({ error: err.message || "server error" }, 500);
    }
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

// ===== رفع الملفات إلى R2 =====
async function handleUpload(request, env) {
  const formData = await request.formData();
  const file = formData.get("file");
  const type = formData.get("type") || "misc"; // cover | song | gallery
  const slug = formData.get("slug") || "unknown";

  if (!file || typeof file === "string") {
    return json({ error: "no file provided" }, 400);
  }

  const maxSizeMb = type === "song" ? 15 : 8;
  if (file.size > maxSizeMb * 1024 * 1024) {
    return json({ error: `الملف أكبر من الحد المسموح (${maxSizeMb}MB)` }, 400);
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const key = `${slug}/${type}/${Date.now()}-${safeName}`;

  await env.MEDIA_BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  const publicUrl = `${env.PUBLIC_R2_URL}/${key}`;
  return json({ url: publicUrl, key });
}

// ===== توليد نص الدعوة عبر NVIDIA AI (NIM API) =====
async function handleAiGenerate(request, env) {
  const body = await request.json();
  const { groomName = "", brideName = "", eventType = "wedding", venueName = "", tone = "رسمي" } = body;

  const eventLabel = { wedding: "حفل زفاف", engagement: "خطوبة", katb_ketab: "كتب كتاب" }[eventType] || "حفل زفاف";

  const systemPrompt =
    "أنت كاتب محترف لنصوص دعوات الأفراح باللغة العربية الفصحى السهلة. " +
    "اكتب نص دعوة قصير وأنيق (من ٣٠ إلى ٦٠ كلمة)، بدون عنوان وبدون شرح إضافي، فقط نص الدعوة نفسه.";

  const userPrompt =
    `اكتب نص دعوة ${eventLabel} بأسلوب ${tone}، ` +
    `للعروسين ${groomName} و${brideName}` +
    (venueName ? ` في ${venueName}` : "") +
    `. النص يوجَّه للضيوف مباشرة ويدعوهم لمشاركة الفرحة.`;

  const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.NVIDIA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "meta/llama-3.1-70b-instruct",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 300,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return json({ error: "ai request failed", details: errText }, 502);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim() || "";
  return json({ text });
}
