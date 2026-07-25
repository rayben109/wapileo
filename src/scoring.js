// Pure, dependency-free vibe-scoring logic (client-side mirror of the
// original server-side scoring). Kept free of Supabase/HTTP so it can be
// unit-tested in isolation.

export const WINDOW_HOURS = 6;
const HALF_LIFE_HOURS = 3;
const PRIOR_WEIGHT = 1.5;

export const ALLOWED_VIBES = [
  { score: 20, label: "Dead" },
  { score: 48, label: "Inajaa" },
  { score: 72, label: "Kuna vibe" },
  { score: 94, label: "Moto sana" },
];

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
export function aggregatePlace(place, reports = [], confirms = [], now = new Date()) {
  const nowMs = toTime(now);
  const windowMs = WINDOW_HOURS * 3600 * 1000;

  const recent = (reports || []).filter((report) => {
    const t = toTime(report.created_at ?? report.createdAt);
    return Number.isFinite(t) && t <= nowMs && nowMs - t <= windowMs;
  });

  let weightedSum = place.base_score * PRIOR_WEIGHT;
  let weightTotal = PRIOR_WEIGHT;
  let latest = 0;

  for (const report of recent) {
    const ageHours = (nowMs - toTime(report.created_at ?? report.createdAt)) / (3600 * 1000);
    const weight = Math.pow(0.5, ageHours / HALF_LIFE_HOURS);
    weightedSum += report.score * weight;
    weightTotal += weight;
    latest = Math.max(latest, toTime(report.created_at ?? report.createdAt));
  }

  const recentConfirms = (confirms || []).filter((confirm) => {
    const t = toTime(confirm.created_at ?? confirm.createdAt);
    return Number.isFinite(t) && t <= nowMs && nowMs - t <= windowMs;
  });

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
    state: live ? labelForScore(score) : place.base_state,
    reportCount: recent.length,
    confirmCount: recentConfirms.length,
    live,
    lastReportAt: live ? new Date(latest).toISOString() : null,
  };
}

export function aggregatePlaces(placesWithReports, now = new Date()) {
  return (placesWithReports || [])
    .map((p) => aggregatePlace(p.place ?? p, p.reports ?? [], p.confirms ?? [], now))
    .sort((a, b) => b.score - a.score);
}

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

// Human-readable "x mins ago" / "Updated xh ago" for time badges.
export function timeAgo(iso, now = new Date()) {
  if (!iso) return "";
  const t = toTime(iso);
  if (!Number.isFinite(t)) return "";
  const diffMs = now.getTime() - t;
  if (diffMs < 0) return "just now";
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  const days = Math.round(hours / 24);
  return `Updated ${days}d ago`;
}

// Reports older than this are "stale" and should be dimmed.
export const STALE_HOURS = 4;

export function isStale(iso, now = new Date()) {
  if (!iso) return false;
  const t = toTime(iso);
  if (!Number.isFinite(t)) return false;
  return now.getTime() - t > STALE_HOURS * 3600 * 1000;
}
