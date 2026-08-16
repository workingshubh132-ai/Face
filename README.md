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
4. **Natural care plan** — a short questionnaire produces habit-level guidance,
   safe kitchen-shelf remedies, and an explicit list of popular DIY remedies to
   avoid (lemon juice, baking soda, toothpaste and friends cause real damage).

Cosmetic guidance only. It never names a medical condition and never claims to
treat or cure anything.

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

## The natural care plan works two ways

**By default it runs entirely on your device.** The questionnaire answers feed a
rule-based plan builder in `index.html`. No network call, no cost, works offline,
works forever. This is what you get with nothing else set up.

**Optionally, Claude can write the plan instead.** `supabase/functions/skin-guide/`
is a ready-to-deploy Supabase Edge Function that calls the Anthropic API with the
key held server-side. The app tries it first and silently falls back to the
on-device plan if it isn't deployed, times out, errors, or returns something
malformed — so deploying it is a pure upgrade with no risk of breaking the app.

To turn it on (needs an Anthropic API key with credit):

```sh
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy skin-guide --no-verify-jwt
```

Cost: the function defaults to `claude-opus-5`. For a task this small,
`claude-haiku-4-5` is roughly a fifth the price per call and plenty capable —
switch with `supabase secrets set ANTHROPIC_MODEL=claude-haiku-4-5`, no code
change. Either way it only runs when someone taps "Build my natural care plan",
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
- Nothing is written to `localStorage`, `sessionStorage`, cookies, IndexedDB, or
  any database.
- The only outbound requests are the one-time MediaPipe model download from a CDN
  and, if you deploy it, the natural-care-plan call described above.

## Phone + laptop notes

- The layout is responsive — no separate mobile build.
- "Use camera" needs HTTPS and a permission prompt; "Upload a photo" always works,
  including opening the file directly with no server.
- If the camera doesn't start on phone, check that camera permission for the site
  wasn't previously denied (browser site settings), and that you're on the deployed
  `https://` URL rather than a `file://` path.
