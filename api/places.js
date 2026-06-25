// GET /api/places
// Returns every place with a crowd-aggregated live vibe score.

import { getPrisma } from "../lib/prisma.js";
import { aggregatePlaces, WINDOW_HOURS } from "../lib/scoring.js";

// Exported separately so it can be unit-tested with a mock `db`.
export async function loadPlaces(db, now = new Date()) {
  const cutoff = new Date(now.getTime() - WINDOW_HOURS * 3600 * 1000);
  const rows = await db.place.findMany({
    include: {
      reports: {
        where: { createdAt: { gte: cutoff } },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { baseScore: "desc" },
  });
  return aggregatePlaces(rows, now);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const prisma = await getPrisma();
    const places = await loadPlaces(prisma);
    res.setHeader("Cache-Control", "public, s-maxage=15, stale-while-revalidate=60");
    res.status(200).json({
      places,
      windowHours: WINDOW_HOURS,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("GET /api/places failed:", error);
    res.status(500).json({ error: "Failed to load places" });
  }
}
