import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aggregatePlace,
  labelForScore,
  validateReport,
  timeAgo,
  isStale,
  WINDOW_HOURS,
  ALLOWED_VIBES,
} from "../src/scoring.js";

const basePlace = {
  id: "coral",
  name: "Coral Beach",
  area: "Masaki",
  price: "40k - 100k",
  line: "Ocean air.",
  image: "img",
  base_score: 80,
  base_state: "Kuna vibe",
  categories: ["all", "date"],
  tags: ["Beach breeze"],
};

const minutesAgo = (now, m) => new Date(now.getTime() - m * 60 * 1000);

test("labelForScore maps ranges to Swahili labels", () => {
  assert.equal(labelForScore(95), "Moto sana");
  assert.equal(labelForScore(70), "Kuna vibe");
  assert.equal(labelForScore(45), "Inajaa");
  assert.equal(labelForScore(10), "Dead");
});

test("ALLOWED_VIBES is the fixed submission set", () => {
  assert.deepEqual(
    ALLOWED_VIBES.map((v) => v.label),
    ["Dead", "Inajaa", "Kuna vibe", "Moto sana"],
  );
});

test("no recent reports falls back to curated base", () => {
  const result = aggregatePlace(basePlace, [], [], new Date());
  assert.equal(result.score, 80);
  assert.equal(result.state, "Kuna vibe");
  assert.equal(result.live, false);
  assert.equal(result.reportCount, 0);
  assert.equal(result.confirmCount, 0);
  assert.equal(result.lastReportAt, null);
});

test("a fresh hot report pulls the score up but is tempered by the prior", () => {
  const now = new Date("2026-06-25T20:00:00Z");
  const result = aggregatePlace(
    basePlace,
    [{ score: 94, label: "Moto sana", created_at: minutesAgo(now, 5) }],
    [],
    now,
  );
  assert.ok(result.score > 80, "score should rise above base");
  assert.ok(result.score < 94, "single report should not fully override the prior");
  assert.equal(result.live, true);
  assert.equal(result.reportCount, 1);
  assert.equal(result.state, labelForScore(result.score));
});

test("reports older than the window are ignored", () => {
  const now = new Date("2026-06-25T20:00:00Z");
  const result = aggregatePlace(
    basePlace,
    [{ score: 20, label: "Dead", created_at: minutesAgo(now, (WINDOW_HOURS + 1) * 60) }],
    [],
    now,
  );
  assert.equal(result.score, 80);
  assert.equal(result.live, false);
  assert.equal(result.reportCount, 0);
});

test("recency weighting favours newer reports", () => {
  const now = new Date("2026-06-25T20:00:00Z");
  const freshHot = aggregatePlace(
    basePlace,
    [
      { score: 94, label: "Moto sana", created_at: minutesAgo(now, 2) },
      { score: 20, label: "Dead", created_at: minutesAgo(now, 290) },
    ],
    [],
    now,
  );
  const freshCold = aggregatePlace(
    basePlace,
    [
      { score: 20, label: "Dead", created_at: minutesAgo(now, 2) },
      { score: 94, label: "Moto sana", created_at: minutesAgo(now, 290) },
    ],
    [],
    now,
  );
  assert.ok(
    freshHot.score > freshCold.score,
    `expected fresh-hot (${freshHot.score}) > fresh-cold (${freshCold.score})`,
  );
});

test("confirms are counted within the window", () => {
  const now = new Date("2026-06-25T20:00:00Z");
  const result = aggregatePlace(
    basePlace,
    [{ score: 72, label: "Kuna vibe", created_at: minutesAgo(now, 10) }],
    [
      { created_at: minutesAgo(now, 5) },
      { created_at: minutesAgo(now, 20) },
      { created_at: minutesAgo(now, (WINDOW_HOURS + 1) * 60) },
    ],
    now,
  );
  assert.equal(result.confirmCount, 2);
});

test("scores are clamped to 0..100", () => {
  const now = new Date();
  const hot = aggregatePlace({ ...basePlace, base_score: 100 }, [
    { score: 94, label: "Moto sana", created_at: now },
  ], [], now);
  assert.ok(hot.score <= 100);
  const cold = aggregatePlace({ ...basePlace, base_score: 0 }, [
    { score: 20, label: "Dead", created_at: now },
  ], [], now);
  assert.ok(cold.score >= 0);
});

test("validateReport accepts allowed vibes and trims placeId", () => {
  const ok = validateReport({ placeId: "  coral ", score: 72, label: "Kuna vibe" });
  assert.equal(ok.ok, true);
  assert.equal(ok.value.placeId, "coral");
  assert.equal(ok.value.score, 72);
});

test("validateReport rejects bad input", () => {
  assert.equal(validateReport(null).ok, false);
  assert.equal(validateReport({ score: 72, label: "Kuna vibe" }).ok, false);
  assert.equal(validateReport({ placeId: "x", score: 50, label: "Kuna vibe" }).ok, false);
  assert.equal(validateReport({ placeId: "x", score: 72, label: "Wrong" }).ok, false);
});

test("timeAgo formats recent timestamps", () => {
  const now = new Date("2026-06-25T20:00:00Z");
  assert.equal(timeAgo(undefined, now), "");
  assert.equal(timeAgo(now.toISOString(), now), "just now");
  assert.equal(timeAgo(minutesAgo(now, 12).toISOString(), now), "12 mins ago");
  assert.equal(timeAgo(minutesAgo(now, 90).toISOString(), now), "Updated 2h ago");
});

test("isStale flags reports older than 4 hours", () => {
  const now = new Date("2026-06-25T20:00:00Z");
  assert.equal(isStale(undefined, now), false);
  assert.equal(isStale(minutesAgo(now, 30).toISOString(), now), false);
  assert.equal(isStale(minutesAgo(now, 300).toISOString(), now), true);
});
