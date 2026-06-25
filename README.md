# WapiLeo

**Leo twende wapi?** — Places, plans, and vibes for today in Tanzania.

WapiLeo is a mobile-first web app for discovering where the night is breathing in
Dar es Salaam. Browse venues by vibe, build a quick date/night plan, and report
the live "vibe" of a spot. Reports are **crowd-powered and shared across all
users** through a small API backed by Postgres.

---

## Architecture

| Layer | Tech |
| --- | --- |
| Front-end | Static HTML / CSS / vanilla JS (no build step), installable PWA with offline support |
| API | Vercel Serverless Functions (`/api/*`, Node 18+ ESM) |
| Database | PostgreSQL via Prisma ORM |
| Hosting | Vercel |

The front-end fetches venues from `GET /api/places` and submits reports to
`POST /api/reports`. If the API is unreachable it falls back to a bundled
snapshot so the app always renders.

```
.
├── public/                # Static web root (served by Vercel)
│   ├── index.html        # App shell (SEO + social meta, PWA links)
│   ├── styles.css app.js sw.js
│   └── manifest.webmanifest favicon.svg icon-*.png og-image.png robots.txt
├── api/
│   ├── places.js         # GET  /api/places   -> venues + live vibe score
│   ├── reports.js        # POST /api/reports  -> record a vibe report
│   └── health.js         # GET  /api/health   -> DB readiness probe
├── lib/
│   ├── prisma.js         # Lazy Prisma client singleton (serverless-safe)
│   ├── scoring.js        # Pure vibe-scoring + validation logic (unit tested)
│   └── seed-data.js      # Canonical venue seed data
├── prisma/
│   ├── schema.prisma     # Place + VibeReport models
│   └── seed.js           # Idempotent seeding
├── test/                 # node:test suites (logic + jsdom front-end)
├── vercel.json           # Security headers, caching, function config
└── .env.example
```

---

## Prerequisites

- Node.js 18.18+
- A PostgreSQL database (see options below)
- [Vercel CLI](https://vercel.com/docs/cli) (`npm i -g vercel`) for local dev/deploy

## Database options

Any Postgres works. Recommended on Vercel:

- **Prisma Postgres** (Vercel Marketplace) — built-in connection pooling, ideal for serverless.
- **Neon** — serverless Postgres with a pooled connection string.
- **Supabase** — provides both a pooled and a direct URL.

You need two connection strings:

- `DATABASE_URL` — the **pooled** URL used by the app at runtime.
- `DIRECT_URL` — a **direct** (non-pooled) URL used by `prisma migrate`.
  If you are not using a pooler, set it equal to `DATABASE_URL`.

## Local development

```bash
# 1. Install dependencies (runs `prisma generate` automatically)
npm install

# 2. Configure env
cp .env.example .env        # then edit DATABASE_URL / DIRECT_URL

# 3. Create the schema in your database + seed it
npm run db:migrate -- --name init   # creates prisma/migrations and applies it
npm run db:seed

# 4. Run locally (serves static files + /api functions)
npm run dev                 # vercel dev  ->  http://localhost:3000
```

Useful scripts:

```bash
npm test            # run the test suite (node:test)
npm run db:studio   # open Prisma Studio
npm run db:push     # push schema without migration files (quick prototyping)
npm run db:deploy   # apply committed migrations (production)
```

## Deploy to Vercel

1. Push this repo to GitHub/GitLab and **Import** it in Vercel
   (Framework preset: **Other** — `vercel.json` already configures everything).
2. In **Project → Settings → Environment Variables**, add `DATABASE_URL` and
   `DIRECT_URL` for the Production (and Preview) environments.
3. Deploy. The build runs `prisma generate` automatically (`vercel-build`).
4. Initialize the database **once** against production:
   ```bash
   # from your machine, with prod env vars loaded:
   DATABASE_URL=... DIRECT_URL=... npx prisma migrate deploy
   DATABASE_URL=... npm run db:seed
   ```
   Until the DB is seeded, the site still loads using the bundled fallback venues.
5. Update the absolute URLs (`https://wapileo.app/...`) in `index.html`
   (canonical + Open Graph/Twitter) and `public/robots.txt` to your real domain.

## API reference

### `GET /api/places`
Returns all venues with a crowd-aggregated live vibe score.
```json
{
  "places": [
    { "id": "warehouse", "name": "Warehouse", "area": "Masaki",
      "score": 95, "state": "Imeamka", "reportCount": 3, "live": true,
      "categories": ["all","music"], "tags": ["Amapiano"], "price": "100k+",
      "line": "...", "image": "https://...", "lastReportAt": "..." }
  ],
  "windowHours": 6,
  "generatedAt": "2026-06-25T20:00:00.000Z"
}
```

### `POST /api/reports`
Records a vibe report and returns the venue's updated score.
```json
// request body
{ "placeId": "warehouse", "score": 94, "label": "Moto sana" }
```
`score`/`label` must match one of the allowed vibes
(`20 Dead`, `48 Inajaa`, `72 Kuna vibe`, `94 Moto sana`).
Returns `201` with `{ "place": { ... } }`, or `400`/`404` on invalid input.

### `GET /api/health`
Returns `{ "status": "ok" }` (200) if the database is reachable, else `503`.

## How the live score works

Each venue has a curated `baseScore`. Recent reports (last **6 hours**) are
blended in with **time decay** (a report loses half its weight every 3 hours)
plus a small prior on the base score, so a single report nudges the score
without wildly swinging it. See `lib/scoring.js` (fully unit-tested).

## Production hardening included

- **Security headers** via `vercel.json`: CSP, HSTS, `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
- **XSS-safe rendering**: all dynamic/DB content is HTML-escaped before insertion.
- **Input validation** on all writes; method guards and JSON error responses.
- **PWA**: installable, offline app shell via service worker.
- **SEO/social**: title, description, canonical, Open Graph + Twitter cards, favicon/icons.
- **Performance**: lazy-loaded venue images with width/height, CDN caching headers, preconnect.
- **Accessibility**: visible focus styles, `aria-pressed`/dialog roles, reduced-motion support.
- **Resilience**: serverless-safe Prisma singleton; front-end offline fallback.

### Recommended next steps
- Add **rate limiting** to `POST /api/reports` (e.g. Vercel KV / Upstash) to prevent abuse.
- Add a venue-admin flow (currently venues are managed via `prisma/seed.js`).
- Generate a `sitemap.xml` (referenced by `robots.txt`).

## Updating venues

Edit `lib/seed-data.js` and re-run `npm run db:seed` (upserts by id).

## Testing

```bash
npm test
```
Covers vibe-scoring math, report validation, the API handler logic (with an
in-memory DB), and the front-end render/escape/offline-fallback paths (jsdom).
