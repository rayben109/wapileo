// POST /api/reports
// Records a crowd vibe report and returns the place's updated live score.
// Body: { placeId: string, score: number, label: string }

import { getPrisma } from "../lib/prisma.js";
import { aggregatePlace, validateReport, WINDOW_HOURS } from "../lib/scoring.js";

// Exported separately so it can be unit-tested with a mock `db`.
export async function createReport(db, body, now = new Date()) {
  const result = validateReport(body);
  if (!result.ok) {
    return { status: 400, payload: { error: "Validation failed", details: result.errors } };
  }

  const { placeId, score, label } = result.value;
  const place = await db.place.findUnique({ where: { id: placeId } });
  if (!place) {
    return { status: 404, payload: { error: "Place not found" } };
  }

  await db.vibeReport.create({ data: { placeId, score, label } });

  const cutoff = new Date(now.getTime() - WINDOW_HOURS * 3600 * 1000);
  const reports = await db.vibeReport.findMany({
    where: { placeId, createdAt: { gte: cutoff } },
  });

  return { status: 201, payload: { place: aggregatePlace(place, reports, now) } };
}

function parseBody(req) {
  if (req.body == null) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return req.body;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = parseBody(req);
    if (body === null) {
      res.status(400).json({ error: "Invalid JSON body" });
      return;
    }
    const prisma = await getPrisma();
    const { status, payload } = await createReport(prisma, body);
    res.status(status).json(payload);
  } catch (error) {
    console.error("POST /api/reports failed:", error);
    res.status(500).json({ error: "Failed to submit report" });
  }
}
