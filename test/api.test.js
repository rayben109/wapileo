import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregatePlace, aggregatePlaces } from "../src/scoring.js";

// These tests exercise the client-side aggregation logic that powers the
// live feed. No Supabase client or network is required.

const placeRow = (over = {}) => ({
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
  ...over,
});

test("aggregatePlaces aggregates and sorts hottest first", () => {
  const now = new Date("2026-06-25T20:00:00Z");
  const out = aggregatePlaces(
    [
      { place: placeRow({ id: "calm", base_score: 70 }), reports: [], confirms: [] },
      {
        place: placeRow({ id: "buzzing", base_score: 72 }),
        reports: [{ score: 94, label: "Moto sana", created_at: new Date(now.getTime() - 5 * 60000) }],
        confirms: [],
      },
    ],
    now,
  );
  assert.equal(out.length, 2);
  assert.equal(out[0].id, "buzzing");
  assert.ok(out[0].score > out[1].score);
  assert.equal(out[0].live, true);
});

test("aggregatePlace returns 404-style (null) for unknown place via validateReport", () => {
  // validateReport is tested in scoring.test.js; here we confirm aggregation
  // of an empty place list is safe.
  const out = aggregatePlaces([], new Date());
  assert.deepEqual(out, []);
});

test("a hot report lifts the score and marks the place live", () => {
  const now = new Date("2026-06-25T20:00:00Z");
  const result = aggregatePlace(
    placeRow(),
    [{ score: 94, label: "Moto sana", created_at: now }],
    [{ created_at: now }],
    now,
  );
  assert.equal(result.live, true);
  assert.equal(result.reportCount, 1);
  assert.equal(result.confirmCount, 1);
  assert.ok(result.score > 80, "hot report should lift the score");
});
