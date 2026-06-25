// Seed the database with canonical WapiLeo places.
// Idempotent: safe to run repeatedly (upserts by id).

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getPrisma } from "../lib/prisma.js";
import { PLACES } from "../lib/seed-data.js";

// Load a local .env when present so `node prisma/seed.js` works the same way
// the Prisma CLI does. No-op on Vercel, where env vars are already set.
const envPath = fileURLToPath(new URL("../.env", import.meta.url));
if (typeof process.loadEnvFile === "function" && existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

async function main() {
  const prisma = await getPrisma();
  for (const place of PLACES) {
    const { id, ...rest } = place;
    await prisma.place.upsert({
      where: { id },
      update: rest,
      create: place,
    });
  }
  console.log(`Seeded ${PLACES.length} places.`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
