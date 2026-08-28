# COMEBACK // 90

> 90 days. One system. Become your sharpest version.

A serious transformation dashboard for a 90-day protocol covering hair, skin,
grooming, glasses/style, physique, posture, sleep, presence and discipline.
Not a habit tracker with confetti — a system for identifying the
highest-impact changes, executing them daily, and seeing honestly whether
you actually did.

Static site, zero dependencies, zero build step — same philosophy as the
`Skinprint` app one directory up. Everything runs in the browser.

## Architecture

- **No backend, no accounts.** Everything lives on this device: structured
  data (habits, days, scores, closet, settings) in `localStorage`, photo
  blobs in `IndexedDB`. Nothing is ever uploaded, because a 90-day personal
  log — and progress photos especially — are nobody's business but the
  person running the protocol.
- **Plain ES modules, no framework, no bundler.** `js/app.js` is a ~130-line
  hash router and shell; each of the 8 tabs is its own view module under
  `js/views/`, rendered as an HTML string and re-mounted on every state
  change (the same pattern `index.html` at the repo root already uses,
  just split across files because this app has more surface area).
- **The scoring, phase, streak and adaptation logic is pure.** `dates.js`,
  `scoring.js`, `habits.js`, `workouts.js` and `styleScore.js` have no DOM
  dependency at all — they're plain functions of `(state, dayIndex)` that
  can be (and are) unit-tested directly in Node.

```
comeback60/
  index.html         shell: nav mount points, Google Fonts, styles.css
  styles.css          design system — dark by default, light theme included
  js/
    app.js             router + shell (sidebar desktop / bottom nav mobile)
    router.js           navigate() — kept separate so views never import app.js
    store.js            state shape, localStorage persistence, migrations
    photos.js            IndexedDB wrapper for progress + closet photo blobs
    dates.js             day-index math, the 5 phases, milestones, photo schedule
    habits.js             the 26-item daily checklist + presence challenges
    scoring.js             weighted score, streaks, trends, weekly reviews, final report
    workouts.js            6 level×equipment workout templates + posture routine
    styleScore.js          explainable 5-criterion outfit scoring
    skinCare.js             acne causes/triggers/food/products/ramp-up/timeline
    icons.js, ui.js         inline SVG icons, small render helpers
    views/*.js              one module per nav tab
```

## The Skin tab

Beyond the daily cleanser/moisturiser/sunscreen consistency tracking, the
Skin tab (Appearance → Skin) covers acne specifically: why a pore blocks and
what actually happens next, the everyday triggers that make it worse, the
myths worth dropping, what's actually worth eating less of (a real but
modest link, never framed as a fix), four named drugstore products with
rough prices, a four-week ramp-up so you introduce one thing at a time, and
a realistic timeline — including that the first two weeks often look no
different or slightly worse, which is where most people quit. There's also
a one-tap daily skin rating (Flared up → Clear) that builds its own trend
line over time, separate from the fixed checklist so it never inflates the
26-item count. And the same honesty as everywhere else in this app: if it's
cystic, spreading, or nothing here has helped after 8-10 honest weeks, the
tab says plainly that's a dermatologist's job, not this app's.

## The 8 category weights

Appearance 25 · Fitness 20 · Grooming 15 · Sleep 15 · Posture 10 · Style 5 ·
Presence 5 · Consistency 5 — configurable in Settings, must sum to 100. This
is the **Comeback Execution Score**: how consistently the system was
followed, never a claim about how someone looks.

## What it deliberately does not do

- No facial attractiveness scoring, ever. Progress photos are for comparing
  your own Day 1 against your own Day 90 — nothing scores or ranks them.
- No prescriptions, no diagnoses. The Skin tab says plainly to see a
  dermatologist for anything persistent; the Fitness tab never suggests
  crash dieting, starvation, or extreme training; posture work is framed as
  posture and presence, not bone structure.
- No shame-based streak resets. Missing a day breaks the *streak* count but
  never erases history — the honest framing throughout is "reset today,
  don't throw away the week."
- No photo ever leaves the device. Not on save, not on export, not for any
  training pipeline — there is no upload code path in this app at all.

## Deploying to Vercel

This is a subfolder inside the `Face` repo, so you have two options:

**Option A — its own Vercel project (recommended):**
1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → this repo.
2. Framework preset: **Other**. Set **Root Directory** to `comeback60`.
3. Leave build command and output directory blank — nothing to build.
4. Deploy. You get a dedicated URL for just this app.

**Option B — alongside Skinprint in one deployment:**
Deploy the repo root as usual (see the top-level `README.md`) and this app
is reachable at `https://your-deployment.vercel.app/comeback60/`.

Either way, every push to this branch redeploys automatically once linked.

## Local testing

No install needed — any static file server works:

```sh
npx http-server . -p 8080
# open http://localhost:8080/comeback60/
```

## Tests

Pure logic (dates/scoring/habits/workouts/styleScore) has a Node test suite
exercising the score math, streak logic, weight renormalization, weekly
review generation, and the outfit-scoring rubric — including the edge cases
that actually broke during development (custom-habit due dates anchored to
wall-clock time instead of protocol day-index; a flat-array day-completion
test helper that silently under-weighted whichever category's tasks sat at
the end of the list). The full user flow — onboarding through all 8 tabs,
checklist toggling, closet + outfit builder, custom habits, settings, photo
capture, and persistence across a reload — is covered end-to-end with
Playwright on both a desktop and a mobile viewport.
