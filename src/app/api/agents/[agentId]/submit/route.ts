// =============================================================
// POST /api/agents/[agentId]/submit — Submit agent for review
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { submitAgentForReview } from "@/lib/services/agent";
import type { ApiResponse } from "@/types";

type RouteParams = { params: Promise<{ agentId: string }> };

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const session = await requireRole("DEVELOPER", "ADMIN");
    const { agentId } = await params;

    const agent = await submitAgentForReview(agentId, {
      userId: session.userId,
      tenantId: session.tenantId,
    });

    return NextResponse.json({ success: true, data: agent } satisfies ApiResponse<typeof agent>);
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
    if (message === "AGENT_NOT_FOUND") {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Agent not found or you don't own it" } } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }
    if (message === "AGENT_NOT_SUBMITTABLE") {
      return NextResponse.json(
        { success: false, error: { code: "CONFLICT", message: "Agent can only be submitted from draft or rejected status" } } satisfies ApiResponse<never>,
        { status: 409 },
      );
    }

    console.error("[POST /api/agents/:id/submit]", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
