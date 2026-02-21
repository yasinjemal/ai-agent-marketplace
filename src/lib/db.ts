// =============================================================
// Prisma Client Singleton
// Prevents multiple Prisma instances in development (hot reload)
// Uses @prisma/adapter-pg for Prisma v7 client engine.
// =============================================================

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Strip sslmode from the connection string to avoid pg v8 deprecation warning.
// SSL is configured explicitly via the pool's `ssl` option below.
const cleanConnectionString = connectionString.replace(
  /[?&]sslmode=[^&]*/gi,
  (match, offset) => (offset === connectionString.indexOf("?") ? "?" : ""),
).replace(/\?$/, "");

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
};

function createPool(): pg.Pool {
  return new pg.Pool({
    connectionString: cleanConnectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
    ssl: { rejectUnauthorized: false },
  });
}

function createPrismaClient(): PrismaClient {
  const pool = globalForPrisma.pool ?? createPool();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pool = pool;
  }
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
