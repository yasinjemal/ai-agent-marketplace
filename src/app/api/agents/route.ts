// =============================================================
// GET /api/agents — List agents (public marketplace + developer + admin)
// POST /api/agents — Create a new agent (developer only)
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth";
import { createAgentSchema, agentQuerySchema } from "@/lib/validations/agent";
import { createAgent, getAgents } from "@/lib/services/agent";
import type { ApiResponse } from "@/types";

// -------------------------------------------------------------
// GET — List agents with filtering
// -------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const queryResult = agentQuerySchema.safeParse({
      search: searchParams.get("search") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      pricingModel: searchParams.get("pricingModel") ?? undefined,
      page: searchParams.get("page") ?? 1,
      limit: searchParams.get("limit") ?? 12,
      sortBy: searchParams.get("sortBy") ?? "newest",
    });

    if (!queryResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: queryResult.error.issues[0]?.message ?? "Invalid query parameters",
          },
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const view = searchParams.get("view");

    // Determine the view mode
    if (view === "developer") {
      // Developer sees their own agents
      const session = await requireRole("DEVELOPER", "ADMIN");
      const result = await getAgents(queryResult.data, {
        developerId: session.userId,
      });
      return NextResponse.json({ success: true, data: result } satisfies ApiResponse<typeof result>);
    }

    if (view === "admin") {
      // Admin sees pending review agents
      await requireRole("ADMIN");
      const result = await getAgents(queryResult.data, {
        adminReview: true,
      });
      return NextResponse.json({ success: true, data: result } satisfies ApiResponse<typeof result>);
    }

    // Default: public marketplace (approved + published only)
    const result = await getAgents(queryResult.data, { publicOnly: true });
    return NextResponse.json({ success: true, data: result } satisfies ApiResponse<typeof result>);
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
        { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions" } } satisfies ApiResponse<never>,
        { status: 403 },
      );
    }

    console.error("[GET /api/agents]", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

// -------------------------------------------------------------
// POST — Create a new agent (developer only)
// -------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole("DEVELOPER", "ADMIN");

    const body: unknown = await request.json();
    const parseResult = createAgentSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parseResult.error.issues[0]?.message ?? "Invalid input",
          },
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const agent = await createAgent(parseResult.data, {
      userId: session.userId,
      tenantId: session.tenantId,
    });

    return NextResponse.json(
      { success: true, data: agent } satisfies ApiResponse<typeof agent>,
      { status: 201 },
    );
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
        { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions" } } satisfies ApiResponse<never>,
        { status: 403 },
      );
    }

    console.error("[POST /api/agents]", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
