// =============================================================
// GET  /api/executions       — List execution history (tenant-scoped)
// GET  /api/executions/stats — Usage stats for billing dashboard
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { executionQuerySchema } from "@/lib/validations/execution";
import { getExecutions, getExecutionStats } from "@/lib/services/execution";
import type { ApiResponse } from "@/types";

// -------------------------------------------------------------
// GET — List executions with filtering
// -------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);

    // Check if this is a stats request
    if (searchParams.get("view") === "stats") {
      const stats = await getExecutionStats(session.tenantId);
      return NextResponse.json({
        success: true,
        data: stats,
      } satisfies ApiResponse<typeof stats>);
    }

    // Parse query params
    const parsed = executionQuerySchema.safeParse({
      agentId: searchParams.get("agentId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      page: searchParams.get("page") ?? 1,
      limit: searchParams.get("limit") ?? 20,
      sortBy: searchParams.get("sortBy") ?? "newest",
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              parsed.error.issues[0]?.message ?? "Invalid query parameters",
          },
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const result = await getExecutions(session.tenantId, parsed.data);

    return NextResponse.json({
      success: true,
      data: result,
    } satisfies ApiResponse<typeof result>);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";

    if (message === "UNAUTHORIZED") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
          },
        } satisfies ApiResponse<never>,
        { status: 401 },
      );
    }

    console.error("[GET /api/executions]", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch executions",
        },
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
