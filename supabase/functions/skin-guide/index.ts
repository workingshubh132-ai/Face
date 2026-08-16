// Skinprint — natural care guide (Supabase Edge Function)
//
// OPTIONAL. The app works without this deployed: index.html falls back to an
// on-device rule-based guide whenever this endpoint is missing, slow, or errors.
// Deploy it only when you want real AI-written guidance.
//
// Privacy: this function never receives the photo. The browser sends only the
// derived skin type and the user's answers to a short questionnaire — plain
// text, no image data, nothing biometric. Nothing here writes to a database.
//
// Deploy:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   supabase functions deploy skin-guide --no-verify-jwt
//
// Cost note: ANTHROPIC_MODEL defaults to claude-opus-5. For a task this small,
// claude-haiku-4-5 costs roughly a fifth as much per call and is more than
// capable here — set ANTHROPIC_MODEL to switch, no code change needed.

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-opus-5";

// Rate limiting: in-memory, so it resets on cold start and is per-instance
// rather than global. Good enough to blunt casual abuse of a free endpoint;
// for a real ceiling, move the counter into a Postgres table or Upstash Redis.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // crude bound on memory growth
  return recent.length > MAX_PER_WINDOW;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const SYSTEM = `You write gentle, practical skincare habit guidance for a cosmetic app used in India.

Hard rules:
- Cosmetic and lifestyle guidance only. Never diagnose. Never name a medical condition (no acne vulgaris, rosacea, eczema, dermatitis, fungal, etc.) — describe what someone sees instead ("bumps that come and go", "patches that feel tight").
- Never claim anything cures, treats, heals, or fixes. Use "may help", "many people find", "worth trying".
- Natural and kitchen-shelf remedies only, and only ones that are safe on skin: honey, aloe vera, cooled green tea, colloidal oatmeal, plain yoghurt/curd, rose water, cucumber, multani mitti (fuller's earth), coconut and almond oil for body.
- NEVER suggest: lemon or lime juice, baking soda, toothpaste, undiluted essential oils, salt or sugar scrubs on the face, alum, raw garlic, ginger, or vinegar on skin. These cause burns and barrier damage. The "avoid" list must warn against several of these with a short reason each.
- No prescription actives, no dosages, no supplements, no oral anything.
- Always tell the user to patch test a new thing on the inner forearm for 24 hours first.
- Assume no age gate: keep everything safe for a teenager.

Write in warm, plain, everyday English. Be specific and practical rather than generic. Keep each string to one or two short sentences.`;

const SYSTEM_HAIR = `You write gentle, practical hair care guidance for a cosmetic app used in India.

Hard rules:
- Cosmetic and lifestyle guidance only. Never diagnose. Never name a medical condition (no alopecia, seborrheic dermatitis, psoriasis, ringworm, etc.) — describe what someone sees instead ("flaking that keeps coming back", "hair coming out more than usual").
- Never claim anything cures, treats, regrows, or reverses hair loss. Use "may help", "many people find", "worth trying".
- Natural and kitchen-shelf options only, and only ones that are safe on hair and scalp: coconut oil, almond oil, amla, curry leaves, methi (fenugreek) soaked and ground, aloe vera, hibiscus, rice water, plain yoghurt, diluted apple cider vinegar as an occasional rinse.
- NEVER suggest: undiluted lemon juice on the scalp, raw onion juice without a patch-test warning, bleach, baking soda, dish soap, or hot water washing. The "avoid" list must warn against several damaging habits with a short reason each.
- No minoxidil, finasteride, ketoconazole, steroids, supplements, or anything oral or prescription.
- Always tell the user to patch test a new thing behind the ear or on the inner arm for 24 hours first.
- Assume no age gate: keep everything safe for a teenager.
- For "styling", give practical technique tips suited to their hair type — no heat above what a home dryer does, and always mention heat protectant when heat is involved.

Write in warm, plain, everyday English. Be specific and practical rather than generic. Keep each string to one or two short sentences.`;

const SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    daily: {
      type: "array",
      items: {
        type: "object",
        properties: {
          time: { type: "string" },
          steps: { type: "array", items: { type: "string" } },
        },
        required: ["time", "steps"],
        additionalProperties: false,
      },
    },
    remedies: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          how: { type: "string" },
        },
        required: ["name", "how"],
        additionalProperties: false,
      },
    },
    avoid: { type: "array", items: { type: "string" } },
    lifestyle: { type: "array", items: { type: "string" } },
    seeDoctor: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "daily", "remedies", "avoid", "lifestyle", "seeDoctor"],
  additionalProperties: false,
};

// Same shape as SCHEMA plus `styling`, so the client renders both with one
// code path. The client only reveals styling when the user asks for it.
const SCHEMA_HAIR = {
  type: "object",
  properties: {
    ...SCHEMA.properties,
    styling: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          how: { type: "string" },
        },
        required: ["name", "how"],
        additionalProperties: false,
      },
    },
  },
  required: [...SCHEMA.required, "styling"],
  additionalProperties: false,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  if (!ANTHROPIC_API_KEY) {
    // The client treats any non-200 as "fall back to the on-device guide",
    // so an unconfigured deployment degrades quietly rather than breaking.
    return json({ error: "ANTHROPIC_API_KEY not configured" }, 503);
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (rateLimited(ip)) {
    return json({ error: "Too many requests. Try again in a minute." }, 429);
  }

  let payload: { topic?: string; skinType?: string; answers?: Record<string, string> };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const topic = payload.topic === "hair" ? "hair" : "skin";
  const skinType = String(payload.skinType ?? "").slice(0, 40);
  const answers = payload.answers ?? {};
  // Bound what reaches the model — this endpoint is public.
  const answerLines = Object.entries(answers)
    .slice(0, 12)
    .map(([k, v]) => `- ${String(k).slice(0, 60)}: ${String(v).slice(0, 120)}`)
    .join("\n");

  const userMessage = topic === "hair"
    ? `Someone answered a short hair questionnaire:
${answerLines || "- (no answers given)"}

Write them a natural hair care plan:
- summary: two sentences on what to focus on, given their hair type and answers.
- daily: two entries, "Wash day" and "Between washes", 3-4 steps each — habits and technique, not product shopping.
- remedies: 3-4 safe kitchen-shelf options, each with how to use it and how often. Include the patch-test reminder in at least one.
- avoid: 4-5 common habits that actually damage hair, each with a short reason.
- lifestyle: 3-4 habits tied to their specific answers (wash frequency, heat and chemical use, scalp feel).
- styling: 3-4 styling techniques suited specifically to their hair type, each with how to do it.
- seeDoctor: 3 plain-language signs it's worth seeing a dermatologist about their scalp or hair.`
    : `An on-device photo read estimated this person's skin type as: ${skinType || "unknown"}.

They answered a short questionnaire:
${answerLines || "- (no answers given)"}

Write them a natural care plan:
- summary: two sentences on what to focus on, given their type and answers.
- daily: two entries, "Morning" and "Evening", 3-4 steps each — habits and gentle care, not product shopping.
- remedies: 3-4 safe kitchen-shelf options, each with how to use it and how often. Include the patch-test reminder in at least one.
- avoid: 4-5 popular DIY remedies that actually damage skin, each with a short reason.
- lifestyle: 3-4 habits tied to their specific answers (their environment, sleep, water, face-touching).
- seeDoctor: 3 plain-language signs it's worth seeing a dermatologist.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: topic === "hair" ? SYSTEM_HAIR : SYSTEM,
        output_config: {
          effort: "low",
          format: { type: "json_schema", schema: topic === "hair" ? SCHEMA_HAIR : SCHEMA },
        },
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Anthropic API error", res.status, detail);
      return json({ error: "Upstream model error" }, 502);
    }

    const data = await res.json();

    if (data.stop_reason === "refusal") {
      return json({ error: "Request declined by safety filters" }, 502);
    }

    const text = (data.content ?? []).find((b: { type: string }) => b.type === "text")?.text;
    if (!text) return json({ error: "Empty model response" }, 502);

    return json({ plan: JSON.parse(text) });
  } catch (err) {
    console.error("skin-guide failed", err);
    return json({ error: "Guide generation failed" }, 500);
  }
});
