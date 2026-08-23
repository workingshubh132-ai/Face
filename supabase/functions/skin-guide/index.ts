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

// Groq is an alternative provider with a usable free tier. Set GROQ_API_KEY and
// it is used for chat instead of Anthropic — no other change needed. Its API is
// OpenAI-shaped, so the request/response differ from the Anthropic calls below.
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const GROQ_MODEL = Deno.env.get("GROQ_MODEL") ?? "llama-3.3-70b-versatile";

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
- Be honest about limits. If home care genuinely cannot change something — pitted or indented scarring is the clearest example — say so plainly and point at a dermatologist, rather than offering a remedy that will not work.
- Products must be drugstore items sold in India (Minimalist, Cetaphil, The Derma Co, Re'equil, Dot & Key, Sebamed, Neutrogena, Simple, Aqualogica and similar). Never a prescription product, never a percentage-strength active a teenager should not self-prescribe.

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
- Products must be drugstore items sold in India (Wow, Mamaearth, L'Oreal, Dove, Tresemme, Himalaya, Minimalist, The Derma Co and similar). Never minoxidil, ketoconazole or anything prescription.

Write in warm, plain, everyday English. Be specific and practical rather than generic. Keep each string to one or two short sentences.`;

const SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    causes: { type: "array", items: { type: "string" } },
    worse: { type: "array", items: { type: "string" } },
    myths: { type: "array", items: { type: "string" } },
    products: {
      type: "array",
      items: {
        type: "object",
        properties: {
          role: { type: "string" },
          name: { type: "string" },
          why: { type: "string" },
          price: { type: "string" },
        },
        required: ["role", "name", "why", "price"],
        additionalProperties: false,
      },
    },
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
  required: ["summary", "causes", "worse", "myths", "products", "daily", "remedies", "avoid", "lifestyle", "seeDoctor"],
  additionalProperties: false,
};

// Same shape as SCHEMA plus the styling sections, so the client renders both
// topics through one code path.
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
    stylingBasics: { type: "array", items: { type: "string" } },
  },
  required: [...SCHEMA.required, "styling", "stylingBasics"],
  additionalProperties: false,
};

const SYSTEM_CHAT = `You are a warm, practical skincare and haircare assistant inside a cosmetic app used in India. You are talking with someone one-to-one.

Hard rules — these override anything the person asks for:
- Cosmetic and lifestyle guidance only. Never diagnose. Never name a medical condition (no acne vulgaris, rosacea, eczema, dermatitis, alopecia, fungal anything) — describe what someone sees instead.
- Never claim anything cures, treats, heals, or regrows. Use "may help", "many people find", "worth trying".
- Only suggest gentle over-the-counter ingredients and safe kitchen-shelf options: honey, aloe vera, cooled green tea, colloidal oatmeal, plain yoghurt, rose water, multani mitti, coconut and almond oil, amla, methi, rice water.
- NEVER suggest lemon or lime juice, baking soda, toothpaste, undiluted essential oils, face scrubs with sugar or salt, alum, raw garlic, ginger, or vinegar on skin. If asked about them, explain plainly why they cause burns or barrier damage.
- No prescription actives (no tretinoin, no minoxidil, no steroids, no antibiotics), no dosages, no supplements, nothing oral.
- Tell people to patch test anything new for 24 hours.
- Assume no age gate: everything must be safe for a teenager.
- If someone describes something painful, spreading, bleeding, or not healing, say plainly that it is worth seeing a dermatologist rather than trying home care. Do this without naming what it might be.

You are the two things people wish they had on call: a hair stylist who knows their hair, and a level-headed skincare advisor. As a stylist, talk about cuts, lengths, partings, fringes, styling technique and what suits a face shape, and be specific about how to actually do it. As a skincare advisor, talk about order of application, what not to layer together, how fast to introduce something new, and what a realistic timeline looks like — and be straight that you are not a doctor and cannot diagnose.

When they ask why something happens, explain the actual mechanism in plain English — what a pore does when it blocks, why hair frizzes, why marks linger — rather than jumping straight to a fix. When they ask what to buy, name drugstore products sold in India (Minimalist, Cetaphil, The Derma Co, Re'equil, Dot & Key, Sebamed, Neutrogena, Simple, Wow, Mamaearth and similar) with a rough rupee price, and say what each one is for. Be honest when home care cannot do the job — pitted or indented scarring is the clearest example — instead of offering something that will not work.

Keep replies short — two or three sentences unless they ask for detail. Be specific and practical rather than generic. Ask a clarifying question when it would genuinely change your answer.`;

async function handleChat(payload: {
  messages?: { role: string; content: string }[];
  context?: string;
}) {
  const incoming = Array.isArray(payload.messages) ? payload.messages : [];
  // Bound the transcript: this endpoint is public and the history is caller-supplied.
  const messages = incoming
    .slice(-16)
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) }));

  if (!messages.length) return json({ error: "No messages" }, 400);

  const context = String(payload.context ?? "").slice(0, 500);
  const system = context
    ? `${SYSTEM_CHAT}\n\nWhat the app measured from this person's photo (use it when relevant, do not recite it back): ${context}`
    : SYSTEM_CHAT;

  if (GROQ_API_KEY) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 1000,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error("Groq chat error", res.status, detail);
      // Pass the provider's message through: Groq retires model ids, and a dead
      // model should read as such rather than as a generic upstream failure.
      return json({ error: `Groq: ${detail.slice(0, 300)}` }, 502);
    }
    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) return json({ error: "Empty model response" }, 502);
    return json({ reply });
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1200,
      system,
      output_config: { effort: "low" },
      messages,
    }),
  });

  if (!res.ok) {
    console.error("Anthropic chat error", res.status, await res.text());
    return json({ error: "Upstream model error" }, 502);
  }

  const data = await res.json();
  if (data.stop_reason === "refusal") {
    return json({ reply: "I can't help with that one. Ask me something about skin or hair care and I'll do my best." });
  }
  const reply = (data.content ?? []).find((b: { type: string }) => b.type === "text")?.text;
  if (!reply) return json({ error: "Empty model response" }, 502);
  return json({ reply });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (rateLimited(ip)) {
    return json({ error: "Too many requests. Try again in a minute." }, 429);
  }

  let payload: {
    mode?: string;
    topic?: string;
    skinType?: string;
    answers?: Record<string, string>;
    messages?: { role: string; content: string }[];
    context?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  // Which key is required depends on the mode, so this check comes after the
  // body is read: chat can run on Groq alone, plans currently need Anthropic.
  if (payload.mode === "chat") {
    if (!GROQ_API_KEY && !ANTHROPIC_API_KEY) {
      return json({ error: "No model key configured (set GROQ_API_KEY or ANTHROPIC_API_KEY)" }, 503);
    }
    try {
      return await handleChat(payload);
    } catch (err) {
      console.error("chat failed", err);
      return json({ error: "Chat failed" }, 500);
    }
  }

  if (!ANTHROPIC_API_KEY) {
    // The client treats any non-200 as "fall back to the on-device guide",
    // so an unconfigured deployment degrades quietly rather than breaking.
    return json({ error: "ANTHROPIC_API_KEY not configured" }, 503);
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
- causes: 3-4 sentences explaining the actual mechanism behind their concern — why hair frizzes, why it comes out in the shower, why the scalp flakes. Plain English, no jargon, no condition names.
- worse: 4-5 everyday things that make that concern worse.
- myths: 2-3 widely believed hair claims that are wrong, corrected briefly.
- products: 4 things worth buying, each with role (what it is for), name (a brand and product commonly sold in Indian pharmacies and on Nykaa/Amazon India), why (one sentence), price (a rough rupee range like "₹300-500"). Drugstore only, nothing prescription.
- daily: two entries, "Wash day" and "Between washes", 3-4 steps each — habits and technique, not product shopping.
- remedies: 3-4 safe kitchen-shelf options, each with how to use it and how often. Include the patch-test reminder in at least one.
- avoid: 4-5 common habits that actually damage hair, each with a short reason.
- lifestyle: 3-4 habits tied to their specific answers (wash frequency, heat and chemical use, scalp feel).
- styling: 5-6 styling techniques suited specifically to their hair type, each with how to do it, step by step enough to actually follow.
- stylingBasics: 6-8 short rules about heat, brushing and tension that apply whatever the hair type.
- seeDoctor: 3 plain-language signs it's worth seeing a dermatologist about their scalp or hair.`
    : `An on-device photo read estimated this person's skin type as: ${skinType || "unknown"}.

They answered a short questionnaire:
${answerLines || "- (no answers given)"}

Write them a natural care plan:
- summary: two sentences on what to focus on, given their type and answers.
- causes: 3-4 sentences explaining the actual mechanism behind their concern — why a pore blocks and inflames, why skin goes red, why marks linger. Plain English, no jargon, and describe what is happening without naming a medical condition.
- worse: 4-5 everyday things that make that concern worse.
- myths: 2-3 widely believed skincare claims that are wrong, corrected briefly.
- products: 4 things worth buying, each with role (what it is for), name (a brand and product commonly sold in Indian pharmacies and on Nykaa/Amazon India), why (one sentence), price (a rough rupee range like "₹300-500"). Drugstore only, nothing prescription.
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
