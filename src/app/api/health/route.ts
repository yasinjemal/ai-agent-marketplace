// =============================================================
// Health Check API — /api/health
// Returns system status for monitoring & load balancers.
// =============================================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();

  const checks: Record<string, { status: string; latencyMs?: number }> = {};

  // Database connectivity check
  try {
    const dbStart = Date.now();
    await db.$queryRawUnsafe("SELECT 1");
    checks.database = { status: "healthy", latencyMs: Date.now() - dbStart };
  } catch {
    checks.database = { status: "unhealthy" };
  }

  const allHealthy = Object.values(checks).every((c) => c.status === "healthy");

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "0.1.0",
      uptime: process.uptime(),
      checks,
      totalLatencyMs: Date.now() - start,
    },
    {
      status: allHealthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
