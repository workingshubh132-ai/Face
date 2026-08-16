# Skinprint Free

On-device skin read: face detection (MediaPipe) plus pixel-level shine/texture/color
heuristics, all client-side. No API, no server, no photo upload, no account.

Everything lives in `index.html` — no build step, no dependencies to install.

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
   (not `localhost`), so it's reachable from your phone too, not just the machine
   you're editing on. Camera access needs that direct tab, not the embedded preview
   iframe, since browsers restrict camera permissions inside iframes by default.

## Phone + laptop notes

- The layout is already responsive (centered card, max-width ~460px) — no separate
  mobile build needed.
- On both device types, "Use camera" needs HTTPS and a user permission prompt;
  "Upload a photo" always works, including opening the file directly with no server.
- If the camera doesn't start on phone, check that camera permission for the site
  wasn't previously denied (browser site settings), and that you're on the deployed
  `https://` URL rather than a `file://` path.
