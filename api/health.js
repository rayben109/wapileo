// GET /api/health
// Lightweight readiness probe that verifies database connectivity.

import { getPrisma } from "../lib/prisma.js";

export default async function handler(req, res) {
  try {
    const prisma = await getPrisma();
    await prisma.$queryRaw`SELECT 1`;
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ status: "ok", time: new Date().toISOString() });
  } catch (error) {
    res.setHeader("Cache-Control", "no-store");
    res.status(503).json({ status: "error", error: String(error?.message || error) });
  }
}
