import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aggregatePlace,
  aggregatePlaces,
  labelForScore,
  validateReport,
  WINDOW_HOURS,
  ALLOWED_VIBES,
} from "../lib/scoring.js";

const basePlace = {
  id: "coral",
  name: "Coral Beach",
  area: "Masaki",
  price: "40k - 100k",
  line: "Ocean air.",
  image: "img",
  baseScore: 80,
  baseState: "Kuna vibe",
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
  const result = aggregatePlace(basePlace, [], new Date());
  assert.equal(result.score, 80);
  assert.equal(result.state, "Kuna vibe");
  assert.equal(result.live, false);
  assert.equal(result.reportCount, 0);
  assert.equal(result.lastReportAt, null);
});

test("a fresh hot report pulls the score up but is tempered by the prior", () => {
  const now = new Date("2026-06-25T20:00:00Z");
  const result = aggregatePlace(
    basePlace,
    [{ score: 94, label: "Moto sana", createdAt: minutesAgo(now, 5) }],
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
    [{ score: 20, label: "Dead", createdAt: minutesAgo(now, (WINDOW_HOURS + 1) * 60) }],
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
      { score: 94, label: "Moto sana", createdAt: minutesAgo(now, 2) },
      { score: 20, label: "Dead", createdAt: minutesAgo(now, 290) },
    ],
    now,
  );
  const freshCold = aggregatePlace(
    basePlace,
    [
      { score: 20, label: "Dead", createdAt: minutesAgo(now, 2) },
      { score: 94, label: "Moto sana", createdAt: minutesAgo(now, 290) },
    ],
    now,
  );
  assert.ok(
    freshHot.score > freshCold.score,
    `expected fresh-hot (${freshHot.score}) > fresh-cold (${freshCold.score})`,
  );
});

test("scores are clamped to 0..100", () => {
  const now = new Date();
  const hot = aggregatePlace({ ...basePlace, baseScore: 100 }, [
    { score: 94, label: "Moto sana", createdAt: now },
  ], now);
  assert.ok(hot.score <= 100);
  const cold = aggregatePlace({ ...basePlace, baseScore: 0 }, [
    { score: 20, label: "Dead", createdAt: now },
  ], now);
  assert.ok(cold.score >= 0);
});

test("aggregatePlaces sorts hottest first", () => {
  const now = new Date();
  const out = aggregatePlaces(
    [
      { ...basePlace, id: "low", baseScore: 60, reports: [] },
      { ...basePlace, id: "high", baseScore: 95, reports: [] },
      { ...basePlace, id: "mid", baseScore: 78, reports: [] },
    ],
    now,
  );
  assert.deepEqual(out.map((p) => p.id), ["high", "mid", "low"]);
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
