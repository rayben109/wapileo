// Pure, dependency-free vibe-scoring logic.
//
// Kept free of Prisma/HTTP so it can be unit-tested in isolation and reused by
// both the API handlers and the seed/aggregation paths.

// How far back a "live" report counts toward the current vibe.
export const WINDOW_HOURS = 6;

// Recent reports decay: a report loses half its weight every HALF_LIFE_HOURS.
const HALF_LIFE_HOURS = 3;

// The curated base score acts as a prior worth this many pseudo-reports, so a
// single fresh report nudges the score instead of overwhelming it.
const PRIOR_WEIGHT = 1.5;

// The only vibe options users may submit. Validated server-side.
export const ALLOWED_VIBES = [
  { score: 20, label: "Dead" },
  { score: 48, label: "Inajaa" },
  { score: 72, label: "Kuna vibe" },
  { score: 94, label: "Moto sana" },
];

// Map a numeric score to a Swahili vibe label for live display.
export function labelForScore(score) {
  if (score >= 85) return "Moto sana";
  if (score >= 65) return "Kuna vibe";
  if (score >= 40) return "Inajaa";
  return "Dead";
}

function toTime(value) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

// Combine a place's curated base score with recent crowd reports into a single
// live score. Pure function: same inputs always produce the same output.
export function aggregatePlace(place, reports = [], now = new Date()) {
  const nowMs = toTime(now);
  const windowMs = WINDOW_HOURS * 3600 * 1000;

  const recent = (reports || []).filter((report) => {
    const t = toTime(report.createdAt);
    return Number.isFinite(t) && t <= nowMs && nowMs - t <= windowMs;
  });

  let weightedSum = place.baseScore * PRIOR_WEIGHT;
  let weightTotal = PRIOR_WEIGHT;
  let latest = 0;

  for (const report of recent) {
    const ageHours = (nowMs - toTime(report.createdAt)) / (3600 * 1000);
    const weight = Math.pow(0.5, ageHours / HALF_LIFE_HOURS);
    weightedSum += report.score * weight;
    weightTotal += weight;
    latest = Math.max(latest, toTime(report.createdAt));
  }

  const score = Math.max(0, Math.min(100, Math.round(weightedSum / weightTotal)));
  const live = recent.length > 0;

  return {
    id: place.id,
    name: place.name,
    area: place.area,
    price: place.price,
    line: place.line,
    image: place.image,
    categories: place.categories,
    tags: place.tags,
    score,
    state: live ? labelForScore(score) : place.baseState,
    reportCount: recent.length,
    live,
    lastReportAt: live ? new Date(latest).toISOString() : null,
  };
}

// Aggregate many places (each carrying a `reports` array) and sort hottest-first.
export function aggregatePlaces(placesWithReports, now = new Date()) {
  return (placesWithReports || [])
    .map((place) => aggregatePlace(place, place.reports || [], now))
    .sort((a, b) => b.score - a.score);
}

// Validate an incoming vibe report. Returns { ok, value } or { ok:false, errors }.
export function validateReport(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, errors: ["Request body must be a JSON object"] };
  }

  const errors = [];
  const placeId = typeof body.placeId === "string" ? body.placeId.trim() : "";
  if (!placeId) errors.push("placeId is required");

  const match = ALLOWED_VIBES.find(
    (vibe) => vibe.score === body.score && vibe.label === body.label,
  );
  if (!match) {
    errors.push("score and label must match one of the allowed vibe options");
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { placeId, score: match.score, label: match.label } };
}
