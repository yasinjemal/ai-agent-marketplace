// =============================================================
// POST /api/agents/[agentId]/review — Admin approves or rejects
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { agentApprovalSchema } from "@/lib/validations/agent";
import { approveAgent, rejectAgent } from "@/lib/services/agent";
import type { ApiResponse } from "@/types";

type RouteParams = { params: Promise<{ agentId: string }> };

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const session = await requireRole("ADMIN");
    const { agentId } = await params;

    const body: unknown = await request.json();
    const parseResult = agentApprovalSchema.safeParse(body);

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

    const { action, rejectionReason } = parseResult.data;

    const agent =
      action === "approve"
        ? await approveAgent(agentId, { userId: session.userId })
        : await rejectAgent(agentId, rejectionReason!, { userId: session.userId });

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
        { success: false, error: { code: "FORBIDDEN", message: "Admin access required" } } satisfies ApiResponse<never>,
        { status: 403 },
      );
    }
    if (message === "AGENT_NOT_FOUND") {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Agent not found" } } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }
    if (message === "AGENT_NOT_PENDING") {
      return NextResponse.json(
        { success: false, error: { code: "CONFLICT", message: "Agent is not pending review" } } satisfies ApiResponse<never>,
        { status: 409 },
      );
    }

    console.error("[POST /api/agents/:id/review]", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
