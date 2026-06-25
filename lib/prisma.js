// Lazy Prisma client singleton.
//
// On Vercel, every serverless invocation can spin up a new instance, so we
// cache the client on globalThis to avoid exhausting database connections.
// The client is created via a dynamic import so that simply importing this
// module (e.g. in unit tests) never requires a generated client or a live
// database — it is only constructed the first time getPrisma() is called.

let clientPromise;

export async function getPrisma() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const { PrismaClient } = await import("@prisma/client");
      const globalForPrisma = globalThis;
      const client =
        globalForPrisma.__wapileoPrisma ??
        new PrismaClient({
          log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
        });
      if (process.env.NODE_ENV !== "production") {
        globalForPrisma.__wapileoPrisma = client;
      }
      return client;
    })();
  }
  return clientPromise;
}
