import { test } from "node:test";
import assert from "node:assert/strict";
import { loadPlaces } from "../api/places.js";
import { createReport } from "../api/reports.js";

// These tests exercise the handler logic against an in-memory fake `db`,
// so no generated Prisma client or live database is required.

const placeRow = (over = {}) => ({
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
  reports: [],
  ...over,
});

test("loadPlaces aggregates and sorts via the db layer", async () => {
  const now = new Date("2026-06-25T20:00:00Z");
  const db = {
    place: {
      findMany: async () => [
        placeRow({ id: "calm", baseScore: 70, reports: [] }),
        placeRow({
          id: "buzzing",
          baseScore: 72,
          reports: [{ score: 94, label: "Moto sana", createdAt: new Date(now.getTime() - 5 * 60000) }],
        }),
      ],
    },
  };

  const result = await loadPlaces(db, now);
  assert.equal(result.length, 2);
  // The place with a fresh hot report should sort above the calmer one.
  assert.equal(result[0].id, "buzzing");
  assert.ok(result[0].score > result[1].score);
  assert.equal(result[0].live, true);
});

test("createReport rejects invalid payloads with 400", async () => {
  const db = { place: { findUnique: async () => null }, vibeReport: {} };
  const { status, payload } = await createReport(db, { placeId: "coral", score: 55, label: "Kuna vibe" });
  assert.equal(status, 400);
  assert.ok(Array.isArray(payload.details));
});

test("createReport returns 404 for an unknown place", async () => {
  const db = {
    place: { findUnique: async () => null },
    vibeReport: { create: async () => { throw new Error("should not be called"); } },
  };
  const { status } = await createReport(db, { placeId: "ghost", score: 72, label: "Kuna vibe" });
  assert.equal(status, 404);
});

test("createReport stores a report and returns the updated place", async () => {
  const now = new Date("2026-06-25T20:00:00Z");
  const stored = [];
  const db = {
    place: { findUnique: async ({ where }) => (where.id === "coral" ? placeRow() : null) },
    vibeReport: {
      create: async ({ data }) => {
        const row = { id: `r${stored.length + 1}`, createdAt: now, ...data };
        stored.push(row);
        return row;
      },
      findMany: async ({ where }) => stored.filter((r) => r.placeId === where.placeId),
    },
  };

  const { status, payload } = await createReport(
    db,
    { placeId: "coral", score: 94, label: "Moto sana" },
    now,
  );

  assert.equal(status, 201);
  assert.equal(stored.length, 1);
  assert.equal(payload.place.id, "coral");
  assert.equal(payload.place.live, true);
  assert.equal(payload.place.reportCount, 1);
  assert.ok(payload.place.score > 80, "hot report should lift the score");
});
