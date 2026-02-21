// =============================================================
// GET /api/analytics — Admin-only platform metrics
// Returns platform KPIs, top agents, and trend data.
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import {
  getPlatformMetrics,
  getTopAgents,
  getRevenueTrends,
  getExecutionTrends,
} from "@/lib/services/analytics";
import type { ApiResponse } from "@/types";

export async function GET(_request: NextRequest) {
  try {
    await requireRole("ADMIN");

    const [metrics, topAgents, revenueTrends, executionTrends] =
      await Promise.all([
        getPlatformMetrics(),
        getTopAgents(10),
        getRevenueTrends(6),
        getExecutionTrends(30),
      ]);

    const data = { metrics, topAgents, revenueTrends, executionTrends };

    return NextResponse.json({
      success: true,
      data,
    } satisfies ApiResponse<typeof data>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";

    if (message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } } satisfies ApiResponse<never>,
        { status: 401 },
      );
    }
    if (message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Admin access required" } } satisfies ApiResponse<never>,
        { status: 403 },
      );
    }

    console.error("[GET /api/analytics]", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
