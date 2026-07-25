# WapiLeo

**Leo twende wapi?** — Places, plans, and vibes for today in Tanzania.

WapiLeo is a mobile-first web app for discovering where the night is breathing in
Dar es Salaam. Browse venues by vibe, build a quick date/night plan, and report
the live "vibe" of a spot. Reports are **crowd-powered and shared across all
users** through Supabase.

---

## Architecture

| Layer | Tech |
| --- | --- |
| Front-end | Vite + vanilla JS (no framework), installable PWA with offline support |
| Database | PostgreSQL via Supabase (places, vibe_reports, place_confirms, venue_claims, feedback) |
| Hosting | Vite build → static `dist/` |

The front-end reads places + recent reports + confirms from Supabase and
aggregates the live vibe score client-side. If the network is unavailable it
shows a clear, friendly offline state instead of an error.

```
.
├── index.html            # App shell (SEO + social meta, PWA links)
├── vite.config.js
├── src/
│   ├── main.js           # App logic: live feed, filters, reporting, confirms, feedback, claims
│   ├── scoring.js        # Pure vibe-scoring + validation + time-ago logic (unit tested)
│   └── supabase.js       # Supabase client singleton
├── public/               # Static assets served by Vite
│   ├── styles.css sw.js manifest.webmanifest favicon.svg icon-*.png og-image.png robots.txt
├── test/                 # node:test suites (scoring + HTML structure)
└── supabase/functions/   # Edge functions (if needed later)
```

---

## Local development

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # run the test suite (node:test)
npm run build    # production build to dist/
```

Supabase env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are
pre-populated in `.env`.

## Database

The schema lives in Supabase and was applied via the Supabase migration tool.
Tables (all single-tenant, no auth, public/shared):

- `places` — curated venues (12 seeded Dar es Salaam spots)
- `vibe_reports` — crowd vibe reports (score, label, music, entry)
- `place_confirms` — "Still hot" upvotes to verify reports
- `venue_claims` — B2B intake for venue owners to list events
- `feedback` — in-app feedback / bug reports

RLS is enabled on every table with `anon, authenticated` policies for the
public/shared data model.

## How the live score works

Each venue has a curated `base_score`. Recent reports (last **6 hours**) are
blended in with **time decay** (a report loses half its weight every 3 hours)
plus a small prior on the base score, so a single report nudges the score
without wildly swinging it. See `src/scoring.js` (fully unit-tested).

Reports older than **4 hours** are marked stale and dimmed in the UI, with a
visible "Updated Xh ago" time badge on each live card.

## Features

- **Live feed**: 12 curated venues with crowd-powered vibe scores, time badges,
  and "Still hot" confirmation voting.
- **Frictionless reporting**: 4-tap categories — Crowd level (Dead / Chill /
  Packed / Overcrowded), Music (Afrobeats / Amapiano / Calm / Live Band), Entry
  (Free / Cover Charge).
- **Filters**: vibe category rail (Tonight, Date, Food, Chill, Music, Games,
  Beach) + area chips (Masaki, Msasani, Upanga, Sinza, Mikocheni, Kariakoo,
  Kivukoni, Kawe).
- **Map deep links**: one-tap "Go" opens Apple Maps on iOS or Google Maps
  directions elsewhere.
- **Save / bookmark**: localStorage bookmarks for building a list before
  heading out.
- **Plan builder**: budget + mood → curated route, with shuffle / share / save.
- **Feedback widget**: in-app feedback / bug report form (stored in Supabase).
- **Venue claiming**: "Are you a venue owner? List your event" link captures
  B2B leads into Supabase.
- **PWA**: installable, offline app shell via service worker.
- **Resilience**: friendly offline state; live feed retries once before
  falling back.

## Testing

```bash
npm test
```
Covers vibe-scoring math, report validation, time-ago formatting, stale
detection, and the front-end HTML structure.
