# Skinprint

On-device skin read: face detection (MediaPipe) plus pixel-level shine/texture/colour
heuristics, all client-side. No photo upload, no account, no server required.

The whole app is `index.html` — no build step, no dependencies to install.

## What it does

1. Camera or upload → the photo stays in the browser tab.
2. MediaPipe finds the face; per-region shine, texture and redness are measured
   from the pixels and compared against the face's own average.
3. Results: skin type, a shine-by-region chart from the actual measurements,
   routine, and ingredients with brand names common in Indian pharmacies.
4. **Face plan** — pick what's bothering you (spots, large pores or pitted
   marks, redness, dark marks, oil, dryness) and the plan opens with **why it
   happens**: what a pore actually does when it blocks, why skin flushes, why
   a mark outlives the spot that caused it. Then what makes it worse, the myths
   worth dropping, a morning/evening rhythm, **what to buy** — four named
   drugstore products with rough rupee prices — kitchen-shelf remedies, and the
   DIY list to avoid (lemon juice, baking soda, toothpaste and friends cause
   real damage).
5. **Hair plan** — its own questionnaire (hair type, scalp, concern, wash
   frequency, heat use). Same shape: causes, triggers, myths, wash-day and
   between-wash routines, products, remedies, damaging habits — plus **six
   styling techniques matched to your hair type** and eight heat, brushing and
   tension rules that hold whatever your hair does. Reachable without taking a
   photo, since hair guidance needs no image.

Cosmetic guidance only. Neither plan names a medical condition, and neither
claims to treat, cure, or regrow anything. Where home care genuinely cannot fix
something — pitted scarring is the clear case — the plan says so and points at a
dermatologist instead of selling you a cream.

Product suggestions are exactly that: no affiliate links, no tracking, nothing
recorded about what you picked.

## Run it on Vercel (real HTTPS URL, works on any device)

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → pick this repo.
2. Framework preset: **Other**. Leave build command and output directory blank — it's a
   static file, nothing to build.
3. Deploy. Vercel gives you a `https://your-project.vercel.app` URL.
4. Open that URL on your laptop and on your phone's browser (not a QR-code preview —
   the actual `https://` URL). Camera access requires HTTPS, which Vercel provides
   automatically, so "Use camera" will work on both once the page loads there.

Every push to this branch redeploys automatically once the project is linked.

## Run it on StackBlitz (quick preview, shareable link)

1. Go to `stackblitz.com/github/workingshubh132-ai/Face` (prefixing any GitHub repo
   URL with `stackblitz.com/github/` opens it directly).
2. StackBlitz serves `index.html` in the preview pane automatically.
3. Click **Open in New Tab** on the preview — this gives you a real project URL
   (not `localhost`), so it's reachable from your phone too. Camera access needs
   that direct tab, not the embedded preview iframe, since browsers restrict
   camera permissions inside iframes by default.

## Ask-a-question chat (bring your own key)

The chat is the one feature that cannot run on-device — a conversation needs a
real model behind it. It never invents an answer or falls back to canned replies
dressed up as AI; with no key it asks for one and says exactly why.

**Groq's free tier covers this.** Get a key at
[console.groq.com/keys](https://console.groq.com/keys) and paste it into the chat.
It is held in `sessionStorage` for that browser tab only, sent to Groq and
nowhere else, and cleared when the tab closes or you hit **Forget key**.

On a phone, typing 56 characters is miserable, so the page also reads the key
from the URL fragment — open `https://your-app/#key=gsk_...` once and the chat
is unlocked. A fragment never leaves the browser (it is not sent to any server,
and never appears in server logs), and the page wipes it from the address bar
the moment it reads it, so it can't be shoulder-surfed or caught in a
screenshot. Bookmark that link and it keeps working; send that link to someone
and you have handed them your key.

> **Never commit a Groq key.** Unlike the Supabase anon key, it is a real secret.
> This repo is public, and bots scrape public repos for exactly this pattern —
> a committed key gets abused or auto-revoked quickly. That is why each person
> pastes their own instead of it being baked into the page.

If you deploy the Edge Function, it can serve the chat instead, with the key held
server-side — set `GROQ_API_KEY` (free) or `ANTHROPIC_API_KEY` as a Supabase
secret. The client prefers a pasted key when one is present, since that path
needs no deployment.

Groq retires model ids periodically. If the chat reports a model error, pick a
current one from [console.groq.com/docs/models](https://console.groq.com/docs/models)
and change `groqModel` in `index.html` (or the `GROQ_MODEL` secret).

Everything else — the photo read, both plans, the causes, the product lists and
the styling — runs entirely in the browser and needs no key at all.

## The plans work two ways

**By default it runs entirely on your device.** The questionnaire answers feed a
rule-based plan builder in `index.html`. No network call, no cost, works offline,
works forever. This is what you get with nothing else set up.

**Optionally, Claude can write the plan instead.** `supabase/functions/skin-guide/`
is a ready-to-deploy Supabase Edge Function that calls the Anthropic API with the
key held server-side. It serves both the plans and the chat (`mode: "chat"`,
which forwards a bounded conversation history plus what the photo measured). It
handles both plan topics — the client sends `topic: "skin"`
or `topic: "hair"` and the function switches system prompt and output schema
accordingly. The app tries it first and silently falls back to the on-device plan
if it isn't deployed, times out, errors, or returns something thinner than the
local plan — a response missing the causes, the products, or (for hair) the
styling section counts as malformed, so the AI path can only ever be an upgrade,
never a downgrade.

To turn it on (needs an Anthropic API key with credit):

```sh
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy skin-guide --no-verify-jwt
```

Cost: the function defaults to `claude-opus-5`. For a task this small,
`claude-haiku-4-5` is roughly a fifth the price per call and plenty capable —
switch with `supabase secrets set ANTHROPIC_MODEL=claude-haiku-4-5`, no code
change. Either way it only runs when someone taps "Build my face plan",
not on every skin read.

Rate limiting is built in (5 requests per minute per IP). It's in-memory, so it
resets on cold start and is per-instance rather than global — fine for blunting
casual abuse, but move the counter to a Postgres table or Upstash if you need a
hard ceiling.

## About the Supabase key in the source

`index.html` contains the Supabase **anon** key. That key is designed to be
public — it ships in the client of every Supabase app and is gated by row-level
security. The **service_role** key is the one that must never appear in
client-side code; it isn't here, and shouldn't be added.

Since this app writes nothing to the database, there are no tables to secure. If
you later add any, enable RLS on them before shipping.

## Privacy

- The photo never leaves the browser tab. It is not uploaded, not stored, and
  not sent to the Edge Function — the function receives only the derived skin
  type and your questionnaire answers, as plain text.
- Nothing about your photo or your answers is written to `localStorage`,
  `sessionStorage`, cookies, IndexedDB, or any database. The single exception is
  a Groq key you paste yourself, kept in `sessionStorage` so a refresh doesn't
  lose it, and cleared when the tab closes or you hit "Forget key".
- The only outbound requests are the one-time MediaPipe model download from a CDN
  and, if you deploy it, the plan-writing call described above.

## Phone + laptop notes

- The layout is responsive — no separate mobile build.
- "Use camera" needs HTTPS and a permission prompt; "Upload a photo" always works,
  including opening the file directly with no server.
- If the camera doesn't start on phone, check that camera permission for the site
  wasn't previously denied (browser site settings), and that you're on the deployed
  `https://` URL rather than a `file://` path.
